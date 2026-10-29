import mongoose, { Document, Schema } from "mongoose";

export interface IGDTopicMetadata {
  question: string;
  originalTitle: string;
  title?: string;
  description: string;
  sourceUrl: string;
  publisher: string;
  publishedAt: Date;
  category: string;
  sourceMode: "rss" | "cached-rss" | "static-fallback";
  isAiGenerated: boolean;
}

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export interface IGDInvitation {
  userId?: mongoose.Types.ObjectId;
  username: string;
  fullName?: string;
  status: InvitationStatus;
  invitedAt: Date;
  respondedAt?: Date;
}

export interface IGDParticipant {
  id: string;
  userId?: mongoose.Types.ObjectId;
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
  joinedAt?: Date;
}

export interface IGDTranscriptSegment {
  id: string;
  participantId: string;
  participantName: string;
  username?: string;
  text: string;
  timestamp: Date;
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
  gamificationAwardedAt?: Date;
  evaluatedBy: "groq" | "fallback";
  modelUsed?: string;
  evaluatedAt: Date;
}

export interface IGDEvaluation {
  overallScore: number;
  readinessLevel: "Needs Improvement" | "Developing" | "Proficient" | "Placement Ready" | "Exceptional";
  parameterScores: {
    communication: number; // Clarity, articulation, tone (1-10)
    contentKnowledge: number; // Topic awareness, domain depth, factual grounding (1-10)
    criticalThinking: number; // Logical structuring, nuanced perspectives (1-10)
    groupDynamics: number; // Active listening, constructive agreement/disagreement (1-10)
    leadership: number; // Initiative, moderation, turn-yielding (1-10)
  };
  strengths: string[];
  weaknesses: string[];
  actionableTips: string[];
  feedbackSummary: string;
  evaluatedBy: "groq" | "fallback";
  modelUsed?: string;
  evaluatedAt: Date;
}

export interface IGDCurrentTurn {
  participantId: string;
  username: string;
  name: string;
  startedAt: Date;
  lastSpokeAt: Date;
  warningEmitted: boolean;
  round: number;
  suggestedDurationSeconds: number;
}

export interface IGDTurnHistoryItem {
  round: number;
  participantId: string;
  username: string;
  name: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
  endReason: "student_finished" | "student_passed" | "admin_skipped" | "silence_timeout" | "disconnect";
  wordsSpoken: number;
}

export type GDStatus = "preparing" | "in_progress" | "paused" | "completed" | "abandoned";

export interface IGroupDiscussion extends Document {
  userId?: mongoose.Types.ObjectId; // Legacy owner or creator
  adminId: mongoose.Types.ObjectId;
  adminUsername: string;
  adminFullName?: string;
  expectedLanguage: string;
  status: GDStatus;
  topic: IGDTopicMetadata;
  invitations: IGDInvitation[];
  participants: IGDParticipant[];
  currentTurn?: IGDCurrentTurn;
  turnHistory: IGDTurnHistoryItem[];
  round: number;
  transcript: IGDTranscriptSegment[];
  metrics?: {
    totalDurationSeconds: number;
    totalWords: number;
    participantMetrics: IGDParticipantMetrics[];
  };
  evaluation?: IGDEvaluation; // Legacy summary
  evaluations: IGDStudentEvaluation[]; // Individual student evaluations
  startedAt?: Date;
  endedAt?: Date;
  endReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GDTopicMetadataSchema = new Schema<IGDTopicMetadata>(
  {
    question: { type: String, required: true },
    originalTitle: { type: String, required: true },
    description: { type: String, default: "" },
    sourceUrl: { type: String, required: true },
    publisher: { type: String, required: true },
    publishedAt: { type: Date, default: Date.now },
    category: { type: String, default: "General" },
    sourceMode: {
      type: String,
      enum: ["rss", "cached-rss", "static-fallback"],
      default: "rss",
    },
    isAiGenerated: { type: Boolean, default: false },
  },
  { _id: false }
);

const GDInvitationSchema = new Schema<IGDInvitation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    username: { type: String, required: true, lowercase: true, trim: true },
    fullName: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired"],
      default: "pending",
    },
    invitedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
  },
  { _id: false }
);

const GDParticipantSchema = new Schema<IGDParticipant>(
  {
    id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    username: { type: String, lowercase: true, trim: true },
    name: { type: String, required: true },
    role: { type: String, default: "student" },
    avatar: { type: String, default: "" },
    isAi: { type: Boolean, default: false },
    isHost: { type: Boolean, default: false },
    speakingTimeSeconds: { type: Number, default: 0 },
    segmentCount: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    percentSpeakingTime: { type: Number, default: 0 },
    turnsCompleted: { type: Number, default: 0 },
    turnsPassed: { type: Number, default: 0 },
    turnsSkipped: { type: Number, default: 0 },
    hasSpokenInCurrentRound: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: true },
    isAudioMuted: { type: Boolean, default: false },
    isVideoMuted: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const GDTranscriptSegmentSchema = new Schema<IGDTranscriptSegment>(
  {
    id: { type: String, required: true },
    participantId: { type: String, required: true },
    participantName: { type: String, required: true },
    username: { type: String, lowercase: true, trim: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    durationSeconds: { type: Number, default: 0 },
    isInterruption: { type: Boolean, default: false },
    language: { type: String, default: "en" },
    confidence: { type: Number, default: 1.0 },
  },
  { _id: false }
);

const GDParticipantMetricsSchema = new Schema<IGDParticipantMetrics>(
  {
    participantId: { type: String, required: true },
    participantName: { type: String, required: true },
    isAi: { type: Boolean, default: false },
    segmentCount: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    totalSpeakingSeconds: { type: Number, default: 0 },
    percentSpeakingTime: { type: Number, default: 0 },
    averageSegmentDurationSeconds: { type: Number, default: 0 },
    responseCount: { type: Number, default: 0 },
    interruptionCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const GDCurrentTurnSchema = new Schema<IGDCurrentTurn>(
  {
    participantId: { type: String, required: true },
    username: { type: String, default: "" },
    name: { type: String, default: "" },
    startedAt: { type: Date, default: Date.now },
    lastSpokeAt: { type: Date, default: Date.now },
    warningEmitted: { type: Boolean, default: false },
    round: { type: Number, default: 1 },
    suggestedDurationSeconds: { type: Number, default: 90 },
  },
  { _id: false }
);

const GDTurnHistoryItemSchema = new Schema<IGDTurnHistoryItem>(
  {
    round: { type: Number, default: 1 },
    participantId: { type: String, required: true },
    username: { type: String, default: "" },
    name: { type: String, default: "" },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: Date.now },
    durationSeconds: { type: Number, default: 0 },
    endReason: {
      type: String,
      enum: ["student_finished", "student_passed", "admin_skipped", "silence_timeout", "disconnect"],
      default: "student_finished",
    },
    wordsSpoken: { type: Number, default: 0 },
  },
  { _id: false }
);

const GDStudentEvaluationSchema = new Schema<IGDStudentEvaluation>(
  {
    userId: { type: String },
    participantId: { type: String, required: true },
    username: { type: String, required: true },
    name: { type: String, required: true },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    rank: { type: Number },
    criterionScores: {
      topicRelevance: { type: Number, default: 0 },
      reasoningAndExamples: { type: Number, default: 0 },
      clarityAndStructure: { type: Number, default: 0 },
      fluencyAndPace: { type: Number, default: 0 },
      activeListening: { type: Number, default: 0 },
      participationBalance: { type: Number, default: 0 },
      expectedLanguageConsistency: { type: Number, default: 0 },
      vocalIntelligibility: { type: Number, default: 0 },
      discussionEtiquette: { type: Number, default: 0 },
    },
    topicRelevanceExplanation: { type: String, default: "" },
    strongestArguments: [{ type: String }],
    reasoningEvidence: [{ type: String }],
    communicationStrengths: [{ type: String }],
    communicationWeaknesses: [{ type: String }],
    speechPatterns: {
      paceDescription: { type: String, default: "" },
      fillerWords: [{ type: String }],
      repetitionsCount: { type: Number, default: 0 },
      mumblingIndicators: [{ type: String }],
      observableHesitations: [{ type: String }],
    },
    languageSwitching: {
      detected: { type: Boolean, default: false },
      examples: [
        {
          snippet: { type: String },
          timestamp: { type: String },
          language: { type: String },
        },
      ],
      explanation: { type: String, default: "" },
    },
    activeListeningNotes: { type: String, default: "" },
    areasForImprovement: [{ type: String }],
    practicalRecommendations: [{ type: String }],
    suggestedPracticePlan: { type: String, default: "" },
    gamificationPointsAwarded: { type: Number, default: 0 },
    gamificationAwardedAt: { type: Date },
    evaluatedBy: { type: String, enum: ["groq", "fallback"], default: "fallback" },
    modelUsed: { type: String },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const GDEvaluationSchema = new Schema<IGDEvaluation>(
  {
    overallScore: { type: Number, required: true },
    readinessLevel: {
      type: String,
      enum: ["Needs Improvement", "Developing", "Proficient", "Placement Ready", "Exceptional"],
      default: "Developing",
    },
    parameterScores: {
      communication: { type: Number, default: 7 },
      contentKnowledge: { type: Number, default: 7 },
      criticalThinking: { type: Number, default: 7 },
      groupDynamics: { type: Number, default: 7 },
      leadership: { type: Number, default: 7 },
    },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    actionableTips: [{ type: String }],
    feedbackSummary: { type: String, default: "" },
    evaluatedBy: { type: String, enum: ["groq", "fallback"], default: "fallback" },
    modelUsed: { type: String },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const GroupDiscussionSchema = new Schema<IGroupDiscussion>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    adminUsername: { type: String, required: true, lowercase: true, trim: true },
    adminFullName: { type: String, default: "" },
    expectedLanguage: { type: String, default: "English" },
    status: {
      type: String,
      enum: ["preparing", "in_progress", "paused", "completed", "abandoned"],
      default: "preparing",
    },
    topic: { type: GDTopicMetadataSchema, required: true },
    invitations: { type: [GDInvitationSchema], default: [] },
    participants: {
      type: [GDParticipantSchema],
      validate: [
        function (val: IGDParticipant[]) {
          // Strict participant limit: Maximum 5 students, excluding the admin
          const studentCount = val.filter((p) => !p.isHost && p.role !== "admin").length;
          return studentCount <= 5;
        },
        "Group Discussion room cannot exceed 5 student participants (excluding admin)",
      ],
    },
    currentTurn: { type: GDCurrentTurnSchema },
    turnHistory: { type: [GDTurnHistoryItemSchema], default: [] },
    round: { type: Number, default: 1 },
    transcript: { type: [GDTranscriptSegmentSchema], default: [] },
    metrics: {
      totalDurationSeconds: { type: Number, default: 0 },
      totalWords: { type: Number, default: 0 },
      participantMetrics: { type: [GDParticipantMetricsSchema], default: [] },
    },
    evaluation: { type: GDEvaluationSchema },
    evaluations: { type: [GDStudentEvaluationSchema], default: [] },
    startedAt: { type: Date },
    endedAt: { type: Date },
    endReason: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
GroupDiscussionSchema.index({ adminId: 1, createdAt: -1 });
GroupDiscussionSchema.index({ "invitations.username": 1, "invitations.status": 1 });
GroupDiscussionSchema.index({ "invitations.username": 1, status: 1, createdAt: -1 });
GroupDiscussionSchema.index({ status: 1 });
GroupDiscussionSchema.index({ "participants.username": 1 });

export const GroupDiscussion = mongoose.model<IGroupDiscussion>(
  "GroupDiscussion",
  GroupDiscussionSchema
);
