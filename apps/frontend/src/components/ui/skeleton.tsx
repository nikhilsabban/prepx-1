import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-violet-500/10 border border-white/5 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl space-y-4 shadow-xl">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="pt-4 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto px-6 py-12">
      {/* Welcome Banner Skeleton */}
      <div className="p-8 rounded-3xl border border-white/10 bg-zinc-900/60 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="flex gap-4 pt-4">
          <Skeleton className="h-11 w-40 rounded-xl" />
          <Skeleton className="h-11 w-40 rounded-xl" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-2xl border border-white/10 bg-zinc-900/50 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Recent Interviews Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonHistory() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="space-y-4 pt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-2xl border border-white/10 bg-zinc-900/60 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div className="flex justify-between items-center pb-6 border-b border-white/10">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-white/10 bg-zinc-900/60 flex flex-col items-center space-y-4">
            <Skeleton className="size-24 rounded-full" />
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="p-6 rounded-2xl border border-white/10 bg-zinc-900/60 space-y-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
        <div className="lg:col-span-2 p-8 rounded-2xl border border-white/10 bg-zinc-900/60 space-y-6">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-6">
      <Skeleton className="size-16 rounded-2xl" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonCodingList() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 py-8 px-4 sm:px-6 lg:px-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Filter / Search Bar Skeleton */}
      <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-wrap gap-4 items-center justify-between">
        <Skeleton className="h-10 w-72 rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Problems Table / Cards Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 flex-1">
              <Skeleton className="size-7 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-60" />
                <div className="flex gap-2">
                  <Skeleton className="h-3.5 w-16 rounded" />
                  <Skeleton className="h-3.5 w-20 rounded" />
                  <Skeleton className="h-3.5 w-14 rounded" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCodingWorkspace() {
  return (
    <div className="h-[calc(100vh-64px)] bg-[#09090b] text-zinc-100 flex flex-col overflow-hidden">
      {/* Top Bar Skeleton */}
      <div className="h-14 border-b border-zinc-800 bg-zinc-900/80 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-28 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </div>

      {/* Split Pane Workspace Skeleton */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Problem Spec */}
        <div className="lg:col-span-5 p-6 border-r border-zinc-800 space-y-6 overflow-hidden">
          <div className="space-y-2">
            <Skeleton className="h-7 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-16 w-full rounded" />
          </div>
        </div>

        {/* Right Editor & Console */}
        <div className="lg:col-span-7 flex flex-col border-l border-zinc-800/60">
          <div className="h-10 border-b border-zinc-800 px-4 flex items-center gap-3">
            <Skeleton className="h-6 w-28 rounded" />
            <Skeleton className="h-6 w-24 rounded" />
          </div>
          <div className="flex-1 p-6 space-y-3 bg-zinc-950/60">
            <Skeleton className="h-4 w-60" />
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="h-44 border-t border-zinc-800 p-4 space-y-3 bg-zinc-900/50">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonGDList() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 py-8 px-4 sm:px-6 lg:px-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Banner Skeleton */}
      <div className="p-8 sm:p-10 rounded-3xl border border-zinc-800 bg-zinc-950/80 space-y-4">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-9 w-96 max-w-full" />
        <Skeleton className="h-4 w-3/4 max-w-2xl" />
        <div className="flex gap-4 pt-4">
          <Skeleton className="h-11 w-44 rounded-xl" />
          <Skeleton className="h-11 w-44 rounded-xl" />
        </div>
      </div>

      {/* Cards Grid Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="pt-3 border-t border-zinc-800/80 flex justify-between items-center">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonGDRoom() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-zinc-800 px-6 flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Room Body */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        <div className="lg:col-span-8 space-y-4 flex flex-col">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-video rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col justify-between">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="size-6 rounded-full" />
                </div>
                <div className="flex justify-center">
                  <Skeleton className="size-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-32 rounded" />
              </div>
            ))}
          </div>
          <div className="h-16 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 flex items-center justify-between">
            <div className="flex gap-2">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="size-10 rounded-full" />
            </div>
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="flex-1 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonBookmarks() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 min-h-screen space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Tabs Bar Skeleton */}
      <div className="flex gap-3 border-b border-zinc-800 pb-3">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      {/* Bookmarks Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-6 rounded-2xl bg-[#0D0D14] border border-zinc-800/80 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-24 rounded-lg" />
              <Skeleton className="size-6 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="pt-3 border-t border-zinc-800/80 flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonResult() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white py-8 px-4 sm:px-6 lg:px-8 space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl border border-zinc-800 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-3 flex-1 text-center sm:text-left">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-8 w-80 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="size-28 rounded-full border-4 border-zinc-800 p-2 flex items-center justify-center">
          <Skeleton className="size-20 rounded-full" />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>

      {/* Analysis Sections */}
      <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonResume() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white py-8 px-4 sm:px-6 lg:px-8 space-y-8 max-w-6xl mx-auto">
      <div className="p-8 rounded-3xl border border-zinc-800 bg-zinc-950/80 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4 flex flex-col items-center">
          <Skeleton className="size-36 rounded-full" />
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="lg:col-span-2 p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}


