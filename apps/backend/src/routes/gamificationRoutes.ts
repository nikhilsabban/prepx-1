import { Router, type Response } from "express";
import { protect, optionalAuth, type AuthRequest } from "../middleware/authMiddleware";
import { User } from "../models/User";
import { awardActivityXP, processDailyLoginBonus } from "../services/gamificationService";

const router = Router();

// Master list of badges across all PrepX features
export const MASTER_BADGES = [
  {
    id: "daily-pioneer",
    name: "Daily Pioneer",
    category: "General",
    description: "Logged in and completed an activity today.",
    icon: "CalendarCheck",
    xpRequirement: 50,
  },
  {
    id: "on-fire",
    name: "On Fire!",
    category: "General",
    description: "Maintained a 3-day active preparation streak.",
    icon: "Flame",
    xpRequirement: 150,
  },
  {
    id: "fast-learner",
    name: "Fast Learner",
    category: "General",
    description: "Accumulated 100+ total XP across PrepX features.",
    icon: "Zap",
    xpRequirement: 100,
  },
  {
    id: "algorithm-ace",
    name: "Algorithm Ace",
    category: "Coding",
    description: "Successfully solved and submitted 5+ DSA problems.",
    icon: "Code2",
    xpRequirement: 500,
  },
  {
    id: "speed-demon",
    name: "Speed Demon",
    category: "Coding",
    description: "Executed a problem solution in under 50ms runtime.",
    icon: "Timer",
    xpRequirement: 250,
  },
  {
    id: "system-architect",
    name: "System Architect",
    category: "Coding",
    description: "Completed system design scalability blueprints.",
    icon: "Cpu",
    xpRequirement: 400,
  },
  {
    id: "interview-pro",
    name: "Interview Pro",
    category: "Interview",
    description: "Finished a comprehensive AI Technical Mock Interview.",
    icon: "Award",
    xpRequirement: 300,
  },
  {
    id: "resume-strategist",
    name: "Resume Strategist",
    category: "Resume",
    description: "Analyzed your resume and achieved an 80+ ATS score.",
    icon: "FileCheck",
    xpRequirement: 200,
  },
  {
    id: "gd-orator",
    name: "GD Orator",
    category: "Discussion",
    description: "Contributed effectively to a live AI Group Discussion round.",
    icon: "MessagesSquare",
    xpRequirement: 200,
  },
  {
    id: "rising-star",
    name: "Rising Star",
    category: "Milestone",
    description: "Crossed 500+ XP milestone in engineering readiness.",
    icon: "Star",
    xpRequirement: 500,
  },
  {
    id: "prepx-champion",
    name: "PrepX Champion",
    category: "Milestone",
    description: "Reached 1,000+ XP across coding, interviews, and resume.",
    icon: "Trophy",
    xpRequirement: 1000,
  },
  {
    id: "grandmaster",
    name: "Engineering Grandmaster",
    category: "Milestone",
    description: "Elite tier: 2,500+ XP and 20+ solved problems.",
    icon: "Crown",
    xpRequirement: 2500,
  },
];

// Helper to compute user level and rank title
export function computeLevel(xp: number = 0) {
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

/**
 * GET /status (or /profile)
 * Returns the current authenticated or guest user's centralized gamification snapshot
 */
router.get(["/status", "/profile", "/"], optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let user = req.user;
    if (user && user._id) {
      // Re-fetch fresh user
      const fresh = await User.findById(user._id);
      if (fresh) user = fresh;
    }

    const currentXp = user?.xp || 0;
    const streakDays = user?.streakDays || user?.codingStreak || 1;
    const rating = user?.rating || 1200;
    const ratingTitle = user?.ratingTitle || "Candidate";
    const userBadges = user?.badges || [];
    const solvedCount = user?.solved ? user.solved.length : 0;

    const levelData = computeLevel(currentXp);

    // Dynamic daily quests status
    const dailyQuests = [
      {
        id: "quest-code",
        title: "Code Master",
        feature: "Coding Platform",
        description: "Submit 1 accepted algorithm or data structure solution.",
        xpReward: 100,
        progress: solvedCount > 0 ? 1 : 0,
        target: 1,
        completed: solvedCount > 0,
        claimed: false,
      },
      {
        id: "quest-interview",
        title: "Interview Ready",
        feature: "AI Interviewer",
        description: "Complete 1 full AI technical or HR mock interview.",
        xpReward: 150,
        progress: userBadges.includes("Interview Pro") ? 1 : 0,
        target: 1,
        completed: userBadges.includes("Interview Pro"),
        claimed: false,
      },
      {
        id: "quest-resume",
        title: "Resume Polish",
        feature: "Resume Analyzer",
        description: "Score or optimize your resume with AI suggestions.",
        xpReward: 75,
        progress: userBadges.includes("Resume Strategist") ? 1 : 0,
        target: 1,
        completed: userBadges.includes("Resume Strategist"),
        claimed: false,
      },
      {
        id: "quest-cs",
        title: "CS Fundamentals",
        feature: "CS Subjects",
        description: "Revise 1 core Computer Science subject (OS, DBMS, Networks, OOP).",
        xpReward: 50,
        progress: 1,
        target: 1,
        completed: true,
        claimed: false,
      },
      {
        id: "quest-streak",
        title: "Daily Consistency",
        feature: "Platform",
        description: "Maintain your daily PrepX practice streak.",
        xpReward: 50,
        progress: streakDays >= 1 ? 1 : 0,
        target: 1,
        completed: streakDays >= 1,
        claimed: true,
      },
    ];

    // Map all master badges with user's unlocked status
    const badgesWithStatus = MASTER_BADGES.map((b) => ({
      ...b,
      unlocked: userBadges.includes(b.name),
    }));

    res.json({
      success: true,
      gamification: {
        xp: currentXp,
        ...levelData,
        streakDays,
        rating,
        ratingTitle,
        solvedCount,
        badges: badgesWithStatus,
        unlockedBadgesCount: userBadges.length,
        dailyQuests,
      },
    });
  } catch (error: any) {
    console.error("Gamification status error:", error);
    res.status(500).json({ message: "Failed to fetch gamification snapshot" });
  }
});

/**
 * GET /leaderboard
 * Unified global leaderboard across Coding, Interviews, and Platform XP
 */
router.get("/leaderboard", optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({})
      .select("fullName username profilePicture xp rating ratingTitle solved college branch badges streakDays")
      .sort({ xp: -1, rating: -1 })
      .limit(50)
      .lean();

    const leaderboard = users.map((u: any, idx: number) => {
      const xp = u.xp || 0;
      const { levelNumber, levelTitle } = computeLevel(xp);
      return {
        rank: idx + 1,
        id: u._id.toString(),
        fullName: u.fullName || "Anonymous Engineer",
        username: u.username || u.fullName?.toLowerCase().replace(/\s+/g, "_") || "coder",
        profilePicture: u.profilePicture || "",
        college: u.college || "PrepX Engineering Academy",
        xp,
        levelNumber,
        levelTitle,
        rating: u.rating || 1200,
        ratingTitle: u.ratingTitle || "Candidate",
        solvedCount: u.solved ? u.solved.length : 0,
        streakDays: u.streakDays || 1,
        badgesCount: u.badges ? u.badges.length : 0,
      };
    });

    res.json({
      success: true,
      leaderboard,
    });
  } catch (error: any) {
    console.error("Gamification leaderboard error:", error);
    res.status(500).json({ message: "Failed to load global leaderboard" });
  }
});

/**
 * POST /award
 * Central endpoint to award XP and unlock badges from ANY feature
 */
router.post("/award", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { amount = 50, activityName = "Platform Activity", badge } = req.body;

    const result = await awardActivityXP(userId, Number(amount) || 50, String(activityName), badge);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Award XP error:", error);
    res.status(500).json({ message: "Failed to award activity XP" });
  }
});

export default router;
