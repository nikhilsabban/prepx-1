import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { codingApi } from "../../services/codingApi";
import type { Problem } from "../../services/codingApi";
import { Search, Code2, Trophy, CheckCircle2, Flame, Sparkles, Filter, ChevronRight, Zap, Bookmark } from "lucide-react";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "react-toastify";

export const CodingProblemsPage: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [tags, setTags] = useState<string[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  useEffect(() => {
    fetchData();
    fetchBookmarks();
  }, [selectedDifficulty, selectedTag]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [probRes, tagsRes] = await Promise.all([
        codingApi.getProblems({
          difficulty: selectedDifficulty,
          tag: selectedTag,
          search,
        }),
        codingApi.getTags(),
      ]);
      setProblems(probRes.problems || []);
      setTags(tagsRes || []);
    } catch (error) {
      console.error("Error fetching problems:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const res = await codingApi.getUserBookmarks();
      if (Array.isArray(res)) {
        setBookmarkedIds(res.map((b: any) => b._id || b));
      }
    } catch (err) {
      console.error("Error fetching bookmarks:", err);
    }
  };

  const handleToggleBookmark = async (e: React.MouseEvent, problemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await codingApi.toggleBookmark(problemId);
      if (res.bookmarked) {
        setBookmarkedIds((prev) => [...prev, problemId]);
        toast.success("Problem bookmarked!");
      } else {
        setBookmarkedIds((prev) => prev.filter((id) => id !== problemId));
        toast.info("Bookmark removed");
      }
    } catch (err) {
      toast.error("Please sign in to bookmark problems");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const filteredProblems = problems.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));
    const matchesBookmark = showBookmarkedOnly ? bookmarkedIds.includes(p._id) : true;
    return matchesSearch && matchesBookmark;
  });

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case "Easy":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Easy</span>;
      case "Medium":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Medium</span>;
      case "Hard":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Hard</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{diff}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-medium mb-3">
                <Sparkles className="w-3.5 h-3.5" /> PrepX Coding Arena
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Master Data Structures & Algorithms
              </h1>
              <p className="mt-2 text-zinc-400 max-w-2xl text-sm sm:text-base">
                Solve curated coding challenges asked by top tech companies, build your algorithmic streak, and boost your placement readiness.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                to="/coding/leaderboard"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-sm transition-all duration-200 shadow-lg shadow-amber-500/5"
              >
                <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard
              </Link>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-2xl border border-white/10">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by title, tag, or topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors shadow-inner"
            />
          </form>

          {/* Difficulty & Bookmark Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto pb-2 md:pb-0">
            <span className="text-xs text-zinc-400 font-medium flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-indigo-400" /> Filters:
            </span>
            {["all", "Easy", "Medium", "Hard"].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                  selectedDifficulty === diff
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 font-semibold"
                    : "glass-pill text-zinc-400 hover:text-white"
                }`}
              >
                {diff}
              </button>
            ))}

            <button
              onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                showBookmarkedOnly
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/30"
                  : "glass-pill text-zinc-400 hover:text-white"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${showBookmarkedOnly ? "fill-zinc-950" : ""}`} />
              Bookmarked ({bookmarkedIds.length})
            </button>
          </div>
        </div>

        {/* Problem List */}
        <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/40">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48 bg-zinc-800" />
                    <Skeleton className="h-4 w-32 bg-zinc-800/60" />
                  </div>
                  <Skeleton className="h-8 w-24 bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Code2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-zinc-300">No problems match your filter</h3>
              <p className="text-sm text-zinc-500 mt-1">Try broadening your search criteria or resetting filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-zinc-950/80 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <span className="col-span-1">#</span>
                <span className="col-span-5">Problem Title</span>
                <span className="col-span-2">Difficulty</span>
                <span className="col-span-2">Acceptance</span>
                <span className="col-span-2 text-right">Action</span>
              </div>

              {filteredProblems.map((prob) => (
                <div
                  key={prob._id || prob.slug}
                  className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 px-4 sm:px-6 py-4 items-start md:items-center hover:bg-zinc-800/40 transition-colors group"
                >
                  {/* Problem Number & Title */}
                  <div className="md:col-span-1 text-zinc-500 text-xs sm:text-sm font-medium flex items-center justify-between w-full md:w-auto">
                    <span>#{prob.number}</span>
                    <div className="flex md:hidden items-center gap-2">
                      {getDifficultyBadge(prob.difficulty)}
                      <span className="text-zinc-500 text-xs font-mono">
                        {prob.acceptance ? `${prob.acceptance.toFixed(1)}%` : "50.0%"}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-5 space-y-1.5 w-full">
                    <Link
                      to={`/coding/problem/${prob.slug}`}
                      className="font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors text-sm sm:text-base flex items-center gap-2"
                    >
                      {prob.title}
                    </Link>
                    <div className="flex flex-wrap gap-1.5">
                      {prob.tags?.slice(0, 3).map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="hidden md:block md:col-span-2">
                    {getDifficultyBadge(prob.difficulty)}
                  </div>

                  <div className="hidden md:block md:col-span-2 text-zinc-400 text-sm font-mono">
                    {prob.acceptance ? `${prob.acceptance.toFixed(1)}%` : "50.0%"}
                  </div>

                  <div className="md:col-span-2 w-full md:w-auto text-right flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800/60">
                    <span className="md:hidden text-zinc-500 text-xs">
                      Acceptance: <span className="text-zinc-300 font-mono">{prob.acceptance ? `${prob.acceptance.toFixed(1)}%` : "50.0%"}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleToggleBookmark(e, prob._id)}
                        title={bookmarkedIds.includes(prob._id) ? "Remove Bookmark" : "Bookmark Problem"}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        <Bookmark className={`w-4 h-4 ${bookmarkedIds.includes(prob._id) ? "text-amber-400 fill-amber-400" : ""}`} />
                      </button>
                      <Link
                        to={`/coding/problem/${prob.slug}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all group-hover:scale-105"
                      >
                        Solve <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
