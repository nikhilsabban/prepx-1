import React, { useEffect } from "react";
import { useGamification } from "../../context/GamificationContext";
import { Trophy, Sparkles, Award, Zap, X, ArrowRight } from "lucide-react";

export function CelebrationModal() {
  const { celebration, closeCelebration, openHub } = useGamification();

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => {
      closeCelebration();
    }, 6000);
    return () => clearTimeout(timer);
  }, [celebration, closeCelebration]);

  if (!celebration) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={closeCelebration}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-indigo-500/40 bg-zinc-950/95 p-6 sm:p-8 text-center shadow-2xl shadow-indigo-500/30 backdrop-blur-2xl animate-in zoom-in-95 duration-200 z-10">
        {/* Glow ambient background effects */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-48 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 size-40 rounded-full bg-purple-500/20 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={closeCelebration}
          className="absolute right-4 top-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {/* Dynamic Animated Trophy / Sparkle Icon */}
        <div className="relative mx-auto mb-5 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 shadow-xl shadow-indigo-500/40 ring-4 ring-indigo-500/20 animate-bounce">
          <Trophy className="size-10 text-white drop-shadow-md" />
          <Sparkles className="absolute -top-2 -right-2 size-6 text-amber-300 animate-spin" />
        </div>

        {/* Title & Subtitle */}
        <h3 className="text-2xl font-black tracking-tight text-white sm:text-3xl bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
          {celebration.title}
        </h3>
        {celebration.subtitle && (
          <p className="mt-2 text-sm text-zinc-400 font-medium">
            {celebration.subtitle}
          </p>
        )}

        {/* XP Reward Pill */}
        {celebration.xpEarned && celebration.xpEarned > 0 && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-bold text-amber-300 shadow-inner">
            <Zap className="size-4 fill-amber-400 text-amber-400" />
            <span>+{celebration.xpEarned} Experience Points</span>
          </div>
        )}

        {/* Badge Unlocked Notification Card */}
        {celebration.badgeEarned && (
          <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-3 text-left flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
              <Award className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">Badge Unlocked</p>
              <p className="text-sm font-bold text-white">{celebration.badgeEarned}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={() => {
              closeCelebration();
              openHub("overview");
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 active:scale-98 transition cursor-pointer"
          >
            <span>Open Gamification Hub</span>
            <ArrowRight className="size-3.5" />
          </button>
          <button
            onClick={closeCelebration}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
          >
            Continue Practice
          </button>
        </div>
      </div>
    </div>
  );
}
export default CelebrationModal;
