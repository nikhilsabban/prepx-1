import React from "react";
import { Construction } from "lucide-react";

export function FeaturePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-[#000000] text-white p-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-zinc-900/50 border border-zinc-800 shadow-xl mb-6">
        <Construction className="size-10 text-blue-500" />
      </div>
      <h1 className="text-3xl font-bold mb-3">{title}</h1>
      <p className="text-zinc-400 max-w-md">{description}</p>
    </div>
  );
}
