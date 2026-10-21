import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { codingApi } from "../../services/codingApi";
import type { LeaderboardUser } from "../../services/codingApi";
import { Trophy, Medal, Award, Flame, ArrowLeft, User as UserIcon } from "lucide-react";
import { Skeleton } from "../../components/ui/skeleton";

export const CodingLeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await codingApi.getLeaderboard();
      setLeaderboard(data || []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <div className="p-2 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40"><Trophy className="w-5 h-5 fill-amber-400" /></div>;
      case 2:
        return <div className="p-2 rounded-full bg-slate-300/20 text-slate-300 border border-slate-300/40"><Medal className="w-5 h-5" /></div>;
      case 3:
        return <div className="p-2 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40"><Award className="w-5 h-5" /></div>;
      default:
        return <span className="font-mono font-bold text-slate-400 text-sm">#{rank}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/coding/problems" className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
                <Trophy className="w-7 h-7 text-amber-400" /> PrepX Coding Leaderboard
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Top programmers ranked by rating, problem points, and consistency.
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard Table Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/40">
                  <Skeleton className="h-6 w-12 bg-zinc-800" />
                  <Skeleton className="h-6 w-48 bg-zinc-800" />
                  <Skeleton className="h-6 w-24 bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-zinc-300">No Leaderboard Data Yet</h3>
              <p className="text-sm text-zinc-500 mt-1">Start solving coding problems to rank on top of the leaderboard!</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-zinc-950/80 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <span className="col-span-2">Rank</span>
                <span className="col-span-5">Coder</span>
                <span className="col-span-3">Rating & Title</span>
                <span className="col-span-2 text-right">Solved</span>
              </div>

              {leaderboard.map((user) => (
                <div
                  key={user._id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="col-span-2 flex items-center">
                    {getRankBadge(user.rank)}
                  </div>

                  <div className="col-span-5 flex items-center gap-3">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.fullName} className="w-9 h-9 rounded-full object-cover border border-zinc-700" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-zinc-200 text-sm">{user.fullName}</h4>
                      <p className="text-xs text-zinc-500">@{user.username}</p>
                    </div>
                  </div>

                  <div className="col-span-3">
                    <div className="font-bold text-blue-400 text-sm">{user.rating} pts</div>
                    <span className="text-xs text-zinc-400">{user.ratingTitle}</span>
                  </div>

                  <div className="col-span-2 text-right font-mono text-sm font-semibold text-emerald-400">
                    {user.solvedCount} Solved
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
