import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { Code2, Flame, Award, Target, Trophy, Play, CheckCircle2, ArrowRight, Zap } from "lucide-react";
import { fetchUserProgressApi, fetchRecommendationsApi, fetchCodingLeaderboardApi } from "../services/codingApi";
import type { UserCodingProgressData, CodingProblem, LeaderboardItemData } from "../types/coding";
import { Button } from "../../../components/ui/button";

export function CodingDashboardPage() {
  const { userId } = useParams();
  const [progress, setProgress] = useState<UserCodingProgressData | null>(null);
  const [recommendations, setRecommendations] = useState<CodingProblem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItemData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [progRes, recRes, leadRes] = await Promise.all([
          fetchUserProgressApi(),
          fetchRecommendationsApi(),
          fetchCodingLeaderboardApi(),
        ]);
        if (progRes.success) setProgress(progRes.data);
        if (recRes.success) setRecommendations(recRes.data.recommendations);
        if (leadRes.success) setLeaderboard(leadRes.data.leaderboard);
      } catch (err) {
        console.error("Failed to load coding dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-[#050507] text-white p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-blue-950/40 border border-purple-500/20 p-8 md:p-10 overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider border border-purple-500/30">
              <Code2 className="size-3.5" /> PrepX AI Coding Arena
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              Placement Coding Practice
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-xl">
              Solve company-focused DSA problems with instant Monaco code editor execution, progressive AI hints, and ATS placement contribution scores.
            </p>
          </div>

          <Link to="/coding/problems">
            <Button className="h-12 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 transition-all flex items-center gap-2 cursor-pointer">
              Explore Problems <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <div className="text-zinc-400 font-medium">Solved Problems</div>
              <div className="text-base font-bold text-white">{progress?.solvedCount || 0} / {progress?.totalProblems || 200}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Award className="size-4" />
            </div>
            <div>
              <div className="text-zinc-400 font-medium">Total XP & Level</div>
              <div className="text-base font-bold text-white">{progress?.totalXP || 0} XP (L{progress?.currentLevel || 1})</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Flame className="size-4" />
            </div>
            <div>
              <div className="text-zinc-400 font-medium">Streak</div>
              <div className="text-base font-bold text-white">{progress?.currentStreak || 0} Days 🔥</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Target className="size-4" />
            </div>
            <div>
              <div className="text-zinc-400 font-medium">Placement Coding Score</div>
              <div className="text-base font-bold text-white">{progress?.placementCodingScore || 0}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Difficulty Breakdown & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Difficulty Card */}
        <div className="p-6 rounded-2xl bg-[#0C0C12] border border-zinc-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="size-4 text-amber-400" /> Solved Breakdown
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="font-semibold text-emerald-400">Easy Solved</span>
              <span className="font-extrabold text-white text-sm">{progress?.easySolved || 0}</span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="font-semibold text-amber-400">Medium Solved</span>
              <span className="font-extrabold text-white text-sm">{progress?.mediumSolved || 0}</span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="font-semibold text-rose-400">Hard Solved</span>
              <span className="font-extrabold text-white text-sm">{progress?.hardSolved || 0}</span>
            </div>
          </div>
        </div>

        {/* Recommended Problems */}
        <div className="p-6 rounded-2xl bg-[#0C0C12] border border-zinc-800 space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="size-4 text-purple-400" /> Recommended For Your Placement Target
            </h3>
            <Link to="/coding/problems" className="text-xs text-purple-400 font-semibold hover:underline">View All</Link>
          </div>

          <div className="space-y-3">
            {recommendations.length === 0 ? (
              <div className="p-4 rounded-xl bg-zinc-900/40 text-xs text-zinc-400 text-center">
                All recommended problems solved! Explore the full catalog.
              </div>
            ) : (
              recommendations.map((prob) => (
                <div key={prob._id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm hover:text-purple-400 transition-colors">
                      <Link to={`/coding/problem/${prob.slug}`}>{prob.title}</Link>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        prob.difficulty === "Easy" ? "bg-emerald-500/20 text-emerald-400" : prob.difficulty === "Medium" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"
                      }`}>
                        {prob.difficulty}
                      </span>
                      <span>• {prob.topics.join(", ")}</span>
                    </div>
                  </div>

                  <Link to={`/coding/problem/${prob.slug}`}>
                    <Button className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold h-9 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer">
                      Solve <Play className="size-3 fill-purple-300" />
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
