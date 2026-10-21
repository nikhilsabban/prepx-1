import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  Award,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Clock,
  MessageSquare,
  Users,
  ChevronDown,
  ChevronUp,
  Flame,
  ShieldCheck,
  TrendingUp,
  Volume2,
  Globe,
  Radio,
  BookOpen,
  Plus,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  fetchGDSession,
  type IGDSession,
  type IGDStudentEvaluation,
} from "../../services/gdService";
import { toast } from "react-toastify";

export function GDResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<IGDSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    loadSession();
  }, [sessionId]);

  async function loadSession() {
    try {
      const data = await fetchGDSession(sessionId!);
      setSession(data);
    } catch (err: any) {
      console.error("Failed to load evaluation:", err);
      toast.error("Could not load GD evaluation.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center space-y-4 text-white">
        <RefreshCw className="size-10 text-indigo-500 animate-spin" />
        <p className="text-zinc-400 font-medium text-sm">Compiling placement metrics and evaluations...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white p-8 flex flex-col items-center justify-center space-y-4">
        <h2 className="text-xl font-bold">Discussion Session Not Found</h2>
        <Button onClick={() => navigate("/group-discussion")} className="rounded-xl bg-indigo-600">
          Back to GD Arena
        </Button>
      </div>
    );
  }

  const evaluations: IGDStudentEvaluation[] = session.evaluations || [];
  const currentEval: IGDStudentEvaluation | undefined = evaluations[selectedStudentIndex];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    if (score >= 60) return "text-indigo-400 border-indigo-500/40 bg-indigo-500/10";
    return "text-amber-400 border-amber-500/40 bg-amber-500/10";
  };

  const getBarColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 60) return "bg-indigo-500";
    return "bg-amber-500";
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/group-discussion"
            className="text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center gap-1.5"
          >
            ← Back to Group Discussion Arena
          </Link>
          <span className="text-xs text-zinc-500">
            Concluded on {new Date(session.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Discussion Topic Card */}
        <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {session.topic.category}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-zinc-800 text-zinc-300">
                Language: {session.expectedLanguage}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-zinc-800 text-zinc-400">
                Moderator: @{session.adminUsername}
              </span>
            </div>
            {session.topic.sourceUrl && (
              <a
                href={session.topic.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
              >
                Source: {session.topic.publisher} <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
            "{session.topic.question}"
          </h1>
        </div>

        {/* Multi-Student Placement Leaderboard */}
        {evaluations.length === 0 ? (
          <div className="p-8 md:p-12 rounded-3xl border border-zinc-800 bg-zinc-950/80 text-center space-y-4">
            <div className="size-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
              <MessageSquare className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-white">No Speaking Contributions Recorded</h3>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-lg mx-auto">
              This discussion session concluded before participants spoke or submitted transcript turns. Detailed placement scores and multi-student rankings are generated automatically once students contribute during their turns.
            </p>
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => navigate("/group-discussion")}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5"
              >
                Start a New Live Discussion &rarr;
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8 rounded-3xl border border-zinc-800 bg-zinc-950/80 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="size-5 text-indigo-400" />
                  Session Student Placement Leaderboard
                </h2>
                <p className="text-xs text-zinc-400">
                  Ranked by 100-point rubric with topic relevance, reasoning, and balance tie-breakers.
                </p>
              </div>
              <span className="text-xs text-zinc-500">
                {evaluations.length} Students Evaluated
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="pb-3 font-semibold">Rank</th>
                    <th className="pb-3 font-semibold">Student</th>
                    <th className="pb-3 font-semibold">Score (/100)</th>
                    <th className="pb-3 font-semibold">Topic Relevance</th>
                    <th className="pb-3 font-semibold">Reasoning</th>
                    <th className="pb-3 font-semibold">Gamification XP</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {evaluations.map((ev, idx) => (
                    <tr
                      key={ev.participantId}
                      className={`transition ${
                        selectedStudentIndex === idx ? "bg-indigo-950/30 font-bold" : "hover:bg-zinc-900/40"
                      }`}
                    >
                      <td className="py-3">
                        <span
                          className={`size-6 rounded-full inline-flex items-center justify-center font-black text-xs ${
                            idx === 0
                              ? "bg-amber-400 text-black shadow-md shadow-amber-400/30"
                              : idx === 1
                              ? "bg-zinc-300 text-black"
                              : idx === 2
                              ? "bg-amber-700 text-white"
                              : "bg-zinc-800 text-zinc-300"
                          }`}
                        >
                          {ev.rank || idx + 1}
                        </span>
                      </td>
                      <td className="py-3 text-white">
                        <span className="font-bold">@{ev.username}</span>
                        <span className="text-zinc-400 block text-[11px]">{ev.name}</span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-xs border ${getScoreColor(ev.overallScore)}`}>
                          {ev.overallScore} / 100
                        </span>
                      </td>
                      <td className="py-3 text-zinc-300">
                        {ev.criterionScores.topicRelevance} / 25
                      </td>
                      <td className="py-3 text-zinc-300">
                        {ev.criterionScores.reasoningAndExamples} / 15
                      </td>
                      <td className="py-3 text-emerald-400 font-bold">
                        +{ev.gamificationPointsAwarded} XP
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setSelectedStudentIndex(idx)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                            selectedStudentIndex === idx
                              ? "bg-indigo-600 text-white"
                              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                          }`}
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Individual Student Report Section */}
        {currentEval ? (
          <div className="space-y-6">
            {/* Student Report Header */}
            <div className="p-8 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-[#09090b] shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Overall Score Circle (4 cols) */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Individual Placement Score
                </span>
                <div className="size-32 rounded-full border-4 border-indigo-500 flex flex-col items-center justify-center shadow-lg shadow-indigo-500/20 bg-indigo-950/20">
                  <span className="text-4xl font-black text-white">{currentEval.overallScore}</span>
                  <span className="text-xs font-bold text-zinc-400">OUT OF 100</span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">@{currentEval.username}</div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">
                    Rank {currentEval.rank} in Session
                  </span>
                  <p className="text-[11px] text-zinc-500 pt-1">
                    Evaluator: {currentEval.evaluatedBy === "groq" ? `Groq AI (${currentEval.modelUsed || "LLM"})` : "Rule-Based Engine"}
                  </p>
                </div>
              </div>

              {/* Qualitative Debrief (8 cols) */}
              <div className="md:col-span-8 flex flex-col justify-center space-y-4">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <ShieldCheck className="size-4" />
                  Talent Acquisition Evaluator Debrief for @{currentEval.username}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {currentEval.topicRelevanceExplanation}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <span className="text-zinc-500 block">Placement Readiness</span>
                    <strong className="text-white text-sm">
                      {currentEval.overallScore >= 80 ? "Placement Ready" : currentEval.overallScore >= 60 ? "Developing" : "Needs Practice"}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <span className="text-zinc-500 block">Awarded XP</span>
                    <strong className="text-emerald-400 text-sm">+{currentEval.gamificationPointsAwarded} XP</strong>
                  </div>
                  <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <span className="text-zinc-500 block">Speaking Pace</span>
                    <strong className="text-white text-sm">{currentEval.speechPatterns?.paceDescription || "Balanced"}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 100-Point Rubric 9 Criteria Breakdown */}
            <div className="p-6 md:p-8 rounded-3xl border border-zinc-800 bg-zinc-950/80 space-y-6">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="size-5 text-indigo-400" />
                  Detailed 100-Point Rubric Criterion Scores
                </h3>
                <p className="text-xs text-zinc-400">
                  Individual scoring breakdown across all 9 talent acquisition evaluation pillars.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {[
                  { label: "1. Topic Relevance & Understanding", score: currentEval.criterionScores.topicRelevance, max: 25 },
                  { label: "2. Reasoning & Concrete Examples", score: currentEval.criterionScores.reasoningAndExamples, max: 15 },
                  { label: "3. Clarity & Communication Structure", score: currentEval.criterionScores.clarityAndStructure, max: 15 },
                  { label: "4. Fluency, Pace & Speaking Control", score: currentEval.criterionScores.fluencyAndPace, max: 10 },
                  { label: "5. Active Listening & Peer Responses", score: currentEval.criterionScores.activeListening, max: 10 },
                  { label: "6. Participation Consistency & Balance", score: currentEval.criterionScores.participationBalance, max: 10 },
                  { label: "7. Expected Language Consistency", score: currentEval.criterionScores.expectedLanguageConsistency, max: 5 },
                  { label: "8. Vocal Intelligibility & Audible Delivery", score: currentEval.criterionScores.vocalIntelligibility, max: 5 },
                  { label: "9. Collaboration & Discussion Etiquette", score: currentEval.criterionScores.discussionEtiquette, max: 5 },
                ].map((crit) => (
                  <div key={crit.label} className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200">{crit.label}</span>
                      <span className="font-black text-indigo-400 text-sm">
                        {crit.score} / {crit.max}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full ${getBarColor(crit.score, crit.max)} transition-all duration-500`}
                        style={{ width: `${(crit.score / crit.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Logical Arguments Evidence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strongest Arguments & Contributions */}
              <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/80 space-y-4">
                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="size-4" />
                  Strongest Arguments & Verbal Contributions
                </h4>
                <ul className="space-y-3">
                  {currentEval.strongestArguments.map((arg, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                      <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{arg}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Evidence of Logical Reasoning */}
              <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/80 space-y-4">
                <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                  <TrendingUp className="size-4" />
                  Logical Reasoning & Examples Evidence
                </h4>
                <ul className="space-y-3">
                  {currentEval.reasoningEvidence.map((evItem, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                      <span className="size-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>{evItem}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Speech Pattern Analysis & Language Switching */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Observable Speech Patterns */}
              <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/80 space-y-4">
                <h4 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                  <Volume2 className="size-4" />
                  Observable Speech & Presentation Patterns
                </h4>
                <div className="space-y-2 text-xs text-zinc-300">
                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-1">
                    <span className="text-zinc-500 block">Filler Words Observed</span>
                    <span>
                      {currentEval.speechPatterns?.fillerWords?.length > 0
                        ? currentEval.speechPatterns.fillerWords.join(", ")
                        : "Minimal/None observed"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-1">
                    <span className="text-zinc-500 block">Hesitation & Vocal Flow</span>
                    <span>
                      {currentEval.speechPatterns?.observableHesitations?.join(", ") || "Steady flow recorded"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-1">
                    <span className="text-zinc-500 block">Delivery Intelligibility</span>
                    <span>
                      {currentEval.speechPatterns?.mumblingIndicators?.join(", ") || "Audible and clear"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Language Switching Observation */}
              <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/80 space-y-4">
                <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                  <Globe className="size-4" />
                  Native-Language Switching Analysis
                </h4>
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Expected Discussion Language:</span>
                    <strong className="text-white">{session.expectedLanguage}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Unintended Language Switching:</span>
                    <strong className={currentEval.languageSwitching?.detected ? "text-amber-400" : "text-emerald-400"}>
                      {currentEval.languageSwitching?.detected ? "Detected" : "None Detected"}
                    </strong>
                  </div>
                  <p className="text-zinc-300 pt-1 leading-relaxed">
                    {currentEval.languageSwitching?.explanation}
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendations & Practice Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Practical Recommendations */}
              <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/80 space-y-4">
                <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Lightbulb className="size-4" />
                  Personalized Recommendations
                </h4>
                <ul className="space-y-3">
                  {currentEval.practicalRecommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                      <span className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggested Practice Plan */}
              <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/80 space-y-4">
                <h4 className="text-sm font-bold text-pink-400 flex items-center gap-2">
                  <BookOpen className="size-4" />
                  Suggested Practice Plan for Next GD
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
                  {currentEval.suggestedPracticePlan}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Complete Discussion Transcript Collapsible */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 overflow-hidden">
          <button
            onClick={() => setShowFullTranscript(!showFullTranscript)}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-zinc-900/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="size-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-white text-sm">Review Full Group Discussion Transcript</h3>
                <p className="text-xs text-zinc-500">{session.transcript.length} dialogue turns recorded</p>
              </div>
            </div>
            {showFullTranscript ? <ChevronUp className="size-5 text-zinc-400" /> : <ChevronDown className="size-5 text-zinc-400" />}
          </button>

          {showFullTranscript && (
            <div className="p-6 border-t border-zinc-800 space-y-3 max-h-[500px] overflow-y-auto">
              {session.transcript.map((seg, idx) => (
                <div
                  key={seg.id || idx}
                  className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-indigo-400">@{seg.username || seg.participantName}</strong>
                    <span className="text-[10px] text-zinc-500">{seg.durationSeconds}s</span>
                  </div>
                  <p className="text-zinc-200 leading-relaxed">{seg.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-800/80">
          <Link
            to="/group-discussion"
            className="px-5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs transition"
          >
            ← Return to GD Arena Hub
          </Link>

          <Button
            onClick={() => navigate("/group-discussion")}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2"
          >
            <Plus className="size-4" />
            Host or Join Another Discussion
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default GDResultPage;
