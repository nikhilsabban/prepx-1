import mongoose, { Document, Schema } from "mongoose";

export interface IResumeAnalysis extends Document {
  userId: mongoose.Types.ObjectId;
  resumeId: mongoose.Types.ObjectId;
  jobDescriptionId?: mongoose.Types.ObjectId;
  atsScore: number;
  jobMatchScore: number;
  scoreBreakdown: {
    keywordMatch: number;
    jobAlignment: number;
    skillsMatch: number;
    experienceRelevance: number;
    structure: number;
    formatting: number;
    contactInformation: number;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: Array<{
    priority: "HIGH" | "MEDIUM" | "LOW";
    category: string;
    suggestion: string;
    reason: string;
  }>;
  sectionFeedback: {
    summary?: string;
    skills?: string;
    experience?: string;
    projects?: string;
    education?: string;
  };
  formattingAnalysis: {
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    issues: string[];
  };
  analysisVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeAnalysisSchema = new Schema<IResumeAnalysis>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resumeId: {
      type: Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
      index: true,
    },
    jobDescriptionId: {
      type: Schema.Types.ObjectId,
      ref: "JobDescription",
      index: true,
    },
    atsScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    jobMatchScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    scoreBreakdown: {
      keywordMatch: { type: Number, default: 0 },
      jobAlignment: { type: Number, default: 0 },
      skillsMatch: { type: Number, default: 0 },
      experienceRelevance: { type: Number, default: 0 },
      structure: { type: Number, default: 0 },
      formatting: { type: Number, default: 0 },
      contactInformation: { type: Number, default: 0 },
    },
    matchedKeywords: [{ type: String }],
    missingKeywords: [{ type: String }],
    matchedSkills: [{ type: String }],
    missingSkills: [{ type: String }],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    recommendations: [
      {
        priority: { type: String, enum: ["HIGH", "MEDIUM", "LOW"], default: "MEDIUM" },
        category: { type: String, default: "General" },
        suggestion: { type: String, required: true },
        reason: { type: String, default: "" },
      },
    ],
    sectionFeedback: {
      summary: { type: String, default: "" },
      skills: { type: String, default: "" },
      experience: { type: String, default: "" },
      projects: { type: String, default: "" },
      education: { type: String, default: "" },
    },
    formattingAnalysis: {
      riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "LOW" },
      issues: [{ type: String }],
    },
    analysisVersion: {
      type: String,
      default: "1.0",
    },
  },
  {
    timestamps: true,
  }
);

ResumeAnalysisSchema.index({ userId: 1, createdAt: -1 });

export const ResumeAnalysis = mongoose.model<IResumeAnalysis>(
  "ResumeAnalysis",
  ResumeAnalysisSchema
);
