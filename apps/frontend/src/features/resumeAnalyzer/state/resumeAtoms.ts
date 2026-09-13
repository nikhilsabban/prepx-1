import { atom } from "recoil";

export interface ResumeFileMetadata {
  resumeId: string;
  originalFileName: string;
  fileSize: number;
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

// 1. Resume Upload & File Metadata Atom
export const resumeFileState = atom<ResumeFileMetadata | null>({
  key: "resumeFileState",
  default: null,
});

// 2. Upload Progress / Status Atom
export const resumeUploadStatusState = atom<"idle" | "uploading" | "parsed" | "error">({
  key: "resumeUploadStatusState",
  default: "idle",
});

// 3. Job Description Input Atom
export const jobDescriptionState = atom<JobDescriptionState>({
  key: "jobDescriptionState",
  default: {
    title: "",
    company: "",
    text: "",
  },
});

// 4. Analysis Status Atom
export const resumeAnalysisLoadingState = atom<boolean>({
  key: "resumeAnalysisLoadingState",
  default: false,
});

// 5. Active Resume Analysis Result Atom
export const resumeAnalysisResultState = atom<ResumeAnalysisResult | null>({
  key: "resumeAnalysisResultState",
  default: null,
});

// 6. Analysis History List Atom
export const resumeHistoryState = atom<ResumeAnalysisResult[]>({
  key: "resumeHistoryState",
  default: [],
});

// 7. Error Message Atom
export const resumeErrorState = atom<string | null>({
  key: "resumeErrorState",
  default: null,
});
