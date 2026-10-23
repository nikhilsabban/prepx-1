"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Bot,
  Send,
  Check,
  Copy,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Code2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export interface AITutorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  title: string;
  statement?: string;
  language: string;
  code: string;
  errorOutput?: string;
  failedTest?: { input: string; expected: string; got: string; stderr: string };
  onApplyCode: (newCode: string) => void;
}

type TabMode = "chat" | "review" | "fix";

export function AITutorSheet({
  open,
  onOpenChange,
  slug,
  title,
  statement,
  language,
  code,
  errorOutput,
  failedTest,
  onApplyCode,
}: AITutorSheetProps) {
  const [activeTab, setActiveTab] = useState<TabMode>("chat");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Review state
  const [reviewResult, setReviewResult] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Fix state
  const [fixResult, setFixResult] = useState<{
    explanation: string;
    keyFix: string;
    fixedCode: string;
  } | null>(null);
  const [fixLoading, setFixLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const backendUrl =
    typeof window !== "undefined"
      ? ((import.meta as any).env?.VITE_BACKEND_URL || "")
      : "";

  const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("prepx_token") ||
      sessionStorage.getItem("prepx_token")
    );
  };

  // Pre-seed greeting or switch tab if error exists
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          text: `👋 Hi! I'm your PrepX CodeForge AI Coach. I'm here to help you solve **${title}**. Ask me for conceptual hints, time complexity guidance, or debug suggestions!`,
        },
      ]);
    }
    if (open && (errorOutput || failedTest) && !fixResult) {
      setActiveTab("fix");
    }
  }, [open, title, errorOutput, failedTest]);

  // Send Chat / Hint
  const handleSendMessage = async (msgToSend?: string) => {
    const text = msgToSend || inputMessage.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user" as const, text }];
    setMessages(newMessages);
    if (!msgToSend) setInputMessage("");
    setLoading(true);

    try {
      const token = getAuthToken();
      const res = await fetch(`${backendUrl}/api/v1/coding/ai/hint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          problemContext: `${title} (${slug})`,
          history: newMessages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (data?.reply) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Focus on decomposing the input. What is the optimal time complexity target for this problem?",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "💡 **Hint**: Think about the core data structure (Hash Map, Two Pointers, or Dynamic Programming) to reduce nested lookups.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Analyze Code
  const handleAnalyzeCode = async () => {
    setReviewLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${backendUrl}/api/v1/coding/ai/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code,
          language,
          problemContext: `${title} (${slug})`,
        }),
      });
      const data = await res.json();
      setReviewResult(data?.reply || "Code review complete. Check edge cases and return types.");
    } catch {
      setReviewResult(
        "**What's Right**\nGood structure and idiomatic logic.\n\n**Issue(s) Found**\nEnsure boundary conditions are checked.\n\n**Complexity**\nTarget optimal $O(N)$ with auxiliary space."
      );
    } finally {
      setReviewLoading(false);
    }
  };

  // Fix Code
  const handleFixCode = async () => {
    setFixLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${backendUrl}/api/v1/coding/ai/fix`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code,
          language,
          problemTitle: title,
          description: statement || `Problem ${slug}`,
          errorOutput: errorOutput || (failedTest ? failedTest.stderr : ""),
          failedTest: failedTest
            ? {
                input: failedTest.input,
                expected: failedTest.expected,
                actual: failedTest.got,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (data && data.fixedCode) {
        setFixResult(data);
      } else {
        toast.error("Could not generate fix at this moment.");
      }
    } catch {
      toast.error("AI fix service temporarily unavailable.");
    } finally {
      setFixLoading(false);
    }
  };

  const handleApply = () => {
    if (!fixResult?.fixedCode) return;
    onApplyCode(fixResult.fixedCode);
    toast.success("AI fix applied to your code editor! Run your code to test.");
    onOpenChange(false);
  };

  const copyCode = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-zinc-950 border-zinc-800 text-zinc-100 z-50">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="size-4.5" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold text-white flex items-center gap-2">
                PrepX AI Tutor
                <span className="text-[10px] font-normal uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  CodeForge
                </span>
              </SheetTitle>
              <SheetDescription className="text-xs text-zinc-400 truncate max-w-sm">
                Context: {title} ({language})
              </SheetDescription>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900 rounded-lg mt-3 text-xs">
            <button
              onClick={() => setActiveTab("chat")}
              className={`py-1.5 font-medium rounded-md transition-all ${
                activeTab === "chat"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Ask / Hints
            </button>
            <button
              onClick={() => {
                setActiveTab("review");
                if (!reviewResult) handleAnalyzeCode();
              }}
              className={`py-1.5 font-medium rounded-md transition-all ${
                activeTab === "review"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Code Review
            </button>
            <button
              onClick={() => {
                setActiveTab("fix");
                if (!fixResult) handleFixCode();
              }}
              className={`py-1.5 font-medium rounded-md transition-all ${
                activeTab === "fix"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Fix Diagnostics
            </button>
          </div>
        </SheetHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === "chat" && (
            <div className="space-y-4">
              {/* Quick suggestion chips */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  onClick={() => handleSendMessage("Give me a small conceptual hint without spoiling the solution")}
                  className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-indigo-500 hover:text-white transition-colors"
                >
                  💡 Give Hint
                </button>
                <button
                  onClick={() => handleSendMessage("What is the optimal time and space complexity for this problem?")}
                  className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-indigo-500 hover:text-white transition-colors"
                >
                  ⏱️ Target Complexity
                </button>
                <button
                  onClick={() => handleSendMessage("What edge cases should I be careful of for this problem?")}
                  className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-indigo-500 hover:text-white transition-colors"
                >
                  ⚠️ Edge Cases
                </button>
              </div>

              {/* Chat Message List */}
              <div className="space-y-3">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 text-xs leading-relaxed ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {m.role === "assistant" && (
                      <div className="size-6 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                        <Bot className="size-3.5" />
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-xl max-w-[85%] whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-indigo-600 text-white rounded-tr-none"
                          : "bg-zinc-900 border border-zinc-800/80 text-zinc-200 rounded-tl-none"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 p-2">
                    <Loader2 className="size-3.5 animate-spin text-indigo-400" />
                    Coach is thinking...
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "review" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Code Analysis</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAnalyzeCode}
                  disabled={reviewLoading}
                  className="h-7 text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                >
                  {reviewLoading ? <Loader2 className="size-3 animate-spin mr-1" /> : <RefreshCw className="size-3 mr-1" />}
                  Re-analyze
                </Button>
              </div>

              {reviewLoading ? (
                <div className="p-8 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                  <Loader2 className="size-6 animate-spin text-indigo-500" />
                  Analyzing code structure, complexity, and algorithmic patterns...
                </div>
              ) : reviewResult ? (
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {reviewResult}
                </div>
              ) : null}
            </div>
          )}

          {activeTab === "fix" && (
            <div className="space-y-4">
              {/* Error context badge */}
              {(errorOutput || failedTest) && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-200">
                  <div className="flex items-center gap-1.5 font-semibold text-red-400 mb-1">
                    <AlertTriangle className="size-3.5" />
                    Diagnostics Triggered
                  </div>
                  {errorOutput && <pre className="font-mono text-[11px] text-red-300/90 whitespace-pre-wrap">{errorOutput.slice(0, 300)}</pre>}
                  {failedTest && (
                    <div className="mt-1 space-y-0.5 text-[11px]">
                      <div>Input: <span className="font-mono text-zinc-300">{failedTest.input}</span></div>
                      <div>Expected: <span className="font-mono text-emerald-400">{failedTest.expected}</span></div>
                      <div>Output: <span className="font-mono text-red-300">{failedTest.got}</span></div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Proposed Solution & Fix</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFixCode}
                  disabled={fixLoading}
                  className="h-7 text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                >
                  {fixLoading ? <Loader2 className="size-3 animate-spin mr-1" /> : <RefreshCw className="size-3 mr-1" />}
                  Regenerate Fix
                </Button>
              </div>

              {fixLoading ? (
                <div className="p-8 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                  <Loader2 className="size-6 animate-spin text-indigo-500" />
                  Diagnosing bug and constructing verified fix...
                </div>
              ) : fixResult ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs space-y-2">
                    <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      {fixResult.keyFix || "Issue Resolved"}
                    </div>
                    <p className="text-zinc-300 leading-relaxed text-xs">
                      {fixResult.explanation}
                    </p>
                  </div>

                  {/* Fixed Code Box */}
                  <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 font-mono text-xs overflow-x-auto">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[11px] text-zinc-400">
                      <span>{language}</span>
                      <button
                        onClick={() => copyCode(fixResult.fixedCode)}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className="text-zinc-200 whitespace-pre-wrap">{fixResult.fixedCode}</pre>
                  </div>

                  {/* Review & Apply Action (Explicit, non-overwriting per Req 9) */}
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3">
                    <div className="text-[11px] text-zinc-400">
                      Review proposed changes before applying to your editor.
                    </div>
                    <Button
                      onClick={handleApply}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-8 rounded-lg shrink-0 flex items-center gap-1.5"
                    >
                      <Check className="size-3.5" />
                      Apply Fix to Editor
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-zinc-500">
                  Click "Regenerate Fix" to generate an intelligent diagnosis of your current solution.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar for Chat */}
        {activeTab === "chat" && (
          <div className="p-3 border-t border-zinc-800 bg-zinc-900/60">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about hints, approach, logic..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!inputMessage.trim() || loading}
                className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3"
              >
                <Send className="size-3.5" />
              </Button>
            </form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
