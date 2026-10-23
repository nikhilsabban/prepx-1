import React from "react";
import { ReviewQueue } from "@/components/review/review-queue";
import { problems as allProblems } from "@/data/dsa";
import { PageHeader } from "@/components/design-system/page-header";

const reviewProblems = allProblems.map((p) => ({
  slug: p.slug,
  title: p.title,
  difficulty: p.difficulty,
  topicName: p.topic.name,
}));

export function NativeReview() {
  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Spaced Repetition Review Queue"
        description="Review previously solved algorithm patterns before they fade from memory."
      />
      <div className="mt-6">
        <ReviewQueue catalog={reviewProblems} problems={reviewProblems} />
      </div>
    </div>
  );
}
