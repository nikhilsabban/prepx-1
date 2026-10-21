import mongoose, { Document, Schema } from "mongoose";

export interface IResume extends Document {
  userId: mongoose.Types.ObjectId;
  originalFileName: string;
  storageUrl?: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  structuredData?: {
    personal?: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
      linkedin?: string;
      github?: string;
      portfolio?: string;
    };
    summary?: string;
    skills?: string[];
    education?: Array<{
      institution?: string;
      degree?: string;
      fieldOfStudy?: string;
      year?: string;
    }>;
    experience?: Array<{
      company?: string;
      role?: string;
      duration?: string;
      bulletPoints?: string[];
    }>;
    projects?: Array<{
      title?: string;
      technologies?: string[];
      description?: string;
    }>;
    certifications?: string[];
    achievements?: string[];
    languages?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema = new Schema<IResume>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    storageUrl: {
      type: String,
      default: "",
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    extractedText: {
      type: String,
      required: true,
    },
    structuredData: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

ResumeSchema.index({ userId: 1, createdAt: -1 });

export const Resume = mongoose.model<IResume>("Resume", ResumeSchema);
