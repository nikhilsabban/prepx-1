import React from "react";
import { useSearchParams } from "react-router";
import { Code2, Tag as TagIcon } from "lucide-react";
import { filterProblems, problems as allProblems, topics, allTags, type Difficulty } from "@/data/dsa";
import { PageHeader } from "@/components/design-system/page-header";
import { DsaProgress } from "@/components/dsa/dsa-progress";
import { ProblemFilters } from "@/components/dsa/problem-filters";
import { ProblemList } from "@/components/dsa/problem-list";
import { EmptyState } from "@/components/design-system/empty-state";

const catalog = allProblems.map((p) => ({
  slug: p.slug,
  difficulty: p.difficulty,
  topicSlug: p.topic.slug,
}));

const topicMeta = topics.map((t) => ({
  slug: t.slug,
  name: t.name,
  problemCount: t.problemCount,
}));

export function NativeDsaCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const topic = searchParams.get("topic") || undefined;
  const rawDifficulty = searchParams.get("difficulty") || undefined;
  const q = searchParams.get("q") || undefined;
  const tag = searchParams.get("tag") || undefined;

  const difficulty = ["EASY", "MEDIUM", "HARD"].includes(rawDifficulty ?? "")
    ? (rawDifficulty as Difficulty)
    : undefined;

  const problems = filterProblems({
    topicSlug: topic,
    difficulty,
    search: q,
    tag,
  });

  const handleTagClick = (clickedTag: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (clickedTag === "all" || tag?.toLowerCase() === clickedTag.toLowerCase()) {
      next.delete("tag");
    } else {
      next.set("tag", clickedTag);
    }
    setSearchParams(next);
  };

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <PageHeader
        title="DSA Problems"
        description={`${problems.length} curated problems · master algorithms and technical interview patterns.`}
      />

      <DsaProgress problems={catalog} catalog={catalog} topics={topicMeta} />

      <ProblemFilters topics={topicMeta} tags={allTags} />

      {/* Interactive Tag Pills Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium shrink-0 mr-1">
          <TagIcon className="size-3.5 text-zinc-400" />
          <span>All Tags:</span>
        </div>
        <button
          onClick={() => handleTagClick("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer ${
            !tag
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
          }`}
        >
          All Tags ({allProblems.length})
        </button>
        {allTags.map((t) => {
          const count = allProblems.filter((p) => p.tags?.includes(t)).length;
          const isSelected = tag?.toLowerCase() === t.toLowerCase();
          return (
            <button
              key={t}
              onClick={() => handleTagClick(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              <span>{t}</span>
              <span className={`text-[10px] ${isSelected ? "text-indigo-200" : "text-zinc-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {problems.length > 0 ? (
        <ProblemList problems={problems} />
      ) : (
        <EmptyState
          icon={Code2}
          title="No problems matched your filters"
          description="Try broadening your search or resetting difficulty, topic, and tag filters."
        />
      )}
    </div>
  );
}
