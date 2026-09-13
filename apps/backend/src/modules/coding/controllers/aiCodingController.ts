import type { Response } from "express";
import type { AuthRequest } from "../../../../middleware/authMiddleware";
import { aiCodingService } from "../services/aiService";
import { Problem } from "../models/Problem";

export async function getAiHint(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { problemId, code, language, hintLevel = 1 } = req.body;
    const problem = await Problem.findById(problemId);

    if (!problem) {
      res.status(404).json({ success: false, message: "Problem not found" });
      return;
    }

    const hint = await aiCodingService.generateHint(
      problem.title,
      problem.description,
      code || "",
      language || "javascript",
      hintLevel
    );

    res.json({ success: true, data: { hint } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to generate AI hint" });
  }
}

export async function debugCodeWithAi(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { problemId, code, language, errorOutput } = req.body;
    const problem = await Problem.findById(problemId);

    if (!problem) {
      res.status(404).json({ success: false, message: "Problem not found" });
      return;
    }

    const debugAnalysis = await aiCodingService.debugCode(
      problem.title,
      code || "",
      language || "javascript",
      errorOutput || "Test case failed"
    );

    res.json({ success: true, data: { debugAnalysis } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to debug code" });
  }
}

export async function explainSolutionWithAi(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { problemId, code, language } = req.body;
    const problem = await Problem.findById(problemId);

    if (!problem) {
      res.status(404).json({ success: false, message: "Problem not found" });
      return;
    }

    const explanation = await aiCodingService.explainSolution(
      problem.title,
      code || "",
      language || "javascript"
    );

    res.json({ success: true, data: { explanation } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to explain solution" });
  }
}

export async function reviewCodeWithAi(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { code, language } = req.body;

    const review = await aiCodingService.reviewCode(code || "", language || "javascript");
    res.json({ success: true, data: { review } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to review code" });
  }
}

export async function analyzeComplexityWithAi(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { code, language } = req.body;

    const complexity = await aiCodingService.analyzeComplexity(code || "", language || "javascript");
    res.json({ success: true, data: complexity });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to analyze complexity" });
  }
}
