import React from "react";
import { useResumeStore } from "../features/resumeAnalyzer/state/useResumeStore";
import { analyzeResumeApi, fetchAnalysisHistoryApi } from "../features/resumeAnalyzer/services/resumeAnalysisApi";
import { ResumeUpload } from "../features/resumeAnalyzer/components/ResumeUpload";
import { JobDescriptionInput } from "../features/resumeAnalyzer/components/JobDescriptionInput";
import { ATSScoreCard } from "../features/resumeAnalyzer/components/ATSScoreCard";
import { ScoreBreakdown } from "../features/resumeAnalyzer/components/ScoreBreakdown";
import { KeywordAnalysis } from "../features/resumeAnalyzer/components/KeywordAnalysis";
import { SkillsGapAnalysis } from "../features/resumeAnalyzer/components/SkillsGapAnalysis";
import { ResumeRecommendations } from "../features/resumeAnalyzer/components/ResumeRecommendations";
import { FormattingAnalysis } from "../features/resumeAnalyzer/components/FormattingAnalysis";
import { AnalysisHistory } from "../features/resumeAnalyzer/components/AnalysisHistory";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";

export function ResumeAnalyzerPage() {
  const {
    resumeFile,
    jobDescription,
    loading,
    result,
    setResumeFile,
    setUploadStatus,
    setJobDescription,
    setLoading,
    setResult,
    setHistory,
  } = useResumeStore();

  const handleNewAnalysis = () => {
    setResumeFile(null);
    setUploadStatus("idle");
    setJobDescription({ title: "", company: "", text: "" });
    setResult(null);
    toast.info("Cleared previous session. Ready to upload a new resume!");
  };

  const handleRunAnalysis = async () => {
    if (!resumeFile) {
      toast.error("Please upload a resume file first.");
      return;
    }

    setLoading(true);
    try {
      const res = await analyzeResumeApi({
        resumeId: resumeFile.resumeId,
        jobDescriptionText: jobDescription.text,
        jobTitle: jobDescription.title,
        companyName: jobDescription.company,
      });

      if (res.success && res.data) {
        setResult(res.data);
        toast.success("Resume analyzed successfully!");

        // Refresh history list asynchronously
        fetchAnalysisHistoryApi(1, 5).then((h) => {
          if (h.success && h.data) setHistory(h.data);
        });
      }
    } catch (err: any) {
      console.error("Analysis execution error:", err);
      toast.error(err.response?.data?.message || "Failed to analyze resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 min-h-screen space-y-8">
      {/* Premium Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-zinc-800/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-12 -top-12 size-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 size-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              AI Resume & ATS Analyzer
            </h1>

            <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl font-normal">
              Evaluate your resume against target job requirements with transparent ATS scoring, keyword gap detection, and actionable AI recommendations.
            </p>
          </div>

          <Button
            onClick={handleNewAnalysis}
            className="gap-2.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white h-11 px-5 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer border border-blue-400/30"
          >
            <RefreshCw className="size-4" /> Start New Analysis
          </Button>
        </div>
      </div>

      {/* Main Analyzer Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Input Column */}
        <div className="lg:col-span-5 space-y-6">
          <ResumeUpload />
          <JobDescriptionInput />

          <Button
            onClick={handleRunAnalysis}
            disabled={loading || !resumeFile}
            className="w-full h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Analyzing ATS Fit & AI Feedback...
              </>
            ) : (
              <>
                <Sparkles className="size-5" />
                Analyze Resume ATS Score
              </>
            )}
          </Button>

          <AnalysisHistory />
        </div>

        {/* Right Dashboard Results Column */}
        <div className="lg:col-span-7 space-y-6">
          {result ? (
            <>
              <ATSScoreCard />
              <ScoreBreakdown />
              <KeywordAnalysis />
              <SkillsGapAnalysis />
              <ResumeRecommendations />
              <FormattingAnalysis />
            </>
          ) : (
            <div className="p-12 rounded-3xl bg-[#0D0D14] border border-zinc-800/80 text-center flex flex-col items-center justify-center min-h-[450px] space-y-4">
              <div className="size-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Sparkles className="size-8" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-lg font-bold text-white">No Analysis Generated Yet</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Upload your resume on the left panel, optional target job description, and click "Analyze Resume ATS Score" to view section breakdown, keyword gap, and AI suggestions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
