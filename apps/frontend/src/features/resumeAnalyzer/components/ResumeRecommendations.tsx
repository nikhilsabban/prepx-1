import React from "react";
import { useResumeStore } from "../state/useResumeStore";
import { Lightbulb, ShieldAlert, ArrowUpRight } from "lucide-react";

export function ResumeRecommendations() {
  const { result } = useResumeStore();
  if (!result) return null;

  const recs = result.recommendations || [];
  const strengths = result.strengths || [];
  const weaknesses = result.weaknesses || [];

  return (
    <div className="space-y-6">
      {/* Priority Recommendations */}
      <div className="p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Lightbulb className="size-4 text-amber-400" /> Prioritized Actionable Recommendations
          </h3>
        </div>

        {recs.length > 0 ? (
          <div className="space-y-3">
            {recs.map((r, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      r.priority === "HIGH"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : r.priority === "MEDIUM"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}
                  >
                    {r.priority} Priority
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">{r.category}</span>
                </div>
                <h4 className="text-xs font-bold text-white flex items-start gap-1.5">
                  <ArrowUpRight className="size-3.5 text-blue-400 shrink-0 mt-0.5" />
                  {r.suggestion}
                </h4>
                {r.reason && <p className="text-[11px] text-zinc-400 pl-5">{r.reason}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400">Your resume is well structured! Follow general ATS formatting practices.</p>
        )}
      </div>

      {/* Strengths & Weaknesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800 space-y-3">
          <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400" /> Resume Strengths
          </h4>
          <ul className="space-y-2 text-xs text-zinc-300">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800 space-y-3">
          <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <ShieldAlert className="size-4 text-amber-400" /> Weaknesses & Areas to Improve
          </h4>
          <ul className="space-y-2 text-xs text-zinc-300">
            {weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
