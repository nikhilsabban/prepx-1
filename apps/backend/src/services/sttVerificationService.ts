import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "";
const STT_VERIFICATION_ENABLED = process.env.STT_VERIFICATION_ENABLED !== "false";
const DEEPGRAM_MODEL = process.env.DEEPGRAM_MODEL || "nova-3";
const DEEPGRAM_LANGUAGE = process.env.DEEPGRAM_LANGUAGE || "en-IN";

export interface VerificationResult {
  verifiedTranscript: string;
  confidence: number;
  usedVerification: boolean;
  method: "deepgram-prerecorded" | "streaming-preserved" | "fallback";
  wordsCount: number;
}

/**
 * Normalizes text for linguistic comparison without modifying original casing or punctuation
 */
function normalizeForComparison(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/**
 * Computes Word Error Rate between a candidate hypothesis and a reference
 */
export function computeWER(reference: string, hypothesis: string): number {
  const r = normalizeForComparison(reference);
  const h = normalizeForComparison(hypothesis);
  if (r.length === 0) return h.length === 0 ? 0 : 1;

  const d: number[][] = Array.from({ length: r.length + 1 }, () =>
    Array(h.length + 1).fill(0)
  );

  for (let i = 0; i <= r.length; i++) d[i][0] = i;
  for (let j = 0; j <= h.length; j++) d[0][j] = j;

  for (let i = 1; i <= r.length; i++) {
    for (let j = 1; j <= h.length; j++) {
      if (r[i - 1] === h[j - 1]) {
        d[i][j] = d[i - 1][j - 1];
      } else {
        d[i][j] = Math.min(
          d[i - 1][j] + 1, // Deletion
          d[i][j - 1] + 1, // Insertion
          d[i - 1][j - 1] + 1 // Substitution
        );
      }
    }
  }

  return d[r.length][h.length] / r.length;
}

/**
 * Computes Character Error Rate between a candidate hypothesis and reference
 */
export function computeCER(reference: string, hypothesis: string): number {
  const r = reference.toLowerCase().replace(/\s+/g, "");
  const h = hypothesis.toLowerCase().replace(/\s+/g, "");
  if (r.length === 0) return h.length === 0 ? 0 : 1;

  const d: number[][] = Array.from({ length: r.length + 1 }, () =>
    Array(h.length + 1).fill(0)
  );

  for (let i = 0; i <= r.length; i++) d[i][0] = i;
  for (let j = 0; j <= h.length; j++) d[0][j] = j;

  for (let i = 1; i <= r.length; i++) {
    for (let j = 1; j <= h.length; j++) {
      if (r[i - 1] === h[j - 1]) {
        d[i][j] = d[i - 1][j - 1];
      } else {
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + 1
        );
      }
    }
  }

  return d[r.length][h.length] / r.length;
}

/**
 * Reconciles the streaming hypothesis with the complete prerecorded utterance transcript.
 * Strictly avoids LLM rewriting: selects or reconciles based on acoustic evidence and confidence.
 */
export function reconcileTranscripts(
  streamingText: string,
  prerecordedText: string,
  prerecordedConfidence: number
): { finalTranscript: string; decisionReason: string } {
  const streamTrimmed = streamingText.trim();
  const prerecordTrimmed = prerecordedText.trim();

  // If prerecorded result is empty, keep streaming text
  if (!prerecordTrimmed) {
    return {
      finalTranscript: streamTrimmed,
      decisionReason: "prerecorded_empty_retained_streaming",
    };
  }

  // If streaming text was empty but prerecorded captured words (e.g. streaming handshake delay)
  if (!streamTrimmed) {
    return {
      finalTranscript: prerecordTrimmed,
      decisionReason: "streaming_empty_used_prerecorded",
    };
  }

  const streamWords = normalizeForComparison(streamTrimmed);
  const prerecordWords = normalizeForComparison(prerecordTrimmed);

  // If transcripts are identical in words
  if (streamWords.join(" ") === prerecordWords.join(" ")) {
    // Prefer prerecorded for smart punctuation and casing
    return {
      finalTranscript: prerecordTrimmed,
      decisionReason: "identical_words_used_prerecorded_formatting",
    };
  }

  // Check if prerecorded captured missing initial words (streaming spinup lag)
  // Example: Streaming: "optimized MongoDB queries" vs Prerecorded: "In my previous project I optimized MongoDB queries"
  const streamJoined = streamWords.join(" ");
  const prerecordJoined = prerecordWords.join(" ");

  if (prerecordJoined.endsWith(streamJoined) && prerecordWords.length > streamWords.length) {
    return {
      finalTranscript: prerecordTrimmed,
      decisionReason: "prerecorded_recovered_missing_lead_words",
    };
  }

  // If prerecorded confidence is high (>= 0.75), trust full utterance recognition over streaming chunking
  if (prerecordedConfidence >= 0.75) {
    return {
      finalTranscript: prerecordTrimmed,
      decisionReason: "high_confidence_prerecorded_selected",
    };
  }

  // If prerecorded confidence is low or uncertain, preserve streaming transcript
  return {
    finalTranscript: streamTrimmed,
    decisionReason: "uncertain_prerecorded_preserved_streaming",
  };
}

/**
 * Performs an acoustic second-pass verification using Deepgram Nova-3 Prerecorded API
 * on the exact captured turn audio buffer.
 */
export async function verifyTurnSpeech(params: {
  audioBuffer?: Buffer;
  mimeType?: string;
  liveTranscript: string;
  keyterms?: string[];
  language?: string;
}): Promise<VerificationResult> {
  const { audioBuffer, mimeType, liveTranscript, keyterms = [], language = DEEPGRAM_LANGUAGE } = params;

  // If verification is disabled or no audio buffer provided or no Deepgram key
  if (
    !STT_VERIFICATION_ENABLED ||
    !audioBuffer ||
    audioBuffer.length < 2000 || // Less than ~0.5s audio
    !DEEPGRAM_API_KEY.trim()
  ) {
    return {
      verifiedTranscript: liveTranscript.trim(),
      confidence: 1.0,
      usedVerification: false,
      method: "streaming-preserved",
      wordsCount: liveTranscript.trim().split(/\s+/).filter(Boolean).length,
    };
  }

  try {
    const url = new URL("https://api.deepgram.com/v1/listen");
    url.searchParams.set("model", DEEPGRAM_MODEL);
    url.searchParams.set("language", language);
    url.searchParams.set("smart_format", "true");
    url.searchParams.set("punctuate", "true");
    url.searchParams.set("filler_words", "true");

    // Add technical keyterm parameters (up to 35 terms)
    for (const term of keyterms.slice(0, 35)) {
      if (term && term.trim()) {
        url.searchParams.append("keyterm", term.trim());
      }
    }

    const contentType = mimeType || "audio/webm";

    const response = await axios.post(url.toString(), audioBuffer, {
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY.trim()}`,
        "Content-Type": contentType,
      },
      timeout: 7000,
      maxBodyLength: 25 * 1024 * 1024,
    });

    const alt = response.data?.results?.channels?.[0]?.alternatives?.[0];
    const prerecordedText = alt?.transcript || "";
    const confidence = alt?.confidence ?? 0.85;

    const { finalTranscript } = reconcileTranscripts(liveTranscript, prerecordedText, confidence);

    return {
      verifiedTranscript: finalTranscript,
      confidence,
      usedVerification: true,
      method: "deepgram-prerecorded",
      wordsCount: finalTranscript.split(/\s+/).filter(Boolean).length,
    };
  } catch (error: any) {
    console.warn("[STT Verification] Second pass note:", error.message || error);
    // Graceful fallback: return the live streaming transcript without interrupting candidate
    return {
      verifiedTranscript: liveTranscript.trim(),
      confidence: 0.9,
      usedVerification: false,
      method: "fallback",
      wordsCount: liveTranscript.trim().split(/\s+/).filter(Boolean).length,
    };
  }
}

