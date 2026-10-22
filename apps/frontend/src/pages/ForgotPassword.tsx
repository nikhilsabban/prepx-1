import React, { useState } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "react-toastify";
import { Loader2, ArrowLeft } from "lucide-react";
import { forgotPassword } from "../services/authService";

import { getErrorMessage } from "../lib/utils";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your email.");
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPassword(email.trim());
      setIsSent(true);
      if (response.dev_link) {
        setDevLink(response.dev_link);
      }
      toast.success("Reset link generated successfully.");
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Couldn't send reset link. Try again."));
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
            Back to sign in
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Reset your password
          </h1>
          <p className="text-[#A3A3A3]">
            {isSent 
              ? "Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder."
              : "Enter the email linked to your account and we'll send you reset instructions."}
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

              {devLink && (
                <div className="mb-6 p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 text-left">
                  <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider mb-2">
                    Quick Reset (Direct Link)
                  </p>
                  <Link
                    to={(() => {
                      try {
                        return devLink.startsWith("http") ? new URL(devLink).pathname : devLink;
                      } catch (e) {
                        return devLink;
                      }
                    })()}
                    className="flex items-center justify-center w-full bg-[#2563EB] hover:bg-blue-600 text-white font-medium h-10 rounded-lg shadow-md transition-all text-sm active:scale-95"
                  >
                    Click Here to Set New Password Now &rarr;
                  </Link>
                </div>
              )}

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
