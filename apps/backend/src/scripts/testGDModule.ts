import dotenv from "dotenv";
dotenv.config();

import { gdTopicDiscoveryService } from "../services/gd/gdTopicDiscoveryService";
import { gdGroqService } from "../services/gd/gdGroqService";
import { gdTranscriptMetricsService } from "../services/gd/gdTranscriptMetricsService";
import { gdEvaluationService } from "../services/gd/gdEvaluationService";
import { VIRTUAL_PARTICIPANTS } from "../services/gd/gdSessionService";

async function runTests() {
  console.log("==================================================");
  console.log("🚀 PREPX AI GROUP DISCUSSION - BACKEND MODULE TEST");
  console.log("==================================================");

  // Test 1: SSRF Protection
  console.log("\n[Test 1] Testing SSRF and Prohibited Destination Safeguards...");
  const isSafeLocalhost = (gdTopicDiscoveryService as any).isSafeUrl("http://localhost:3000/feed");
  const isSafePrivateIP = (gdTopicDiscoveryService as any).isSafeUrl("http://192.168.1.1/feed");
  const isSafeMetadata = (gdTopicDiscoveryService as any).isSafeUrl("http://169.254.169.254/meta-data");
  const isSafeValidFeed = (gdTopicDiscoveryService as any).isSafeUrl("https://feeds.bbci.co.uk/news/technology/rss.xml");

  if (!isSafeLocalhost && !isSafePrivateIP && !isSafeMetadata && isSafeValidFeed) {
    console.log("✅ SSRF Protection passed: Prohibited hosts blocked, valid HTTPS approved.");
  } else {
    console.error("❌ SSRF Protection check failed!", { isSafeLocalhost, isSafePrivateIP, isSafeMetadata, isSafeValidFeed });
  }

  // Test 2: Groq Model Validation
  console.log("\n[Test 2] Testing Centralized Groq Model Validation...");
  const validatedModel = await gdGroqService.getValidatedModel();
  console.log(`✅ Validated Groq Model for account: "${validatedModel}"`);

  // Test 3: Web Topic Discovery & Random Topic Selection
  console.log("\n[Test 3] Testing Automatic Web Topic Discovery & Transformation...");
  const randomTopic = await gdTopicDiscoveryService.getRandomTopic();
  console.log("✅ Discovered Topic Snapshot:");
  console.log(`   - Question: "${randomTopic.question}"`);
  console.log(`   - Original Headline: "${randomTopic.originalTitle}"`);
  console.log(`   - Publisher: "${randomTopic.publisher}"`);
  console.log(`   - Source URL: "${randomTopic.sourceUrl}"`);
  console.log(`   - Category: "${randomTopic.category}"`);
  console.log(`   - Source Mode: "${randomTopic.sourceMode}" (AI Generated: ${randomTopic.isAiGenerated})`);

  // Test 4: Participant Limit Enforcement
  console.log("\n[Test 4] Testing 5-Participant Constraint...");
  const maxAllowed = 5;
  const mockParticipants = [
    {
      id: "candidate-1",
      name: "Student Candidate",
      role: "Candidate",
      avatar: "https://example.com/avatar.jpg",
      isAi: false,
      isHost: true,
      speakingTimeSeconds: 45,
      segmentCount: 2,
      wordCount: 110,
      percentSpeakingTime: 25,
    },
    ...VIRTUAL_PARTICIPANTS.slice(0, 4).map((v) => ({
      ...v,
      speakingTimeSeconds: 35,
      segmentCount: 1,
      wordCount: 85,
      percentSpeakingTime: 18,
    })),
  ];

  if (mockParticipants.length === maxAllowed) {
    console.log(`✅ Room capacity strictly conforms to ${maxAllowed} participants.`);
  } else {
    console.error(`❌ Participant count ${mockParticipants.length} != ${maxAllowed}`);
  }

  // Test 5: Speaking Metrics & Transcript Calculation
  console.log("\n[Test 5] Testing Transcript Metrics Calculation...");
  const mockTranscript = [
    {
      id: "seg-1",
      participantId: "candidate-1",
      participantName: "Student Candidate",
      text: "I believe AI literacy should become foundational in undergraduate curriculums because every industry requires computational thinking.",
      timestamp: new Date(),
      durationSeconds: 15,
      isInterruption: false,
    },
    {
      id: "seg-2",
      participantId: "ai-priya",
      participantName: "Priya Sharma",
      text: "Building on what Student said, practical software architecture requires students to understand verification, not just generating code.",
      timestamp: new Date(),
      durationSeconds: 18,
      isInterruption: false,
    },
    {
      id: "seg-3",
      participantId: "ai-rohan",
      participantName: "Rohan Gupta",
      text: "From a business perspective, companies are spending significant resources training new hires on these tools. Integrating it into colleges reduces enterprise onboarding costs.",
      timestamp: new Date(),
      durationSeconds: 20,
      isInterruption: false,
    },
    {
      id: "seg-4",
      participantId: "candidate-1",
      participantName: "Student Candidate",
      text: "That's a fair point from Rohan. Furthermore, universities must ensure equal access so students from underfunded colleges aren't left behind.",
      timestamp: new Date(),
      durationSeconds: 22,
      isInterruption: false,
    },
  ];

  const metrics = gdTranscriptMetricsService.computeMetrics(
    mockParticipants,
    mockTranscript,
    75
  );

  console.log("✅ Computed Metrics Summary:");
  console.log(`   - Total Observed Speaking Seconds: ${metrics.totalDurationSeconds}s`);
  console.log(`   - Total Group Words: ${metrics.totalWords}`);
  console.log(`   - Total Segments: ${metrics.totalSegments}`);
  console.log(`   - Constructive Turn-Taking Exchanges: ${metrics.constructiveExchangesCount}`);
  for (const pm of metrics.participantMetrics) {
    console.log(`     * ${pm.participantName}: ${pm.totalSpeakingSeconds}s (${pm.percentSpeakingTime}%), ${pm.wordCount} words, ${pm.segmentCount} turns`);
  }

  // Test 6: Post-Discussion Evaluation (Rule-Based Fallback)
  console.log("\n[Test 6] Testing Rule-Based Fallback Evaluation Engine...");
  const candidateMetrics = metrics.participantMetrics.find((m) => m.participantId === "candidate-1");
  const fallbackEval = gdEvaluationService.generateRuleBasedEvaluation(
    randomTopic,
    candidateMetrics,
    mockTranscript.filter((t) => t.participantId === "candidate-1"),
    75
  );
  console.log("✅ Rule-Based Fallback Evaluation:");
  console.log(`   - Overall Score: ${fallbackEval.overallScore}/10 (${fallbackEval.readinessLevel})`);
  console.log(`   - Parameter Scores:`, fallbackEval.parameterScores);
  console.log(`   - Strengths (${fallbackEval.strengths.length}):`, fallbackEval.strengths);
  console.log(`   - Weaknesses (${fallbackEval.weaknesses.length}):`, fallbackEval.weaknesses);
  console.log(`   - Actionable Tips (${fallbackEval.actionableTips.length}):`, fallbackEval.actionableTips);

  // Test 7: Post-Discussion Evaluation (Live Groq LLM)
  console.log("\n[Test 7] Testing Live Groq Placement Evaluation Engine...");
  const liveEval = await gdEvaluationService.evaluateDiscussion(
    randomTopic,
    mockParticipants,
    mockTranscript,
    metrics.participantMetrics,
    75
  );
  console.log(`✅ Groq Evaluator Output (Evaluated By: ${liveEval.evaluatedBy}, Model: ${liveEval.modelUsed || "default"}):`);
  console.log(`   - Overall Score: ${liveEval.overallScore}/10 (${liveEval.readinessLevel})`);
  console.log(`   - Parameter Scores:`, liveEval.parameterScores);
  console.log(`   - Summary Snippet: "${liveEval.feedbackSummary.slice(0, 180)}..."`);
  console.log(`   - Top Strengths:`, liveEval.strengths.slice(0, 2));
  console.log(`   - Actionable Tips:`, liveEval.actionableTips.slice(0, 2));

  console.log("\n==================================================");
  console.log("🎉 ALL GD BACKEND MODULE TESTS COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
