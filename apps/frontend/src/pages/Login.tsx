import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "react-toastify";
import { Loader2, Mail, Youtube, Twitter, Linkedin, Github } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

import { getErrorMessage } from "../lib/utils";
import { GOOGLE_CLIENT_ID, GITHUB_CLIENT_ID } from "../lib/config";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  type LoginMethod = "password" | "email_otp";
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("password");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const { user, isAuthenticated, isLoading, token, login, googleLogin, sendEmailOtp, verifyEmailOtp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const updateMousePosition = (ev: MouseEvent) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (otpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0 && interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpSent, resendTimer]);

  if (isAuthenticated && user?.id) {
    return <Navigate to={`/${user.id}`} replace />;
  }

  if (isLoading && token) {
    return null;
  }

  const handleGithubLogin = () => {
    const clientId = GITHUB_CLIENT_ID;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&state=github&scope=user:email`;
  };

  const handleMethodChange = (method: LoginMethod) => {
    setLoginMethod(method);
    setOtpSent(false);
    setOtp("");
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  async function handleSendEmailOtp() {
    if (!email.trim()) {
      toast.error("Enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await sendEmailOtp(email.trim());
      toast.success("Verification code sent. Check your inbox.");
      setOtpSent(true);
      setResendTimer(120);
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Couldn't send code. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmailOtp() {
    if (!otp.trim()) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const loggedUser = await verifyEmailOtp(email.trim(), otp.trim());
      toast.success("Signed in successfully.");
      if (loggedUser?.id) {
        navigate(`/${loggedUser.id}`, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error, "That code doesn't look right. Try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (loginMethod === "email_otp") {
      if (!otpSent) {
        await handleSendEmailOtp();
      } else {
        await handleVerifyEmailOtp();
      }
      return;
    }

    if (!email.trim() || !password) {
      toast.error("Please enter your email address and password.");
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login({ email: email.trim(), password });
      toast.success("Welcome back! Excited to have you here.");
      
      if (loggedUser?.id) {
        navigate(`/${loggedUser.id}`, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (error: any) {
      if (error.response?.status === 403 || error.response?.data?.requiresVerification) {
        toast.warn("Please verify your email address before logging in. Check your inbox for the verification link.");
      } else {
        toast.error(getErrorMessage(error, "Email or password is incorrect. Please verify and try again."));
      }
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
      
      <main className="flex-1 flex flex-col items-center justify-center pt-8 sm:pt-24 pb-16 sm:pb-32 px-4 sm:px-6 relative z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]">
        <div className="w-full max-w-[420px] bg-[#0F0F12] border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl relative">
          
          <div className="p-5 sm:p-8 pb-4 sm:pb-6 text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1.5 sm:mb-2">Welcome to <span className="text-[#2563EB]">prepX</span></h1>
            <p className="text-xs sm:text-sm text-[#A3A3A3]">Log in to access your dashboard!</p>
          </div>

          <div className="flex bg-[#1A1A1A] mx-4 sm:mx-8 rounded-lg p-1 text-xs font-medium border border-zinc-800/50">
            <button 
              onClick={() => handleMethodChange("password")}
              className={`flex-1 py-2 rounded-md transition-colors cursor-pointer ${loginMethod === "password" ? "bg-[#2a2a2a] text-white shadow-sm" : "text-[#A3A3A3] hover:text-white"}`}
              type="button"
            >
              Password
            </button>
            <button 
              onClick={() => handleMethodChange("email_otp")}
              className={`flex-1 py-2 rounded-md transition-colors cursor-pointer ${loginMethod === "email_otp" ? "bg-[#2a2a2a] text-white shadow-sm" : "text-[#A3A3A3] hover:text-white"}`}
              type="button"
            >
              Email OTP
            </button>
          </div>

          <div className="p-4 sm:p-8 pt-4 sm:pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || (loginMethod === "email_otp" && otpSent)}
                  required
                  placeholder="john@example.com"
                  className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md"
                />
              </div>

              {loginMethod === "email_otp" && otpSent && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="otp" className="text-xs font-medium text-white">Enter 6-digit OTP</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setResendTimer(0);
                      }}
                      className="text-xs text-[#2563EB] hover:underline cursor-pointer"
                    >
                      Change email
                    </button>
                  </div>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={loading}
                    required
                    placeholder="123456"
                    className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md tracking-widest font-mono text-center text-lg"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-zinc-500">Didn't receive OTP?</span>
                    {resendTimer > 0 ? (
                      <span className="text-xs text-zinc-400 font-mono">
                        Resend in {formatTimer(resendTimer)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendEmailOtp}
                        disabled={loading}
                        className="text-xs text-[#2563EB] hover:underline font-medium cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              )}

              {loginMethod === "password" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium text-white">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-[#2563EB] hover:underline">Forgot password?</Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    placeholder="••••••••"
                    className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563EB] hover:bg-blue-600 text-white font-medium h-11 rounded-lg mt-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : loginMethod === "password" ? (
                  "Sign in"
                ) : (
                  otpSent ? "Verify & Sign in" : "Send OTP"
                )}
              </Button>
            </form>

            <div className="mt-6 flex items-center">
              <div className="flex-1 border-t border-zinc-800"></div>
              <span className="px-3 text-xs text-zinc-500 uppercase tracking-wider font-medium">Or continue with</span>
              <div className="flex-1 border-t border-zinc-800"></div>
            </div>

            <div className="mt-6 flex justify-center items-center gap-4">
              {GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "MOCK_CLIENT_ID" ? (
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    if (credentialResponse.credential) {
                      setLoading(true);
                      try {
                        const user = await googleLogin(credentialResponse.credential, credentialResponse.clientId);
                        toast.success("Welcome back! You are now logged in with Google.");
                        if (user?.id) {
                          navigate(`/${user.id}`, { replace: true });
                        } else {
                          navigate("/", { replace: true });
                        }
                      } catch (error: any) {
                        toast.error(getErrorMessage(error, "Unable to sign in with Google. Please try again or use email sign-in."));
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  onError={() => {
                    toast.error("Unable to initialize Google Sign-In. Please use email sign-in.");
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
              No account?{" "}
              <Link to="/signup" className="text-[#2563EB] hover:underline">
                Sign up
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
