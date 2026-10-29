import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";

import { User } from "../models/User.js";
import { Interview } from "../models/Interview.js";
import { Message } from "../models/Message.js";
import { Resume } from "../models/Resume.js";
import { JobDescription } from "../models/JobDescription.js";
import { ResumeAnalysis } from "../models/ResumeAnalysis.js";
import { GroupDiscussion } from "../models/GroupDiscussion.js";
import { CodingProblem } from "../models/CodingProblem.js";
import { CodingSubmission } from "../models/CodingSubmission.js";

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

async function runTestSuite() {
  console.log("\n==================================================================");
  console.log("       PREPX MONGODB REDESIGN & QUERY OPTIMIZATION SUITE           ");
  console.log("==================================================================\n");

  await mongoose.connect(process.env.MONGO_URI!);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database instance.");

  // Test 1: Collections Audit
  console.log("--- 1. Collection Structure & Active Schemas ---");
  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  assert(collections.includes("users"), "Collection 'users' exists");
  assert(collections.includes("interviews"), "Collection 'interviews' exists");
  assert(collections.includes("messages"), "Collection 'messages' exists");
  assert(collections.includes("resumes"), "Collection 'resumes' exists");
  assert(collections.includes("jobdescriptions"), "Collection 'jobdescriptions' exists");
  assert(collections.includes("resumeanalyses"), "Collection 'resumeanalyses' exists");
  assert(collections.includes("groupdiscussions"), "Collection 'groupdiscussions' exists");
  assert(collections.includes("codingproblems"), "Collection 'codingproblems' exists");
  assert(collections.includes("codingsubmissions"), "Collection 'codingsubmissions' exists");

  // Check no obsolete collections remain
  const obsoleteRemaining = ["problems", "submissions", "testcases", "systemsettings", "jobs"].filter((c) =>
    collections.includes(c)
  );
  assert(obsoleteRemaining.length === 0, "No obsolete collections remaining in database", obsoleteRemaining.join(", "));

  // Test 2: Validation Rules & Schema Constraints
  console.log("\n--- 2. Schema Validation Rules ---");
  let caughtEmailError = false;
  try {
    const invalidUser = new User({
      fullName: "Test Invalid",
      email: "not-an-email",
      password: "password123",
    });
    await invalidUser.validate();
  } catch (err: any) {
    caughtEmailError = !!err.errors?.email;
  }
  assert(caughtEmailError, "Email regex validation correctly rejects invalid emails");

  let caughtScoreError = false;
  try {
    const invalidAnalysis = new ResumeAnalysis({
      userId: new mongoose.Types.ObjectId(),
      resumeId: new mongoose.Types.ObjectId(),
      atsScore: 150, // Max is 100
      jobMatchScore: -5, // Min is 0
    });
    await invalidAnalysis.validate();
  } catch (err: any) {
    caughtScoreError = !!err.errors?.atsScore && !!err.errors?.jobMatchScore;
  }
  assert(caughtScoreError, "Numeric score validation rejects out-of-bounds ATS and match scores");

  // Test 3: Unique Index Constraint Enforcement
  console.log("\n--- 3. Unique Index Constraints ---");
  const uniqueTestEmail = `audit_unique_${Date.now()}@prepx.com`;
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("securePassword123", salt);

  const testUser = await User.create({
    fullName: "Audit Verification User",
    email: uniqueTestEmail,
    username: `audit_user_${Date.now()}`,
    password: passwordHash,
    college: "Test University",
  });
  assert(!!testUser._id, "Created initial test user for unique index check");

  let caughtDuplicateKey = false;
  try {
    await User.create({
      fullName: "Duplicate User",
      email: uniqueTestEmail, // Duplicate!
      password: passwordHash,
    });
  } catch (err: any) {
    caughtDuplicateKey = err.code === 11000 || String(err).includes("E11000");
  }
  assert(caughtDuplicateKey, "Unique index on email rejects duplicate record with code E11000");

  // Test 4: Interview & Message Relations
  console.log("\n--- 4. Feature Integration: AI Interview & Messages ---");
  const testInterview = await Interview.create({
    userId: testUser._id,
    title: "Software Engineer Mock Interview",
    mode: "role",
    role: "Full Stack Engineer",
    difficulty: "Medium",
    status: "InProgress",
  });
  assert(!!testInterview._id, "Created interview session");

  const msg1 = await Message.create({
    interviewId: testInterview._id,
    type: "Assistant",
    message: "Tell me about your experience with microservices.",
  });
  const msg2 = await Message.create({
    interviewId: testInterview._id,
    type: "User",
    message: "I designed and deployed scalable Node.js microservices with Docker.",
  });
  assert(!!msg1._id && !!msg2._id, "Saved bidirectional interview messages");

  const messages = await Message.find({ interviewId: testInterview._id }).sort({ createdAt: 1 }).lean();
  assert(messages.length === 2 && messages[0].type === "Assistant", "Retrieved ordered interview transcript");

  // Update interview status and score
  await Interview.updateOne(
    { _id: testInterview._id },
    { $set: { status: "Done", score: 88, feedback: "Excellent architectural understanding." } }
  );
  const updatedInterview = await Interview.findById(testInterview._id).lean();
  assert(updatedInterview?.status === "Done" && updatedInterview?.score === 88, "Updated interview score and status");

  // Test 5: Resume & Resume Analysis Relations
  console.log("\n--- 5. Feature Integration: Resume Analyzer ---");
  const testResume = await Resume.create({
    userId: testUser._id,
    originalFileName: "john_doe_resume.pdf",
    fileType: "application/pdf",
    fileSize: 1048576,
    extractedText: "Full stack software engineer with 4 years experience in React, Node.js, and MongoDB.",
    structuredData: { skills: ["React", "Node.js", "MongoDB"] },
  });
  assert(!!testResume._id, "Persisted uploaded resume and extracted text");

  const testJD = await JobDescription.create({
    userId: testUser._id,
    title: "Senior Backend Developer",
    company: "Google DeepMind",
    description: "Seeking backend engineer experienced in Node.js, distributed databases, and high-concurrency systems.",
    extractedRequirements: { requiredSkills: ["Node.js", "MongoDB", "Distributed Systems"] },
  });
  assert(!!testJD._id, "Persisted target job description");

  const testAnalysis = await ResumeAnalysis.create({
    userId: testUser._id,
    resumeId: testResume._id,
    jobDescriptionId: testJD._id,
    atsScore: 84,
    jobMatchScore: 81,
    scoreBreakdown: {
      keywordMatch: 85,
      jobAlignment: 82,
      skillsMatch: 86,
      experienceRelevance: 80,
      structure: 85,
      formatting: 90,
      contactInformation: 100,
    },
    matchedSkills: ["Node.js", "MongoDB"],
    missingSkills: ["Distributed Systems"],
    strengths: ["Strong backend stack alignment", "Clean formatting"],
    recommendations: [
      {
        priority: "HIGH",
        category: "Keywords",
        suggestion: "Add experience with distributed systems and message brokers.",
      },
    ],
  });
  assert(!!testAnalysis._id, "Persisted ATS analysis breakdown");

  const analysisHistory = await ResumeAnalysis.find({ userId: testUser._id }).sort({ createdAt: -1 }).lean();
  assert(analysisHistory.length >= 1, "Retrieved user resume analysis history");

  // Test 6: Coding Problems & Submissions
  console.log("\n--- 6. Feature Integration: AI Coding Platform ---");
  const problems = await CodingProblem.find({ hidden: false }).sort({ number: 1 }).limit(5).lean();
  assert(problems.length > 0, "Retrieved reference DSA coding problems", `${problems.length} problems fetched`);

  const firstProblem = problems[0];
  const submission = await CodingSubmission.create({
    user: testUser._id,
    problem: firstProblem._id,
    language: "python",
    code: "def solve(): return True",
    verdict: "Accepted",
    runtime: "42ms",
    memory: "16.4MB",
    testsPassed: 10,
    testsTotal: 10,
  });
  assert(!!submission._id, "Recorded coding submission with verdict 'Accepted'");

  const userSubmissions = await CodingSubmission.find({ user: testUser._id, problem: firstProblem._id }).lean();
  assert(userSubmissions.length === 1, "Retrieved user problem submission record");

  // Test 7: Group Discussion Room & Transcript
  console.log("\n--- 7. Feature Integration: AI Group Discussion ---");
  const gdRoom = await GroupDiscussion.create({
    adminId: testUser._id,
    adminUsername: testUser.username,
    expectedLanguage: "English",
    status: "in_progress",
    topic: {
      question: "Should AI be integrated into modern technical interviews?",
      originalTitle: "AI in Technical Interviews",
      description: "Discussion on fairness, speed, and candidate evaluation.",
      sourceUrl: "https://example.com/gd-topic",
      publisher: "TechCrunch",
      publishedAt: new Date(),
      category: "Technology",
      sourceMode: "static-fallback",
      isAiGenerated: false,
    },
    participants: [
      {
        id: "p1",
        userId: testUser._id,
        username: testUser.username,
        name: testUser.fullName,
        role: "admin",
        avatar: "",
        isAi: false,
        isHost: true,
        speakingTimeSeconds: 45,
        segmentCount: 2,
        wordCount: 120,
        percentSpeakingTime: 50,
      },
    ],
    invitations: [
      {
        userId: new mongoose.Types.ObjectId(),
        username: "student_peer",
        status: "pending",
        invitedAt: new Date(),
      },
    ],
    transcript: [
      {
        id: "t1",
        participantId: "p1",
        participantName: testUser.fullName,
        username: testUser.username,
        text: "I believe AI interviews allow consistent objective screening at scale.",
        timestamp: new Date(),
        durationSeconds: 15,
      },
    ],
  });
  assert(!!gdRoom._id, "Created GD room with topic metadata, participants, and live transcript segment");

  const activeGdRooms = await GroupDiscussion.find({
    "invitations.username": "student_peer",
    status: { $ne: "abandoned" },
  }).lean();
  assert(activeGdRooms.length === 1, "Retrieved user invitation from active GD rooms");

  // Test 8: Query Execution Plan (Explain IXSCAN) Verification
  console.log("\n--- 8. Query Optimization & Index Scan (IXSCAN) Verification ---");

  const userExplain = await User.find({ email: uniqueTestEmail }).explain("executionStats");
  const userWinningPlan = (userExplain as any).queryPlanner?.winningPlan;
  const userUsesIndex = JSON.stringify(userWinningPlan).includes("IXSCAN");
  assert(userUsesIndex, "User lookup by email utilizes index scan (IXSCAN)");

  const interviewExplain = await Interview.find({ userId: testUser._id }).sort({ createdAt: -1 }).explain("executionStats");
  const interviewWinningPlan = (interviewExplain as any).queryPlanner?.winningPlan;
  const interviewUsesIndex = JSON.stringify(interviewWinningPlan).includes("IXSCAN");
  assert(interviewUsesIndex, "Interview history query utilizes compound index { userId: 1, createdAt: -1 } (IXSCAN)");

  const msgExplain = await Message.find({ interviewId: testInterview._id }).sort({ createdAt: 1 }).explain("executionStats");
  const msgWinningPlan = (msgExplain as any).queryPlanner?.winningPlan;
  const msgUsesIndex = JSON.stringify(msgWinningPlan).includes("IXSCAN");
  assert(msgUsesIndex, "Message conversation query utilizes compound index { interviewId: 1, createdAt: 1 } (IXSCAN)");

  const gdExplain = await GroupDiscussion.find({
    "invitations.username": "student_peer",
    status: "in_progress",
  }).sort({ createdAt: -1 }).explain("executionStats");
  const gdWinningPlan = (gdExplain as any).queryPlanner?.winningPlan;
  const gdUsesIndex = JSON.stringify(gdWinningPlan).includes("IXSCAN");
  assert(gdUsesIndex, "GD invitation inbox query utilizes compound index { invitations.username: 1, status: 1, createdAt: -1 } (IXSCAN)");

  // Clean up test audit documents
  console.log("\n--- 9. Cleaning Up Audit Test Documents ---");
  await User.deleteOne({ _id: testUser._id });
  await Interview.deleteOne({ _id: testInterview._id });
  await Message.deleteMany({ interviewId: testInterview._id });
  await Resume.deleteOne({ _id: testResume._id });
  await JobDescription.deleteOne({ _id: testJD._id });
  await ResumeAnalysis.deleteOne({ _id: testAnalysis._id });
  await CodingSubmission.deleteOne({ _id: submission._id });
  await GroupDiscussion.deleteOne({ _id: gdRoom._id });
  console.log("  ✓ Audit test documents cleanly removed.");

  console.log("\n==================================================================");
  console.log(`TEST RESULTS: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("==================================================================\n");

  await mongoose.disconnect();
  if (testFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite execution failed:", err);
  process.exit(1);
});

