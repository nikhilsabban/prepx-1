import type { Request, Response } from "express";
import mongoose from "mongoose";
import { gdTopicDiscoveryService } from "../services/gd/gdTopicDiscoveryService";
import { gdSessionService } from "../services/gd/gdSessionService";
import { GroupDiscussion } from "../models/GroupDiscussion";
import { User } from "../models/User";

export interface AuthRequest extends Request {
  user?: any;
}

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
}

/**
 * Retrieves a random discussion topic from web RSS/Atom feeds (with fallback).
 */
export async function getRandomTopic(req: AuthRequest, res: Response): Promise<void> {
  try {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const excludeTopicIds = typeof req.query.exclude === "string" ? req.query.exclude.split(",") : [];

    const topic = await gdTopicDiscoveryService.getRandomTopic({
      category,
      excludeTopicIds,
    });

    res.json({
      success: true,
      topic,
    });
  } catch (error: any) {
    console.error("[GD Controller] Get random topic error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve discussion topic",
      fallback: gdTopicDiscoveryService.getStaticFallbackTopics()[0],
    });
  }
}

/**
 * Returns available topic pool and supported categories.
 */
export async function getTopicsPool(req: Request, res: Response): Promise<void> {
  try {
    const topics = await gdTopicDiscoveryService.refreshTopicPool();
    const categories = gdTopicDiscoveryService.getCategories();

    res.json({
      success: true,
      categories,
      count: topics.length,
      topics: topics.slice(0, 20),
    });
  } catch (error: any) {
    console.error("[GD Controller] Get topics pool error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch topic pool",
      categories: gdTopicDiscoveryService.getCategories(),
      topics: gdTopicDiscoveryService.getStaticFallbackTopics(),
    });
  }
}

/**
 * Admin creates a new GD Room with topic and expected language.
 */
export async function createGDRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { category, topicOverride, expectedLanguage } = req.body;

    const adminId = req.user?._id?.toString() || req.user?.id?.toString();
    const adminUsername = req.user?.username || req.user?.email?.split("@")[0] || "admin";
    const adminFullName = req.user?.fullName || req.user?.name || adminUsername;
    const adminAvatar = req.user?.profilePicture || req.user?.avatar;

    if (!adminId) {
      res.status(401).json({ success: false, message: "Authentication required to create a room" });
      return;
    }

    const session = await gdSessionService.createRoom({
      adminId,
      adminUsername,
      adminFullName,
      adminAvatar,
      category,
      expectedLanguage: expectedLanguage || "English",
      topicOverride,
    });

    res.status(201).json({
      success: true,
      session,
    });
  } catch (error: any) {
    console.error("[GD Controller] Create room error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to initialize Group Discussion room",
    });
  }
}

/**
 * Search registered users by username for invitations.
 */
export async function searchUsersByUsername(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const exclude = typeof req.query.exclude === "string" ? req.query.exclude.split(",") : [];

    if (req.user?.username) {
      exclude.push(req.user.username);
    }

    const users = await gdSessionService.searchUsersByUsername(query, exclude);

    res.json({
      success: true,
      users,
    });
  } catch (error: any) {
    console.error("[GD Controller] Search users error:", error);
    res.status(500).json({ success: false, message: "Failed to search users" });
  }
}

/**
 * Admin invites a student by username.
 */
export async function inviteParticipant(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const { username } = req.body;

    const adminId = req.user?._id?.toString() || req.user?.id?.toString();

    if (!roomId || !username?.trim()) {
      res.status(400).json({ success: false, message: "Room ID and target username are required" });
      return;
    }

    const result = await gdSessionService.sendInvitation(roomId, adminId, username.trim());

    res.status(200).json({
      success: true,
      message: `Invitation sent to @${username.trim()}`,
      invitation: result.invitation,
      room: result.room,
    });
  } catch (error: any) {
    console.error("[GD Controller] Send invitation error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to send invitation",
    });
  }
}

/**
 * Student accepts or declines an invitation.
 */
export async function respondToInvitation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const { action } = req.body;

    const username = req.user?.username;

    if (!roomId || !username) {
      res.status(400).json({ success: false, message: "Authentication and room ID required" });
      return;
    }

    if (action !== "accept" && action !== "decline") {
      res.status(400).json({ success: false, message: "Action must be 'accept' or 'decline'" });
      return;
    }

    const result = await gdSessionService.respondToInvitation(roomId, username, action);

    res.json({
      success: true,
      message: `Invitation ${action}ed successfully`,
      invitation: result.invitation,
      room: result.room,
    });
  } catch (error: any) {
    console.error("[GD Controller] Respond invitation error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to respond to invitation",
    });
  }
}

/**
 * Retrieves pending invitations for the authenticated user.
 */
export async function getMyInvitations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const username = req.user?.username;
    if (!username) {
      res.json({ success: true, invitations: [] });
      return;
    }

    const invitations = await gdSessionService.getInvitationsForUser(username);

    res.json({
      success: true,
      invitations,
    });
  } catch (error: any) {
    console.error("[GD Controller] Get my invitations error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve invitations" });
  }
}

/**
 * Joins room with authorization checks.
 */
export async function joinGDRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const userId = req.user?._id?.toString() || req.user?.id?.toString();
    const username = req.user?.username || req.user?.email?.split("@")[0] || "student";
    const name = req.user?.fullName || req.user?.name || username;
    const avatar = req.user?.profilePicture || req.user?.avatar;

    if (!userId || !roomId) {
      res.status(400).json({ success: false, message: "Room ID and authentication required" });
      return;
    }

    const result = await gdSessionService.joinRoom({
      roomId,
      userId,
      username,
      name,
      avatar,
    });

    res.json({
      success: true,
      session: result.session,
      participant: result.participant,
    });
  } catch (error: any) {
    console.error("[GD Controller] Join room error:", error);
    res.status(403).json({
      success: false,
      message: error.message || "Could not join discussion room",
    });
  }
}

/**
 * Retrieves an existing session by ID.
 */
export async function getGDSession(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = getParam(req.params.sessionId || req.params.roomId);
    if (!sessionId) {
      res.status(400).json({ success: false, message: "Session ID is required" });
      return;
    }

    const session = await gdSessionService.getSessionById(sessionId);
    if (!session) {
      res.status(404).json({ success: false, message: "Discussion session not found" });
      return;
    }

    res.json({
      success: true,
      session,
    });
  } catch (error: any) {
    console.error("[GD Controller] Get session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch session",
    });
  }
}

/**
 * Admin starts discussion.
 */
export async function startGDSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const adminId = req.user?._id?.toString() || req.user?.id?.toString();

    if (!roomId) {
      res.status(400).json({ success: false, message: "Room ID is required" });
      return;
    }

    const session = await gdSessionService.startDiscussion(roomId, adminId);

    res.json({
      success: true,
      session,
      currentTurn: session.currentTurn,
    });
  } catch (error: any) {
    console.error("[GD Controller] Start discussion error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to start discussion",
    });
  }
}

/**
 * Student finishes their speaking turn.
 */
export async function finishStudentTurn(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const userId = req.user?._id?.toString() || req.user?.id?.toString();
    const { wordsSpoken } = req.body;

    const session = await gdSessionService.finishTurn(roomId, userId, Number(wordsSpoken) || 0);

    res.json({
      success: true,
      currentTurn: session?.currentTurn,
      round: session?.round,
      participants: session?.participants,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to finish turn" });
  }
}

/**
 * Student passes their speaking turn.
 */
export async function passStudentTurn(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const userId = req.user?._id?.toString() || req.user?.id?.toString();

    const session = await gdSessionService.passTurn(roomId, userId);

    res.json({
      success: true,
      currentTurn: session?.currentTurn,
      round: session?.round,
      participants: session?.participants,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to pass turn" });
  }
}

/**
 * Admin skips current turn.
 */
export async function skipStudentTurn(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const adminId = req.user?._id?.toString() || req.user?.id?.toString();

    const session = await gdSessionService.skipTurnByAdmin(roomId, adminId);

    res.json({
      success: true,
      currentTurn: session?.currentTurn,
      round: session?.round,
      participants: session?.participants,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to skip turn" });
  }
}

/**
 * Appends a candidate or peer transcript segment.
 */
export async function appendTranscriptSegment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const sessionId = getParam(req.params.sessionId || req.params.roomId);
    const { participantId, participantName, username, text, durationSeconds, isInterruption, language, confidence } = req.body;

    if (!sessionId || !text?.trim()) {
      res.status(400).json({ success: false, message: "Valid text and sessionId are required" });
      return;
    }

    const speakerId = req.user?._id?.toString() || participantId || "candidate";
    const speakerName = req.user?.fullName || participantName || "Candidate";
    const speakerUsername = req.user?.username || username;

    const session = await gdSessionService.addTranscriptSegment(sessionId, {
      participantId: speakerId,
      participantName: speakerName,
      username: speakerUsername,
      text: text.trim(),
      durationSeconds: Number(durationSeconds) || 4,
      isInterruption: Boolean(isInterruption),
      language,
      confidence,
    });

    if (!session) {
      res.status(404).json({ success: false, message: "Session not found" });
      return;
    }

    res.json({
      success: true,
      participants: session.participants,
      lastSegment: session.transcript.slice(-1)[0],
    });
  } catch (error: any) {
    console.error("[GD Controller] Append transcript error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record transcript segment",
    });
  }
}

/**
 * Concludes session and returns comprehensive evaluation. Only room admin can end discussion.
 */
export async function endGDSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const sessionId = getParam(req.params.sessionId || req.params.roomId);
    const adminId = req.user?._id?.toString() || req.user?.id?.toString();

    if (!sessionId) {
      res.status(400).json({ success: false, message: "Session ID is required" });
      return;
    }

    const session = await gdSessionService.endSession(sessionId, adminId);
    if (!session) {
      res.status(404).json({ success: false, message: "Session not found" });
      return;
    }

    res.json({
      success: true,
      session,
      evaluations: session.evaluations,
      evaluation: session.evaluation,
      metrics: session.metrics,
    });
  } catch (error: any) {
    console.error("[GD Controller] End session error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to complete discussion and generate evaluation",
    });
  }
}

/**
 * Retrieves past GD sessions for the authenticated student.
 */
export async function getMyGDSessions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id || req.user?.id;
    const username = req.user?.username;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const sessions = await GroupDiscussion.find({
      $or: [
        { adminId: userId },
        { "participants.userId": userId },
        ...(username ? [{ "participants.username": username }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    console.error("[GD Controller] Get my GD sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch discussion history",
    });
  }
}

/**
 * Toggles bookmark for a GD room/session
 */
export async function toggleGDBookmark(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id || req.user?.id;
    const roomId = getParam(req.params.roomId || req.params.sessionId);

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    if (!roomId) {
      res.status(400).json({ success: false, message: "Room/Session ID is required" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (!user.gdBookmarks) user.gdBookmarks = [];

    const index = user.gdBookmarks.findIndex((id) => id.toString() === roomId);
    let bookmarked = false;

    if (index > -1) {
      user.gdBookmarks.splice(index, 1);
      bookmarked = false;
    } else {
      user.gdBookmarks.push(new mongoose.Types.ObjectId(roomId));
      bookmarked = true;
    }

    await user.save();

    res.json({
      success: true,
      bookmarked,
      gdBookmarks: user.gdBookmarks,
      message: bookmarked ? "Group Discussion bookmarked!" : "Bookmark removed",
    });
  } catch (error: any) {
    console.error("[GD Controller] Toggle bookmark error:", error);
    res.status(500).json({ success: false, message: "Failed to toggle bookmark" });
  }
}

/**
 * Retrieves all bookmarked GD sessions for the current user
 */
export async function getGDBookmarks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const user = await User.findById(userId).populate({
      path: "gdBookmarks",
      select: "topic adminUsername status participants round createdAt endedAt evaluations",
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({
      success: true,
      bookmarks: user.gdBookmarks || [],
    });
  } catch (error: any) {
    console.error("[GD Controller] Get bookmarks error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bookmarked discussions" });
  }
}
