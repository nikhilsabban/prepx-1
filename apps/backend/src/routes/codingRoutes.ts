import { Router } from "express";
import { protect, optionalAuth } from "../middleware/authMiddleware";
import {
  getProblems,
  getProblemBySlug,
  getProblemTags,
  runCode,
  submitCode,
  getUserSubmissions,
  getLeaderboard,
  getAIHint,
  analyzeCodeWithAI,
  fixCodeWithAI,
  toggleBookmark,
  getUserBookmarks,
} from "../controllers/codingController";

const router = Router();

// Public / Optional Auth routes
router.get("/problems", optionalAuth, getProblems);
router.get("/problems/tags", optionalAuth, getProblemTags);
router.get("/problems/:slug", optionalAuth, getProblemBySlug);
router.get("/leaderboard", optionalAuth, getLeaderboard);

// Protected routes (Requires PrepX JWT Token)
router.post("/run", protect, runCode);
router.post("/submit", protect, submitCode);
router.get("/submissions", protect, getUserSubmissions);
router.post("/ai/hint", protect, getAIHint);
router.post("/ai/analyze", protect, analyzeCodeWithAI);
router.post("/ai/fix", protect, fixCodeWithAI);
router.post("/bookmarks/:problemId", protect, toggleBookmark);
router.get("/bookmarks", protect, getUserBookmarks);

export default router;
