import { api } from "./api";

export interface IGDTopicMetadata {
  id?: string;
  question: string;
  originalTitle: string;
  description: string;
  sourceUrl: string;
  publisher: string;
  publishedAt: string | Date;
  category: string;
  sourceMode: "rss" | "cached-rss" | "static-fallback";
  isAiGenerated: boolean;
}

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export interface IGDInvitation {
  userId?: string;
  username: string;
  fullName?: string;
  status: InvitationStatus;
  invitedAt: string | Date;
  respondedAt?: string | Date;
}

export interface IGDParticipant {
  id: string;
  userId?: string;
  username?: string;
  name: string;
  role: string;
  avatar: string;
  isAi: boolean;
  isHost: boolean;
  speakingTimeSeconds: number;
  segmentCount: number;
  wordCount: number;
  percentSpeakingTime: number;
  turnsCompleted?: number;
  turnsPassed?: number;
  turnsSkipped?: number;
  hasSpokenInCurrentRound?: boolean;
  isOnline?: boolean;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
  joinedAt?: string | Date;
}

export interface IGDTranscriptSegment {
  id: string;
  participantId: string;
  participantName: string;
  username?: string;
  text: string;
  timestamp: string | Date;
  durationSeconds: number;
  isInterruption?: boolean;
  language?: string;
  confidence?: number;
}

export interface IGDParticipantMetrics {
  participantId: string;
  participantName: string;
  isAi: boolean;
  segmentCount: number;
  wordCount: number;
  totalSpeakingSeconds: number;
  percentSpeakingTime: number;
  averageSegmentDurationSeconds: number;
  responseCount: number;
  interruptionCount: number;
}

export interface IGDCriterionScores {
  topicRelevance: number; // Max 25
  reasoningAndExamples: number; // Max 15
  clarityAndStructure: number; // Max 15
  fluencyAndPace: number; // Max 10
  activeListening: number; // Max 10
  participationBalance: number; // Max 10
  expectedLanguageConsistency: number; // Max 5
  vocalIntelligibility: number; // Max 5
  discussionEtiquette: number; // Max 5
}

export interface IGDStudentEvaluation {
  userId?: string;
  participantId: string;
  username: string;
  name: string;
  overallScore: number; // 0-100
  rank?: number;
  criterionScores: IGDCriterionScores;
  topicRelevanceExplanation: string;
  strongestArguments: string[];
  reasoningEvidence: string[];
  communicationStrengths: string[];
  communicationWeaknesses: string[];
  speechPatterns: {
    paceDescription: string;
    fillerWords: string[];
    repetitionsCount: number;
    mumblingIndicators: string[];
    observableHesitations: string[];
  };
  languageSwitching: {
    detected: boolean;
    examples: Array<{
      snippet: string;
      timestamp?: string;
      language?: string;
    }>;
    explanation: string;
  };
  activeListeningNotes: string;
  areasForImprovement: string[];
  practicalRecommendations: string[];
  suggestedPracticePlan: string;
  gamificationPointsAwarded: number;
  gamificationAwardedAt?: string | Date;
  evaluatedBy: "groq" | "fallback";
  modelUsed?: string;
  evaluatedAt: string | Date;
}

export interface IGDEvaluation {
  overallScore: number;
  readinessLevel: "Needs Improvement" | "Developing" | "Proficient" | "Placement Ready" | "Exceptional";
  parameterScores: {
    communication: number;
    contentKnowledge: number;
    criticalThinking: number;
    groupDynamics: number;
    leadership: number;
  };
  strengths: string[];
  weaknesses: string[];
  actionableTips: string[];
  feedbackSummary: string;
  evaluatedBy: "groq" | "fallback";
  modelUsed?: string;
  evaluatedAt: string | Date;
}

export interface IGDCurrentTurn {
  participantId: string;
  username: string;
  name: string;
  startedAt: string | Date;
  lastSpokeAt: string | Date;
  warningEmitted: boolean;
  round: number;
  suggestedDurationSeconds: number;
}

export interface IGDSession {
  _id: string;
  userId?: string;
  adminId: string;
  adminUsername: string;
  adminFullName?: string;
  expectedLanguage: string;
  status: "preparing" | "in_progress" | "paused" | "completed" | "abandoned";
  topic: IGDTopicMetadata;
  invitations: IGDInvitation[];
  participants: IGDParticipant[];
  currentTurn?: IGDCurrentTurn;
  round: number;
  transcript: IGDTranscriptSegment[];
  metrics?: {
    totalDurationSeconds: number;
    totalWords: number;
    participantMetrics: IGDParticipantMetrics[];
  };
  evaluation?: IGDEvaluation;
  evaluations?: IGDStudentEvaluation[];
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetches a random web-derived topic (or cached/static fallback).
 */
export async function fetchRandomTopic(params?: {
  category?: string;
  exclude?: string[];
}): Promise<IGDTopicMetadata> {
  const query = new URLSearchParams();
  if (params?.category && params.category !== "All") {
    query.set("category", params.category);
  }
  if (params?.exclude && params.exclude.length > 0) {
    query.set("exclude", params.exclude.join(","));
  }

  const res = await api.get(`/api/v1/gd/random-topic?${query.toString()}`);
  return res.data.topic;
}

/**
 * Fetches the available discovered topics pool and list of categories.
 */
export async function fetchTopicsPool(): Promise<{
  categories: string[];
  topics: IGDTopicMetadata[];
  count: number;
}> {
  const res = await api.get("/api/v1/gd/topics");
  return res.data;
}

/**
 * Admin creates a new GD Room with topic and expected language.
 */
export async function createGDRoom(data: {
  category?: string;
  expectedLanguage?: string;
  topicOverride?: IGDTopicMetadata;
}): Promise<IGDSession> {
  const res = await api.post("/api/v1/gd/rooms", data);
  return res.data.session;
}

// Backward-compatible alias
export const createGDSession = createGDRoom;

/**
 * Search registered users by username.
 */
export async function searchUsersByUsername(
  query: string,
  exclude: string[] = []
): Promise<Array<{ id: string; username: string; fullName: string; profilePicture?: string }>> {
  const params = new URLSearchParams();
  params.set("q", query);
  if (exclude.length > 0) {
    params.set("exclude", exclude.join(","));
  }
  const res = await api.get(`/api/v1/gd/users/search?${params.toString()}`);
  return res.data.users || [];
}

/**
 * Admin invites a registered student by username.
 */
export async function inviteParticipant(
  roomId: string,
  username: string
): Promise<{ invitation: IGDInvitation; room: IGDSession }> {
  const res = await api.post(`/api/v1/gd/rooms/${roomId}/invitations`, { username });
  return res.data;
}

/**
 * Student accepts or declines an invitation.
 */
export async function respondToInvitation(
  roomId: string,
  action: "accept" | "decline"
): Promise<{ invitation: IGDInvitation; room: IGDSession }> {
  const res = await api.post(`/api/v1/gd/rooms/${roomId}/invitations/respond`, { action });
  return res.data;
}

/**
 * Fetches invitations received by the current student.
 */
export async function fetchMyInvitations(): Promise<
  Array<{
    roomId: string;
    topic: IGDTopicMetadata;
    adminUsername: string;
    adminFullName?: string;
    expectedLanguage: string;
    status: InvitationStatus;
    invitedAt: string;
  }>
> {
  const res = await api.get("/api/v1/gd/my-invitations");
  return res.data.invitations || [];
}

/**
 * Joins a GD room.
 */
export async function joinGDRoom(
  roomId: string
): Promise<{ session: IGDSession; participant: IGDParticipant }> {
  const res = await api.post(`/api/v1/gd/rooms/${roomId}/join`);
  return res.data;
}

/**
 * Fetches a GD session by ID.
 */
export async function fetchGDSession(sessionId: string): Promise<IGDSession> {
  const res = await api.get(`/api/v1/gd/rooms/${sessionId}`);
  return res.data.session;
}

/**
 * Admin starts the discussion.
 */
export async function startDiscussion(roomId: string): Promise<{ session: IGDSession; currentTurn?: IGDCurrentTurn }> {
  const res = await api.post(`/api/v1/gd/rooms/${roomId}/start`);
  return res.data;
}

/**
 * Student finishes their speaking turn.
 */
export async function finishTurn(
  roomId: string,
  wordsSpoken: number = 0
): Promise<{ currentTurn?: IGDCurrentTurn; round: number; participants: IGDParticipant[] }> {
  const res = await api.post(`/api/v1/gd/rooms/${roomId}/turns/finish`, { wordsSpoken });
  return res.data;
}

/**
 * Student passes their speaking turn.
 */
export async function passTurn(
  roomId: string
): Promise<{ currentTurn?: IGDCurrentTurn; round: number; participants: IGDParticipant[] }> {
  const res = await api.post(`/api/v1/gd/rooms/${roomId}/turns/pass`);
  return res.data;
}

/**
 * Admin skips the current turn.
 */
export async function skipTurn(
  roomId: string
): Promise<{ currentTurn?: IGDCurrentTurn; round: number; participants: IGDParticipant[] }> {
  const res = await api.post(`/api/v1/gd/rooms/${roomId}/turns/skip`);
  return res.data;
}

/**
 * Appends a transcript segment to the session.
 */
export async function submitTranscriptSegment(
  sessionId: string,
  data: {
    participantId?: string;
    participantName?: string;
    username?: string;
    text: string;
    durationSeconds?: number;
    isInterruption?: boolean;
    language?: string;
    confidence?: number;
  }
): Promise<{ participants: IGDParticipant[]; lastSegment: IGDTranscriptSegment }> {
  const res = await api.post(`/api/v1/gd/rooms/${sessionId}/transcript`, data);
  return res.data;
}

/**
 * Concludes a GD session, computes metrics, and generates evaluation.
 */
export async function endGDSession(sessionId: string): Promise<{
  session: IGDSession;
  evaluations?: IGDStudentEvaluation[];
  evaluation?: IGDEvaluation;
  metrics: any;
}> {
  const res = await api.post(`/api/v1/gd/rooms/${sessionId}/end`);
  return res.data;
}

/**
 * Fetches past GD sessions for the current authenticated user.
 */
export async function fetchMyGDSessions(): Promise<IGDSession[]> {
  const res = await api.get("/api/v1/gd/my-sessions");
  return res.data.sessions || [];
}

/**
 * Toggles bookmark status of a GD room/session.
 */
export async function toggleGDBookmark(
  sessionId: string
): Promise<{ success: boolean; bookmarked: boolean; message: string }> {
  const res = await api.post(`/api/v1/gd/rooms/${sessionId}/bookmark`);
  return res.data;
}

/**
 * Fetches all bookmarked GD sessions for the current authenticated user.
 */
export async function fetchGDBookmarks(): Promise<IGDSession[]> {
  const res = await api.get("/api/v1/gd/bookmarks");
  return res.data.bookmarks || [];
}

/**
 * Synthesizes AI Moderator speech for the Group Discussion topic introduction using Murf AI.
 */
export async function fetchGDModeratorSpeech(
  roomId: string,
  textOverride?: string
): Promise<{
  success: boolean;
  moderatorText: string;
  audioBase64: string | null;
  contentType?: string;
}> {
  const res = await api.post(`/api/v1/gd/rooms/${roomId}/moderator-speech`, { textOverride });
  return res.data;
}

