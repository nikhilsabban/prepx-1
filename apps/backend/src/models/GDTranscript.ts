import mongoose, { Document, Schema } from "mongoose";

export interface IGDTranscriptItem {
  segmentId: string;
  sequenceNumber: number;
  text: string;
  startTime?: number;
  endTime?: number;
  confidence: number;
  isFinal: boolean;
  turnId?: string;
  streamId?: string;
  timestamp: Date;
}

export interface IGDTranscript extends Document {
  sessionId: mongoose.Types.ObjectId;
  participantId: string;
  username: string;
  segments: IGDTranscriptItem[];
  totalSpeakingDuration: number;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const GDTranscriptItemSchema = new Schema<IGDTranscriptItem>(
  {
    segmentId: { type: String, required: true },
    sequenceNumber: { type: Number, required: true },
    text: { type: String, required: true },
    startTime: { type: Number, default: 0 },
    endTime: { type: Number, default: 0 },
    confidence: { type: Number, default: 1.0 },
    isFinal: { type: Boolean, default: true },
    turnId: { type: String },
    streamId: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const GDTranscriptSchema = new Schema<IGDTranscript>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "GroupDiscussion",
      required: true,
      index: true,
    },
    participantId: {
      type: String,
      required: true,
      index: true,
    },
    username: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    segments: {
      type: [GDTranscriptItemSchema],
      default: [],
    },
    totalSpeakingDuration: {
      type: Number,
      default: 0,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for session queries and participant history
GDTranscriptSchema.index({ sessionId: 1, participantId: 1 }, { unique: true });
GDTranscriptSchema.index({ sessionId: 1, createdAt: -1 });

export const GDTranscript = mongoose.model<IGDTranscript>("GDTranscript", GDTranscriptSchema);

