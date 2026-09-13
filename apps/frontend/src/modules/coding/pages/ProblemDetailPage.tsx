import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Play, Send, Sparkles, CheckCircle2, XCircle, RotateCcw, Copy, Maximize2, RefreshCw } from "lucide-react";
import { fetchProblemBySlugApi, runCodeApi, submitCodeApi } from "../services/codingApi";
import type { CodingProblem, SubmissionResponse } from "../types/coding";
import { MonacoCodeEditor } from "../components/MonacoCodeEditor";
import { AICodingAssistant } from "../components/AICodingAssistant";
import { Button } from "../../../components/ui/button";
import { toast } from "sonner";

export function ProblemDetailPage() {
  const { slug } = useParams();
  const [problem, setProblem] = useState<CodingProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [activeBottomTab, setActiveBottomTab] = useState<"testcase" | "result" | "ai">("testcase");

  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<SubmissionResponse | null>(null);

  useEffect(() => {
    async function loadProblem() {
      if (!slug) return;
      try {
        const res = await fetchProblemBySlugApi(slug);
        if (res.success) {
          setProblem(res.data.problem);
          const defaultCode = res.data.problem.starterCode?.javascript || `function ${slug.replace(/-/g, "_")}(input) {\n  return input;\n}`;
          setCode(defaultCode);
        }
      } catch (err) {
        console.error("Failed to load problem details", err);
      } finally {
        setLoading(false);
      }
    }
    loadProblem();
  }, [slug]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (problem?.starterCode) {
      const codeForLang = (problem.starterCode as any)[lang];
      if (codeForLang) setCode(codeForLang);
    }
  };

  const handleRunCode = async () => {
    if (!problem) return;
    setExecuting(true);
    setActiveBottomTab("result");
    try {
      const res = await runCodeApi({ problemId: problem._id, language, sourceCode: code });
      if (res.success) {
        setExecutionResult(res.data);
        if (res.data.status === "Passed") toast.success("All sample test cases passed!");
        else toast.error("Sample test cases failed.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to run code.");
    } finally {
      setExecuting(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!problem) return;
    setExecuting(true);
    setActiveBottomTab("result");
    try {
      const res = await submitCodeApi({ problemId: problem._id, language, sourceCode: code });
      if (res.success) {
        setExecutionResult(res.data);
        if (res.data.status === "Accepted") {
          toast.success(`🎉 Accepted! Earned +${res.data.gamification?.xpGained || 10} XP!`);
        } else {
          toast.error(`Submission status: ${res.data.status}`);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit code.");
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center">
        <RefreshCw className="size-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center">
        <p>Problem not found.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-[#050507] text-white flex flex-col overflow-hidden">
      {/* Top Split Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Description */}
        <div className="lg:col-span-5 bg-[#0D0D14] border-r border-zinc-800 flex flex-col h-full overflow-y-auto p-6 space-y-6 text-xs">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                problem.difficulty === "Easy" ? "bg-emerald-500/20 text-emerald-400" : problem.difficulty === "Medium" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"
              }`}>
                {problem.difficulty}
              </span>
              <span className="text-zinc-400">• {problem.points} XP</span>
            </div>
            <h1 className="text-xl font-black text-white">{problem.title}</h1>
          </div>

          {/* Description */}
          <div className="space-y-2 leading-relaxed text-zinc-300">
            <h3 className="font-bold text-white uppercase tracking-wider text-[11px]">Problem Statement</h3>
            <p className="whitespace-pre-wrap">{problem.description}</p>
          </div>

          {/* Examples */}
          <div className="space-y-3">
            <h3 className="font-bold text-white uppercase tracking-wider text-[11px]">Examples</h3>
            {problem.examples.map((ex, idx) => (
              <div key={idx} className="p-3 bg-[#0A0A0E] border border-zinc-800 rounded-xl space-y-1 font-mono">
                <div><span className="text-zinc-500">Input:</span> {ex.input}</div>
                <div><span className="text-zinc-500">Output:</span> {ex.output}</div>
                {ex.explanation && <div className="text-zinc-400 text-[11px]"><span className="text-zinc-500">Explanation:</span> {ex.explanation}</div>}
              </div>
            ))}
          </div>

          {/* Constraints */}
          {problem.constraints && problem.constraints.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-white uppercase tracking-wider text-[11px]">Constraints</h3>
              <ul className="list-disc list-inside text-zinc-400 font-mono space-y-1">
                {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Editor & Console */}
        <div className="lg:col-span-7 flex flex-col h-full bg-[#050507]">
          {/* Toolbar */}
          <div className="h-12 bg-[#0A0A0E] border-b border-zinc-800 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-[#12121D] border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="javascript">JavaScript (Node)</option>
                <option value="python">Python 3</option>
                <option value="java">Java 17</option>
                <option value="cpp">C++ 17</option>
                <option value="csharp">C# (.NET)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleRunCode}
                disabled={executing}
                className="h-8 px-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="size-3.5 fill-white" /> Run Code
              </Button>
              <Button
                onClick={handleSubmitCode}
                disabled={executing}
                className="h-8 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="size-3.5" /> Submit
              </Button>
            </div>
          </div>

          {/* Monaco Editor Workspace */}
          <div className="flex-1 relative">
            <MonacoCodeEditor language={language} value={code} onChange={setCode} />
          </div>

          {/* Bottom Panel Console */}
          <div className="h-56 bg-[#0D0D14] border-t border-zinc-800 flex flex-col text-xs">
            <div className="flex items-center gap-2 bg-[#0A0A0E] border-b border-zinc-800 px-4 py-2">
              <button
                onClick={() => setActiveBottomTab("testcase")}
                className={`px-3 py-1 rounded font-semibold ${activeBottomTab === "testcase" ? "bg-zinc-800 text-white" : "text-zinc-400"}`}
              >
                Test Cases
              </button>
              <button
                onClick={() => setActiveBottomTab("result")}
                className={`px-3 py-1 rounded font-semibold ${activeBottomTab === "result" ? "bg-zinc-800 text-white" : "text-zinc-400"}`}
              >
                Execution Result
              </button>
              <button
                onClick={() => setActiveBottomTab("ai")}
                className={`px-3 py-1 rounded font-semibold flex items-center gap-1 ${activeBottomTab === "ai" ? "bg-purple-600/20 text-purple-400" : "text-zinc-400"}`}
              >
                <Sparkles className="size-3 text-purple-400" /> AI Assistant
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto font-mono text-zinc-300">
              {activeBottomTab === "testcase" && (
                <div className="space-y-2">
                  <span className="text-zinc-500">Sample Test Input:</span>
                  <div className="p-3 bg-[#0A0A0E] border border-zinc-800 rounded-lg">{problem.examples[0]?.input || "N/A"}</div>
                </div>
              )}

              {activeBottomTab === "result" && (
                <div>
                  {executing ? (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <RefreshCw className="size-4 animate-spin text-purple-400" /> Running code in sandboxed container...
                    </div>
                  ) : executionResult ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className={`font-bold flex items-center gap-1 text-sm ${executionResult.status === "Passed" || executionResult.status === "Accepted" ? "text-emerald-400" : "text-rose-400"}`}>
                          {executionResult.status === "Passed" || executionResult.status === "Accepted" ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                          {executionResult.status}
                        </span>
                        <span className="text-zinc-500">• {executionResult.executionTime} ms</span>
                      </div>

                      {executionResult.errorMessage && (
                        <div className="p-3 bg-rose-950/20 border border-rose-800/40 text-rose-300 rounded-lg">
                          {executionResult.errorMessage}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-zinc-500">Click "Run Code" or "Submit" to see execution output.</span>
                  )}
                </div>
              )}

              {activeBottomTab === "ai" && (
                <AICodingAssistant problemId={problem._id} code={code} language={language} lastError={executionResult?.errorMessage} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
