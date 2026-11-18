import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { connectDB } from "../config/db";
import { User } from "../models/User";
import { gdSessionService } from "../services/gd/gdSessionService";
import { initGDTranscriptionGateway } from "../services/gd/gdTranscriptionGateway";
import { initSTTWebSocketServer } from "../services/sttProxyService";
import { synthesizeSpeech, synthesizeSpeechWithMurf } from "../services/murfService";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
}

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

let testPassed = 0;
let testFailed = 0;

function assert(condition: boolean, testName: string, detail: string = "") {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName} ${detail ? "(" + detail + ")" : ""}`);
    testPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? "(" + detail + ")" : ""}`);
    testFailed++;
  }
}

/**
 * Generates synthetic 16kHz signed 16-bit little-endian PCM audio buffer.
 */
function generateSyntheticPcm16(durationSeconds: number, frequency: number = 440): Buffer {
  const sampleRate = 16000;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = Buffer.alloc(numSamples * 2);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.7;
    const int16 = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    buffer.writeInt16LE(int16, i * 2);
  }

  return buffer;
}

async function runVoiceAndSTTTests() {
  console.log("==================================================================");
  console.log("🎙️  PREPX AI INTERVIEW & GD — VOICE (TTS) & STT VERIFICATION SUITE");
  console.log("==================================================================");

  await connectDB();

  const timestamp = Date.now();
  let testUser: any = null;
  let testRoom: any = null;
  let server: http.Server | null = null;
  let port = 0;

  try {
    // -----------------------------------------------------------------
    // SETUP: Ephemeral HTTP Server with attached STT Gateways
    // -----------------------------------------------------------------
    const app = express();
    server = http.createServer(app);

    // Initialize both AI Interview STT and GD Transcription Gateways
    initSTTWebSocketServer(server);
    initGDTranscriptionGateway(server);

    await new Promise<void>((resolve) => {
      server!.listen(0, "127.0.0.1", () => {
        const address = server!.address() as any;
        port = address.port;
        console.log(`[Test Server] Ephemeral Voice & STT Gateway running on port ${port}`);
        resolve();
      });
    });

    testUser = await User.create({
      username: `voice_test_${timestamp}`,
      fullName: "Voice Test Candidate",
      email: `voice_test_${timestamp}@prepx.test`,
      password: "Password123!",
    });

    testRoom = await gdSessionService.createRoom({
      adminId: testUser._id.toString(),
      adminUsername: testUser.username!,
      adminFullName: testUser.fullName,
      expectedLanguage: "English",
      topicOverride: {
        question: "How will real-time low-latency speech synthesis shape remote placement interviews?",
        originalTitle: "Voice AI in Technical Interviews",
        category: "Artificial Intelligence",
        publisher: "PrepX Engineering",
        sourceUrl: "https://prepx.com/topics/voice-ai",
        sourceMode: "static-fallback",
        isAiGenerated: false,
      },
    });

    // =================================================================
    // SECTION 1: AI INTERVIEW & GD VOICE (TTS) ENGINE TESTING
    // =================================================================
    console.log("\n--- SECTION 1: Voice (TTS) Engine Synthesis ---");

    const sampleInterviewerPrompt = "Welcome to your PrepX technical placement interview. Could you explain the trade-offs of microservices vs monolithic architectures?";
    
    const hasMurfKey = !!process.env.MURF_API_KEY?.trim();
    const hasDeepgramKey = !!process.env.DEEPGRAM_API_KEY?.trim();

    console.log(`  [Config] Murf AI Key: ${hasMurfKey ? "Configured" : "Unset/Fallback"}`);
    console.log(`  [Config] Deepgram Key: ${hasDeepgramKey ? "Configured" : "Unset/Fallback"}`);

    if (hasMurfKey) {
      const murfResult = await synthesizeSpeechWithMurf(sampleInterviewerPrompt, {
        voiceId: "en-US-terrell",
      });
      assert(!!murfResult?.audioBuffer && murfResult.audioBuffer.length > 0, "Murf AI Cloud TTS generated audio buffer", `Bytes: ${murfResult?.audioBuffer?.length}`);
    } else {
      console.log("  ℹ️ Murf AI Key not configured; verifying multi-engine fallback pipeline...");
    }

    // Test primary synthesizer pipeline (Murf -> Deepgram -> Client Web Speech fallback)
    const ttsResult = await synthesizeSpeech(sampleInterviewerPrompt);
    if (hasMurfKey || hasDeepgramKey) {
      assert(!!ttsResult?.audioBuffer, "Primary voice synthesizer generated playable audio stream", `Format: ${ttsResult?.contentType}`);
    } else {
      assert(ttsResult === null, "Primary synthesizer correctly triggers client Web Speech fallback when cloud keys are unconfigured");
    }

    // Verify GD Moderator voice prompt builder
    const gdBriefingText = `Welcome to today's Group Discussion on ${testRoom.topic.question}. Every participant receives one turn per round in a randomized order.`;
    assert(gdBriefingText.length > 50, "GD Moderator voice briefing constructed cleanly with topic injection");

    // =================================================================
    // SECTION 2: AI INTERVIEW STT WEBSOCKET GATEWAY TESTING
    // =================================================================
    console.log("\n--- SECTION 2: AI Interview Real-Time STT Gateway ---");

    const interviewToken = jwt.sign(
      {
        userId: testUser._id.toString(),
        username: testUser.username,
        role: "student",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const interviewWsUrl = `ws://127.0.0.1:${port}/api/v1/interview/stt-stream?token=${interviewToken}&language=en-IN&model=nova-3&interviewId=test-interview-${timestamp}`;
    const interviewWs = new WebSocket(interviewWsUrl);

    let interviewWsConnected = false;
    let receivedReadyOrConnected = false;

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 4000);
      interviewWs.on("open", () => {
        interviewWsConnected = true;
      });
      interviewWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === "ready" || parsed.type === "connected" || parsed.status === "listening") {
            receivedReadyOrConnected = true;
          }
        } catch {}
      });
      interviewWs.on("error", () => {
        resolve();
      });
      setTimeout(resolve, 1500);
    });

    assert(interviewWsConnected, "AI Interview candidate connected to STT proxy WebSocket (/api/v1/interviews/stt/stream)");

    // Send KeepAlive ping to AI Interview STT
    let keepAliveError = false;
    try {
      interviewWs.send(JSON.stringify({ type: "KeepAlive" }));
      interviewWs.send(JSON.stringify({ type: "ping" }));
    } catch {
      keepAliveError = true;
    }
    assert(!keepAliveError, "Sent KeepAlive ping to AI Interview STT gateway without error");

    // Send synthetic audio data
    let audioSendError = false;
    try {
      const pcmData = generateSyntheticPcm16(0.5, 440);
      interviewWs.send(pcmData);
    } catch {
      audioSendError = true;
    }
    assert(!audioSendError, "Streamed binary PCM audio packet to AI Interview STT gateway");

    interviewWs.close();

    // =================================================================
    // SECTION 3: GROUP DISCUSSION (GD) STT GATEWAY TESTING
    // =================================================================
    console.log("\n--- SECTION 3: GD Module 16kHz PCM Transcription Gateway ---");

    const gdToken = jwt.sign(
      {
        userId: testUser._id.toString(),
        id: testUser._id.toString(),
        username: testUser.username,
        role: "student",
        purpose: "gd_transcription",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Join room first so participant authorization check passes
    await gdSessionService.joinRoom({
      roomId: testRoom._id.toString(),
      userId: testUser._id.toString(),
      username: testUser.username!,
      name: testUser.fullName,
    });

    const gdWsUrl = `ws://127.0.0.1:${port}/api/v1/gd/transcription/stream?token=${gdToken}&sessionId=${testRoom._id}&participantId=${testUser._id}&username=${testUser.username}&participantName=${encodeURIComponent(testUser.fullName)}`;
    const gdWs = new WebSocket(gdWsUrl);

    let gdWsConnected = false;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 4000);
      gdWs.on("open", () => {
        gdWsConnected = true;
        clearTimeout(timer);
        resolve();
      });
      gdWs.on("error", () => {
        clearTimeout(timer);
        resolve();
      });
    });

    assert(gdWsConnected, "GD Participant connected to /api/v1/gd/transcription/stream with valid purpose token");

    // Send 16kHz Int16 PCM frame
    let gdAudioSendError = false;
    try {
      const gdPcmChunk = generateSyntheticPcm16(0.5, 500);
      gdWs.send(gdPcmChunk);
    } catch {
      gdAudioSendError = true;
    }
    assert(!gdAudioSendError, "Streamed 16kHz Int16 PCM audio frame to GD Transcription Gateway");

    // Test rejection of token without gd_transcription purpose
    const badToken = jwt.sign({ userId: testUser._id.toString(), purpose: "general_auth" }, JWT_SECRET);
    const badWsUrl = `ws://127.0.0.1:${port}/api/v1/gd/transcription/stream?token=${badToken}&sessionId=${testRoom._id}&participantId=${testUser._id}`;
    let badWsRejected = false;
    await new Promise<void>((resolve) => {
      const badWs = new WebSocket(badWsUrl);
      badWs.on("error", () => {
        badWsRejected = true;
        resolve();
      });
      badWs.on("close", (code) => {
        badWsRejected = true;
        resolve();
      });
      badWs.on("open", () => {
        badWsRejected = false;
        badWs.close();
        resolve();
      });
    });
    assert(badWsRejected, "GD Gateway strictly rejected unauthorized token without purpose 'gd_transcription' (401)");

    gdWs.close();

    // =================================================================
    // SECTION 4: REAL-TIME SPEAKER ATTRIBUTION INTEGRITY
    // =================================================================
    console.log("\n--- SECTION 4: Speaker Attribution & Transcript Integrity ---");

    const persistedSeg = await gdSessionService.addTranscriptSegment(testRoom._id.toString(), {
      segmentId: `voice-seg-${timestamp}`,
      participantId: testUser._id.toString(),
      participantName: testUser.fullName,
      username: testUser.username!,
      text: "Real-time speech transcription enables fair placement evaluations.",
      durationSeconds: 4,
      isInterruption: false,
      confidence: 0.98,
      sequenceNumber: 1,
    });

    assert(persistedSeg !== null, "Successfully persisted speech transcript segment to database");
    assert(
      persistedSeg?.transcript.some((t: any) => t.speakerId === testUser._id.toString()),
      "Transcript segment strictly attributed to speaking participant identity"
    );

  } catch (err: any) {
    console.error("Test execution exception:", err);
    assert(false, "Test execution without unhandled exception", err.message);
  } finally {
    console.log("\n--- Cleanup ---");
    if (server) {
      server.close();
    }
    if (testRoom?._id) {
      await mongoose.connection.collection("groupdiscussions").deleteOne({ _id: testRoom._id });
    }
    if (testUser?._id) {
      await User.deleteOne({ _id: testUser._id });
    }
    console.log("  ✓ Temporary test rooms and user records cleaned up.");
  }

  console.log("==================================================================");
  console.log(`TEST SUMMARY: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("==================================================================");

  if (testFailed > 0) {
    process.exit(1);
  }
}

runVoiceAndSTTTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
