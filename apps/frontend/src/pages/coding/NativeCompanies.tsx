import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { companies, type Company } from "@/data/companies";
import { PageHeader } from "@/components/design-system/page-header";
import { Building2, ArrowRight, ArrowLeft, Terminal, Tag as TagIcon } from "lucide-react";
import { getProblem } from "@/data/dsa";

export function NativeCompanies() {
  const location = useLocation();
  const navigate = useNavigate();
  const userPrefixMatch = location.pathname.match(/^(\/[a-f0-9]{24})\/coding/);
  const basePrefix = userPrefixMatch ? `${userPrefixMatch[1]}/coding` : "/coding";

  // URL-driven selected company: /coding/companies/:slug
  const companyMatch = location.pathname.match(/\/companies\/([^\/?#]+)/);
  const companyFromUrl = companyMatch ? companies.find((c) => c.slug === companyMatch[1]) : null;

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(companyFromUrl ?? null);

  useEffect(() => {
    if (companyFromUrl) {
      setSelectedCompany(companyFromUrl);
    } else if (!location.pathname.includes("/companies/")) {
      setSelectedCompany(null);
    }
  }, [location.pathname, companyFromUrl]);

  const handleSelectCompany = (c: Company) => {
    setSelectedCompany(c);
    navigate(`${basePrefix}/companies/${c.slug}`);
  };

  const handleBackToAll = () => {
    setSelectedCompany(null);
    navigate(`${basePrefix}/companies`);
  };

  if (selectedCompany) {
    return (
      <div className="space-y-6 p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <button
          onClick={handleBackToAll}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Back to all Companies
        </button>

        <PageHeader
          title={`${selectedCompany.name} Question Bank`}
          description={selectedCompany.blurb}
        />

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 mt-6 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {selectedCompany.questions.length} Frequently Asked Questions
            </span>
            <span className="text-xs text-zinc-500">Sorted by Interview Frequency</span>
          </div>

          <div className="grid gap-2.5">
            {selectedCompany.questions.map((q, idx) => {
              const problem = q.kind === "dsa" ? getProblem(q.slug) : null;
              const title = problem ? problem.title : q.slug;
              const href = `${basePrefix}/dsa/${q.slug}`;

              return (
                <div
                  key={idx}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-4 py-3 hover:border-indigo-500/50 hover:bg-zinc-800/30 transition-all duration-150 gap-2"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="text-xs font-mono text-zinc-500 mt-0.5 sm:mt-0">#{idx + 1}</span>
                    <div>
                      <Link
                        to={href}
                        className="text-sm font-medium text-zinc-200 hover:text-indigo-300 transition-colors"
                      >
                        {title}
                      </Link>
                      {q.note && <p className="text-xs text-zinc-500 mt-0.5">{q.note}</p>}
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

                  <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        q.frequency === "high"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : q.frequency === "medium"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}
                    >
                      {q.frequency} freq
                    </span>

                    {problem && (
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
                    )}
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
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Top Tech Companies"
        description="Curated DSA interview problems tagged and categorized by top hiring companies."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        {companies.map((c) => {
          // Collect top topics from company's questions
          const companyTags = Array.from(
            new Set(
              c.questions
                .map((q) => (q.kind === "dsa" ? getProblem(q.slug) : null))
                .filter(Boolean)
                .flatMap((p) => p!.tags || [])
            )
          ).slice(0, 3);

          return (
            <div
              key={c.slug}
              onClick={() => handleSelectCompany(c)}
              className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-indigo-500/50 hover:bg-zinc-900/90 transition-all duration-150 active:scale-[0.98] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Building2 className="size-5" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                    {c.name}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{c.blurb}</p>

                {companyTags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {companyTags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-zinc-950/70 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3.5 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                <span>{c.questions.length} Questions</span>
                <span className="text-indigo-400 group-hover:text-indigo-300 font-medium inline-flex items-center gap-1">
                  Explore Bank <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
