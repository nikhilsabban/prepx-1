import mongoose, { Document, Schema } from "mongoose";

export interface ITestResult {
  testCaseId: string;
  passed: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
  isHidden: boolean;
  executionTime?: number;
}

export interface ISubmission extends Document {
  userId: mongoose.Types.ObjectId;
  problemId: mongoose.Types.ObjectId;
  language: string;
  sourceCode: string;
  status: "Accepted" | "Wrong Answer" | "Compilation Error" | "Runtime Error" | "Time Limit Exceeded" | "Memory Limit Exceeded" | "Internal Error";
  score: number;
  passedTests: number;
  totalTests: number;
  executionTime: number; // in ms
  memoryUsed: number; // in MB
  errorMessage?: string;
  testResults: ITestResult[];
  submittedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    problemId: { type: Schema.Types.ObjectId, ref: "Problem", required: true, index: true },
    language: { type: String, required: true },
    sourceCode: { type: String, required: true },
    status: {
      type: String,
      enum: ["Accepted", "Wrong Answer", "Compilation Error", "Runtime Error", "Time Limit Exceeded", "Memory Limit Exceeded", "Internal Error"],
      required: true,
      index: true,
    },
    score: { type: Number, default: 0 },
    passedTests: { type: Number, default: 0 },
    totalTests: { type: Number, default: 0 },
    executionTime: { type: Number, default: 0 },
    memoryUsed: { type: Number, default: 0 },
    errorMessage: { type: String, default: "" },
    testResults: [
      {
        testCaseId: String,
        passed: Boolean,
        input: String,
        expectedOutput: String,
        actualOutput: String,
        error: String,
        isHidden: Boolean,
        executionTime: Number,
      },
    ],
    submittedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

SubmissionSchema.index({ userId: 1, problemId: 1, submittedAt: -1 });

export const Submission = mongoose.model<ISubmission>("Submission", SubmissionSchema);
