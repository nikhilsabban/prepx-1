import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Sparkles,
  Users,
  Compass,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Award,
  Clock,
  Flame,
  Plus,
  Search,
  Check,
  X,
  UserCheck,
  Globe,
  Radio,
  Shield,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { SkeletonGDList } from "../../components/ui/skeleton";
import { useAuth } from "../../context/AuthContext";
import { BACKEND_URL } from "../../lib/config";
import {
  fetchRandomTopic,
  createGDRoom,
  fetchMyGDSessions,
  fetchMyInvitations,
  searchUsersByUsername,
  inviteParticipant,
  respondToInvitation,
  deleteInvitation,
  type IGDTopicMetadata,
  type IGDSession,
  type InvitationStatus,
} from "../../services/gdService";
import { toast } from "react-toastify";

const CATEGORIES = [
  "All",
  "AI and Technology",
  "Education and Employment",
  "Business and Economy",
  "Environment and Sustainability",
  "Governance and Policy",
  "Cybersecurity and Privacy",
  "Current Affairs",
];

const LANGUAGES = [
  "English",
];

export function GDHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [topic, setTopic] = useState<IGDTopicMetadata | null>(null);
  const [loadingTopic, setLoadingTopic] = useState(true);
  const [history, setHistory] = useState<IGDSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Invitations received
  const [myInvitations, setMyInvitations] = useState<
    Array<{
      roomId: string;
      topic: IGDTopicMetadata;
      adminUsername: string;
      adminFullName?: string;
      expectedLanguage: string;
      status: InvitationStatus;
      invitedAt: string;
    }>
  >([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<Record<string, "accepting" | "declining">>({});
  const [declinedRoomIds, setDeclinedRoomIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem("gd_declined_invitations");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Create Room Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [expectedLanguage, setExpectedLanguage] = useState("English");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; username: string; fullName: string; profilePicture?: string }>
  >([]);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    loadTopic(selectedCategory);
    loadHistory();
    loadInvitations(true);
  }, [selectedCategory]);

  // Active polling for incoming invitations so user receives friend invites in real time (<2.5s)
  useEffect(() => {
    const pollTimer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadInvitations(false);
      }
    }, 2500);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadInvitations(false);
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // Real-time WebSocket connection for instant (<50ms) invitation delivery
  useEffect(() => {
    if (!user?.username) return;

    let socket: WebSocket | null = null;
    let isCancelled = false;

    try {
      const wsUrl = BACKEND_URL.replace(/^http/, "ws") + "/api/v1/gd/ws";
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (!isCancelled && socket?.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "register_user",
              payload: { username: user.username },
            })
          );
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "invitation_received" && data.payload) {
            const newInv = data.payload;
            if (declinedRoomIds.has(newInv.roomId)) return;
            setMyInvitations((prev) => {
              if (prev.some((i) => i.roomId === newInv.roomId)) return prev;
              toast.info(`🔔 New GD invitation from @${newInv.adminUsername}!`);
              return [newInv, ...prev];
            });
          }
          if (data.type === "invitation_removed" && data.payload?.roomId) {
            const rmId = data.payload.roomId;
            setMyInvitations((prev) => prev.filter((i) => i.roomId !== rmId));
          }
        } catch {}
      };
    } catch {}

    return () => {
      isCancelled = true;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [user?.username]);

  // Search users debounce (snappy 200ms)
  useEffect(() => {
    if (!userSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const results = await searchUsersByUsername(userSearchQuery.trim(), selectedInvitees);
        setSearchResults(results);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [userSearchQuery, selectedInvitees]);

  async function loadTopic(cat: string) {
    setLoadingTopic(true);
    try {
      const data = await fetchRandomTopic({ category: cat });
      setTopic(data);
      if (!customQuestion) {
        setCustomQuestion(data.question);
      }
    } catch (err: any) {
      console.error("Failed to load topic:", err);
    } finally {
      setLoadingTopic(false);
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const data = await fetchMyGDSessions();
      setHistory(data);
    } catch (err) {
      // Ignored
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadInvitations(showLoading = false) {
    if (showLoading) setLoadingInvitations(true);
    try {
      const invs = await fetchMyInvitations();
      // Filter out any invitations where status is declined, expired, or dismissed
      const activeInvs = (invs || []).filter(
        (i) => i.status !== "declined" && i.status !== "expired" && !declinedRoomIds.has(i.roomId)
      );

      setMyInvitations((prev) => {
        // Detect newly received invitations to notify student immediately
        if (!showLoading && prev.length > 0) {
          const prevRoomIds = new Set(prev.map((i) => i.roomId));
          const freshInvs = activeInvs.filter((i) => !prevRoomIds.has(i.roomId) && i.status === "pending");
          freshInvs.forEach((inv) => {
            toast.info(`🔔 New GD invitation from @${inv.adminUsername}!`, {
              autoClose: 5000,
            });
          });
        }
        return activeInvs;
      });
    } catch (err) {
      // Ignored
    } finally {
      if (showLoading) setLoadingInvitations(false);
    }
  }

  function handleSelectInvitee(username: string) {
    if (selectedInvitees.length >= 5) {
      toast.warning("Maximum 5 students allowed per Group Discussion room");
      return;
    }
    if (!selectedInvitees.includes(username)) {
      setSelectedInvitees([...selectedInvitees, username]);
      setUserSearchQuery("");
      setSearchResults([]);
    }
  }

  function handleRemoveInvitee(username: string) {
    setSelectedInvitees(selectedInvitees.filter((u) => u !== username));
  }

  async function handleCreateRoomSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setIsCreatingRoom(true);

    try {
      // Batch invite directly during room creation (zero extra roundtrips)
      const room = await createGDRoom({
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        expectedLanguage,
        topicOverride: customQuestion && topic ? { ...topic, question: customQuestion } : topic || undefined,
        invitees: selectedInvitees,
      });

      // Concurrently dispatch any remaining invitees not already recorded
      const existingInvUsernames = new Set(
        (room.invitations || []).map((i: any) => i.username?.toLowerCase().trim())
      );
      const remainingInvitees = selectedInvitees.filter(
        (u) => !existingInvUsernames.has(u.toLowerCase().trim())
      );

      if (remainingInvitees.length > 0) {
        await Promise.allSettled(
          remainingInvitees.map((username) => inviteParticipant(room._id, username))
        );
      }

      toast.success("GD room created! Entering live room as Admin / Moderator...");
      setShowCreateModal(false);
      navigate(`/group-discussion/${room._id}`);
    } catch (err: any) {
      console.error("Room creation error:", err);
      toast.error(err.response?.data?.message || "Failed to create discussion room");
    } finally {
      setIsCreatingRoom(false);
    }
  }

  async function handleRespondToInvitation(roomId: string, action: "accept" | "decline") {
    if (actionInProgress[roomId]) return;

    const targetInv = myInvitations.find((i) => i.roomId === roomId);
    if (!targetInv) return;

    if (action === "decline") {
      // Optimistic Decline: immediately remove from UI (<16ms, zero delay!)
      setActionInProgress((prev) => ({ ...prev, [roomId]: "declining" }));

      setDeclinedRoomIds((prev) => {
        const next = new Set(prev).add(roomId);
        try {
          sessionStorage.setItem("gd_declined_invitations", JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });

      setMyInvitations((prev) => prev.filter((i) => i.roomId !== roomId));
      toast.info("Invitation declined");

      try {
        await respondToInvitation(roomId, "decline");
      } catch (err: any) {
        console.warn("Decline API note:", err);
      } finally {
        setActionInProgress((prev) => {
          const next = { ...prev };
          delete next[roomId];
          return next;
        });
      }
      return;
    }

    if (action === "accept") {
      // Optimistic Accept: immediately update UI to accepted state (<16ms)
      setActionInProgress((prev) => ({ ...prev, [roomId]: "accepting" }));
      setMyInvitations((prev) =>
        prev.map((i) => (i.roomId === roomId ? { ...i, status: "accepted" as const } : i))
      );
      toast.success("Invitation accepted! Entering discussion room...");

      try {
        await respondToInvitation(roomId, "accept");
        navigate(`/group-discussion/${roomId}`);
      } catch (err: any) {
        // Rollback on failure
        setMyInvitations((prev) =>
          prev.map((i) => (i.roomId === roomId ? { ...i, status: "pending" as const } : i))
        );
        toast.error(err.response?.data?.message || "Failed to accept invitation");
        setActionInProgress((prev) => {
          const next = { ...prev };
          delete next[roomId];
          return next;
        });
      }
    }
  }

  async function handleDeleteInvitation(roomId: string) {
    if (actionInProgress[roomId]) return;
    setActionInProgress((prev) => ({ ...prev, [roomId]: "declining" }));

    setDeclinedRoomIds((prev) => {
      const next = new Set(prev).add(roomId);
      try {
        sessionStorage.setItem("gd_declined_invitations", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });

    setMyInvitations((prev) => prev.filter((i) => i.roomId !== roomId));
    toast.info("Invitation removed");

    try {
      await deleteInvitation(roomId);
    } catch {
      try {
        await respondToInvitation(roomId, "decline");
      } catch {}
    } finally {
      setActionInProgress((prev) => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
    }
  }

  if (loadingTopic && loadingHistory) {
    return <SkeletonGDList />;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/90 via-zinc-950/80 to-[#09090b] p-8 md:p-12 shadow-2xl shadow-indigo-950/20">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-600/10 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="size-3.5 animate-pulse" />
              Live Multi-Participant Group Discussion Room
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              AI Group Discussion Arena{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                with Live Video & AI Tutor
              </span>
            </h1>

            <p className="text-zinc-400 text-base sm:text-lg leading-relaxed">
              Host or join a live, video-based group discussion with up to 5 students and an autonomous AI Tutor.
              Enjoy WebRTC audio/video, randomized fair turn management, real-time inactivity detection, and
              comprehensive 100-point individual evaluation with campus placement rankings.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
              <Button
                onClick={() => {
                  if (topic) setCustomQuestion(topic.question);
                  setShowCreateModal(true);
                }}
                className="min-h-[48px] px-4 sm:px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2.5"
              >
                <Plus className="size-4 sm:size-5 shrink-0" />
                <span>Create Room (Host as Admin)</span>
                <ArrowRight className="size-4 sm:size-5 shrink-0" />
              </Button>

              <button
                onClick={() => handleCreateRoomSubmit()}
                disabled={isCreatingRoom || !topic}
                className="min-h-[48px] px-4 sm:px-6 py-3 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Flame className="size-4 text-amber-300 shrink-0" />
                <span>Quick Launch with Live Topic</span>
              </button>
            </div>
          </div>
        </div>

        {/* Invitations Received Section (if any pending) */}
        {myInvitations.length > 0 && (
          <div className="rounded-2xl border border-indigo-500/40 bg-indigo-950/20 p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Radio className="size-4 animate-pulse text-indigo-400" />
                Invitations to Group Discussions ({myInvitations.length})
              </div>
              <span className="text-xs text-zinc-400">Accept before the 5-student capacity fills</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myInvitations.map((inv) => (
                <div
                  key={inv.roomId}
                  className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                      Host: @{inv.adminUsername}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">{inv.expectedLanguage}</span>
                      <button
                        type="button"
                        title="Delete / Dismiss invitation"
                        disabled={!!actionInProgress[inv.roomId]}
                        onClick={() => handleDeleteInvitation(inv.roomId)}
                        className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-white text-sm line-clamp-2">
                    "{inv.topic.question}"
                  </h4>

                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                    {inv.status === "accepted" ? (
                      <Button
                        onClick={() => navigate(`/group-discussion/${inv.roomId}`)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
                      >
                        Enter Room Now
                      </Button>
                    ) : (
                      <>
                        <Button
                          disabled={!!actionInProgress[inv.roomId]}
                          onClick={() => handleRespondToInvitation(inv.roomId, "accept")}
                          className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {actionInProgress[inv.roomId] === "accepting" ? (
                            <span className="flex items-center gap-1.5">
                              <RefreshCw className="size-3 animate-spin" />
                              Joining...
                            </span>
                          ) : (
                            "Accept & Join"
                          )}
                        </Button>
                        <Button
                          disabled={!!actionInProgress[inv.roomId]}
                          onClick={() => handleRespondToInvitation(inv.roomId, "decline")}
                          variant="ghost"
                          className="px-3 py-1.5 border border-zinc-700 text-zinc-400 hover:text-white text-xs transition-all disabled:opacity-50"
                        >
                          {actionInProgress[inv.roomId] === "declining" ? (
                            <RefreshCw className="size-3 animate-spin" />
                          ) : (
                            "Decline"
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter Bar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Compass className="size-5 text-indigo-400" />
              Explore Discussion Categories
            </h2>
            <span className="text-xs text-zinc-500">Auto-balanced from verified RSS publishers</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 hover:bg-zinc-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Live Topic Spotlight Card */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/80 p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-3 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Fresh Topic Spotlight from the Web
              </span>
            </div>

            {topic && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium">
                  {topic.publisher}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-indigo-400 font-medium">
                  {topic.category}
                </span>
              </div>
            )}
          </div>

          {loadingTopic ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="size-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-zinc-400">Discovering verified discussion topics from web feeds...</p>
            </div>
          ) : topic ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-xl sm:text-2xl font-black text-white leading-snug">
                  "{topic.question}"
                </h3>

                <p className="text-sm text-zinc-400 leading-relaxed max-w-4xl">
                  {topic.description || topic.originalTitle}
                </p>
              </div>

              {/* Source Attribution and External Link */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-800/60">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span>Based on reporting in:</span>
                  <strong className="text-zinc-200">{topic.originalTitle}</strong>
                  {topic.sourceUrl && (
                    <a
                      href={topic.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline font-medium ml-2"
                    >
                      Read Original Article
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>

                <Button
                  onClick={() => {
                    setCustomQuestion(topic.question);
                    setShowCreateModal(true);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm cursor-pointer shadow-md shadow-indigo-600/30 flex items-center gap-2"
                >
                  Configure Room with This Topic
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* 100-Point Evaluation Rubric Preview */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 md:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="size-5 text-indigo-400" />
              Campus Placement 100-Point GD Evaluation Rubric
            </h2>
            <p className="text-xs text-zinc-400">
              Evaluated strictly on transcript evidence and audio delivery metrics per individual student.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1">
              <span className="font-bold text-indigo-400">1. Relevance</span>
              <div className="text-sm font-black text-white">25 pts</div>
              <p className="text-[11px] text-zinc-500">Topic understanding & depth</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1">
              <span className="font-bold text-purple-400">2. Reasoning</span>
              <div className="text-sm font-black text-white">15 pts</div>
              <p className="text-[11px] text-zinc-500">Logical arguments & data</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1">
              <span className="font-bold text-pink-400">3. Clarity</span>
              <div className="text-sm font-black text-white">15 pts</div>
              <p className="text-[11px] text-zinc-500">Structure & articulation</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1">
              <span className="font-bold text-blue-400">4. Fluency</span>
              <div className="text-sm font-black text-white">10 pts</div>
              <p className="text-[11px] text-zinc-500">Pace & control</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1">
              <span className="font-bold text-emerald-400">5. Listening</span>
              <div className="text-sm font-black text-white">10 pts</div>
              <p className="text-[11px] text-zinc-500">Responses to peers</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1">
              <span className="font-bold text-amber-400">6. Balance</span>
              <div className="text-sm font-black text-white">10 pts</div>
              <p className="text-[11px] text-zinc-500">Turn share & fairness</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1">
              <span className="font-bold text-cyan-400">7. Language</span>
              <div className="text-sm font-black text-white">5 pts</div>
              <p className="text-[11px] text-zinc-500">Consistency in language</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1">
              <span className="font-bold text-rose-400">8. Delivery</span>
              <div className="text-sm font-black text-white">5 pts</div>
              <p className="text-[11px] text-zinc-500">Intelligibility & mumbling</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1">
              <span className="font-bold text-orange-400">9. Etiquette</span>
              <div className="text-sm font-black text-white">5 pts</div>
              <p className="text-[11px] text-zinc-500">Respect & collaboration</p>
            </div>
          </div>
        </div>

        {/* Previous GD Sessions History */}
        {history.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="size-5 text-indigo-400" />
              Your Discussion History & Evaluations
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((s) => (
                <div
                  key={s._id}
                  onClick={() => navigate(`/group-discussion/result/${s._id}`)}
                  className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/60 hover:border-zinc-700 transition cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                      {s.topic?.category || "General"}
                    </span>
                    {s.evaluations && s.evaluations.length > 0 ? (
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        Top Score: {s.evaluations[0]?.overallScore}/100
                      </span>
                    ) : (
                      <span className="text-zinc-500 capitalize">{s.status}</span>
                    )}
                  </div>

                  <h4 className="font-bold text-white text-sm line-clamp-2">
                    "{s.topic?.question}"
                  </h4>

                  <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800/80">
                    <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                    <span className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
                      View Results & Leaderboard <ArrowRight className="size-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Room Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-2xl w-full space-y-5 sm:space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white"
              >
                <X className="size-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Plus className="size-5 text-indigo-400" />
                  Configure Group Discussion Room
                </h3>
                <p className="text-xs text-zinc-400">
                  As the room creator, you will act as the Moderator. Invite up to 5 student participants.
                </p>
              </div>

              <form onSubmit={handleCreateRoomSubmit} className="space-y-5">
                {/* Topic Question */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Discussion Topic Question
                  </label>
                  <textarea
                    rows={3}
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    required
                    placeholder="Enter discussion prompt..."
                    className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-indigo-500 outline-none"
                  />
                </div>

                {/* Expected Language */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="size-3.5 text-indigo-400" />
                    Expected Discussion Language
                  </label>
                  <select
                    value={expectedLanguage}
                    onChange={(e) => setExpectedLanguage(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-indigo-500 outline-none"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang} {lang === "English" && "(Default)"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search & Invite Registered Students by Username */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                      <Users className="size-3.5 text-indigo-400" />
                      Invite Students by Username ({selectedInvitees.length}/5)
                    </label>
                    <span className="text-[11px] text-zinc-500">Max 5 students</span>
                  </div>

                  {/* Selected invitee pills */}
                  {selectedInvitees.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedInvitees.map((username) => (
                        <span
                          key={username}
                          className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5"
                        >
                          @{username}
                          <button
                            type="button"
                            onClick={() => handleRemoveInvitee(username)}
                            className="hover:text-white"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedInvitees.length < 5 && (
                    <div className="relative">
                      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
                        <Search className="size-4 text-zinc-500" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Search PrepX students by username..."
                          className="bg-transparent text-sm text-white placeholder-zinc-500 outline-none flex-1"
                        />
                        {isSearchingUsers && <RefreshCw className="size-3.5 animate-spin text-indigo-400" />}
                      </div>

                      {/* Search Results Dropdown */}
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-zinc-900 border border-zinc-800 rounded-xl max-h-48 overflow-y-auto p-1 shadow-2xl">
                          {searchResults.map((u) => (
                            <div
                              key={u.id}
                              onClick={() => handleSelectInvitee(u.username)}
                              className="p-2.5 rounded-lg hover:bg-zinc-800/80 cursor-pointer flex items-center justify-between text-xs transition"
                            >
                              <div className="flex items-center gap-2">
                                <div className="size-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                                  {u.username[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-white block">@{u.username}</span>
                                  <span className="text-zinc-400 text-[11px]">{u.fullName}</span>
                                </div>
                              </div>
                              <span className="text-indigo-400 text-[11px] font-semibold">Invite +</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    disabled={isCreatingRoom || !customQuestion.trim()}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                  >
                    {isCreatingRoom ? "Initializing Room..." : "Launch Discussion Room"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GDHubPage;
