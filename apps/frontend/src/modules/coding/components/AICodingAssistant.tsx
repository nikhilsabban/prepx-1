import React, { useState } from "react";
import { Sparkles, Bug, FileText, Code2, Cpu, RefreshCw } from "lucide-react";
import {
  getAiHintApi,
  debugCodeWithAiApi,
  explainSolutionWithAiApi,
  reviewCodeWithAiApi,
  analyzeComplexityWithAiApi,
} from "../services/codingApi";
import { toast } from "sonner";

interface AICodingAssistantProps {
  problemId: string;
  code: string;
  language: string;
  lastError?: string;
}

export function AICodingAssistant({ problemId, code, language, lastError }: AICodingAssistantProps) {
  const [activeTab, setActiveTab] = useState<"hint" | "debug" | "explain" | "review" | "complexity">("hint");
  const [loading, setLoading] = useState(false);
  const [hintLevel, setHintLevel] = useState(1);
  const [content, setContent] = useState<Record<string, string>>({});

  const handleFetchAi = async (tab: typeof activeTab) => {
    setActiveTab(tab);
    setLoading(true);
    try {
      if (tab === "hint") {
        const data = await getAiHintApi({ problemId, code, language, hintLevel });
        setContent((prev) => ({ ...prev, hint: data.data.hint }));
      } else if (tab === "debug") {
        const data = await debugCodeWithAiApi({ problemId, code, language, errorOutput: lastError || "Compilation or logic error" });
        setContent((prev) => ({ ...prev, debug: data.data.debugAnalysis }));
      } else if (tab === "explain") {
        const data = await explainSolutionWithAiApi({ problemId, code, language });
        setContent((prev) => ({ ...prev, explain: data.data.explanation }));
      } else if (tab === "review") {
        const data = await reviewCodeWithAiApi({ code, language });
        setContent((prev) => ({ ...prev, review: data.data.review }));
      } else if (tab === "complexity") {
        const data = await analyzeComplexityWithAiApi({ code, language });
        setContent((prev) => ({
          ...prev,
          complexity: `Time Complexity: ${data.data.timeComplexity}\nSpace Complexity: ${data.data.spaceComplexity}\n\n${data.data.explanation}`,
        }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch AI assistance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0D0D14] border border-zinc-800 rounded-xl overflow-hidden text-xs">
      {/* Tabs bar */}
      <div className="flex items-center gap-1 bg-[#0A0A0E] border-b border-zinc-800 p-2 overflow-x-auto">
        <button
          onClick={() => handleFetchAi("hint")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-semibold ${
            activeTab === "hint" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Sparkles className="size-3.5 text-blue-400" /> Hint
        </button>

        <button
          onClick={() => handleFetchAi("debug")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-semibold ${
            activeTab === "debug" ? "bg-amber-600/20 text-amber-400 border border-amber-500/30" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Bug className="size-3.5 text-amber-400" /> Debug
        </button>

        <button
          onClick={() => handleFetchAi("explain")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-semibold ${
            activeTab === "explain" ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" : "text-zinc-400 hover:text-white"
          }`}
        >
          <FileText className="size-3.5 text-emerald-400" /> Explain
        </button>

        <button
          onClick={() => handleFetchAi("review")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-semibold ${
            activeTab === "review" ? "bg-purple-600/20 text-purple-400 border border-purple-500/30" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Code2 className="size-3.5 text-purple-400" /> Review
        </button>

        <button
          onClick={() => handleFetchAi("complexity")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-semibold ${
            activeTab === "complexity" ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Cpu className="size-3.5 text-indigo-400" /> Complexity
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500">
            <RefreshCw className="size-5 animate-spin text-blue-400" />
            <span>Analyzing code with AI...</span>
          </div>
        ) : content[activeTab] ? (
          content[activeTab]
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500 text-center">
            <Sparkles className="size-6 text-zinc-600" />
            <span>Click any tab above to get AI hints, debugging tips, or solution analysis.</span>
          </div>
        )}
      </div>

      {/* Hint level toolbar if hint tab is active */}
      {activeTab === "hint" && (
        <div className="border-t border-zinc-800 p-2 bg-[#0A0A0E] flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">Hint Depth:</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setHintLevel(lvl);
                  handleFetchAi("hint");
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  hintLevel === lvl ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                Level {lvl}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
