import React from "react";
import { useSearchParams, Link } from "react-router";
import { Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";

export const VerifyEmailPendingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "your Gmail address";

  return (
    <div className="min-h-[85vh] bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
        
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
          <Mail className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Verify Your Email Address</h2>
          <p className="text-sm text-zinc-300">
            Account created successfully! We sent a verification link to:
          </p>
          <div className="py-2 px-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-indigo-400 font-mono inline-block break-all shadow-inner">
            {email}
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4.5 text-xs text-zinc-400 text-left space-y-2.5">
          <div className="flex items-start gap-2 text-zinc-200 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Next Steps:
          </div>
          <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
            <li>Open your <strong>Gmail Inbox</strong> (or check Spam folder).</li>
            <li>Click the <strong>Verify Email Address</strong> link in the message.</li>
            <li>Once verified, click the button below to sign in.</li>
          </ol>
        </div>

        <div className="pt-2 space-y-3">
          <Link to="/login">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer">
              Sign In to Your Account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
};

