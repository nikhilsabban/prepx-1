import { Router } from "express";
import { protect, optionalAuth } from "../../../../middleware/authMiddleware";
import { getProblems, getProblemBySlug } from "../controllers/problemController";
import { runCode, submitCode, getMySubmissions } from "../controllers/submissionController";
import {
  getAiHint,
  debugCodeWithAi,
  explainSolutionWithAi,
  reviewCodeWithAi,
  analyzeComplexityWithAi,
} from "../controllers/aiCodingController";
import { getUserProgress, getLeaderboard, getRecommendations } from "../controllers/progressController";

const router = Router();

// Problem catalog
router.get("/problems", optionalAuth, getProblems);
router.get("/problems/:slug", optionalAuth, getProblemBySlug);

// Submissions & Execution
router.post("/submissions/run", protect, runCode);
router.post("/submissions", protect, submitCode);
router.get("/submissions/my", protect, getMySubmissions);

// AI Features
router.post("/ai/hint", protect, getAiHint);
router.post("/ai/debug", protect, debugCodeWithAi);
router.post("/ai/explain", protect, explainSolutionWithAi);
router.post("/ai/review", protect, reviewCodeWithAi);
router.post("/ai/complexity", protect, analyzeComplexityWithAi);

// Progress & Leaderboard
router.get("/progress", protect, getUserProgress);
router.get("/leaderboard", optionalAuth, getLeaderboard);
router.get("/recommendations", protect, getRecommendations);

export default router;
