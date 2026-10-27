import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import {
  Terminal,
  Compass,
  Building2,
  BookOpen,
  Cpu,
  RotateCcw,
  Flame,
  Award,
  ArrowLeft,
  Trophy,
  Zap,
  Sparkles,
} from "lucide-react";
import { useGamification } from "../../context/GamificationContext";
import { NativeDsaCatalog } from "./NativeDsaCatalog";
import { NativeProblemDetail } from "./NativeProblemDetail";
import { NativeRoadmaps } from "./NativeRoadmaps";
import { NativeCompanies } from "./NativeCompanies";
import { NativeCs } from "./NativeCs";
import { NativeSystemDesign } from "./NativeSystemDesign";
import { NativeReview } from "./NativeReview";
import {
  StreakModal,
  RatingModal,
  JudgeStatusModal,
} from "../../components/coding/PlatformStatusModals";

export function CodingPlatformPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useParams();

  const userPrefixMatch = location.pathname.match(/^(\/[a-f0-9]{24})\/coding/);
  const userPrefix = userPrefixMatch ? userPrefixMatch[1] : (userId ? `/${userId}` : "");
  const baseRoute = `${userPrefix}/coding`;

  // Determine active section from URL
  const pathname = location.pathname;
  const isProblemDetail = pathname.includes("/dsa/") && !pathname.endsWith("/dsa");

  const getActiveTab = (): string => {
    if (pathname.includes("/roadmaps")) return "roadmaps";
    if (pathname.includes("/companies")) return "companies";
    if (pathname.includes("/cs")) return "cs";
    if (pathname.includes("/system-design")) return "system-design";
    if (pathname.includes("/review")) return "review";
    return "dsa";
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tabId: string) => {
    if (tabId === "dsa") {
      navigate(baseRoute);
    } else {
      navigate(`${baseRoute}/${tabId}`);
    }
  };

  const {
    xp,
    levelNumber,
    levelTitle,
    progressPct,
    streakDays: gameStreak,
    rating: gameRating,
    openHub,
  } = useGamification();

  const streakDays = gameStreak || user?.codingStreak || user?.streakDays || 1;
  const userRating = gameRating || user?.rating || 1250;

  // Workable status modals
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [judgeModalOpen, setJudgeModalOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4.2rem)] bg-[#08080c] text-zinc-100 overflow-x-hidden">
      {/* Platform Control & Sub-nav Ribbon */}
      <header className="h-12 border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 z-20 select-none">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
          {/* Back to Dashboard */}
          <button
            onClick={() => navigate(userPrefix ? `${userPrefix}/dashboard` : "/dashboard")}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-md hover:bg-zinc-800 transition-all duration-150 active:scale-95 shrink-0 cursor-pointer"
            title="Back to PrepX Dashboard"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 shrink-0" />

          {/* Sub-navigation tabs */}
          <nav className="flex items-center gap-1 shrink-0 text-xs font-medium">
            <button
              onClick={() => handleTabClick("dsa")}
              className={`px-2.5 py-1 rounded-md transition-all duration-150 ease-out active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "dsa"
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Terminal className="size-3.5" />
              <span>DSA Catalog</span>
            </button>

            <button
              onClick={() => handleTabClick("roadmaps")}
              className={`px-2.5 py-1 rounded-md transition-all duration-150 ease-out active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "roadmaps"
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Compass className="size-3.5" />
              <span>Roadmaps</span>
            </button>

            <button
              onClick={() => handleTabClick("companies")}
              className={`px-2.5 py-1 rounded-md transition-all duration-150 ease-out active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "companies"
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Building2 className="size-3.5" />
              <span>Companies</span>
            </button>

            <button
              onClick={() => handleTabClick("cs")}
              className={`px-2.5 py-1 rounded-md transition-all duration-150 ease-out active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "cs"
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <BookOpen className="size-3.5" />
              <span>CS Subjects</span>
            </button>

            <button
              onClick={() => handleTabClick("system-design")}
              className={`px-2.5 py-1 rounded-md transition-all duration-150 ease-out active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "system-design"
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Cpu className="size-3.5" />
              <span>System Design</span>
            </button>

            <button
              onClick={() => handleTabClick("review")}
              className={`px-2.5 py-1 rounded-md transition-all duration-150 ease-out active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "review"
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <RotateCcw className="size-3.5" />
              <span>Review Queue</span>
            </button>
          </nav>
        </div>

        {/* Workable Gamification & System Status Ribbon */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 text-xs">
          {/* Level Progress Pill (Workable) */}
          <button
            onClick={() => openHub("overview")}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-full bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 hover:border-indigo-400/60 hover:bg-indigo-900/40 transition-all cursor-pointer shadow-xs active:scale-95"
            title={`Level ${levelNumber}: ${levelTitle} (${xp} XP) - Click to open Gamification Hub`}
          >
            <div className="flex size-4.5 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-[10px] font-black text-white shadow-xs">
              {levelNumber}
            </div>
            <span className="font-bold text-white">L{levelNumber}</span>
            <div className="hidden lg:flex items-center gap-1.5 pl-0.5">
              <div className="h-1.5 w-10 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] text-indigo-300 font-mono font-medium">{xp} XP</span>
            </div>
          </button>

          {/* 1. Workable Streak Pill */}
          <button
            onClick={() => setStreakModalOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 font-semibold hover:border-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all cursor-pointer shadow-xs"
            title={`${streakDays}-Day Practice Streak - Click to view weekly calendar & multipliers`}
          >
            <Flame className="size-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span>{streakDays}d<span className="hidden sm:inline"> Streak</span></span>
          </button>

          {/* 2. Workable Rating Pill */}
          <button
            onClick={() => setRatingModalOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 font-semibold hover:border-purple-400 hover:bg-purple-500/20 active:scale-95 transition-all cursor-pointer shadow-xs"
            title={`${userRating} Elo Rating - Click to view competitive division tiers`}
          >
            <Award className="size-3.5 text-purple-400" />
            <span>{userRating}<span className="hidden sm:inline"> Rating</span></span>
          </button>

          {/* 3. Workable Judge Active Pill */}
          <button
            onClick={() => setJudgeModalOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-medium hover:border-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer shadow-xs text-[11px]"
            title="Judge Execution Engine - Click to run live ping diagnostic test"
          >
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span><span className="hidden sm:inline">Judge </span>Active</span>
          </button>

          {/* Hub Launcher Button */}
          <button
            onClick={() => openHub("overview")}
            className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-indigo-500/20 border border-amber-500/30 hover:border-amber-400 text-amber-200 font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-xs shadow-amber-500/10"
            title="Open Centralized PrepX Gamification & Leaderboard Hub"
          >
            <Trophy className="size-3.5 text-amber-400" />
            <span>Rewards</span>
          </button>
        </div>
      </header>

      {/* Native Instant Application Canvas - Zero Latency, Zero Iframe */}
      <main className="relative flex-1 w-full bg-[#08080c] min-h-0 flex flex-col overflow-y-auto">
        {isProblemDetail ? (
          <NativeProblemDetail />
        ) : activeTab === "roadmaps" ? (
          <NativeRoadmaps />
        ) : activeTab === "companies" ? (
          <NativeCompanies />
        ) : activeTab === "cs" ? (
          <NativeCs />
        ) : activeTab === "system-design" ? (
          <NativeSystemDesign />
        ) : activeTab === "review" ? (
          <NativeReview />
        ) : (
          <NativeDsaCatalog />
        )}
      </main>

      {/* Interactive Status Modals */}
      <StreakModal
        isOpen={streakModalOpen}
        onClose={() => setStreakModalOpen(false)}
        streakDays={streakDays}
        onOpenHub={() => openHub("quests")}
      />

      <RatingModal
        isOpen={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
        rating={userRating}
        onOpenHub={() => openHub("leaderboard")}
      />

      <JudgeStatusModal
        isOpen={judgeModalOpen}
        onClose={() => setJudgeModalOpen(false)}
      />
    </div>
  );
}
export default CodingPlatformPage;
