import mongoose, { Document, Schema } from "mongoose";

export interface ITestCase extends Document {
  problemId: mongoose.Types.ObjectId;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
}

const TestCaseSchema = new Schema<ITestCase>(
  {
    problemId: { type: Schema.Types.ObjectId, ref: "Problem", required: true, index: true },
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false, index: true },
    weight: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const TestCase = mongoose.model<ITestCase>("TestCase", TestCaseSchema);
