import { Router } from "express";
import { protect, optionalAuth } from "../middleware/authMiddleware";
import {
  getProblems,
  getProblemBySlug,
  getProblemTags,
  runCode,
  executeCode,
  submitCode,
  getDsaCatalogData,
  getDsaProblemData,
  getUserSubmissions,
  getLeaderboard,
  getAIHint,
  analyzeCodeWithAI,
  fixCodeWithAI,
  toggleBookmark,
  getUserBookmarks,
  recordCodingActivity,
} from "../controllers/codingController";

const router = Router();

// Public / Optional Auth routes
router.get("/problems", optionalAuth, getProblems);
router.get("/problems/tags", optionalAuth, getProblemTags);
router.get("/problems/:slug", optionalAuth, getProblemBySlug);
router.get("/leaderboard", optionalAuth, getLeaderboard);

// DSA Catalog endpoints
router.get("/dsa/catalog", getDsaCatalogData);
router.get("/dsa/problem/:slug", getDsaProblemData);

// Execution endpoints (works with optionalAuth or authenticated)
router.post("/execute", optionalAuth, executeCode);
router.post("/run", optionalAuth, runCode);
router.post("/submit", optionalAuth, submitCode);

// Protected routes (Requires PrepX JWT Token)
router.post("/record-activity", protect, recordCodingActivity);
router.get("/submissions", protect, getUserSubmissions);
router.post("/ai/hint", protect, getAIHint);
router.post("/ai/analyze", protect, analyzeCodeWithAI);
router.post("/ai/fix", protect, fixCodeWithAI);
router.post("/bookmarks/:problemId", protect, toggleBookmark);
router.get("/bookmarks", protect, getUserBookmarks);

export default router;
