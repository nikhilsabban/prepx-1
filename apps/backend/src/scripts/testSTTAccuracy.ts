import WebSocket from "ws";
import https from "https";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
  console.error("❌ DEEPGRAM_API_KEY is not defined in apps/backend/.env");
  process.exit(1);
}

// ============================================================================
// 1. Test Dataset: Technical Indian-English Speech Scenarios
// ============================================================================
interface TestCase {
  id: string;
  category: string;
  referenceText: string;
  expectedKeywords: string[];
  expectedNumbersAndAcronyms: string[];
}

const TEST_CASES: TestCase[] = [
  {
    id: "TC-01",
    category: "Database & Backend Performance (Indian Accent / Tech Terms)",
    referenceText:
      "In my previous project at Infosys, I optimized MongoDB aggregation queries and B-Tree indexes, reducing P99 latency by 45 percent for 15000 requests per minute.",
    expectedKeywords: ["Infosys", "MongoDB", "aggregation", "indexes", "latency", "requests", "minute"],
    expectedNumbersAndAcronyms: ["B-Tree", "P99", "45", "15000"],
  },
  {
    id: "TC-02",
    category: "Microservices & Auth Architecture",
    referenceText:
      "We built a microservices architecture using Node.js, Express, and Docker. For security, we implemented OAuth 2.0 with JWT tokens and RSA-256 signing algorithms.",
    expectedKeywords: ["microservices", "architecture", "Node.js", "Express", "Docker", "security", "algorithms"],
    expectedNumbersAndAcronyms: ["OAuth", "2.0", "JWT", "RSA-256"],
  },
  {
    id: "TC-03",
    category: "Cloud Infrastructure & CI/CD Pipelines",
    referenceText:
      "I deployed our Kubernetes cluster on AWS EKS using Terraform. Our GitHub Actions CI/CD pipeline runs unit tests with Jest and achieves 92 percent code coverage.",
    expectedKeywords: ["Kubernetes", "cluster", "Terraform", "GitHub", "pipeline", "Jest", "coverage"],
    expectedNumbersAndAcronyms: ["AWS", "EKS", "CI/CD", "92"],
  },
  {
    id: "TC-04",
    category: "Spoken Pauses, Self-Correction & Conversational Answer",
    referenceText:
      "Well, basically we first tried using Redis for caching, I mean in-memory caching, but then switched to Memcached because our key-value lookups were strictly under 25 milliseconds.",
    expectedKeywords: ["basically", "Redis", "caching", "in-memory", "Memcached", "key-value", "lookups", "milliseconds"],
    expectedNumbersAndAcronyms: ["25"],
  },
];

// ============================================================================
// 2. Metrics & WER Helpers
// ============================================================================
function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function computeWordErrorRate(reference: string, hypothesis: string): number {
  const r = normalizeText(reference);
  const h = normalizeText(hypothesis);
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

function computeAccuracy(expectedItems: string[], hypothesis: string): { matches: number; total: number; rate: number } {
  const normHypo = hypothesis.toLowerCase();
  let matches = 0;
  for (const item of expectedItems) {
    const cleanItem = item.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanHypo = normHypo.replace(/[^a-z0-9]/g, " ");
    if (cleanHypo.includes(cleanItem)) {
      matches++;
    }
  }
  return {
    matches,
    total: expectedItems.length,
    rate: expectedItems.length ? (matches / expectedItems.length) * 100 : 100,
  };
}

function detectDuplicatePhrases(hypothesis: string): number {
  const words = normalizeText(hypothesis);
  let duplicateCount = 0;
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === words[i + 1] && words[i].length > 2) {
      duplicateCount++;
    }
  }
  return duplicateCount;
}

import fs from "fs";

// Cache audio files locally so we don't repeatedly hit the rate limits
async function fetchSpeechAudio(id: string, text: string): Promise<Buffer> {
  const cacheDir = path.resolve(__dirname, "../../scratch/stt_test_audio");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const cacheFile = path.join(cacheDir, `${id}.pcm`);
  if (fs.existsSync(cacheFile)) {
    return fs.readFileSync(cacheFile);
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const postData = JSON.stringify({ text });
        const req = https.request(
          {
            hostname: "api.deepgram.com",
            path: "/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=16000",
            method: "POST",
            headers: {
              Authorization: `Token ${DEEPGRAM_API_KEY}`,
              "Content-Type": "application/json",
            },
          },
          (res) => {
            if (res.statusCode !== 200) {
              return reject(new Error(`TTS failed with status ${res.statusCode}`));
            }
            const chunks: Buffer[] = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks)));
          }
        );
        req.on("error", reject);
        req.write(postData);
        req.end();
      });

      fs.writeFileSync(cacheFile, buffer);
      return buffer;
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw new Error("Failed to generate audio after 3 attempts");
}

// ============================================================================
// 4. Benchmark Execution: Stream audio over Deepgram WebSocket
// ============================================================================
interface ConfigOption {
  name: string;
  wsUrl: string;
  chunkMs: number;
  useDeduplication: boolean;
}

async function runTranscriptionTest(
  audioBuffer: Buffer,
  config: ConfigOption
): Promise<{
  rawTranscript: string;
  timeToFirstMs: number;
  timeToFinalMs: number;
  finalSegmentsCount: number;
}> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let timeToFirstMs = 0;
    let timeToFinalMs = 0;
    let finalSegmentsCount = 0;

    let accumulatedText = "";
    const seenFinals = new Set<string>();

    const ws = new WebSocket(config.wsUrl, {
      headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
    });

    const audioDurationMs = Math.ceil(audioBuffer.length / 32);
    const timeoutMs = audioDurationMs + 4000;

    const timeout = setTimeout(() => {
      try { ws.close(); } catch {}
      resolve({
        rawTranscript: accumulatedText.trim(),
        timeToFirstMs,
        timeToFinalMs: timeToFinalMs || Date.now() - startTime,
        finalSegmentsCount,
      });
    }, timeoutMs);

    ws.on("open", async () => {
      // Chunk size calculation: 16000 Hz * 16-bit mono = 32000 bytes/sec = 32 bytes/ms
      const bytesPerChunk = Math.floor(config.chunkMs * 32);
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      for (let offset = 0; offset < audioBuffer.length; offset += bytesPerChunk) {
        if (ws.readyState !== WebSocket.OPEN) break;
        const chunk = audioBuffer.subarray(offset, Math.min(offset + bytesPerChunk, audioBuffer.length));
        ws.send(chunk);
        await sleep(config.chunkMs);
      }

      // Signal Finalize to flush any remaining audio buffer
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "Finalize" }));
      }

      // Wait 1.5s for Deepgram to emit trailing is_final transcript before close
      await sleep(1500);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "CloseStream" }));
      }
    });

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        const transcript = msg.channel?.alternatives?.[0]?.transcript;

        if (transcript && transcript.trim()) {
          if (timeToFirstMs === 0) {
            timeToFirstMs = Date.now() - startTime;
          }

          if (msg.is_final) {
            finalSegmentsCount++;
            timeToFinalMs = Date.now() - startTime;
            const clean = transcript.trim();

            if (config.useDeduplication) {
              const segKey = `${clean.toLowerCase()}`;
              if (!seenFinals.has(segKey)) {
                seenFinals.add(segKey);
                accumulatedText = accumulatedText
                  ? `${accumulatedText} ${clean}`
                  : clean;
              }
            } else {
              // Baseline naive behavior: simple concatenation without deduplication
              accumulatedText = accumulatedText
                ? `${accumulatedText} ${clean}`
                : clean;
            }
          }
        }
      } catch (err) {
        console.error("Parse error:", err);
      }
    });

    ws.on("close", () => {
      clearTimeout(timeout);
      resolve({
        rawTranscript: accumulatedText.trim(),
        timeToFirstMs: timeToFirstMs || 0,
        timeToFinalMs: timeToFinalMs || (Date.now() - startTime),
        finalSegmentsCount,
      });
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ============================================================================
// 5. Main Benchmark Runner
// ============================================================================
async function runSTTAccuracyBenchmark() {
  console.log("================================================================================");
  console.log(" PrepX AI Interview: Speech-to-Text Accuracy & Latency Benchmark");
  console.log("================================================================================\n");

  const configurations: ConfigOption[] = [
    {
      name: "Config A: Baseline (Default/en-US, no smart_format, 80ms chunks, naive concat)",
      wsUrl: "wss://api.deepgram.com/v1/listen?punctuate=true&interim_results=true&no_delay=true&utterance_end_ms=1000&encoding=linear16&sample_rate=16000",
      chunkMs: 80,
      useDeduplication: false,
    },
    {
      name: "Config B: Candidate 1 (Nova-2, en-IN, smart_format=true, 200ms chunks, deduplicated)",
      wsUrl: "wss://api.deepgram.com/v1/listen?model=nova-2&language=en-IN&smart_format=true&punctuate=true&interim_results=true&no_delay=true&endpointing=300&utterance_end_ms=1000&encoding=linear16&sample_rate=16000",
      chunkMs: 200,
      useDeduplication: true,
    },
    {
      name: "Config C: Candidate 2 (Nova-3, en-IN, smart_format=true, 200ms chunks, deduplicated)",
      wsUrl: "wss://api.deepgram.com/v1/listen?model=nova-3&language=en-IN&smart_format=true&punctuate=true&interim_results=true&no_delay=true&endpointing=300&utterance_end_ms=1000&encoding=linear16&sample_rate=16000",
      chunkMs: 200,
      useDeduplication: true,
    },
  ];

  const overallResults: {
    [configName: string]: {
      totalWER: number;
      keywordMatched: number;
      keywordTotal: number;
      acronymMatched: number;
      acronymTotal: number;
      avgLatencyFirst: number;
      avgLatencyFinal: number;
      duplicates: number;
    };
  } = {};

  for (const cfg of configurations) {
    overallResults[cfg.name] = {
      totalWER: 0,
      keywordMatched: 0,
      keywordTotal: 0,
      acronymMatched: 0,
      acronymTotal: 0,
      avgLatencyFirst: 0,
      avgLatencyFinal: 0,
      duplicates: 0,
    };
  }

  // Pre-generate audio for identical input
  console.log("🎙️  Synthesizing identical test audio clips for reproducible evaluation...\n");
  const testAudios: { testCase: TestCase; buffer: Buffer }[] = [];
  for (const tc of TEST_CASES) {
    process.stdout.write(`Generating audio for ${tc.id}: ${tc.category}... `);
    const buf = await fetchSpeechAudio(tc.id, tc.referenceText);
    testAudios.push({ testCase: tc, buffer: buf });
    console.log(`✅ (${buf.length} bytes PCM)`);
    await new Promise((r) => setTimeout(r, 600));
  }
  console.log("\n--------------------------------------------------------------------------------");

  for (const { testCase, buffer } of testAudios) {
    console.log(`\n📌 Evaluating [${testCase.id}] ${testCase.category}`);
    console.log(`Reference: "${testCase.referenceText}"`);

    for (const cfg of configurations) {
      const res = await runTranscriptionTest(buffer, cfg);
      const wer = computeWordErrorRate(testCase.referenceText, res.rawTranscript);
      const kwAcc = computeAccuracy(testCase.expectedKeywords, res.rawTranscript);
      const acAcc = computeAccuracy(testCase.expectedNumbersAndAcronyms, res.rawTranscript);
      const dupCount = detectDuplicatePhrases(res.rawTranscript);

      // Accumulate
      const stats = overallResults[cfg.name];
      stats.totalWER += wer;
      stats.keywordMatched += kwAcc.matches;
      stats.keywordTotal += kwAcc.total;
      stats.acronymMatched += acAcc.matches;
      stats.acronymTotal += acAcc.total;
      stats.avgLatencyFirst += res.timeToFirstMs;
      stats.avgLatencyFinal += res.timeToFinalMs;
      stats.duplicates += dupCount;

      console.log(`\n  ▸ ${cfg.name.split(":")[0]}:`);
      console.log(`    Transcript: "${res.rawTranscript}"`);
      console.log(
        `    WER: ${(wer * 100).toFixed(1)}% | Keywords: ${kwAcc.matches}/${kwAcc.total} (${kwAcc.rate.toFixed(0)}%) | Numbers/Acronyms: ${acAcc.matches}/${acAcc.total} (${acAcc.rate.toFixed(0)}%)`
      );
      console.log(
        `    Latency to First: ${res.timeToFirstMs}ms | Time to Final: ${res.timeToFinalMs}ms | Duplicates: ${dupCount}`
      );
    }
  }

  // ============================================================================
  // Overall Summary Table
  // ============================================================================
  console.log("\n================================================================================");
  console.log(" OVERALL BENCHMARK COMPARISON SUMMARY");
  console.log("================================================================================");
  const n = TEST_CASES.length;

  for (const cfg of configurations) {
    const s = overallResults[cfg.name];
    const avgWer = (s.totalWER / n) * 100;
    const kwPercent = (s.keywordMatched / s.keywordTotal) * 100;
    const acPercent = (s.acronymMatched / s.acronymTotal) * 100;
    const avgFirst = Math.round(s.avgLatencyFirst / n);
    const avgFinal = Math.round(s.avgLatencyFinal / n);

    console.log(`\n• ${cfg.name}`);
    console.log(`  - Mean Word Error Rate (WER):     ${avgWer.toFixed(2)}% (Lower is better)`);
    console.log(`  - Keyword Recognition Accuracy:   ${kwPercent.toFixed(1)}% (${s.keywordMatched}/${s.keywordTotal})`);
    console.log(`  - Numbers & Acronyms Accuracy:    ${acPercent.toFixed(1)}% (${s.acronymMatched}/${s.acronymTotal})`);
    console.log(`  - Avg Latency to First Result:    ${avgFirst} ms`);
    console.log(`  - Avg Latency to Final Result:    ${avgFinal} ms`);
    console.log(`  - Duplication Incidents:          ${s.duplicates}`);
  }

  console.log("\n================================================================================\n");
}

runSTTAccuracyBenchmark().catch((err) => {
  console.error("Benchmark failed with error:", err);
  process.exit(1);
});
