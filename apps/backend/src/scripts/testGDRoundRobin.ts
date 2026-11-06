import dotenv from "dotenv";
import path from "path";
import dns from "dns";
import mongoose from "mongoose";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { GroupDiscussion } from "../models/GroupDiscussion";
import { GDTranscript } from "../models/GDTranscript";
import { gdSessionService } from "../services/gd/gdSessionService";
import { gdEvaluationService } from "../services/gd/gdEvaluationService";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

async function run() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured");
  await mongoose.connect(process.env.MONGO_URI);

  const timestamp = Date.now();
  const testUsers: any[] = [];
  let roomId = "";
  try {
    const password = await bcrypt.hash(`gd-test-${timestamp}`, 10);
    const host = await User.create({
      username: `gd_test_host_${timestamp}`,
      fullName: "GD Test Host",
      email: `gd_test_host_${timestamp}@prepx.com`,
      password,
      isVerified: true,
    });
    testUsers.push(host);

    const labels = ["A", "B", "C", "D"];
    const students = [];
    for (const label of labels) {
      const username = `gd_test_student_${label.toLowerCase()}_${timestamp}`;
      const student = await User.create({
        username,
        fullName: `GD Test Student ${label}`,
        email: `${username}@prepx.com`,
        password,
        isVerified: true,
      });
      students.push(student);
      testUsers.push(student);
    }

    const room = await gdSessionService.createRoom({
      adminId: host._id.toString(),
      adminUsername: host.username!,
      adminFullName: host.fullName,
      topicOverride: {
        question: "How should artificial intelligence support human decision-making?",
        originalTitle: "Artificial intelligence and human decision-making",
        description: "A discussion about the benefits and limits of AI in society.",
        sourceUrl: "https://example.invalid/gd-test-topic",
        publisher: "PrepX GD regression suite",
        category: "Technology",
        sourceMode: "static-fallback",
        isAiGenerated: false,
      } as any,
      invitees: students.map((student) => student.username!),
    });
    roomId = room._id.toString();

    for (const student of students) {
      await gdSessionService.joinRoom({
        roomId,
        userId: student._id.toString(),
        username: student.username!,
        name: student.fullName,
      });
    }

    const started = await gdSessionService.startDiscussion(roomId, host._id.toString());
    assert(!started.currentTurn, "Starting the room leaves speaking turns paused for the AI briefing");
    const firstTurnSession = await gdSessionService.beginFirstTurn(roomId, host._id.toString());
    assert(!!firstTurnSession.currentTurn, "Host can begin the first speaking turn after the briefing");

    const studentIds = new Set(students.map((student) => student._id.toString()));
    const roundOrders: string[][] = [];
    for (let round = 1; round <= 10; round++) {
      const order: string[] = [];
      for (let slot = 0; slot < students.length; slot++) {
        const current = await gdSessionService.getSessionById(roomId);
        const turn = current?.currentTurn;
        assert(!!turn, `Round ${round}, slot ${slot + 1}: a speaker is assigned`);
        assert(turn.round === round, `Round ${round}, slot ${slot + 1}: scheduler stays in the current round`);
        assert(studentIds.has(turn.participantId), `Round ${round}, slot ${slot + 1}: host is excluded from student turns`);
        assert(!order.includes(turn.participantId), `Round ${round}, slot ${slot + 1}: no duplicate speaker in the round`);
        order.push(turn.participantId);
        await gdSessionService.finishTurn(roomId, turn.participantId, 25);
      }
      assert(order.length === 4 && new Set(order).size === 4, `Round ${round}: all four students receive one turn`);
      roundOrders.push(order);
    }
    assert(new Set(roundOrders.map((order) => order.join(","))).size > 1, "Ten rounds include randomized speaking orders");

    const round11 = await gdSessionService.getSessionById(roomId);
    const passedId = round11!.currentTurn!.participantId;
    await gdSessionService.passTurn(roomId, passedId);
    const afterPass = await gdSessionService.getSessionById(roomId);
    assert(afterPass!.currentTurn!.participantId !== passedId, "Voluntary pass advances immediately to another student");
    let duplicatePassRejected = false;
    try {
      await gdSessionService.passTurn(roomId, passedId);
    } catch {
      duplicatePassRejected = true;
    }
    assert(duplicatePassRejected, "A duplicate pass from a completed turn is rejected");

    while ((await gdSessionService.getSessionById(roomId))?.currentTurn?.round === 11) {
      const current = await gdSessionService.getSessionById(roomId);
      await gdSessionService.finishTurn(roomId, current!.currentTurn!.participantId, 25);
    }
    const round12Order: string[] = [];
    const concurrentStart = await gdSessionService.getSessionById(roomId);
    const concurrentTurn = concurrentStart!.currentTurn!;
    const concurrentTurnId = `${concurrentTurn.participantId}:${concurrentTurn.round}:${new Date(concurrentTurn.startedAt).getTime()}`;
    const historyCount = concurrentStart!.turnHistory.length;
    await Promise.allSettled([
      gdSessionService.passTurn(roomId, concurrentTurn.participantId),
      gdSessionService.handleTurnTimeout(roomId, concurrentTurnId),
    ]);
    const afterRace = await gdSessionService.getSessionById(roomId);
    assert(afterRace!.turnHistory.length === historyCount + 1, "Simultaneous pass and timeout create exactly one transition");
    round12Order.push(concurrentTurn.participantId);
    while ((await gdSessionService.getSessionById(roomId))?.currentTurn?.round === 12) {
      const current = await gdSessionService.getSessionById(roomId);
      const turn = current!.currentTurn!;
      if (!round12Order.includes(turn.participantId)) round12Order.push(turn.participantId);
      await gdSessionService.finishTurn(roomId, turn.participantId, 25);
    }
    assert(round12Order.length === 4 && round12Order.includes(passedId), "A participant who passed remains eligible in the next round");

    const transcriptId = `gd-idempotency-${timestamp}`;
    const attribution = {
      segmentId: transcriptId,
      roomId,
      participantId: students[0]._id.toString(),
      speakerId: students[0]._id.toString(),
      streamId: `stream-${timestamp}`,
      turnId: `turn-${timestamp}`,
      participantName: students[0].fullName,
      username: students[0].username!,
      text: "Artificial intelligence can support a human decision maker with useful evidence.",
      durationSeconds: 5,
      sequenceNumber: 1,
      confidence: 0.92,
    };
    await gdSessionService.addTranscriptSegment(roomId, attribution);
    await gdSessionService.addTranscriptSegment(roomId, attribution);
    const persisted = await gdSessionService.getSessionById(roomId);
    const transcriptDoc = await GDTranscript.findOne({ sessionId: room._id, participantId: students[0]._id.toString() }).lean();
    assert(persisted!.transcript.filter((segment) => segment.id === transcriptId).length === 1, "Transcript persistence is idempotent in the session record");
    assert(transcriptDoc?.segments.filter((segment) => segment.segmentId === transcriptId).length === 1, "Transcript persistence is idempotent in the participant record");
    const savedSegment = persisted!.transcript.find((segment) => segment.id === transcriptId)!;
    assert(savedSegment.participantId === students[0]._id.toString() && savedSegment.streamId === attribution.streamId && !!savedSegment.turnId, "Persisted transcript retains participant, stream, and turn identity");

    const emptyEvaluation = gdEvaluationService.evaluateStudentWithRules(
      room.topic as any,
      (await gdSessionService.getSessionById(roomId))!.participants.find((participant) => participant.id === students[1]._id.toString()) as any,
      undefined,
      [],
      [],
      0,
      "English"
    );
    assert(emptyEvaluation.overallScore === 0 && Object.values(emptyEvaluation.criterionScores).every((score) => score === 0), "Empty transcripts receive no invented evaluation score");
  } finally {
    if (roomId) {
      await GroupDiscussion.deleteOne({ _id: roomId });
      await GDTranscript.deleteMany({ sessionId: roomId });
    }
    if (testUsers.length) await User.deleteMany({ _id: { $in: testUsers.map((user) => user._id) } });
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("GD fairness regression suite failed:", error);
  process.exitCode = 1;
});
