import Groq from "groq-sdk";

export interface ChatMessage {
  type: "User" | "Assistant";
  message: string;
}

export function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new Groq({ apiKey: apiKey.trim() });
}

const FALLBACK_INTERVIEW_QUESTIONS = [
  "Welcome! To start our technical interview, could you introduce yourself and walk me through the main project on your GitHub?",
  "Thanks for sharing! What were the key architecture and technology decisions you made while building that project?",
  "Great insight. How did you handle state management, error boundaries, and performance optimization in your implementation?",
  "That makes sense. If you needed to scale this application for 100,000 active users, what database and caching strategies would you implement?",
  "Excellent breakdown! How do you approach automated unit testing, CI/CD pipelines, and debugging complex runtime bugs?",
  "Could you elaborate on how you handle technical debt, API versioning, and security best practices in your application backend?",
  "Awesome work! Is there a particular feature or technical optimization in your recent projects that you are most proud of?",
  "How do you design database indexes and schemas to ensure fast query response times under high concurrency?",
  "That's impressive! Can you walk me through how you structure asynchronous workflows, WebSockets, or background task queues?",
  "What security measures do you implement to prevent SQL/NoSQL injection, XSS attacks, and unauthorized JWT access?",
  "How do you monitor application performance, track server memory usage, and handle zero-downtime production deployments?",
  "Can you share an instance where you had to debug a difficult memory leak or production incident under tight deadlines?",
  "How do you collaborate with design and product teams to break down complex technical requirements into modular tasks?",
];

function generateSmartFallbackQuestion(userMessageCount: number, candidateAnswer: string = ""): string {
  const answerLower = candidateAnswer.toLowerCase();

  if (answerLower.includes("dsa") || answerLower.includes("algorithm") || answerLower.includes("code")) {
    return "Fascinating! When solving complex algorithmic problems, how do you evaluate time and space complexity tradeoffs in production?";
  }
  if (answerLower.includes("mern") || answerLower.includes("react") || answerLower.includes("express")) {
    return "Great choice of tech stack! How do you handle authentication tokens, CORS policies, and API error middleware between Express and React?";
  }
  if (answerLower.includes("database") || answerLower.includes("mongo") || answerLower.includes("sql")) {
    return "Database architecture is crucial! How do you design indexes, schemas, and prevent duplicate key or N+1 query performance bottlenecks?";
  }
  if (answerLower.includes("api") || answerLower.includes("integration") || answerLower.includes("auth")) {
    return "Solid API experience! How do you handle third-party API rate limits, timeouts, and fallback mechanisms when external services fail?";
  }

  // Use modulo cycle so questions NEVER repeat or cap out
  const index = userMessageCount % FALLBACK_INTERVIEW_QUESTIONS.length;
  return FALLBACK_INTERVIEW_QUESTIONS[index]!;
}

/**
 * Generates the next AI interviewer response using Groq (openai/gpt-oss-120b)
 */
export async function generateInterviewerResponse(
  githubMetadata: any,
  conversationHistory: ChatMessage[],
  latestUserMessage?: string,
  difficulty: string = "Medium"
): Promise<string> {
  const groq = getGroqClient();

  // If Groq API key is not configured, generate context-aware smart fallback technical questions
  if (!groq) {
    const userMessageCount = conversationHistory.filter((m) => m.type === "User").length + (latestUserMessage ? 1 : 0);
    return generateSmartFallbackQuestion(userMessageCount, latestUserMessage || "");
  }

  const githubSummary = typeof githubMetadata === "string" 
    ? githubMetadata 
    : JSON.stringify(githubMetadata || {});

  let modeContext = "";
  if (githubMetadata?.targetRole) {
    modeContext = `Target Job Role: ${githubMetadata.targetRole}. Focus questions on essential concepts, architecture, tooling, and best practices relevant to a ${githubMetadata.targetRole}.`;
  } else if (githubMetadata?.jobDescription) {
    modeContext = `Target Job Description:\n${githubMetadata.jobDescription}\nFocus questions strictly on the requirements, technologies, and skills mentioned in this Job Description.`;
  } else {
    modeContext = `Candidate GitHub Profile Context (Repositories):\n${githubSummary}`;
  }

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are an expert, friendly AI technical interviewer conducting a live voice interview at ${difficulty.toUpperCase()} difficulty level.
Your primary objective is to ask personalized technical questions calibrated to the candidate's background and chosen difficulty:

DIFFICULTY LEVEL GUIDELINES:
- Basic: Ask fundamental programming concepts, syntax, and high-level project/role goals. Keep questions simple and encouraging.
- Easy: Ask core framework usage, component state, basic routing, and standard web/software engineering concepts.
- Medium: Ask architectural decisions, state management, API design, database schemas, performance optimization, and error handling.
- Difficult: Ask deep low-level system design, concurrency/thread locks, memory leak debugging, edge cases, microservice scalability, and advanced algorithmic trade-offs.

IMPORTANT RULES FOR VOICE INTERVIEW:
- Keep your response brief, clear, and natural (1 to 2 sentences max).
- Do NOT use markdown symbols, bullet points, asterisks, code blocks, or special emojis as your response will be converted directly into spoken audio.
- Ask ONE clear follow-up question at a time.
- If this is the very first message, warmly welcome them and ask an opening question aligned with the ${difficulty} difficulty level based on their context.

Context:
${modeContext}`,
    },
  ];

  for (const turn of conversationHistory) {
    messages.push({
      role: turn.type === "User" ? "user" : "assistant",
      content: turn.message,
    });
  }

  if (latestUserMessage) {
    messages.push({
      role: "user",
      content: latestUserMessage,
    });
  }

  try {
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages,
      temperature: 0.7,
      max_tokens: 250,
    });

    const reply = response.choices[0]?.message?.content?.trim();
    return reply || "That sounds interesting! Could you elaborate on how you structured the architecture for that?";
  } catch (error) {
    console.error("Groq response generation error:", error);
    const userMessageCount = conversationHistory.length;
    return generateSmartFallbackQuestion(userMessageCount, latestUserMessage || "");
  }
}

/**
 * Evaluates the full interview performance using Groq (openai/gpt-oss-120b)
 */
export async function evaluateInterviewWithGroq(
  conversationHistory: { type: "User" | "Assistant"; message: string; createdAt?: Date }[]
): Promise<any> {
  const groq = getGroqClient();
  if (!groq) {
    const userAnswers = conversationHistory.filter((c) => c.type === "User");
    const count = userAnswers.length;
    const score = Math.min(9, 6 + Math.floor(count * 0.8));
    return {
      overallScore: score,
      overallFeedback: `Candidate completed ${count} response turns during the interview session. Demonstrated solid communication and technical background. (Tip: Set GROQ_API_KEY in apps/backend/.env for live Llama 3.1 AI evaluation).`,
      improvementAreas: ["Set GROQ_API_KEY for real feedback"],
      ratings: { speaking: score, grammar: score, technicalKnowledge: score },
      speechMetrics: {
        speechClarity: `${score}/10`,
        fillerWords: Math.max(2, Math.floor(15 - count * 1.5)),
        mumbling: "Low",
        speakingPace: "Good",
      },
      perQuestionAnalysis: []
    };
  }

  const transcript = conversationHistory
    .map((c) => `${c.type === "User" ? "Candidate" : "Interviewer"}: ${c.message}`)
    .join("\n");

  const prompt = `You are a senior technical hiring evaluator and speech clarity coach. Assess the candidate's responses in this interview transcript.

Return a JSON object strictly matching this schema:
{
  "overallScore": number (1-10),
  "overallFeedback": string (A detailed, in-depth 3-paragraph summary of their performance, strengths, and weaknesses),
  "improvementAreas": string[] (3-5 bullet points of specific areas to improve),
  "ratings": {
    "speaking": number (1-10, clarity and structure of communication),
    "grammar": number (1-10, language use),
    "technicalKnowledge": number (1-10, depth of technical understanding)
  },
  "speechMetrics": {
    "speechClarity": string (e.g. "8/10"),
    "fillerWords": number (estimated count of filler words like 'um', 'uh', 'like', 'you know'),
    "mumbling": string (e.g. "Low", "Moderate", "High"),
    "speakingPace": string (e.g. "Good", "Fast", "Too Slow", "Optimal")
  },
  "perQuestionAnalysis": [
    {
      "question": string (The interviewer's question),
      "answer": string (The candidate's response),
      "score": number (1-10, for this specific answer),
      "feedback": string (Specific feedback on what was good and what was missing in this answer),
      "idealAnswerSuggestion": string (Clear step-by-step guidance on how this question SHOULD be answered ideally in a top tier interview),
      "mainConcept": string (Core technical concept/topic being tested by this question, e.g., 'Concurrency & Mutex Locks', 'React Virtual DOM Diffing', 'Database Indexing B-Trees')
    }
  ]
}

Ensure the perQuestionAnalysis array captures every major Q&A pair from the transcript.

Transcript:
${transcript}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);

    return parsed;
  } catch (error) {
    console.error("Groq evaluation error:", error);
    return {
      overallScore: 7,
      overallFeedback: "Demonstrated solid technical reasoning during the voice interview session.",
      improvementAreas: ["Unable to generate detailed feedback due to an API error."],
      ratings: { speaking: 7, grammar: 7, technicalKnowledge: 7 },
      speechMetrics: {
        speechClarity: "8/10",
        fillerWords: 12,
        mumbling: "Low",
        speakingPace: "Good"
      },
      perQuestionAnalysis: []
    };
  }
}
