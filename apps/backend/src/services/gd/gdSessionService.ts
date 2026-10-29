import mongoose from "mongoose";
import { GroupDiscussion } from "../../models/GroupDiscussion";
import { User } from "../../models/User";
import type {
  IGroupDiscussion,
  IGDParticipant,
  IGDTranscriptSegment,
  IGDTopicMetadata,
  IGDInvitation,
  IGDCurrentTurn,
} from "../../models/GroupDiscussion";
import { gdTopicDiscoveryService } from "./gdTopicDiscoveryService";
import { gdTranscriptMetricsService } from "./gdTranscriptMetricsService";
import { gdEvaluationService } from "./gdEvaluationService";

export const MAX_STUDENTS_CAPACITY = 5;
export const DEFAULT_SILENCE_WARNING_SEC = 90;
export const DEFAULT_SILENCE_TIMEOUT_SEC = 120;
export const DEFAULT_SUGGESTED_DURATION_SEC = 90;

export const VIRTUAL_PARTICIPANTS: Omit<IGDParticipant, "speakingTimeSeconds" | "segmentCount" | "wordCount" | "percentSpeakingTime">[] = [
  {
    id: "ai-priya",
    name: "Priya Sharma",
    role: "Tech Pragmatist",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    isAi: true,
    isHost: false,
  },
  {
    id: "ai-rohan",
    name: "Rohan Gupta",
    role: "Business Strategist",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    isAi: true,
    isHost: false,
  },
  {
    id: "ai-ananya",
    name: "Ananya Sen",
    role: "Ethics & Social Advocate",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    isAi: true,
    isHost: false,
  },
  {
    id: "ai-kabir",
    name: "Kabir Verma",
    role: "Moderator & Synthesizer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    isAi: true,
    isHost: false,
  },
];

let gdRoomBroadcaster: ((sessionId: string, payload: any) => void) | null = null;

export function registerGDRoomBroadcaster(broadcaster: (sessionId: string, payload: any) => void) {
  gdRoomBroadcaster = broadcaster;
}

export function broadcastToGDRoom(sessionId: string, payload: any) {
  if (gdRoomBroadcaster) {
    try {
      gdRoomBroadcaster(sessionId, payload);
    } catch {
      // Non-fatal
    }
  }
}

class GDSessionService {
  /**
   * Creates a new Group Discussion room hosted by an admin/moderator.
   * English is the default expected language unless specified.
   */
  public async createRoom(params: {
    adminId: string;
    adminUsername: string;
    adminFullName?: string;
    adminAvatar?: string;
    category?: string;
    expectedLanguage?: string;
    topicOverride?: IGDTopicMetadata;
    invitees?: string[];
  }): Promise<IGroupDiscussion> {
    // 1. Resolve Discussion Topic
    let topic: IGDTopicMetadata;
    if (params.topicOverride) {
      topic = params.topicOverride;
    } else {
      topic = await gdTopicDiscoveryService.getRandomTopic({
        category: params.category,
      });
    }

    const adminObjectId = new mongoose.Types.ObjectId(params.adminId);

    // 2. Host / Admin Participant
    const adminParticipant: IGDParticipant = {
      id: params.adminId,
      userId: adminObjectId,
      username: params.adminUsername.toLowerCase().trim(),
      name: params.adminFullName || params.adminUsername,
      role: "admin",
      avatar:
        params.adminAvatar ||
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
      isAi: false,
      isHost: true,
      speakingTimeSeconds: 0,
      segmentCount: 0,
      wordCount: 0,
      percentSpeakingTime: 0,
      turnsCompleted: 0,
      turnsPassed: 0,
      turnsSkipped: 0,
      hasSpokenInCurrentRound: false,
      isOnline: true,
      isAudioMuted: false,
      isVideoMuted: false,
      joinedAt: new Date(),
    };

    // 3. Batch resolve initial student invitations
    const initialInvitations: IGDInvitation[] = [];
    if (params.invitees && Array.isArray(params.invitees) && params.invitees.length > 0) {
      const cleanInvitees = Array.from(
        new Set(
          params.invitees
            .map((u) => (typeof u === "string" ? u.toLowerCase().trim() : ""))
            .filter((u) => u && u !== params.adminUsername.toLowerCase().trim())
        )
      ).slice(0, MAX_STUDENTS_CAPACITY);

      if (cleanInvitees.length > 0) {
        const foundUsers = await User.find({ username: { $in: cleanInvitees } })
          .select("_id username fullName")
          .lean();

        for (const u of foundUsers) {
          if (u.username) {
            initialInvitations.push({
              userId: u._id as any,
              username: u.username.toLowerCase().trim(),
              fullName: u.fullName,
              status: "pending",
              invitedAt: new Date(),
            });
          }
        }
      }
    }

    // 4. Create room document
    const room = new GroupDiscussion({
      userId: adminObjectId, // Backward compatibility
      adminId: adminObjectId,
      adminUsername: params.adminUsername.toLowerCase().trim(),
      adminFullName: params.adminFullName || params.adminUsername,
      expectedLanguage: params.expectedLanguage?.trim() || "English",
      status: "preparing",
      topic,
      invitations: initialInvitations,
      participants: [adminParticipant],
      turnHistory: [],
      round: 1,
      transcript: [],
      evaluations: [],
      startedAt: new Date(),
    });

    await room.save();
    return room;
  }

  /**
   * Search registered students by username prefix/query.
   */
  public async searchUsersByUsername(
    query: string,
    excludeUsernames: string[] = []
  ): Promise<Array<{ id: string; username: string; fullName: string; profilePicture?: string }>> {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const lowerExcluded = excludeUsernames.map((u) => u.toLowerCase().trim());
    const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const users = await User.find({
      username: { $regex: escapedQuery, $options: "i" },
      ...(lowerExcluded.length > 0 ? { username: { $nin: lowerExcluded } } : {}),
    })
      .select("username fullName profilePicture")
      .limit(10)
      .lean();

    return users.map((u) => ({
      id: u._id.toString(),
      username: u.username || "",
      fullName: u.fullName,
      profilePicture: u.profilePicture,
    }));
  }

  /**
   * Admin invites a registered user by username.
   */
  public async sendInvitation(
    roomId: string,
    adminId: string,
    targetUsername: string
  ): Promise<{ room: IGroupDiscussion; invitation: IGDInvitation }> {
    const room = await this.getSessionById(roomId);
    if (!room) {
      throw new Error("Discussion room not found");
    }

    // Any participant in the room can invite
    const cleanUsername = targetUsername.toLowerCase().trim();

    // Check user existence
    const user = await User.findOne({ username: cleanUsername }).select("_id fullName username").lean();
    if (!user) {
      throw new Error(`User "@${cleanUsername}" does not exist in PrepX`);
    }

    // Check for duplicate invitation
    const existingInv = room.invitations.find((inv) => inv.username === cleanUsername);
    if (existingInv && existingInv.status !== "declined" && existingInv.status !== "expired") {
      throw new Error(`User "@${cleanUsername}" has already been invited (status: ${existingInv.status})`);
    }

    // Check student capacity constraint (Max 5 students excluding admin)
    const acceptedCount = room.invitations.filter((i) => i.status === "accepted").length;
    const studentParticipantsCount = room.participants.filter((p) => !p.isHost && p.role !== "admin").length;
    const currentStudents = Math.max(acceptedCount, studentParticipantsCount);

    if (currentStudents >= MAX_STUDENTS_CAPACITY) {
      throw new Error(`Room has reached the maximum capacity of ${MAX_STUDENTS_CAPACITY} students`);
    }

    const newInvitation: IGDInvitation = {
      userId: user._id as any,
      username: cleanUsername,
      fullName: user.fullName,
      status: "pending",
      invitedAt: new Date(),
    };

    if (existingInv) {
      existingInv.status = "pending";
      existingInv.invitedAt = new Date();
      existingInv.respondedAt = undefined;
    } else {
      room.invitations.push(newInvitation);
    }

    await room.save();

    // Instant WebSocket broadcast to active room participants
    broadcastToGDRoom(roomId, {
      type: "invitation_sent",
      payload: { invitation: newInvitation },
    });

    return { room, invitation: newInvitation };
  }

  /**
   * Responds to an invitation (accept or decline).
   */
  public async respondToInvitation(
    roomId: string,
    username: string,
    action: "accept" | "decline"
  ): Promise<{ room: IGroupDiscussion; invitation: IGDInvitation }> {
    const room = await this.getSessionById(roomId);
    if (!room) {
      throw new Error("Discussion room not found");
    }

    const cleanUsername = username.toLowerCase().trim();
    const invitation = room.invitations.find((inv) => inv.username === cleanUsername);

    if (!invitation) {
      throw new Error("No invitation found for this user in this room");
    }

    if (action === "decline") {
      invitation.status = "declined";
      invitation.respondedAt = new Date();
      await room.save();
      broadcastToGDRoom(roomId, {
        type: "invitation_updated",
        payload: { invitation },
      });
      return { room, invitation };
    }

    // Acceptance: verify capacity constraint
    const acceptedCount = room.invitations.filter(
      (i) => i.status === "accepted" && i.username !== cleanUsername
    ).length;
    const studentParticipants = room.participants.filter(
      (p) => !p.isHost && p.role !== "admin" && p.username !== cleanUsername
    ).length;

    const occupiedStudents = Math.max(acceptedCount, studentParticipants);

    if (occupiedStudents >= MAX_STUDENTS_CAPACITY) {
      invitation.status = "expired";
      await room.save();
      throw new Error(`Room is already full. Maximum ${MAX_STUDENTS_CAPACITY} students reached.`);
    }

    invitation.status = "accepted";
    invitation.respondedAt = new Date();
    await room.save();

    broadcastToGDRoom(roomId, {
      type: "invitation_updated",
      payload: { invitation },
    });

    return { room, invitation };
  }

  /**
   * Retrieves pending invitations for a user.
   */
  public async getInvitationsForUser(username: string): Promise<
    Array<{
      roomId: string;
      topic: IGDTopicMetadata;
      adminUsername: string;
      adminFullName?: string;
      expectedLanguage: string;
      status: string;
      invitedAt: Date;
    }>
  > {
    const cleanUsername = username.toLowerCase().trim();
    const rooms = await GroupDiscussion.find({
      "invitations.username": cleanUsername,
      status: { $in: ["preparing", "in_progress"] },
    })
      .select("topic adminUsername adminFullName expectedLanguage invitations createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const results: any[] = [];
    for (const r of rooms) {
      const inv = (r.invitations || []).find((i: any) => i.username === cleanUsername);
      if (inv) {
        results.push({
          roomId: r._id.toString(),
          topic: r.topic,
          adminUsername: r.adminUsername,
          adminFullName: r.adminFullName,
          expectedLanguage: r.expectedLanguage,
          status: inv.status,
          invitedAt: inv.invitedAt,
        });
      }
    }
    return results;
  }

  /**
   * Joins a GD room. Validates authentication and authorization:
   * - Admin always allowed.
   * - Student allowed only if invited and accepted.
   * - Reconnects cleanly without duplicating participant entries or exceeding 5 students.
   */
  public async joinRoom(params: {
    roomId: string;
    userId: string;
    username: string;
    name: string;
    avatar?: string;
  }): Promise<{ session: IGroupDiscussion; participant: IGDParticipant }> {
    const session = await this.getSessionById(params.roomId);
    if (!session) {
      throw new Error("Discussion room not found");
    }

    const cleanUsername = params.username.toLowerCase().trim();
    const isAdmin = session.adminId.toString() === params.userId || session.adminUsername === cleanUsername;

    let participant = session.participants.find(
      (p) => p.id === params.userId || (p.username && p.username.toLowerCase() === cleanUsername)
    );

    if (participant) {
      // Reconnection or tab refresh
      participant.isOnline = true;
      if (params.name) participant.name = params.name;
      if (params.avatar) participant.avatar = params.avatar;
      await session.save();
      return { session, participant };
    }

    if (isAdmin) {
      participant = {
        id: params.userId,
        userId: new mongoose.Types.ObjectId(params.userId),
        username: cleanUsername,
        name: params.name || session.adminFullName || cleanUsername,
        role: "admin",
        avatar: params.avatar || "",
        isAi: false,
        isHost: true,
        speakingTimeSeconds: 0,
        segmentCount: 0,
        wordCount: 0,
        percentSpeakingTime: 0,
        turnsCompleted: 0,
        turnsPassed: 0,
        turnsSkipped: 0,
        hasSpokenInCurrentRound: false,
        isOnline: true,
        isAudioMuted: false,
        isVideoMuted: false,
        joinedAt: new Date(),
      };
      session.participants.push(participant);
      await session.save();
      return { session, participant };
    }

    // Open room participation: any authenticated user can join directly up to room capacity
    const existingStudents = session.participants.filter((p) => !p.isHost && p.role !== "admin").length;
    if (existingStudents >= MAX_STUDENTS_CAPACITY) {
      throw new Error(`Room capacity reached: Maximum ${MAX_STUDENTS_CAPACITY} participants allowed in this discussion`);
    }

    participant = {
      id: params.userId,
      userId: new mongoose.Types.ObjectId(params.userId),
      username: cleanUsername,
      name: params.name || cleanUsername,
      role: "student",
      avatar:
        params.avatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      isAi: false,
      isHost: false,
      speakingTimeSeconds: 0,
      segmentCount: 0,
      wordCount: 0,
      percentSpeakingTime: 0,
      turnsCompleted: 0,
      turnsPassed: 0,
      turnsSkipped: 0,
      hasSpokenInCurrentRound: false,
      isOnline: true,
      isAudioMuted: false,
      isVideoMuted: false,
      joinedAt: new Date(),
    };

    session.participants.push(participant);
    await session.save();

    return { session, participant };
  }

  /**
   * Retrieves session by ID.
   */
  public async getSessionById(sessionId: string): Promise<IGroupDiscussion | null> {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return null;
    return GroupDiscussion.findById(sessionId);
  }

  /**
   * Starts discussion explicitly by room admin.
   */
  public async startDiscussion(roomId: string, adminId: string): Promise<IGroupDiscussion> {
    const session = await this.getSessionById(roomId);
    if (!session) throw new Error("Discussion room not found");

    if (session.status !== "in_progress") {
      session.status = "in_progress";
      session.startedAt = new Date();
      await session.save();
    }

    // Pick first turn if not already active
    if (!session.currentTurn) {
      await this.assignNextTurn(roomId, "initial_turn");
    }

    return (await this.getSessionById(roomId))!;
  }

  /**
   * Fair, randomized turn scheduler.
   * Shuffles speaking order each round, prioritizes students with fewer opportunities,
   * balances speaking time, and never repeatedly selects the same student while others are eligible.
   */
  public async assignNextTurn(
    roomId: string,
    reason?: "initial_turn" | "student_finished" | "student_passed" | "admin_skipped" | "silence_timeout" | "disconnect",
    wordsSpoken: number = 0
  ): Promise<IGDCurrentTurn | null> {
    const session = await this.getSessionById(roomId);
    if (!session) return null;

    const previousTurn = session.currentTurn;
    const now = new Date();

    // 1. Archive previous turn if one existed
    if (previousTurn) {
      const prevParticipant = session.participants.find((p) => p.id === previousTurn.participantId);
      const durationSeconds = Math.max(1, Math.round((now.getTime() - new Date(previousTurn.startedAt).getTime()) / 1000));

      if (prevParticipant) {
        prevParticipant.hasSpokenInCurrentRound = true;
        if (reason === "student_finished") {
          prevParticipant.turnsCompleted = (prevParticipant.turnsCompleted || 0) + 1;
        } else if (reason === "student_passed") {
          prevParticipant.turnsPassed = (prevParticipant.turnsPassed || 0) + 1;
        } else if (reason === "admin_skipped" || reason === "silence_timeout") {
          prevParticipant.turnsSkipped = (prevParticipant.turnsSkipped || 0) + 1;
        }
      }

      session.turnHistory.push({
        round: previousTurn.round || session.round || 1,
        participantId: previousTurn.participantId,
        username: previousTurn.username,
        name: previousTurn.name,
        startedAt: previousTurn.startedAt,
        endedAt: now,
        durationSeconds,
        endReason: (reason as any) || "student_finished",
        wordsSpoken: wordsSpoken || 0,
      });
    }

    // 2. Identify active student participants (excluding admin)
    const activeStudents = session.participants.filter(
      (p) => !p.isHost && p.role !== "admin" && p.isOnline !== false
    );

    if (activeStudents.length === 0) {
      session.currentTurn = undefined;
      await session.save();
      return null;
    }

    // 3. Find eligible students who have NOT yet spoken in the current round
    let eligibleStudents = activeStudents.filter((p) => !p.hasSpokenInCurrentRound);

    // If all active students have had an opportunity in this round, advance round
    if (eligibleStudents.length === 0) {
      session.round = (session.round || 1) + 1;
      for (const p of activeStudents) {
        p.hasSpokenInCurrentRound = false;
      }
      eligibleStudents = [...activeStudents];
    }

    // Avoid picking the exact same student consecutively across round boundaries if others exist
    if (eligibleStudents.length > 1 && previousTurn) {
      eligibleStudents = eligibleStudents.filter((p) => p.id !== previousTurn.participantId);
      if (eligibleStudents.length === 0) {
        eligibleStudents = [...activeStudents];
      }
    }

    // 4. Fairness-aware selection:
    // Sort primarily by fewest total opportunities (completed + passed + skipped),
    // secondarily by least total speaking duration.
    eligibleStudents.sort((a, b) => {
      const oppA = (a.turnsCompleted || 0) + (a.turnsPassed || 0) + (a.turnsSkipped || 0);
      const oppB = (b.turnsCompleted || 0) + (b.turnsPassed || 0) + (b.turnsSkipped || 0);
      if (oppA !== oppB) return oppA - oppB;
      return (a.speakingTimeSeconds || 0) - (b.speakingTimeSeconds || 0);
    });

    // Randomize among equally eligible students (same lowest opportunity count)
    const minOpportunities =
      (eligibleStudents[0]!.turnsCompleted || 0) +
      (eligibleStudents[0]!.turnsPassed || 0) +
      (eligibleStudents[0]!.turnsSkipped || 0);

    const pool = eligibleStudents.filter((p) => {
      const opp = (p.turnsCompleted || 0) + (p.turnsPassed || 0) + (p.turnsSkipped || 0);
      return opp === minOpportunities;
    });

    // Pick random from top pool
    const selected = pool[Math.floor(Math.random() * pool.length)]!;

    const nextTurn: IGDCurrentTurn = {
      participantId: selected.id,
      username: selected.username || selected.name,
      name: selected.name,
      startedAt: now,
      lastSpokeAt: now,
      warningEmitted: false,
      round: session.round || 1,
      suggestedDurationSeconds: DEFAULT_SUGGESTED_DURATION_SEC,
    };

    session.currentTurn = nextTurn;
    await session.save();

    return nextTurn;
  }

  /**
   * Finish turn by student.
   */
  public async finishTurn(
    roomId: string,
    participantId: string,
    wordsSpoken: number = 0
  ): Promise<IGroupDiscussion | null> {
    const session = await this.getSessionById(roomId);
    if (!session || !session.currentTurn) return null;

    if (session.currentTurn.participantId !== participantId) {
      throw new Error("Only the currently assigned speaker can finish this turn");
    }

    await this.assignNextTurn(roomId, "student_finished", wordsSpoken);
    return this.getSessionById(roomId);
  }

  /**
   * Pass turn by student.
   */
  public async passTurn(roomId: string, participantId: string): Promise<IGroupDiscussion | null> {
    const session = await this.getSessionById(roomId);
    if (!session || !session.currentTurn) return null;

    if (session.currentTurn.participantId !== participantId) {
      throw new Error("Only the currently assigned speaker can pass this turn");
    }

    await this.assignNextTurn(roomId, "student_passed", 0);
    return this.getSessionById(roomId);
  }

  /**
   * Skip turn by admin/moderator.
   */
  public async skipTurnByAdmin(roomId: string, adminId: string): Promise<IGroupDiscussion | null> {
    const session = await this.getSessionById(roomId);
    if (!session || !session.currentTurn) return null;

    // Allow participants to skip turn when needed

    await this.assignNextTurn(roomId, "admin_skipped", 0);
    return this.getSessionById(roomId);
  }

  /**
   * Automatically passes turn when silence threshold (120s) is exceeded.
   */
  public async handleSilenceTimeout(roomId: string): Promise<IGroupDiscussion | null> {
    const session = await this.getSessionById(roomId);
    if (!session || !session.currentTurn) return null;

    await this.assignNextTurn(roomId, "silence_timeout", 0);
    return this.getSessionById(roomId);
  }

  /**
   * Handles participant disconnection cleanly.
   */
  public async handleParticipantDisconnect(
    roomId: string,
    participantId: string
  ): Promise<IGroupDiscussion | null> {
    const session = await this.getSessionById(roomId);
    if (!session) return null;

    const p = session.participants.find((part) => part.id === participantId);
    if (p) {
      p.isOnline = false;
    }

    if (session.currentTurn && session.currentTurn.participantId === participantId) {
      await this.assignNextTurn(roomId, "disconnect", 0);
    } else {
      await session.save();
    }

    return this.getSessionById(roomId);
  }

  /**
   * Appends attributed transcript segment and updates participant metrics.
   */
  public async addTranscriptSegment(
    sessionId: string,
    segment: {
      participantId: string;
      participantName: string;
      username?: string;
      text: string;
      durationSeconds: number;
      isInterruption?: boolean;
      language?: string;
      confidence?: number;
    }
  ): Promise<IGroupDiscussion | null> {
    const session = await this.getSessionById(sessionId);
    if (!session) return null;

    const words = segment.text ? segment.text.trim().split(/\s+/).filter(Boolean).length : 0;

    const newSegment: IGDTranscriptSegment = {
      id: `seg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      participantId: segment.participantId,
      participantName: segment.participantName,
      username: segment.username?.toLowerCase().trim(),
      text: segment.text.trim(),
      timestamp: new Date(),
      durationSeconds: Math.max(1, segment.durationSeconds || Math.round(words / 2.5)),
      isInterruption: segment.isInterruption || false,
      language: segment.language || "en",
      confidence: segment.confidence || 1.0,
    };

    session.transcript.push(newSegment);

    // Update participant metrics
    const p = session.participants.find((part) => part.id === segment.participantId);
    if (p) {
      p.speakingTimeSeconds += newSegment.durationSeconds;
      p.segmentCount += 1;
      p.wordCount += words;
    }

    // Recompute speaking percentages
    const totalSpeaking = session.participants.reduce((sum, part) => sum + part.speakingTimeSeconds, 0);
    if (totalSpeaking > 0) {
      for (const part of session.participants) {
        part.percentSpeakingTime = Math.round((part.speakingTimeSeconds / totalSpeaking) * 100);
      }
    }

    // Reset silence timer on the current turn if speaker is active
    if (session.currentTurn && session.currentTurn.participantId === segment.participantId) {
      session.currentTurn.lastSpokeAt = new Date();
      session.currentTurn.warningEmitted = false;
    }

    if (session.status === "preparing") {
      session.status = "in_progress";
    }

    await session.save();
    return session;
  }

  /**
   * Concludes discussion session, computes metrics, generates individual student evaluations,
   * ranks students, and awards gamification XP idempotently.
   * Admin is strictly excluded from student evaluation, ranking, and gamification points.
   */
  public async endSession(sessionId: string, adminId?: string): Promise<IGroupDiscussion | null> {
    const session = await this.getSessionById(sessionId);
    if (!session) return null;

    // Verify admin
    if (adminId && session.adminId.toString() !== adminId) {
      throw new Error("Only the room owner/admin can end the discussion session");
    }

    // Idempotent completion check
    if (session.status === "completed" && session.evaluations && session.evaluations.length > 0) {
      return session;
    }

    session.status = "completed";
    session.endedAt = new Date();
    session.endReason = "admin_ended";
    session.currentTurn = undefined;

    const durationSeconds = session.startedAt
      ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000)
      : session.participants.reduce((s, p) => s + p.speakingTimeSeconds, 0);

    // 1. Calculate overall metrics
    const metricsResult = gdTranscriptMetricsService.computeMetrics(
      session.participants,
      session.transcript,
      durationSeconds
    );

    session.metrics = {
      totalDurationSeconds: metricsResult.totalDurationSeconds,
      totalWords: metricsResult.totalWords,
      participantMetrics: metricsResult.participantMetrics,
    };

    // 2. Generate individual student evaluations (100-point rubric, Groq + fallback)
    const evaluations = await gdEvaluationService.evaluateAllStudents(
      session.topic,
      session.participants,
      session.transcript,
      metricsResult.participantMetrics,
      durationSeconds,
      session.expectedLanguage
    );

    session.evaluations = evaluations;

    // Backward-compatible single evaluation for legacy consumers
    if (evaluations.length > 0) {
      const topStudent = evaluations[0]!;
      session.evaluation = {
        overallScore: Math.round(topStudent.overallScore / 10),
        readinessLevel:
          topStudent.overallScore >= 85
            ? "Exceptional"
            : topStudent.overallScore >= 70
            ? "Placement Ready"
            : topStudent.overallScore >= 55
            ? "Proficient"
            : "Developing",
        parameterScores: {
          communication: Math.min(10, Math.round((topStudent.criterionScores.clarityAndStructure / 15) * 10)),
          contentKnowledge: Math.min(10, Math.round((topStudent.criterionScores.topicRelevance / 25) * 10)),
          criticalThinking: Math.min(10, Math.round((topStudent.criterionScores.reasoningAndExamples / 15) * 10)),
          groupDynamics: Math.min(10, Math.round((topStudent.criterionScores.activeListening / 10) * 10)),
          leadership: Math.min(10, Math.round((topStudent.criterionScores.participationBalance / 10) * 10)),
        },
        strengths: topStudent.strongestArguments,
        weaknesses: topStudent.areasForImprovement,
        actionableTips: topStudent.practicalRecommendations,
        feedbackSummary: topStudent.topicRelevanceExplanation,
        evaluatedBy: topStudent.evaluatedBy,
        modelUsed: topStudent.modelUsed,
        evaluatedAt: new Date(),
      };
    }

    await session.save();
    return session;
  }
}

export const gdSessionService = new GDSessionService();
