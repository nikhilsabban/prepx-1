import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link, Navigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { startInterview } from "../services/interviewService";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { Mic, Target, Briefcase, GraduationCap, Building, Loader2, X, ChevronRight, BarChart3, Terminal, Sparkles } from "lucide-react";

export function Form() {
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAuthenticated, user, isLoading, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Instant zero-flash redirect for logged-in users
  if (isAuthenticated && user?.id) {
    return <Navigate to={`/${user.id}`} replace />;
  }

  if (isLoading && token) {
    return null;
  }

  // Handle hash scrolling on mount
  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const id = location.hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100); // slight delay to allow animations to render
    }
  }, [location]);

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please login to start an interview");
      navigate("/login");
      return;
    }
    if (!githubUrl.trim()) {
      toast.error("Please enter a valid GitHub repository URL");
      return;
    }
    
    setLoading(true);
    try {
      const { id } = await startInterview({
        title: "GitHub Repository Practice",
        github: githubUrl.trim(),
        mode: "github",
      });
      toast.success("Interview created successfully!");
      navigate(`/interview/${id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to start interview");
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      {/* Background ambient glow */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <main className="relative z-10 pt-20 pb-32 px-6 max-w-7xl mx-auto space-y-40">
        
        {/* HERO SECTION */}
        <section className="text-center space-y-8 flex flex-col items-center pt-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-indigo-300 font-medium"
          >
            <Sparkles className="size-4" /> AI-Powered Interview Practice
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 max-w-4xl leading-tight"
          >
            Ace Your Next Interview <br className="hidden md:block"/> with AI Mock Interviews
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
          >
            Practice with a realistic AI interviewer that listens, responds in real-time, and helps you improve with personalized feedback.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4 pt-4"
          >
            <Button onClick={() => navigate(isAuthenticated ? "/ai-interview" : "/login")} className="h-12 px-8 text-base font-semibold bg-white text-black hover:bg-zinc-200 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer">
              Start Practicing Free <ChevronRight className="ml-1 size-4" />
            </Button>
            <a href="/#features">
              <Button variant="ghost" className="h-12 px-8 text-base font-semibold text-zinc-300 hover:text-white rounded-xl hover:bg-white/5 transition-all">
                View Features
              </Button>
            </a>
          </motion.div>

          {/* Stats Bar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12 md:mt-16 grid grid-cols-3 gap-2 sm:gap-8 p-4 sm:p-8 rounded-2xl md:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl w-full max-w-4xl"
          >
            {[ { v: "10+", l: "Interview Types" }, { v: "7+", l: "Top Companies" }, { v: "∞", l: "Practice Sessions" } ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1 text-center">
                <span className="text-2xl sm:text-4xl font-black text-white">{stat.v}</span>
                <span className="text-[10px] sm:text-sm font-medium text-zinc-400 uppercase tracking-wider">{stat.l}</span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="space-y-16 scroll-mt-24">
          <div className="text-center space-y-4">
            <h2 className="text-indigo-400 font-bold uppercase tracking-widest text-sm">Powerful Features</h2>
            <h3 className="text-3xl md:text-5xl font-bold text-white">Everything You Need to Succeed</h3>
            <p className="text-zinc-400 max-w-xl mx-auto text-lg">Practice realistic interviews powered by advanced AI technology</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Mic, title: "Real-time Voice AI", desc: "Speak naturally and get instant responses from our advanced AI interviewer with human-like conversation flow." },
              { icon: BarChart3, title: "Instant Feedback", desc: "Get detailed analysis of your responses with actionable tips to improve your interview performance." },
              { icon: Target, title: "10+ Interview Types", desc: "From technical coding to behavioral, academic to visa interviews - practice for any career path." }
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.05)" }}
                className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 transition-colors cursor-default"
              >
                <div className="size-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
                  <f.icon className="size-6" />
                </div>
                <h4 className="text-xl font-bold text-white mb-3">{f.title}</h4>
                <p className="text-zinc-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* INTERVIEW TYPES SECTION */}
        <section id="interview-types" className="space-y-16 scroll-mt-24">
          <div className="text-center space-y-4">
            <h2 className="text-indigo-400 font-bold uppercase tracking-widest text-sm">Choose Your Path</h2>
            <h3 className="text-3xl md:text-5xl font-bold text-white">Select Your Interview Type</h3>
            <p className="text-zinc-400 max-w-xl mx-auto text-lg">Customized practice for every career path and interview stage</p>
          </div>

          {/* Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-8 rounded-3xl bg-gradient-to-br from-indigo-900/40 to-black border border-indigo-500/30 flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 block">Popular</span>
                <h4 className="text-2xl font-bold text-white mb-2">Resume-Based Interview</h4>
                <p className="text-indigo-200/70 mb-8">Upload your CV and get personalized interview questions based on your actual experience</p>
              </div>
              <Button onClick={openModal} className="w-fit bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">Get Started</Button>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-8 rounded-3xl bg-gradient-to-br from-purple-900/40 to-black border border-purple-500/30 flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 block">Advanced</span>
                <h4 className="text-2xl font-bold text-white mb-2">Job Description Interview</h4>
                <p className="text-purple-200/70 mb-8">Paste a real job description and get a highly targeted interview matching the exact requirements</p>
              </div>
              <Button onClick={openModal} className="w-fit bg-purple-600 hover:bg-purple-500 text-white rounded-xl">Get Started</Button>
            </motion.div>
          </div>

          {/* Grid Categories */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
            {/* Roles */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="flex items-center gap-2 text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">
                <Briefcase className="size-5 text-indigo-400"/> Technical & Professional Roles
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[ 
                  { t: "Software Engineering & Backend", d: "Data structures, algorithms & system design" },
                  { t: "Frontend & Full Stack Developer", d: "React, Web performance, CSS & State management" },
                  { t: "DevOps & Cloud Engineer", d: "CI/CD pipelines, Docker, Kubernetes & AWS" },
                  { t: "Data Scientist & AI / ML Engineer", d: "Machine learning models, Python, SQL & statistics" },
                  { t: "Product Manager (Tech)", d: "Product strategy, roadmap & technical execution" },
                  { t: "Cybersecurity & InfoSec Specialist", d: "Network security, vulnerability & auth protocols" },
                  { t: "Mobile Developer (iOS / Android)", d: "Swift, Kotlin, Flutter & mobile architecture" },
                  { t: "QA & Automation Engineer", d: "Test suites, Selenium, Playwright & API testing" }
                ].map((r, i) => (
                  <div key={i} onClick={openModal} className="group p-4 rounded-2xl bg-zinc-900/60 hover:bg-white/5 border border-white/5 hover:border-indigo-500/40 transition-all cursor-pointer flex justify-between items-center">
                    <div>
                      <h5 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">{r.t}</h5>
                      <p className="text-sm text-zinc-500">{r.d}</p>
                    </div>
                    <ChevronRight className="size-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                ))}
              </div>
            </div>

            {/* Specialized Competency */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">
                <Target className="size-5 text-purple-400"/> Core Competencies
              </h4>
              {[ 
                { t: "System Design & Architecture", d: "Scalability, microservices & caching" },
                { t: "Behavioral & Leadership", d: "STAR method, team conflict & impact" },
                { t: "Live Coding & Algorithm Prep", d: "LeetCode-style real-time problem solving" },
                { t: "Job Description (JD) Alignment", d: "Targeted questions matching company JDs" }
              ].map((r, i) => (
                <div key={i} onClick={openModal} className="group p-4 rounded-2xl bg-zinc-900/60 hover:bg-white/5 border border-white/5 hover:border-purple-500/40 transition-all cursor-pointer flex justify-between items-center">
                  <div>
                    <h5 className="font-semibold text-white group-hover:text-purple-400 transition-colors">{r.t}</h5>
                    <p className="text-sm text-zinc-500">{r.d}</p>
                  </div>
                  <ChevronRight className="size-4 text-zinc-600 group-hover:text-purple-400 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* MODAL for GitHub URL Input */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl shadow-2xl p-8 overflow-hidden z-10"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <button onClick={closeModal} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
              
              <div className="mb-8">
                <div className="size-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                  <Terminal className="size-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Configure Your Interview</h3>
                <p className="text-zinc-400 text-sm">Enter a GitHub repository URL to provide context to your AI interviewer. We will analyze the repo and ask relevant technical questions.</p>
              </div>

              <form onSubmit={handleStartInterview} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">GitHub Repository URL</label>
                  <Input
                    type="url"
                    placeholder="https://github.com/username/repo"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    disabled={loading}
                    required
                    className="bg-black border-white/10 text-white h-12 focus-visible:ring-indigo-500 placeholder:text-zinc-600"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-12 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold text-sm"
                >
                  {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : "Start Interview"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
