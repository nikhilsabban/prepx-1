import React from "react";
import { useResumeStore } from "../state/useResumeStore";
import { Tag, CheckCircle2, XCircle } from "lucide-react";

export function KeywordAnalysis() {
  const { result, jobDescription } = useResumeStore();
  if (!result) return null;

  const hasJd = (jobDescription.text && jobDescription.text.trim().length > 0) || !!result.jobDescription;
  const matched = result.matchedKeywords || [];
  const missing = result.missingKeywords || [];

  return (
    <div className="p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Tag className="size-4 text-emerald-400" /> {hasJd ? "Target JD Keyword & Term Analysis" : "Extracted Resume Keywords"}
        </h3>
        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">
          {hasJd ? "Job Description Match" : "General Resume Audit"}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-400" /> {hasJd ? `Matched Target Keywords (${matched.length})` : `Detected Resume Keywords (${matched.length})`}
          </div>
          {matched.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {matched.map((kw) => (
                <span
                  key={kw}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                >
                  {kw}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No direct keywords detected.</p>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
            <XCircle className="size-3.5 text-red-400" /> {hasJd ? `Missing Target Keywords (${missing.length})` : "Job Specific Gap"}
          </div>
          {hasJd ? (
            missing.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {missing.map((kw) => (
                  <span
                    key={kw}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/20"
                  >
                    + {kw}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-400 font-medium">Great job! All key target keywords from the job description are covered.</p>
            )
          ) : (
            <p className="text-xs text-zinc-400 italic">
              Paste a target Job Description on the left panel to discover missing high-value ATS keywords for specific roles.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
