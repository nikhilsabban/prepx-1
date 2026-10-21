import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { fetchMyInterviews, toggleBookmarkApi, type InterviewRecord } from "../services/interviewService";
import { 
  History, CheckCircle2, Clock, Award, ArrowRight, Play, 
  BarChart3, Loader2, Sparkles, AlertCircle, Bookmark, BookmarkCheck,
  ChevronDown, MessageSquare, Bot, User
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "react-toastify";

export function HistoryPage() {
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInterviewIds, setExpandedInterviewIds] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const toggleExpand = (id: string) => {
    setExpandedInterviewIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await fetchMyInterviews();
        setInterviews(data.interviews || []);
      } catch (err) {
        console.error("Failed to load interview history:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const handleToggleBookmark = async (interviewId: string) => {
    try {
      const res = await toggleBookmarkApi(interviewId);
      if (res.success) {
        toast.success(res.message);
        setInterviews((prev) =>
          prev.map((item) =>
            item._id === interviewId ? { ...item, isBookmarked: res.isBookmarked } : item
          )
        );
      }
    } catch (err: any) {
      toast.error("Failed to update bookmark");
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white pt-24 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
              <History className="size-4" /> Interview Records
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">AI Interview History</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Resume incomplete sessions or review full performance analytics of finished interviews.
            </p>
          </div>

          <Link to="/ai-interview">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-10 px-5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20">
              <Play className="size-3.5 fill-white" /> Start New Interview
            </Button>
          </Link>
        </div>

        {/* Skeleton Loading State */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800/80 animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-32 bg-zinc-800 rounded-full"></div>
                    <div className="h-4 w-40 bg-zinc-800/60 rounded"></div>
                  </div>
                  <div className="h-6 w-3/4 bg-zinc-800 rounded-lg"></div>
                  <div className="h-4 w-1/2 bg-zinc-800/60 rounded"></div>
                </div>
                <div className="h-10 w-36 bg-zinc-800 rounded-xl shrink-0"></div>
              </div>
            ))}
          </div>
        ) : interviews.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 rounded-2xl border border-dashed border-zinc-800 bg-[#0C0C12] p-8 space-y-4">
            <div className="size-14 mx-auto rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <History className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No interview history found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                You haven't conducted any AI interview rounds yet. Start a session with your GitHub repository or custom role!
              </p>
            </div>
            <Button
              onClick={() => navigate("/ai-interview")}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-10 px-6 rounded-xl"
            >
              Start Your First Interview
            </Button>
          </div>
        ) : (
          /* History List */
          <div className="space-y-4">
            {interviews.map((item) => {
              const isDone = item.status === "Done";
              const dateStr = new Date(item.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const timeStr = new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={item._id}
                  className={`p-6 rounded-2xl bg-[#0D0D14] border transition-all flex flex-col gap-5 hover:border-zinc-700 shadow-md ${
                    isDone ? "border-zinc-800/80" : "border-amber-500/30 bg-gradient-to-r from-[#0D0D14] via-[#12100E] to-[#0D0D14]"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    {/* Left Metadata Info */}
                    <div className="space-y-2.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isDone
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                          }`}
                        >
                          {isDone ? (
                            <>
                              <CheckCircle2 className="size-3.5" />
                              Finished & Analyzed
                            </>
                          ) : (
                            <>
                              <Clock className="size-3.5" />
                              In Progress (Left Unfinished)
                            </>
                          )}
                        </span>

                        <span className="text-xs text-zinc-500 font-mono">
                          ID: #{item._id.slice(-6)} • {dateStr} at {timeStr}
                        </span>

                        <button
                          onClick={() => handleToggleBookmark(item._id)}
                          className="ml-auto p-1.5 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                          title={item.isBookmarked ? "Remove bookmark" : "Bookmark this practice session"}
                        >
                          {item.isBookmarked ? (
                            <BookmarkCheck className="size-4 fill-purple-400" />
                          ) : (
                            <Bookmark className="size-4 text-zinc-400 hover:text-purple-400" />
                          )}
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        {item.title || item.githubMetadata?.[0]?.name || item.githubMetadata?.repoName || "AI Technical Interview"}
                        {item.difficulty && (
                          <span className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 font-semibold">
                            {item.difficulty}
                          </span>
                        )}
                      </h3>

                      {item.feedback ? (
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed max-w-2xl">
                          {item.feedback}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-300/80 flex items-center gap-1.5">
                          <AlertCircle className="size-3.5" />
                          Session was interrupted. You can resume this interview from where you left off!
                        </p>
                      )}
                    </div>

                    {/* Right Score & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 pt-4 md:pt-0 border-zinc-800/60 shrink-0">
                      {isDone && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl">
                          <Award className="size-4 text-emerald-400" />
                          <div>
                            <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Score</div>
                            <div className="text-sm font-extrabold text-white">{item.score} / 10</div>
                          </div>
                        </div>
                      )}

                      {isDone ? (
                        <Link to={`/result/${item._id}`}>
                          <Button className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold h-10 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer">
                            <BarChart3 className="size-4" /> View Full Analytics <ArrowRight className="size-3.5" />
                          </Button>
                        </Link>
                      ) : (
                        <Link to={`/interview/${item._id}`}>
                          <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs h-10 px-5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20">
                            <Play className="size-3.5 fill-white" /> Resume Interview <ArrowRight className="size-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Toggle Questions & Responses Section */}
                  <div className="border-t border-zinc-800/80 pt-3">
                    <button
                      onClick={() => toggleExpand(item._id)}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="size-3.5" />
                      <span>
                        {expandedInterviewIds[item._id] ? "Hide" : "View"} Questions & Responses ({item.messages?.length || 0})
                      </span>
                      <ChevronDown
                        className={`size-3.5 transition-transform duration-200 ${
                          expandedInterviewIds[item._id] ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {expandedInterviewIds[item._id] && (
                      <div className="mt-4 space-y-3 bg-[#08080C] rounded-xl p-4 border border-zinc-800/90 max-h-96 overflow-y-auto">
                        {!item.messages || item.messages.length === 0 ? (
                          <p className="text-xs text-zinc-500 italic py-2">
                            No questions or responses recorded yet for this session.
                          </p>
                        ) : (
                          item.messages.map((msg, index) => {
                            const isAi = msg.type === "Assistant";
                            const isLastAi = isAi && index === (item.messages?.findLastIndex?.((m) => m.type === "Assistant") ?? -1);
                            const msgTime = new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            });

                            return (
                              <div
                                key={msg.id || index}
                                className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                                  isAi
                                    ? "bg-violet-950/20 border-violet-500/20 text-violet-100"
                                    : "bg-emerald-950/20 border-emerald-500/20 text-emerald-100"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider">
                                    {isAi ? (
                                      <>
                                        <Bot className="size-3 text-violet-400" />
                                        <span className="text-violet-300">AI Interviewer</span>
                                        {!isDone && isLastAi && (
                                          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold normal-case">
                                            Where you left off
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <User className="size-3 text-emerald-400" />
                                        <span className="text-emerald-300">Your Response</span>
                                      </>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-zinc-500">{msgTime}</span>
                                </div>
                                <p className="text-zinc-200">{msg.message}</p>
                              </div>
                            );
                          })
                        )}

                        {!isDone && (
                          <div className="pt-2 flex justify-end">
                            <Link to={`/interview/${item._id}`}>
                              <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold h-8 px-4 rounded-lg flex items-center gap-1.5">
                                <Play className="size-3 fill-white" /> Resume From Here <ArrowRight className="size-3" />
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
