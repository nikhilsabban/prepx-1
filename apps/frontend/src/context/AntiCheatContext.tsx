import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router";
import { useAuth } from "./AuthContext";
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, X, EyeOff, Laptop, Ban } from "lucide-react";

export interface AntiCheatViolation {
  id: string;
  type: "tab_switch" | "window_blur" | "devtools_attempt" | "multi_tab_concurrency" | "right_click";
  timestamp: string;
  route: string;
  description: string;
}

interface AntiCheatContextType {
  isAdminExempt: boolean;
  strikesCount: number;
  maxStrikes: number;
  violations: AntiCheatViolation[];
  isWarningModalOpen: boolean;
  activeViolation: AntiCheatViolation | null;
  dismissWarning: () => void;
  resetViolations: () => void;
}

const AntiCheatContext = createContext<AntiCheatContextType | undefined>(undefined);

const MAX_STRIKES = 3;

export function AntiCheatProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // ONLY admin@gmail.com (and users with role admin) are strictly exempt from Anti-Cheat
  const isAdminExempt = Boolean(
    user?.email?.toLowerCase().trim() === "admin@gmail.com" ||
    (user as any)?.role === "admin"
  );

  const [violations, setViolations] = useState<AntiCheatViolation[]>(() => {
    try {
      const saved = sessionStorage.getItem("prepx_anticheat_violations");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [activeViolation, setActiveViolation] = useState<AntiCheatViolation | null>(null);
  const [showBadgeDetails, setShowBadgeDetails] = useState(false);

  const strikesCount = violations.length;
  const lastViolationTimeRef = useRef<number>(0);
  const locationRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  const triggerViolation = useCallback(
    (type: AntiCheatViolation["type"], description: string) => {
      // If admin, strictly bypass all anti-cheat rules
      if (isAdminExempt) return;

      const now = Date.now();
      // Debounce rapid duplicate trigger within 2.5 seconds
      if (now - lastViolationTimeRef.current < 2500) return;
      lastViolationTimeRef.current = now;

      const newViolation: AntiCheatViolation = {
        id: `v_${now}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        timestamp: new Date().toLocaleTimeString(),
        route: locationRef.current,
        description,
      };

      setViolations((prev) => {
        const updated = [...prev, newViolation];
        try {
          sessionStorage.setItem("prepx_anticheat_violations", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setActiveViolation(newViolation);
      setIsWarningModalOpen(true);
    },
    [isAdminExempt]
  );

  const dismissWarning = useCallback(() => {
    setIsWarningModalOpen(false);
    setActiveViolation(null);
  }, []);

  const resetViolations = useCallback(() => {
    setViolations([]);
    try {
      sessionStorage.removeItem("prepx_anticheat_violations");
    } catch {}
    dismissWarning();
  }, [dismissWarning]);

  // Anti-Cheat Event Listeners (Tab switch, window blur, devtools block)
  useEffect(() => {
    // If admin, do not attach any anti-cheat restrictions
    if (isAdminExempt) return;

    // 1. Tab Switching & Window Minimization Detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation(
          "tab_switch",
          "Tab switch or browser minimization detected. Switching away from PrepX during active sessions is prohibited."
        );
      }
    };

    // 2. Window Blur (defocus to another app or screen)
    const handleWindowBlur = () => {
      triggerViolation(
        "window_blur",
        "Window lost focus. Moving cursor or switching to another application is flagged by PrepX Proctor."
      );
    };

    // 3. Developer Tools & Source Inspection Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 or Ctrl+Shift+I or Ctrl+Shift+J or Ctrl+Shift+C or Ctrl+U
      const isDevToolsKey =
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && ["u", "U"].includes(e.key));

      if (isDevToolsKey) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation(
          "devtools_attempt",
          "Developer Tools shortcut blocked. Inspecting page structure or source code is strictly prohibited."
        );
      }
    };

    // 4. Context Menu (Right Click) Restriction on sensitive assessment paths
    const handleContextMenu = (e: MouseEvent) => {
      const isAssessmentRoute =
        locationRef.current.includes("/interview") ||
        locationRef.current.includes("/group-discussion") ||
        locationRef.current.includes("/coding");

      if (isAssessmentRoute) {
        e.preventDefault();
        triggerViolation(
          "right_click",
          "Right-click context menu is restricted in technical evaluation areas."
        );
      }
    };

    // 5. Multi-Tab Concurrency Detection via BroadcastChannel
    let broadcastChannel: BroadcastChannel | null = null;
    const tabSessionId = `tab_${Date.now()}_${Math.random()}`;

    if (typeof BroadcastChannel !== "undefined") {
      try {
        broadcastChannel = new BroadcastChannel("prepx_anticheat_channel");
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === "PING_CONCURRENT" && event.data.sender !== tabSessionId) {
            triggerViolation(
              "multi_tab_concurrency",
              "Another PrepX tab or window is open concurrently. Multiple simultaneous sessions are not allowed."
            );
          }
        };
        // Announce this tab
        broadcastChannel.postMessage({ type: "PING_CONCURRENT", sender: tabSessionId });
      } catch {}
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
      if (broadcastChannel) {
        try { broadcastChannel.close(); } catch {}
      }
    };
  }, [isAdminExempt, triggerViolation]);

  return (
    <AntiCheatContext.Provider
      value={{
        isAdminExempt,
        strikesCount,
        maxStrikes: MAX_STRIKES,
        violations,
        isWarningModalOpen,
        activeViolation,
        dismissWarning,
        resetViolations,
      }}
    >
      {children}

      {/* Persistent Anti-Cheat Security Status Badge */}
      <div className="fixed bottom-4 left-4 z-40 select-none">
        <div
          onClick={() => setShowBadgeDetails((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-xl shadow-lg transition-all cursor-pointer ${
            isAdminExempt
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80"
              : strikesCount > 0
              ? "bg-amber-950/80 border-amber-500/40 text-amber-300 hover:bg-amber-900/80 animate-pulse"
              : "bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-white"
          }`}
          title="PrepX Anti-Cheat System Status"
        >
          {isAdminExempt ? (
            <>
              <ShieldCheck className="size-3.5 text-emerald-400" />
              <span>Anti-Cheat: Bypassed (Admin)</span>
            </>
          ) : (
            <>
              {strikesCount > 0 ? (
                <ShieldAlert className="size-3.5 text-amber-400" />
              ) : (
                <Shield className="size-3.5 text-indigo-400" />
              )}
              <span>Anti-Cheat: Active</span>
              {strikesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                  {strikesCount}/{MAX_STRIKES} Strikes
                </span>
              )}
            </>
          )}
        </div>

        {/* Expandable Anti-Cheat Details Dropdown */}
        {showBadgeDetails && (
          <div className="absolute bottom-10 left-0 w-80 p-4 rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl text-xs space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 font-bold text-white">
                <Shield className="size-4 text-indigo-400" />
                <span>PrepX Anti-Cheat Proctor</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBadgeDetails(false);
                }}
                className="text-zinc-500 hover:text-white p-1 rounded-md"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {isAdminExempt ? (
              <div className="space-y-1.5 text-zinc-300">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <ShieldCheck className="size-4" />
                  <span>Admin Exemption Active</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Logged in as <strong className="text-zinc-200">{user?.email || "admin@gmail.com"}</strong>. All tab switching, multi-window, and developer tool restrictions are completely disabled.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Violation Strikes:</span>
                  <span className={`font-bold ${strikesCount >= MAX_STRIKES ? "text-red-400" : strikesCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {strikesCount} / {MAX_STRIKES}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strikesCount >= MAX_STRIKES
                        ? "bg-red-500"
                        : strikesCount > 0
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, (strikesCount / MAX_STRIKES) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Active proctoring monitors tab switches, devtools, right-click inspection, and background leakage across PrepX modules.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Strict Anti-Cheat Warning Modal for Non-Admin Candidates */}
      {isWarningModalOpen && !isAdminExempt && activeViolation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-red-500/40 bg-zinc-950 p-6 sm:p-8 shadow-2xl shadow-red-500/20 text-center space-y-6">
            {/* Header Icon */}
            <div className="mx-auto size-16 rounded-2xl border border-red-500/30 bg-red-500/10 flex items-center justify-center text-red-400 animate-pulse">
              <ShieldAlert className="size-8" />
            </div>

            {/* Violation Titles */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/30 bg-red-500/15 text-red-300 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="size-3.5 text-red-400" />
                <span>Anti-Cheat Violation Strike {strikesCount} of {MAX_STRIKES}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Suspicious Activity Detected
              </h2>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-md mx-auto">
                {activeViolation.description}
              </p>
            </div>

            {/* Violation Audit Card */}
            <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-zinc-400">
                <span>Violation Type:</span>
                <span className="font-mono text-red-400 uppercase font-bold">{activeViolation.type.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Timestamp:</span>
                <span className="text-zinc-200">{activeViolation.timestamp}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Active Module:</span>
                <span className="font-mono text-zinc-200">{activeViolation.route}</span>
              </div>
            </div>

            {/* Acknowledgment Warning Notice */}
            <div className="text-[11px] text-zinc-400 italic">
              {strikesCount >= MAX_STRIKES ? (
                <span className="text-red-400 font-bold">
                  Maximum strikes reached. Your session integrity log will be reported to placement administrators.
                </span>
              ) : (
                <span>
                  Please remain focused on this window. Further infractions may invalidate test results or disconnect active sessions.
                </span>
              )}
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={dismissWarning}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm transition-all cursor-pointer shadow-lg shadow-red-600/30 active:scale-95"
            >
              I Understand & Return to PrepX
            </button>
          </div>
        </div>
      )}
    </AntiCheatContext.Provider>
  );
}

export function useAntiCheat(): AntiCheatContextType {
  const context = useContext(AntiCheatContext);
  if (!context) {
    throw new Error("useAntiCheat must be used within an AntiCheatProvider");
  }
  return context;
}
