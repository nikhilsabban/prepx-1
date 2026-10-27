import React from "react";
import { useResumeStore } from "../state/useResumeStore";
import { Layout, CheckCircle2, AlertTriangle } from "lucide-react";

export function FormattingAnalysis() {
  const { result } = useResumeStore();
  if (!result) return null;

  const formatting = result.formattingAnalysis || { riskLevel: "LOW", issues: [] };
  const isHighRisk = formatting.riskLevel === "HIGH";
  const isMedRisk = formatting.riskLevel === "MEDIUM";

  return (
    <div className="p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Layout className="size-4 text-blue-400" /> ATS Formatting Risk Analysis
        </h3>
        <span
          className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase border ${
            isHighRisk
              ? "bg-red-500/10 text-red-400 border-red-500/30"
              : isMedRisk
              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          }`}
        >
          {formatting.riskLevel} Risk
        </span>
      </div>

      {formatting.issues && formatting.issues.length > 0 ? (
        <div className="space-y-2">
          {formatting.issues.map((issue, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-2.5">
              <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-300">{issue}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2.5">
          <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300">
            No severe formatting issues detected. Your document layout is clean and readable by standard ATS parsers.
          </p>
        </div>
      )}
    </div>
  );
}
