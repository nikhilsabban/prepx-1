import type { Response } from "express";
import type { AuthRequest } from "../../../../middleware/authMiddleware";
import { UserCodingProgress } from "../models/UserCodingProgress";
import { User } from "../../../../models/User";
import { Problem } from "../models/Problem";

export async function getUserProgress(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    let progress = await UserCodingProgress.findOne({ userId });

    if (!progress) {
      progress = await UserCodingProgress.create({
        userId,
        solvedProblems: [],
        attemptedProblems: [],
      });
    }

    const totalAvailable = await Problem.countDocuments({ isPublished: true });

    res.json({
      success: true,
      data: {
        totalProblems: totalAvailable,
        solvedCount: progress.solvedProblems.length,
        easySolved: progress.easySolved,
        mediumSolved: progress.mediumSolved,
        hardSolved: progress.hardSolved,
        totalXP: progress.totalXP,
        currentLevel: progress.currentLevel,
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
        badges: progress.badges,
        placementCodingScore: progress.placementCodingScore,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch user progress" });
  }
}

export async function getLeaderboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const leaderboard = await UserCodingProgress.find()
      .populate("userId", "fullName username profilePicture college branch")
      .sort({ totalXP: -1 })
      .limit(50);

    const items = leaderboard.map((item, index) => {
      const userObj = item.userId as any;
      return {
        rank: index + 1,
        id: userObj?._id,
        fullName: userObj?.fullName || "Developer",
        username: userObj?.username,
        profilePicture: userObj?.profilePicture || "",
        college: userObj?.college || "",
        totalXP: item.totalXP,
        currentLevel: item.currentLevel,
        solvedCount: item.solvedProblems.length,
        streak: item.currentStreak,
      };
    });

    res.json({ success: true, data: { leaderboard: items } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch leaderboard" });
  }
}

export async function getRecommendations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    let progress = await UserCodingProgress.findOne({ userId });

    const solvedIds = progress?.solvedProblems || [];
    const recommended = await Problem.find({
      _id: { $nin: solvedIds },
      isPublished: true,
    })
      .sort({ difficulty: 1, acceptanceRate: -1 })
      .limit(5);

    res.json({ success: true, data: { recommendations: recommended } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch recommendations" });
  }
}
