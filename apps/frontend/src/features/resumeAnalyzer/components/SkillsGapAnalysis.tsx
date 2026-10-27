import React from "react";
import { useResumeStore } from "../state/useResumeStore";
import { Cpu, CheckCircle2, AlertTriangle } from "lucide-react";

export function SkillsGapAnalysis() {
  const { result, jobDescription } = useResumeStore();
  if (!result) return null;

  const hasJd = (jobDescription.text && jobDescription.text.trim().length > 0) || !!result.jobDescription;
  const matchedSkills = result.matchedSkills || [];
  const missingSkills = result.missingSkills || [];

  return (
    <div className="p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Cpu className="size-4 text-purple-400" /> {hasJd ? "Target Role Skills Gap Analysis" : "Extracted Technical Skills & Breadth"}
        </h3>
        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">
          {hasJd ? "Role Alignment" : "General Audit"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
          <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" /> {hasJd ? `Matched Role Skills (${matchedSkills.length})` : `Extracted Skills (${matchedSkills.length})`}
          </h4>
          {matchedSkills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {matchedSkills.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No skills detected.</p>
          )}
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
          <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="size-3.5" /> {hasJd ? `Missing Role Skills Gap (${missingSkills.length})` : "Job Specific Gap"}
          </h4>
          {hasJd ? (
            missingSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {missingSkills.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-400 font-medium">No critical skills gap detected for this job posting!</p>
            )
          ) : (
            <p className="text-xs text-zinc-400 italic pt-1">
              Include a target Job Description to highlight critical technical skills missing for your desired position.
            </p>
          )}
          {hasJd && (
            <p className="text-[10px] text-zinc-400 mt-2 italic">
              * Note: Consider adding missing skills only if you have truthful hands-on experience.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
