import { UserCodingProgress } from "../models/UserCodingProgress";
import { User } from "../../../../models/User";
import { Problem } from "../models/Problem";

export class GamificationService {
  /**
   * Updates XP, Level, Streaks, and Badges upon Accepted submission
   */
  async processAcceptedSubmission(userId: string, problemId: string): Promise<{ xpGained: number; newLevel: number; streak: number; badgesUnlocked: string[] }> {
    const problem = await Problem.findById(problemId);
    if (!problem) throw new Error("Problem not found");

    let progress = await UserCodingProgress.findOne({ userId });
    if (!progress) {
      progress = await UserCodingProgress.create({ userId, solvedProblems: [], attemptedProblems: [] });
    }

    const alreadySolved = progress.solvedProblems.some((id) => id.toString() === problemId);
    let xpGained = 0;

    if (!alreadySolved) {
      // Award base XP
      xpGained = problem.difficulty === "Easy" ? 10 : problem.difficulty === "Medium" ? 25 : 50;
      progress.solvedProblems.push(problem._id as any);

      if (problem.difficulty === "Easy") progress.easySolved += 1;
      else if (problem.difficulty === "Medium") progress.mediumSolved += 1;
      else if (problem.difficulty === "Hard") progress.hardSolved += 1;

      progress.totalXP += xpGained;

      // Update level (100 * level required)
      progress.currentLevel = Math.floor(progress.totalXP / 100) + 1;
    }

    // Streak logic
    const now = new Date();
    const lastDate = progress.lastSolvedDate ? new Date(progress.lastSolvedDate) : null;
    
    if (lastDate) {
      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        progress.currentStreak += 1;
      } else if (diffDays > 1) {
        progress.currentStreak = 1;
      }
    } else {
      progress.currentStreak = 1;
    }

    if (progress.currentStreak > progress.longestStreak) {
      progress.longestStreak = progress.currentStreak;
    }

    progress.lastSolvedDate = now;

    // Badges check
    const badgesUnlocked: string[] = [];
    const totalSolved = progress.solvedProblems.length;

    if (totalSolved >= 1 && !progress.badges.includes("First Solve")) {
      progress.badges.push("First Solve");
      badgesUnlocked.push("First Solve");
    }
    if (totalSolved >= 10 && !progress.badges.includes("10 Problems Solved")) {
      progress.badges.push("10 Problems Solved");
      badgesUnlocked.push("10 Problems Solved");
    }
    if (progress.currentStreak >= 7 && !progress.badges.includes("7 Day Streak")) {
      progress.badges.push("7 Day Streak");
      badgesUnlocked.push("7 Day Streak");
    }

    // Placement readiness score calculation
    const totalAvailable = 200; // Benchmark total
    const coverageScore = Math.min(100, (totalSolved / totalAvailable) * 100);
    const difficultyWeight = (progress.easySolved * 1 + progress.mediumSolved * 2 + progress.hardSolved * 3) / Math.max(1, totalSolved * 3);
    progress.placementCodingScore = Math.round(coverageScore * 0.5 + difficultyWeight * 50);

    await progress.save();

    // Sync XP with main User model
    await User.findByIdAndUpdate(userId, {
      xp: progress.totalXP,
      streakDays: progress.currentStreak,
      badges: progress.badges,
    });

    return {
      xpGained,
      newLevel: progress.currentLevel,
      streak: progress.currentStreak,
      badgesUnlocked,
    };
  }
}

export const gamificationService = new GamificationService();
