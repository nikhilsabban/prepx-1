import React, { useEffect, useState } from "react";
import { useResumeStore } from "../state/useResumeStore";
import { fetchAnalysisHistoryApi, deleteAnalysisApi } from "../services/resumeAnalysisApi";
import { Button } from "../../../components/ui/button";
import { toast } from "sonner";
import { History, Trash2, Eye, Calendar, FileText } from "lucide-react";

export function AnalysisHistory() {
  const { history, setHistory, setResult, setResumeFile, setUploadStatus, setJobDescription } = useResumeStore();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadHistory = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetchAnalysisHistoryApi(p, 5);
      if (res.success && res.data) {
        setHistory(res.data);
        setPage(res.pagination.page);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load analysis history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1);
  }, []);

  const handleDelete = async (analysisId: string) => {
    try {
      const res = await deleteAnalysisApi(analysisId);
      if (res.success) {
        toast.success("Analysis deleted.");
        setHistory(history.filter((item) => item.analysisId !== analysisId && (item as any)._id !== analysisId));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete analysis.");
    }
  };

  const handleSelect = (item: any) => {
    // Restore resume file metadata
    if (item.resumeId) {
      setResumeFile({
        resumeId: item.resumeId._id || item.resumeId,
        originalFileName: item.resumeId.originalFileName || "Uploaded Resume",
        fileSize: item.resumeId.fileSize || 0,
        extractedText: item.resumeId.extractedText || "",
        structuredData: item.resumeId.structuredData || {},
      });
      setUploadStatus("parsed");
    }

    // Restore editable Job Description state
    if (item.jobDescriptionId) {
      setJobDescription({
        title: item.jobDescriptionId.title || "",
        company: item.jobDescriptionId.company || "",
        text: item.jobDescriptionId.description || "",
      });
    } else {
      setJobDescription({ title: "", company: "", text: "" });
    }

    setResult({
      analysisId: item._id,
      atsScore: item.atsScore,
      jobMatchScore: item.jobMatchScore,
      scoreBreakdown: item.scoreBreakdown,
      matchedKeywords: item.matchedKeywords,
      missingKeywords: item.missingKeywords,
      matchedSkills: item.matchedSkills,
      missingSkills: item.missingSkills,
      strengths: item.strengths,
      weaknesses: item.weaknesses,
      recommendations: item.recommendations,
      sectionFeedback: item.sectionFeedback,
      formattingAnalysis: item.formattingAnalysis,
      resume: item.resumeId ? {
        id: item.resumeId._id || item.resumeId,
        fileName: item.resumeId.originalFileName || "Uploaded Resume",
        structuredData: item.resumeId.structuredData,
      } : undefined,
      jobDescription: item.jobDescriptionId ? {
        id: item.jobDescriptionId._id || item.jobDescriptionId,
        title: item.jobDescriptionId.title || "",
        company: item.jobDescriptionId.company || "",
      } : undefined,
      createdAt: item.createdAt,
    });
    toast.info("Re-opened analysis record! You can now edit the Job Description and re-analyze.");
  };

  return (
    <div className="p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <History className="size-4 text-blue-400" /> Analysis History
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadHistory(page)}
          className="text-xs text-zinc-400 hover:text-white"
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-zinc-400">Loading history records...</div>
      ) : history.length > 0 ? (
        <div className="space-y-3">
          {history.map((item: any) => {
            const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "";
            const fileName = item.resumeId?.originalFileName || "Resume File";
            const jobTitle = item.jobDescriptionId?.title || "General Role";

            return (
              <div
                key={item._id}
                className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-500/30 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="size-3.5 text-blue-400" />
                    <span className="text-xs font-bold text-white">{fileName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">({jobTitle})</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" /> {dateStr}
                    </span>
                    <span className="text-emerald-400 font-bold">ATS: {item.atsScore}/100</span>
                    <span className="text-purple-400 font-bold">Match: {item.jobMatchScore}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelect(item)}
                    className="h-8 text-xs gap-1 border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                  >
                    <Eye className="size-3" /> Re-open
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(item._id)}
                    className="size-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-2 text-xs text-zinc-400">
              <Button
                disabled={page <= 1}
                onClick={() => loadHistory(page - 1)}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                Previous
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                disabled={page >= totalPages}
                onClick={() => loadHistory(page + 1)}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-500 text-center py-6">No previous analysis history found.</p>
      )}
    </div>
  );
}
