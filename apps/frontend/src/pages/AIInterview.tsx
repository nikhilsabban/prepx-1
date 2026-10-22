import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { startInterview } from "../services/interviewService";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { toast } from "react-toastify";
import {
  Github,
  Loader2,
  Mic,
  BarChart3,
  Target,
  ChevronRight,
  Sparkles,
  Zap,
  Brain,
  Clock,
  Briefcase,
  FileText,
  UserCheck,
  Search,
} from "lucide-react";

import { GLOBAL_JOB_ROLES } from "../constants/jobRoles";

import { getErrorMessage } from "../lib/utils";

const tips = [
  { icon: Mic, label: "Speak naturally", desc: "Listen and answer standard technical questions" },
  { icon: BarChart3, label: "Performance feedback", desc: "Get scored on technical depth and communication" },
  { icon: Brain, label: "Role-specific questions", desc: "Questions tailored to your role, repo, or JD" },
  { icon: Clock, label: "~15–20 min", desc: "A focused, structured practice session" },
];

export function AIInterview() {
  type InterviewMode = "github" | "role" | "jd";
  type DifficultyLevel = "Basic" | "Easy" | "Medium" | "Difficult";

  const [mode, setMode] = useState<InterviewMode>("github");
  const [interviewTitle, setInterviewTitle] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("Medium");
  const [loading, setLoading] = useState(false);

  // GitHub Repository Picker state
  const [userRepos, setUserRepos] = useState<Array<{ id: number; name: string; html_url: string; language?: string; stargazers_count: number }>>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [customGithubUser, setCustomGithubUser] = useState("");

  const { user } = useAuth();
  const navigate = useNavigate();

  const extractGithubUsername = (val: string) => {
    if (!val) return "";
    const clean = val.trim().replace(/^@/, "").replace(/\/+$/, "");
    const match = clean.match(/github\.com\/([^/]+)/i);
    return match ? match[1] : clean.split("/")[0] || "";
  };

  const loadGithubRepos = async (targetUsername?: string) => {
    const rawUser = targetUsername || customGithubUser || user?.githubUrl || "";
    const username = extractGithubUsername(rawUser);
    if (!username) return;

    setFetchingRepos(true);
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=12`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUserRepos(data.map((r: any) => ({
            id: r.id,
            name: r.name,
            html_url: r.html_url,
            language: r.language,
            stargazers_count: r.stargazers_count || 0,
          })));
        }
      }
    } catch (e) {
      console.warn("Failed to fetch GitHub repos:", e);
    } finally {
      setFetchingRepos(false);
    }
  };

  React.useEffect(() => {
    if (user?.githubUrl) {
      loadGithubRepos(user.githubUrl);
    }
  }, [user?.githubUrl]);

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewTitle.trim()) {
      toast.error("Enter an interview title.");
      return;
    }

    if (mode === "github" && !githubUrl.trim()) {
      toast.error("Enter a GitHub repository URL.");
      return;
    }
    if (mode === "role" && !targetRole.trim()) {
      toast.error("Select or enter a target role.");
      return;
    }
    if (mode === "jd" && !jobDescription.trim()) {
      toast.error("Paste the job description text.");
      return;
    }

    setLoading(true);
    try {
      const { id } = await startInterview({
        title: interviewTitle.trim(),
        mode,
        github: mode === "github" ? githubUrl.trim() : undefined,
        role: mode === "role" ? targetRole.trim() : undefined,
        jobDescription: mode === "jd" ? jobDescription.trim() : undefined,
        difficulty,
      });

      toast.success("Starting interview...");
      navigate(`/interview/${id}`);
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Couldn't start interview. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const firstName = user?.fullName?.split(" ")[0] || "there";

  const difficulties: { id: DifficultyLevel; name: string; desc: string; badgeColor: string }[] = [
    { id: "Basic", name: "Basic", desc: "Fundamental syntax & overview", badgeColor: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
    { id: "Easy", name: "Easy", desc: "Standard frameworks & state", badgeColor: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
    { id: "Medium", name: "Medium", desc: "Architecture & optimizations", badgeColor: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
    { id: "Difficult", name: "Difficult", desc: "Deep systems & edge cases", badgeColor: "border-rose-500/30 text-rose-400 bg-rose-500/10" },
  ];

  const rolePresets = GLOBAL_JOB_ROLES;

  const filteredRoles = useMemo(() => {
    if (!targetRole.trim()) return rolePresets.slice(0, 30);
    const query = targetRole.toLowerCase().trim();
    return rolePresets.filter((role) => role.toLowerCase().includes(query)).slice(0, 50);
  }, [targetRole]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[0%] right-[10%] w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-12 pb-16 sm:pb-24">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 sm:mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4">
            <Sparkles className="size-3.5" />
            Mock Interview Setup
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            Hey {firstName}, ready to practice?
          </h1>
          <p className="mt-2 text-zinc-400 text-sm sm:text-base max-w-2xl">
            Choose an interview mode below to start your mock interview session.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 items-start">

          {/* LEFT — Main Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

              <div className="p-4 sm:p-8">
                {/* MODE SELECTOR TABS */}
                <div className="mb-6 sm:mb-8">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-3">
                    Choose Interview Type
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-black/40 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setMode("github")}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-1 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center ${
                        mode === "github"
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Github className="size-3.5 sm:size-4 shrink-0" />
                      <span className="truncate">GitHub Repo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("role")}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-1 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center ${
                        mode === "role"
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Briefcase className="size-3.5 sm:size-4 shrink-0" />
                      <span className="truncate">Role Based</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("jd")}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-1 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center ${
                        mode === "jd"
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <FileText className="size-3.5 sm:size-4 shrink-0" />
                      <span className="truncate">Job Descr.</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleStartInterview} className="space-y-6">
                  {/* Interview Title */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Interview Title <span className="text-rose-400">*</span></span>
                      <span className="text-[11px] text-rose-400 font-medium">Required</span>
                    </label>
                    <Input
                      type="text"
                      placeholder={
                        mode === "github"
                          ? "e.g. React Portfolio Review"
                          : mode === "role"
                          ? "e.g. Senior Full-Stack Engineer Mock"
                          : "e.g. Stripe Senior Backend Developer Round"
                      }
                      value={interviewTitle}
                      onChange={(e) => setInterviewTitle(e.target.value)}
                      disabled={loading}
                      required
                      className="bg-black/50 border-white/10 text-white h-11 rounded-xl focus-visible:ring-indigo-500 placeholder:text-zinc-600 text-sm"
                    />
                  </div>

                  {/* Question Difficulty Selector */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Select Difficulty Level</span>
                      <span className="text-[11px] text-zinc-500 capitalize">{difficulty} Selected</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {difficulties.map((diff) => {
                        const isSelected = difficulty === diff.id;
                        return (
                          <button
                            key={diff.id}
                            type="button"
                            onClick={() => setDifficulty(diff.id)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? `${diff.badgeColor} ring-2 ring-indigo-500/50`
                                : "border-white/10 bg-black/40 text-zinc-400 hover:border-white/20 hover:text-white"
                            }`}
                          >
                            <div className="text-xs font-bold">{diff.name}</div>
                            <div className="text-[10px] opacity-75 mt-0.5 leading-tight">{diff.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* DYNAMIC MODE FIELDS */}
                  {mode === "github" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                          GitHub Repository URL <span className="text-rose-400">*</span>
                        </label>
                        {userRepos.length > 0 && (
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {userRepos.length} Repositories Found
                          </span>
                        )}
                      </div>

                      {/* Username Fetcher Row */}
                      <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-black/40 border border-white/5">
                        <div className="relative flex-1 min-w-[200px]">
                          <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                          <Input
                            type="text"
                            placeholder="Enter GitHub username or profile link (e.g. nikhilsabban)"
                            value={customGithubUser}
                            onChange={(e) => setCustomGithubUser(e.target.value)}
                            className="pl-9 bg-zinc-950/80 border-white/10 text-white h-9 rounded-xl text-xs placeholder:text-zinc-600 focus-visible:ring-indigo-500"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => loadGithubRepos(customGithubUser)}
                          disabled={fetchingRepos}
                          size="sm"
                          className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer active:scale-95 transition-all"
                        >
                          {fetchingRepos ? "Fetching Repos..." : "Load Repositories"}
                        </Button>
                      </div>

                      {/* Repos Grid */}
                      {userRepos.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            Choose from your repositories:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                            {userRepos.map((repo) => {
                              const isSelected = githubUrl === repo.html_url;
                              return (
                                <button
                                  key={repo.id}
                                  type="button"
                                  onClick={() => {
                                    setGithubUrl(repo.html_url);
                                    if (!interviewTitle || interviewTitle.startsWith("Technical Interview on")) {
                                      setInterviewTitle(`Technical Interview on ${repo.name}`);
                                    }
                                  }}
                                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer active:scale-95 flex flex-col justify-between ${
                                    isSelected
                                      ? "bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500"
                                      : "bg-black/40 border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
                                  }`}
                                >
                                  <div className="font-bold text-xs truncate max-w-full text-indigo-300 flex items-center justify-between">
                                    <span>{repo.name}</span>
                                    {repo.stargazers_count > 0 && <span className="text-[10px] text-zinc-500 font-normal">⭐ {repo.stargazers_count}</span>}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{repo.language || "Code"}</span>
                                    {isSelected && <span className="text-emerald-400 font-semibold ml-auto">Selected ✓</span>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Direct manual URL input */}
                      <div className="space-y-1 pt-1">
                        <label className="text-[11px] text-zinc-400 font-medium">Or paste custom repo link:</label>
                        <div className="relative">
                          <Github className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                          <Input
                            type="url"
                            placeholder="https://github.com/username/repository"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            disabled={loading}
                            required
                            className="pl-10 bg-black/50 border-white/10 text-white h-11 rounded-xl focus-visible:ring-indigo-500 placeholder:text-zinc-600 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Must be a public GitHub repository. The AI will inspect your code structure & ask targeted architecture questions.
                      </p>
                    </div>
                  )}

                  {mode === "role" && (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Search & Select Target Role</span>
                        <span className="text-[11px] text-indigo-400 font-normal">Autocomplete Enabled</span>
                      </label>
                      
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-500 z-10" />
                        <Input
                          type="text"
                          placeholder="Type to search software roles (e.g. Software, Backend, Cloud, AI...)"
                          value={targetRole}
                          onChange={(e) => {
                            setTargetRole(e.target.value);
                            setShowRoleDropdown(true);
                          }}
                          onFocus={() => setShowRoleDropdown(true)}
                          onBlur={() => setTimeout(() => setShowRoleDropdown(false), 200)}
                          disabled={loading}
                          required
                          className="pl-10 pr-10 bg-black/50 border-white/10 text-white h-12 rounded-xl focus-visible:ring-indigo-500 placeholder:text-zinc-600 text-sm"
                        />
                        {targetRole && (
                          <button
                            type="button"
                            onClick={() => { setTargetRole(""); setShowRoleDropdown(true); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1 text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        )}

                        {/* Search Autocomplete Dropdown */}
                        {showRoleDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/15 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-white/5 backdrop-blur-xl">
                            {filteredRoles.length > 0 ? (
                              filteredRoles.map((r) => (
                                <div
                                  key={r}
                                  onMouseDown={() => {
                                    setTargetRole(r);
                                    if (!interviewTitle) setInterviewTitle(`${r} Practice`);
                                    setShowRoleDropdown(false);
                                  }}
                                  className="px-4 py-3 hover:bg-indigo-600/20 hover:text-indigo-300 text-xs text-zinc-300 font-medium cursor-pointer flex items-center justify-between transition-colors"
                                >
                                  <span>{r}</span>
                                  <ChevronRight className="size-3.5 text-zinc-600" />
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-xs text-zinc-500">
                                Custom Role: <span className="text-white font-semibold">{targetRole}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[11px] text-zinc-500 block mb-2 font-medium">Popular Engineering Roles:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {rolePresets.slice(0, 8).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                setTargetRole(r);
                                if (!interviewTitle) setInterviewTitle(`${r} Interview`);
                              }}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                targetRole === r
                                  ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300 font-semibold"
                                  : "border-white/10 bg-black/40 text-zinc-400 hover:text-white"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {mode === "jd" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Job Description / Requirements Text
                      </label>
                      <Textarea
                        placeholder="Paste the target job description, required skills, responsibilities, or tech stack requirements here..."
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        disabled={loading}
                        required
                        rows={5}
                        className="bg-black/50 border-white/10 text-white rounded-xl focus-visible:ring-indigo-500 placeholder:text-zinc-600 text-sm resize-none"
                      />
                      <p className="text-[11px] text-zinc-600">
                        The AI will extract key technologies and responsibilities from your JD to simulate the interview.
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-indigo-500/25 disabled:opacity-60 disabled:scale-100 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Initializing session…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Zap className="size-4" />
                        Start {difficulty} AI Interview
                        <ChevronRight className="size-4 ml-auto" />
                      </span>
                    )}
                  </Button>
                </form>

                {mode === "github" && (
                  <>
                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-[11px] text-zinc-600 uppercase tracking-wider">Or try demo repo</span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => {
                        setGithubUrl("https://github.com/example/demo");
                        if (!interviewTitle) setInterviewTitle("Demo Repository Practice");
                      }}
                      className="w-full h-10 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl text-xs cursor-pointer"
                    >
                      Use a demo repository
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* RIGHT — Info Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-2 space-y-4"
          >
            {/* What to expect */}
            <div className="rounded-2xl border border-white/8 bg-zinc-900/50 p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Target className="size-4 text-indigo-400" />
                What to expect
              </h3>
              <div className="space-y-4">
                {tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="size-8 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <tip.icon className="size-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{tip.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tip box */}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-5">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">💡 Pro Tip</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {mode === "github" && "Choose a repo with modular code. The AI inspects your architectural patterns."}
                {mode === "role" && "Select the target job title to simulate real-world technical and behavioral questions."}
                {mode === "jd" && "Paste a real job listing to prepare specifically for company requirements."}
              </p>
            </div>

            {/* Mode summary */}
            <div className="rounded-2xl border border-white/8 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <UserCheck className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Active Mode</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {mode === "github" && "GitHub Profile & Repository Based"}
                    {mode === "role" && `Role Based: ${targetRole || "Software Engineer"}`}
                    {mode === "jd" && "Job Description (JD) Based"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default AIInterview;
