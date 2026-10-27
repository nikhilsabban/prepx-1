import React from "react";
import { useResumeStore, getAtsScoreRating } from "../state/useResumeStore";
import { Zap } from "lucide-react";

export function ATSScoreCard() {
  const { result } = useResumeStore();
  const atsScore = result ? result.atsScore : 0;
  const rating = getAtsScoreRating(atsScore);

  return (
    <div className="p-6 rounded-3xl bg-[#0C0C12] border border-zinc-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-6">
        {/* Score Gauge Circle */}
        <div className="relative size-28 flex items-center justify-center rounded-full bg-zinc-900 border-4 border-zinc-800 shadow-inner shrink-0">
          <svg className="size-full rotate-[-90deg]" viewBox="0 0 36 36">
            <path
              className="text-zinc-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-blue-500 transition-all duration-1000 ease-out"
              strokeDasharray={`${atsScore}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white tracking-tight">{atsScore}</span>
            <span className="text-[9px] text-zinc-400 font-bold uppercase">out of 100</span>
          </div>
        </div>

        <div className="space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-bold text-white">Overall ATS Score</h2>
            <span className={`text-xs px-2.5 py-0.5 rounded-md border font-semibold ${rating.color}`}>
              {rating.label}
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
            Calculated across 7 weighted categories combining deterministic syntax checks and AI semantic match evaluation.
          </p>
        </div>
      </div>

      {result?.jobMatchScore !== undefined && (
        <div className="px-6 py-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-center shrink-0 w-full sm:w-auto">
          <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider flex items-center justify-center gap-1">
            <Zap className="size-3" /> Job Alignment Match
          </div>
          <div className="text-3xl font-extrabold text-white mt-1">{result.jobMatchScore}%</div>
          <p className="text-[10px] text-zinc-400 mt-0.5">Role relevance fit</p>
        </div>
      )}
    </div>
  );
}
