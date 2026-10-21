import mongoose, { Document, Schema } from 'mongoose';

export interface ICodingSubmission extends Document {
  user: mongoose.Types.ObjectId;
  problem: mongoose.Types.ObjectId;
  language: 'cpp' | 'python' | 'java' | 'c' | 'javascript';
  code: string;
  verdict: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded' | 'Compilation Error' | 'Error';
  runtime: string;
  memory: string;
  testsPassed: number;
  testsTotal: number;
  output: string;
  stderr: string;
  createdAt: Date;
  updatedAt: Date;
}

const CodingSubmissionSchema = new Schema<ICodingSubmission>({
  user:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  problem:     { type: Schema.Types.ObjectId, ref: 'CodingProblem', required: true },
  language:    { type: String, enum: ['cpp', 'python', 'java', 'c', 'javascript'], required: true },
  code:        { type: String, required: true },
  verdict:     { type: String, enum: ['Accepted', 'Wrong Answer', 'Runtime Error', 'Time Limit Exceeded', 'Compilation Error', 'Error'], required: true },
  runtime:     { type: String, default: 'N/A' },
  memory:      { type: String, default: 'N/A' },
  testsPassed: { type: Number, default: 0 },
  testsTotal:  { type: Number, default: 0 },
  output:      { type: String, default: '' },
  stderr:      { type: String, default: '' },
}, { timestamps: true });

export const CodingSubmission = mongoose.model<ICodingSubmission>('CodingSubmission', CodingSubmissionSchema);
