import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router";
import axios from "axios";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";

import { BACKEND_URL } from "../lib/config";

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (token && email) {
      verifyToken();
    } else {
      setLoading(false);
      setSuccess(false);
      setMessage("Invalid verification link. Missing security token or email parameter.");
    }
  }, [token, email]);

  const verifyToken = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/auth/verify-email-link`, {
        token,
        email,
      });
      setSuccess(true);
      setMessage(res.data.message || "Your email address has been verified successfully!");
    } catch (err: any) {
      setSuccess(false);
      setMessage(err.response?.data?.message || "Verification failed or token expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
        {loading ? (
          <div className="space-y-4 py-8">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white">Verifying your email address...</h2>
            <p className="text-xs text-zinc-400">Please wait a moment while we validate your security token.</p>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Email Verified!</h2>
            <p className="text-sm text-zinc-300 leading-relaxed">{message}</p>
            <div className="pt-4">
              <Link to="/login">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer">
                  Sign In to PrepX <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
              <XCircle className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Verification Failed</h2>
            <p className="text-sm text-rose-300 leading-relaxed">{message}</p>
            <div className="pt-4">
              <Link to="/login">
                <Button variant="outline" className="w-full border-zinc-700 bg-zinc-800/60 text-zinc-200 hover:text-white hover:bg-zinc-800 rounded-xl h-11 transition-all">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

