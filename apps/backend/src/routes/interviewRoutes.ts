import { Router } from "express";
import multer from "multer";
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
  verifyTurnSpeechHandler,
} from "../controllers/interviewController";
import { protect, optionalAuth } from "../middleware/authMiddleware";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // Max 20MB turn audio
});

router.post("/pre-interview", optionalAuth as any, createPreInterview as any);
router.get("/stt-key", optionalAuth as any, getDeepgramKey as any);
router.get("/deepgram-key", optionalAuth as any, getDeepgramKey as any);
router.post("/interview/initiate/:interviewId", optionalAuth as any, initiateInterview as any);
router.post("/interview/respond/:interviewId", optionalAuth as any, processInterviewResponse as any);
router.post(
  "/interview/verify-turn-speech/:interviewId",
  optionalAuth as any,
  upload.single("audio"),
  verifyTurnSpeechHandler as any
);
router.post("/session/user/response/:interviewId", optionalAuth as any, saveUserResponse as any);
router.get("/result/:interviewId", optionalAuth as any, getResult as any);
router.get("/my-interviews", protect as any, getMyInterviews as any);
router.get("/bookmarks", protect as any, getBookmarkedInterviews as any);
router.post("/bookmark/:interviewId", protect as any, toggleBookmark as any);
router.post("/correct-transcript", correctTranscript as any);

export default router;
