import React from "react";
import { Link } from "react-router";
import { 
  Sparkles, 
  Target, 
  BrainCircuit, 
  Users, 
  ShieldCheck, 
  Zap, 
  Award, 
  CheckCircle2, 
  ArrowRight,
  Cpu,
  Mic,
  BarChart3
} from "lucide-react";
import { Button } from "../components/ui/button";

export function AboutUs() {
  return (
    <div className="min-h-screen bg-[#09090b] text-foreground flex flex-col selection:bg-violet-500/30">
      {/* Background glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 size-[500px] rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="absolute top-1/2 -right-40 size-[500px] rounded-full bg-indigo-600/10 blur-[140px]" />
      </div>

      <main className="relative z-10 flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-400">
            <Sparkles className="size-3.5" />
            <span>Empowering Next-Gen Talent</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Empowering Professional <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">Engineering Careers</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            <span className="font-semibold text-white">prepX</span> is an AI-powered mock interview platform crafted specifically for software engineers, backend developers, frontend architects, data scientists, DevOps leaders, and technical product managers.
          </p>
        </section>

        {/* Mission & Vision Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl border border-border/80 bg-card/40 backdrop-blur-xl relative overflow-hidden space-y-4 hover:border-violet-500/40 transition-colors">
            <div className="size-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
              <Target className="size-6" />
            </div>
            <h2 className="text-2xl font-bold text-white">Our Mission</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              To eliminate interview anxiety and technical gaps by giving every candidate personalized, real-time mock interviews powered by state-of-the-art Voice AI and Groq LLM evaluation models.
            </p>
          </div>

          <div className="p-8 rounded-3xl border border-border/80 bg-card/40 backdrop-blur-xl relative overflow-hidden space-y-4 hover:border-purple-500/40 transition-colors">
            <div className="size-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <BrainCircuit className="size-6" />
            </div>
            <h2 className="text-2xl font-bold text-white">Our Vision</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              A world where candidate preparation is governed by objective skill analysis, speech clarity feedback, and actionable guidance rather than guesswork.
            </p>
          </div>
        </section>

        {/* Core Pillars / Key Features */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Why Candidates Choose prepX</h2>
            <p className="text-sm text-zinc-400">Advanced AI capabilities designed for maximum interview readiness</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-md space-y-3">
              <div className="size-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
                <Mic className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Speech & Delivery Analysis</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Measures Speech Clarity score, Filler Words count, Mumbling level, and Speaking Pace to refine your vocal delivery.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-md space-y-3">
              <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Cpu className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-white">3 Interview Modes</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Tailor interviews by GitHub Repo, 500+ Software & Engineering Roles, or custom Job Descriptions (JD).
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-md space-y-3">
              <div className="size-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <BarChart3 className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Ideal Answer Suggestions</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Receive concept badges and detailed step-by-step model answer suggestions after every interview session.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-md space-y-3">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Anti-Cheating Device Guard</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Secures active sessions with single-device enforcement to guarantee authentic candidate evaluations.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-md space-y-3">
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Users className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Academic Database Search</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Integrated database of UGC autonomous colleges, IITs, NITs, and global universities for academic profiling.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-md space-y-3">
              <div className="size-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <Zap className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Real-Time Voice AI</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Low-latency Speech-to-Text and Text-to-Speech interaction simulating a real human interviewer.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-900/40 via-purple-900/30 to-indigo-900/40 p-8 sm:p-12 text-center space-y-6 backdrop-blur-xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to ace your next technical interview?</h2>
          <p className="text-sm text-zinc-300 max-w-xl mx-auto">
            Start a free mock interview session tailored to your role, GitHub repository, or job description.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <Link to="/ai-interview">
              <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm px-6 h-11 rounded-xl shadow-lg shadow-violet-500/25 gap-2">
                <span>Start AI Interview</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
