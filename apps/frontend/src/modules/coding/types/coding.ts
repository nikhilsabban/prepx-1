export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface StarterCode {
  javascript?: string;
  typescript?: string;
  python?: string;
  java?: string;
  cpp?: string;
  csharp?: string;
}

export interface CodingProblem {
  _id: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string[];
  examples: ProblemExample[];
  starterCode?: StarterCode;
  supportedLanguages?: string[];
  topics: string[];
  companies: string[];
  points: number;
  timeLimit?: number;
  memoryLimit?: number;
  acceptanceRate?: number;
  isSolved?: boolean;
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
  isHidden: boolean;
  executionTime?: number;
}

export interface SubmissionResponse {
  submissionId?: string;
  status: "Accepted" | "Wrong Answer" | "Compilation Error" | "Runtime Error" | "Time Limit Exceeded" | "Memory Limit Exceeded" | "Internal Error";
  score: number;
  passedTests: number;
  totalTests: number;
  executionTime: number;
  memoryUsed: number;
  errorMessage?: string;
  testResults: TestResult[];
  gamification?: {
    xpGained: number;
    newLevel: number;
    streak: number;
    badgesUnlocked: string[];
  };
}

export interface SubmissionRecord {
  _id: string;
  problemId: {
    _id: string;
    title: string;
    slug: string;
    difficulty: "Easy" | "Medium" | "Hard";
  };
  language: string;
  status: string;
  score: number;
  executionTime: number;
  submittedAt: string;
  sourceCode: string;
}

export interface UserCodingProgressData {
  totalProblems: number;
  solvedCount: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalXP: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
  placementCodingScore: number;
}

export interface LeaderboardItemData {
  rank: number;
  id: string;
  fullName: string;
  username?: string;
  profilePicture?: string;
  college?: string;
  totalXP: number;
  currentLevel: number;
  solvedCount: number;
  streak: number;
}
