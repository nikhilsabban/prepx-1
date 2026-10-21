import axios from "axios";
import { BACKEND_URL } from "../lib/config";

const API_BASE_URL = `${BACKEND_URL}/api/v1`;

export interface Problem {
  _id: string;
  number: number;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  testCases?: Array<{ input: string; expected: string; hidden?: boolean }>;
  starter?: Record<string, string>;
  hints?: string[];
  tags: string[];
  companies?: string[];
  acceptance: number;
  likes: number;
  points: number;
}

export interface Submission {
  _id: string;
  user: string;
  problem: { _id: string; title: string; number: number; slug: string; difficulty: string } | string;
  language: string;
  code: string;
  verdict: "Accepted" | "Wrong Answer" | "Runtime Error" | "Time Limit Exceeded" | "Compilation Error" | "Error";
  runtime: string;
  testsPassed: number;
  testsTotal: number;
  createdAt: string;
}

export interface LeaderboardUser {
  rank: number;
  _id: string;
  fullName: string;
  username: string;
  profilePicture?: string;
  rating: number;
  ratingTitle: string;
  solvedCount: number;
  college: string;
}

const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const codingApi = {
  getProblems: async (params?: { difficulty?: string; tag?: string; search?: string }) => {
    const res = await axios.get(`${API_BASE_URL}/coding/problems`, {
      params,
      headers: getAuthHeader(),
    });
    return res.data;
  },

  getProblemBySlug: async (slug: string) => {
    const res = await axios.get(`${API_BASE_URL}/coding/problems/${slug}`, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  getTags: async () => {
    const res = await axios.get(`${API_BASE_URL}/coding/problems/tags`, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  runCode: async (payload: { code: string; language: string; problemId?: string; stdin?: string }) => {
    const res = await axios.post(`${API_BASE_URL}/coding/run`, payload, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  submitCode: async (payload: { code: string; language: string; problemId: string }) => {
    const res = await axios.post(`${API_BASE_URL}/coding/submit`, payload, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  getUserSubmissions: async (problemId?: string) => {
    const res = await axios.get(`${API_BASE_URL}/coding/submissions`, {
      params: { problemId },
      headers: getAuthHeader(),
    });
    return res.data;
  },

  getLeaderboard: async () => {
    const res = await axios.get(`${API_BASE_URL}/coding/leaderboard`, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  getAIHint: async (payload: { message: string; problemContext: string; history?: any[] }) => {
    const res = await axios.post(`${API_BASE_URL}/coding/ai/hint`, payload, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  analyzeCodeWithAI: async (payload: { code: string; language?: string; problemContext: string }) => {
    const res = await axios.post(`${API_BASE_URL}/coding/ai/analyze`, payload, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  toggleBookmark: async (problemId: string) => {
    const res = await axios.post(`${API_BASE_URL}/coding/bookmarks/${problemId}`, {}, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  getUserBookmarks: async () => {
    const res = await axios.get(`${API_BASE_URL}/coding/bookmarks`, {
      headers: getAuthHeader(),
    });
    return res.data;
  },
};
