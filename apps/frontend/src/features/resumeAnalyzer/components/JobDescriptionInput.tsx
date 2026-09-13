import React, { useState } from "react";
import { useResumeStore } from "../state/useResumeStore";
import { generateJobDescriptionApi } from "../services/resumeAnalysisApi";
import { Textarea } from "../../../components/ui/textarea";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { toast } from "sonner";
import { Briefcase, Sparkles, Loader2, Building2, Search } from "lucide-react";

export function JobDescriptionInput() {
  const { jobDescription, setJobDescription, resumeFile } = useResumeStore();
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    roles: string[];
    companies: string[];
  }>({ roles: [], companies: [] });

  const handleAiSearchJd = async () => {
    if (!jobDescription.title.trim() && !jobDescription.company.trim() && !resumeFile?.extractedText) {
      toast.error("Please enter a Job Title or Company Name first to search!");
      return;
    }

    setGenerating(true);
    try {
      const res = await generateJobDescriptionApi({
        jobTitle: jobDescription.title,
        companyName: jobDescription.company,
        resumeText: resumeFile?.extractedText,
      });

      if (res.success && res.data) {
        setJobDescription({
          ...jobDescription,
          text: res.data.generatedJobDescription || jobDescription.text,
        });

        setSuggestions({
          roles: res.data.recommendedRoles || [],
          companies: res.data.recommendedCompanies || [],
        });

        toast.success("AI generated job description & recommendations!");
      }
    } catch (err: any) {
      console.error("AI Search error:", err);
      toast.error(err.response?.data?.message || "Failed to search job description with AI.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Briefcase className="size-4 text-purple-400" /> Target Job Description
        </h3>
        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">Optional but Recommended</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-zinc-400 font-medium">Job Title</Label>
          <Input
            placeholder="e.g. Senior Frontend Developer"
            value={jobDescription.title}
            onChange={(e) => setJobDescription({ ...jobDescription, title: e.target.value })}
            className="bg-zinc-900 border-zinc-800 text-xs h-9 text-white placeholder:text-zinc-500"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-400 font-medium">Company Name</Label>
          <Input
            placeholder="e.g. Google / Stripe / Startup"
            value={jobDescription.company}
            onChange={(e) => setJobDescription({ ...jobDescription, company: e.target.value })}
            className="bg-zinc-900 border-zinc-800 text-xs h-9 text-white placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* AI Role & Company Suggestions */}
      {(suggestions.roles.length > 0 || suggestions.companies.length > 0) && (
        <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-2">
          <p className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> AI Recommended Roles & Target Companies:
          </p>
          
          {suggestions.roles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 font-mono uppercase">Roles:</span>
              {suggestions.roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setJobDescription({ ...jobDescription, title: role })}
                  className="px-2 py-0.5 rounded text-[11px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 border border-purple-500/30 transition-colors cursor-pointer"
                >
                  {role}
                </button>
              ))}
            </div>
          )}

          {suggestions.companies.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 font-mono uppercase">Companies:</span>
              {suggestions.companies.map((company) => (
                <button
                  key={company}
                  type="button"
                  onClick={() => setJobDescription({ ...jobDescription, company: company })}
                  className="px-2 py-0.5 rounded text-[11px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 border border-blue-500/30 transition-colors cursor-pointer"
                >
                  {company}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-zinc-400 font-medium">Job Description Text</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAiSearchJd}
            disabled={generating}
            className="h-6 px-2 text-[11px] text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 gap-1.5 font-medium cursor-pointer"
          >
            {generating ? (
              <>
                <Loader2 className="size-3 animate-spin" /> AI Searching Job Posting...
              </>
            ) : (
              <>
                <Search className="size-3 text-purple-400" /> AI Auto-Fill Job Description
              </>
            )}
          </Button>
        </div>

        <Textarea
          placeholder="Paste requirements, responsibilities, and key tech stack mentioned in the job posting (or click AI Auto-Fill above to generate automatically)..."
          value={jobDescription.text}
          onChange={(e) => setJobDescription({ ...jobDescription, text: e.target.value })}
          rows={5}
          className="bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-500 leading-relaxed resize-none"
        />
      </div>
    </div>
  );
}
