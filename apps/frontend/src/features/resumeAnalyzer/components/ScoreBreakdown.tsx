import React from "react";
import { useResumeStore } from "../state/useResumeStore";
import { BarChart3 } from "lucide-react";

export function ScoreBreakdown() {
  const { result } = useResumeStore();
  if (!result || !result.scoreBreakdown) return null;

  const breakdown = result.scoreBreakdown;

  const categories = [
    { name: "Keyword Match", score: breakdown.keywordMatch, weight: "25%", desc: "Direct JD keyword alignment" },
    { name: "Job Alignment", score: breakdown.jobAlignment, weight: "20%", desc: "Role requirement relevance" },
    { name: "Skills Match", score: breakdown.skillsMatch, weight: "20%", desc: "Required & technical skills" },
    { name: "Experience Relevance", score: breakdown.experienceRelevance, weight: "15%", desc: "Depth & bullet point impact" },
    { name: "Structure & Sections", score: breakdown.structure, weight: "10%", desc: "Standard section headings" },
    { name: "Formatting Risk", score: breakdown.formatting, weight: "5%", desc: "ATS scanner readability" },
    { name: "Contact Information", score: breakdown.contactInformation, weight: "5%", desc: "Email, phone, LinkedIn presence" },
  ];

  return (
    <div className="p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <BarChart3 className="size-4 text-blue-400" /> Transparent Score Breakdown
        </h3>
        <span className="text-[10px] text-zinc-400 font-mono">Total = 100%</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div key={cat.name} className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-white">{cat.name} <span className="text-[10px] text-zinc-500 font-mono">({cat.weight})</span></span>
              <span className={`font-bold font-mono ${cat.score >= 75 ? "text-emerald-400" : cat.score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                {cat.score}%
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  cat.score >= 75 ? "bg-emerald-500" : cat.score >= 50 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${cat.score}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-400">{cat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
