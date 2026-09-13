import api from "./api";

export interface InterviewRecord {
  _id: string;
  title?: string;
  mode?: "github" | "role" | "jd";
  role?: string;
  jobDescription?: string;
  difficulty?: "Basic" | "Easy" | "Medium" | "Difficult";
  githubMetadata: any;
  status: "Pre" | "InProgress" | "Done";
  score: number;
  isBookmarked?: boolean;
  feedback?: string;
  createdAt: string;
}

export interface ResultResponse {
  score: number;
  feedback: string;
  transcript: { type: "Assistant" | "User"; content: string; createdAt: string }[];
  status: "Pre" | "InProgress" | "Done";
  evaluationData?: {
    overallScore: number;
    overallFeedback: string;
    improvementAreas: string[];
    ratings: {
      speaking: number;
      grammar: number;
      technicalKnowledge: number;
    };
    speechMetrics?: {
      speechClarity: string;
      fillerWords: number;
      mumbling: string;
      speakingPace: string;
    };
    perQuestionAnalysis: {
      question: string;
      answer: string;
      score: number;
      feedback: string;
      idealAnswerSuggestion?: string;
      mainConcept?: string;
    }[];
  };
}

export interface VoiceResponse {
  aiMessage: string;
  audioBase64?: string | null;
  contentType?: string;
}

export async function startInterview(params: {
  github?: string;
  difficulty?: string;
  title: string;
  mode?: "github" | "role" | "jd";
  role?: string;
  jobDescription?: string;
}): Promise<{ id: string }> {
  const response = await api.post<{ id: string }>("/api/v1/pre-interview", params);
  return response.data;
}

export async function fetchDeepgramKey(): Promise<{ key: string }> {
  const response = await api.get<{ key: string }>("/api/v1/deepgram-key");
  return response.data;
}

export async function initiateInterviewSession(interviewId: string): Promise<VoiceResponse> {
  const response = await api.post<VoiceResponse>(`/api/v1/interview/initiate/${interviewId}`);
  return response.data;
}

export async function sendUserSpeechAndGetResponse(
  interviewId: string,
  message: string
): Promise<VoiceResponse> {
  const response = await api.post<VoiceResponse>(`/api/v1/interview/respond/${interviewId}`, {
    message,
  });
  return response.data;
}

export async function fetchInterviewResult(interviewId: string): Promise<ResultResponse> {
  const response = await api.get<ResultResponse>(`/api/v1/result/${interviewId}`);
  return response.data;
}

export async function fetchMyInterviews(): Promise<{ success: boolean; interviews: InterviewRecord[] }> {
  const response = await api.get<{ success: boolean; interviews: InterviewRecord[] }>("/api/v1/my-interviews");
  return response.data;
}

export async function toggleBookmarkApi(interviewId: string): Promise<{ success: boolean; isBookmarked: boolean; message: string }> {
  const response = await api.post<{ success: boolean; isBookmarked: boolean; message: string }>(`/api/v1/bookmark/${interviewId}`);
  return response.data;
}

export async function fetchBookmarksApi(): Promise<{ success: boolean; bookmarks: InterviewRecord[] }> {
  const response = await api.get<{ success: boolean; bookmarks: InterviewRecord[] }>("/api/v1/bookmarks");
  return response.data;
}

export async function correctTranscript(text: string): Promise<string> {
  try {
    const response = await api.post<{ corrected: string }>("/api/v1/correct-transcript", { text });
    return response.data.corrected || text;
  } catch {
    return text;
  }
}
