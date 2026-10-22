import { User, type IUser } from "../models/User";

export interface GamificationResult {
  xpEarned: number;
  newXP: number;
  streakDays: number;
  badges: string[];
  newBadgesAwarded: string[];
}

const ALL_POSSIBLE_BADGES = [
  "Daily Pioneer",
  "On Fire!",
  "Fast Learner",
  "Rising Star",
  "PrepX Champion",
  "Algorithm Ace",
  "Interview Pro",
  "Resume Strategist",
  "GD Orator",
  "Ace Candidate",
];

/**
  Checks if the user is logging in or active today for the first time.
  Awards +50 Daily Login XP and updates daily activity streak.
 */
export async function processDailyLoginBonus(user: IUser): Promise<{ xpEarned: number; streakUpdated: boolean }> {
  try {
    const today = new Date();
    const todayStr = today.toDateString();
    const lastActiveStr = user.lastActiveDate ? new Date(user.lastActiveDate).toDateString() : "";

    let xpEarned = 0;
    let streakUpdated = false;

    if (lastActiveStr !== todayStr) {
      // First active check/login of today
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (lastActiveStr === yesterday) {
        user.streakDays = (user.streakDays || 0) + 1;
      } else {
        user.streakDays = 1;
      }

      xpEarned = 50; // Daily Login Bonus
      user.xp = (user.xp || 0) + xpEarned;
      user.lastActiveDate = today;
      streakUpdated = true;

      // Ensure badges array
      if (!user.badges) user.badges = [];
      if (!user.badges.includes("Daily Pioneer")) {
        user.badges.push("Daily Pioneer");
      }
      if (user.streakDays >= 3 && !user.badges.includes("On Fire!")) {
        user.badges.push("On Fire!");
      }

      await checkAndAwardXPBadges(user);
      await user.save();
    }

    return { xpEarned, streakUpdated };
  } catch (error) {
    console.error("processDailyLoginBonus error:", error);
    return { xpEarned: 0, streakUpdated: false };
  }
}

/**
 * Awards activity XP for actions across PrepX (Coding, AI Interview, Resume Review, etc.)
 */
export async function awardActivityXP(
  userId: string,
  amount: number,
  activityName: string,
  extraBadge?: string
): Promise<GamificationResult> {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { xpEarned: 0, newXP: 0, streakDays: 1, badges: [], newBadgesAwarded: [] };
    }

    if (!user.badges) user.badges = [];
    const prevBadges = [...user.badges];

    user.xp = (user.xp || 0) + amount;

    if (extraBadge && !user.badges.includes(extraBadge)) {
      user.badges.push(extraBadge);
    }

    await checkAndAwardXPBadges(user);
    await user.save();

    const newBadgesAwarded = user.badges.filter((b) => !prevBadges.includes(b));

    console.log(`🎮 [Gamification] +${amount} XP awarded to ${user.fullName} for "${activityName}". Total XP: ${user.xp}`);

    return {
      xpEarned: amount,
      newXP: user.xp,
      streakDays: user.streakDays || 1,
      badges: user.badges,
      newBadgesAwarded,
    };
  } catch (error) {
    console.error("awardActivityXP error:", error);
    return { xpEarned: 0, newXP: 0, streakDays: 1, badges: [], newBadgesAwarded: [] };
  }
}

/**
 * Helper to check threshold badges based on XP and activity counts
 */
async function checkAndAwardXPBadges(user: IUser): Promise<void> {
  if (!user.badges) user.badges = [];
  const xp = user.xp || 0;

  if (xp >= 100 && !user.badges.includes("Fast Learner")) {
    user.badges.push("Fast Learner");
  }
  if (xp >= 500 && !user.badges.includes("Rising Star")) {
    user.badges.push("Rising Star");
  }
  if (xp >= 1000 && !user.badges.includes("PrepX Champion")) {
    user.badges.push("PrepX Champion");
  }
  if (user.solved && user.solved.length >= 5 && !user.badges.includes("Algorithm Ace")) {
    user.badges.push("Algorithm Ace");
  }
}
