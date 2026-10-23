import mongoose, { Document, Schema } from 'mongoose';

export interface IExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface ITestCase {
  input: string;
  expected: string;
  hidden?: boolean;
}

export interface IStarterCode {
  python?: string;
  cpp?: string;
  java?: string;
  javascript?: string;
  c?: string;
}

export interface ICodeWrapper {
  python?: string;
  cpp?: string;
  java?: string;
  javascript?: string;
  c?: string;
}

export interface ICodingProblem extends Document {
  number: number;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  examples: IExample[];
  constraints: string[];
  testCases: ITestCase[];
  starter: IStarterCode;
  codeWrapper?: ICodeWrapper;
  hints: string[];
  tags: string[];
  companies: string[];
  acceptance: number;
  likes: number;
  points: number;
  premium: boolean;
  hidden: boolean;
  aiContext?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExampleSchema = new Schema<IExample>({
  input:       { type: String, default: '' },
  output:      { type: String, default: '' },
  explanation: { type: String, default: '' },
}, { _id: false });

const TestCaseSchema = new Schema<ITestCase>({
  input:    { type: String, default: '' },
  expected: { type: String, default: '' },
  hidden:   { type: Boolean, default: false },
}, { _id: false });

const StarterCodeSchema = new Schema<IStarterCode>({
  python:     { type: String, default: 'class Solution:\n    def solve(self):\n        pass' },
  cpp:        { type: String, default: 'class Solution {\npublic:\n    void solve() {}\n};' },
  java:       { type: String, default: 'class Solution {\n    public void solve() {}\n}' },
  javascript: { type: String, default: 'var solve = function() {};' },
  c:          { type: String, default: 'void solve() {\n    // your code here\n}' },
}, { _id: false });

const CodeWrapperSchema = new Schema<ICodeWrapper>({
  python:     { type: String, default: '' },
  cpp:        { type: String, default: '' },
  java:       { type: String, default: '' },
  javascript: { type: String, default: '' },
  c:          { type: String, default: '' },
}, { _id: false });

const CodingProblemSchema = new Schema<ICodingProblem>({
  number:      { type: Number, required: true, unique: true },
  title:       { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true },
  difficulty:  { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  description: { type: String, required: true },
  examples:    { type: [ExampleSchema], required: true },
  constraints: { type: [String], default: [] },
  testCases:   { type: [TestCaseSchema], default: [] },
  starter:     { type: StarterCodeSchema, default: () => ({}) },
  codeWrapper: { type: CodeWrapperSchema, default: () => ({}) },
  hints:       { type: [String], default: [] },
  tags:        { type: [String], default: [] },
  companies:   { type: [String], default: [] },
  acceptance:  { type: Number, default: 50.0, min: 0, max: 100 },
  likes:       { type: Number, default: 0 },
  points:      { type: Number, default: 100 },
  premium:     { type: Boolean, default: false },
  hidden:      { type: Boolean, default: false },
  aiContext:   { type: String, default: '' },
  createdBy:   { type: String, default: 'admin' },
}, {
  timestamps: true,
  autoIndex: false,
});

CodingProblemSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  if (this.isModified('difficulty')) {
    this.points = this.difficulty === 'Easy' ? 100 : this.difficulty === 'Medium' ? 200 : 400;
  }
  if (!this.aiContext) {
    this.aiContext = `${this.title} — ${(this.tags || []).join(', ')} — ${this.difficulty}`;
  }
  next();
});

// Explicit indexes for high-concurrency problem browsing and solving
CodingProblemSchema.index({ slug: 1 });
CodingProblemSchema.index({ hidden: 1, difficulty: 1, number: 1 });
CodingProblemSchema.index({ number: 1 });

export const CodingProblem = mongoose.model<ICodingProblem>('CodingProblem', CodingProblemSchema);
