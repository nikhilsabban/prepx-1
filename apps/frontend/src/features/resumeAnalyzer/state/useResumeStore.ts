import { create } from "zustand";

export interface ResumeFileMetadata {
  resumeId: string;
  originalFileName: string;
  fileSize: number;
  fileUrl?: string;
  extractedText?: string;
  structuredData?: any;
}

export interface JobDescriptionState {
  title: string;
  company: string;
  text: string;
}

export interface ResumeAnalysisResult {
  analysisId: string;
  atsScore: number;
  jobMatchScore: number;
  scoreBreakdown: {
    keywordMatch: number;
    jobAlignment: number;
    skillsMatch: number;
    experienceRelevance: number;
    structure: number;
    formatting: number;
    contactInformation: number;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: Array<{
    priority: "HIGH" | "MEDIUM" | "LOW";
    category: string;
    suggestion: string;
    reason: string;
  }>;
  sectionFeedback: {
    summary?: string;
    skills?: string;
    experience?: string;
    projects?: string;
    education?: string;
  };
  formattingAnalysis: {
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    issues: string[];
  };
  resume?: {
    id: string;
    fileName: string;
    structuredData?: any;
  };
  jobDescription?: {
    id: string;
    title: string;
    company?: string;
  };
  createdAt?: string;
}

interface ResumeStore {
  resumeFile: ResumeFileMetadata | null;
  uploadStatus: "idle" | "uploading" | "parsed" | "error";
  jobDescription: JobDescriptionState;
  loading: boolean;
  result: ResumeAnalysisResult | null;
  history: ResumeAnalysisResult[];
  error: string | null;

  setResumeFile: (file: ResumeFileMetadata | null) => void;
  setUploadStatus: (status: "idle" | "uploading" | "parsed" | "error") => void;
  setJobDescription: (jd: JobDescriptionState) => void;
  setLoading: (loading: boolean) => void;
  setResult: (result: ResumeAnalysisResult | null) => void;
  setHistory: (history: ResumeAnalysisResult[]) => void;
  setError: (error: string | null) => void;
}

export const useResumeStore = create<ResumeStore>((set) => ({
  resumeFile: null,
  uploadStatus: "idle",
  jobDescription: { title: "", company: "", text: "" },
  loading: false,
  result: null,
  history: [],
  error: null,

  setResumeFile: (resumeFile) => set({ resumeFile }),
  setUploadStatus: (uploadStatus) => set({ uploadStatus }),
  setJobDescription: (jobDescription) => set({ jobDescription }),
  setLoading: (loading) => set({ loading }),
  setResult: (result) => set({ result }),
  setHistory: (history) => set({ history }),
  setError: (error) => set({ error }),
}));

export const getAtsScoreRating = (atsScore: number) => {
  if (atsScore >= 90) return { label: "Excellent", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" };
  if (atsScore >= 75) return { label: "Good", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" };
  if (atsScore >= 60) return { label: "Average", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" };
  if (atsScore >= 40) return { label: "Needs Improvement", color: "text-orange-400 border-orange-500/30 bg-orange-500/10" };
  return { label: "Poor", color: "text-red-400 border-red-500/30 bg-red-500/10" };
};
