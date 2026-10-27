import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";
import { toast } from "react-toastify";

export interface Badge {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  xpRequirement: number;
  unlocked: boolean;
}

export interface DailyQuest {
  id: string;
  title: string;
  feature: string;
  description: string;
  xpReward: number;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  fullName: string;
  username: string;
  profilePicture?: string;
  college?: string;
  xp: number;
  levelNumber: number;
  levelTitle: string;
  rating: number;
  ratingTitle: string;
  solvedCount: number;
  streakDays: number;
  badgesCount: number;
}

export interface CelebrationData {
  title: string;
  subtitle?: string;
  xpEarned?: number;
  badgeEarned?: string;
  badgeIcon?: string;
}

export interface GamificationContextType {
  xp: number;
  levelNumber: number;
  levelTitle: string;
  nextTitle: string;
  xpInLevel: number;
  levelXpCeil: number;
  progressPct: number;
  streakDays: number;
  rating: number;
  ratingTitle: string;
  solvedCount: number;
  badges: Badge[];
  unlockedBadgesCount: number;
  dailyQuests: DailyQuest[];
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  isHubOpen: boolean;
  hubActiveTab: "overview" | "quests" | "badges" | "leaderboard";
  celebration: CelebrationData | null;
  openHub: (tab?: "overview" | "quests" | "badges" | "leaderboard") => void;
  closeHub: () => void;
  triggerCelebration: (data: CelebrationData) => void;
  closeCelebration: () => void;
  awardXP: (amount: number, reason: string, badge?: string) => Promise<void>;
  claimQuest: (questId: string) => Promise<void>;
  refreshGamification: () => Promise<void>;
}

const DEFAULT_BADGES: Badge[] = [
  { id: "daily-pioneer", name: "Daily Pioneer", category: "General", description: "Logged in and completed an activity today.", icon: "CalendarCheck", xpRequirement: 50, unlocked: true },
  { id: "on-fire", name: "On Fire!", category: "General", description: "Maintained a 3-day active preparation streak.", icon: "Flame", xpRequirement: 150, unlocked: false },
  { id: "fast-learner", name: "Fast Learner", category: "General", description: "Accumulated 100+ total XP across PrepX features.", icon: "Zap", xpRequirement: 100, unlocked: false },
  { id: "algorithm-ace", name: "Algorithm Ace", category: "Coding", description: "Successfully solved and submitted 5+ DSA problems.", icon: "Code2", xpRequirement: 500, unlocked: false },
  { id: "speed-demon", name: "Speed Demon", category: "Coding", description: "Executed a problem solution in under 50ms runtime.", icon: "Timer", xpRequirement: 250, unlocked: false },
  { id: "system-architect", name: "System Architect", category: "Coding", description: "Completed system design scalability blueprints.", icon: "Cpu", xpRequirement: 400, unlocked: false },
  { id: "interview-pro", name: "Interview Pro", category: "Interview", description: "Finished a comprehensive AI Technical Mock Interview.", icon: "Award", xpRequirement: 300, unlocked: false },
  { id: "resume-strategist", name: "Resume Strategist", category: "Resume", description: "Analyzed your resume and achieved an 80+ ATS score.", icon: "FileCheck", xpRequirement: 200, unlocked: false },
  { id: "gd-orator", name: "GD Orator", category: "Discussion", description: "Contributed effectively to a live AI Group Discussion round.", icon: "MessagesSquare", xpRequirement: 200, unlocked: false },
  { id: "rising-star", name: "Rising Star", category: "Milestone", description: "Crossed 500+ XP milestone in engineering readiness.", icon: "Star", xpRequirement: 500, unlocked: false },
  { id: "prepx-champion", name: "PrepX Champion", category: "Milestone", description: "Reached 1,000+ XP across coding, interviews, and resume.", icon: "Trophy", xpRequirement: 1000, unlocked: false },
  { id: "grandmaster", name: "Engineering Grandmaster", category: "Milestone", description: "Elite tier: 2,500+ XP and 20+ solved problems.", icon: "Crown", xpRequirement: 2500, unlocked: false },
];

const DEFAULT_QUESTS: DailyQuest[] = [
  { id: "quest-code", title: "Code Master", feature: "Coding Platform", description: "Submit 1 accepted algorithm solution.", xpReward: 100, progress: 0, target: 1, completed: false, claimed: false },
  { id: "quest-interview", title: "Interview Ready", feature: "AI Interviewer", description: "Complete 1 full AI technical or HR mock interview.", xpReward: 150, progress: 0, target: 1, completed: false, claimed: false },
  { id: "quest-resume", title: "Resume Polish", feature: "Resume Analyzer", description: "Score or optimize your resume with AI suggestions.", xpReward: 75, progress: 0, target: 1, completed: false, claimed: false },
  { id: "quest-cs", title: "CS Fundamentals", feature: "CS Subjects", description: "Revise 1 core Computer Science subject (OS, DBMS, Networks, OOP).", xpReward: 50, progress: 1, target: 1, completed: true, claimed: false },
  { id: "quest-streak", title: "Daily Consistency", feature: "Platform", description: "Maintain your daily PrepX practice streak.", xpReward: 50, progress: 1, target: 1, completed: true, claimed: true },
];

export function computeLevelStats(xp: number = 0) {
  const levelNumber = Math.floor(xp / 500) + 1;
  const levelXpFloor = (levelNumber - 1) * 500;
  const levelXpCeil = levelNumber * 500;
  const xpInLevel = xp - levelXpFloor;
  const progressPct = Math.min(100, Math.round((xpInLevel / 500) * 1000) / 10);

  const levelTitles = [
    "Junior Developer",
    "Software Engineer",
    "Full-Stack Architect",
    "Principal Engineer",
    "Staff System Architect",
    "Engineering Lead",
    "Distinguished Engineer",
    "Chief Architect",
  ];
  const levelTitle = levelTitles[Math.min(levelTitles.length - 1, levelNumber - 1)];
  const nextTitle = levelTitles[Math.min(levelTitles.length - 1, levelNumber)];

  return {
    levelNumber,
    levelTitle,
    nextTitle,
    xpInLevel,
    levelXpCeil,
    progressPct,
  };
}

export async function fireConfettiCannon() {
  try {
    const module = await import("canvas-confetti");
    const confetti = module.default || module;
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#6366f1", "#a855f7", "#ec4899", "#10b981", "#f59e0b"],
    });
  } catch (e) {
    // Graceful fallback
    console.debug("Confetti particle trigger skipped", e);
  }
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  // Local storage cache for instant, zero-delay initial load
  const [xp, setXp] = useState<number>(() => {
    const cached = localStorage.getItem("prepx_xp");
    return cached ? Number(cached) : user?.xp || 250;
  });

  const [streakDays, setStreakDays] = useState<number>(() => {
    const cached = localStorage.getItem("prepx_streak");
    return cached ? Number(cached) : user?.streakDays || 1;
  });

  const [rating, setRating] = useState<number>(() => {
    const cached = localStorage.getItem("prepx_rating");
    return cached ? Number(cached) : user?.rating || 1200;
  });

  const [ratingTitle, setRatingTitle] = useState<string>("Candidate");
  const [solvedCount, setSolvedCount] = useState<number>(() => {
    const cached = localStorage.getItem("prepx_solved_count");
    return cached ? Number(cached) : 0;
  });

  const [badges, setBadges] = useState<Badge[]>(DEFAULT_BADGES);
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>(DEFAULT_QUESTS);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Hub Modal & Celebration State
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [hubActiveTab, setHubActiveTab] = useState<"overview" | "quests" | "badges" | "leaderboard">("overview");
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);

  const levelStats = computeLevelStats(xp);

  // Cache stats locally
  useEffect(() => {
    localStorage.setItem("prepx_xp", String(xp));
    localStorage.setItem("prepx_streak", String(streakDays));
    localStorage.setItem("prepx_rating", String(rating));
    localStorage.setItem("prepx_solved_count", String(solvedCount));
  }, [xp, streakDays, rating, solvedCount]);

  // Sync with backend on mount and auth changes
  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/api/v1/gamification/status");
      if (res.data?.success && res.data.gamification) {
        const g = res.data.gamification;
        setXp(g.xp);
        setStreakDays(g.streakDays);
        setRating(g.rating);
        setRatingTitle(g.ratingTitle);
        setSolvedCount(g.solvedCount);
        if (Array.isArray(g.badges)) setBadges(g.badges);
        if (Array.isArray(g.dailyQuests)) setDailyQuests(g.dailyQuests);
      }
    } catch (err) {
      console.debug("Gamification status sync fallback to local cache", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/gamification/leaderboard");
      if (res.data?.success && Array.isArray(res.data.leaderboard)) {
        setLeaderboard(res.data.leaderboard);
      }
    } catch (err) {
      console.debug("Leaderboard fetch error", err);
    }
  }, []);

  const lastFetchedUserRef = React.useRef<string | null>(null);

  useEffect(() => {
    const currentKey = user?._id ? String(user._id) : isAuthenticated ? "authed" : "guest";
    if (lastFetchedUserRef.current === currentKey) return;
    lastFetchedUserRef.current = currentKey;
    fetchStatus();
    fetchLeaderboard();
  }, [fetchStatus, fetchLeaderboard, isAuthenticated, user?._id]);

  const triggerCelebration = useCallback((data: CelebrationData) => {
    setCelebration(data);
    fireConfettiCannon();
  }, []);

  const closeCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  const openHub = useCallback((tab: "overview" | "quests" | "badges" | "leaderboard" = "overview") => {
    setHubActiveTab(tab);
    setIsHubOpen(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const closeHub = useCallback(() => {
    setIsHubOpen(false);
  }, []);

  // Centralized award XP method usable from ANY component or page
  const awardXP = useCallback(
    async (amount: number, reason: string, badge?: string) => {
      // 1. Optimistic update
      const previousXp = xp;
      const newXp = previousXp + amount;
      setXp(newXp);

      const oldLevel = computeLevelStats(previousXp).levelNumber;
      const newLevel = computeLevelStats(newXp).levelNumber;

      // 2. Trigger celebration
      if (newLevel > oldLevel) {
        triggerCelebration({
          title: `Level Up! Level ${newLevel}`,
          subtitle: `Congratulations! You unlocked ${computeLevelStats(newXp).levelTitle}!`,
          xpEarned: amount,
          badgeEarned: badge,
        });
      } else {
        triggerCelebration({
          title: `+${amount} XP Earned!`,
          subtitle: reason,
          xpEarned: amount,
          badgeEarned: badge,
        });
      }

      // Update badge unlock status locally if provided
      if (badge) {
        setBadges((prev) =>
          prev.map((b) => (b.name.toLowerCase() === badge.toLowerCase() ? { ...b, unlocked: true } : b))
        );
      }

      // 3. Persist to backend if token available
      try {
        await api.post("/api/v1/gamification/award", {
          amount,
          activityName: reason,
          badge,
        });
      } catch (err) {
        console.debug("Award XP backend update offline/guest mode handled", err);
      }
    },
    [xp, triggerCelebration]
  );

  const claimQuest = useCallback(
    async (questId: string) => {
      const quest = dailyQuests.find((q) => q.id === questId);
      if (!quest || quest.claimed || !quest.completed) return;

      setDailyQuests((prev) =>
        prev.map((q) => (q.id === questId ? { ...q, claimed: true } : q))
      );

      await awardXP(quest.xpReward, `Completed Daily Quest: ${quest.title}`);
      toast.success(`Claimed +${quest.xpReward} XP for "${quest.title}"! 🎯`);
    },
    [dailyQuests, awardXP]
  );

  const refreshGamification = useCallback(async () => {
    await Promise.all([fetchStatus(), fetchLeaderboard()]);
  }, [fetchStatus, fetchLeaderboard]);

  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  return (
    <GamificationContext.Provider
      value={{
        xp,
        ...levelStats,
        streakDays,
        rating,
        ratingTitle,
        solvedCount,
        badges,
        unlockedBadgesCount,
        dailyQuests,
        leaderboard,
        isLoading,
        isHubOpen,
        hubActiveTab,
        celebration,
        openHub,
        closeHub,
        triggerCelebration,
        closeCelebration,
        awardXP,
        claimQuest,
        refreshGamification,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error("useGamification must be used within a GamificationProvider");
  }
  return context;
}
