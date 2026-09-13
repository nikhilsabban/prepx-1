import { Router } from "express";
import {
  createPreInterview,
  getDeepgramKey,
  initiateInterview,
  processInterviewResponse,
  saveUserResponse,
  getResult,
  getMyInterviews,
  correctTranscript,
  toggleBookmark,
  getBookmarkedInterviews,
} from "../controllers/interviewController";
import { protect, optionalAuth } from "../middleware/authMiddleware";

const router = Router();

router.post("/pre-interview", optionalAuth as any, createPreInterview as any);
router.get("/deepgram-key", getDeepgramKey);
router.post("/interview/initiate/:interviewId", initiateInterview);
router.post("/interview/respond/:interviewId", processInterviewResponse);
router.post("/session/user/response/:interviewId", saveUserResponse);
router.get("/result/:interviewId", getResult);
router.get("/my-interviews", protect as any, getMyInterviews as any);
router.get("/bookmarks", protect as any, getBookmarkedInterviews as any);
router.post("/bookmark/:interviewId", protect as any, toggleBookmark as any);
router.post("/correct-transcript", correctTranscript as any);

export default router;
