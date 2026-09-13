import React, { useState } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { forgotPassword } from "../services/authService";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPassword(email.trim());
      setIsSent(true);
      toast.success(response.message || "Reset link sent!");
      
      // For local testing convenience without SMTP:
      if (response.dev_link) {
        console.log("Dev reset link:", response.dev_link);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center pt-24 pb-20 px-6 min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link to="/login" className="inline-flex items-center text-sm text-zinc-400 hover:text-white transition-colors mb-6">
            <ArrowLeft className="size-4 mr-2" />
            Back to login
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Forgot Password?
          </h1>
          <p className="text-[#A3A3A3]">
            {isSent 
              ? "Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder."
              : "No worries, we'll send you reset instructions."}
          </p>
        </div>

        <div className="bg-[#111] border border-white/5 p-8 rounded-2xl shadow-xl">
          {!isSent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-white">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  placeholder="name@example.com"
                  className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563EB] hover:bg-blue-600 text-white font-medium h-11 rounded-lg mt-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
              >
                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : "Reset Password"}
              </Button>
            </form>
          ) : (
            <div className="text-center">
              <div className="size-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Check your email</h3>
              <p className="text-zinc-400 text-sm mb-6">
                We sent a password reset link to <br/>
                <span className="text-white font-medium">{email}</span>
              </p>
              <Button
                onClick={() => setIsSent(false)}
                variant="outline"
                className="w-full bg-transparent border-white/10 text-white hover:bg-white/5 h-11 rounded-lg"
              >
                Didn't receive the email? Click to resend
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
