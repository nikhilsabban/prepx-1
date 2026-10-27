import React from "react";
import { useParams, useLocation, Link } from "react-router";
import { getProblem, visibleStarters } from "@/data/dsa";
import { ProblemDetailLayout } from "@/components/dsa/problem-detail-layout";
import { ProblemInfoTabs } from "@/components/dsa/problem-info-tabs";
import { ProblemDescription, ProblemEditorial } from "@/components/dsa/problem-info";
import { ProblemHints } from "@/components/dsa/problem-hints";
import { ProblemNotes } from "@/components/dsa/problem-notes";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { ArrowLeft } from "lucide-react";

import { NativeSystemDesign } from "./NativeSystemDesign";

const SYSTEM_DESIGN_SLUGS = [
  "scalability",
  "tinyurl",
  "rate-limiter",
  "chat-app",
  "distributed-cache",
  "video-streaming",
  "notification-system",
];

export function NativeProblemDetail() {
  const params = useParams<Record<string, string>>();
  const location = useLocation();

  // Robust slug resolution across /coding/dsa/:slug and /:userId/coding/dsa/:slug
  let slug = params.slug;
  if (!slug && params["*"]) {
    const parts = params["*"].split("/").filter(Boolean);
    slug = parts[parts.length - 1];
  }
  if (!slug) {
    const match = location.pathname.match(/\/dsa\/([^\/?#]+)/);
    if (match) slug = match[1];
  }

  // Handle system design slugs smoothly
  if (slug && SYSTEM_DESIGN_SLUGS.includes(slug.toLowerCase())) {
    return <NativeSystemDesign initialSlug={slug.toLowerCase()} />;
  }

  const problem = slug ? getProblem(slug) : null;
  const backUrl = params.userId ? `/${params.userId}/coding` : "/coding";

  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <h2 className="text-2xl font-bold text-foreground">Problem not found</h2>
        <p className="text-muted-foreground text-sm">
          The requested problem &quot;{slug}&quot; does not exist or has been moved.
        </p>
        <Link
          to={backUrl}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all duration-150 active:scale-95"
        >
          <ArrowLeft className="size-4" />
          Back to DSA Catalog
        </Link>
      </div>
    );
  }

  const info = (
    <ProblemInfoTabs
      slug={problem.slug}
      description={
        <ProblemDescription
          slug={problem.slug}
          title={problem.title}
          difficulty={problem.difficulty}
          tags={problem.tags}
          statement={problem.statement}
          constraints={problem.constraints}
          examples={problem.examples}
          youtubeUrl={problem.youtubeUrl}
        />
      }
      editorial={
        <ProblemEditorial
          editorial={problem.editorial}
          approaches={problem.approaches}
          complexityTime={problem.complexityTime}
          complexitySpace={problem.complexitySpace}
        />
      }
      hints={<ProblemHints hints={problem.hints} />}
      notes={<ProblemNotes slug={problem.slug} />}
    />
  );

  const workspace = (
    <EditorWorkspace
      slug={problem.slug}
      title={problem.title}
      difficulty={problem.difficulty}
      starterCode={visibleStarters(problem)}
    />
  );

  return <ProblemDetailLayout info={info} workspace={workspace} />;
}
