import React, { useState } from "react";
import { useGamification, type Badge, type DailyQuest, type LeaderboardEntry } from "../../context/GamificationContext";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import {
  Trophy,
  Flame,
  Award,
  Zap,
  CheckCircle2,
  Lock,
  Crown,
  Sparkles,
  X,
  Code2,
  CalendarCheck,
  FileCheck,
  MessagesSquare,
  Cpu,
  Star,
  Timer,
  ArrowRight,
  TrendingUp,
  GraduationCap,
} from "lucide-react";

// Icon resolver for dynamic badge icons
function renderBadgeIcon(iconName: string, unlocked: boolean) {
  const className = `size-6 ${unlocked ? "text-amber-400" : "text-zinc-600"}`;
  switch (iconName) {
    case "CalendarCheck":
      return <CalendarCheck className={className} />;
    case "Flame":
      return <Flame className={className} />;
    case "Zap":
      return <Zap className={className} />;
    case "Code2":
      return <Code2 className={className} />;
    case "Timer":
      return <Timer className={className} />;
    case "Cpu":
      return <Cpu className={className} />;
    case "Award":
      return <Award className={className} />;
    case "FileCheck":
      return <FileCheck className={className} />;
    case "MessagesSquare":
      return <MessagesSquare className={className} />;
    case "Star":
      return <Star className={className} />;
    case "Trophy":
      return <Trophy className={className} />;
    case "Crown":
      return <Crown className={className} />;
    default:
      return <Award className={className} />;
  }
}

export function GamificationHubModal() {
  const {
    isHubOpen,
    closeHub,
    hubActiveTab,
    openHub,
    xp,
    levelNumber,
    levelTitle,
    nextTitle,
    xpInLevel,
    progressPct,
    streakDays,
    rating,
    ratingTitle,
    solvedCount,
    badges,
    unlockedBadgesCount,
    dailyQuests,
    leaderboard,
    claimQuest,
  } = useGamification();

  const { user } = useAuth();
  const navigate = useNavigate();
  const [badgeFilter, setBadgeFilter] = useState<string>("All");

  if (!isHubOpen) return null;

  const filteredBadges =
    badgeFilter === "All"
      ? badges
      : badges.filter((b) => b.category.toLowerCase() === badgeFilter.toLowerCase());

  const userPrefix = user?.id ? `/${user.id}` : "";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={closeHub}
      />

      {/* Main Hub Container */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-zinc-800 bg-[#09090d]/95 text-zinc-100 shadow-2xl shadow-indigo-950/40 backdrop-blur-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-10">
        {/* Top Header */}
        <div className="border-b border-zinc-800/80 bg-zinc-950/60 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-600/30">
              <Trophy className="size-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  PrepX Gamification Hub
                </h2>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  Centralized
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Unified XP, badges, daily quests & leaderboard across all features
              </p>
            </div>
          </div>

          {/* Quick Header Stats */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
              <Flame className="size-3.5 fill-amber-400 text-amber-400" />
              <span>{streakDays}d Streak</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
              <Zap className="size-3.5 fill-indigo-400 text-indigo-400" />
              <span>{xp} XP</span>
            </div>
            <button
              onClick={closeHub}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition cursor-pointer ml-1"
              aria-label="Close Hub"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-zinc-800/80 bg-zinc-950/30 px-4 sm:px-6 py-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => openHub("overview")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              hubActiveTab === "overview"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <Sparkles className="size-3.5" />
            <span>Overview & Level</span>
          </button>

          <button
            onClick={() => openHub("quests")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              hubActiveTab === "quests"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <CalendarCheck className="size-3.5" />
            <span>Daily Quests</span>
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-300 font-mono">
              {dailyQuests.filter((q) => !q.claimed && q.completed).length}
            </span>
          </button>

          <button
            onClick={() => openHub("badges")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              hubActiveTab === "badges"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <Award className="size-3.5" />
            <span>Badges Shelf</span>
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] text-amber-300 font-mono">
              {unlockedBadgesCount}/{badges.length}
            </span>
          </button>

          <button
            onClick={() => openHub("leaderboard")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              hubActiveTab === "leaderboard"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <Trophy className="size-3.5" />
            <span>Global Leaderboard</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto no-scrollbar space-y-6">
          {/* TAB 1: OVERVIEW */}
          {hubActiveTab === "overview" && (
            <div className="space-y-6">
              {/* Level Progress Hero Card */}
              <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-zinc-950/60 to-purple-950/30 p-5 sm:p-7">
                <div className="pointer-events-none absolute -right-10 -bottom-10 size-48 rounded-full bg-indigo-600/15 blur-3xl" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="relative flex size-16 sm:size-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 p-0.5 shadow-xl shadow-indigo-500/25">
                      <div className="flex size-full items-center justify-center rounded-2xl bg-zinc-950">
                        <span className="font-black text-2xl sm:text-3xl text-white">
                          L{levelNumber}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                          Tier {levelNumber} Candidate
                        </span>
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          Active Learner
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                        {levelTitle}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Next Title: <span className="text-zinc-200 font-medium">{nextTitle}</span>
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xs text-zinc-400">Total Experience</p>
                    <p className="text-2xl sm:text-3xl font-black text-white font-mono">{xp} XP</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{500 - xpInLevel} XP to Level {levelNumber + 1}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-400">Level Progress</span>
                    <span className="text-indigo-300 font-bold font-mono">{progressPct}%</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-zinc-900 border border-zinc-800/80 overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 transition-all duration-500 shadow-sm shadow-indigo-500/50"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                    <span>{xpInLevel} XP in level</span>
                    <span>500 XP required</span>
                  </div>
                </div>
              </div>

              {/* Centralized Feature XP Earning Ways */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Zap className="size-4 text-amber-400" />
                  Earn XP Across All PrepX Features
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      closeHub();
                      navigate(userPrefix ? `${userPrefix}/coding` : "/coding");
                    }}
                    className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/50 hover:border-indigo-500/40 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                          <Code2 className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                            Coding Platform
                          </p>
                          <p className="text-[11px] text-zinc-400">Solve DSA & System Design</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-400 font-mono">+100-300 XP</span>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      closeHub();
                      navigate("/ai-interview");
                    }}
                    className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/50 hover:border-purple-500/40 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
                          <Award className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                            AI Mock Interview
                          </p>
                          <p className="text-[11px] text-zinc-400">Complete AI technical rounds</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-400 font-mono">+150 XP</span>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      closeHub();
                      navigate(userPrefix ? `${userPrefix}/resume` : "/resume");
                    }}
                    className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/50 hover:border-emerald-500/40 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                          <FileCheck className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                            Resume Review
                          </p>
                          <p className="text-[11px] text-zinc-400">Score & optimize ATS resume</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-400 font-mono">+75-100 XP</span>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      closeHub();
                      navigate("/group-discussion");
                    }}
                    className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/50 hover:border-pink-500/40 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-pink-600/20 text-pink-400 border border-pink-500/30">
                          <MessagesSquare className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-pink-300 transition">
                            Group Discussion
                          </p>
                          <p className="text-[11px] text-zinc-400">Participate in voice GD rounds</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-400 font-mono">+100 XP</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DAILY QUESTS */}
          {hubActiveTab === "quests" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Today's Practice Quests</h4>
                  <p className="text-xs text-zinc-400">Quests reset every 24 hours at midnight</p>
                </div>
                <div className="text-xs font-medium text-indigo-400">
                  {dailyQuests.filter((q) => q.claimed).length} of {dailyQuests.length} Claimed
                </div>
              </div>

              <div className="space-y-3">
                {dailyQuests.map((quest) => (
                  <div
                    key={quest.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700/80 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl border shrink-0 ${
                          quest.claimed
                            ? "bg-zinc-900 border-zinc-800 text-zinc-500"
                            : quest.completed
                            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                            : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                        }`}
                      >
                        {quest.claimed ? (
                          <CheckCircle2 className="size-5" />
                        ) : (
                          <Zap className="size-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{quest.title}</p>
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 font-medium">
                            {quest.feature}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{quest.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 w-32 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{
                                width: `${Math.min(100, (quest.progress / quest.target) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {quest.progress}/{quest.target}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-xs font-bold text-amber-400 font-mono">
                        +{quest.xpReward} XP
                      </span>
                      {quest.claimed ? (
                        <span className="text-xs font-semibold text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
                          Claimed
                        </span>
                      ) : quest.completed ? (
                        <button
                          onClick={() => claimQuest(quest.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold text-white hover:brightness-110 active:scale-95 transition cursor-pointer shadow-md shadow-emerald-600/30"
                        >
                          Claim Reward
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            closeHub();
                            if (quest.feature.includes("Coding")) navigate(userPrefix ? `${userPrefix}/coding` : "/coding");
                            else if (quest.feature.includes("Interview")) navigate("/ai-interview");
                            else if (quest.feature.includes("Resume")) navigate(userPrefix ? `${userPrefix}/resume` : "/resume");
                            else if (quest.feature.includes("CS")) navigate(userPrefix ? `${userPrefix}/coding/cs` : "/coding/cs");
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition cursor-pointer"
                        >
                          Start Quest
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BADGES SHELF */}
          {hubActiveTab === "badges" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white">Engineering Master Badges</h4>
                  <p className="text-xs text-zinc-400">
                    Unlock badges by completing milestones across Coding, Interview, and Resume
                  </p>
                </div>
                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {["All", "General", "Coding", "Interview", "Resume", "Milestone"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setBadgeFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        badgeFilter === cat
                          ? "bg-indigo-600 text-white"
                          : "text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`relative p-4 rounded-2xl border transition-all ${
                      badge.unlocked
                        ? "border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-zinc-900/60 shadow-lg shadow-amber-500/10"
                        : "border-zinc-800/80 bg-zinc-900/20 opacity-70"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex size-12 shrink-0 items-center justify-center rounded-xl border ${
                          badge.unlocked
                            ? "border-amber-500/40 bg-amber-500/20 shadow-inner"
                            : "border-zinc-800 bg-zinc-900"
                        }`}
                      >
                        {badge.unlocked ? (
                          renderBadgeIcon(badge.icon, true)
                        ) : (
                          <Lock className="size-5 text-zinc-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-white truncate">{badge.name}</p>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                              badge.unlocked
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            {badge.unlocked ? "Unlocked" : "Locked"}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                          {badge.description}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-500 mt-2">
                          Requires {badge.xpRequirement} XP
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LEADERBOARD */}
          {hubActiveTab === "leaderboard" && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-bold text-white">Global Candidate Standings</h4>
                <p className="text-xs text-zinc-400">
                  Ranked by overall PrepX experience points, problems solved, and rating
                </p>
              </div>

              {/* Podium for Top 3 */}
              {leaderboard.length >= 3 && (
                <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 pb-2 items-end">
                  {/* Rank 2 */}
                  <div className="flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 sm:p-4 text-center">
                    <div className="relative mb-2">
                      <div className="size-12 sm:size-14 rounded-full border-2 border-slate-300 bg-slate-800 flex items-center justify-center font-bold text-white">
                        {leaderboard[1].fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute -top-2 -right-1 flex size-5 items-center justify-center rounded-full bg-slate-300 text-zinc-900 text-xs font-black">
                        2
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white truncate max-w-full">
                      {leaderboard[1].fullName}
                    </p>
                    <p className="text-[10px] text-indigo-400 font-mono mt-0.5">
                      {leaderboard[1].xp} XP
                    </p>
                    <span className="mt-1 text-[10px] text-zinc-500 truncate max-w-full">
                      {leaderboard[1].college}
                    </span>
                  </div>

                  {/* Rank 1 (Gold) */}
                  <div className="flex flex-col items-center rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/15 to-zinc-900/60 p-4 sm:p-5 text-center shadow-lg shadow-amber-500/10">
                    <div className="relative mb-2">
                      <Crown className="size-5 text-amber-400 absolute -top-4 left-1/2 -translate-x-1/2" />
                      <div className="size-14 sm:size-16 rounded-full border-2 border-amber-400 bg-amber-950/60 flex items-center justify-center font-black text-amber-200">
                        {leaderboard[0].fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex size-5 items-center justify-center rounded-full bg-amber-400 text-zinc-950 text-xs font-black">
                        1
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                      {leaderboard[0].fullName}
                    </p>
                    <p className="text-xs text-amber-400 font-bold font-mono mt-0.5">
                      {leaderboard[0].xp} XP
                    </p>
                    <span className="mt-1 text-[10px] text-zinc-400 truncate max-w-full">
                      {leaderboard[0].college}
                    </span>
                  </div>

                  {/* Rank 3 */}
                  <div className="flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 sm:p-4 text-center">
                    <div className="relative mb-2">
                      <div className="size-12 sm:size-14 rounded-full border-2 border-amber-700 bg-amber-950/40 flex items-center justify-center font-bold text-amber-200">
                        {leaderboard[2].fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute -top-2 -right-1 flex size-5 items-center justify-center rounded-full bg-amber-700 text-white text-xs font-black">
                        3
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white truncate max-w-full">
                      {leaderboard[2].fullName}
                    </p>
                    <p className="text-[10px] text-indigo-400 font-mono mt-0.5">
                      {leaderboard[2].xp} XP
                    </p>
                    <span className="mt-1 text-[10px] text-zinc-500 truncate max-w-full">
                      {leaderboard[2].college}
                    </span>
                  </div>
                </div>
              )}

              {/* Full Standings List */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
                <div className="divide-y divide-zinc-800/60">
                  {leaderboard.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 sm:px-4 hover:bg-zinc-800/30 transition text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-bold font-mono text-zinc-400">
                          #{item.rank}
                        </span>
                        <div className="size-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300">
                          {item.fullName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{item.fullName}</p>
                          <p className="text-[11px] text-zinc-400">{item.college}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="hidden sm:block text-right">
                          <p className="text-[11px] text-zinc-400">Level {item.levelNumber}</p>
                          <p className="text-[10px] text-zinc-500">{item.levelTitle}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold font-mono text-amber-400">{item.xp} XP</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{item.solvedCount} Solved</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800/80 bg-zinc-950/60 p-3 sm:px-6 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Leaderboard synchronized in real-time</span>
          </div>
          <button
            onClick={closeHub}
            className="px-3 py-1.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
export default GamificationHubModal;
