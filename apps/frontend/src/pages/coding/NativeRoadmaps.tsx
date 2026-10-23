import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { roadmaps, type Roadmap } from "@/data/roadmaps";
import { PageHeader } from "@/components/design-system/page-header";
import { RoadmapCompletion } from "@/components/roadmaps/roadmap-completion";
import { Compass, CheckCircle2, ArrowRight, ArrowLeft, BookOpen, Tag as TagIcon } from "lucide-react";
import { getProblem } from "@/data/dsa";

export function NativeRoadmaps() {
  const location = useLocation();
  const navigate = useNavigate();
  const userPrefixMatch = location.pathname.match(/^(\/[a-f0-9]{24})\/coding/);
  const basePrefix = userPrefixMatch ? `${userPrefixMatch[1]}/coding` : "/coding";

  // URL-driven selected roadmap support: /coding/roadmaps/:slug
  const roadmapMatch = location.pathname.match(/\/roadmaps\/([^\/?#]+)/);
  const roadmapFromUrl = roadmapMatch ? roadmaps.find((r) => r.slug === roadmapMatch[1]) : null;

  const [selectedRoadmap, setSelectedRoadmap] = useState<Roadmap | null>(roadmapFromUrl ?? null);

  useEffect(() => {
    if (roadmapFromUrl) {
      setSelectedRoadmap(roadmapFromUrl);
    } else if (!location.pathname.includes("/roadmaps/")) {
      setSelectedRoadmap(null);
    }
  }, [location.pathname, roadmapFromUrl]);

  const handleSelectRoadmap = (r: Roadmap) => {
    setSelectedRoadmap(r);
    navigate(`${basePrefix}/roadmaps/${r.slug}`);
  };

  const handleBackToAll = () => {
    setSelectedRoadmap(null);
    navigate(`${basePrefix}/roadmaps`);
  };

  if (selectedRoadmap) {
    return (
      <div className="space-y-6 p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <button
          onClick={handleBackToAll}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Back to all Roadmaps
        </button>

        <PageHeader
          title={selectedRoadmap.name}
          description={selectedRoadmap.description}
        />

        <div className="space-y-8 mt-6">
          {selectedRoadmap.sections.map((section, idx) => (
            <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">{section.title}</h3>
                {section.description && (
                  <p className="text-xs text-zinc-400 mt-0.5">{section.description}</p>
                )}
              </div>

              <div className="grid gap-2.5">
                {section.items.map((item, itemIdx) => {
                  const isDesign = item.kind === "system-design";
                  const problem = !isDesign ? getProblem(item.slug) : null;
                  const title = problem ? problem.title : (item.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
                  const href = isDesign ? `${basePrefix}/system-design/${item.slug}` : `${basePrefix}/dsa/${item.slug}`;

                  return (
                    <div
                      key={itemIdx}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-4 py-3 hover:border-indigo-500/50 hover:bg-zinc-800/30 transition-all duration-150 gap-2"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="text-xs font-mono text-zinc-500 mt-0.5 sm:mt-0">#{itemIdx + 1}</span>
                        <div>
                          <Link
                            to={href}
                            className="text-sm font-medium text-zinc-200 hover:text-indigo-300 transition-colors"
                          >
                            {title}
                          </Link>
                          {item.note && (
                            <p className="text-xs text-zinc-500 mt-0.5">{item.note}</p>
                          )}
                          {problem && problem.tags && problem.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {problem.tags.slice(0, 4).map((t) => (
                                <Link
                                  key={t}
                                  to={`${basePrefix}?tag=${encodeURIComponent(t)}`}
                                  className="text-[10px] bg-zinc-800/80 hover:bg-indigo-900/40 hover:text-indigo-300 text-zinc-400 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                >
                                  #{t}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                        {isDesign ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            System Design
                          </span>
                        ) : problem ? (
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              problem.difficulty === "EASY"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : problem.difficulty === "MEDIUM"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {problem.difficulty}
                          </span>
                        ) : null}
                        <Link
                          to={href}
                          className="text-zinc-600 hover:text-indigo-400 transition-colors p-1"
                        >
                          <ArrowRight className="size-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Curated Study Roadmaps"
        description="Structured, pattern-based study plans for technical interview preparation."
      />

      <div className="grid gap-5 md:grid-cols-2 mt-6">
        {roadmaps.map((r) => {
          const allSlugs = r.sections.flatMap((s) =>
            s.items.filter((i) => i.kind === "dsa").map((i) => i.slug)
          );
          const totalItems = r.sections.reduce((acc, s) => acc + s.items.length, 0);

          return (
            <div
              key={r.slug}
              onClick={() => handleSelectRoadmap(r)}
              className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 hover:border-indigo-500/50 hover:bg-zinc-900/90 transition-all duration-150 active:scale-[0.98] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <Compass className="size-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                      {r.name}
                    </h3>
                  </div>
                  <RoadmapCompletion dsaSlugs={allSlugs} contentKeys={[]} />
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{r.tagline}</p>

                {/* Section tags */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {r.sections.map((s, sIdx) => (
                    <span
                      key={sIdx}
                      className="text-[11px] bg-zinc-950/70 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md"
                    >
                      {s.title}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                <span>{totalItems} Questions · {r.sections.length} Core Modules</span>
                <span className="text-indigo-400 group-hover:text-indigo-300 font-medium inline-flex items-center gap-1">
                  Start Roadmap <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
