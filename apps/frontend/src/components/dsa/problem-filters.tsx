"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Tag as TagIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";

export function ProblemFilters({
  topics,
  tags = [],
}: {
  topics: { slug: string; name: string }[];
  tags?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === ALL) next.delete(key);
      else next.set(key, value);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router]
  );

  const clearAll = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  const activeTag = params.get("tag");
  const activeTopic = params.get("topic");
  const activeDiff = params.get("difficulty");
  const activeQ = params.get("q");
  const hasActiveFilters = Boolean(activeTag || activeTopic || activeDiff || activeQ);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            defaultValue={activeQ ?? ""}
            placeholder="Search by title, topic, or tag…"
            className="pl-9 bg-zinc-900/60 border-zinc-800"
            onKeyDown={(e) => {
              if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value);
            }}
          />
        </div>

        <Select
          value={activeTopic ?? ALL}
          onValueChange={(v) => setParam("topic", v)}
        >
          <SelectTrigger className="w-full sm:w-44 bg-zinc-900/60 border-zinc-800">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
            <SelectItem value={ALL}>All topics</SelectItem>
            {topics.map((t) => (
              <SelectItem key={t.slug} value={t.slug}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={activeDiff ?? ALL}
          onValueChange={(v) => setParam("difficulty", v)}
        >
          <SelectTrigger className="w-full sm:w-36 bg-zinc-900/60 border-zinc-800">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
            <SelectItem value={ALL}>Any difficulty</SelectItem>
            <SelectItem value="EASY">Easy</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HARD">Hard</SelectItem>
          </SelectContent>
        </Select>

        {tags.length > 0 && (
          <Select
            value={activeTag ?? ALL}
            onValueChange={(v) => setParam("tag", v)}
          >
            <SelectTrigger className="w-full sm:w-40 bg-zinc-900/60 border-zinc-800">
              <div className="flex items-center gap-1.5 truncate">
                <TagIcon className="size-3.5 text-zinc-400 shrink-0" />
                <SelectValue placeholder="Tag" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-h-72">
              <SelectItem value={ALL}>All tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Active filter badges / quick resets */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-zinc-500 font-medium">Active filters:</span>
          {activeTag && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium">
              <TagIcon className="size-3" />
              tag: {activeTag}
              <button
                onClick={() => setParam("tag", ALL)}
                className="hover:text-white transition-colors cursor-pointer"
                title="Remove tag filter"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {activeTopic && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium">
              topic: {activeTopic}
              <button
                onClick={() => setParam("topic", ALL)}
                className="hover:text-white transition-colors cursor-pointer"
                title="Remove topic filter"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {activeDiff && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium">
              diff: {activeDiff}
              <button
                onClick={() => setParam("difficulty", ALL)}
                className="hover:text-white transition-colors cursor-pointer"
                title="Remove difficulty filter"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {activeQ && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium">
              search: &quot;{activeQ}&quot;
              <button
                onClick={() => setParam("q", "")}
                className="hover:text-white transition-colors cursor-pointer"
                title="Remove search filter"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          <button
            onClick={clearAll}
            className="text-zinc-400 hover:text-white underline underline-offset-2 ml-1 cursor-pointer transition-colors"
          >
            Reset all
          </button>
        </div>
      )}
    </div>
  );
}
