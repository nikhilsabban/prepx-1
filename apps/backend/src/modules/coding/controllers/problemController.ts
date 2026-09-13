import type { Response } from "express";
import type { AuthRequest } from "../../../../middleware/authMiddleware";
import { Problem } from "../models/Problem";
import { UserCodingProgress } from "../models/UserCodingProgress";

export async function getProblems(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";
    const difficulty = (req.query.difficulty as string) || "";
    const topic = (req.query.topic as string) || "";
    const company = (req.query.company as string) || "";

    const query: any = { isPublished: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (difficulty) query.difficulty = difficulty;
    if (topic) query.topics = topic;
    if (company) query.companies = company;

    const total = await Problem.countDocuments(query);
    const problems = await Problem.find(query)
      .select("-starterCode -constraints")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    let solvedProblemIds: string[] = [];
    if (req.user) {
      const progress = await UserCodingProgress.findOne({ userId: req.user._id });
      if (progress) {
        solvedProblemIds = progress.solvedProblems.map((id) => id.toString());
      }
    }

    const items = problems.map((p) => ({
      ...p.toObject(),
      isSolved: solvedProblemIds.includes(p._id.toString()),
    }));

    res.json({
      success: true,
      data: {
        problems: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch problems" });
  }
}

export async function getProblemBySlug(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const problem = await Problem.findOne({ slug, isPublished: true });

    if (!problem) {
      res.status(404).json({ success: false, message: "Problem not found" });
      return;
    }

    let isSolved = false;
    if (req.user) {
      const progress = await UserCodingProgress.findOne({ userId: req.user._id });
      if (progress) {
        isSolved = progress.solvedProblems.some((id) => id.toString() === problem._id.toString());
      }
    }

    res.json({
      success: true,
      data: {
        problem,
        isSolved,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch problem" });
  }
}
