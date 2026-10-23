// Static DSA catalog — the single source of truth for topics, problems, and
// test cases. Everything is authored TypeScript (see ./problems/*), assembled
// once at module load; expected outputs come from running each problem's
// reference solution over its test inputs.

import { dsaTopics } from "./topics";
import type {
  Difficulty,
  SeedProblem,
  SeedTopic,
  StarterLanguage,
} from "./types";

export type { Difficulty } from "./types";

export type TestCase = {
  input: string;
  expectedOutput: string;
  isSample: boolean;
};

export type Problem = Omit<SeedProblem, "reference" | "tests"> & {
  id: string;
  topic: { slug: string; name: string };
  testCases: TestCase[];
};

export type Topic = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  problemCount: number;
};

function buildProblem(topic: SeedTopic, p: SeedProblem): Problem {
  const { reference, tests, ...rest } = p;
  return {
    ...rest,
    id: p.slug,
    topic: { slug: topic.slug, name: topic.name },
    testCases: tests.map((t) => ({
      input: t.input,
      expectedOutput: reference(t.input),
      isSample: !!t.sample,
    })),
  };
}

const orderedTopics = [...dsaTopics].sort((a, b) => a.order - b.order);

export const topics: Topic[] = orderedTopics.map((t) => ({
  slug: t.slug,
  name: t.name,
  description: t.description,
  icon: t.icon,
  order: t.order,
  problemCount: t.problems.length,
}));

export const problems: Problem[] = orderedTopics.flatMap((t) =>
  t.problems.map((p) => buildProblem(t, p))
);

const problemsBySlug = new Map(problems.map((p) => [p.slug, p]));

export function getProblem(slug: string): Problem | null {
  return problemsBySlug.get(slug) ?? null;
}

/** Editor-facing starter code — the solution function only, no driver. */
export function visibleStarters(p: Problem): Record<StarterLanguage, string> {
  return {
    python: p.starterCode.python.visible,
    javascript: p.starterCode.javascript.visible,
    java: p.starterCode.java.visible,
    cpp: p.starterCode.cpp.visible,
  };
}

/** Stitch the hidden stdin/stdout driver back around the learner's code. */
export function assembleSource(
  p: Problem,
  language: string,
  code: string
): string {
  const snippet = p.starterCode[language as StarterLanguage];
  return snippet ? snippet.prefix + code + snippet.suffix : code;
}

export type ProblemFilters = {
  topicSlug?: string;
  difficulty?: Difficulty;
  search?: string;
  tag?: string;
};

export const allTags: string[] = Array.from(
  new Set(problems.flatMap((p) => p.tags || []))
).sort();

export function filterProblems(filters: ProblemFilters = {}): Problem[] {
  const { topicSlug, difficulty, search, tag } = filters;
  const q = search?.trim().toLowerCase();
  const targetTag = tag?.trim().toLowerCase();
  return problems.filter((p) => {
    if (topicSlug && p.topic.slug !== topicSlug) return false;
    if (difficulty && p.difficulty !== difficulty) return false;
    if (targetTag && !p.tags?.some((t) => t.toLowerCase() === targetTag)) return false;
    if (q) {
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchTopic = p.topic.name.toLowerCase().includes(q);
      const matchTags = p.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchTopic && !matchTags) return false;
    }
    return true;
  });
}
