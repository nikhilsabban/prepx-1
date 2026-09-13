import api from "../../../services/api";
import type {
  CodingProblem,
  SubmissionResponse,
  SubmissionRecord,
  UserCodingProgressData,
  LeaderboardItemData,
} from "../types/coding";

export async function fetchProblemsApi(params?: {
  page?: number;
  limit?: number;
  search?: string;
  difficulty?: string;
  topic?: string;
  company?: string;
}) {
  const response = await api.get("/api/coding/problems", { params });
  return response.data;
}

export async function fetchProblemBySlugApi(slug: string) {
  const response = await api.get(`/api/coding/problems/${slug}`);
  return response.data;
}

export async function runCodeApi(data: { problemId: string; language: string; sourceCode: string }) {
  const response = await api.post("/api/coding/submissions/run", data);
  return response.data;
}

export async function submitCodeApi(data: { problemId: string; language: string; sourceCode: string }) {
  const response = await api.post("/api/coding/submissions", data);
  return response.data;
}

export async function fetchMySubmissionsApi() {
  const response = await api.get("/api/coding/submissions/my");
  return response.data;
}

export async function fetchUserProgressApi() {
  const response = await api.get("/api/coding/progress");
  return response.data;
}

export async function fetchCodingLeaderboardApi() {
  const response = await api.get("/api/coding/leaderboard");
  return response.data;
}

export async function fetchRecommendationsApi() {
  const response = await api.get("/api/coding/recommendations");
  return response.data;
}

// AI APIs
export async function getAiHintApi(data: { problemId: string; code: string; language: string; hintLevel?: number }) {
  const response = await api.post("/api/coding/ai/hint", data);
  return response.data;
}

export async function debugCodeWithAiApi(data: { problemId: string; code: string; language: string; errorOutput: string }) {
  const response = await api.post("/api/coding/ai/debug", data);
  return response.data;
}

export async function explainSolutionWithAiApi(data: { problemId: string; code: string; language: string }) {
  const response = await api.post("/api/coding/ai/explain", data);
  return response.data;
}

export async function reviewCodeWithAiApi(data: { code: string; language: string }) {
  const response = await api.post("/api/coding/ai/review", data);
  return response.data;
}

export async function analyzeComplexityWithAiApi(data: { code: string; language: string }) {
  const response = await api.post("/api/coding/ai/complexity", data);
  return response.data;
}
