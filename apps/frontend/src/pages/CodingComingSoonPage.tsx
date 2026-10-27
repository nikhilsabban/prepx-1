import React from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { 
  Code2, Sparkles, Terminal, Cpu, Trophy, Zap, 
  ArrowLeft, CheckCircle2, Clock, Flame, ShieldAlert 
} from "lucide-react";
import { Button } from "../components/ui/button";

export function CodingComingSoonPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const userDashboardPath = user ? `/${user.id}` : "/";

  const upcomingFeatures = [
    {
      icon: Terminal,
      title: "Multi-Language Compiler",
      description: "Execute and benchmark code in C++, Python, Java, JavaScript, Go, and Rust with instant test case feedback.",
      color: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
    },
    {
      icon: Cpu,
      title: "AI Co-Pilot & Debugger",
      description: "Get real-time hint suggestions, time & space complexity analysis, and line-by-line AI code reviews without giving away direct answers.",
      color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
    },
    {
      icon: Trophy,
      title: "Company Tagged DSA Arena",
      description: "Practice top interview questions curated from FAANG & top tech startups organized by topic, difficulty, and frequency.",
      color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    },
    {
      icon: Zap,
      title: "Live Leaderboards & XP",
      description: "Earn XP points for every passed test case, track streak badges, and climb global and college student rankings.",
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#050507] text-white flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Glow Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-600/15 to-blue-600/15 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-4xl mx-auto space-y-10 relative z-10 text-center">
        
        {/* Main Header Badge & Icon */}
        <div className="flex flex-col items-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-widest shadow-lg shadow-purple-500/10 animate-pulse">
            <Clock className="size-3.5" />
            Under Active Development
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative size-24 md:size-28 rounded-3xl bg-[#0D0D14] border border-purple-500/40 flex items-center justify-center shadow-2xl">
              <Code2 className="size-12 md:size-14 text-purple-400 stroke-[1.75]" />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight">
            Coding Arena <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400">Coming Soon</span>
          </h1>

          <p className="text-zinc-400 text-base md:text-lg max-w-2xl leading-relaxed">
            We are crafting a next-generation AI coding platform with interactive DSA problem sets, multi-language execution, and intelligent code evaluation.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            onClick={() => navigate(userDashboardPath)}
            className="h-11 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="size-4" /> Back to Dashboard
          </Button>
          <Button
            onClick={() => navigate("/ai-interview")}
            className="h-11 px-6 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="size-4 text-indigo-400" /> Practice AI Interview Instead
          </Button>
        </div>

        {/* Sneak Peek Cards Grid */}
        <div className="pt-6 space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h2 className="text-sm font-extrabold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Flame className="size-4 text-amber-400" /> What to Expect
            </h2>
            <span className="text-xs text-zinc-500 font-medium">PrepX Feature Roadmap</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upcomingFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="p-5 rounded-2xl bg-[#0D0D14]/90 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3 shadow-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br border ${feat.color} shrink-0`}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {feat.title}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">Soon</span>
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-1">{feat.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Note */}
        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-300 flex items-center justify-center gap-2 max-w-xl mx-auto">
          <CheckCircle2 className="size-4 text-purple-400 shrink-0" />
          <span>In the meantime, feel free to use <strong>AI Voice Interviews</strong> & <strong>Resume Analyzer</strong>!</span>
        </div>

      </div>
    </div>
  );
}
