import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { Bot, Loader2, Sparkles, User, ArrowLeft, History } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { fetchInterviewResult, type ResultResponse } from "../services/interviewService";
import { useAuth } from "../context/AuthContext";

export function Result() {
    const { interviewId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [result, setResult] = useState<ResultResponse>({
        score: 0,
        feedback: "",
        transcript: [],
        status: "Pre",
    });

    useEffect(() => {
        if (!interviewId) return;

        const load = async () => {
            try {
                const data = await fetchInterviewResult(interviewId);
                setResult(data);
                return data.status;
            } catch (err) {
                console.error("Error fetching result:", err);
                return "Pre";
            }
        };

        load();
        const intervalId = setInterval(async () => {
            const s = await load();
            if (s === "Done") clearInterval(intervalId);
        }, 4000);

        return () => clearInterval(intervalId);
    }, [interviewId]);

    const ready = result.status === "Done";

    return (
        <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-3xl px-6 py-10">
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Interview Evaluation</h1>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Your performance feedback, score, and full conversational transcript.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isAuthenticated && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/profile")}
                            className="gap-1.5 text-xs border-border/80"
                        >
                            <History className="size-3.5" />
                            My History
                        </Button>
                    )}
                    <Button
                        size="sm"
                        onClick={() => navigate("/")}
                        className="gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white"
                    >
                        <ArrowLeft className="size-3.5" />
                        New Interview
                    </Button>
                </div>
            </header>

            {!ready ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card/50 py-20 text-center shadow-lg backdrop-blur">
                    <Loader2 className="size-8 animate-spin text-violet-500" />
                    <div>
                        <p className="text-base font-semibold text-foreground">Evaluating your interview…</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Analyzing technical responses and generating feedback.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Overall Score + Feedback */}
                    <section className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8 shadow-md backdrop-blur">
                        <div className="flex items-start justify-between gap-6 border-b border-border/60 pb-5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <Sparkles className="size-4 text-violet-400" />
                                AI Evaluator Feedback
                            </div>
                            <div className="flex shrink-0 items-baseline gap-1 bg-violet-500/10 px-3 py-1 rounded-xl border border-violet-500/20">
                                <span className="text-2xl font-black tracking-tight text-violet-300">
                                    {result.evaluationData?.overallScore || result.score}
                                </span>
                                <span className="text-xs text-muted-foreground">/ 10</span>
                            </div>
                        </div>
                        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-normal">
                            {result.evaluationData?.overallFeedback || result.feedback || "Great job completing your interview!"}
                        </p>
                    </section>

                    {/* Speech & Delivery Analysis Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="rounded-2xl border border-border bg-card/60 p-4 text-center backdrop-blur">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Speech Clarity</p>
                            <p className="text-xl font-bold text-emerald-400 mt-1">
                                {result.evaluationData?.speechMetrics?.speechClarity || "8/10"}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card/60 p-4 text-center backdrop-blur">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Filler Words</p>
                            <p className="text-xl font-bold text-amber-400 mt-1">
                                {result.evaluationData?.speechMetrics?.fillerWords ?? 12}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card/60 p-4 text-center backdrop-blur">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mumbling</p>
                            <p className="text-xl font-bold text-blue-400 mt-1">
                                {result.evaluationData?.speechMetrics?.mumbling || "Low"}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card/60 p-4 text-center backdrop-blur">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Speaking Pace</p>
                            <p className="text-xl font-bold text-purple-400 mt-1">
                                {result.evaluationData?.speechMetrics?.speakingPace || "Good"}
                            </p>
                        </div>
                    </div>

                    {/* Detailed Ratings & Improvement Areas (Only shown if rich data exists) */}
                    {result.evaluationData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <section className="rounded-2xl border border-border bg-card/60 p-6 shadow-md backdrop-blur">
                                <h3 className="mb-4 text-sm font-bold text-foreground">Performance Metrics</h3>
                                <div className="flex flex-col gap-4">
                                    {[
                                        { label: "Technical Knowledge", val: result.evaluationData.ratings.technicalKnowledge, color: "bg-blue-500" },
                                        { label: "Speaking & Clarity", val: result.evaluationData.ratings.speaking, color: "bg-emerald-500" },
                                        { label: "Grammar & Language", val: result.evaluationData.ratings.grammar, color: "bg-violet-500" },
                                    ].map((metric) => (
                                        <div key={metric.label}>
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-muted-foreground font-medium">{metric.label}</span>
                                                <span className="font-bold text-foreground">{metric.val}/10</span>
                                            </div>
                                            <div className="h-2 w-full bg-border/50 rounded-full overflow-hidden">
                                                <div 
                                                    className={cn("h-full rounded-full", metric.color)} 
                                                    style={{ width: `${(metric.val / 10) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="rounded-2xl border border-border bg-card/60 p-6 shadow-md backdrop-blur">
                                <h3 className="mb-4 text-sm font-bold text-foreground">Areas for Improvement</h3>
                                <ul className="space-y-3">
                                    {result.evaluationData.improvementAreas.map((area, idx) => (
                                        <li key={idx} className="flex gap-2 text-xs text-foreground/80 leading-relaxed">
                                            <span className="text-violet-500 font-bold shrink-0">•</span>
                                            {area}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </div>
                    )}

                    {/* Per-Question Breakdown or Transcript */}
                    <section className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8 shadow-md backdrop-blur">
                        <h2 className="mb-5 text-sm font-bold text-foreground">
                            {result.evaluationData ? "Per-Question Breakdown" : `Interview Transcript (${result.transcript.length} turns)`}
                        </h2>
                        
                        <div className="flex flex-col gap-6">
                            {result.transcript.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    No messages were recorded for this interview session.
                                </p>
                            )}
                            
                            {/* Rich Per-Question View */}
                            {result.evaluationData?.perQuestionAnalysis && result.evaluationData.perQuestionAnalysis.map((qa, i) => (
                                <div key={i} className="border border-border/60 rounded-xl overflow-hidden bg-background/50 space-y-0">
                                    {/* Question Header & Main Concept Badge */}
                                    <div className="bg-card/60 p-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <p className="text-xs font-semibold text-violet-400 mb-1">Question {i + 1}</p>
                                            <p className="text-sm font-medium text-foreground">{qa.question}</p>
                                        </div>
                                        {qa.mainConcept && (
                                            <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                                💡 Concept: {qa.mainConcept}
                                            </span>
                                        )}
                                    </div>

                                    {/* Candidate Answer */}
                                    <div className="p-4 border-b border-border/40 bg-black/20">
                                        <p className="text-xs font-semibold text-emerald-400 mb-1">Your Answer</p>
                                        <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">{qa.answer || "No response provided."}</p>
                                    </div>

                                    {/* Score & Specific Feedback */}
                                    <div className="bg-violet-500/5 p-4 flex gap-4 border-b border-border/40">
                                        <div className="shrink-0">
                                            <div className="flex flex-col items-center justify-center size-10 rounded-full border border-violet-500/20 bg-violet-500/10">
                                                <span className="text-xs font-bold text-violet-300">{qa.score}/10</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-violet-300 mb-1">Feedback</p>
                                            <p className="text-xs text-foreground/75 leading-relaxed">{qa.feedback}</p>
                                        </div>
                                    </div>

                                    {/* Ideal Answer Suggestion */}
                                    {qa.idealAnswerSuggestion && (
                                        <div className="bg-indigo-950/20 p-4 border-t border-indigo-500/20">
                                            <p className="text-xs font-bold text-indigo-400 mb-1.5 flex items-center gap-1.5">
                                                <span>✨ How this question SHOULD be answered:</span>
                                            </p>
                                            <p className="text-xs text-indigo-200/80 leading-relaxed bg-black/40 p-3 rounded-lg border border-indigo-500/10 font-normal">
                                                {qa.idealAnswerSuggestion}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Fallback Legacy Transcript View */}
                            {!result.evaluationData && result.transcript.map((m, i) => {
                                const isAi = m.type === "Assistant";
                                return (
                                    <div key={i} className={cn("flex gap-3", isAi ? "justify-start" : "flex-row-reverse")}>
                                        <div className={cn(
                                            "grid size-8 shrink-0 place-items-center rounded-full text-white text-xs font-bold",
                                            isAi ? "bg-gradient-to-br from-violet-500 to-indigo-600" : "bg-gradient-to-br from-emerald-400 to-teal-600"
                                        )}>
                                            {isAi ? <Bot className="size-4" /> : <User className="size-4" />}
                                        </div>
                                        <div className={cn(
                                            "max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed",
                                            isAi ? "rounded-tl-sm bg-card/80 border border-border text-foreground" : "rounded-tr-sm bg-violet-600 text-white shadow-sm"
                                        )}>
                                            {m.content}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}
