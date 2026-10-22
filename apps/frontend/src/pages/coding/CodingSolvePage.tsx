import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router";
import Editor from "@monaco-editor/react";
import { codingApi } from "../../services/codingApi";
import type { Problem, Submission } from "../../services/codingApi";
import { Play, Send, RotateCcw, CheckCircle, XCircle, AlertTriangle, Clock, Code2, ArrowLeft, History, FileText, Check, Bot, Sparkles, Loader2, Bookmark } from "lucide-react";
import { toast } from "react-toastify";
import { getErrorMessage } from "../../lib/utils";
import { SkeletonCodingWorkspace } from "../../components/ui/skeleton";
import { useAuth } from "../../context/AuthContext";

const DEFAULT_STARTERS: Record<string, string> = {
  javascript: "// Write your solution here\nvar solve = function() {\n  \n};",
  python: "# Write your solution here\nclass Solution:\n    def solve(self):\n        pass",
  cpp: "// Write your solution here\n#include <iostream>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        \n    }\n};",
  java: "// Write your solution here\nclass Solution {\n    public void solve() {\n        \n    }\n}",
  c: "// Write your solution here\n#include <stdio.h>\n\nvoid solve() {\n    \n}"
};

export const CodingSolvePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { refreshProfile } = useAuth();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<string>("javascript");
  const [code, setCode] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"description" | "submissions" | "ai">("description");
  const [activeTestTab, setActiveTestTab] = useState<"testcases" | "results">("testcases");
  const [mobileTab, setMobileTab] = useState<"problem" | "code">("problem");

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResults, setRunResults] = useState<any[] | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<Submission[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // AI Tutor State
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    {
      role: "ai",
      text: "👋 Hi! I am **CodeForge AI Tutor**. Need a hint, approach breakdown, or code review? Ask me anything about this problem!",
    },
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const aiChatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aiChatRef.current) {
      aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
    }
  }, [aiMessages, aiLoading]);

  useEffect(() => {
    if (slug) {
      fetchProblem();
    }
  }, [slug]);

  const fetchProblem = async () => {
    setLoading(true);
    try {
      const data = await codingApi.getProblemBySlug(slug!);
      setProblem(data);
      const initialCode = data.starter?.[language] || DEFAULT_STARTERS[language] || "";
      setCode(initialCode);
      fetchSubmissions(data._id);
      checkBookmarkStatus(data._id);
    } catch (error) {
      toast.error("Failed to load problem");
    } finally {
      setLoading(false);
    }
  };

  const checkBookmarkStatus = async (problemId: string) => {
    try {
      const bookmarks = await codingApi.getUserBookmarks();
      if (Array.isArray(bookmarks)) {
        setIsBookmarked(bookmarks.some((b: any) => (b._id || b) === problemId));
      }
    } catch (err) {
      console.error("Failed to fetch bookmarks:", err);
    }
  };

  const handleToggleBookmark = async () => {
    if (!problem?._id) return;
    try {
      const res = await codingApi.toggleBookmark(problem._id);
      setIsBookmarked(res.bookmarked);
      if (res.bookmarked) {
        toast.success("Problem bookmarked!");
      } else {
        toast.info("Bookmark removed");
      }
    } catch (err) {
      toast.error("Please sign in to bookmark problems");
    }
  };

  const fetchSubmissions = async (problemId: string) => {
    try {
      const subs = await codingApi.getUserSubmissions(problemId);
      setUserSubmissions(subs || []);
    } catch (error) {
      console.error("Failed to load submissions:", error);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (problem && problem.starter && problem.starter[newLang]) {
      setCode(problem.starter[newLang]);
    } else {
      setCode(DEFAULT_STARTERS[newLang] || "");
    }
  };

  const handleResetCode = () => {
    if (problem && problem.starter && problem.starter[language]) {
      setCode(problem.starter[language]);
    } else {
      setCode(DEFAULT_STARTERS[language] || "");
    }
    toast.info("Code reset to template");
  };

  const sendAI = async (overrideMsg?: string) => {
    const msg = overrideMsg || aiInput.trim();
    if (!msg) return;
    if (!overrideMsg) setAiInput("");

    setAiMessages((prev) => [...prev, { role: "user", text: msg }]);
    setAiLoading(true);
    setActiveTab("ai");

    try {
      const problemContext = problem ? `${problem.title} — ${problem.description}` : "General DSA problem";
      const history = aiMessages.slice(-6).map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.text,
      }));

      const res = await codingApi.getAIHint({
        message: msg,
        problemContext,
        history,
      });

      setAiMessages((prev) => [...prev, { role: "ai", text: res.reply || "No reply from AI." }]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        { role: "ai", text: "I'm having trouble connecting right now. Please try again!" },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIReview = async () => {
    if (!code.trim()) {
      toast.error("Please write some code before requesting an AI review!");
      return;
    }
    setAiLoading(true);
    setActiveTab("ai");
    setMobileTab("problem");
    setAiMessages((prev) => [
      ...prev,
      { role: "user", text: "🔍 Requesting AI Code Review for my current solution..." },
    ]);

    try {
      const problemContext = problem ? `${problem.title} — ${problem.description}` : "General DSA problem";
      const res = await codingApi.analyzeCodeWithAI({
        code,
        language,
        problemContext,
      });

      const replyText = res.reply || res.error || "Code review completed.";
      setAiMessages((prev) => [...prev, { role: "ai", text: replyText }]);
    } catch (err: any) {
      console.error("AI Review error:", err);
      const fallbackMsg = err.response?.data?.error || err.response?.data?.message || "AI Code review temporary offline. Check sample test cases and complexity!";
      setAiMessages((prev) => [
        ...prev,
        { role: "ai", text: fallbackMsg },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRun = async () => {
    if (!code.trim()) {
      toast.error("Please write code before running!");
      return;
    }
    setMobileTab("code");
    setRunning(true);
    setRunResults(null);
    setSubmissionResult(null);
    setActiveTestTab("results");

    try {
      const res = await codingApi.runCode({
        code,
        language,
        problemId: problem?._id,
      });
      setRunResults(res.results || []);
      toast.success("Test execution completed");
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Execution error. Please check your syntax and test cases."));
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error("Please write code before submitting!");
      return;
    }
    if (!problem?._id) return;

    setMobileTab("code");
    setSubmitting(true);
    setSubmissionResult(null);
    setActiveTestTab("results");

    try {
      const res = await codingApi.submitCode({
        code,
        language,
        problemId: problem._id,
      });
      setSubmissionResult(res);
      if (res.verdict === "Accepted") {
        const xpEarned = res.gamification?.xpEarned;
        if (xpEarned && xpEarned > 0) {
          toast.success(`🎉 Solution Accepted! +${xpEarned} XP! (Total XP: ${res.gamification.newXP || ""})`);
        } else {
          toast.success("🎉 Solution Accepted!");
        }
        if (res.gamification?.newBadgesAwarded && res.gamification.newBadgesAwarded.length > 0) {
          toast.info(`🎖️ New Badge Unlocked: ${res.gamification.newBadgesAwarded.join(", ")}!`);
        }
        refreshProfile?.().catch(() => {});
      } else {
        toast.warn(`Verdict: ${res.verdict}`);
      }
      fetchSubmissions(problem._id);
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Submission error. Please check your code and try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <SkeletonCodingWorkspace />;
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <h2 className="text-2xl font-bold mb-4">Problem Not Found</h2>
        <Link to="/coding/problems" className="px-4 py-2 bg-blue-600 rounded-lg text-white text-sm font-medium">
          Back to Problems
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-[#09090b] text-zinc-100 flex flex-col overflow-hidden">
      
      {/* Top Action Bar */}
      <div className="min-h-12 border-b border-zinc-800 bg-zinc-900/95 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link to="/coding/problems" className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-semibold text-xs sm:text-sm text-zinc-200 truncate max-w-[130px] xs:max-w-[180px] sm:max-w-md">
            #{problem.number}. {problem.title}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold shrink-0 ${
            problem.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
            problem.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
            "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}>
            {problem.difficulty}
          </span>
          <button
            onClick={handleToggleBookmark}
            title={isBookmarked ? "Remove Bookmark" : "Bookmark Problem"}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? "text-amber-400 fill-amber-400" : ""}`} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
          {/* Language Picker */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python 3</option>
            <option value="cpp">C++</option>
            <option value="java">Java 15</option>
            <option value="c">C</option>
          </select>

          <button
            onClick={handleResetCode}
            title="Reset code template"
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleAIReview}
            disabled={aiLoading}
            title="Ask AI to review your current code"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline">AI Review</span>
          </button>

          <button
            onClick={handleRun}
            disabled={running || submitting}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            {running ? "..." : "Run"}
          </button>

          <button
            onClick={handleSubmit}
            disabled={running || submitting}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? "..." : "Submit"}
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex border-b border-zinc-800 bg-zinc-950 px-2 py-1.5 gap-1 shrink-0">
        <button
          onClick={() => setMobileTab("problem")}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "problem"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Problem &amp; AI
        </button>
        <button
          onClick={() => setMobileTab("code")}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "code"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" /> Code &amp; Test
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Left Side: Problem Spec & Submissions */}
        <div className={`lg:col-span-5 border-r border-zinc-800 bg-zinc-900/60 flex-col overflow-hidden ${mobileTab === "problem" ? "flex flex-1" : "hidden lg:flex"}`}>
          {/* Tabs */}
          <div className="flex items-center border-b border-zinc-800 bg-zinc-950 px-2">
            <button
              onClick={() => setActiveTab("description")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "description"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Description
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "ai"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-indigo-400" /> AI Tutor
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "submissions"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <History className="w-3.5 h-3.5" /> Submissions ({userSubmissions.length})
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {activeTab === "description" ? (
              <>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">{problem.title}</h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {problem.tags?.map((t) => (
                      <span key={t} className="px-2.5 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="prose prose-invert prose-slate max-w-none text-sm text-slate-300 space-y-3 leading-relaxed">
                  <p className="whitespace-pre-line">{problem.description}</p>
                </div>

                {/* Examples */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Examples</h3>
                  {problem.examples?.map((ex, i) => (
                    <div key={i} className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 font-sans font-medium">Input: </span>
                        <span className="text-blue-300">{ex.input}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans font-medium">Output: </span>
                        <span className="text-emerald-300">{ex.output}</span>
                      </div>
                      {ex.explanation && (
                        <div className="text-slate-400 font-sans text-xs pt-1 border-t border-slate-900">
                          <span className="font-semibold text-slate-300">Explanation: </span>{ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                {problem.constraints && problem.constraints.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Constraints</h3>
                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 font-mono">
                      {problem.constraints.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : activeTab === "ai" ? (
              /* AI Tutor Tab */
              <div className="flex flex-col h-full space-y-4">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1" ref={aiChatRef}>
                  {aiMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 text-xs leading-relaxed ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {m.role === "ai" && (
                        <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-[90%] rounded-xl p-3.5 border text-xs leading-relaxed break-words ${
                          m.role === "user"
                            ? "bg-blue-600 text-white border-blue-500"
                            : "bg-slate-950 text-slate-200 border-slate-800"
                        }`}
                        dangerouslySetInnerHTML={{
                          __html: m.text
                            .replace(/\\\log/g, "log")
                            .replace(/\$([^\$]+)\$/g, "<code class='inline-block whitespace-nowrap bg-slate-900/90 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-[11px] border border-indigo-500/20 my-0.5'>$1</code>")
                            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                            .replace(/`([^`]+)`/g, "<code class='inline-block whitespace-nowrap bg-slate-900 px-1 rounded text-blue-300 my-0.5'>$1</code>")
                            .replace(/\n/g, "<br/>"),
                        }}
                      />
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex gap-2 items-center text-xs text-indigo-400 p-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> CodeForge AI is thinking...
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Give Hint",
                      "Explain Approach",
                      "Time Complexity",
                      "Space Complexity",
                      "Optimal Complexity & Trade-offs",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => sendAI(q)}
                        disabled={aiLoading}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 hover:border-indigo-500/40 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ask CodeForge AI anything..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendAI()}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => sendAI()}
                      disabled={aiLoading || !aiInput.trim()}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Submissions Tab */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200">Your Submission History</h3>
                  <button 
                    onClick={() => problem?._id && fetchSubmissions(problem._id)}
                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                {userSubmissions.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2">
                    <p className="text-xs text-slate-400">No submissions recorded yet for this problem.</p>
                    <p className="text-[11px] text-slate-500">Run test cases and click "Submit Solution" to record your history.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {userSubmissions.map((sub) => (
                      <div 
                        key={sub._id} 
                        onClick={() => {
                          if (sub.code) {
                            setCode(sub.code);
                            toast.info(`Loaded submission from ${new Date(sub.createdAt).toLocaleTimeString()}`);
                          }
                        }}
                        className="p-3.5 bg-slate-950/80 hover:bg-slate-900/90 border border-slate-800/90 hover:border-blue-500/40 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer group shadow-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                              sub.verdict === "Accepted" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              {sub.verdict}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              Passed {sub.testsPassed}/{sub.testsTotal}
                            </span>
                          </div>
                          <div className="text-slate-400 font-mono text-[11px]">
                            {sub.language} • {sub.runtime}
                          </div>
                        </div>
                        <div className="text-right space-y-0.5">
                          <div className="text-slate-300 text-[11px] font-medium">
                            {new Date(sub.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </div>
                          <div className="text-slate-500 text-[10px] font-mono">
                            {new Date(sub.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Code Editor & Execution Results */}
        <div className={`lg:col-span-7 flex-col bg-[#09090b] overflow-hidden ${mobileTab === "code" ? "flex flex-1" : "hidden lg:flex"}`}>
          
          {/* Monaco Editor Pane */}
          <div className="flex-1 border-b border-zinc-800 relative">
            <Editor
              height="100%"
              language={language === "cpp" || language === "c" ? "cpp" : language}
              value={code}
              onChange={(v) => setCode(v || "")}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                automaticLayout: true,
                fontFamily: "Fira Code, monospace",
                lineNumbersMinChars: 3,
              }}
            />
          </div>

          {/* Execution / Result Bottom Drawer */}
          <div className="h-64 border-t border-zinc-800 bg-zinc-900/90 flex flex-col overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2">
              <div className="flex items-center gap-4 text-xs font-semibold">
                <button
                  onClick={() => setActiveTestTab("testcases")}
                  className={activeTestTab === "testcases" ? "text-blue-400 font-bold" : "text-zinc-400 hover:text-zinc-200"}
                >
                  Testcases
                </button>
                <button
                  onClick={() => setActiveTestTab("results")}
                  className={activeTestTab === "results" ? "text-blue-400 font-bold" : "text-zinc-400 hover:text-zinc-200"}
                >
                  Execution Results
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
              {activeTestTab === "testcases" ? (
                <div className="space-y-3">
                  <p className="text-zinc-400 font-sans text-xs">Sample Test Cases for Verification:</p>
                  {problem.examples?.map((ex, i) => (
                    <div key={i} className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                      <span className="text-zinc-500">Case {i + 1}: </span>
                      <span className="text-zinc-200">{ex.input}</span>
                    </div>
                  ))}
                </div>
              ) : (
                /* Results View */
                <div>
                  {submissionResult ? (
                    <div className="space-y-3">
                      <div className={`p-3 rounded-xl border flex items-center justify-between font-sans ${
                        submissionResult.verdict === "Accepted"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      }`}>
                        <div className="flex items-center gap-2 font-bold text-sm">
                          {submissionResult.verdict === "Accepted" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          {submissionResult.verdict}
                        </div>
                        <div className="text-xs font-mono">
                          Runtime: {submissionResult.runtime} | Passed: {submissionResult.testsPassed}/{submissionResult.testsTotal}
                        </div>
                      </div>

                      {submissionResult.failCase && (
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                          <p className="text-rose-400 font-bold font-sans">First Failed Case:</p>
                          <div><span className="text-zinc-500">Input: </span>{submissionResult.failCase.input}</div>
                          <div><span className="text-zinc-500">Expected: </span>{submissionResult.failCase.expected}</div>
                          <div><span className="text-zinc-500">Actual: </span>{submissionResult.failCase.actual}</div>
                        </div>
                      )}
                    </div>
                  ) : runResults ? (
                    <div className="space-y-3">
                      {runResults.map((r, i) => (
                        <div key={i} className={`p-3 rounded-lg border ${
                          r.passed ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"
                        }`}>
                          <div className="flex items-center justify-between mb-1 font-sans">
                            <span className="font-bold text-zinc-200">Testcase #{i + 1}</span>
                            <span className={`text-xs ${r.passed ? "text-emerald-400" : "text-rose-400"}`}>
                              {r.passed ? "PASSED" : "FAILED"}
                            </span>
                          </div>
                          <div><span className="text-zinc-500">Input: </span>{r.input}</div>
                          <div><span className="text-zinc-500">Output: </span>{r.actual}</div>
                          {r.expected && <div><span className="text-zinc-500">Expected: </span>{r.expected}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500 font-sans text-center py-6">
                      Click <span className="text-zinc-300 font-bold">Run</span> to test sample cases or <span className="text-blue-400 font-bold">Submit</span> to evaluate solution.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
