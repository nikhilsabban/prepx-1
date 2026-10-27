import mongoose, { Document, Schema } from "mongoose";

export interface IJobDescription extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  company?: string;
  description: string;
  extractedRequirements?: {
    requiredSkills?: string[];
    preferredSkills?: string[];
    technicalSkills?: string[];
    softSkills?: string[];
    experienceRequirements?: string;
    educationRequirements?: string;
    keywords?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const JobDescriptionSchema = new Schema<IJobDescription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "Target Job Description",
    },
    company: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      required: true,
    },
    extractedRequirements: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

JobDescriptionSchema.index({ userId: 1, createdAt: -1 });

export const JobDescription = mongoose.model<IJobDescription>(
  "JobDescription",
  JobDescriptionSchema
);
