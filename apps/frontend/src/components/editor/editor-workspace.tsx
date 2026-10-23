"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Check,
  Loader2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CodeEditor } from "@/components/editor/code-editor";
import { OutputDiff } from "@/components/editor/output-diff";
import { PracticeTimer } from "@/components/practice/practice-timer";
import { AITutorSheet } from "@/components/editor/ai-tutor-sheet";
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage } from "@/lib/constants";
import { saveCodeDraft, useCodeDraft } from "@/lib/code-storage";
import { useActivePractice } from "@/lib/practice";
import { recordAttempt, recordSolved } from "@/lib/progress";
import { completeDueReview, markForReview } from "@/lib/review";
import type { Difficulty } from "@/data/dsa";
import { cn } from "@/lib/utils";
import { useGamification } from "@/context/GamificationContext";
import { BACKEND_URL } from "@/lib/config";

type StarterCode = Record<string, string>;

type RunOutcome = {
  passed: boolean;
  status: string;
  stdout: string;
  stderr: string;
  expected: string;
  input: string;
  timeMs: number | null;
  message?: string;
};

type RunResult =
  | { kind: "custom"; stdout: string; stderr: string; status: string; message?: string }
  | { kind: "samples"; results: RunOutcome[]; passed: number; total: number };

type SubmitResult = {
  status: string;
  passed: number;
  total: number;
  runtimeMs: number | null;
  message?: string;
  firstFailure?: { input: string; expected: string; got: string; stderr: string };
};

const VERDICT_LABEL: Record<string, string> = {
  ACCEPTED: "Accepted",
  WRONG_ANSWER: "Wrong Answer",
  RUNTIME_ERROR: "Runtime Error",
  TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
  COMPILE_ERROR: "Compile Error",
  PENDING: "Runner Unavailable",
};

export function EditorWorkspace({
  slug,
  title,
  difficulty,
  starterCode,
  onSolved,
}: {
  slug: string;
  title: string;
  difficulty: Difficulty;
  starterCode: StarterCode;
  onSolved?: () => void;
}) {
  // Saved draft (localStorage) restores work across reloads; this session's
  // edits overlay it, and the code shown is derived: edit → draft → starter.
  const draft = useCodeDraft(slug);
  const [edits, setEdits] = useState<StarterCode>({});
  const [chosenLanguage, setChosenLanguage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [run, setRun] = useState<RunResult | null>(null);
  const [submit, setSubmit] = useState<SubmitResult | null>(null);
  const [aiTutorOpen, setAiTutorOpen] = useState(false);
  const { awardXP, triggerCelebration } = useGamification();

  // Timed self-practice: while a session is live on this problem, the judge
  // is off-limits — no Run, no Submit, no lingering results (cleared when the
  // session starts, via PracticeTimer's onStart).
  const practice = useActivePractice();
  const inPractice = practice?.slug === slug;

  const language =
    chosenLanguage ??
    (draft?.lastLanguage && getLanguage(draft.lastLanguage)
      ? draft.lastLanguage
      : DEFAULT_LANGUAGE);
  const code =
    edits[language] ?? draft?.languages[language] ?? starterCode[language] ?? "";
  const busy = running || submitting;

  // Listen for PrepX auth sync from parent window if embedded
  useEffect(() => {
    const handleAuthMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "PREPX_AUTH_SYNC" && e.data.token) {
        localStorage.setItem("prepx_token", e.data.token);
        sessionStorage.setItem("prepx_token", e.data.token);
      }
    };
    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, []);

  // Debounced autosave so a reload or accidental navigation keeps the code.
  useEffect(() => {
    const t = setTimeout(() => {
      saveCodeDraft(slug, { ...draft?.languages, ...edits }, language, starterCode);
    }, 400);
    return () => clearTimeout(t);
  }, [slug, edits, language, draft, starterCode]);

  // Flush the latest draft on unmount so edits inside the debounce window
  // survive in-app navigation.
  const latest = useRef({ edits, language, draft });
  useEffect(() => {
    latest.current = { edits, language, draft };
  }, [edits, language, draft]);
  useEffect(() => {
    return () => {
      const { edits, language, draft } = latest.current;
      saveCodeDraft(slug, { ...draft?.languages, ...edits }, language, starterCode);
    };
  }, [slug, starterCode]);

  function setCode(value: string) {
    setEdits((prev) => ({ ...prev, [language]: value }));
  }

  function reset() {
    setEdits((prev) => ({ ...prev, [language]: starterCode[language] ?? "" }));
    toast.success("Reset to starter code.");
  }

  async function handleRun() {
    setRunning(true);
    setSubmit(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, language, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Run failed.");
        return;
      }
      setRun(data as RunResult);
    } catch {
      toast.error("Could not reach the code runner.");
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setRun(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, language, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Submit failed.");
        return;
      }
      const result = data as SubmitResult;
      setSubmit(result);

      // Notify parent PrepX frame
      if (typeof window !== "undefined") {
        window.parent?.postMessage({
          type: "PREPX_CODING_SUBMISSION",
          payload: {
            slug,
            language,
            verdict: result.status,
            passed: result.passed,
            total: result.total,
            runtimeMs: result.runtimeMs,
          },
        }, "*");
      }

      // Record student activity to PrepX backend
      const prepxToken =
        typeof window !== "undefined"
          ? (localStorage.getItem("token") || localStorage.getItem("prepx_token") || sessionStorage.getItem("prepx_token"))
          : null;
      const backendUrl = BACKEND_URL || "";

      if (prepxToken) {
        fetch(`${backendUrl}/api/v1/coding/record-activity`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${prepxToken}`,
          },
          body: JSON.stringify({
            slug,
            language,
            verdict: result.status,
            passed: result.passed,
            total: result.total,
            runtimeMs: result.runtimeMs,
          }),
        })
          .then((r) => r.json())
          .catch(() => {});
      }

      if (result.status === "ACCEPTED") {
        recordSolved(slug, language);
        
        // Centralized Gamification Award
        const xpEarned = difficulty === "hard" ? 300 : difficulty === "medium" ? 200 : 100;
        const isSpeed = typeof result.runtimeMs === "number" && result.runtimeMs > 0 && result.runtimeMs < 50;
        const badgeName = isSpeed ? "Speed Demon" : undefined;
        awardXP(xpEarned, `Accepted solution for ${title || slug}!`, badgeName);

        toast.success(`Accepted! 🎉 +${xpEarned} XP awarded!`);
        // A due spaced-repetition review solved by resubmitting counts as passed.
        const review = completeDueReview(slug);
        if (review) {
          toast.success(
            review.outcome === "graduated"
              ? "Review passed — graduated from the queue! 🎓"
              : `Review passed — next one in ${review.nextInDays} days.`
          );
        }
        onSolved?.();
      } else if (result.status === "PENDING") {
        toast.error(result.message ?? "The runner is unavailable.");
      } else {
        recordAttempt(slug, language);
        toast.error(VERDICT_LABEL[result.status] ?? "Not quite — keep trying.", {
          action: {
            label: "Review later",
            onClick: () => {
              markForReview(slug);
              toast.success("Added to the review queue — due tomorrow.");
            },
          },
        });
      }
    } catch {
      toast.error("Could not reach the code runner.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border bg-card/50 px-2 sm:px-3 py-1.5 sm:py-2 overflow-x-auto no-scrollbar shrink-0">
        <Select value={language} onValueChange={setChosenLanguage}>
          <SelectTrigger size="sm" className="w-28 sm:w-36 h-8 text-xs shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
          <PracticeTimer
            slug={slug}
            title={title}
            difficulty={difficulty}
            onStart={() => {
              setRun(null);
              setSubmit(null);
            }}
          />
          <Button variant="ghost" size="icon-sm" onClick={reset} title="Reset code" className="size-8">
            <RotateCcw className="size-3.5" />
          </Button>

          {/* PrepX AI Tutor Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiTutorOpen(true)}
            className="border-indigo-500/30 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 gap-1 sm:gap-1.5 h-8 text-xs font-medium px-2 sm:px-3"
          >
            <Sparkles className="size-3.5 text-indigo-400" />
            <span className="hidden sm:inline">AI Tutor</span>
            <span className="sm:hidden">Tutor</span>
          </Button>

          {!inPractice && (
            <>
              <Button variant="outline" size="sm" onClick={handleRun} disabled={busy} className="h-8 px-2 sm:px-3 text-xs">
                {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                <span>Run</span>
              </Button>
              <Button variant="glow" size="sm" onClick={handleSubmit} disabled={busy} className="h-8 px-2.5 sm:px-3.5 text-xs">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                <span>Submit</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="min-h-0 flex-1">
        <CodeEditor languageId={language} value={code} onChange={setCode} />
      </div>

      {/* Results */}
      <div className="h-44 sm:h-56 overflow-y-auto border-t border-border bg-card/30 p-2.5 sm:p-3 scrollbar-thin">
        {inPractice ? (
          <p className="text-sm text-muted-foreground">
            Timed practice is running — no runs, no verdicts, just you and the
            clock. End the session to unlock Run &amp; Submit and score
            yourself.
          </p>
        ) : (
          <ResultsPanel
            run={run}
            submit={submit}
            busy={busy}
            onOpenAiTutor={() => setAiTutorOpen(true)}
          />
        )}
      </div>

      {/* PrepX AI Tutor Drawer */}
      <AITutorSheet
        open={aiTutorOpen}
        onOpenChange={setAiTutorOpen}
        slug={slug}
        title={title}
        language={language}
        code={code}
        errorOutput={submit?.firstFailure?.stderr || (run && run.kind === "custom" ? run.stderr : "")}
        failedTest={submit?.firstFailure}
        onApplyCode={setCode}
      />
    </div>
  );
}

function Verdict({
  result,
  onOpenAiTutor,
}: {
  result: SubmitResult;
  onOpenAiTutor?: () => void;
}) {
  const accepted = result.status === "ACCEPTED";
  return (
    <div>
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex items-center gap-2 text-lg font-semibold",
            accepted ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          )}
        >
          {accepted ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
          {VERDICT_LABEL[result.status] ?? result.status}
        </div>
        {!accepted && onOpenAiTutor && (
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenAiTutor}
            className="h-7 text-xs border-indigo-500/30 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 gap-1.5"
          >
            <Sparkles className="size-3 text-indigo-400" />
            Debug with AI Tutor
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {result.passed} / {result.total} test cases passed
        {result.runtimeMs != null && accepted ? ` · ~${result.runtimeMs} ms avg` : ""}
      </p>
      {result.firstFailure && !accepted && (
        <div className="mt-3 space-y-2 font-mono text-xs">
          <FailRow label="Input" value={result.firstFailure.input} />
          <div>
            <div className="text-muted-foreground">Output:</div>
            <OutputDiff
              expected={result.firstFailure.expected}
              actual={result.firstFailure.got}
              className="mt-0.5"
            />
          </div>
          {result.firstFailure.stderr && (
            <FailRow label="Stderr" value={result.firstFailure.stderr} tone="bad" />
          )}
        </div>
      )}
    </div>
  );
}

function FailRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "bad";
}) {
  return (
    <div>
      <div className="text-muted-foreground">{label}:</div>
      <pre
        className={cn(
          "mt-0.5 overflow-x-auto whitespace-pre-wrap rounded bg-code p-2 scrollbar-thin",
          tone === "ok" && "text-emerald-700 dark:text-emerald-300",
          tone === "bad" && "text-rose-700 dark:text-rose-300"
        )}
      >
        {value}
      </pre>
    </div>
  );
}

function ResultsPanel({
  run,
  submit,
  busy,
  onOpenAiTutor,
}: {
  run: RunResult | null;
  submit: SubmitResult | null;
  busy: boolean;
  onOpenAiTutor?: () => void;
}) {
  if (busy) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Running against the judge…
      </div>
    );
  }

  if (submit) return <Verdict result={submit} onOpenAiTutor={onOpenAiTutor} />;

  if (run) {
    if (run.kind === "custom") {
      return (
        <div className="font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground">Output:</div>
            {run.stderr && onOpenAiTutor && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenAiTutor}
                className="h-6 text-[11px] border-indigo-500/30 text-indigo-400 hover:text-indigo-300 gap-1"
              >
                <Sparkles className="size-3 text-indigo-400" />
                Ask Coach
              </Button>
            )}
          </div>
          <pre className="mt-1 whitespace-pre-wrap text-foreground/90">
            {run.stdout || "(no output)"}
          </pre>
          {run.stderr && <pre className="mt-2 whitespace-pre-wrap text-rose-700 dark:text-rose-300">{run.stderr}</pre>}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Sample tests: {run.passed} / {run.total} passed</span>
          {run.passed < run.total && onOpenAiTutor && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenAiTutor}
              className="h-6 text-[11px] border-indigo-500/30 text-indigo-400 hover:text-indigo-300 gap-1"
            >
              <Sparkles className="size-3 text-indigo-400" />
              Debug Sample Failures
            </Button>
          )}
        </div>
        {run.results.map((r, i) => (
          <div key={i} className="rounded-lg border border-border bg-card/50 p-2.5 font-mono text-xs">
            <div className="mb-1 flex items-center gap-1.5">
              {r.passed ? (
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : r.status === "error" ? (
                <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <XCircle className="size-3.5 text-rose-600 dark:text-rose-400" />
              )}
              <span className="font-sans font-medium">Case {i + 1}</span>
            </div>
            <div className="text-muted-foreground">Input: {r.input.replace(/\n/g, " ⏎ ")}</div>
            {r.passed || r.message ? (
              <>
                <div className="text-muted-foreground">
                  Expected: <span className="text-emerald-700 dark:text-emerald-300">{r.expected}</span>
                </div>
                <div className="text-muted-foreground">
                  Got:{" "}
                  <span className={r.passed ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>
                    {r.message ? r.message : r.stdout.trim() || "(no output)"}
                  </span>
                </div>
              </>
            ) : (
              <OutputDiff expected={r.expected} actual={r.stdout} className="mt-1.5" />
            )}
            {!r.passed && r.stderr && (
              <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap text-rose-700 dark:text-rose-300 scrollbar-thin">
                {r.stderr}
              </pre>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Run your code against the sample tests, or Submit to run the full suite.
    </p>
  );
}
