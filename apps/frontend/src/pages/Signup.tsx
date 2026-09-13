import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Youtube, Twitter, Linkedin, Github, Sparkles } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import api from "../services/api";

export function Signup() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    college: "",
    branch: "",
    degree: "",
    graduationYear: "",
    profilePicture: "",
  });

  const [loading, setLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // College & University Auto-Search State (DB + AI)
  const [collegeDbResults, setCollegeDbResults] = useState<string[]>([]);
  const [collegeAiSuggestions, setCollegeAiSuggestions] = useState<string[]>([]);
  const [searchingCollege, setSearchingCollege] = useState(false);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const debounceTimerRef = useRef<any>(null);

  // Branch Auto-Search State (DB + AI)
  const [branchDbResults, setBranchDbResults] = useState<string[]>([]);
  const [branchAiSuggestions, setBranchAiSuggestions] = useState<string[]>([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const branchDebounceTimerRef = useRef<any>(null);

  const handleBranchInputChange = (val: string) => {
    if (branchDebounceTimerRef.current) clearTimeout(branchDebounceTimerRef.current);
    if (!val.trim()) {
      setBranchDbResults([]);
      setBranchAiSuggestions([]);
      setShowBranchDropdown(false);
      return;
    }

    setShowBranchDropdown(true);

    branchDebounceTimerRef.current = setTimeout(async () => {
      const query = val.trim();
      try {
        const dbRes = await api.get(`/api/auth/search-branches-db?q=${encodeURIComponent(query)}`);
        if (dbRes.data?.success) {
          setBranchDbResults(dbRes.data.dbResults || []);
        }
      } catch (err) {
        console.warn("Branch DB search error:", err);
      }

      try {
        const aiRes = await api.get(`/api/auth/search-branches-ai?q=${encodeURIComponent(query)}`);
        if (aiRes.data?.success) {
          setBranchAiSuggestions(aiRes.data.aiSuggestions || []);
        }
      } catch (err) {
        console.warn("Branch AI search error:", err);
      }
    }, 200);
  };

  const selectBranch = (branchName: string) => {
    setFormData((prev) => ({ ...prev, branch: branchName }));
    setShowBranchDropdown(false);
  };

  // Degree Auto-Search State (DB + AI)
  const [degreeDbResults, setDegreeDbResults] = useState<string[]>([]);
  const [degreeAiSuggestions, setDegreeAiSuggestions] = useState<string[]>([]);
  const [showDegreeDropdown, setShowDegreeDropdown] = useState(false);
  const degreeDebounceTimerRef = useRef<any>(null);

  const handleDegreeInputChange = (val: string) => {
    if (degreeDebounceTimerRef.current) clearTimeout(degreeDebounceTimerRef.current);
    if (!val.trim()) {
      setDegreeDbResults([]);
      setDegreeAiSuggestions([]);
      setShowDegreeDropdown(false);
      return;
    }

    setShowDegreeDropdown(true);

    degreeDebounceTimerRef.current = setTimeout(async () => {
      const query = val.trim();
      try {
        const dbRes = await api.get(`/api/auth/search-degrees-db?q=${encodeURIComponent(query)}`);
        if (dbRes.data?.success) {
          setDegreeDbResults(dbRes.data.dbResults || []);
        }
      } catch (err) {
        console.warn("Degree DB search error:", err);
      }

      try {
        const aiRes = await api.get(`/api/auth/search-degrees-ai?q=${encodeURIComponent(query)}`);
        if (aiRes.data?.success) {
          setDegreeAiSuggestions(aiRes.data.aiSuggestions || []);
        }
      } catch (err) {
        console.warn("Degree AI search error:", err);
      }
    }, 200);
  };

  const selectDegree = (degreeName: string) => {
    setFormData((prev) => ({ ...prev, degree: degreeName }));
    setShowDegreeDropdown(false);
  };

  const handleCollegeInputChange = (val: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!val.trim()) {
      setCollegeDbResults([]);
      setCollegeAiSuggestions([]);
      setShowCollegeDropdown(false);
      return;
    }

    setShowCollegeDropdown(true);

    // Debounce fast DB lookup & background AI lookup
    debounceTimerRef.current = setTimeout(async () => {
      const query = val.trim();
      setSearchingCollege(true);

      // Stage 1: Fast Database Search (<50ms)
      try {
        const dbRes = await api.get(`/api/auth/search-colleges-db?q=${encodeURIComponent(query)}`);
        if (dbRes.data?.success) {
          setCollegeDbResults(dbRes.data.dbResults || []);
        }
      } catch (err) {
        console.warn("College DB search error:", err);
      }

      // Stage 2: Silent AI Recommendation Search in Background
      try {
        const aiRes = await api.get(`/api/auth/search-colleges-ai?q=${encodeURIComponent(query)}`);
        if (aiRes.data?.success) {
          setCollegeAiSuggestions(aiRes.data.aiSuggestions || []);
        }
      } catch (err) {
        console.warn("College AI search error:", err);
      } finally {
        setSearchingCollege(false);
      }
    }, 200);
  };

  const selectCollege = (collegeName: string) => {
    setFormData((prev) => ({ ...prev, college: collegeName }));
    setShowCollegeDropdown(false);
  };

  const { user, isAuthenticated, isLoading, token, signup, googleLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const updateMousePosition = (ev: MouseEvent) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);

  // Instant zero-flash redirect for logged-in users (after all hooks)
  if (isAuthenticated && user?.id) {
    return <Navigate to={`/${user.id}`} replace />;
  }

  if (isLoading && token) {
    return null;
  }

  const handleGithubLogin = () => {
    // @ts-ignore
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || "MOCK_GITHUB_CLIENT_ID";
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&state=github&scope=user:email`;
  };

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password) {
      toast.error("Full Name, Email, and Password are required.");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const user = await signup({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        college: formData.college.trim(),
        branch: formData.branch.trim(),
        degree: formData.degree.trim(),
        graduationYear: formData.graduationYear.trim(),
        profilePicture: formData.profilePicture.trim(),
      });
      toast.success("Account created successfully! Welcome aboard.");
      if (user?.id) {
        navigate(`/${user.id}`);
      } else {
        navigate("/");
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to create account. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col font-sans overflow-x-hidden relative">
      {/* Cursor spotlight effect */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.06), transparent 80%)`,
        }}
      />
      
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-32 px-6 relative z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]">
        <div className="w-full max-w-xl bg-[#0F0F12] border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl relative">
          
          <div className="p-8 pb-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Create Your <span className="text-[#2563EB]">prepX</span> Account</h1>
            <p className="text-sm text-[#A3A3A3]">Join prepX to track your technical interviews.</p>
          </div>

          <div className="p-8 pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-medium text-white">Full Name *</Label>
                  <Input
                    id="fullName" name="fullName" type="text"
                    placeholder="John Doe"
                    value={formData.fullName} onChange={handleChange}
                    disabled={loading} required
                    className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-white">Email Address *</Label>
                  <Input
                    id="email" name="email" type="email"
                    placeholder="john@example.com"
                    value={formData.email} onChange={handleChange}
                    disabled={loading} required
                    className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-white">Password *</Label>
                  <Input
                    id="password" name="password" type="password"
                    placeholder="••••••••"
                    value={formData.password} onChange={handleChange}
                    disabled={loading} required
                    className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-white">Confirm Password *</Label>
                  <Input
                    id="confirmPassword" name="confirmPassword" type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword} onChange={handleChange}
                    disabled={loading} required
                    className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md"
                  />
                </div>
              </div>

              <div className="pt-4 pb-2">
                <span className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider">
                  Academic & Profile Info
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <Label htmlFor="college" className="text-xs font-medium text-white">
                    College / University
                  </Label>
                  <Input
                    id="college" name="college" type="text"
                    placeholder="Search college or university (e.g. Stanford, MIT, IIT)..."
                    value={formData.college}
                    onChange={(e) => {
                      handleChange(e);
                      handleCollegeInputChange(e.target.value);
                    }}
                    onFocus={() => setShowCollegeDropdown(true)}
                    disabled={loading}
                    className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md"
                  />

                  {/* College Live Search Dropdown */}
                  {showCollegeDropdown && (collegeDbResults.length > 0 || collegeAiSuggestions.length > 0) && (
                    <div className="absolute z-50 left-0 right-0 top-[68px] bg-[#121218] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto p-1.5 space-y-2 text-xs">
                      {collegeDbResults.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-1 font-mono flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-emerald-400"></span> Database Matches
                          </p>
                          {collegeDbResults.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => selectCollege(c)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      )}

                      {collegeAiSuggestions.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider px-2.5 py-1 font-mono flex items-center gap-1">
                            <Sparkles className="size-3" /> AI Recommended Colleges
                          </p>
                          {collegeAiSuggestions.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => selectCollege(c)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-500/10 text-purple-200 hover:text-white transition-colors cursor-pointer"
                            >
                              <span>{c}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 relative">
                  <Label htmlFor="branch" className="text-xs font-medium text-white">Branch / Department</Label>
                  <Input
                    id="branch" name="branch" type="text"
                    placeholder="Search branch or department (e.g. Computer Science)..."
                    value={formData.branch}
                    onChange={(e) => {
                      handleChange(e);
                      handleBranchInputChange(e.target.value);
                    }}
                    onFocus={() => setShowBranchDropdown(true)}
                    disabled={loading}
                    className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md"
                  />

                  {showBranchDropdown && (branchDbResults.length > 0 || branchAiSuggestions.length > 0) && (
                    <div className="absolute z-50 left-0 right-0 top-[68px] bg-[#121218] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto p-1.5 space-y-2 text-xs">
                      {branchDbResults.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-1 font-mono flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-emerald-400"></span> Database Matches
                          </p>
                          {branchDbResults.map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => selectBranch(b)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      )}

                      {branchAiSuggestions.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider px-2.5 py-1 font-mono flex items-center gap-1">
                            <Sparkles className="size-3" /> Recommended Branches
                          </p>
                          {branchAiSuggestions.map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => selectBranch(b)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-500/10 text-purple-200 hover:text-white transition-colors cursor-pointer"
                            >
                              <span>{b}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <Label htmlFor="degree" className="text-xs font-medium text-white">Degree</Label>
                  <Input
                    id="degree" name="degree" type="text"
                    placeholder="Search degree (e.g. B.Tech, M.S., Ph.D.)..."
                    value={formData.degree}
                    onChange={(e) => {
                      handleChange(e);
                      handleDegreeInputChange(e.target.value);
                    }}
                    onFocus={() => setShowDegreeDropdown(true)}
                    disabled={loading}
                    className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md"
                  />

                  {showDegreeDropdown && (degreeDbResults.length > 0 || degreeAiSuggestions.length > 0) && (
                    <div className="absolute z-50 left-0 right-0 top-[68px] bg-[#121218] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto p-1.5 space-y-2 text-xs">
                      {degreeDbResults.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-1 font-mono flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-emerald-400"></span> Database Matches
                          </p>
                          {degreeDbResults.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => selectDegree(d)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      )}

                      {degreeAiSuggestions.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider px-2.5 py-1 font-mono flex items-center gap-1">
                            <Sparkles className="size-3" /> Recommended Degrees
                          </p>
                          {degreeAiSuggestions.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => selectDegree(d)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-500/10 text-purple-200 hover:text-white transition-colors cursor-pointer"
                            >
                              <span>{d}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                      <Label htmlFor="graduationYear" className="text-xs font-medium text-white">Graduation Year</Label>
                      <Input
                        id="graduationYear" name="graduationYear" type="date"
                        placeholder="Select graduation date"
                        value={formData.graduationYear} onChange={handleChange}
                        disabled={loading}
                        className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md"
                      />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profilePicture" className="text-xs font-medium text-white">Profile Picture URL (Optional)</Label>
                <Input
                  id="profilePicture" name="profilePicture" type="url"
                  placeholder="https://images.unsplash.com/... or avatar link"
                  value={formData.profilePicture} onChange={handleChange}
                  disabled={loading}
                  className="bg-white text-black border-0 focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-400"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563EB] hover:bg-blue-600 text-white font-medium h-11 rounded-lg mt-6 shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
              >
                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 flex items-center">
              <div className="flex-1 border-t border-zinc-800"></div>
              <span className="px-3 text-xs text-zinc-500 uppercase tracking-wider font-medium">Or continue with</span>
              <div className="flex-1 border-t border-zinc-800"></div>
            </div>

            <div className="mt-6 flex justify-center items-center gap-4">
              {import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_CLIENT_ID !== "MOCK_CLIENT_ID" ? (
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    if (credentialResponse.credential) {
                      setLoading(true);
                      try {
                        const user = await googleLogin(credentialResponse.credential, credentialResponse.clientId);
                        toast.success("Account created successfully with Google!");
                        if (user?.id) {
                          navigate(`/${user.id}`);
                        } else {
                          navigate("/");
                        }
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || "Google authentication failed");
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  onError={() => {
                    toast.error("Google origin error: Add http://localhost:5173 to Authorized JavaScript origins in Google Cloud Console");
                  }}

                  theme="filled_black"
                  shape="circle"
                  type="icon"
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    toast.info("Add VITE_GOOGLE_CLIENT_ID to apps/frontend/.env to enable Google OAuth");
                  }}
                  className="bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 h-10 w-10 p-0 rounded-full flex items-center justify-center transition-all shadow-sm cursor-pointer"
                >
                  <svg className="size-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleGithubLogin}
                className="bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 hover:text-white h-10 w-10 p-0 rounded-full flex items-center justify-center transition-all shadow-sm"
              >
                <Github className="size-5" />
              </Button>
            </div>


            <div className="mt-6 text-center text-xs text-[#A3A3A3]">
              Already have an account?{" "}
              <Link to="/login" className="text-[#2563EB] hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* SUPPORT SECTION */}
      <section className="py-20 px-6 text-center max-w-3xl mx-auto border-t border-zinc-900 w-full">
          <p className="text-[#2563EB] font-bold text-[10px] tracking-widest uppercase mb-2">STUDENT SUPPORT</p>
          <h2 className="text-4xl font-extrabold text-white mb-4">Need <span className="text-[#2563EB]">help?</span></h2>
          <p className="text-[#A3A3A3] mb-8 leading-relaxed text-sm">
              Have a question or need assistance? Email us at <a href="mailto:aixprepx@gmail.com" className="text-[#2563EB] font-medium hover:underline">aixprepx@gmail.com</a>, and our support team will get back to you within <span className="text-white font-bold">24 hours</span>.
          </p>
          <a href="mailto:aixprepx@gmail.com" className="inline-flex items-center justify-center bg-white text-black hover:bg-zinc-200 border-0 rounded-md px-6 h-10 font-semibold mx-auto transition-colors">
              <Mail className="size-4 mr-2" /> Email support
          </a>
      </section>
    </div>
  );
}
