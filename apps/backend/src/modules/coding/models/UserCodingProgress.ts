import mongoose, { Document, Schema } from "mongoose";

export interface ITopicStat {
  topic: string;
  solved: number;
  attempted: number;
}

export interface ICompanyStat {
  company: string;
  solved: number;
  attempted: number;
}

export interface IUserCodingProgress extends Document {
  userId: mongoose.Types.ObjectId;
  solvedProblems: mongoose.Types.ObjectId[];
  attemptedProblems: mongoose.Types.ObjectId[];
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalXP: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastSolvedDate?: Date;
  badges: string[];
  topicStats: ITopicStat[];
  companyStats: ICompanyStat[];
  averageExecutionTime: number;
  acceptanceRate: number;
  placementCodingScore: number;
  updatedAt: Date;
}

const UserCodingProgressSchema = new Schema<IUserCodingProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    solvedProblems: [{ type: Schema.Types.ObjectId, ref: "Problem" }],
    attemptedProblems: [{ type: Schema.Types.ObjectId, ref: "Problem" }],
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    totalXP: { type: Number, default: 0 },
    currentLevel: { type: Number, default: 1 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastSolvedDate: { type: Date },
    badges: { type: [String], default: ["Coding Starter"] },
    topicStats: [
      {
        topic: String,
        solved: { type: Number, default: 0 },
        attempted: { type: Number, default: 0 },
      },
    ],
    companyStats: [
      {
        company: String,
        solved: { type: Number, default: 0 },
        attempted: { type: Number, default: 0 },
      },
    ],
    averageExecutionTime: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 0 },
    placementCodingScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const UserCodingProgress = mongoose.model<IUserCodingProgress>("UserCodingProgress", UserCodingProgressSchema);
