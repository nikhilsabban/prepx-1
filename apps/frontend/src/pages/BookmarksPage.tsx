import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { fetchBookmarksApi, toggleBookmarkApi, type InterviewRecord } from "../services/interviewService";
import { codingApi, type Problem } from "../services/codingApi";
import { fetchGDBookmarks, toggleGDBookmark, type IGDSession } from "../services/gdService";
import { Button } from "../components/ui/button";
import { SkeletonBookmarks } from "../components/ui/skeleton";
import { toast } from "react-toastify";
import {
  Bookmark,
  BookmarkCheck,
  Play,
  ArrowRight,
  Loader2,
  Sparkles,
  Calendar,
  Award,
  Code2,
  Users2,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

type TabType = "all" | "coding" | "gd" | "interviews";

export function BookmarksPage() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [codingProblems, setCodingProblems] = useState<Problem[]>([]);
  const [gdSessions, setGdSessions] = useState<IGDSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadAllBookmarks = async () => {
    setLoading(true);
    try {
      const [interviewRes, codingRes, gdRes] = await Promise.allSettled([
        fetchBookmarksApi(),
        codingApi.getUserBookmarks(),
        fetchGDBookmarks(),
      ]);

      if (interviewRes.status === "fulfilled" && interviewRes.value?.success && interviewRes.value.bookmarks) {
        setInterviews(interviewRes.value.bookmarks);
      }
      if (codingRes.status === "fulfilled" && Array.isArray(codingRes.value)) {
        // filter out null/unpopulated entries
        setCodingProblems(codingRes.value.filter(Boolean));
      }
      if (gdRes.status === "fulfilled" && Array.isArray(gdRes.value)) {
        setGdSessions(gdRes.value.filter(Boolean));
      }
    } catch (err: any) {
      toast.error("Failed to load some bookmarks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllBookmarks();
  }, []);

  const handleToggleInterview = async (interviewId: string) => {
    setTogglingId(`int_${interviewId}`);
    try {
      const res = await toggleBookmarkApi(interviewId);
      if (res.success) {
        toast.success(res.message || "Interview bookmark removed");
        setInterviews((prev) => prev.filter((b) => b._id !== interviewId));
      }
    } catch (err: any) {
      toast.error("Failed to update bookmark status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleCoding = async (problemId: string) => {
    setTogglingId(`code_${problemId}`);
    try {
      const res = await codingApi.toggleBookmark(problemId);
      if (res.success) {
        toast.success(res.message || "Coding problem bookmark removed");
        setCodingProblems((prev) => prev.filter((b) => b._id !== problemId));
      }
    } catch (err: any) {
      toast.error("Failed to update bookmark status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleGD = async (roomId: string) => {
    setTogglingId(`gd_${roomId}`);
    try {
      const res = await toggleGDBookmark(roomId);
      if (res.success) {
        toast.success(res.message || "GD bookmark removed");
        setGdSessions((prev) => prev.filter((b) => b.roomId !== roomId && b._id !== roomId));
      }
    } catch (err: any) {
      toast.error("Failed to update bookmark status");
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return <SkeletonBookmarks />;
  }

  const totalCount = interviews.length + codingProblems.length + gdSessions.length;

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 min-h-screen space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-5 sm:pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm shadow-purple-500/10">
              <Bookmark className="size-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Saved Bookmarks</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1.5">
            Your centralized hub for bookmarked AI interviews, coding challenges, and group discussions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/coding">
            <Button variant="outline" className="text-xs font-semibold border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-xl h-9">
              <Code2 className="size-3.5 mr-1 text-emerald-400" /> Solve Coding
            </Button>
          </Link>
          <Link to="/group-discussion">
            <Button variant="outline" className="text-xs font-semibold border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-xl h-9">
              <Users2 className="size-3.5 mr-1 text-cyan-400" /> Join GD
            </Button>
          </Link>
          <Link to="/ai-interview">
            <Button className="gap-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl h-9 px-4 shadow-lg shadow-purple-500/20 cursor-pointer">
              <Sparkles className="size-3.5" /> Start Interview
            </Button>
          </Link>
        </div>
      </div>

      {/* Categories Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800/70 scrollbar-none">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "all"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
          }`}
        >
          <Layers className="size-3.5" />
          <span>All Bookmarks</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${activeTab === "all" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-300"}`}>
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("coding")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "coding"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
          }`}
        >
          <Code2 className="size-3.5 text-emerald-400" />
          <span>Coding Problems</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${activeTab === "coding" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-300"}`}>
            {codingProblems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("gd")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "gd"
              ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
          }`}
        >
          <Users2 className="size-3.5 text-cyan-400" />
          <span>Group Discussions</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${activeTab === "gd" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-300"}`}>
            {gdSessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("interviews")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "interviews"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
          }`}
        >
          <Sparkles className="size-3.5 text-purple-400" />
          <span>AI Interviews</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${activeTab === "interviews" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-300"}`}>
            {interviews.length}
          </span>
        </button>
      </div>

      {/* Zero State if empty */}
      {totalCount === 0 && (
        <div className="p-16 rounded-3xl bg-[#0C0C12] border border-zinc-800/80 text-center flex flex-col items-center justify-center space-y-4 min-h-[380px]">
          <div className="size-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Bookmark className="size-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-bold text-white">No Saved Bookmarks Yet</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Bookmark any coding challenge, group discussion session, or AI interview to quickly review them later.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Link to="/coding">
              <Button variant="outline" className="text-xs font-semibold border-zinc-700 text-white hover:bg-zinc-800">
                Explore Coding
              </Button>
            </Link>
            <Link to="/gd">
              <Button variant="outline" className="text-xs font-semibold border-zinc-700 text-white hover:bg-zinc-800">
                Explore GD
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Grid of Bookmarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Coding Problems */}
        {(activeTab === "all" || activeTab === "coding") &&
          codingProblems.map((problem) => {
            const isToggling = togglingId === `code_${problem._id}`;
            const diffColor =
              problem.difficulty === "Easy"
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : problem.difficulty === "Medium"
                ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                : "text-rose-400 bg-rose-500/10 border-rose-500/20";

            return (
              <div
                key={`code_${problem._id}`}
                className="group relative p-5 sm:p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800/80 hover:border-emerald-500/40 transition-all shadow-xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                        <Code2 className="size-3" /> CODING
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${diffColor}`}>
                        {problem.difficulty}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleCoding(problem._id)}
                      disabled={isToggling}
                      className="p-1.5 rounded-lg text-emerald-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove bookmark"
                    >
                      {isToggling ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <BookmarkCheck className="size-4 fill-emerald-400/20" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
                    {problem.number ? `#${problem.number} ` : ""}{problem.title}
                  </h3>

                  <div className="flex flex-wrap gap-1.5">
                    {(problem.tags || []).slice(0, 3).map((tag, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                        {tag}
                      </span>
                    ))}
                    {problem.points ? (
                      <span className="text-[10px] font-mono text-amber-400 ml-auto font-bold flex items-center gap-0.5">
                        +{problem.points} XP
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-zinc-400">
                    {problem.acceptance ? `${problem.acceptance}% acceptance` : "Standard LeetCode"}
                  </span>
                  <Link to={`/coding/${problem.slug}`}>
                    <Button size="sm" className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg gap-1.5">
                      Solve <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}

        {/* Group Discussions */}
        {(activeTab === "all" || activeTab === "gd") &&
          gdSessions.map((gd) => {
            const isToggling = togglingId === `gd_${gd.roomId || gd._id}`;
            const isEnded = gd.status === "completed" || gd.status === "ended";

            return (
              <div
                key={`gd_${gd.roomId || gd._id}`}
                className="group relative p-5 sm:p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800/80 hover:border-cyan-500/40 transition-all shadow-xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                      <Users2 className="size-3" /> GROUP DISCUSSION
                    </span>

                    <button
                      onClick={() => handleToggleGD(gd.roomId || gd._id)}
                      disabled={isToggling}
                      className="p-1.5 rounded-lg text-cyan-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove bookmark"
                    >
                      {isToggling ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <BookmarkCheck className="size-4 fill-cyan-400/20" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                    {gd.topic?.title || gd.topicTitle || "Collaborative Group Discussion"}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-zinc-500" />
                      {gd.createdAt ? new Date(gd.createdAt).toLocaleDateString() : "Recent"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300">
                      {gd.mode === "voice" ? "🎙️ Voice" : "💬 Text"}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-cyan-400">
                    {isEnded ? "Analysis Ready" : "In Progress"}
                  </span>
                  <Link to={isEnded ? `/gd/result/${gd.roomId}` : `/gd/room/${gd.roomId}`}>
                    <Button size="sm" className="h-8 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg gap-1.5">
                      {isEnded ? "Review Result" : "Re-enter"} <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}

        {/* AI Interviews */}
        {(activeTab === "all" || activeTab === "interviews") &&
          interviews.map((item) => {
            const isDone = item.status === "Done";
            const title =
              item.title ||
              item.role ||
              (item.githubMetadata as any)?.[0]?.name ||
              (item.githubMetadata as any)?.repoName ||
              "AI Technical Interview";
            const isToggling = togglingId === `int_${item._id}`;

            return (
              <div
                key={`int_${item._id}`}
                className="group relative p-5 sm:p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800/80 hover:border-purple-500/40 transition-all shadow-xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                      <Sparkles className="size-3" /> {item.mode ? item.mode.toUpperCase() : "INTERVIEW"}
                    </span>

                    <button
                      onClick={() => handleToggleInterview(item._id)}
                      disabled={isToggling}
                      className="p-1.5 rounded-lg text-purple-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove bookmark"
                    >
                      {isToggling ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <BookmarkCheck className="size-4 fill-purple-400/20" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                    {title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-zinc-500" />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    {item.score > 0 && (
                      <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
                        <Award className="size-3.5" />
                        {item.score}/100
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-3">
                  <div className="text-[11px]">
                    {isDone ? (
                      <span className="text-emerald-400 font-medium">Completed</span>
                    ) : (
                      <span className="text-amber-400 font-medium">Pending Review</span>
                    )}
                  </div>

                  <Link to={isDone ? `/interview/${item._id}/result` : `/interview/${item._id}`}>
                    <Button
                      size="sm"
                      className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg gap-1.5"
                    >
                      {isDone ? "View Feedback" : "Continue"} <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
      </div>
    </main>
  );
}
