import mongoose, { Document, Schema } from "mongoose";

export type DifficultyLevel = "Basic" | "Easy" | "Medium" | "Difficult";
export type InterviewStatus = "Pre" | "InProgress" | "Done";

export type InterviewMode = "github" | "role" | "jd";

export interface IInterview extends Document {
  userId?: mongoose.Types.ObjectId;
  title?: string;
  mode?: InterviewMode;
  role?: string;
  jobDescription?: string;
  githubMetadata: any;
  difficulty?: DifficultyLevel;
  status: InterviewStatus;
  activeDeviceToken?: string;
  score: number;
  isBookmarked?: boolean;
  feedback?: string;
  evaluationData?: any; // Stores detailed JSON feedback (ratings, per-question analysis)
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    title: {
      type: String,
      default: "",
    },
    mode: {
      type: String,
      enum: ["github", "role", "jd"],
      default: "github",
    },
    role: {
      type: String,
      default: "",
    },
    jobDescription: {
      type: String,
      default: "",
    },
    githubMetadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    difficulty: {
      type: String,
      enum: ["Basic", "Easy", "Medium", "Difficult"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pre", "InProgress", "Done"],
      default: "Pre",
    },
    activeDeviceToken: {
      type: String,
      default: "",
    },
    score: {
      type: Number,
      default: 0,
    },
    isBookmarked: {
      type: Boolean,
      default: false,
    },
    feedback: {
      type: String,
      default: "",
    },
    evaluationData: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Interview = mongoose.model<IInterview>("Interview", InterviewSchema);
