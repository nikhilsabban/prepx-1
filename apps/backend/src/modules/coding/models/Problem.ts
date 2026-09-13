import mongoose, { Document, Schema } from "mongoose";

export interface IExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface IStarterCode {
  javascript?: string;
  typescript?: string;
  python?: string;
  java?: string;
  cpp?: string;
  csharp?: string;
}

export interface IProblem extends Document {
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: IExample[];
  starterCode: IStarterCode;
  supportedLanguages: string[];
  topics: string[];
  tags: string[];
  companies: string[];
  points: number;
  timeLimit: number; // in milliseconds
  memoryLimit: number; // in MB
  acceptanceRate: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  isPublished: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProblemSchema = new Schema<IProblem>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true, index: true },
    description: { type: String, required: true },
    inputFormat: { type: String, default: "" },
    outputFormat: { type: String, default: "" },
    constraints: { type: [String], default: [] },
    examples: [
      {
        input: { type: String, required: true },
        output: { type: String, required: true },
        explanation: { type: String, default: "" },
      },
    ],
    starterCode: {
      javascript: { type: String, default: "" },
      typescript: { type: String, default: "" },
      python: { type: String, default: "" },
      java: { type: String, default: "" },
      cpp: { type: String, default: "" },
      csharp: { type: String, default: "" },
    },
    supportedLanguages: {
      type: [String],
      default: ["javascript", "python", "java", "cpp", "csharp"],
    },
    topics: { type: [String], default: [], index: true },
    tags: { type: [String], default: [] },
    companies: { type: [String], default: [], index: true },
    points: { type: Number, default: 10 },
    timeLimit: { type: Number, default: 2000 },
    memoryLimit: { type: Number, default: 256 },
    acceptanceRate: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    acceptedSubmissions: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ProblemSchema.index({ title: "text", description: "text" });

export const Problem = mongoose.model<IProblem>("Problem", ProblemSchema);
