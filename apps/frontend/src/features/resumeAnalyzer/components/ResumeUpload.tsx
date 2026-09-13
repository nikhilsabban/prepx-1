import React, { useState, useRef, useEffect } from "react";
import { useResumeStore } from "../state/useResumeStore";
import { uploadResumeApi } from "../services/resumeAnalysisApi";
import { Button } from "../../../components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, Loader2, Eye, X, FileSearch } from "lucide-react";

export function ResumeUpload() {
  const { resumeFile, uploadStatus, setResumeFile, setUploadStatus, setError } = useResumeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTab, setPreviewTab] = useState<"document" | "text">("document");
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [localBlobUrl]);

  const handleFileSelected = async (file: File) => {
    if (!file) return;

    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "text/plain"];
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !["pdf", "docx", "doc", "txt"].includes(ext || "")) {
      toast.error("Invalid file format. Please upload a PDF or DOCX resume.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    // Create local blob URL for instant PDF viewing
    if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
    const objectUrl = URL.createObjectURL(file);
    setLocalBlobUrl(objectUrl);

    setUploadStatus("uploading");
    setError(null);

    try {
      const res = await uploadResumeApi(file);
      if (res.success && res.data) {
        setResumeFile({
          resumeId: res.data.resumeId,
          originalFileName: res.data.originalFileName,
          fileSize: res.data.fileSize,
          fileUrl: objectUrl,
          extractedText: res.data.extractedText,
          structuredData: res.data.structuredData,
        });
        setUploadStatus("parsed");
        toast.success("Resume parsed successfully!");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadStatus("error");
      const msg = err.response?.data?.message || "Failed to upload and parse resume.";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <FileText className="size-4 text-blue-400" /> Upload Resume
        </h3>
        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">PDF, DOCX (Max 10MB)</span>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          resumeFile
            ? "border-emerald-500/40 bg-emerald-500/5"
            : uploadStatus === "uploading"
            ? "border-blue-500/40 bg-blue-500/5"
            : "border-zinc-800 hover:border-blue-500/50 bg-zinc-900/40"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
          accept=".pdf,.docx,.doc,.txt"
          className="hidden"
        />

        {uploadStatus === "uploading" ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <Loader2 className="size-8 text-blue-400 animate-spin" />
            <p className="text-xs text-blue-300 font-medium">Extracting text & parsing sections...</p>
          </div>
        ) : resumeFile ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <CheckCircle2 className="size-9 text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-white">{resumeFile.originalFileName}</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {(resumeFile.fileSize / 1024).toFixed(1)} KB • Extracted {resumeFile.structuredData?.skills?.length || 0} skills
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 border-blue-500/30 hover:bg-blue-500/10 text-blue-400 gap-1.5 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPreviewModal(true);
                }}
              >
                <Eye className="size-3.5" /> View Resume PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 border-zinc-700 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Change File
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="size-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Upload className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Drag & Drop your resume file here</p>
              <p className="text-xs text-zinc-400 mt-1">or click to browse from computer</p>
            </div>
          </div>
        )}
      </div>

      {/* Resume Document Viewer Modal */}
      {showPreviewModal && resumeFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0F0F16] border border-zinc-800 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-white text-base leading-tight">Resume Document Viewer</h3>
                  <p className="text-xs text-zinc-400 font-mono">{resumeFile.originalFileName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
                  <button
                    onClick={() => setPreviewTab("document")}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      previewTab === "document" ? "bg-blue-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Eye className="size-3.5" /> PDF View
                  </button>
                  <button
                    onClick={() => setPreviewTab("text")}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      previewTab === "text" ? "bg-blue-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <FileSearch className="size-3.5" /> Extracted Text
                  </button>
                </div>

                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors ml-2"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-zinc-950 p-2 overflow-hidden flex flex-col">
              {previewTab === "document" ? (
                localBlobUrl || resumeFile.fileUrl ? (
                  <iframe
                    src={localBlobUrl || resumeFile.fileUrl}
                    className="w-full h-full rounded-xl border border-zinc-800/80 bg-white"
                    title="Resume PDF Document Viewer"
                  />
                ) : (
                  <div className="p-8 overflow-y-auto flex-1 text-sm bg-[#09090D] rounded-xl border border-zinc-800 space-y-6">
                    <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-white">{resumeFile.structuredData?.personal?.name || "Candidate Resume"}</h2>
                        <p className="text-xs text-blue-400 font-mono mt-0.5">{resumeFile.originalFileName}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-mono">
                        Formatted Text View
                      </span>
                    </div>

                    {resumeFile.structuredData?.skills?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Technical Skills</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {resumeFile.structuredData.skills.map((s: string, idx: number) => (
                            <span key={idx} className="px-2.5 py-1 rounded text-xs bg-zinc-900 text-zinc-200 border border-zinc-800">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Document Content</h4>
                      <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/80 text-zinc-300 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                        {resumeFile.extractedText || "No text content available."}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm bg-[#0F0F16] rounded-xl">
                  {/* Extracted Skills badges */}
                  {resumeFile.structuredData?.skills?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Detected Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {resumeFile.structuredData.skills.map((skill: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Extracted Text */}
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Extracted Plain Text</h4>
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-zinc-300 whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-[500px] overflow-y-auto">
                      {resumeFile.extractedText || "No text extracted."}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end bg-zinc-900/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreviewModal(false)}
                className="border-zinc-700 hover:bg-zinc-800 text-white cursor-pointer"
              >
                Close Viewer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
