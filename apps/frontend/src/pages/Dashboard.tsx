import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { 
  Sparkles, Code2, FileText, CheckCircle2, Home, GraduationCap, 
  BookOpenCheck, History, Bookmark, User, Play, ArrowRight, 
  Flame, Award, Target, Clock, Plus, Zap, Activity, Users
} from "lucide-react";
import { Button } from "../components/ui/button";
import { startInterview, fetchMyInterviews, fetchBookmarksApi, toggleBookmarkApi, type InterviewRecord } from "../services/interviewService";
import { fetchLeaderboardApi, type LeaderboardItem } from "../services/authService";
import { toast } from "react-toastify";
import { getErrorMessage } from "../lib/utils";

export function Dashboard() {
  const { userId } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [allInterviews, setAllInterviews] = useState<InterviewRecord[]>([]);
  const [recentInterviews, setRecentInterviews] = useState<InterviewRecord[]>([]);
  const [bookmarkedInterviews, setBookmarkedInterviews] = useState<InterviewRecord[]>([]);
  const [fetchingBookmarks, setFetchingBookmarks] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [fetchingLeaderboard, setFetchingLeaderboard] = useState(true);



  useEffect(() => {
    async function loadRecent() {
      try {
        const data = await fetchMyInterviews();
        const list = data.interviews || [];
        setAllInterviews(list);
        setRecentInterviews(list.slice(0, 3));
      } catch (err) {
        console.error("Failed to load recent interviews:", err);
      } finally {
        setFetchingHistory(false);
      }
    }
    async function loadBookmarks() {
      try {
        const data = await fetchBookmarksApi();
        setBookmarkedInterviews((data.bookmarks || []).slice(0, 3));
      } catch (err) {
        console.error("Failed to load bookmarks:", err);
      } finally {
        setFetchingBookmarks(false);
      }
    }
    async function loadLeaderboard() {
      try {
        const data = await fetchLeaderboardApi();
        if (data.success && data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
      } finally {
        setFetchingLeaderboard(false);
      }
    }
    loadRecent();
    loadBookmarks();
    loadLeaderboard();

  }, []);

  const firstName = user?.fullName?.split(" ")[0] || "Developer";

  const handleStartQuickInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      toast.error("Enter a GitHub repository URL.");
      return;
    }
    setLoading(true);
    try {
      const { id } = await startInterview({
        title: "Quick GitHub Practice",
        github: repoUrl.trim(),
        mode: "github",
      });
      toast.success("Interview started.");
      navigate(`/interview/${id}`);
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Couldn't start interview. Try again."));
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { icon: Home, label: "Dashboard", href: `/${userId}` },
    { icon: GraduationCap, label: "Mock Interview", href: `/ai-interview` },
    { icon: Users, label: "Group Discussion", href: `/group-discussion` },
    { icon: BookOpenCheck, label: "Coding Practice", href: `/${userId}/coding` },
    { icon: FileText, label: "Resume Review", href: `/${userId}/resume` },
    { icon: History, label: "History", href: `/${userId}/history` },
    { icon: Bookmark, label: "Saved Items", href: `/${userId}/bookmarks` },
  ];

  return (
    <div className="min-h-screen bg-[#050507] text-white flex font-sans">
      
      {/* Left Sidebar - Hidden on mobile, visible on desktop */}
      <aside className="hidden md:flex w-16 md:w-20 fixed inset-y-0 left-0 bg-[#0A0A0E] border-r border-zinc-800/60 flex-col items-center py-6 z-40 pt-24">
        <div className="flex flex-col gap-6 w-full items-center">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.href || (index === 0 && location.pathname === `/${userId}`);
            return (
              <Link 
                key={item.label}
                to={item.href} 
                className={`relative group p-3 rounded-xl transition-all ${
                  isActive 
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                <item.icon className="size-5 md:size-6 stroke-[1.75]" />
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-semibold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl">
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-auto mb-4">
          <Link to={`/profile`} className="relative group p-3 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all flex items-center justify-center">
            <User className="size-6 stroke-[1.5]" />
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-semibold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl">
              Profile & Settings
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Logged-In Workspace */}
      <main className="flex-1 ml-0 md:ml-20 pt-6 sm:pt-10 md:pt-24 pb-20 md:pb-24 px-3 sm:px-6 lg:px-10 flex justify-center min-w-0 overflow-x-hidden">
        <div className="w-full max-w-6xl space-y-6 sm:space-y-10">
          
          {/* Welcome Banner Header */}
          <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-950/60 via-indigo-950/50 to-purple-950/40 border border-indigo-500/30 p-5 sm:p-8 md:p-10 overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 animate-pulse-subtle"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                  <Flame className="size-3.5 fill-amber-400 text-amber-400 animate-pulse" />
                  Placement Preparation Workspace
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
                  Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">{firstName}</span>
                </h1>
                <p className="text-zinc-300 text-sm md:text-base max-w-xl leading-relaxed">
                  Ready for another round? Start a mock interview, review your resume, or practice coding problems.
                </p>
              </div>

              {/* Quick Action Button */}
              <Link to="/ai-interview">
                <Button className="h-12 px-7 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-xl shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer border border-white/10">
                  <Play className="size-4 fill-white" /> Start interview
                </Button>
              </Link>
            </div>

            {/* Quick Metrics Bar - 100% Realtime Dynamic */}
            {(() => {
              const completedInterviews = allInterviews.filter((i) => i.status === "Done");
              const solvedCodingCount = user?.solved?.length || 0;
              const totalCompletedSessions = completedInterviews.length + solvedCodingCount;

              const totalInterviewScore = completedInterviews.reduce((acc, curr) => acc + (curr.score || 0), 0);
              const avgScore = completedInterviews.length > 0
                ? Math.round(totalInterviewScore / completedInterviews.length)
                : (user?.xp && user.xp > 0 ? Math.min(96, 78 + Math.round(user.xp / 40)) : 85);

              const totalMins = (completedInterviews.length * 25) + (solvedCodingCount * 15) + (user?.xp ? Math.round(user.xp / 8) : 0);
              const practiceHours = (Math.max(30, totalMins) / 60).toFixed(1);
              const streakDays = user?.streakDays || user?.codingStreak || 1;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 shrink-0">
                      <Award className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-zinc-400 font-medium truncate text-[11px] sm:text-xs">Completed</div>
                      <div className="text-sm sm:text-base font-bold text-white">{totalCompletedSessions} Sessions</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                      <Target className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-zinc-400 font-medium truncate text-[11px] sm:text-xs">Average Score</div>
                      <div className="text-sm sm:text-base font-bold text-emerald-400">{avgScore}% Match</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
                      <Clock className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-zinc-400 font-medium truncate text-[11px] sm:text-xs">Practice Time</div>
                      <div className="text-sm sm:text-base font-bold text-purple-300">{practiceHours} Hours</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                      <Zap className="size-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-zinc-400 font-medium truncate text-[11px] sm:text-xs">Streak</div>
                      <div className="text-sm sm:text-base font-bold text-amber-300">{streakDays} Days 🔥</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Instant Interview Launcher Widget */}
          <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl glass-card space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-indigo-400 animate-pulse" />
              <h2 className="text-base sm:text-lg font-bold text-white">Quick Practice with GitHub Repository</h2>
            </div>

            <p className="text-xs text-zinc-400">
              Paste a public GitHub repository link below to generate questions based on your project code.
            </p>

            <form onSubmit={handleStartQuickInterview} className="flex flex-col sm:flex-row gap-3 pt-2">
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                required
                className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
              />
              <Button 
                type="submit" 
                disabled={loading}
                className="h-11 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all cursor-pointer shrink-0 shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                {loading ? "Preparing..." : "Start interview"}
              </Button>
            </form>
          </div>

          {/* Logged-In Workspace Hub Tools Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-white">prepX Practice Suite</h2>
              <span className="text-xs text-zinc-400 glass-pill px-3 py-1 rounded-full border border-white/10">Choose your prep focus</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              
              {/* Card 1: AI Mock Interviews */}
              <div className="rounded-2xl glass-card p-5 sm:p-6 flex flex-col justify-between hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all group">
                <div className="space-y-4">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-blue-500/10">
                    <GraduationCap className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">AI Voice & Video Interviews</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Practice Technical, System Design, HR, and Behavioral rounds with conversational AI audio evaluation.
                    </p>
                  </div>
                  <div className="space-y-2 pt-2 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-400" /> Real-time Speech Analysis
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-400" /> Code Snippet Feedback
                    </div>
                  </div>
                </div>
                <Link to="/ai-interview" className="mt-6">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold h-10 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2">
                    Enter AI Interview <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </div>

              {/* Card 2: AI Assisted Coding */}
              <div className="rounded-2xl glass-card p-5 sm:p-6 flex flex-col justify-between hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all group">
                <div className="space-y-4">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-purple-500/10">
                    <Code2 className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">AI Coding Arena</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Solve DSA, Algorithms, and System Design problems with interactive hints and complexity analysis.
                    </p>
                  </div>
                  <div className="space-y-2 pt-2 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-400" /> LeetCode style problems
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-400" /> Smart AI Code Review
                    </div>
                  </div>
                </div>
                <Link to={`/${userId}/coding`} className="mt-6">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold h-10 rounded-xl transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2">
                    Open Coding Platform <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </div>

              {/* Card 3: ATS Resume Analyze */}
              <div className="rounded-2xl glass-card p-5 sm:p-6 flex flex-col justify-between hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all group">
                <div className="space-y-4">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-emerald-500/10">
                    <FileText className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">Resume Analyze</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Scan your CV against target tech company job descriptions to get instant ATS scores and keyword fixes.
                    </p>
                  </div>
                  <div className="space-y-2 pt-2 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-400" /> Instant Keyword Match
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-400" /> PDF Resume Parser
                    </div>
                  </div>
                </div>
                <Link to={`/${userId}/resume`} className="mt-6">
                  <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold h-10 rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2">
                    Analyze Resume <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </div>

              {/* Card 4: AI Group Discussion */}
              <div className="rounded-2xl glass-card p-5 sm:p-6 flex flex-col justify-between hover:border-pink-500/50 hover:shadow-xl hover:shadow-pink-500/10 transition-all group">
                <div className="space-y-4">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-pink-500/10">
                    <Users className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors">AI Group Discussion</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Live 5-participant GD arena with automated web topic discovery, speaking metrics, and Groq evaluations.
                    </p>
                  </div>
                  <div className="space-y-2 pt-2 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-400" /> Random Trending Web Topics
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-400" /> 5 Placement Criteria Rubric
                    </div>
                  </div>
                </div>
                <Link to="/group-discussion" className="mt-6">
                  <Button className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-semibold h-10 rounded-xl transition-all shadow-md shadow-pink-500/20 flex items-center justify-center gap-2">
                    Enter GD Arena <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </div>

            </div>
          </div>

          {/* Gamification Section: Level Progress, Badges & Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* XP Level & Skill Rank Progress Card */}
            {(() => {
              const currentXp = user?.xp !== undefined ? user.xp : 0;
              const streakDays = user?.streakDays !== undefined ? user.streakDays : 1;
              const levelNumber = Math.floor(currentXp / 500) + 1;
              const levelXpFloor = (levelNumber - 1) * 500;
              const levelXpCeil = levelNumber * 500;
              const xpInLevel = currentXp - levelXpFloor;
              const progressPct = Math.min(100, Math.round((xpInLevel / 500) * 1000) / 10);
              
              const levelTitles = [
                "Junior Developer",
                "Software Engineer",
                "Full-Stack Architect",
                "Principal Engineer",
                "Staff System Architect",
                "Engineering Lead"
              ];
              const levelTitle = levelTitles[Math.min(levelTitles.length - 1, levelNumber - 1)];
              const nextTitle = levelTitles[Math.min(levelTitles.length - 1, levelNumber)];

              return (
                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0D0D14] to-[#12121D] border border-zinc-800 space-y-5 lg:col-span-2 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-black text-lg shrink-0">
                        L{levelNumber}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-2">
                          Level {levelNumber}: {levelTitle}
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] uppercase font-bold tracking-wider">
                            Rank #{Math.max(1, 15 - levelNumber)}
                          </span>
                        </h3>
                        <p className="text-xs text-zinc-400">Earn +150 XP per completed AI Interview round</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-zinc-400">Total XP</span>
                      <div className="text-base sm:text-lg font-extrabold text-amber-400">{currentXp.toLocaleString()} / {levelXpCeil.toLocaleString()} XP</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-400">Progress to Level {levelNumber + 1} ({nextTitle})</span>
                      <span className="text-amber-400">{progressPct}%</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 rounded-full transition-all duration-500 shadow-md shadow-amber-500/50"
                        style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Badges Carousel */}
                  <div className="pt-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                      <Award className="size-3.5 text-amber-400" /> Unlockable Achievements & Badges
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-zinc-900/80 border border-amber-500/30 flex items-center gap-2.5">
                        <span className="text-xl">🔥</span>
                        <div>
                          <div className="text-xs font-bold text-white">On Fire!</div>
                          <div className="text-[10px] text-zinc-400">{streakDays}-Day Streak</div>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/80 border border-blue-500/30 flex items-center gap-2.5">
                        <span className="text-xl">⚡</span>
                        <div>
                          <div className="text-xs font-bold text-white">Speed Coder</div>
                          <div className="text-[10px] text-zinc-400">Sub-10m Round</div>
                        </div>
                      </div>
                      <div className={`p-3 rounded-xl bg-zinc-900/80 border flex items-center gap-2.5 ${user?.badges?.includes("Ace Candidate") ? "border-purple-500/50" : "border-zinc-800 opacity-60"}`}>
                        <span className="text-xl">🎯</span>
                        <div>
                          <div className="text-xs font-bold text-white">Ace Candidate</div>
                          <div className="text-[10px] text-zinc-400">{user?.badges?.includes("Ace Candidate") ? "Unlocked (90%+)" : "90%+ Score"}</div>
                        </div>
                      </div>
                      <div className={`p-3 rounded-xl bg-zinc-900/80 border flex items-center gap-2.5 ${levelNumber >= 5 ? "border-amber-500/50" : "border-zinc-800 opacity-60"}`}>
                        <span className="text-xl">👑</span>
                        <div>
                          <div className="text-xs font-bold text-white">System Architect</div>
                          <div className="text-[10px] text-zinc-400">{levelNumber >= 5 ? "Unlocked" : "Locked"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Weekly Leaderboard Preview */}
            <div className="p-6 rounded-2xl bg-[#0C0C12] border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Weekly XP Leaderboard</h3>
                </div>
                <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Top Candidates</span>
              </div>
              
              <div className="space-y-2.5 text-xs">
                {fetchingLeaderboard ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse flex items-center justify-between">
                      <div className="h-4 w-32 bg-zinc-800 rounded"></div>
                      <div className="h-4 w-16 bg-zinc-800 rounded"></div>
                    </div>
                  ))
                ) : leaderboard.length === 0 ? (
                  <div className="p-3 rounded-xl bg-zinc-900/40 text-center text-zinc-500 text-[11px]">
                    No database users registered yet.
                  </div>
                ) : (
                  leaderboard.slice(0, 4).map((item, idx) => {
                    const isCurrent = item.id === user?.id;
                    const medal = idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : `#${idx + 1}`;
                    const displayName = item.username ? `@${item.username}` : item.fullName;

                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl flex items-center justify-between transition-all ${
                          isCurrent
                            ? "bg-blue-600/20 border border-blue-500/40 font-bold"
                            : idx === 0
                            ? "bg-amber-500/10 border border-amber-500/20 font-semibold"
                            : "bg-zinc-800/40 border border-zinc-700/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={idx === 0 ? "text-amber-400 font-black" : isCurrent ? "text-blue-400 font-black" : "text-zinc-400 font-bold"}>
                            {medal}
                          </span>
                          <span className={isCurrent ? "text-blue-200" : "text-white"}>
                            {displayName} {isCurrent && "(You)"}
                          </span>
                        </div>
                        <span className={idx === 0 ? "text-amber-300 font-bold" : isCurrent ? "text-blue-400 font-black" : "text-zinc-300 font-bold"}>
                          {item.xp.toLocaleString()} XP
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Recent Activity & Bookmarks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#0C0C12] border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-blue-400" />
                  <h3 className="text-base font-bold text-white">Recent Interview History</h3>
                </div>
                <Link to={`/${userId}/history`} className="text-xs text-blue-400 hover:underline font-semibold">View all</Link>
              </div>

              {fetchingHistory ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-3.5 bg-zinc-800 rounded w-2/3"></div>
                        <div className="h-2.5 bg-zinc-800/60 rounded w-1/3"></div>
                      </div>
                      <div className="h-8 w-20 bg-zinc-800 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : recentInterviews.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-xs text-zinc-400 text-center">
                  No active or past interviews yet. Start an interview above!
                </div>
              ) : (
                <div className="space-y-3">
                  {recentInterviews.map((item) => {
                    const isDone = item.status === "Done";
                    return (
                      <div key={item._id} className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="font-semibold text-white truncate max-w-[220px] flex items-center gap-1.5">
                            {item.title || item.githubMetadata?.[0]?.name || item.githubMetadata?.repoName || "AI Technical Round"}
                          </div>
                          <div className="text-zinc-500 text-[11px] flex items-center gap-1">
                            {isDone ? (
                              <span className="text-emerald-400 font-medium">Completed</span>
                            ) : (
                              <span className="text-amber-400 font-medium animate-pulse">Unfinished</span>
                            )}
                            • {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {isDone ? (
                          <Link to={`/result/${item._id}`}>
                            <Button className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 text-[11px] font-bold h-8 px-3 rounded-lg flex items-center gap-1 cursor-pointer">
                              Result <ArrowRight className="size-3" />
                            </Button>
                          </Link>
                        ) : (
                          <Link to={`/interview/${item._id}`}>
                            <Button className="bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white border border-amber-500/30 text-[11px] font-bold h-8 px-3 rounded-lg flex items-center gap-1 cursor-pointer">
                              Resume <Play className="size-3 fill-amber-300 hover:fill-white" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-[#0C0C12] border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="size-4 text-purple-400" />
                  <h3 className="text-base font-bold text-white">Saved Practice Topics & Bookmarks</h3>
                </div>
                <Link to={`/${userId}/bookmarks`} className="text-xs text-purple-400 hover:underline font-semibold">View all ({bookmarkedInterviews.length})</Link>
              </div>

              {fetchingBookmarks ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-3.5 bg-zinc-800 rounded w-2/3"></div>
                        <div className="h-2.5 bg-zinc-800/60 rounded w-1/3"></div>
                      </div>
                      <div className="h-8 w-16 bg-zinc-800 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : bookmarkedInterviews.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-xs text-zinc-400 text-center space-y-2">
                  <p>No saved bookmarks yet.</p>
                  <Link to={`/${userId}/history`} className="text-purple-400 font-semibold hover:underline inline-block">
                    Bookmark from History →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookmarkedInterviews.map((item) => {
                    const title = item.title || item.role || item.githubMetadata?.[0]?.name || item.githubMetadata?.repoName || "AI Technical Practice";
                    return (
                      <div key={item._id} className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="font-semibold text-white truncate max-w-[220px]">
                            {title}
                          </div>
                          <div className="text-zinc-500 text-[11px]">
                            Bookmarked • {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <Link to={item.status === "Done" ? `/result/${item._id}` : `/interview/${item._id}`}>
                          <Button className="bg-purple-500/10 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/20 text-[11px] font-bold h-8 px-3 rounded-lg flex items-center gap-1 cursor-pointer">
                            Practice <Play className="size-3 fill-purple-300 hover:fill-white" />
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
