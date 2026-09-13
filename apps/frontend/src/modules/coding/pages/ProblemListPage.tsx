import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { Search, Filter, CheckCircle2, Play, Trophy } from "lucide-react";
import { fetchProblemsApi } from "../services/codingApi";
import type { CodingProblem } from "../types/coding";
import { Button } from "../../../components/ui/button";

export function ProblemListPage() {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [company, setCompany] = useState("");

  useEffect(() => {
    async function loadProblems() {
      setLoading(true);
      try {
        const res = await fetchProblemsApi({ search, difficulty, company });
        if (res.success) setProblems(res.data.problems);
      } catch (err) {
        console.error("Failed to load problem list", err);
      } finally {
        setLoading(false);
      }
    }
    loadProblems();
  }, [search, difficulty, company]);

  return (
    <div className="min-h-screen bg-[#050507] text-white p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Coding Problems Catalog</h1>
          <p className="text-xs text-zinc-400 mt-1">Master DSA and Placement Interview Questions</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search problems by title or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0D0D14] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Difficulty Filter */}
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="bg-[#0D0D14] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        {/* Company Filter */}
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="bg-[#0D0D14] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">All Companies</option>
          <option value="Amazon">Amazon</option>
          <option value="Microsoft">Microsoft</option>
          <option value="Google">Google</option>
          <option value="TCS">TCS</option>
          <option value="Infosys">Infosys</option>
        </select>
      </div>

      {/* Problems Table */}
      <div className="bg-[#0D0D14] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A0A0E] text-zinc-400 border-b border-zinc-800 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Title</th>
                <th className="py-4 px-6">Difficulty</th>
                <th className="py-4 px-6">Topics</th>
                <th className="py-4 px-6">Company Tags</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-6 bg-zinc-900/20"></td>
                  </tr>
                ))
              ) : problems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No problems found matching criteria.
                  </td>
                </tr>
              ) : (
                problems.map((p) => (
                  <tr key={p._id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-4 px-6">
                      {p.isSolved ? (
                        <CheckCircle2 className="size-4 text-emerald-400" />
                      ) : (
                        <span className="size-2.5 rounded-full bg-zinc-700 block"></span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-bold text-white hover:text-purple-400 transition-colors">
                      <Link to={`/coding/problem/${p.slug}`}>{p.title}</Link>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        p.difficulty === "Easy" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : p.difficulty === "Medium" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}>
                        {p.difficulty}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-zinc-400">{p.topics.join(", ")}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {p.companies.slice(0, 3).map((c) => (
                          <span key={c} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link to={`/coding/problem/${p.slug}`}>
                        <Button className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold h-8 px-3 rounded-lg flex items-center gap-1 cursor-pointer ml-auto">
                          Solve <Play className="size-3 fill-purple-300" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
