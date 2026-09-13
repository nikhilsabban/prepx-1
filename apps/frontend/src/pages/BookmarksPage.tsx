import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { fetchBookmarksApi, toggleBookmarkApi, type InterviewRecord } from "../services/interviewService";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, Play, ArrowRight, Loader2, Sparkles, Calendar, Award } from "lucide-react";

export function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const res = await fetchBookmarksApi();
      if (res.success && res.bookmarks) {
        setBookmarks(res.bookmarks);
      }
    } catch (err: any) {
      toast.error("Failed to load bookmarked interviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const handleToggleBookmark = async (interviewId: string) => {
    setTogglingId(interviewId);
    try {
      const res = await toggleBookmarkApi(interviewId);
      if (res.success) {
        toast.success(res.message);
        setBookmarks((prev) => prev.filter((b) => b._id !== interviewId));
      }
    } catch (err: any) {
      toast.error("Failed to update bookmark status");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 min-h-screen space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Bookmark className="size-5" />
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Saved Bookmarks</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1.5">
            Quickly revisit and practice your bookmarked AI interview sessions, question sets, and custom roles.
          </p>
        </div>

        <Link to="/">
          <Button className="gap-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl h-10 px-4 shadow-lg shadow-purple-500/20 cursor-pointer">
            <Sparkles className="size-3.5" /> Start New Interview
          </Button>
        </Link>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800/80 space-y-4 animate-pulse">
              <div className="h-5 bg-zinc-800 rounded w-3/4"></div>
              <div className="h-4 bg-zinc-800/60 rounded w-1/2"></div>
              <div className="h-10 bg-zinc-800/40 rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#0C0C12] border border-zinc-800/80 text-center flex flex-col items-center justify-center space-y-4 min-h-[380px]">
          <div className="size-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Bookmark className="size-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-bold text-white">No Saved Bookmarks Yet</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              You can bookmark any interview session or target practice role from your Dashboard or History tab to revisit it anytime.
            </p>
          </div>
          <Link to="/">
            <Button variant="outline" className="text-xs font-semibold border-zinc-700 text-white hover:bg-zinc-800 mt-2">
              Explore Practice Roles
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarks.map((item) => {
            const isDone = item.status === "Done";
            const title = item.title || item.role || item.githubMetadata?.[0]?.name || item.githubMetadata?.repoName || "AI Technical Interview";

            return (
              <div
                key={item._id}
                className="group relative p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800/80 hover:border-purple-500/40 transition-all shadow-xl flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {item.mode ? item.mode.toUpperCase() : "INTERVIEW"} MODE
                    </span>

                    <button
                      onClick={() => handleToggleBookmark(item._id)}
                      disabled={togglingId === item._id}
                      className="p-1.5 rounded-lg text-purple-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Remove bookmark"
                    >
                      {togglingId === item._id ? (
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
                      <span className="text-amber-400 font-medium animate-pulse">In Progress</span>
                    )}
                  </div>

                  {isDone ? (
                    <Link to={`/result/${item._id}`}>
                      <Button className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 text-xs font-bold h-9 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer">
                        View Analysis <ArrowRight className="size-3.5" />
                      </Button>
                    </Link>
                  ) : (
                    <Link to={`/interview/${item._id}`}>
                      <Button className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold h-9 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-500/20">
                        Practice <Play className="size-3.5 fill-white" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
