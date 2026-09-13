import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { Trophy, Award, Flame, User, CheckCircle2 } from "lucide-react";
import { fetchCodingLeaderboardApi } from "../services/codingApi";
import type { LeaderboardItemData } from "../types/coding";

export function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItemData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const res = await fetchCodingLeaderboardApi();
        if (res.success) setLeaderboard(res.data.leaderboard);
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-[#050507] text-white p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <Trophy className="size-6 text-amber-400" /> PrepX Coding Leaderboard
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Top placement candidates ranked by total XP and solved problems</p>
        </div>
      </div>

      <div className="bg-[#0D0D14] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0A0A0E] text-zinc-400 border-b border-zinc-800 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="py-4 px-6">Rank</th>
              <th className="py-4 px-6">User</th>
              <th className="py-4 px-6">Level</th>
              <th className="py-4 px-6">Solved</th>
              <th className="py-4 px-6">Streak</th>
              <th className="py-4 px-6 text-right">Total XP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="py-4 px-6 bg-zinc-900/20"></td>
                </tr>
              ))
            ) : leaderboard.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500">
                  No leaderboard entries available yet.
                </td>
              </tr>
            ) : (
              leaderboard.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-4 px-6 font-bold text-amber-400">
                    {item.rank === 1 ? "🥇 1" : item.rank === 2 ? "🥈 2" : item.rank === 3 ? "🥉 3" : `#${item.rank}`}
                  </td>
                  <td className="py-4 px-6 font-bold text-white flex items-center gap-2">
                    <User className="size-4 text-zinc-400" />
                    {item.fullName}
                  </td>
                  <td className="py-4 px-6 text-purple-400 font-semibold">L{item.currentLevel}</td>
                  <td className="py-4 px-6 text-emerald-400 font-semibold">{item.solvedCount}</td>
                  <td className="py-4 px-6 text-orange-400 font-semibold">{item.streak} Days 🔥</td>
                  <td className="py-4 px-6 text-right font-extrabold text-white">{item.totalXP.toLocaleString()} XP</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
