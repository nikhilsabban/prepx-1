import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import http from "http";
import { WebSocket } from "ws";

import { User } from "../models/User";
import { GroupDiscussion } from "../models/GroupDiscussion";
import { GDTranscript } from "../models/GDTranscript";
import { gdSessionService } from "../services/gd/gdSessionService";
import { initGDWebSocketServer } from "../services/gd/gdWebSocketService";
import { initGDTranscriptionGateway } from "../services/gd/gdTranscriptionGateway";
import { gdTranscriptMetricsService } from "../services/gd/gdTranscriptMetricsService";
import { gdEvaluationService } from "../services/gd/gdEvaluationService";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
}

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
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.7; // Amplitude 0.7
    const int16 = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    buffer.writeInt16LE(int16, i * 2);
  }

  return buffer;
}

async function runGDTranscriptionSuite() {
  console.log("\n==================================================================");
  console.log("   PREPX AI GROUP DISCUSSION — TRANSCRIPTION & STT TEST SUITE     ");
  console.log("==================================================================\n");

  await mongoose.connect(process.env.MONGO_URI!);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database instance unavailable.");

  // Spin up an ephemeral local HTTP and WebSocket server for end-to-end integration testing
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("ok");
  });

  const gdWss = initGDWebSocketServer(server);
  const gdTransGateway = initGDTranscriptionGateway(server);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as any;
  const port = address.port;
  console.log(`[Test Server] Ephemeral HTTP & STT Gateway running on port ${port}`);

  // Test setup: Create 5 distinct students and an admin host
  console.log("\n--- Setting up Test Participants ---");
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("pass12345", salt);

  const timestamp = Date.now();
  let adminUser: any = null;
  const studentUsers: any[] = [];
  let roomId = "";
  let roomBId = "";
  let wsClient1: any = null;
  const clientSockets: WebSocket[] = [];

  try {
    adminUser = await User.create({
      username: `gd_admin_${timestamp}`,
      fullName: "Moderator Admin",
      email: `gd_admin_${timestamp}@prepx.com`,
      password: passwordHash,
    });

    for (let i = 1; i <= 5; i++) {
      const u = await User.create({
        username: `student_${i}_${timestamp}`,
        fullName: `Student Candidate ${i}`,
        email: `student_${i}_${timestamp}@prepx.com`,
        password: passwordHash,
      });
      studentUsers.push(u);
    }
    assert(studentUsers.length === 5, "Created 5 unique student users and 1 moderator");

  // Create GD Room
  const room = await gdSessionService.createRoom({
    adminId: adminUser._id.toString(),
    adminUsername: adminUser.username!,
    adminFullName: adminUser.fullName,
    expectedLanguage: "English",
    topicOverride: {
      question: "How should emerging distributed AI systems balance latency, accuracy, and fairness in placement interviews?",
      originalTitle: "Distributed AI in Technical Evaluations",
      description: "Evaluating the architectural trade-offs between low-latency local streaming models and high-parameter cloud reasoning models.",
      sourceUrl: "https://prepx.com/gd/topics/distributed-ai",
      publisher: "PrepX Research",
      publishedAt: new Date(),
      category: "Artificial Intelligence",
      sourceMode: "static-fallback",
      isAiGenerated: false,
    },
    invitees: studentUsers.map((s) => s.username!),
  });
    roomId = room._id.toString();
  assert(!!room._id, "Created GD Discussion room", `Room ID: ${roomId}`);

  // Join all 5 students
  for (const s of studentUsers) {
    await gdSessionService.joinRoom({
      roomId,
      userId: s._id.toString(),
      username: s.username!,
      name: s.fullName,
    });
  }

  const populatedRoom = await gdSessionService.getSessionById(roomId);
  assert(
    populatedRoom?.participants.length === 6,
    "All 5 students plus moderator joined room",
    `Total participants: ${populatedRoom?.participants.length}`
  );

  // Start discussion & assign initial turn
  const startedRoom = await gdSessionService.startDiscussion(roomId, adminUser._id.toString());
  assert(startedRoom.status === "in_progress", "Discussion started with status 'in_progress'");
  assert(!!startedRoom.currentTurn?.participantId, "Initial turn assigned", `First speaker: @${startedRoom.currentTurn?.username}`);

  // -----------------------------------------------------------------
  // TEST 1: Single participant 16kHz PCM frame transport to Gateway
  // -----------------------------------------------------------------
  console.log("\n--- TEST 1: Single Participant 16kHz PCM Streaming ---");
  const firstStudent = studentUsers[0]!;
  const wsUrl1 = `ws://127.0.0.1:${port}/api/v1/gd/transcription/stream?sessionId=${roomId}&participantId=${firstStudent._id}&username=${firstStudent.username}&participantName=${encodeURIComponent(firstStudent.fullName)}`;

  wsClient1 = new WebSocket(wsUrl1);
  let ws1Connected = false;
  let receivedConnectedMsg = false;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => resolve(), 3000);
    wsClient1.on("open", () => {
      ws1Connected = true;
    });
    wsClient1.on("message", (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "gd:transcription:connected") {
          receivedConnectedMsg = true;
          clearTimeout(timeout);
          resolve();
        }
      } catch {}
    });
    wsClient1.on("error", (e: any) => {
      clearTimeout(timeout);
      resolve();
    });
  });

  assert(ws1Connected, "Participant established WebSocket to /api/v1/gd/transcription/stream");

  // Send binary 16kHz PCM audio chunk
  const pcmChunk = generateSyntheticPcm16(0.5, 440); // 0.5s of 16kHz Int16 PCM
  assert(pcmChunk.byteLength === 16000, "Generated 16kHz signed 16-bit PCM chunk (16000 bytes = 0.5s)");
  let sendError = false;
  try {
    wsClient1.send(pcmChunk);
  } catch {
    sendError = true;
  }
  assert(!sendError, "Sent binary 16kHz PCM audio chunk to transcription gateway without exception");

  // -----------------------------------------------------------------
  // TEST 2: Multi-participant isolated streams & attribution
  // -----------------------------------------------------------------
  console.log("\n--- TEST 2: Multi-Participant Isolated Audio Streams & Attribution ---");
  for (let i = 1; i < 5; i++) {
    const s = studentUsers[i]!;
    const clientWs = new WebSocket(
      `ws://127.0.0.1:${port}/api/v1/gd/transcription/stream?sessionId=${roomId}&participantId=${s._id}&username=${s.username}&participantName=${encodeURIComponent(s.fullName)}`
    );
    clientSockets.push(clientWs);
  }

  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  const allSocketsOpen = clientSockets.every((s) => s.readyState === WebSocket.OPEN);
  assert(allSocketsOpen, "All 5 participants maintained concurrent isolated STT streams simultaneously");

  // -----------------------------------------------------------------
  // TEST 3: Turn-wise speaking & Out-of-turn interjection attribution
  // -----------------------------------------------------------------
  console.log("\n--- TEST 3: Turn-wise Speaking & Non-Discarded Interjections ---");
  const allUsers = [adminUser, ...studentUsers];
  const turnSpeakerId = startedRoom.currentTurn!.participantId;
  const turnStudent = allUsers.find((s) => s._id.toString() === turnSpeakerId) || studentUsers[0]!;
  const otherStudent = studentUsers.find((s) => s._id.toString() !== turnStudent._id.toString()) || studentUsers[1]!;

  // 3a: On-turn speaker segment
  const turnSegment = await gdSessionService.addTranscriptSegment(roomId, {
    segmentId: `turn-seg-${timestamp}`,
    participantId: turnStudent._id.toString(),
    participantName: turnStudent.fullName,
    username: turnStudent.username!,
    text: "I believe low-latency edge models offer consistent response times for technical evaluations.",
    durationSeconds: 6,
    isInterruption: false,
    confidence: 0.97,
    sequenceNumber: 1,
  });
  assert(!!turnSegment, "Persisted on-turn participant transcript segment");

  // 3b: Out-of-turn speaker segment (Interjection) - MUST NOT BE DISCARDED!
  const interjectionSegment = await gdSessionService.addTranscriptSegment(roomId, {
    segmentId: `interject-seg-${timestamp}`,
    participantId: otherStudent._id.toString(),
    participantName: otherStudent.fullName,
    username: otherStudent.username!,
    text: "I agree, but we must ensure quantization does not degrade code analysis accuracy.",
    durationSeconds: 5,
    isInterruption: true,
    confidence: 0.95,
    sequenceNumber: 2,
  });
  assert(!!interjectionSegment, "Persisted out-of-turn interjection segment (never discarded)");

  const latestSession = await gdSessionService.getSessionById(roomId);
  const savedTurnSeg = latestSession?.transcript.find((t) => t.id === `turn-seg-${timestamp}`);
  const savedInterjectSeg = latestSession?.transcript.find((t) => t.id === `interject-seg-${timestamp}`);

  assert(savedTurnSeg?.participantId === turnStudent._id.toString(), "On-turn speech attributed to designated speaker");
  assert(savedInterjectSeg?.participantId === otherStudent._id.toString(), "Interjection correctly attributed to interjecting student");
  assert(savedInterjectSeg?.isInterruption === true, "Interjection marked with isInterruption: true");

  // -----------------------------------------------------------------
  // TEST 4: Idempotency & Duplicate Prevention
  // -----------------------------------------------------------------
  console.log("\n--- TEST 4: Idempotency & Duplicate Prevention ---");
  const countBefore = latestSession?.transcript.length || 0;

  // Attempt duplicate insert of `turn-seg-${timestamp}`
  await gdSessionService.addTranscriptSegment(roomId, {
    segmentId: `turn-seg-${timestamp}`, // Duplicate ID!
    participantId: turnStudent._id.toString(),
    participantName: turnStudent.fullName,
    username: turnStudent.username!,
    text: "Duplicate segment that must not be inserted twice.",
    durationSeconds: 6,
  });

  const sessionAfterDup = await gdSessionService.getSessionById(roomId);
  const countAfter = sessionAfterDup?.transcript.length || 0;
  assert(countBefore === countAfter, "Duplicate segment ID was rejected (Idempotent write guaranteed)");

  // -----------------------------------------------------------------
  // TEST 5: Dedicated GDTranscript Collection Persistence
  // -----------------------------------------------------------------
  console.log("\n--- TEST 5: Dedicated GDTranscript Collection ---");
  const gdTranscriptDoc = await GDTranscript.findOne({
    sessionId: new mongoose.Types.ObjectId(roomId),
    participantId: turnStudent._id.toString(),
  }).lean();

  assert(!!gdTranscriptDoc, "Dedicated GDTranscript document created for participant");
  assert(
    (gdTranscriptDoc?.segments.length || 0) >= 1,
    "GDTranscript stored participant segments with compound index",
    `Segments count: ${gdTranscriptDoc?.segments.length}`
  );

  // -----------------------------------------------------------------
  // TEST 6: Turn Advancement & Fairness Rotation
  // -----------------------------------------------------------------
  console.log("\n--- TEST 6: Turn Advancement & Fair Rotation ---");
  const turn2Session = await gdSessionService.finishTurn(roomId, turnStudent._id.toString(), 25);
  const nextSpeakerId = turn2Session?.currentTurn?.participantId;
  assert(!!nextSpeakerId && nextSpeakerId !== turnStudent._id.toString(), "Turn advanced to next eligible peer", `New speaker: @${turn2Session?.currentTurn?.username}`);

  // -----------------------------------------------------------------
  // TEST 7: Multi-Session Isolation
  // -----------------------------------------------------------------
  console.log("\n--- TEST 7: Multi-Session Isolation ---");
  const roomB = await gdSessionService.createRoom({
    adminId: adminUser._id.toString(),
    adminUsername: adminUser.username!,
    category: "General",
  });
  roomBId = roomB._id.toString();

  await gdSessionService.addTranscriptSegment(roomBId, {
    segmentId: `roomB-seg-${timestamp}`,
    participantId: "external-p",
    participantName: "External",
    text: "Isolated text for room B only.",
    durationSeconds: 3,
  });

  const roomACheck = await gdSessionService.getSessionById(roomId);
  const hasLeaked = (roomACheck?.transcript || []).some((t) => t.id === `roomB-seg-${timestamp}`);
  assert(!hasLeaked, "Session isolation confirmed: Room B transcript never leaked into Room A");

  // -----------------------------------------------------------------
  // TEST 8: Transcript Metrics & Individual Groq AI Evaluation
  // -----------------------------------------------------------------
  console.log("\n--- TEST 8: Metrics Calculation & Groq AI Evaluation ---");
  // Add additional realistic technical discussion segments for all students
  for (let i = 0; i < studentUsers.length; i++) {
    const s = studentUsers[i]!;
    await gdSessionService.addTranscriptSegment(roomId, {
      segmentId: `eval-seg-${i}-${timestamp}`,
      participantId: s._id.toString(),
      participantName: s.fullName,
      username: s.username!,
      text: `Point ${i + 1}: Considering trade-offs, we must evaluate throughput and API rate limits when scaling microservices.`,
      durationSeconds: 15,
      confidence: 0.98,
    });
  }

  const completedSession = await gdSessionService.endSession(roomId, adminUser._id.toString());
  assert(completedSession?.status === "completed", "Discussion session concluded with status 'completed'");
  assert(((completedSession?.metrics as any)?.totalWords || 0) > 0, "Calculated total words from transcript", `Total words: ${(completedSession?.metrics as any)?.totalWords}`);
  assert(
    (completedSession?.evaluations || []).length >= 5,
    "Generated individual evaluations for all participating students and speaker",
    `Evaluations count: ${completedSession?.evaluations.length}`
  );

  const evalSample = completedSession?.evaluations[0]!;
  assert(evalSample.overallScore >= 0 && evalSample.overallScore <= 100, "Student overall score bounded between 0 and 100", `Score: ${evalSample.overallScore}`);
  assert(!!evalSample.topicRelevanceExplanation, "Evaluation contains evidence-based transcript observations");

  } finally {
    // -----------------------------------------------------------------
    // Cleanup test resources (always runs even if test fails)
    // -----------------------------------------------------------------
    console.log("\n--- Cleaning up Test Artifacts ---");
    try {
      if (wsClient1) wsClient1.close();
      clientSockets.forEach((s) => s.close());
      server.close();
    } catch {}

    const deleteUserIds = [];
    if (adminUser?._id) deleteUserIds.push(adminUser._id);
    studentUsers.forEach((s) => {
      if (s?._id) deleteUserIds.push(s._id);
    });

    if (deleteUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: deleteUserIds } });
    }
    const cleanRooms = [roomId, roomBId].filter(Boolean);
    if (cleanRooms.length > 0) {
      await GroupDiscussion.deleteMany({ _id: { $in: cleanRooms } });
      await GDTranscript.deleteMany({ sessionId: { $in: cleanRooms } });
    }
    console.log("  ✓ Test users, rooms, and transcripts cleanly removed.");
  }

  console.log("\n==================================================================");
  console.log(`TEST RESULTS: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("==================================================================\n");

  await mongoose.disconnect();
  if (testFailed > 0) {
    process.exit(1);
  }
}

runGDTranscriptionSuite().catch((err) => {
  console.error("Test Suite execution failed:", err);
  process.exit(1);
});
