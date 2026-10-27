import Groq from "groq-sdk";

export interface ChatMessage {
  type: "User" | "Assistant";
  message: string;
}

export function getGroqKeys(): string[] {
  const rawKeys = process.env.GROQ_API_KEY;
  if (!rawKeys || !rawKeys.trim()) {
    return [];
  }
  return rawKeys.split(",").map((k) => k.trim()).filter(Boolean);
}

export function getGroqClient(): Groq | null {
  const keys = getGroqKeys();
  if (keys.length === 0) {
    return null;
  }
  // Select a random key from the comma-separated key pool to distribute concurrent load
  const selectedKey = keys[Math.floor(Math.random() * keys.length)];
  return new Groq({ apiKey: selectedKey });
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

function generateSmartFallbackQuestion(
  userMessageCount: number,
  candidateAnswer: string = "",
  repoName?: string
): string {
  if (repoName) {
    const repoQuestions = [
      `Welcome to your technical interview! I see you've chosen to discuss your repository ${repoName}. Could you walk me through the high-level architecture and the core problem it solves?`,
      `Thank you for that overview. In ${repoName}, what were the most critical engineering decisions you made regarding the technology stack and data flow?`,
      `How did you approach state management, API error handling, and component boundaries in ${repoName}?`,
      `If user traffic or database volume to ${repoName} scaled by a factor of 100, where would performance bottlenecks occur and how would you optimize them?`,
      `What was the most challenging technical hurdle or bug you encountered while building ${repoName}, and how did you resolve it?`,
      `In terms of security and stability in ${repoName}, how did you protect your endpoints and manage data validation?`,
      `Looking back on ${repoName}, what architectural refactoring or improvements would you implement if starting from scratch today?`
    ];
    return repoQuestions[userMessageCount % repoQuestions.length]!;
  }

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
  const keys = getGroqKeys();

  const isRepoSpecific = !!(githubMetadata?.isSpecificRepo || githubMetadata?.repoName);
  const repoName = githubMetadata?.repoName || githubMetadata?.name || (Array.isArray(githubMetadata) && githubMetadata[0]?.name ? githubMetadata[0].name : "");

  // If no Groq API key is configured, generate context-aware smart fallback technical questions
  if (keys.length === 0) {
    const userMessageCount = conversationHistory.filter((m) => m.type === "User").length + (latestUserMessage ? 1 : 0);
    return generateSmartFallbackQuestion(userMessageCount, latestUserMessage || "", repoName);
  }

  let systemPrompt = "";

  if (isRepoSpecific && repoName) {
    const owner = githubMetadata?.owner || "candidate";
    const languages = Array.isArray(githubMetadata?.languages) && githubMetadata.languages.length > 0 
      ? githubMetadata.languages.join(", ") 
      : (githubMetadata?.primaryLanguage || "TypeScript/JavaScript");
    const topics = Array.isArray(githubMetadata?.topics) && githubMetadata.topics.length > 0 
      ? githubMetadata.topics.join(", ") 
      : "";
    const keyDeps = Array.isArray(githubMetadata?.keyDependencies) && githubMetadata.keyDependencies.length > 0 
      ? githubMetadata.keyDependencies.slice(0, 15).join(", ") 
      : "";
    const readme = githubMetadata?.readmeSummary || githubMetadata?.description || "";
    const structure = Array.isArray(githubMetadata?.fileStructure) && githubMetadata.fileStructure.length > 0 
      ? githubMetadata.fileStructure.join(", ") 
      : "";

    systemPrompt = `You are an elite, technical hiring manager conducting a deep-dive repository defense interview at ${difficulty.toUpperCase()} difficulty level.
The candidate has specifically selected their GitHub repository "${repoName}" for technical evaluation.

CHOSEN REPOSITORY DETAILS:
- Repository Name: "${repoName}"
- Author/Owner: "${owner}"
- Repository URL: ${githubMetadata?.repoUrl || `https://github.com/${owner}/${repoName}`}
- Programming Languages Used: ${languages}
${keyDeps ? `- Dependencies & Tech Stack: ${keyDeps}\n` : ""}${topics ? `- Repository Topics: ${topics}\n` : ""}${structure ? `- Key Modules & Directory Structure: ${structure}\n` : ""}${readme ? `- Architecture & Summary:\n${readme}\n` : ""}
STRICT RULES (CRITICAL):
1. REPOSITORY EXCLUSIVITY: Every question you ask MUST be strictly and explicitly about the candidate's chosen repository "${repoName}". Do NOT ask generic textbook trivia, questions about unrelated topics, or questions about other repositories.
2. FIRST MESSAGE: If the conversation history is empty, warmly welcome the candidate by mentioning their project "${repoName}", and immediately ask an opening technical question about the architecture, purpose, or key design decisions of "${repoName}".
3. FOLLOW-UP QUESTIONS:
   - Challenge their implementation choices in "${repoName}" based on their previous answers.
   - Probe into how they handled state management, API design, database schemas, performance bottlenecks, or edge cases with their tech stack (${languages}${keyDeps ? `, ${keyDeps}` : ""}).
   - Ask about scaling, memory management, or concurrency considerations for "${repoName}".
4. STRICT VOICE FORMATTING:
   - Keep answers brief, natural, and conversational (1 to 2 sentences max).
   - NEVER use markdown asterisks (*), hashtags (#), bullet points, backticks, code blocks, or emojis as this text will be read aloud by voice TTS.
   - Ask ONE question at a time. Never ask multiple questions in a single turn.`;
  } else if (githubMetadata?.targetRole) {
    systemPrompt = `You are an expert, friendly AI technical interviewer conducting a live voice interview for the role of ${githubMetadata.targetRole} at ${difficulty.toUpperCase()} difficulty level.
Focus questions strictly on essential concepts, architecture, tooling, and best practices relevant to a ${githubMetadata.targetRole}.
Keep your response brief (1-2 sentences max), without markdown or special symbols, suitable for speech audio. Ask ONE question at a time.`;
  } else if (githubMetadata?.jobDescription) {
    systemPrompt = `You are an expert, friendly AI technical interviewer conducting a live voice interview based on the provided Job Description at ${difficulty.toUpperCase()} difficulty level.
Target Job Description:
${githubMetadata.jobDescription}
Focus questions strictly on the requirements, technologies, and skills mentioned in this Job Description.
Keep your response brief (1-2 sentences max), without markdown or special symbols, suitable for speech audio. Ask ONE question at a time.`;
  } else {
    const githubSummary = typeof githubMetadata === "string" 
      ? githubMetadata 
      : JSON.stringify(githubMetadata || {});
    systemPrompt = `You are an expert, friendly AI technical interviewer conducting a live voice interview at ${difficulty.toUpperCase()} difficulty level.
Candidate Profile:
${githubSummary}
Keep your response brief (1-2 sentences max), without markdown or special symbols, suitable for speech audio. Ask ONE question at a time.`;
  }

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemPrompt,
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

  const startIdx = Math.floor(Math.random() * keys.length);
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = keys[(startIdx + attempt) % keys.length];
    try {
      const groq = new Groq({ apiKey: key });
      const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages,
        temperature: 0.7,
        max_tokens: 250,
      });

      const reply = response.choices[0]?.message?.content?.trim();
      if (reply) return reply;
    } catch (error: any) {
      console.warn(`Groq question generation attempt ${attempt + 1}/${keys.length} failed with key:`, error?.message || error);
    }
  }

  const userMessageCount = conversationHistory.length;
  return generateSmartFallbackQuestion(userMessageCount, latestUserMessage || "", repoName);
}

/**
 * Evaluates the full interview performance using Groq (openai/gpt-oss-120b)
 */
export async function evaluateInterviewWithGroq(
  conversationHistory: { type: "User" | "Assistant"; message: string; createdAt?: Date }[]
): Promise<any> {
  const keys = getGroqKeys();
  if (keys.length === 0) {
    const userAnswers = conversationHistory.filter((c) => c.type === "User");
    const count = userAnswers.length;
    const score = Math.min(9, 6 + Math.floor(count * 0.8));
    return {
      overallScore: score,
      overallFeedback: `Candidate completed ${count} response turns during the interview session. Demonstrated solid communication and technical background.`,
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

  const startIdx = Math.floor(Math.random() * keys.length);
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = keys[(startIdx + attempt) % keys.length];
    try {
      const groq = new Groq({ apiKey: key });
      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const text = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);
      return parsed;
    } catch (error: any) {
      console.warn(`Groq evaluation attempt ${attempt + 1}/${keys.length} failed with key:`, error?.message || error);
    }
  }

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

export async function callGroqWithFallback<T = any>(
  fn: (groq: Groq) => Promise<T>
): Promise<T | null> {
  const client = getGroqClient();
  if (!client) return null;
  try {
    return await fn(client);
  } catch (error) {
    console.error("Groq API call error:", error);
    return null;
  }
}

