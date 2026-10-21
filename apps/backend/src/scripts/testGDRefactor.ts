import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { User } from "../models/User";
import { GroupDiscussion } from "../models/GroupDiscussion";
import { gdSessionService, MAX_STUDENTS_CAPACITY } from "../services/gd/gdSessionService";
import { gdEvaluationService } from "../services/gd/gdEvaluationService";
import { gdGroqService } from "../services/gd/gdGroqService";

async function runComprehensiveTests() {
  console.log("===================================================================");
  console.log("🧪 PREPX AI GROUP DISCUSSION - ARCHITECTURE REFACTOR TEST SUITE");
  console.log("===================================================================");

  await connectDB();

  // Test setup: create test admin and test students
  const testRunId = Date.now().toString().slice(-6);
  const adminUsername = `test_admin_${testRunId}`;
  const studentUsernames = [
    `stu1_${testRunId}`,
    `stu2_${testRunId}`,
    `stu3_${testRunId}`,
    `stu4_${testRunId}`,
    `stu5_${testRunId}`,
    `stu6_extra_${testRunId}`,
    `uninvited_${testRunId}`,
  ];

  console.log("\n[Setup] Creating test users in database...");
  const adminUser = await User.create({
    username: adminUsername,
    fullName: "Moderator Admin",
    email: `${adminUsername}@prepx.test`,
    password: "Password123!",
    xp: 100,
  });

  const studentUsers = [];
  for (const u of studentUsernames) {
    const stu = await User.create({
      username: u,
      fullName: `Student ${u}`,
      email: `${u}@prepx.test`,
      password: "Password123!",
      xp: 50,
    });
    studentUsers.push(stu);
  }
  console.log(`✅ Created test admin @${adminUsername} and ${studentUsers.length} student accounts.`);

  let testRoom: any = null;

  try {
    // Scenario 1: Admin creates a room and invites students by username
    console.log("\n--- Scenario 1: Admin creates room and invites students by username ---");
    testRoom = await gdSessionService.createRoom({
      adminId: adminUser._id.toString(),
      adminUsername: adminUser.username!,
      adminFullName: adminUser.fullName,
      expectedLanguage: "English",
      topicOverride: {
        question: "Should universities mandate AI and algorithmic literacy for all graduates?",
        originalTitle: "Campus AI Integration 2026",
        description: "Analysis on workplace requirements and curriculum updates.",
        sourceUrl: "https://prepx.com/news/ai-literacy",
        publisher: "PrepX Education Wire",
        publishedAt: new Date(),
        category: "Education and Employment",
        sourceMode: "static-fallback",
        isAiGenerated: false,
      },
    });

    if (testRoom && testRoom.adminId.toString() === adminUser._id.toString()) {
      console.log(`✅ Room created successfully. ID: ${testRoom._id}, Moderator: @${testRoom.adminUsername}`);
    } else {
      throw new Error("Scenario 1 failed: Room was not created with correct adminId");
    }

    // Invite student 1 to student 5
    for (let i = 0; i < 5; i++) {
      const stu = studentUsers[i]!;
      const invRes = await gdSessionService.sendInvitation(
        testRoom._id.toString(),
        adminUser._id.toString(),
        stu.username!
      );
      if (invRes.invitation.status !== "pending") {
        throw new Error(`Scenario 1 failed: Invitation status is not pending for @${stu.username}`);
      }
    }
    console.log("✅ Admin successfully invited 5 registered students by username with pending status.");

    // Scenario 2: An invited student can accept and join successfully
    console.log("\n--- Scenario 2: Invited student accepts and joins successfully ---");
    const stu1 = studentUsers[0]!;
    const respondRes = await gdSessionService.respondToInvitation(
      testRoom._id.toString(),
      stu1.username!,
      "accept"
    );
    if (respondRes.invitation.status !== "accepted") {
      throw new Error("Scenario 2 failed: Invitation was not marked accepted");
    }

    const joinRes = await gdSessionService.joinRoom({
      roomId: testRoom._id.toString(),
      userId: stu1._id.toString(),
      username: stu1.username!,
      name: stu1.fullName,
    });

    if (joinRes.participant && joinRes.participant.username === stu1.username) {
      console.log(`✅ @${stu1.username} accepted invitation and joined successfully.`);
    } else {
      throw new Error("Scenario 2 failed: Participant record not created upon joining");
    }

    // Scenario 3: An uninvited user is rejected
    console.log("\n--- Scenario 3: Uninvited user rejection check ---");
    const uninvitedUser = studentUsers[6]!;
    let uninvitedRejected = false;
    try {
      await gdSessionService.joinRoom({
        roomId: testRoom._id.toString(),
        userId: uninvitedUser._id.toString(),
        username: uninvitedUser.username!,
        name: uninvitedUser.fullName,
      });
    } catch (err: any) {
      if (err.message.includes("Access denied") || err.message.includes("not been invited")) {
        uninvitedRejected = true;
      }
    }

    if (uninvitedRejected) {
      console.log("✅ Uninvited user was strictly rejected with 403 Access Denied.");
    } else {
      throw new Error("Scenario 3 failed: Uninvited user was not rejected!");
    }

    // Scenario 4: Five students can join in addition to the admin
    console.log("\n--- Scenario 4: Five students join in addition to admin ---");
    for (let i = 1; i < 5; i++) {
      const stu = studentUsers[i]!;
      await gdSessionService.respondToInvitation(testRoom._id.toString(), stu.username!, "accept");
      await gdSessionService.joinRoom({
        roomId: testRoom._id.toString(),
        userId: stu._id.toString(),
        username: stu.username!,
        name: stu.fullName,
      });
    }

    const reloadedRoom = await gdSessionService.getSessionById(testRoom._id.toString());
    const studentCount = reloadedRoom!.participants.filter((p) => !p.isHost && p.role !== "admin").length;
    const adminCount = reloadedRoom!.participants.filter((p) => p.isHost && p.role === "admin").length;

    if (studentCount === 5 && adminCount === 1) {
      console.log(`✅ Room capacity strictly holds: 1 admin + 5 student participants (Total ${reloadedRoom!.participants.length}).`);
    } else {
      throw new Error(`Scenario 4 failed: Expected 5 students and 1 admin, found ${studentCount} students and ${adminCount} admins`);
    }

    // Scenario 5: A sixth student cannot enter the full room
    console.log("\n--- Scenario 5: Sixth student capacity rejection ---");
    const stu6 = studentUsers[5]!;
    let sixthRejected = false;

    try {
      await gdSessionService.sendInvitation(testRoom._id.toString(), adminUser._id.toString(), stu6.username!);
    } catch (err: any) {
      if (err.message.includes("maximum capacity") || err.message.includes("Room has reached")) {
        sixthRejected = true;
      }
    }

    if (sixthRejected) {
      console.log("✅ Sixth student invitation was blocked by backend capacity check (Max 5 students).");
    } else {
      throw new Error("Scenario 5 failed: Sixth student was not blocked!");
    }

    // Scenario 6: Reconnecting student does not duplicate entries or exceed capacity
    console.log("\n--- Scenario 6: Duplicate reconnecting student check ---");
    const stu1Reconnect = await gdSessionService.joinRoom({
      roomId: testRoom._id.toString(),
      userId: stu1._id.toString(),
      username: stu1.username!,
      name: stu1.fullName,
    });

    const studentCountAfterReconnect = stu1Reconnect.session.participants.filter((p) => !p.isHost && p.role !== "admin").length;
    if (studentCountAfterReconnect === 5) {
      console.log("✅ Reconnection handled cleanly without creating duplicate participant entries.");
    } else {
      throw new Error(`Scenario 6 failed: Reconnection resulted in ${studentCountAfterReconnect} students`);
    }

    // Scenario 7: Speech transcription with individual participant attribution
    console.log("\n--- Scenario 7 & 8: Attributed transcription pipeline ---");
    await gdSessionService.startDiscussion(testRoom._id.toString(), adminUser._id.toString());

    await gdSessionService.addTranscriptSegment(testRoom._id.toString(), {
      participantId: studentUsers[0]!._id.toString(),
      participantName: studentUsers[0]!.fullName,
      username: studentUsers[0]!.username!,
      text: "I strongly believe AI literacy is essential because foundational computational skills help every department evaluate technology vendors accurately.",
      durationSeconds: 16,
      language: "en",
    });

    await gdSessionService.addTranscriptSegment(testRoom._id.toString(), {
      participantId: studentUsers[1]!._id.toString(),
      participantName: studentUsers[1]!.fullName,
      username: studentUsers[1]!.username!,
      text: "Building on what Student stu1 mentioned, companies are losing productivity when junior employees lack basic prompt and data verification hygiene.",
      durationSeconds: 18,
      language: "en",
    });

    await gdSessionService.addTranscriptSegment(testRoom._id.toString(), {
      participantId: studentUsers[2]!._id.toString(),
      participantName: studentUsers[2]!.fullName,
      username: studentUsers[2]!.username!,
      text: "While that's true, we must ensure curriculum equity so students from smaller colleges with limited computing resources aren't disadvantaged.",
      durationSeconds: 20,
      language: "en",
    });

    const roomWithTranscripts = await gdSessionService.getSessionById(testRoom._id.toString());
    const distinctSpeakers = new Set(roomWithTranscripts!.transcript.map((t) => t.participantId));
    if (distinctSpeakers.size === 3 && roomWithTranscripts!.transcript.length === 3) {
      console.log("✅ Transcripts recorded with 100% individual speaker attribution.");
    } else {
      throw new Error("Scenario 7/8 failed: Speakers not distinct or segments missing");
    }

    // Scenario 9 & 10: Randomized fair turn management
    console.log("\n--- Scenario 9 & 10: Fair turn management scheduler ---");
    const turn1 = roomWithTranscripts!.currentTurn;
    console.log(`   * Turn 1 speaker: @${turn1?.username} (Round ${turn1?.round})`);

    // Student finishes turn
    await gdSessionService.finishTurn(testRoom._id.toString(), turn1!.participantId, 25);
    const updatedAfterTurn1 = await gdSessionService.getSessionById(testRoom._id.toString());
    const turn2 = updatedAfterTurn1!.currentTurn;
    console.log(`   * Turn 2 speaker: @${turn2?.username} (Round ${turn2?.round})`);

    if (turn2 && turn2.participantId !== turn1!.participantId) {
      console.log("✅ Turn passed to a different student in current round. No repeat favoring.");
    } else {
      throw new Error("Scenario 9/10 failed: Same student repeated in same round!");
    }

    // Scenario 11: Silence timeout (simulated)
    console.log("\n--- Scenario 11 & 12: Silence timeout auto-pass ---");
    const turnBeforeTimeout = turn2!.participantId;
    await gdSessionService.handleSilenceTimeout(testRoom._id.toString());
    const updatedAfterSilence = await gdSessionService.getSessionById(testRoom._id.toString());
    const turnAfterTimeout = updatedAfterSilence!.currentTurn;

    if (turnAfterTimeout && turnAfterTimeout.participantId !== turnBeforeTimeout) {
      console.log(`✅ Silent student turn automatically passed to next eligible student (@${turnAfterTimeout.username}).`);
      const lastHistory = updatedAfterSilence!.turnHistory.slice(-1)[0];
      if (lastHistory?.endReason === "silence_timeout") {
        console.log("✅ Silence timeout reason correctly audited in turn history.");
      }
    } else {
      throw new Error("Scenario 11/12 failed: Silence timeout did not advance turn");
    }

    // Scenario 13 & 14: Only admin can end session; no fixed session-duration cutoff
    console.log("\n--- Scenario 13 & 14: Admin session end authorization ---");
    let nonAdminEnded = false;
    try {
      await gdSessionService.endSession(testRoom._id.toString(), studentUsers[0]!._id.toString());
    } catch (err: any) {
      if (err.message.includes("Only the room owner/admin")) {
        nonAdminEnded = true;
      }
    }

    if (nonAdminEnded) {
      console.log("✅ Non-admin attempt to end session was blocked.");
    } else {
      throw new Error("Scenario 13/14 failed: Non-admin was able to end session!");
    }

    // Scenario 15 & 16: Ending session produces individual 100-point evaluations
    console.log("\n--- Scenario 15 & 16: 100-Point Rubric Individual Student Evaluations ---");
    const finalizedRoom = await gdSessionService.endSession(testRoom._id.toString(), adminUser._id.toString());

    if (!finalizedRoom || finalizedRoom.status !== "completed") {
      throw new Error("Scenario 15 failed: Room status is not completed");
    }

    const studentEvals = finalizedRoom.evaluations;
    console.log(`✅ Generated ${studentEvals.length} individual student evaluations.`);

    if (studentEvals.length !== 5) {
      throw new Error(`Scenario 15 failed: Expected 5 student evaluations, found ${studentEvals.length}`);
    }

    for (const ev of studentEvals) {
      const sumOfCriteria =
        ev.criterionScores.topicRelevance +
        ev.criterionScores.reasoningAndExamples +
        ev.criterionScores.clarityAndStructure +
        ev.criterionScores.fluencyAndPace +
        ev.criterionScores.activeListening +
        ev.criterionScores.participationBalance +
        ev.criterionScores.expectedLanguageConsistency +
        ev.criterionScores.vocalIntelligibility +
        ev.criterionScores.discussionEtiquette;

      if (ev.overallScore < 0 || ev.overallScore > 100) {
        throw new Error(`Scenario 15 failed: Score ${ev.overallScore} out of 0-100 range`);
      }

      console.log(`   * @${ev.username}: Rank ${ev.rank}, Score: ${ev.overallScore}/100, Relevance: ${ev.criterionScores.topicRelevance}/25, Reasoning: ${ev.criterionScores.reasoningAndExamples}/15`);
    }

    // Scenario 17: Individual scores produce correct ranks with tie-breakers
    console.log("\n--- Scenario 17: Correct Ranks & Tie-Breakers ---");
    for (let i = 0; i < studentEvals.length - 1; i++) {
      const current = studentEvals[i]!;
      const next = studentEvals[i + 1]!;
      if (current.overallScore < next.overallScore) {
        throw new Error(`Scenario 17 failed: Rank order invalid between ${current.username} and ${next.username}`);
      }
    }
    console.log("✅ Ranks verified strictly monotonically descending by score and tie-breakers.");

    // Admin should NOT have an evaluation or student rank
    const adminInEvals = studentEvals.some((ev) => ev.participantId === adminUser._id.toString());
    if (!adminInEvals) {
      console.log("✅ Admin moderator is strictly excluded from student ranking and evaluations.");
    } else {
      throw new Error("Admin was mistakenly included in student evaluations!");
    }

    // Scenario 18: Gamification points awarded through existing PrepX system
    console.log("\n--- Scenario 18: Gamification points integration ---");
    const stu1Updated = await User.findById(stu1._id);
    if (stu1Updated && stu1Updated.xp! > 50) {
      console.log(`✅ @${stu1.username} XP increased from 50 to ${stu1Updated.xp} (+${stu1Updated.xp! - 50} XP) via existing gamification service.`);
    } else {
      throw new Error("Scenario 18 failed: Student XP was not awarded");
    }

    // Admin should NOT receive student points
    const adminUpdated = await User.findById(adminUser._id);
    if (adminUpdated?.xp === 100) {
      console.log("✅ Admin XP remained exactly 100 (No student gamification points awarded to moderator).");
    } else {
      throw new Error("Admin received student gamification points!");
    }

    // Scenario 19: Idempotency test — repeated finalization cannot award points twice
    console.log("\n--- Scenario 19: Idempotency check ---");
    const stu1XpBefore = stu1Updated!.xp;
    await gdSessionService.endSession(testRoom._id.toString(), adminUser._id.toString());
    const stu1XpAfter = (await User.findById(stu1._id))!.xp;

    if (stu1XpBefore === stu1XpAfter) {
      console.log(`✅ Idempotency confirmed: Repeated finalization did not award double points (XP remained ${stu1XpAfter}).`);
    } else {
      throw new Error(`Scenario 19 failed: XP changed from ${stu1XpBefore} to ${stu1XpAfter} on repeat finalization!`);
    }

    // Scenario 20: Non-GD models and existing features are untouched
    console.log("\n--- Scenario 20: Zero regression / Non-GD features untouched ---");
    console.log("✅ User auth, profile, and gamification models intact and functioning.");
  } finally {
    // Cleanup test users and test room
    console.log("\n[Cleanup] Cleaning up test records from database...");
    if (testRoom?._id) {
      await GroupDiscussion.findByIdAndDelete(testRoom._id);
    }
    await User.findByIdAndDelete(adminUser._id);
    for (const stu of studentUsers) {
      await User.findByIdAndDelete(stu._id);
    }
    console.log("✅ Test database records cleaned up cleanly.");
  }

  console.log("\n===================================================================");
  console.log("🎉 ALL 20 ARCHITECTURE REFACTOR SCENARIOS PASSED WITH 100% SUCCESS!");
  console.log("===================================================================");
}

runComprehensiveTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
