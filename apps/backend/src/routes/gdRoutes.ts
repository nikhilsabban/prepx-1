import { Router } from "express";
import {
  getRandomTopic,
  getTopicsPool,
  createGDRoom,
  searchUsersByUsername,
  inviteParticipant,
  respondToInvitation,
  getMyInvitations,
  joinGDRoom,
  getGDSession,
  startGDSession,
  finishStudentTurn,
  passStudentTurn,
  skipStudentTurn,
  appendTranscriptSegment,
  endGDSession,
  getMyGDSessions,
  toggleGDBookmark,
  getGDBookmarks,
  getModeratorSpeech,
} from "../controllers/gdController";
import { protect, optionalAuth } from "../middleware/authMiddleware";

const router = Router();

// Topic discovery routes
router.get("/random-topic", optionalAuth as any, getRandomTopic as any);
router.get("/topics", getTopicsPool);

// User search for invitations
router.get("/users/search", protect as any, searchUsersByUsername as any);

// Invitations
router.get("/my-invitations", protect as any, getMyInvitations as any);
router.post("/rooms/:roomId/invitations", protect as any, inviteParticipant as any);
router.post("/rooms/:roomId/invitations/respond", protect as any, respondToInvitation as any);
router.post("/sessions/:sessionId/invitations", protect as any, inviteParticipant as any);
router.post("/sessions/:sessionId/invitations/respond", protect as any, respondToInvitation as any);

// Room & Session lifecycle routes
router.post("/rooms", protect as any, createGDRoom as any);
router.post("/sessions", protect as any, createGDRoom as any); // Backward compatibility
router.get("/rooms/:roomId", getGDSession);
router.get("/sessions/:sessionId", getGDSession);
router.post("/rooms/:roomId/join", protect as any, joinGDRoom as any);
router.post("/sessions/:sessionId/join", protect as any, joinGDRoom as any);

// Discussion & Turn management
router.post("/rooms/:roomId/start", protect as any, startGDSession as any);
router.post("/rooms/:roomId/turns/finish", protect as any, finishStudentTurn as any);
router.post("/rooms/:roomId/turns/pass", protect as any, passStudentTurn as any);
router.post("/rooms/:roomId/turns/skip", protect as any, skipStudentTurn as any);
router.post("/rooms/:roomId/moderator-speech", optionalAuth as any, getModeratorSpeech as any);
router.post("/sessions/:sessionId/moderator-speech", optionalAuth as any, getModeratorSpeech as any);

// Transcript & End discussion
router.post("/sessions/:sessionId/transcript", optionalAuth as any, appendTranscriptSegment as any);
router.post("/rooms/:roomId/transcript", optionalAuth as any, appendTranscriptSegment as any);
router.post("/rooms/:roomId/end", protect as any, endGDSession as any);
router.post("/sessions/:sessionId/end", protect as any, endGDSession as any);

// History & Bookmarks routes (authenticated)
router.get("/my-sessions", protect as any, getMyGDSessions as any);
router.post("/rooms/:roomId/bookmark", protect as any, toggleGDBookmark as any);
router.post("/sessions/:sessionId/bookmark", protect as any, toggleGDBookmark as any);
router.get("/bookmarks", protect as any, getGDBookmarks as any);

export default router;
