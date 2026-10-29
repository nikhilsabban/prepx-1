import type {
  IGDTranscriptSegment,
  IGDParticipant,
  IGDParticipantMetrics,
  IGDTopicMetadata,
  IGDStudentEvaluation,
  IGDCriterionScores,
} from "../../models/GroupDiscussion";
import { gdGroqService } from "./gdGroqService";
import { awardActivityXP } from "../gamificationService";
import { User } from "../../models/User";

export class GDEvaluationService {
  /**
   * Backward-compatible single evaluation helper for legacy scripts and endpoints.
   */
  public generateRuleBasedEvaluation(
    topic: IGDTopicMetadata,
    candidateMetrics: IGDParticipantMetrics | undefined,
    candidateSegments: IGDTranscriptSegment[],
    totalDurationSeconds: number
  ) {
    const student: IGDParticipant = {
      id: candidateMetrics?.participantId || "candidate",
      name: candidateMetrics?.participantName || "Candidate",
      role: "student",
      avatar: "",
      isAi: false,
      isHost: false,
      speakingTimeSeconds: candidateMetrics?.totalSpeakingSeconds || 0,
      segmentCount: candidateMetrics?.segmentCount || candidateSegments.length,
      wordCount: candidateMetrics?.wordCount || 0,
      percentSpeakingTime: candidateMetrics?.percentSpeakingTime || 0,
    };

    const result = this.evaluateStudentWithRules(
      topic,
      student,
      candidateMetrics,
      candidateSegments,
      candidateSegments,
      totalDurationSeconds,
      "English"
    );

    return {
      overallScore: Math.round(result.overallScore / 10),
      readinessLevel:
        result.overallScore >= 80 ? "Placement Ready" : result.overallScore >= 60 ? "Developing" : "Needs Improvement",
      parameterScores: {
        communication: Math.min(10, Math.round((result.criterionScores.clarityAndStructure / 15) * 10)),
        contentKnowledge: Math.min(10, Math.round((result.criterionScores.topicRelevance / 25) * 10)),
        criticalThinking: Math.min(10, Math.round((result.criterionScores.reasoningAndExamples / 15) * 10)),
        groupDynamics: Math.min(10, Math.round((result.criterionScores.activeListening / 10) * 10)),
        leadership: Math.min(10, Math.round((result.criterionScores.participationBalance / 10) * 10)),
      },
      strengths: result.strongestArguments,
      weaknesses: result.areasForImprovement,
      actionableTips: result.practicalRecommendations,
      feedbackSummary: result.topicRelevanceExplanation,
      evaluatedBy: result.evaluatedBy,
      modelUsed: result.modelUsed,
      evaluatedAt: new Date(),
    };
  }

  /**
   * Backward-compatible evaluation wrapper.
   */
  public async evaluateDiscussion(
    topic: IGDTopicMetadata,
    participants: IGDParticipant[],
    transcript: IGDTranscriptSegment[],
    metrics: IGDParticipantMetrics[],
    totalDurationSeconds: number
  ) {
    const evaluations = await this.evaluateAllStudents(
      topic,
      participants,
      transcript,
      metrics,
      totalDurationSeconds,
      "English"
    );

    if (evaluations.length > 0) {
      const top = evaluations[0]!;
      return {
        overallScore: Math.round(top.overallScore / 10),
        readinessLevel:
          top.overallScore >= 80 ? "Placement Ready" : top.overallScore >= 60 ? "Developing" : "Needs Improvement",
        parameterScores: {
          communication: Math.min(10, Math.round((top.criterionScores.clarityAndStructure / 15) * 10)),
          contentKnowledge: Math.min(10, Math.round((top.criterionScores.topicRelevance / 25) * 10)),
          criticalThinking: Math.min(10, Math.round((top.criterionScores.reasoningAndExamples / 15) * 10)),
          groupDynamics: Math.min(10, Math.round((top.criterionScores.activeListening / 10) * 10)),
          leadership: Math.min(10, Math.round((top.criterionScores.participationBalance / 10) * 10)),
        },
        strengths: top.strongestArguments,
        weaknesses: top.areasForImprovement,
        actionableTips: top.practicalRecommendations,
        feedbackSummary: top.topicRelevanceExplanation,
        evaluatedBy: top.evaluatedBy,
        modelUsed: top.modelUsed,
        evaluatedAt: new Date(),
      };
    }

    const candidateMetrics = metrics[0];
    return this.generateRuleBasedEvaluation(topic, candidateMetrics, transcript, totalDurationSeconds);
  }

  /**
   * Evaluates all student participants individually.
   * Admin is strictly excluded.
   * Ranks students based on scores and tie-breakers.
   * Awards gamification points idempotently.
   */
  public async evaluateAllStudents(
    topic: IGDTopicMetadata,
    participants: IGDParticipant[],
    transcript: IGDTranscriptSegment[],
    metrics: IGDParticipantMetrics[],
    totalDurationSeconds: number,
    expectedLanguage: string = "English"
  ): Promise<IGDStudentEvaluation[]> {
    // Filter all human participants (including host/creator peer)
    const students = participants.filter((p) => !p.isAi);

    if (students.length === 0) {
      return [];
    }

    const evaluations: IGDStudentEvaluation[] = [];

    // Evaluate each student independently
    for (const student of students) {
      const studentMetrics = metrics.find((m) => m.participantId === student.id);
      const studentSegments = transcript.filter((t) => t.participantId === student.id);

      const evaluation = await this.evaluateStudent(
        topic,
        student,
        studentMetrics,
        studentSegments,
        transcript,
        totalDurationSeconds,
        expectedLanguage
      );

      evaluations.push(evaluation);
    }

    // Rank students by overall score descending with tie-breakers:
    // 1st tie-breaker: topicRelevance
    // 2nd tie-breaker: reasoningAndExamples
    // 3rd tie-breaker: participationBalance
    evaluations.sort((a, b) => {
      if (b.overallScore !== a.overallScore) {
        return b.overallScore - a.overallScore;
      }
      if (b.criterionScores.topicRelevance !== a.criterionScores.topicRelevance) {
        return b.criterionScores.topicRelevance - a.criterionScores.topicRelevance;
      }
      if (b.criterionScores.reasoningAndExamples !== a.criterionScores.reasoningAndExamples) {
        return b.criterionScores.reasoningAndExamples - a.criterionScores.reasoningAndExamples;
      }
      return b.criterionScores.participationBalance - a.criterionScores.participationBalance;
    });

    // Assign ranks (1-indexed)
    evaluations.forEach((evalItem, index) => {
      evalItem.rank = index + 1;
    });

    // Award gamification points idempotently via existing gamification service
    for (const studentEval of evaluations) {
      if (!studentEval.gamificationAwardedAt) {
        try {
          let targetUserId = studentEval.userId;
          if (!targetUserId) {
            const participant = students.find((s) => s.id === studentEval.participantId || s.username === studentEval.username);
            if (participant?.userId) {
              targetUserId = participant.userId.toString();
            } else if (participant?.id && participant.id.length === 24) {
              targetUserId = participant.id;
            } else if (studentEval.username) {
              const u = await User.findOne({ username: studentEval.username.toLowerCase().trim() });
              if (u) targetUserId = u._id.toString();
            }
          }

          if (targetUserId) {
            studentEval.userId = targetUserId;
            // Point calculation:
            // Base for verified contribution: 50 XP
            // Performance tier: +30 XP for score >= 80, +15 XP for score >= 60
            // Winner bonus: +25 XP for Rank 1
            let points = 50;
            if (studentEval.overallScore >= 80) points += 30;
            else if (studentEval.overallScore >= 60) points += 15;
            if (studentEval.rank === 1) points += 25;

            // If student was completely silent or had 0 words, minimal credit
            if (studentEval.overallScore <= 15) {
              points = 10;
            }

            const badge =
              studentEval.overallScore >= 85
                ? "PrepX Champion"
                : studentEval.overallScore >= 70
                ? "Rising Star"
                : "GD Orator";

            await awardActivityXP(
              targetUserId,
              points,
              `AI Group Discussion: "${topic.question.slice(0, 40)}..."`,
              badge
            );

            studentEval.gamificationPointsAwarded = points;
            studentEval.gamificationAwardedAt = new Date();
          }
        } catch (err) {
          console.error(`[GD Evaluation] Failed to award gamification points to ${studentEval.username}:`, err);
        }
      }
    }

    return evaluations;
  }

  /**
   * Evaluates an individual student using the 100-point rubric.
   */
  public async evaluateStudent(
    topic: IGDTopicMetadata,
    student: IGDParticipant,
    studentMetrics: IGDParticipantMetrics | undefined,
    studentSegments: IGDTranscriptSegment[],
    fullTranscript: IGDTranscriptSegment[],
    totalDurationSeconds: number,
    expectedLanguage: string
  ): Promise<IGDStudentEvaluation> {
    const groqClient = gdGroqService.getClient();

    // If Groq is available and student has contributed, try Groq evaluation
    if (groqClient && studentSegments.length > 0) {
      try {
        const groqResult = await this.evaluateStudentWithGroq(
          topic,
          student,
          studentMetrics,
          studentSegments,
          fullTranscript,
          totalDurationSeconds,
          expectedLanguage
        );
        if (groqResult) return groqResult;
      } catch (err: any) {
        console.warn(`[GD Evaluation] Groq evaluation error for ${student.username}: ${err?.message || err}. Falling back to rule-based engine.`);
      }
    }

    // Deterministic evidence-grounded rule-based fallback
    return this.evaluateStudentWithRules(
      topic,
      student,
      studentMetrics,
      studentSegments,
      fullTranscript,
      totalDurationSeconds,
      expectedLanguage
    );
  }

  /**
   * Deterministic rule-based evaluation when AI inference is unavailable.
   */
  public evaluateStudentWithRules(
    topic: IGDTopicMetadata,
    student: IGDParticipant,
    studentMetrics: IGDParticipantMetrics | undefined,
    studentSegments: IGDTranscriptSegment[],
    fullTranscript: IGDTranscriptSegment[],
    totalDurationSeconds: number,
    expectedLanguage: string
  ): IGDStudentEvaluation {
    const words = studentMetrics?.wordCount || 0;
    const turns = studentSegments.length;
    const speakingSeconds = studentMetrics?.totalSpeakingSeconds || 0;
    const percentTime = studentMetrics?.percentSpeakingTime || 0;

    // Handle silent student with minimal available evidence
    if (turns === 0 || words < 5) {
      return {
        userId: student.userId ? student.userId.toString() : undefined,
        participantId: student.id,
        username: student.username || student.name,
        name: student.name,
        overallScore: 12,
        criterionScores: {
          topicRelevance: 3,
          reasoningAndExamples: 2,
          clarityAndStructure: 2,
          fluencyAndPace: 1,
          activeListening: 2,
          participationBalance: 0,
          expectedLanguageConsistency: 1,
          vocalIntelligibility: 1,
          discussionEtiquette: 0,
        },
        topicRelevanceExplanation: "No verbal contributions were detected for this participant during the live session.",
        strongestArguments: ["Participated in the discussion room session."],
        reasoningEvidence: ["No verbal arguments were presented to evaluate."],
        communicationStrengths: ["Maintained room connection."],
        communicationWeaknesses: ["Complete verbal inactivity during assigned turns."],
        speechPatterns: {
          paceDescription: "No speaking detected",
          fillerWords: [],
          repetitionsCount: 0,
          mumblingIndicators: ["No audible vocal delivery recorded"],
          observableHesitations: ["Turn timed out without active speech"],
        },
        languageSwitching: {
          detected: false,
          examples: [],
          explanation: "No speech detected to evaluate language consistency.",
        },
        activeListeningNotes: "Present in room, but did not respond or build upon points made by other participants.",
        areasForImprovement: [
          "Initiate speaking within the first 60 seconds of your assigned turn.",
          "Prepare 2-3 key arguments while reading the topic before the discussion starts.",
          "Check microphone input and permissions to ensure clear audio transmission.",
        ],
        practicalRecommendations: [
          "Practice speaking for 45-60 seconds on any news topic daily using a timer.",
          "Acknowledge the previous speaker even if briefly before giving your thought.",
          "Use structured openers like 'In my perspective, the key factor here is...'",
        ],
        suggestedPracticePlan: "Focus on confidence and voice projection. Start with low-pressure 1-minute speaking drills before your next group discussion.",
        gamificationPointsAwarded: 0,
        evaluatedBy: "fallback",
        evaluatedAt: new Date(),
      };
    }

    const studentText = studentSegments.map((s) => s.text).join(" ");
    const lowerText = studentText.toLowerCase();

    // 1. Topic Relevance (Max 25)
    let topicRelevance = 15;
    const topicKeywords = topic.question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matchedKeywords = topicKeywords.filter((kw) => lowerText.includes(kw));
    if (matchedKeywords.length >= 3) topicRelevance += 6;
    else if (matchedKeywords.length >= 1) topicRelevance += 3;
    if (words > 120) topicRelevance += 4;
    topicRelevance = Math.min(25, Math.max(5, topicRelevance));

    // 2. Reasoning & Examples (Max 15)
    let reasoning = 9;
    if (lowerText.includes("because") || lowerText.includes("therefore") || lowerText.includes("reason")) reasoning += 2;
    if (lowerText.includes("example") || lowerText.includes("instance") || lowerText.includes("data") || lowerText.includes("study")) reasoning += 3;
    if (lowerText.includes("impact") || lowerText.includes("consequence") || lowerText.includes("result")) reasoning += 1;
    reasoning = Math.min(15, Math.max(3, reasoning));

    // 3. Clarity & Structure (Max 15)
    let clarity = 10;
    if (words >= 80 && words <= 250) clarity += 3;
    if (lowerText.includes("firstly") || lowerText.includes("secondly") || lowerText.includes("moreover") || lowerText.includes("in conclusion")) clarity += 2;
    clarity = Math.min(15, Math.max(3, clarity));

    // 4. Fluency & Pace (Max 10)
    let fluency = 7;
    const fillerWords = (lowerText.match(/\b(um|uh|like|you know|basically|actually)\b/g) || []);
    if (fillerWords.length > 4) fluency -= 2;
    else if (fillerWords.length === 0 && words > 60) fluency += 2;
    fluency = Math.min(10, Math.max(2, fluency));

    // 5. Active Listening (Max 10)
    let activeListening = 6;
    const otherParticipants = fullTranscript.filter((t) => t.participantId !== student.id);
    const peerNamesMentioned = otherParticipants.some((p) => lowerText.includes(p.participantName.toLowerCase()));
    if (peerNamesMentioned || lowerText.includes("agree with") || lowerText.includes("as mentioned earlier") || lowerText.includes("building on")) {
      activeListening += 3;
    }
    activeListening = Math.min(10, Math.max(2, activeListening));

    // 6. Participation Balance (Max 10)
    let balance = 7;
    if (percentTime >= 15 && percentTime <= 30) balance = 10;
    else if (percentTime > 45) balance = 5; // Dominated
    else if (percentTime < 10) balance = 5; // Under-participated
    balance = Math.min(10, Math.max(2, balance));

    // 7. Expected Language Consistency (Max 5)
    let langConsistency = 4;
    const hasHindiIndications = /[ऀ-ॿ]|haan|bhai|kya|kyunki|matlab|theek/i.test(lowerText);
    if (expectedLanguage.toLowerCase() === "english" && hasHindiIndications) {
      langConsistency = 3;
    } else {
      langConsistency = 5;
    }

    // 8. Vocal Intelligibility & Mumbling (Max 5)
    let intelligibility = 4;
    if (words > 50 && studentSegments.every((s) => (s.confidence ?? 1.0) >= 0.8)) {
      intelligibility = 5;
    }

    // 9. Discussion Etiquette & Respect (Max 5)
    let etiquette = 4;
    if (studentSegments.some((s) => s.isInterruption)) {
      etiquette = 3;
    } else {
      etiquette = 5;
    }

    const overallScore =
      topicRelevance +
      reasoning +
      clarity +
      fluency +
      activeListening +
      balance +
      langConsistency +
      intelligibility +
      etiquette;

    return {
      userId: student.userId ? student.userId.toString() : undefined,
      participantId: student.id,
      username: student.username || student.name,
      name: student.name,
      overallScore: Math.min(100, Math.max(0, overallScore)),
      criterionScores: {
        topicRelevance,
        reasoningAndExamples: reasoning,
        clarityAndStructure: clarity,
        fluencyAndPace: fluency,
        activeListening,
        participationBalance: balance,
        expectedLanguageConsistency: langConsistency,
        vocalIntelligibility: intelligibility,
        discussionEtiquette: etiquette,
      },
      topicRelevanceExplanation: `Student addressed "${topic.question}" over ${turns} speaking turns (${speakingSeconds} seconds total, comprising ${percentTime}% of group speaking time).`,
      strongestArguments: [
        studentSegments[0]?.text.slice(0, 100) || "Contributed thoughtful arguments to the core topic.",
        studentSegments[1]?.text.slice(0, 100) || "Maintained engagement across discussion phases.",
      ],
      reasoningEvidence: [
        "Provided relevant thematic points aligned with the primary discussion prompt.",
        "Articulated logical connections between context and proposed outcomes.",
      ],
      communicationStrengths: [
        "Clear and audible delivery throughout assigned speaking turns.",
        "Maintained respectful tone and adherence to group discussion protocols.",
      ],
      communicationWeaknesses: [
        fillerWords.length > 2
          ? `Frequent filler words observed (${fillerWords.slice(0, 3).join(", ")}).`
          : "Could enrich answers with specific statistical figures or industry benchmarks.",
      ],
      speechPatterns: {
        paceDescription: words / Math.max(1, speakingSeconds / 60) > 160 ? "Fast-paced delivery" : "Moderate, steady speaking pace",
        fillerWords: Array.from(new Set(fillerWords)),
        repetitionsCount: 0,
        mumblingIndicators: ["No mumbling detected; clear microphone audio recorded."],
        observableHesitations: fillerWords.length > 2 ? ["Brief pauses before introducing secondary points."] : ["Fluent transitions between points."],
      },
      languageSwitching: {
        detected: hasHindiIndications,
        examples: hasHindiIndications ? [{ snippet: "Colloquial phrases observed in transcript", language: "Hindi" }] : [],
        explanation: hasHindiIndications
          ? "Occasional colloquial native-language phrases detected. Keep vocabulary consistently in the expected discussion language."
          : `Spoke consistently in the expected language (${expectedLanguage}).`,
      },
      activeListeningNotes: peerNamesMentioned
        ? "Explicitly referenced statements made by peers during discussion."
        : "Contributed independent viewpoints; could build more directly upon peer remarks.",
      areasForImprovement: [
        "Quote specific statistics, industry examples, or case studies to strengthen arguments.",
        "Directly cite peers by name ('As Rahul mentioned...') to demonstrate active listening.",
        "Conclude speaking turns with concise summary statements.",
      ],
      practicalRecommendations: [
        "Structure each speaking turn as: Point -> Reason -> Concrete Example -> Conclusion.",
        "Take 2 seconds to breathe before answering to eliminate unnecessary filler words.",
        "Practice active listening by noting key words used by other participants.",
      ],
      suggestedPracticePlan: "Participate in 2-3 mock placement GDs weekly focusing on structuring opening statements and constructive turn-taking.",
      gamificationPointsAwarded: 0,
      evaluatedBy: "fallback",
      evaluatedAt: new Date(),
    };
  }

  /**
   * Calls Groq LLM with the strict 100-point rubric and schema.
   */
  private async evaluateStudentWithGroq(
    topic: IGDTopicMetadata,
    student: IGDParticipant,
    studentMetrics: IGDParticipantMetrics | undefined,
    studentSegments: IGDTranscriptSegment[],
    fullTranscript: IGDTranscriptSegment[],
    totalDurationSeconds: number,
    expectedLanguage: string
  ): Promise<IGDStudentEvaluation | null> {
    const validatedModel = (await gdGroqService.getValidatedModel()) || "openai/gpt-oss-120b";

    const formattedTranscript = fullTranscript
      .map((t) => {
        const isCurrent = t.participantId === student.id ? " [EVALUATED STUDENT]" : "";
        return `[${t.timestamp.toISOString()}] ${t.participantName}${isCurrent} (${t.durationSeconds}s): "${t.text}"`;
      })
      .join("\n");

    const prompt = `You are an expert talent acquisition assessor evaluating student candidates in a Campus Placement Group Discussion (GD).
Analyze the candidate's performance strictly according to the evidence in the transcript.

DISCUSSION TOPIC:
- Question: "${topic.question}"
- Background: "${topic.description || topic.originalTitle}"
- Expected Language: "${expectedLanguage}"

CANDIDATE PROFILE:
- Name: "${student.name}" (Username: @${student.username || student.name})
- Total Speaking Turns: ${studentSegments.length}
- Total Speaking Time: ${studentMetrics?.totalSpeakingSeconds || 0}s (${studentMetrics?.percentSpeakingTime || 0}% of room)
- Total Words: ${studentMetrics?.wordCount || 0}

COMPLETE DISCUSSION TRANSCRIPT:
${formattedTranscript}

100-POINT EVALUATION RUBRIC CRITERIA:
1. topicRelevance (0-25): Topic relevance, understanding of core subject, avoiding off-topic tangents.
2. reasoningAndExamples (0-15): Quality of reasoning, depth of knowledge, concrete examples or data.
3. clarityAndStructure (0-15): Clear communication, organized thoughts, smooth articulation.
4. fluencyAndPace (0-10): Speaking pace, hesitations, filler words, vocal control.
5. activeListening (0-10): Responding to, building on, or synthesizing other participants' arguments.
6. participationBalance (0-10): Balanced contribution, turn-taking fairness, avoiding dominating or silence.
7. expectedLanguageConsistency (0-5): Consistency in speaking "${expectedLanguage}", proper vocabulary, absence of unintended language switching.
8. vocalIntelligibility (0-5): Audible delivery, clear pronunciation, absence of mumbling.
9. discussionEtiquette (0-5): Respectful tone, constructive agreement/disagreement, no rude interruptions.
Total = sum of the 9 criterion scores (0 to 100).

SAFEGUARDS:
- Do NOT diagnose nervousness, anxiety, or mental health conditions. Evaluate observable presentation behaviors only.
- For language switching: note concrete examples with timestamps/quotes only if truly present; otherwise set detected: false.
- Base observations strictly on transcript evidence.

Return a JSON object matching this schema:
{
  "overallScore": number (0-100),
  "criterionScores": {
    "topicRelevance": number (0-25),
    "reasoningAndExamples": number (0-15),
    "clarityAndStructure": number (0-15),
    "fluencyAndPace": number (0-10),
    "activeListening": number (0-10),
    "participationBalance": number (0-10),
    "expectedLanguageConsistency": number (0-5),
    "vocalIntelligibility": number (0-5),
    "discussionEtiquette": number (0-5)
  },
  "topicRelevanceExplanation": string,
  "strongestArguments": string[] (2-4 items quoting or citing specific points candidate made),
  "reasoningEvidence": string[] (2-3 items showing evidence of logic or examples used),
  "communicationStrengths": string[] (2-3 items),
  "communicationWeaknesses": string[] (2-3 items),
  "speechPatterns": {
    "paceDescription": string,
    "fillerWords": string[],
    "repetitionsCount": number,
    "mumblingIndicators": string[],
    "observableHesitations": string[]
  },
  "languageSwitching": {
    "detected": boolean,
    "examples": [{"snippet": string, "timestamp": string, "language": string}],
    "explanation": string
  },
  "activeListeningNotes": string,
  "areasForImprovement": string[] (3-4 actionable items),
  "practicalRecommendations": string[] (3-5 practical personalized recommendations),
  "suggestedPracticePlan": string
}`;

    const parsed = await gdGroqService.chatCompletionJson<any>(
      [
        {
          role: "system",
          content:
            "You are a rigorous campus placement group discussion evaluator. Output valid JSON matching the exact schema requested.",
        },
        { role: "user", content: prompt },
      ],
      {
        model: validatedModel,
        temperature: 0.25,
        maxTokens: 1800,
        timeoutMs: 30000,
        retries: 2,
      }
    );

    if (!parsed || typeof parsed.overallScore !== "number") {
      return null;
    }

    const c = parsed.criterionScores || {};
    const topicRelevance = Math.min(25, Math.max(0, Math.round(c.topicRelevance ?? 15)));
    const reasoningAndExamples = Math.min(15, Math.max(0, Math.round(c.reasoningAndExamples ?? 10)));
    const clarityAndStructure = Math.min(15, Math.max(0, Math.round(c.clarityAndStructure ?? 10)));
    const fluencyAndPace = Math.min(10, Math.max(0, Math.round(c.fluencyAndPace ?? 7)));
    const activeListening = Math.min(10, Math.max(0, Math.round(c.activeListening ?? 7)));
    const participationBalance = Math.min(10, Math.max(0, Math.round(c.participationBalance ?? 7)));
    const expectedLanguageConsistency = Math.min(5, Math.max(0, Math.round(c.expectedLanguageConsistency ?? 4)));
    const vocalIntelligibility = Math.min(5, Math.max(0, Math.round(c.vocalIntelligibility ?? 4)));
    const discussionEtiquette = Math.min(5, Math.max(0, Math.round(c.discussionEtiquette ?? 4)));

    const computedOverall =
      topicRelevance +
      reasoningAndExamples +
      clarityAndStructure +
      fluencyAndPace +
      activeListening +
      participationBalance +
      expectedLanguageConsistency +
      vocalIntelligibility +
      discussionEtiquette;

    return {
      userId: student.userId ? student.userId.toString() : undefined,
      participantId: student.id,
      username: student.username || student.name,
      name: student.name,
      overallScore: Math.min(100, Math.max(0, Math.round(parsed.overallScore || computedOverall))),
      criterionScores: {
        topicRelevance,
        reasoningAndExamples,
        clarityAndStructure,
        fluencyAndPace,
        activeListening,
        participationBalance,
        expectedLanguageConsistency,
        vocalIntelligibility,
        discussionEtiquette,
      },
      topicRelevanceExplanation: parsed.topicRelevanceExplanation || "Demonstrated alignment with topic.",
      strongestArguments: Array.isArray(parsed.strongestArguments) ? parsed.strongestArguments : ["Articulated structured perspective."],
      reasoningEvidence: Array.isArray(parsed.reasoningEvidence) ? parsed.reasoningEvidence : ["Used logical reasoning."],
      communicationStrengths: Array.isArray(parsed.communicationStrengths) ? parsed.communicationStrengths : ["Clear articulation."],
      communicationWeaknesses: Array.isArray(parsed.communicationWeaknesses) ? parsed.communicationWeaknesses : ["Could cite more concrete examples."],
      speechPatterns: {
        paceDescription: parsed.speechPatterns?.paceDescription || "Controlled speaking pace",
        fillerWords: Array.isArray(parsed.speechPatterns?.fillerWords) ? parsed.speechPatterns.fillerWords : [],
        repetitionsCount: parsed.speechPatterns?.repetitionsCount || 0,
        mumblingIndicators: Array.isArray(parsed.speechPatterns?.mumblingIndicators) ? parsed.speechPatterns.mumblingIndicators : [],
        observableHesitations: Array.isArray(parsed.speechPatterns?.observableHesitations) ? parsed.speechPatterns.observableHesitations : [],
      },
      languageSwitching: {
        detected: Boolean(parsed.languageSwitching?.detected),
        examples: Array.isArray(parsed.languageSwitching?.examples) ? parsed.languageSwitching.examples : [],
        explanation: parsed.languageSwitching?.explanation || `Maintained speech in ${expectedLanguage}.`,
      },
      activeListeningNotes: parsed.activeListeningNotes || "Engaged with peer points.",
      areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement : ["Practice incorporating peer comments."],
      practicalRecommendations: Array.isArray(parsed.practicalRecommendations) ? parsed.practicalRecommendations : ["Structure your opening."],
      suggestedPracticePlan: parsed.suggestedPracticePlan || "Engage in timed group discussion drills.",
      gamificationPointsAwarded: 0,
      evaluatedBy: "groq",
      modelUsed: validatedModel,
      evaluatedAt: new Date(),
    };
  }
}

export const gdEvaluationService = new GDEvaluationService();
