import { selector } from "recoil";
import {
  resumeFileState,
  resumeAnalysisResultState,
  jobDescriptionState,
} from "./resumeAtoms";

export const atsScoreSelector = selector<number>({
  key: "atsScoreSelector",
  get: ({ get }) => {
    const result = get(resumeAnalysisResultState);
    return result ? result.atsScore : 0;
  },
});

export const atsScoreRatingSelector = selector<{ label: string; color: string }>({
  key: "atsScoreRatingSelector",
  get: ({ get }) => {
    const score = get(atsScoreSelector);
    if (score >= 90) return { label: "Excellent", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" };
    if (score >= 75) return { label: "Good", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" };
    if (score >= 60) return { label: "Average", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" };
    if (score >= 40) return { label: "Needs Improvement", color: "text-orange-400 border-orange-500/30 bg-orange-500/10" };
    return { label: "Poor", color: "text-red-400 border-red-500/30 bg-red-500/10" };
  },
});

export const resumeFileNameSelector = selector<string>({
  key: "resumeFileNameSelector",
  get: ({ get }) => {
    const file = get(resumeFileState);
    return file ? file.originalFileName : "No file uploaded";
  },
});
