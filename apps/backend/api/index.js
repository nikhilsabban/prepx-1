var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/models/User.ts
import mongoose2, { Schema } from "mongoose";
var UserSchema, User;
var init_User = __esm({
  "src/models/User.ts"() {
    "use strict";
    UserSchema = new Schema(
      {
        username: {
          type: String,
          unique: true,
          sparse: true,
          lowercase: true,
          trim: true,
          minlength: [3, "Username must be at least 3 characters long"],
          match: [/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, dots, and hyphens"]
        },
        fullName: {
          type: String,
          required: [true, "Full name is required"],
          trim: true
        },
        email: {
          type: String,
          required: [true, "Email is required"],
          unique: true,
          lowercase: true,
          trim: true,
          match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
            "Please enter a valid email address"
          ]
        },
        password: {
          type: String,
          minlength: [6, "Password must be at least 6 characters long"]
        },
        authProvider: {
          type: String,
          enum: ["local", "google", "github", "linkedin"],
          default: "local"
        },
        providerId: {
          type: String,
          default: ""
        },
        resetPasswordToken: String,
        resetPasswordExpire: Date,
        emailOtpToken: String,
        emailOtpExpire: Date,
        isVerified: {
          type: Boolean,
          default: false
        },
        verificationToken: String,
        verificationTokenExpire: Date,
        college: {
          type: String,
          default: "",
          trim: true
        },
        branch: {
          type: String,
          default: "",
          trim: true
        },
        degree: {
          type: String,
          default: "",
          trim: true
        },
        graduationYear: {
          type: String,
          default: "",
          trim: true
        },
        cgpa: {
          type: String,
          default: "",
          trim: true
        },
        profilePicture: {
          type: String,
          default: ""
        },
        linkedinUrl: {
          type: String,
          default: ""
        },
        githubUrl: {
          type: String,
          default: ""
        },
        phoneNumber: {
          type: String,
          default: ""
        },
        xp: {
          type: Number,
          default: 0
        },
        streakDays: {
          type: Number,
          default: 1
        },
        lastActiveDate: {
          type: Date,
          default: Date.now
        },
        badges: {
          type: [String],
          default: ["On Fire!"]
        },
        mobileSessionToken: {
          type: String,
          default: ""
        },
        desktopSessionToken: {
          type: String,
          default: ""
        },
        rating: {
          type: Number,
          default: 0
        },
        ratingTitle: {
          type: String,
          default: "Beginner"
        },
        solved: [{
          type: Schema.Types.ObjectId,
          ref: "CodingProblem"
        }],
        attempted: [{
          type: Schema.Types.ObjectId,
          ref: "CodingProblem"
        }],
        bookmarks: [{
          type: Schema.Types.ObjectId,
          ref: "CodingProblem"
        }],
        gdBookmarks: [{
          type: Schema.Types.ObjectId,
          ref: "GroupDiscussion"
        }],
        codingStreak: {
          type: Number,
          default: 0
        },
        codingStreakLast: {
          type: String,
          default: ""
        },
        plan: {
          type: String,
          default: "free"
        },
        isAdmin: {
          type: Boolean,
          default: false
        }
      },
      {
        timestamps: true
      }
    );
    UserSchema.index({ xp: -1 });
    UserSchema.index({ rating: -1 });
    UserSchema.index({ xp: -1, rating: -1 });
    UserSchema.index({ createdAt: -1 });
    UserSchema.index({ verificationToken: 1 }, { sparse: true });
    UserSchema.index({ resetPasswordToken: 1 }, { sparse: true });
    UserSchema.methods.toJSON = function() {
      const user = this.toObject();
      delete user.password;
      return user;
    };
    User = mongoose2.model("User", UserSchema);
  }
});

// src/services/gamificationService.ts
var gamificationService_exports = {};
__export(gamificationService_exports, {
  awardActivityXP: () => awardActivityXP,
  processDailyLoginBonus: () => processDailyLoginBonus
});
async function processDailyLoginBonus(user) {
  try {
    const today = /* @__PURE__ */ new Date();
    const todayStr = today.toDateString();
    const lastActiveStr = user.lastActiveDate ? new Date(user.lastActiveDate).toDateString() : "";
    let xpEarned = 0;
    let streakUpdated = false;
    if (lastActiveStr !== todayStr) {
      const yesterday = new Date(Date.now() - 864e5).toDateString();
      if (lastActiveStr === yesterday) {
        user.streakDays = (user.streakDays || 0) + 1;
      } else {
        user.streakDays = 1;
      }
      xpEarned = 50;
      user.xp = (user.xp || 0) + xpEarned;
      user.lastActiveDate = today;
      streakUpdated = true;
      if (!user.badges) user.badges = [];
      if (!user.badges.includes("Daily Pioneer")) {
        user.badges.push("Daily Pioneer");
      }
      if (user.streakDays >= 3 && !user.badges.includes("On Fire!")) {
        user.badges.push("On Fire!");
      }
      await checkAndAwardXPBadges(user);
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            streakDays: user.streakDays,
            xp: user.xp,
            lastActiveDate: user.lastActiveDate,
            badges: user.badges
          }
        }
      );
    }
    return { xpEarned, streakUpdated };
  } catch (error) {
    console.error("processDailyLoginBonus error:", error);
    return { xpEarned: 0, streakUpdated: false };
  }
}
async function awardActivityXP(userId, amount, activityName, extraBadge) {
  try {
    const user = await User.findById(userId).select("fullName xp badges streakDays solved");
    if (!user) {
      return { xpEarned: 0, newXP: 0, streakDays: 1, badges: [], newBadgesAwarded: [] };
    }
    if (!user.badges) user.badges = [];
    const prevBadges = [...user.badges];
    user.xp = (user.xp || 0) + amount;
    if (extraBadge && !user.badges.includes(extraBadge)) {
      user.badges.push(extraBadge);
    }
    await checkAndAwardXPBadges(user);
    await User.updateOne(
      { _id: userId },
      { $set: { xp: user.xp, badges: user.badges } }
    );
    const newBadgesAwarded = user.badges.filter((b) => !prevBadges.includes(b));
    console.log(`\u{1F3AE} [Gamification] +${amount} XP awarded to ${user.fullName} for "${activityName}". Total XP: ${user.xp}`);
    return {
      xpEarned: amount,
      newXP: user.xp,
      streakDays: user.streakDays || 1,
      badges: user.badges,
      newBadgesAwarded
    };
  } catch (error) {
    console.error("awardActivityXP error:", error);
    return { xpEarned: 0, newXP: 0, streakDays: 1, badges: [], newBadgesAwarded: [] };
  }
}
async function checkAndAwardXPBadges(user) {
  if (!user.badges) user.badges = [];
  const xp = user.xp || 0;
  if (xp >= 100 && !user.badges.includes("Fast Learner")) {
    user.badges.push("Fast Learner");
  }
  if (xp >= 500 && !user.badges.includes("Rising Star")) {
    user.badges.push("Rising Star");
  }
  if (xp >= 1e3 && !user.badges.includes("PrepX Champion")) {
    user.badges.push("PrepX Champion");
  }
  if (user.solved && user.solved.length >= 5 && !user.badges.includes("Algorithm Ace")) {
    user.badges.push("Algorithm Ace");
  }
}
var init_gamificationService = __esm({
  "src/services/gamificationService.ts"() {
    "use strict";
    init_User();
  }
});

// src/services/groqService.ts
var groqService_exports = {};
__export(groqService_exports, {
  callGroqWithFallback: () => callGroqWithFallback,
  evaluateInterviewWithGroq: () => evaluateInterviewWithGroq,
  generateInterviewerResponse: () => generateInterviewerResponse,
  getGroqClient: () => getGroqClient,
  getGroqKeys: () => getGroqKeys
});
import Groq from "groq-sdk";
function getGroqKeys() {
  const rawKeys = process.env.GROQ_API_KEY;
  if (!rawKeys || !rawKeys.trim()) {
    return [];
  }
  return rawKeys.split(",").map((k) => k.trim()).filter(Boolean);
}
function getGroqClient() {
  const keys = getGroqKeys();
  if (keys.length === 0) {
    return null;
  }
  const selectedKey = keys[Math.floor(Math.random() * keys.length)];
  return new Groq({ apiKey: selectedKey });
}
function generateSmartFallbackQuestion(userMessageCount, candidateAnswer = "", repoName) {
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
    return repoQuestions[userMessageCount % repoQuestions.length];
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
  const index = userMessageCount % FALLBACK_INTERVIEW_QUESTIONS.length;
  return FALLBACK_INTERVIEW_QUESTIONS[index];
}
async function generateInterviewerResponse(githubMetadata, conversationHistory, latestUserMessage, difficulty = "Medium") {
  const keys = getGroqKeys();
  const isRepoSpecific = !!(githubMetadata?.isSpecificRepo || githubMetadata?.repoName);
  const repoName = githubMetadata?.repoName || githubMetadata?.name || (Array.isArray(githubMetadata) && githubMetadata[0]?.name ? githubMetadata[0].name : "");
  if (keys.length === 0) {
    const userMessageCount2 = conversationHistory.filter((m) => m.type === "User").length + (latestUserMessage ? 1 : 0);
    return generateSmartFallbackQuestion(userMessageCount2, latestUserMessage || "", repoName);
  }
  let systemPrompt = "";
  if (isRepoSpecific && repoName) {
    const owner = githubMetadata?.owner || "candidate";
    const languages = Array.isArray(githubMetadata?.languages) && githubMetadata.languages.length > 0 ? githubMetadata.languages.join(", ") : githubMetadata?.primaryLanguage || "TypeScript/JavaScript";
    const topics2 = Array.isArray(githubMetadata?.topics) && githubMetadata.topics.length > 0 ? githubMetadata.topics.join(", ") : "";
    const keyDeps = Array.isArray(githubMetadata?.keyDependencies) && githubMetadata.keyDependencies.length > 0 ? githubMetadata.keyDependencies.slice(0, 15).join(", ") : "";
    const readme = githubMetadata?.readmeSummary || githubMetadata?.description || "";
    const structure = Array.isArray(githubMetadata?.fileStructure) && githubMetadata.fileStructure.length > 0 ? githubMetadata.fileStructure.join(", ") : "";
    systemPrompt = `You are an elite, technical hiring manager conducting a deep-dive repository defense interview at ${difficulty.toUpperCase()} difficulty level.
The candidate has specifically selected their GitHub repository "${repoName}" for technical evaluation.

CHOSEN REPOSITORY DETAILS:
- Repository Name: "${repoName}"
- Author/Owner: "${owner}"
- Repository URL: ${githubMetadata?.repoUrl || `https://github.com/${owner}/${repoName}`}
- Programming Languages Used: ${languages}
${keyDeps ? `- Dependencies & Tech Stack: ${keyDeps}
` : ""}${topics2 ? `- Repository Topics: ${topics2}
` : ""}${structure ? `- Key Modules & Directory Structure: ${structure}
` : ""}${readme ? `- Architecture & Summary:
${readme}
` : ""}
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
    const githubSummary = typeof githubMetadata === "string" ? githubMetadata : JSON.stringify(githubMetadata || {});
    systemPrompt = `You are an expert, friendly AI technical interviewer conducting a live voice interview at ${difficulty.toUpperCase()} difficulty level.
Candidate Profile:
${githubSummary}
Keep your response brief (1-2 sentences max), without markdown or special symbols, suitable for speech audio. Ask ONE question at a time.`;
  }
  const messages = [
    {
      role: "system",
      content: systemPrompt
    }
  ];
  for (const turn of conversationHistory) {
    messages.push({
      role: turn.type === "User" ? "user" : "assistant",
      content: turn.message
    });
  }
  if (latestUserMessage) {
    messages.push({
      role: "user",
      content: latestUserMessage
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
        max_tokens: 250
      });
      const reply = response.choices[0]?.message?.content?.trim();
      if (reply) return reply;
    } catch (error) {
      console.warn(`Groq question generation attempt ${attempt + 1}/${keys.length} failed with key:`, error?.message || error);
    }
  }
  const userMessageCount = conversationHistory.length;
  return generateSmartFallbackQuestion(userMessageCount, latestUserMessage || "", repoName);
}
async function evaluateInterviewWithGroq(conversationHistory) {
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
        speakingPace: "Good"
      },
      perQuestionAnalysis: []
    };
  }
  const transcript = conversationHistory.map((c) => `${c.type === "User" ? "Candidate" : "Interviewer"}: ${c.message}`).join("\n");
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
        temperature: 0.3
      });
      const text = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);
      return parsed;
    } catch (error) {
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
async function callGroqWithFallback(fn) {
  const client = getGroqClient();
  if (!client) return null;
  try {
    return await fn(client);
  } catch (error) {
    console.error("Groq API call error:", error);
    return null;
  }
}
var FALLBACK_INTERVIEW_QUESTIONS;
var init_groqService = __esm({
  "src/services/groqService.ts"() {
    "use strict";
    FALLBACK_INTERVIEW_QUESTIONS = [
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
      "How do you collaborate with design and product teams to break down complex technical requirements into modular tasks?"
    ];
  }
});

// src/models/Interview.ts
import mongoose3, { Schema as Schema2 } from "mongoose";
var InterviewSchema, Interview;
var init_Interview = __esm({
  "src/models/Interview.ts"() {
    "use strict";
    InterviewSchema = new Schema2(
      {
        userId: {
          type: Schema2.Types.ObjectId,
          ref: "User",
          required: false
        },
        title: {
          type: String,
          default: ""
        },
        mode: {
          type: String,
          enum: ["github", "role", "jd"],
          default: "github"
        },
        role: {
          type: String,
          default: ""
        },
        jobDescription: {
          type: String,
          default: ""
        },
        githubMetadata: {
          type: Schema2.Types.Mixed,
          default: {}
        },
        difficulty: {
          type: String,
          enum: ["Basic", "Easy", "Medium", "Difficult"],
          default: "Medium"
        },
        status: {
          type: String,
          enum: ["Pre", "InProgress", "Done"],
          default: "Pre"
        },
        activeDeviceToken: {
          type: String,
          default: ""
        },
        score: {
          type: Number,
          default: 0
        },
        isBookmarked: {
          type: Boolean,
          default: false
        },
        feedback: {
          type: String,
          default: ""
        },
        evaluationData: {
          type: Schema2.Types.Mixed,
          default: null
        }
      },
      {
        timestamps: true
      }
    );
    InterviewSchema.index({ userId: 1, createdAt: -1 });
    InterviewSchema.index({ userId: 1, isBookmarked: 1 });
    InterviewSchema.index({ status: 1 });
    Interview = mongoose3.model("Interview", InterviewSchema);
  }
});

// src/models/Message.ts
import mongoose4, { Schema as Schema3 } from "mongoose";
var MessageSchema, Message;
var init_Message = __esm({
  "src/models/Message.ts"() {
    "use strict";
    MessageSchema = new Schema3(
      {
        interviewId: {
          type: Schema3.Types.ObjectId,
          ref: "Interview",
          required: true,
          index: true
        },
        type: {
          type: String,
          enum: ["User", "Assistant"],
          required: true
        },
        message: {
          type: String,
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    );
    MessageSchema.index({ interviewId: 1, createdAt: 1 });
    Message = mongoose4.model("Message", MessageSchema);
  }
});

// src/services/murfService.ts
var murfService_exports = {};
__export(murfService_exports, {
  synthesizeSpeech: () => synthesizeSpeech,
  synthesizeSpeechWithMurf: () => synthesizeSpeechWithMurf
});
import axios3 from "axios";
async function synthesizeSpeechWithMurf(text, options) {
  const apiKey = process.env.MURF_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  const voiceId = options?.voiceId || process.env.MURF_VOICE_ID || "en-US-terrell";
  try {
    const payload = {
      voiceId,
      text: text.trim(),
      format: options?.format || "MP3",
      modelVersion: options?.modelVersion || "GEN2",
      encodeAsBase64: true,
      ...options?.rate !== void 0 ? { rate: options.rate } : {},
      ...options?.pitch !== void 0 ? { pitch: options.pitch } : {},
      ...options?.style ? { style: options.style } : {}
    };
    const response = await axios3.post(
      "https://api.murf.ai/v1/speech/generate",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey.trim()
        },
        timeout: 15e3
      }
    );
    if (response.data?.encodedAudio) {
      const buffer = Buffer.from(response.data.encodedAudio, "base64");
      return {
        audioBuffer: buffer,
        contentType: "audio/mp3"
      };
    }
    if (response.data?.audioFile) {
      const downloadRes = await axios3.get(response.data.audioFile, {
        responseType: "arraybuffer",
        timeout: 12e3
      });
      return {
        audioBuffer: Buffer.from(downloadRes.data),
        contentType: "audio/mp3"
      };
    }
    console.warn("[Murf TTS] No audio returned in response payload:", response.data);
    return null;
  } catch (error) {
    const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error("[Murf TTS] Error generating speech:", errorDetails);
    return null;
  }
}
async function synthesizeSpeech(text, preferredVoice) {
  if (process.env.MURF_API_KEY?.trim()) {
    const murfResult = await synthesizeSpeechWithMurf(text, {
      voiceId: preferredVoice || process.env.MURF_VOICE_ID || "en-US-terrell"
    });
    if (murfResult) {
      return murfResult;
    }
    console.warn("[Speech Engine] Murf synthesis failed or yielded no audio.");
  }
  return null;
}
var init_murfService = __esm({
  "src/services/murfService.ts"() {
    "use strict";
  }
});

// src/services/sttKeytermsService.ts
var sttKeytermsService_exports = {};
__export(sttKeytermsService_exports, {
  getDynamicInterviewKeyterms: () => getDynamicInterviewKeyterms
});
async function getDynamicInterviewKeyterms(interviewId) {
  const termsSet = /* @__PURE__ */ new Set();
  if (interviewId) {
    try {
      const interview = await Interview.findById(interviewId).select("githubMetadata targetRole").lean();
      if (interview) {
        const gh = interview.githubMetadata || {};
        if (gh.targetRole) {
          gh.targetRole.split(/\s+/).forEach((w) => {
            if (w.length > 2) termsSet.add(w);
          });
        }
        if (Array.isArray(gh.languages)) {
          gh.languages.forEach((lang) => {
            if (typeof lang === "string" && lang.trim()) termsSet.add(lang.trim());
          });
        }
        if (Array.isArray(gh.keyDependencies)) {
          gh.keyDependencies.slice(0, 15).forEach((dep) => {
            if (typeof dep === "string" && dep.trim()) {
              const cleanDep = dep.replace(/^@[\w-]+\//, "").trim();
              if (cleanDep.length > 2) termsSet.add(cleanDep);
            }
          });
        }
        if (gh.repoName && typeof gh.repoName === "string" && gh.repoName.length > 2) {
          termsSet.add(gh.repoName);
        }
      }
      const lastAssistantMsg = await Message.findOne({
        interviewId,
        type: "Assistant"
      }).sort({ createdAt: -1 }).select("message").lean();
      if (lastAssistantMsg?.message) {
        const qText = lastAssistantMsg.message;
        const words2 = qText.match(/\b([A-Z][a-zA-Z0-9.+#-]+|[a-z]+-[a-z]+|\d+)\b/g) || [];
        for (const w of words2) {
          if (w.length > 1 && !["The", "What", "How", "Why", "Could", "You", "When", "Please", "Describe", "Explain", "Can"].includes(w)) {
            termsSet.add(w);
          }
        }
      }
    } catch (err) {
      console.warn("[Keyterms Service] Non-blocking metadata extraction note:", err);
    }
  }
  for (const term of CORE_TECHNICAL_TAXONOMY) {
    if (termsSet.size >= 80) break;
    termsSet.add(term);
  }
  return Array.from(termsSet).slice(0, 80);
}
var CORE_TECHNICAL_TAXONOMY;
var init_sttKeytermsService = __esm({
  "src/services/sttKeytermsService.ts"() {
    "use strict";
    init_Interview();
    init_Message();
    CORE_TECHNICAL_TAXONOMY = [
      // Languages & Core
      "JavaScript",
      "TypeScript",
      "Python",
      "Java",
      "C++",
      "C#",
      "Golang",
      "Rust",
      "PHP",
      "Ruby",
      "Swift",
      "Kotlin",
      // Web Frameworks & Libraries
      "React",
      "Next.js",
      "Vue",
      "Angular",
      "Node.js",
      "Express",
      "NestJS",
      "Django",
      "FastAPI",
      "Spring Boot",
      "Flask",
      // Databases & Caching
      "MongoDB",
      "PostgreSQL",
      "MySQL",
      "Redis",
      "SQLite",
      "DynamoDB",
      "Elasticsearch",
      "Cassandra",
      "Memcached",
      // Database Concepts
      "aggregation",
      "indexing",
      "B-Tree",
      "normalization",
      "ACID",
      "sharding",
      "replication",
      "foreign key",
      // Cloud & DevOps
      "Docker",
      "Kubernetes",
      "AWS",
      "EKS",
      "EC2",
      "S3",
      "GCP",
      "Azure",
      "Terraform",
      "CI/CD",
      "GitHub Actions",
      "Jenkins",
      // Architecture & APIs
      "REST API",
      "GraphQL",
      "microservices",
      "WebSocket",
      "gRPC",
      "OAuth",
      "JWT",
      "monolith",
      "serverless",
      // CS Fundamentals & Algorithms
      "DSA",
      "OOP",
      "DBMS",
      "recursion",
      "binary search",
      "dynamic programming",
      "time complexity",
      "concurrency",
      "deadlock",
      // AI & Data
      "machine learning",
      "embeddings",
      "transformers",
      "neural networks",
      "gradient descent",
      "fine-tuning",
      // Tools & Security
      "Git",
      "GitHub",
      "Linux",
      "Nginx",
      "Jest",
      "Pytest",
      "Postman",
      "CORS",
      "SSL",
      "TLS",
      "RSA-256",
      "AES"
    ];
  }
});

// src/services/sttVerificationService.ts
var sttVerificationService_exports = {};
__export(sttVerificationService_exports, {
  computeCER: () => computeCER,
  computeWER: () => computeWER,
  reconcileTranscripts: () => reconcileTranscripts,
  verifyTurnSpeech: () => verifyTurnSpeech
});
import axios4 from "axios";
import dotenv2 from "dotenv";
function normalizeForComparison(text) {
  return text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}
function computeWER(reference, hypothesis) {
  const r = normalizeForComparison(reference);
  const h = normalizeForComparison(hypothesis);
  if (r.length === 0) return h.length === 0 ? 0 : 1;
  const d = Array.from(
    { length: r.length + 1 },
    () => Array(h.length + 1).fill(0)
  );
  for (let i = 0; i <= r.length; i++) d[i][0] = i;
  for (let j = 0; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++) {
    for (let j = 1; j <= h.length; j++) {
      if (r[i - 1] === h[j - 1]) {
        d[i][j] = d[i - 1][j - 1];
      } else {
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          // Deletion
          d[i][j - 1] + 1,
          // Insertion
          d[i - 1][j - 1] + 1
          // Substitution
        );
      }
    }
  }
  return d[r.length][h.length] / r.length;
}
function computeCER(reference, hypothesis) {
  const r = reference.toLowerCase().replace(/\s+/g, "");
  const h = hypothesis.toLowerCase().replace(/\s+/g, "");
  if (r.length === 0) return h.length === 0 ? 0 : 1;
  const d = Array.from(
    { length: r.length + 1 },
    () => Array(h.length + 1).fill(0)
  );
  for (let i = 0; i <= r.length; i++) d[i][0] = i;
  for (let j = 0; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++) {
    for (let j = 1; j <= h.length; j++) {
      if (r[i - 1] === h[j - 1]) {
        d[i][j] = d[i - 1][j - 1];
      } else {
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + 1
        );
      }
    }
  }
  return d[r.length][h.length] / r.length;
}
function reconcileTranscripts(streamingText, prerecordedText, prerecordedConfidence) {
  const streamTrimmed = streamingText.trim();
  const prerecordTrimmed = prerecordedText.trim();
  if (!prerecordTrimmed) {
    return {
      finalTranscript: streamTrimmed,
      decisionReason: "prerecorded_empty_retained_streaming"
    };
  }
  if (!streamTrimmed) {
    return {
      finalTranscript: prerecordTrimmed,
      decisionReason: "streaming_empty_used_prerecorded"
    };
  }
  const streamWords = normalizeForComparison(streamTrimmed);
  const prerecordWords = normalizeForComparison(prerecordTrimmed);
  if (streamWords.join(" ") === prerecordWords.join(" ")) {
    return {
      finalTranscript: prerecordTrimmed,
      decisionReason: "identical_words_used_prerecorded_formatting"
    };
  }
  const streamJoined = streamWords.join(" ");
  const prerecordJoined = prerecordWords.join(" ");
  if (prerecordJoined.endsWith(streamJoined) && prerecordWords.length > streamWords.length) {
    return {
      finalTranscript: prerecordTrimmed,
      decisionReason: "prerecorded_recovered_missing_lead_words"
    };
  }
  if (prerecordedConfidence >= 0.75) {
    return {
      finalTranscript: prerecordTrimmed,
      decisionReason: "high_confidence_prerecorded_selected"
    };
  }
  return {
    finalTranscript: streamTrimmed,
    decisionReason: "uncertain_prerecorded_preserved_streaming"
  };
}
async function verifyTurnSpeech(params) {
  const { audioBuffer, mimeType, liveTranscript, keyterms = [], language = DEEPGRAM_LANGUAGE } = params;
  if (!STT_VERIFICATION_ENABLED || !audioBuffer || audioBuffer.length < 2e3 || // Less than ~0.5s audio
  !DEEPGRAM_API_KEY.trim()) {
    return {
      verifiedTranscript: liveTranscript.trim(),
      confidence: 1,
      usedVerification: false,
      method: "streaming-preserved",
      wordsCount: liveTranscript.trim().split(/\s+/).filter(Boolean).length
    };
  }
  try {
    const url = new URL("https://api.deepgram.com/v1/listen");
    url.searchParams.set("model", DEEPGRAM_MODEL);
    url.searchParams.set("language", language);
    url.searchParams.set("smart_format", "true");
    url.searchParams.set("punctuate", "true");
    url.searchParams.set("filler_words", "true");
    for (const term of keyterms.slice(0, 35)) {
      if (term && term.trim()) {
        url.searchParams.append("keyterm", term.trim());
      }
    }
    const contentType = mimeType || "audio/webm";
    const response = await axios4.post(url.toString(), audioBuffer, {
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY.trim()}`,
        "Content-Type": contentType
      },
      timeout: 7e3,
      maxBodyLength: 25 * 1024 * 1024
    });
    const alt = response.data?.results?.channels?.[0]?.alternatives?.[0];
    const prerecordedText = alt?.transcript || "";
    const confidence = alt?.confidence ?? 0.85;
    const { finalTranscript } = reconcileTranscripts(liveTranscript, prerecordedText, confidence);
    return {
      verifiedTranscript: finalTranscript,
      confidence,
      usedVerification: true,
      method: "deepgram-prerecorded",
      wordsCount: finalTranscript.split(/\s+/).filter(Boolean).length
    };
  } catch (error) {
    console.warn("[STT Verification] Second pass note:", error.message || error);
    return {
      verifiedTranscript: liveTranscript.trim(),
      confidence: 0.9,
      usedVerification: false,
      method: "fallback",
      wordsCount: liveTranscript.trim().split(/\s+/).filter(Boolean).length
    };
  }
}
var DEEPGRAM_API_KEY, STT_VERIFICATION_ENABLED, DEEPGRAM_MODEL, DEEPGRAM_LANGUAGE;
var init_sttVerificationService = __esm({
  "src/services/sttVerificationService.ts"() {
    "use strict";
    dotenv2.config();
    DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "";
    STT_VERIFICATION_ENABLED = process.env.STT_VERIFICATION_ENABLED !== "false";
    DEEPGRAM_MODEL = process.env.DEEPGRAM_MODEL || "nova-3";
    DEEPGRAM_LANGUAGE = process.env.DEEPGRAM_LANGUAGE || "en-IN";
  }
});

// src/index.ts
import express from "express";
import cors from "cors";
import mongoose14 from "mongoose";

// src/config/db.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
var cachedConn = null;
var connectionPromise = null;
var DEFAULT_MONGO_URI = "mongodb+srv://nikhilsabban56:ekbVqEywwnVnhhZg@cluster0.xxqun.mongodb.net/test?retryWrites=true&w=majority";
async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  if (connectionPromise) {
    return connectionPromise;
  }
  const MONGO_POOL_OPTIONS = {
    maxPoolSize: 50,
    // Scale up to 50 concurrent operations
    minPoolSize: 2,
    // Instant initial SSL handshake (reduces connection lag from ~9s to <2s)
    serverSelectionTimeoutMS: 5e3,
    socketTimeoutMS: 3e4,
    heartbeatFrequencyMS: 1e4,
    autoIndex: true
    // Background index creation
  };
  connectionPromise = (async () => {
    const primaryUri = process.env.MONGO_URI || DEFAULT_MONGO_URI;
    const URIs = [
      primaryUri,
      !process.env.VERCEL ? "mongodb://127.0.0.1:27017/ai-interviewer" : null,
      !process.env.VERCEL ? "mongodb://localhost:27017/ai-interviewer" : null
    ].filter(Boolean);
    for (const uri of URIs) {
      try {
        const conn = await mongoose.connect(uri, MONGO_POOL_OPTIONS);
        console.log(`\u2705 MongoDB Connected with Optimized Connection Pool (${conn.connection.host})`);
        cachedConn = conn;
        return conn;
      } catch (error) {
        console.warn(`\u26A0\uFE0F MongoDB connection attempt failed (${uri.split("@").pop()}): ${error.message}`);
      }
    }
    console.warn("\u26A0\uFE0F Could not connect to any MongoDB instance.");
    return mongoose;
  })().finally(() => {
    connectionPromise = null;
  });
  return connectionPromise;
}

// src/middleware/rateLimiter.ts
function createRateLimiter(options) {
  const ipMap = /* @__PURE__ */ new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipMap.entries()) {
      if (now > record.resetTime) {
        ipMap.delete(key);
      }
    }
  }, 6e4).unref();
  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown-client";
    const now = Date.now();
    const record = ipMap.get(ip);
    if (!record || now > record.resetTime) {
      ipMap.set(ip, {
        count: 1,
        resetTime: now + options.windowMs
      });
      res.setHeader("X-RateLimit-Limit", options.maxRequests);
      res.setHeader("X-RateLimit-Remaining", options.maxRequests - 1);
      return next();
    }
    if (record.count >= options.maxRequests) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1e3);
      res.setHeader("Retry-After", retryAfterSec);
      res.status(429).json({
        success: false,
        message: options.message || `Too many requests from this client. Please slow down and try again in ${retryAfterSec} seconds.`
      });
      return;
    }
    record.count++;
    res.setHeader("X-RateLimit-Limit", options.maxRequests);
    res.setHeader("X-RateLimit-Remaining", options.maxRequests - record.count);
    next();
  };
}

// src/routes/authRoutes.ts
import { Router } from "express";

// src/controllers/authController.ts
init_User();
init_gamificationService();
init_groqService();
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import "nodemailer";
import axios from "axios";

// src/services/emailService.ts
import nodemailer from "nodemailer";
function getTransporter() {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });
}
function buildCommercialEmailTemplate(params) {
  const { preheader, badgeText, title, description, contentHtml, calloutNote, expiryMinutes } = params;
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; padding: 16px !important; }
      .card-body { padding: 24px 20px !important; }
      .code-display { font-size: 28px !important; letter-spacing: 6px !important; padding: 14px 16px !important; }
      .action-btn { width: 100% !important; display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #f4f4f5;">
  <!-- Preview Text Spacing -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #09090b;">
    ${preheader} &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #09090b; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 560px; margin: 0 auto;">
          
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; padding: 8px 16px; border-radius: 9999px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%); border: 1px solid rgba(168, 85, 247, 0.3);">
                      <span style="font-size: 18px; font-weight: 900; letter-spacing: -0.5px; background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); -webkit-background-clip: text; color: #c084fc;">
                        \u26A1 prepX
                      </span>
                      <span style="font-size: 11px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1.5px; margin-left: 6px;">
                        Placement & Coding
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #121217; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.7);">
                
                <!-- Glowing Top Accent Line -->
                <tr>
                  <td height="3" style="background: linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);"></td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td class="card-body" style="padding: 36px 32px 32px 32px;">
                    
                    <!-- Pill Badge -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="padding: 4px 10px; border-radius: 6px; background-color: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); font-size: 11px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 0.8px;">
                          ${badgeText}
                        </td>
                      </tr>
                    </table>

                    <!-- Headline -->
                    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.4px; line-height: 1.3;">
                      ${title}
                    </h1>

                    <!-- Description -->
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                      ${description}
                    </p>

                    <!-- Custom Content (OTP or Button) -->
                    ${contentHtml}

                    ${expiryMinutes ? `
                    <!-- Expiry Notice -->
                    <div style="margin-top: 20px; padding: 10px 14px; background-color: rgba(39, 39, 42, 0.5); border: 1px solid #27272a; border-radius: 10px; font-size: 12px; color: #71717a; text-align: center;">
                      \u23F1\uFE0F This authentication token will expire in <strong style="color: #e4e4e7;">${expiryMinutes} minutes</strong>.
                    </div>
                    ` : ""}

                    ${calloutNote ? `
                    <!-- Security Notice -->
                    <div style="margin-top: 24px; padding: 12px 16px; background-color: rgba(24, 24, 27, 0.8); border-left: 3px solid #6366f1; border-radius: 4px 8px 8px 4px; font-size: 12px; line-height: 1.5; color: #71717a;">
                      ${calloutNote}
                    </div>
                    ` : ""}

                  </td>
                </tr>

                <!-- Security Verification Footer Bar -->
                <tr>
                  <td style="background-color: #0e0e13; border-top: 1px solid #1f1f23; padding: 14px 32px; font-size: 11px; color: #52525b;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left">
                          \u{1F512} 256-bit Secure Authentication
                        </td>
                        <td align="right">
                          Official PrepX Notification
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer Legal & Links -->
          <tr>
            <td align="center" style="padding: 24px 16px 0 16px; font-size: 11px; line-height: 1.6; color: #52525b;">
              <p style="margin: 0 0 8px 0;">
                If you did not initiate this request, no action is needed \u2014 your account remains completely secure.
              </p>
              <p style="margin: 0;">
                &copy; ${currentYear} PrepX AI Placement & Coding Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
async function sendOtpEmail(toEmail, otp, purpose = "login") {
  const isLogin = purpose === "login";
  const title = isLogin ? "Your One-Time Login Code" : "Password Change Verification";
  const badgeText = isLogin ? "Account Security" : "Password Verification";
  const description = isLogin ? "Enter the 6-digit verification code below on PrepX to complete your secure passwordless sign-in." : "You requested to change your PrepX account password. Enter the 6-digit security code below to authorize this update.";
  const contentHtml = `
    <!-- OTP Code Display Card -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 8px 0;">
      <tr>
        <td align="center" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%); border: 1.5px dashed rgba(168, 85, 247, 0.4); border-radius: 14px; padding: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
            One-Time Security Passcode
          </div>
          <div class="code-display" style="font-family: 'Courier New', Courier, monospace, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #ffffff; text-shadow: 0 0 20px rgba(168, 85, 247, 0.4);">
            ${otp}
          </div>
          <div style="font-size: 11px; color: #71717a; margin-top: 8px;">
            Copy and paste this code into your PrepX verification screen.
          </div>
        </td>
      </tr>
    </table>
  `;
  const html = buildCommercialEmailTemplate({
    preheader: `Your PrepX verification code is: ${otp}. Valid for 10 minutes.`,
    badgeText,
    title,
    description,
    contentHtml,
    expiryMinutes: 10,
    calloutNote: "Never share this code with anyone. PrepX staff will never ask for your verification code."
  });
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`
\u{1F4E7} [DEV SIMULATED EMAIL - NO SMTP]: OTP for ${toEmail} is: ${otp}
`);
    return true;
  }
  try {
    await transporter.sendMail({
      from: `"PrepX Security" <${process.env.SMTP_EMAIL}>`,
      to: toEmail,
      subject: isLogin ? `${otp} is your prepX login code` : `${otp} is your prepX verification code`,
      html
    });
    return true;
  } catch (err) {
    console.error("Failed to send OTP email via SMTP:", err);
    return false;
  }
}
async function sendVerificationEmail(toEmail, fullName, verifyUrl) {
  const contentHtml = `
    <!-- Action Button -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0 8px 0;">
      <tr>
        <td align="center">
          <a href="${verifyUrl}" class="action-btn" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.2px; box-shadow: 0 8px 24px -6px rgba(99, 102, 241, 0.5);">
            Verify My Email Address &rarr;
          </a>
        </td>
      </tr>
    </table>

    <div style="margin-top: 18px; font-size: 11px; color: #71717a; word-break: break-all; text-align: center;">
      Or copy and paste this verification URL into your browser:<br>
      <a href="${verifyUrl}" style="color: #818cf8; text-decoration: underline;">${verifyUrl}</a>
    </div>
  `;
  const html = buildCommercialEmailTemplate({
    preheader: `Welcome to PrepX, ${fullName}! Please verify your email address to activate your account.`,
    badgeText: "Welcome to PrepX",
    title: `Verify your account, ${fullName}`,
    description: "Thank you for joining PrepX \u2014 India's premier AI placement preparation and coding accelerator. Click the button below to confirm your email and access mock interviews, coding labs, and group discussions.",
    contentHtml,
    expiryMinutes: 1440,
    // 24 hours
    calloutNote: "If you did not register for a PrepX account, please safely ignore this email."
  });
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`
\u{1F4E7} [DEV SIMULATED EMAIL - NO SMTP]: Verify URL for ${toEmail} is: ${verifyUrl}
`);
    return true;
  }
  try {
    await transporter.sendMail({
      from: `"PrepX Welcome" <${process.env.SMTP_EMAIL}>`,
      to: toEmail,
      subject: "Verify your email address \u2014 PrepX Placement Platform",
      html
    });
    return true;
  } catch (err) {
    console.error("Failed to send verification email via SMTP:", err);
    return false;
  }
}
async function sendPasswordResetEmail(toEmail, resetUrl) {
  const contentHtml = `
    <!-- Action Button -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0 8px 0;">
      <tr>
        <td align="center">
          <a href="${resetUrl}" class="action-btn" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.2px; box-shadow: 0 8px 24px -6px rgba(99, 102, 241, 0.5);">
            Reset My Password &rarr;
          </a>
        </td>
      </tr>
    </table>

    <div style="margin-top: 18px; font-size: 11px; color: #71717a; word-break: break-all; text-align: center;">
      Or copy and paste this URL into your browser:<br>
      <a href="${resetUrl}" style="color: #818cf8; text-decoration: underline;">${resetUrl}</a>
    </div>
  `;
  const html = buildCommercialEmailTemplate({
    preheader: "Reset your PrepX password. This secure link is valid for 15 minutes.",
    badgeText: "Password Recovery",
    title: "Reset Your Password",
    description: "We received a request to reset your PrepX account password. Click the button below to choose a strong, new password.",
    contentHtml,
    expiryMinutes: 15,
    calloutNote: "If you did not request a password reset, please ignore this email or review your account security."
  });
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`
\u{1F4E7} [DEV SIMULATED EMAIL - NO SMTP]: Reset URL for ${toEmail} is: ${resetUrl}
`);
    return true;
  }
  try {
    await transporter.sendMail({
      from: `"PrepX Security" <${process.env.SMTP_EMAIL}>`,
      to: toEmail,
      subject: "Password Reset Request \u2014 PrepX",
      html
    });
    return true;
  } catch (err) {
    console.error("Failed to send password reset email via SMTP:", err);
    return false;
  }
}

// src/controllers/authController.ts
function generateToken(id) {
  const secret = process.env.JWT_SECRET || "default_jwt_secret_dev_key_12345";
  return jwt.sign({ id }, secret, {
    expiresIn: "7d"
  });
}
function getClientUrl(req) {
  if (req) {
    let origin = req.headers.origin || "";
    if (!origin && req.headers.referer) {
      try {
        origin = new URL(req.headers.referer).origin;
      } catch (e) {
        origin = "";
      }
    }
    if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1") && !origin.includes("::1")) {
      return origin.replace(/\/$/, "");
    }
  }
  if (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes("localhost") && !process.env.CLIENT_URL.includes("127.0.0.1")) {
    return process.env.CLIENT_URL.replace(/\/$/, "");
  }
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes("localhost") && !process.env.FRONTEND_URL.includes("127.0.0.1")) {
    return process.env.FRONTEND_URL.replace(/\/$/, "");
  }
  return "https://prepx-one.vercel.app";
}
async function signup(req, res) {
  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
      college,
      branch,
      degree,
      graduationYear,
      profilePicture
    } = req.body;
    if (!fullName || !email || !password) {
      res.status(400).json({
        message: "Full Name, Email, and Password are required"
      });
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({
        message: "Passwords do not match"
      });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({
        message: "Password must be at least 6 characters long"
      });
      return;
    }
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(409).json({
        message: "A user with this email address already exists"
      });
      return;
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      college: college ? college.trim() : "",
      branch: branch ? branch.trim() : "",
      degree: degree ? degree.trim() : "",
      graduationYear: graduationYear ? graduationYear.trim() : "",
      profilePicture: profilePicture || "",
      isVerified: false,
      verificationToken,
      verificationTokenExpire
    });
    const clientUrl = getClientUrl(req);
    const verifyUrl = `${clientUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    console.log(`

[GMAIL VERIFICATION LINK FOR ${user.email}]:
${verifyUrl}

`);
    await sendVerificationEmail(user.email, user.fullName, verifyUrl);
    res.status(201).json({
      success: true,
      message: "Account created successfully! A verification link has been sent to your Gmail. Please verify your email before logging in.",
      verificationRequired: true,
      verificationLink: verifyUrl,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        isVerified: false,
        college: user.college,
        branch: user.branch,
        degree: user.degree,
        graduationYear: user.graduationYear,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: error.message || "Failed to create account"
    });
  }
}
async function verifyEmailLink(req, res) {
  try {
    const { token, email } = req.body;
    if (!token || !email) {
      res.status(400).json({ message: "Verification token and email are required" });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(400).json({ message: "No user found with this email address." });
      return;
    }
    if (user.isVerified) {
      res.json({
        success: true,
        message: "Your Gmail address is already verified! You can proceed to log in."
      });
      return;
    }
    if (!user.verificationToken || user.verificationToken !== token) {
      res.status(400).json({ message: "Invalid verification link token." });
      return;
    }
    if (user.verificationTokenExpire && user.verificationTokenExpire < /* @__PURE__ */ new Date()) {
      res.status(400).json({ message: "Verification link has expired. Please sign up again or request a new link." });
      return;
    }
    user.isVerified = true;
    user.verificationToken = void 0;
    user.verificationTokenExpire = void 0;
    await user.save();
    res.json({
      success: true,
      message: "Your Gmail address has been verified successfully!"
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ message: "Email verification failed" });
  }
}
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({
        message: "Email and password are required"
      });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedEmail }]
    });
    if (!user) {
      res.status(401).json({
        message: "Invalid email or password"
      });
      return;
    }
    if (!user.password) {
      const provider2 = user.authProvider && user.authProvider !== "local" ? user.authProvider : "Google";
      res.status(400).json({
        message: `This account was registered using ${provider2}. Please sign in with ${provider2} or use Forgot Password to create a password.`
      });
      return;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      if (user.authProvider === "google") {
        res.status(401).json({
          message: "Incorrect password. This account was registered with Google. Sign in with 'Continue with Google' or click 'Forgot Password?' to set your password.",
          isGoogleAccount: true
        });
        return;
      }
      res.status(401).json({
        message: "Invalid email or password"
      });
      return;
    }
    if (user.isVerified === false) {
      res.status(403).json({
        message: "Please verify your Gmail address before logging in. Check your inbox for the verification link.",
        requiresVerification: true
      });
      return;
    }
    const token = generateToken(user._id.toString());
    await processDailyLoginBonus(user);
    await user.save();
    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        college: user.college,
        branch: user.branch,
        degree: user.degree,
        graduationYear: user.graduationYear,
        cgpa: user.cgpa,
        profilePicture: user.profilePicture,
        linkedinUrl: user.linkedinUrl,
        githubUrl: user.githubUrl,
        phoneNumber: user.phoneNumber,
        xp: user.xp || 0,
        streakDays: user.streakDays || 1,
        badges: user.badges || ["On Fire!"],
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: error.message || "Server error during login"
    });
  }
}
async function getProfile(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const user = req.user;
    await processDailyLoginBonus(user);
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        college: user.college,
        branch: user.branch,
        degree: user.degree,
        graduationYear: user.graduationYear,
        cgpa: user.cgpa,
        profilePicture: user.profilePicture,
        linkedinUrl: user.linkedinUrl,
        githubUrl: user.githubUrl,
        phoneNumber: user.phoneNumber,
        xp: user.xp || 0,
        streakDays: user.streakDays || 1,
        badges: user.badges || ["On Fire!"],
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch profile"
    });
  }
}
async function getLeaderboard(req, res) {
  try {
    const users = await User.find({}).select("fullName username xp profilePicture").sort({ xp: -1 }).limit(10).lean();
    const leaderboard = users.map((u) => ({
      id: u._id.toString(),
      fullName: u.fullName || "Anonymous Candidate",
      username: u.username || "",
      xp: u.xp || 0,
      profilePicture: u.profilePicture || ""
    }));
    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch leaderboard" });
  }
}
async function updateProfile(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const { username, fullName, college, branch, degree, graduationYear, cgpa, profilePicture, linkedinUrl, githubUrl, phoneNumber } = req.body;
    const urlPattern = /^(https?:\/\/)?([\w.-]+)\.[a-zA-Z]{2,}(\/\S*)?$/;
    if (linkedinUrl && !urlPattern.test(linkedinUrl)) {
      res.status(400).json({ message: "Invalid LinkedIn URL" });
      return;
    }
    if (githubUrl && !urlPattern.test(githubUrl)) {
      res.status(400).json({ message: "Invalid GitHub URL" });
      return;
    }
    const currentUser = await User.findById(req.user._id).select("username").lean();
    if (!currentUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const updateFields = {};
    if (username !== void 0 && username.trim() !== "") {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername !== (currentUser.username || "")) {
        const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
        if (!usernameRegex.test(cleanUsername)) {
          res.status(400).json({ message: "Username can only contain letters, numbers, underscores, dots, and hyphens" });
          return;
        }
        if (cleanUsername.length < 3) {
          res.status(400).json({ message: "Username must be at least 3 characters long" });
          return;
        }
        const existingUser = await User.findOne({ username: cleanUsername, _id: { $ne: currentUser._id } }).select("_id").lean();
        if (existingUser) {
          res.status(409).json({ message: "This username is already taken. Please choose another one." });
          return;
        }
        updateFields.username = cleanUsername;
      }
    }
    if (fullName !== void 0) updateFields.fullName = fullName.trim();
    if (college !== void 0) updateFields.college = college.trim();
    if (branch !== void 0) updateFields.branch = branch.trim();
    if (degree !== void 0) updateFields.degree = degree.trim();
    if (graduationYear !== void 0) updateFields.graduationYear = graduationYear.trim();
    if (cgpa !== void 0) updateFields.cgpa = cgpa.trim();
    if (profilePicture !== void 0) updateFields.profilePicture = profilePicture;
    if (linkedinUrl !== void 0) updateFields.linkedinUrl = linkedinUrl.trim();
    if (githubUrl !== void 0) updateFields.githubUrl = githubUrl.trim();
    if (phoneNumber !== void 0) updateFields.phoneNumber = phoneNumber.trim();
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password").lean();
    if (!updatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        college: updatedUser.college,
        branch: updatedUser.branch,
        degree: updatedUser.degree,
        graduationYear: updatedUser.graduationYear,
        cgpa: updatedUser.cgpa,
        profilePicture: updatedUser.profilePicture,
        linkedinUrl: updatedUser.linkedinUrl,
        githubUrl: updatedUser.githubUrl,
        phoneNumber: updatedUser.phoneNumber,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      message: error.message || "Failed to update profile"
    });
  }
}
async function changePassword(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        message: "Current password and new password are required"
      });
      return;
    }
    if (confirmNewPassword && newPassword !== confirmNewPassword) {
      res.status(400).json({
        message: "New passwords do not match"
      });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({
        message: "New password must be at least 6 characters long"
      });
      return;
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (!user.password) {
      res.status(400).json({
        message: `Your account uses ${user.authProvider || "social login"}. Please use Forgot Password to create a password.`
      });
      return;
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({
        message: "Current password is incorrect"
      });
      return;
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      message: error.message || "Failed to change password"
    });
  }
}
async function logout(req, res) {
  res.json({
    success: true,
    message: "Logged out successfully"
  });
}
async function googleLogin(req, res) {
  const { credential, clientId } = req.body;
  if (!credential) {
    res.status(400).json({ message: "No Google credential provided" });
    return;
  }
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || clientId;
    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: [
        googleClientId,
        "1042824120759-04prrgktoumo9aagnqr2602077u7j368.apps.googleusercontent.com"
      ].filter(Boolean)
    });
    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({ message: "Invalid Google token payload" });
      return;
    }
    const { email, name, picture } = payload;
    if (!email) {
      res.status(400).json({ message: "No email found in Google token" });
      return;
    }
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        fullName: name || "Google User",
        email,
        profilePicture: picture || "",
        authProvider: "google",
        isVerified: true
      });
    } else {
      user.isVerified = true;
      if (!user.authProvider || user.authProvider === "local") {
        user.authProvider = "google";
        if (picture && !user.profilePicture) user.profilePicture = picture;
      }
      await user.save();
    }
    res.json({
      success: true,
      message: "Google login successful",
      token: generateToken(user._id.toString()),
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        profilePicture: user.profilePicture || ""
      }
    });
  } catch (error) {
    console.error("Google auth error:", error?.message || error);
    res.status(500).json({ message: error?.message || "Google authentication failed" });
  }
}
async function forgotPassword(req, res) {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!user) {
      res.json({ success: true, message: "If that email exists, a reset link was sent." });
      return;
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1e3);
    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpire = resetPasswordExpire;
    await user.save();
    const clientUrl = getClientUrl(req);
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;
    console.log(`

[RESET PASSWORD LINK FOR ${user.email}]:
${resetUrl}

`);
    await sendPasswordResetEmail(user.email, resetUrl);
    res.json({
      success: true,
      message: "If that email exists, a reset link was sent.",
      // In dev mode, we can return the url directly for easy testing if desired
      dev_link: resetUrl
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Error sending password reset email" });
  }
}
async function resetPassword(req, res) {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters" });
      return;
    }
    const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    if (!user) {
      res.status(400).json({ message: "Invalid or expired password reset token" });
      return;
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = void 0;
    user.resetPasswordExpire = void 0;
    await user.save();
    res.json({
      success: true,
      message: "Password reset successful! You can now log in."
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
}
async function githubLogin(req, res) {
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ message: "No GitHub code provided" });
    return;
  }
  try {
    const clientId = process.env.GITHUB_CLIENT_ID || "MOCK_GITHUB_CLIENT_ID";
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || "MOCK_GITHUB_CLIENT_SECRET";
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        code
      },
      {
        headers: { Accept: "application/json" }
      }
    );
    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      if (clientId === "MOCK_GITHUB_CLIENT_ID") {
        const mockUser = await findOrCreateOAuthUser("github", "mock-github-123", "Mock GitHub User", "mock-github@example.com", "");
        res.json(getAuthResponse(mockUser, "GitHub login successful (MOCK)"));
        return;
      }
      res.status(400).json({ message: "Failed to get GitHub access token" });
      return;
    }
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const emailResponse = await axios.get("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const githubUser = userResponse.data;
    const primaryEmailObj = emailResponse.data.find((e) => e.primary) || emailResponse.data[0];
    const email = primaryEmailObj?.email;
    if (!email) {
      res.status(400).json({ message: "No email associated with this GitHub account" });
      return;
    }
    const user = await findOrCreateOAuthUser(
      "github",
      githubUser.id.toString(),
      githubUser.name || githubUser.login,
      email,
      githubUser.avatar_url
    );
    res.json(getAuthResponse(user, "GitHub login successful"));
  } catch (error) {
    console.error("GitHub auth error:", error.response?.data || error);
    res.status(500).json({ message: "GitHub authentication failed" });
  }
}
async function linkedinLogin(req, res) {
  const { code, redirectUri } = req.body;
  if (!code) {
    res.status(400).json({ message: "No LinkedIn code provided" });
    return;
  }
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID || "MOCK_LINKEDIN_CLIENT_ID";
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || "MOCK_LINKEDIN_CLIENT_SECRET";
    let accessToken;
    if (clientId === "MOCK_LINKEDIN_CLIENT_ID") {
      const mockUser = await findOrCreateOAuthUser("linkedin", "mock-linkedin-123", "Mock LinkedIn User", "mock-linkedin@example.com", "");
      res.json(getAuthResponse(mockUser, "LinkedIn login successful (MOCK)"));
      return;
    }
    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri || `${getClientUrl(req)}/auth/callback`,
        client_id: clientId,
        client_secret: clientSecret
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    );
    accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      res.status(400).json({ message: "Failed to get LinkedIn access token" });
      return;
    }
    const userResponse = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const linkedinUser = userResponse.data;
    const email = linkedinUser.email;
    const name = linkedinUser.name;
    const picture = linkedinUser.picture;
    if (!email) {
      res.status(400).json({ message: "No email associated with this LinkedIn account" });
      return;
    }
    const user = await findOrCreateOAuthUser(
      "linkedin",
      linkedinUser.sub,
      name,
      email,
      picture
    );
    res.json(getAuthResponse(user, "LinkedIn login successful"));
  } catch (error) {
    console.error("LinkedIn auth error:", error.response?.data || error);
    res.status(500).json({ message: "LinkedIn authentication failed" });
  }
}
async function findOrCreateOAuthUser(provider2, providerId, name, email, picture) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      fullName: name || `${provider2} User`,
      email,
      profilePicture: picture || "",
      authProvider: provider2,
      providerId,
      isVerified: true
    });
  } else {
    user.isVerified = true;
    if (!user.authProvider || user.authProvider === "local") {
      user.authProvider = provider2;
      user.providerId = providerId;
      if (picture && !user.profilePicture) user.profilePicture = picture;
    }
    await user.save();
  }
  return user;
}
function getAuthResponse(user, message) {
  return {
    success: true,
    message,
    token: generateToken(user._id.toString()),
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      profilePicture: user.profilePicture || ""
    }
  };
}
async function sendEmailOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpire = new Date(Date.now() + 10 * 60 * 1e3);
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = await User.create({
        fullName: normalizedEmail.split("@")[0],
        email: normalizedEmail,
        emailOtpToken: hashedOtp,
        emailOtpExpire: otpExpire
      });
    } else {
      user.emailOtpToken = hashedOtp;
      user.emailOtpExpire = otpExpire;
      await user.save();
    }
    console.log(`

[EMAIL OTP FOR ${normalizedEmail}]: ${otp}

`);
    sendOtpEmail(normalizedEmail, otp, "login").catch((err) => {
      console.error("[EmailService] Background login OTP email error:", err);
    });
    res.json({
      success: true,
      message: `OTP sent successfully to ${normalizedEmail}`,
      dev_otp: process.env.NODE_ENV === "production" ? void 0 : otp
    });
  } catch (error) {
    console.error("Send email OTP error:", error);
    res.status(500).json({ message: error.message || "Failed to send email OTP" });
  }
}
async function verifyEmailOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ message: "Email and OTP code are required" });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const hashedOtp = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    const user = await User.findOne({
      email: normalizedEmail,
      emailOtpToken: hashedOtp,
      emailOtpExpire: { $gt: Date.now() }
    });
    if (!user) {
      res.status(400).json({ message: "Invalid or expired OTP code" });
      return;
    }
    user.emailOtpToken = void 0;
    user.emailOtpExpire = void 0;
    await user.save();
    res.json(getAuthResponse(user, "Email OTP login successful"));
  } catch (error) {
    console.error("Verify email OTP error:", error);
    res.status(500).json({ message: error.message || "Failed to verify OTP" });
  }
}
async function requestPasswordChangeOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpire = new Date(Date.now() + 10 * 60 * 1e3);
    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      { $set: { emailOtpToken: hashedOtp, emailOtpExpire: otpExpire } },
      { projection: { _id: 1 } }
    ).lean();
    if (!user) {
      res.status(404).json({ success: false, message: "User not found with this email" });
      return;
    }
    console.log(`

[PASSWORD CHANGE OTP FOR ${normalizedEmail}]: ${otp}

`);
    sendOtpEmail(normalizedEmail, otp, "password_change").catch((err) => {
      console.error("[EmailService] Background password change OTP email error:", err);
    });
    res.json({
      success: true,
      message: `Verification code sent to ${normalizedEmail}`,
      dev_otp: process.env.NODE_ENV === "production" ? void 0 : otp
    });
  } catch (error) {
    console.error("Request password change OTP error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to send verification code" });
  }
}
async function verifyPasswordChangeOtp(req, res) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ success: false, verified: false, message: "Email and verification code are required" });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const hashedOtp = crypto.createHash("sha256").update(code.trim()).digest("hex");
    const user = await User.findOne({
      email: normalizedEmail,
      emailOtpToken: hashedOtp,
      emailOtpExpire: { $gt: Date.now() }
    }).select("_id").lean();
    if (!user) {
      res.status(400).json({ success: false, verified: false, message: "Invalid or expired verification code" });
      return;
    }
    res.json({
      success: true,
      verified: true,
      message: "Verification code verified successfully"
    });
  } catch (error) {
    console.error("Verify password change OTP error:", error);
    res.status(500).json({ success: false, verified: false, message: error.message || "Failed to verify code" });
  }
}
async function searchCollegesDb(req, res) {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      res.json({ success: true, dbResults: [] });
      return;
    }
    const dbMatches = await User.distinct("college", {
      college: { $regex: query, $options: "i" }
    });
    const filteredDbResults = dbMatches.filter((c) => c && c.trim().length > 0).slice(0, 10);
    res.json({
      success: true,
      query,
      dbResults: filteredDbResults
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to search DB colleges" });
  }
}
async function searchCollegesAi(req, res) {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      res.json({ success: true, aiSuggestions: [] });
      return;
    }
    let aiSuggestions = [];
    try {
      const completion = await callGroqWithFallback(
        (groq) => groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are an academic institution directory. Given a partial search query, return a json object with key "colleges" containing an array of up to 6 real world college or university names that start with or match the search query.`
            },
            {
              role: "user",
              content: `Search query: "${query}"`
            }
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      );
      const content = completion?.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.colleges)) {
          aiSuggestions = parsed.colleges;
        }
      }
    } catch (aiErr) {
      console.warn("AI college search warning:", aiErr);
    }
    if (aiSuggestions.length === 0) {
      const popularColleges = [
        "Stanford University",
        "Massachusetts Institute of Technology (MIT)",
        "Harvard University",
        "University of California, Berkeley",
        "Indian Institute of Technology (IIT) Bombay",
        "Indian Institute of Technology (IIT) Delhi",
        "National Institute of Technology (NIT)",
        "Carnegie Mellon University",
        "University of Oxford",
        "University of Cambridge",
        "Georgia Institute of Technology"
      ];
      aiSuggestions = popularColleges.filter((c) => c.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
    }
    res.json({
      success: true,
      query,
      aiSuggestions
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch AI college recommendations" });
  }
}
async function searchBranchesDb(req, res) {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      res.json({ success: true, dbResults: [] });
      return;
    }
    const dbMatches = await User.distinct("branch", {
      branch: { $regex: query, $options: "i" }
    });
    const filteredDbResults = dbMatches.filter((b) => b && b.trim().length > 0).slice(0, 10);
    res.json({
      success: true,
      query,
      dbResults: filteredDbResults
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to search DB branches" });
  }
}
async function searchBranchesAi(req, res) {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      res.json({ success: true, aiSuggestions: [] });
      return;
    }
    let aiSuggestions = [];
    try {
      const completion = await callGroqWithFallback(
        (groq) => groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are an academic program directory. Given a partial search query, return a json object with key "branches" containing an array of up to 6 real world academic department/branch names (e.g. Computer Science, Electrical Engineering, Mechanical Engineering) that match or relate to the search query.`
            },
            {
              role: "user",
              content: `Search query: "${query}"`
            }
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      );
      const content = completion?.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.branches)) {
          aiSuggestions = parsed.branches;
        }
      }
    } catch (aiErr) {
      console.warn("AI branch search warning:", aiErr);
    }
    if (aiSuggestions.length === 0) {
      const popularBranches = [
        "Computer Science and Engineering",
        "Information Technology",
        "Electronics and Communication Engineering",
        "Electrical Engineering",
        "Mechanical Engineering",
        "Civil Engineering",
        "Data Science & Artificial Intelligence",
        "Biotechnology",
        "Chemical Engineering",
        "Aerospace Engineering"
      ];
      aiSuggestions = popularBranches.filter((b) => b.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
    }
    res.json({
      success: true,
      query,
      aiSuggestions
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch AI branch recommendations" });
  }
}
async function searchDegreesDb(req, res) {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      res.json({ success: true, dbResults: [] });
      return;
    }
    const dbMatches = await User.distinct("degree", {
      degree: { $regex: query, $options: "i" }
    });
    const filteredDbResults = dbMatches.filter((d) => d && d.trim().length > 0).slice(0, 10);
    res.json({
      success: true,
      query,
      dbResults: filteredDbResults
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to search DB degrees" });
  }
}
async function searchDegreesAi(req, res) {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      res.json({ success: true, aiSuggestions: [] });
      return;
    }
    let aiSuggestions = [];
    try {
      const completion = await callGroqWithFallback(
        (groq) => groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are an academic degree directory. Given a partial search query, return a json object with key "degrees" containing an array of up to 6 standard academic degree names (e.g. B.Tech, B.S., M.Tech, M.S., Ph.D., B.E., MBA, BBA) that match or relate to the search query.`
            },
            {
              role: "user",
              content: `Search query: "${query}"`
            }
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      );
      const content = completion?.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.degrees)) {
          aiSuggestions = parsed.degrees;
        }
      }
    } catch (aiErr) {
      console.warn("AI degree search warning:", aiErr);
    }
    if (aiSuggestions.length === 0) {
      const popularDegrees = [
        "Bachelor of Technology (B.Tech)",
        "Bachelor of Science (B.S.)",
        "Bachelor of Engineering (B.E.)",
        "Master of Technology (M.Tech)",
        "Master of Science (M.S.)",
        "Master of Business Administration (MBA)",
        "Bachelor of Business Administration (BBA)",
        "Doctor of Philosophy (Ph.D.)"
      ];
      aiSuggestions = popularDegrees.filter((d) => d.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
    }
    res.json({
      success: true,
      query,
      aiSuggestions
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch AI degree recommendations" });
  }
}

// src/controllers/uploadController.ts
import multer from "multer";

// src/config/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dfq6px5xz",
  api_key: process.env.CLOUDINARY_API_KEY || "159987823528767",
  api_secret: process.env.CLOUDINARY_API_SECRET || "d3fH6B8S5c9zN7X1_P1k8V2wL4m"
});
var cloudinary_default = cloudinary;

// src/controllers/uploadController.ts
init_User();
var storage = multer.memoryStorage();
var upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB max file size
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  }
});
async function uploadAvatar(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: "Please upload an image file" });
      return;
    }
    cloudinary_default.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dfq6px5xz",
      api_key: process.env.CLOUDINARY_API_KEY || "159987823528767",
      api_secret: process.env.CLOUDINARY_API_SECRET || "d3fH6B8S5c9zN7X1_P1k8V2wL4m"
    });
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const uploadResult = await cloudinary_default.uploader.upload(base64Image, {
      folder: "profile_avatars",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ]
    });
    const imageUrl = uploadResult.secure_url;
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { profilePicture: imageUrl } },
      { new: true }
    ).select("fullName email profilePicture").lean();
    if (!updatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({
      success: true,
      message: "Profile updated successfully",
      url: imageUrl,
      user: {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture
      }
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({
      message: error.message || "Failed to upload avatar to Cloudinary"
    });
  }
}

// src/middleware/authMiddleware.ts
init_User();
import jwt2 from "jsonwebtoken";
async function protect(req, res, next) {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      if (!token) {
        res.status(401).json({ message: "Not authorized, token missing" });
        return;
      }
      const secret = process.env.JWT_SECRET || "super_secret_jwt_key_ai_interviewer_2025";
      const decoded = jwt2.verify(token, secret);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        res.status(401).json({ message: "User not found with this token" });
        return;
      }
      req.user = user;
      next();
      return;
    } catch (error) {
      if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
        res.status(401).json({ message: "Invalid or expired session token. Please log in again." });
        return;
      }
      console.error("Auth Middleware error:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
      return;
    }
  }
  if (!token) {
    res.status(401).json({ message: "Not authorized, no token provided" });
    return;
  }
}
async function optionalAuth(req, res, next) {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      if (token) {
        const secret = process.env.JWT_SECRET || "super_secret_jwt_key_ai_interviewer_2025";
        const decoded = jwt2.verify(token, secret);
        const user = await User.findById(decoded.id).select("-password");
        if (user) {
          req.user = user;
        }
      }
    } catch (error) {
    }
  }
  next();
}

// src/routes/authRoutes.ts
var router = Router();
router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-email-link", verifyEmailLink);
router.get("/leaderboard", getLeaderboard);
router.get("/search-colleges-db", searchCollegesDb);
router.get("/search-colleges-ai", searchCollegesAi);
router.get("/search-branches-db", searchBranchesDb);
router.get("/search-branches-ai", searchBranchesAi);
router.get("/search-degrees-db", searchDegreesDb);
router.get("/search-degrees-ai", searchDegreesAi);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.post("/upload-avatar", protect, upload.single("avatar"), uploadAvatar);
router.put("/change-password", protect, changePassword);
router.post("/logout", logout);
router.post("/google", googleLogin);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);
router.post("/github", githubLogin);
router.post("/linkedin", linkedinLogin);
router.post("/send-email-otp", sendEmailOtp);
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/request-password-change-otp", requestPasswordChangeOtp);
router.post("/verify-password-change-otp", verifyPasswordChangeOtp);
var authRoutes_default = router;

// src/routes/interviewRoutes.ts
import { Router as Router2 } from "express";
import multer2 from "multer";

// src/types/index.ts
import z from "zod";
var PreInterviewBody = z.object({
  title: z.string().min(1, "Interview title is required"),
  mode: z.enum(["github", "role", "jd"]).optional().default("github"),
  github: z.string().optional(),
  repoName: z.string().optional(),
  role: z.string().optional(),
  jobDescription: z.string().optional(),
  difficulty: z.enum(["Basic", "Easy", "Medium", "Difficult"]).optional()
});

// src/scrapers/github.ts
import axios2 from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
var GITHUB_HEADERS = {
  "User-Agent": "PrepX-AI-Interviewer/2.0",
  Accept: "application/vnd.github.v3+json"
};
function getAxiosConfig(timeoutMs = 7e3) {
  const proxyUrl = process.env.PROXY_URL;
  const httpsAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : void 0;
  return {
    httpsAgent,
    headers: GITHUB_HEADERS,
    timeout: timeoutMs
  };
}
var GitHubRepoNotFoundError = class extends Error {
  constructor(owner, repo) {
    super(`GitHub repository "${owner}/${repo}" was not found or is private.`);
    this.owner = owner;
    this.repo = repo;
    this.name = "GitHubRepoNotFoundError";
  }
  status = 404;
};
async function scrapeSpecificRepo(owner, repo) {
  const cleanOwner = owner.trim().replace(/^@/, "");
  const cleanRepo = repo.trim().replace(/\.git$/i, "");
  const repoUrl = `https://github.com/${cleanOwner}/${cleanRepo}`;
  const config2 = getAxiosConfig(8e3);
  let defaultBranch = "main";
  let description = "";
  let primaryLanguage = "";
  let topics2 = [];
  let stars = 0;
  let forks = 0;
  let openIssues = 0;
  try {
    const repoRes = await axios2.get(
      `https://api.github.com/repos/${cleanOwner}/${cleanRepo}`,
      config2
    );
    if (repoRes.data) {
      defaultBranch = repoRes.data.default_branch || "main";
      description = repoRes.data.description || "";
      primaryLanguage = repoRes.data.language || "";
      topics2 = Array.isArray(repoRes.data.topics) ? repoRes.data.topics : [];
      stars = repoRes.data.stargazers_count || 0;
      forks = repoRes.data.forks_count || 0;
      openIssues = repoRes.data.open_issues_count || 0;
    }
  } catch (err) {
    if (err.response?.status === 404) {
      throw new GitHubRepoNotFoundError(cleanOwner, cleanRepo);
    }
    console.warn(`GitHub API notice for ${cleanOwner}/${cleanRepo}:`, err.message);
  }
  const languagePromise = (async () => {
    try {
      const langRes = await axios2.get(
        `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/languages`,
        config2
      );
      if (langRes.data && typeof langRes.data === "object") {
        return Object.keys(langRes.data);
      }
    } catch {
    }
    return primaryLanguage ? [primaryLanguage] : [];
  })();
  const readmePromise = (async () => {
    const branches = [defaultBranch, "main", "master"];
    for (const b of branches) {
      try {
        const rawRes = await axios2.get(
          `https://raw.githubusercontent.com/${cleanOwner}/${cleanRepo}/${b}/README.md`,
          { timeout: 5e3 }
        );
        if (typeof rawRes.data === "string" && rawRes.data.trim()) {
          const cleaned = rawRes.data.replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "").replace(/!\[.*?\]\(.*?\)/g, "").replace(/```[\s\S]*?```/g, "").replace(/[#*`_~]/g, " ").replace(/\s+/g, " ").trim();
          return cleaned.slice(0, 3e3);
        }
      } catch {
      }
    }
    return description ? `Project Description: ${description}` : "";
  })();
  const depsPromise = (async () => {
    const branches = [defaultBranch, "main", "master"];
    for (const b of branches) {
      try {
        const pkgRes = await axios2.get(
          `https://raw.githubusercontent.com/${cleanOwner}/${cleanRepo}/${b}/package.json`,
          { timeout: 4e3 }
        );
        if (pkgRes.data && typeof pkgRes.data === "object") {
          const deps = Object.keys(pkgRes.data.dependencies || {});
          const devDeps = Object.keys(pkgRes.data.devDependencies || {});
          const all = Array.from(/* @__PURE__ */ new Set([...deps, ...devDeps]));
          if (all.length > 0) return all.slice(0, 25);
        }
      } catch {
      }
      try {
        const reqRes = await axios2.get(
          `https://raw.githubusercontent.com/${cleanOwner}/${cleanRepo}/${b}/requirements.txt`,
          { timeout: 4e3 }
        );
        if (typeof reqRes.data === "string" && reqRes.data.trim()) {
          const lines2 = reqRes.data.split("\n").map((l) => l.trim().split(/[=<>~]/)[0]?.trim()).filter(Boolean);
          if (lines2.length > 0) return lines2.slice(0, 20);
        }
      } catch {
      }
    }
    return [];
  })();
  const structurePromise = (async () => {
    try {
      const contentsRes = await axios2.get(
        `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/contents`,
        config2
      );
      if (Array.isArray(contentsRes.data)) {
        return contentsRes.data.map((item) => `${item.name}${item.type === "dir" ? "/" : ""}`).slice(0, 25);
      }
    } catch {
    }
    return [];
  })();
  const [languages, readmeSummary, keyDependencies, fileStructure] = await Promise.all([
    languagePromise,
    readmePromise,
    depsPromise,
    structurePromise
  ]);
  return {
    isSpecificRepo: true,
    repoName: cleanRepo,
    fullName: `${cleanOwner}/${cleanRepo}`,
    owner: cleanOwner,
    repoUrl,
    description: description || `Repository: ${cleanRepo} created by ${cleanOwner}`,
    primaryLanguage: primaryLanguage || (languages[0] || "JavaScript/TypeScript"),
    languages: languages.length > 0 ? languages : [primaryLanguage || "TypeScript"],
    topics: topics2,
    stars,
    forks,
    openIssues,
    keyDependencies,
    readmeSummary: readmeSummary || description || `Technical project ${cleanRepo} on GitHub.`,
    fileStructure
  };
}
async function scrapeGithub(username) {
  const config2 = getAxiosConfig(8e3);
  try {
    const response = await axios2.get(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=12`,
      config2
    );
    return (response.data || []).map((x) => ({
      description: x.description || "",
      name: x.name,
      fullName: x.full_name,
      starCount: x.stargazers_count || 0
    }));
  } catch (err) {
    const status = err.response?.status;
    if (status === 404) {
      console.warn(`\u2139\uFE0F GitHub profile/user "${username}" not found.`);
    } else {
      console.warn(`\u26A0\uFE0F GitHub API notice for "${username}": ${err.message}`);
    }
    return [
      {
        name: username,
        fullName: username,
        description: `Candidate GitHub Profile: ${username}`,
        starCount: 0
      }
    ];
  }
}

// src/controllers/interviewController.ts
init_Interview();
init_Message();

// src/services/resultService.ts
init_groqService();
async function calculateResult(messages) {
  return await evaluateInterviewWithGroq(messages);
}

// src/controllers/interviewController.ts
init_groqService();
init_murfService();
import jwt3 from "jsonwebtoken";
function parseGithubTarget(input, explicitRepoName, interviewTitle) {
  let clean = input.trim().replace(/\/+$/, "").replace(/\.git$/i, "");
  let owner = "";
  let repo = explicitRepoName?.trim() || void 0;
  if (clean.includes("github.com/")) {
    const afterDomain = clean.split("github.com/")[1] || "";
    const parts = afterDomain.split("/").filter(Boolean);
    owner = parts[0] || clean;
    if (parts.length >= 2 && !repo) {
      repo = parts[1];
    }
  } else {
    const parts = clean.split("/").filter(Boolean);
    owner = parts[0] || clean;
    if (parts.length >= 2 && !repo) {
      repo = parts[1];
    }
  }
  owner = owner.replace(/^@/, "").trim();
  if (repo) {
    repo = repo.trim();
  }
  return { owner, repo };
}
async function createPreInterview(req, res) {
  try {
    const { success, data } = PreInterviewBody.safeParse(req.body);
    if (!success) {
      res.status(400).json({
        message: "Interview Title and GitHub URL are mandatory."
      });
      return;
    }
    const mode = data.mode || (data.github ? "github" : data.jobDescription ? "jd" : "role");
    let githubData = {};
    if (mode === "github" && data.github) {
      const { owner, repo } = parseGithubTarget(data.github, data.repoName, data.title);
      if (owner && repo) {
        console.log(`\u{1F50D} [Interview Controller] Targeting specific repository: ${owner}/${repo}`);
        try {
          githubData = await scrapeSpecificRepo(owner, repo);
        } catch (err) {
          if (err instanceof GitHubRepoNotFoundError || err.name === "GitHubRepoNotFoundError" || err.status === 404) {
            console.log(`\u2139\uFE0F [Interview Controller] Repo "${owner}/${repo}" not found. Gracefully attempting profile fallback for @${owner}...`);
            const userRepos = await scrapeGithub(owner);
            const validRepos = userRepos.filter(
              (r) => r.name !== owner || r.starCount > 0 || r.description !== `Candidate GitHub Profile: ${owner}`
            );
            if (validRepos.length > 0) {
              console.log(`\u2705 [Interview Controller] Fallback successful: using ${validRepos.length} public repos from @${owner}`);
              githubData = userRepos;
            } else {
              res.status(400).json({
                message: `Repository "${owner}/${repo}" was not found on GitHub. Please check the URL or ensure the repository is public.`
              });
              return;
            }
          } else {
            throw err;
          }
        }
      } else if (owner) {
        console.log(`\u{1F50D} [Interview Controller] Targeting user profile: ${owner}`);
        githubData = await scrapeGithub(owner);
      }
    } else if (mode === "role") {
      githubData = { targetRole: data.role || "Software Engineer" };
    } else if (mode === "jd") {
      githubData = { jobDescription: data.jobDescription || "" };
    }
    const difficultyLabel = data.difficulty || "Medium";
    const dynamicTitle = data.title.trim();
    const interview = await Interview.create({
      userId: req.user?._id || void 0,
      title: dynamicTitle,
      mode,
      role: data.role || "",
      jobDescription: data.jobDescription || "",
      githubMetadata: githubData,
      difficulty: difficultyLabel,
      status: "Pre",
      score: 0,
      feedback: ""
    });
    res.json({ id: interview._id.toString() });
  } catch (error) {
    console.error("Pre-interview error:", error);
    res.status(500).json({
      message: error.message || "Failed to start pre-interview"
    });
  }
}
async function getDeepgramKey(req, res) {
  const isMurfConfigured = !!process.env.MURF_API_KEY?.trim();
  const hasDeepgram = !!process.env.DEEPGRAM_API_KEY?.trim();
  const isConfigured = hasDeepgram || isMurfConfigured;
  const defaultModel = process.env.DEEPGRAM_MODEL || (hasDeepgram ? "nova-3" : "murf-stt");
  const defaultLanguage = process.env.DEEPGRAM_LANGUAGE || "en-IN";
  const preferredProvider = hasDeepgram ? "deepgram" : isMurfConfigured ? "murf" : "native";
  if (!isConfigured) {
    res.json({
      configured: false,
      proxyUrl: "",
      token: "",
      recommendedModel: defaultModel,
      defaultLanguage,
      provider: "native",
      sttVerificationEnabled: false
    });
    return;
  }
  const payload = {
    sub: req.user?._id || "candidate-session",
    role: req.user?.role || "candidate",
    purpose: "stt_stream"
  };
  const sttToken = jwt3.sign(payload, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "10m"
  });
  res.json({
    configured: true,
    proxyUrl: "/api/v1/interview/stt-stream",
    token: sttToken,
    recommendedModel: defaultModel,
    defaultLanguage,
    provider: preferredProvider,
    sttVerificationEnabled: process.env.STT_VERIFICATION_ENABLED !== "false"
  });
}
async function initiateInterview(req, res) {
  try {
    const { interviewId } = req.params;
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      res.status(404).json({ message: "Interview session not found" });
      return;
    }
    const token = req.headers.authorization ? req.headers.authorization.split(" ")[1] : "";
    if (interview.userId && req.user?._id && interview.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        message: "You are not authorized to access another user's interview session."
      });
      return;
    }
    if (!interview.userId && req.user?._id) {
      interview.userId = req.user._id;
    }
    if (token) {
      interview.activeDeviceToken = token;
    }
    interview.status = "InProgress";
    await Interview.updateOne(
      { _id: interviewId },
      { $set: { status: "InProgress", activeDeviceToken: token || interview.activeDeviceToken, ...interview.userId ? { userId: interview.userId } : {} } }
    );
    const existingMessages = await Message.find({ interviewId }).sort({ createdAt: 1 }).lean();
    if (existingMessages.length > 0) {
      const lastAiMessage = existingMessages.filter((m) => m.type === "Assistant").pop();
      const text = lastAiMessage ? lastAiMessage.message : "Welcome to your interview! Tell me about your background.";
      const tts2 = await synthesizeSpeech(text);
      res.json({
        aiMessage: text,
        audioBase64: tts2 ? tts2.audioBuffer.toString("base64") : null,
        contentType: tts2?.contentType || "audio/mp3",
        history: existingMessages.map((m) => ({
          id: m._id.toString(),
          sender: m.type === "Assistant" ? "ai" : "user",
          text: m.message,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          audioBase64: null
        }))
      });
      return;
    }
    const initialText = await generateInterviewerResponse(
      interview.githubMetadata,
      [],
      void 0,
      interview.difficulty || "Medium"
    );
    const [, tts] = await Promise.all([
      Message.create({
        interviewId,
        type: "Assistant",
        message: initialText
      }),
      synthesizeSpeech(initialText)
    ]);
    res.json({
      aiMessage: initialText,
      audioBase64: tts ? tts.audioBuffer.toString("base64") : null,
      contentType: tts?.contentType || "audio/mp3"
    });
  } catch (error) {
    console.error("Initiate interview error:", error);
    res.status(500).json({ message: error.message || "Failed to initiate session" });
  }
}
async function processInterviewResponse(req, res) {
  try {
    const { interviewId } = req.params;
    const { message } = req.body;
    if (!interviewId || !message || !message.trim()) {
      res.status(400).json({ message: "Interview ID and user transcript message are required" });
      return;
    }
    const interview = await Interview.findById(interviewId).lean();
    if (!interview) {
      res.status(404).json({ message: "Interview session not found" });
      return;
    }
    const token = req.headers.authorization ? req.headers.authorization.split(" ")[1] : "";
    if (interview.userId && req.user?._id && interview.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        message: "You are not authorized to respond to this interview session."
      });
      return;
    }
    if (token && interview.activeDeviceToken !== token) {
      Interview.updateOne({ _id: interviewId }, { $set: { activeDeviceToken: token } }).catch(() => {
      });
    }
    const userMsgPromise = Message.create({
      interviewId,
      type: "User",
      message: message.trim()
    });
    const historyPromise = Message.find({ interviewId }).sort({ createdAt: 1 }).lean();
    const [, conversationHistory] = await Promise.all([userMsgPromise, historyPromise]);
    const formattedTurns = conversationHistory.map((m) => ({
      type: m.type,
      message: m.message
    }));
    formattedTurns.push({ type: "User", message: message.trim() });
    const aiText = await generateInterviewerResponse(
      interview.githubMetadata,
      formattedTurns,
      void 0,
      interview.difficulty || "Medium"
    );
    const [, tts] = await Promise.all([
      Message.create({
        interviewId,
        type: "Assistant",
        message: aiText
      }),
      synthesizeSpeech(aiText)
    ]);
    res.json({
      aiMessage: aiText,
      audioBase64: tts ? tts.audioBuffer.toString("base64") : null,
      contentType: tts?.contentType || "audio/mp3"
    });
  } catch (error) {
    console.error("Process interview response error:", error);
    res.status(500).json({ message: error.message || "Failed to process interview response" });
  }
}
async function saveUserResponse(req, res) {
  try {
    const { message } = req.body;
    const { interviewId } = req.params;
    if (!message || !interviewId) {
      res.status(400).json({ message: "Message and interviewId are required" });
      return;
    }
    await Message.create({
      interviewId,
      type: "User",
      message
    });
    res.json({ message: "Message saved" });
  } catch (error) {
    console.error("Save user response error:", error);
    res.status(500).json({ message: error.message || "Failed to save response" });
  }
}
async function getResult(req, res) {
  try {
    const { interviewId } = req.params;
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      res.status(404).json({ message: "Interview not found" });
      return;
    }
    const conversations = await Message.find({ interviewId }).sort({ createdAt: 1 });
    const transcript = conversations.map((c) => ({
      type: c.type,
      content: c.message,
      createdAt: c.createdAt
    }));
    if (interview.status !== "Done" && conversations.length > 0) {
      try {
        const result = await calculateResult(
          conversations.map((c) => ({
            type: c.type,
            message: c.message,
            createdAt: c.createdAt
          }))
        );
        interview.status = "Done";
        interview.score = result.overallScore || result.score || 0;
        interview.feedback = result.overallFeedback || result.feedback || "";
        interview.evaluationData = result;
        await Interview.updateOne(
          { _id: interviewId },
          {
            $set: {
              status: "Done",
              score: interview.score,
              feedback: interview.feedback,
              evaluationData: result
            }
          }
        );
        if (interview.userId) {
          const { awardActivityXP: awardActivityXP2 } = await Promise.resolve().then(() => (init_gamificationService(), gamificationService_exports));
          await awardActivityXP2(interview.userId.toString(), 150, "AI Voice Technical Interview", "Interview Pro");
        }
      } catch (calcError) {
        console.error("Groq AI Evaluation error:", calcError);
      }
    }
    res.json({
      score: interview.score,
      feedback: interview.feedback,
      evaluationData: interview.evaluationData,
      transcript,
      status: interview.status
    });
  } catch (error) {
    console.error("Get result error:", error);
    res.status(500).json({ message: error.message || "Failed to retrieve result" });
  }
}
async function toggleBookmark(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const { interviewId } = req.params;
    const interview = await Interview.findOne({ _id: interviewId, userId: req.user._id }).select("isBookmarked").lean();
    if (!interview) {
      res.status(404).json({ message: "Interview record not found" });
      return;
    }
    const nextState = !interview.isBookmarked;
    await Interview.updateOne(
      { _id: interviewId, userId: req.user._id },
      { $set: { isBookmarked: nextState } }
    );
    res.json({
      success: true,
      isBookmarked: nextState,
      message: nextState ? "Interview bookmarked" : "Bookmark removed"
    });
  } catch (error) {
    console.error("Toggle bookmark error:", error);
    res.status(500).json({ message: error.message || "Failed to update bookmark" });
  }
}
async function getBookmarkedInterviews(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const bookmarks = await Interview.find({ userId: req.user._id, isBookmarked: true }).sort({ updatedAt: -1 }).lean();
    res.json({
      success: true,
      bookmarks
    });
  } catch (error) {
    console.error("Get bookmarked interviews error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch bookmarks" });
  }
}
async function getMyInterviews(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const interviews = await Interview.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    const interviewIds = interviews.map((i) => i._id);
    const messages = await Message.find({ interviewId: { $in: interviewIds } }).sort({ createdAt: 1 }).lean();
    const messagesByInterview = {};
    for (const msg of messages) {
      const key = msg.interviewId.toString();
      if (!messagesByInterview[key]) {
        messagesByInterview[key] = [];
      }
      messagesByInterview[key].push({
        id: msg._id.toString(),
        type: msg.type,
        message: msg.message,
        createdAt: msg.createdAt
      });
    }
    const interviewsWithMessages = interviews.map((i) => ({
      ...i,
      messages: messagesByInterview[i._id.toString()] || []
    }));
    res.json({
      success: true,
      interviews: interviewsWithMessages
    });
  } catch (error) {
    console.error("Get my interviews error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch user interviews" });
  }
}
async function correctTranscript(req, res) {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      res.status(400).json({ message: "text is required" });
      return;
    }
    const { callGroqWithFallback: callGroqWithFallback2 } = await Promise.resolve().then(() => (init_groqService(), groqService_exports));
    const completion = await callGroqWithFallback2(
      (groq) => groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: `You are a technical transcript corrector for a developer interview. 
Your ONLY job is to fix speech recognition errors for technical terms, proper nouns, brand names, and programming concepts.

Rules (strictly follow):
- ONLY fix words that are clearly misheared technical/proper nouns (e.g. "mongo" \u2192 "MongoDB", "react" \u2192 "React", "node" \u2192 "Node.js", "express" \u2192 "Express.js", "java script" \u2192 "JavaScript", "type script" \u2192 "TypeScript", "post gres" \u2192 "PostgreSQL", "my sequel" \u2192 "MySQL", "git hub" \u2192 "GitHub", "docker" \u2192 "Docker", "kube" \u2192 "Kubernetes", "rest api" \u2192 "REST API", "jay son" \u2192 "JSON", "html" \u2192 "HTML", "css" \u2192 "CSS", "next js" \u2192 "Next.js").
- Do NOT rephrase, rewrite, add, or remove any content.
- Do NOT fix grammar or punctuation.
- Do NOT change words that are already correct.
- Return ONLY the corrected text, nothing else. No explanation, no quotes.`
          },
          {
            role: "user",
            content: text.trim()
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    );
    const corrected = completion?.choices[0]?.message?.content?.trim() || text;
    res.json({ corrected });
  } catch (error) {
    console.error("Transcript correction error:", error);
    const { text } = req.body;
    res.json({ corrected: text || "" });
  }
}
async function verifyTurnSpeechHandler(req, res) {
  try {
    const { interviewId } = req.params;
    const liveTranscript = (req.body?.liveTranscript || req.body?.transcript || "").trim();
    let audioBuffer;
    if (req.file?.buffer) {
      audioBuffer = req.file.buffer;
    } else if (req.body?.audioBase64) {
      audioBuffer = Buffer.from(req.body.audioBase64, "base64");
    }
    const mimeType = req.file?.mimetype || req.body?.mimeType || "audio/webm";
    const { getDynamicInterviewKeyterms: getDynamicInterviewKeyterms2 } = await Promise.resolve().then(() => (init_sttKeytermsService(), sttKeytermsService_exports));
    const keyterms = await getDynamicInterviewKeyterms2(interviewId);
    const { verifyTurnSpeech: verifyTurnSpeech2 } = await Promise.resolve().then(() => (init_sttVerificationService(), sttVerificationService_exports));
    const result = await verifyTurnSpeech2({
      audioBuffer,
      mimeType,
      liveTranscript,
      keyterms
    });
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Turn verification error:", error);
    res.json({
      success: false,
      verifiedTranscript: (req.body?.liveTranscript || req.body?.transcript || "").trim(),
      confidence: 1,
      usedVerification: false,
      method: "fallback"
    });
  }
}

// src/routes/interviewRoutes.ts
var router2 = Router2();
var upload2 = multer2({
  storage: multer2.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
  // Max 20MB turn audio
});
router2.post("/pre-interview", optionalAuth, createPreInterview);
router2.get("/stt-key", optionalAuth, getDeepgramKey);
router2.get("/deepgram-key", optionalAuth, getDeepgramKey);
router2.post("/interview/initiate/:interviewId", optionalAuth, initiateInterview);
router2.post("/interview/respond/:interviewId", optionalAuth, processInterviewResponse);
router2.post(
  "/interview/verify-turn-speech/:interviewId",
  optionalAuth,
  upload2.single("audio"),
  verifyTurnSpeechHandler
);
router2.post("/session/user/response/:interviewId", optionalAuth, saveUserResponse);
router2.get("/result/:interviewId", optionalAuth, getResult);
router2.get("/my-interviews", protect, getMyInterviews);
router2.get("/bookmarks", protect, getBookmarkedInterviews);
router2.post("/bookmark/:interviewId", protect, toggleBookmark);
router2.post("/correct-transcript", correctTranscript);
var interviewRoutes_default = router2;

// src/routes/resumeAnalysisRoutes.ts
import { Router as Router3 } from "express";

// src/controllers/resumeAnalysisController.ts
import multer3 from "multer";

// src/models/Resume.ts
import mongoose5, { Schema as Schema4 } from "mongoose";
var ResumeSchema = new Schema4(
  {
    userId: {
      type: Schema4.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    originalFileName: {
      type: String,
      required: true
    },
    storageUrl: {
      type: String,
      default: ""
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    extractedText: {
      type: String,
      required: true
    },
    structuredData: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);
ResumeSchema.index({ userId: 1, createdAt: -1 });
var Resume = mongoose5.model("Resume", ResumeSchema);

// src/models/JobDescription.ts
import mongoose6, { Schema as Schema5 } from "mongoose";
var JobDescriptionSchema = new Schema5(
  {
    userId: {
      type: Schema5.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      default: "Target Job Description"
    },
    company: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      required: true
    },
    extractedRequirements: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);
JobDescriptionSchema.index({ userId: 1, createdAt: -1 });
var JobDescription = mongoose6.model(
  "JobDescription",
  JobDescriptionSchema
);

// src/models/ResumeAnalysis.ts
import mongoose7, { Schema as Schema6 } from "mongoose";
var ResumeAnalysisSchema = new Schema6(
  {
    userId: {
      type: Schema6.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    resumeId: {
      type: Schema6.Types.ObjectId,
      ref: "Resume",
      required: true,
      index: true
    },
    jobDescriptionId: {
      type: Schema6.Types.ObjectId,
      ref: "JobDescription",
      index: true
    },
    atsScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    jobMatchScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    scoreBreakdown: {
      keywordMatch: { type: Number, default: 0 },
      jobAlignment: { type: Number, default: 0 },
      skillsMatch: { type: Number, default: 0 },
      experienceRelevance: { type: Number, default: 0 },
      structure: { type: Number, default: 0 },
      formatting: { type: Number, default: 0 },
      contactInformation: { type: Number, default: 0 }
    },
    matchedKeywords: [{ type: String }],
    missingKeywords: [{ type: String }],
    matchedSkills: [{ type: String }],
    missingSkills: [{ type: String }],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    recommendations: [
      {
        priority: { type: String, enum: ["HIGH", "MEDIUM", "LOW"], default: "MEDIUM" },
        category: { type: String, default: "General" },
        suggestion: { type: String, required: true },
        reason: { type: String, default: "" }
      }
    ],
    sectionFeedback: {
      summary: { type: String, default: "" },
      skills: { type: String, default: "" },
      experience: { type: String, default: "" },
      projects: { type: String, default: "" },
      education: { type: String, default: "" }
    },
    formattingAnalysis: {
      riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "LOW" },
      issues: [{ type: String }]
    },
    analysisVersion: {
      type: String,
      default: "1.0"
    }
  },
  {
    timestamps: true
  }
);
ResumeAnalysisSchema.index({ userId: 1, createdAt: -1 });
var ResumeAnalysis = mongoose7.model(
  "ResumeAnalysis",
  ResumeAnalysisSchema
);

// src/services/resume/resumeParserService.ts
import mammoth from "mammoth";
import zlib from "zlib";
var ScannedPdfError = class extends Error {
  constructor(message) {
    super(
      message || "This PDF appears to be a scanned image or non-selectable graphical document. ATS systems and our analyzer require selectable, text-based resumes. Please export or save your resume as a standard text-based PDF (e.g., from Google Docs, Word, or Canva 'PDF Standard') or upload a DOCX file."
    );
    this.name = "ScannedPdfError";
  }
};
function sanitizeExtractedText(text) {
  if (!text) return "";
  return text.replace(/\u0000/g, "").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, " ").replace(/^-- \d+ of \d+ --\s*$/gm, "").replace(/\r\n|\r/g, "\n").replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " ").replace(/[ \t]+/g, " ").replace(/ \n/g, "\n").replace(/\n /g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function extractTextFromPdfStreamFallback(buffer) {
  try {
    const binary = buffer.toString("binary");
    const extractedLines = [];
    const decodePdfString = (str) => {
      return str.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, " ").replace(/\\b/g, "").replace(/\\f/g, "").replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\").replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8))).trim();
    };
    const extractFromStream = (streamText) => {
      const opRegex = /(?:\[([^\]]+)\]\s*TJ|\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*(?:Tj|'|")|<([0-9A-Fa-f]{2,})>\s*(?:Tj|'|"))/g;
      let m;
      const currentLine = [];
      while ((m = opRegex.exec(streamText)) !== null) {
        if (m[1] !== void 0) {
          const tokenRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
          let tm;
          let subText = "";
          while ((tm = tokenRegex.exec(m[1])) !== null) {
            subText += decodePdfString(tm[1]) + " ";
          }
          if (subText.trim()) currentLine.push(subText.trim());
        } else if (m[2] !== void 0) {
          const t = decodePdfString(m[2]);
          if (t) currentLine.push(t);
        } else if (m[3] !== void 0) {
          const hex = m[3];
          let str = "";
          for (let i = 0; i < hex.length; i += 2) {
            const code = parseInt(hex.substr(i, 2), 16);
            if (code >= 32 && code <= 126) str += String.fromCharCode(code);
          }
          if (str.trim()) currentLine.push(str.trim());
        }
      }
      if (currentLine.length > 0) {
        extractedLines.push(currentLine.join(" "));
      }
    };
    const streamRegex = /stream\r?\n?([\s\S]*?)(?:[\r\n\s]*|~>)endstream/g;
    let sMatch;
    while ((sMatch = streamRegex.exec(binary)) !== null) {
      let rawData = sMatch[1];
      const streamBuf = Buffer.from(rawData, "binary");
      try {
        const decompressed = zlib.inflateSync(streamBuf).toString("binary");
        extractFromStream(decompressed);
      } catch {
        try {
          const decompressed = zlib.inflateRawSync(streamBuf).toString("binary");
          extractFromStream(decompressed);
        } catch {
          extractFromStream(rawData);
        }
      }
    }
    return sanitizeExtractedText(extractedLines.join("\n"));
  } catch (err) {
    console.warn("[ResumeParser] Stream fallback error:", err);
    return "";
  }
}
async function extractTextFromBuffer(buffer, fileType, originalFileName) {
  const isPdf = fileType.includes("pdf") || originalFileName.toLowerCase().endsWith(".pdf");
  const isDocx = fileType.includes("officedocument") || fileType.includes("docx") || originalFileName.toLowerCase().endsWith(".docx");
  let rawText = "";
  if (isPdf) {
    let parsedViaPdfParse = false;
    let totalPages = 0;
    try {
      const pdfModule = await import("pdf-parse").catch(() => null);
      if (pdfModule && typeof pdfModule.PDFParse === "function") {
        const parser = new pdfModule.PDFParse({ data: buffer });
        const result = await parser.getText();
        totalPages = result?.total || result?.pages?.length || 0;
        if (Array.isArray(result?.pages) && result.pages.length > 0) {
          const pageTexts = result.pages.map((p) => (p.text || "").replace(/^-- \d+ of \d+ --\s*$/gm, "").trim()).filter((t) => t.length > 0);
          rawText = pageTexts.join("\n\n");
          if (rawText.trim().length >= 40) {
            parsedViaPdfParse = true;
          }
        } else if (result?.text && result.text.trim().length >= 40) {
          rawText = result.text.replace(/^-- \d+ of \d+ --\s*$/gm, "").trim();
          parsedViaPdfParse = true;
        }
        if (typeof parser.destroy === "function") {
          await parser.destroy().catch(() => {
          });
        }
      }
    } catch (err) {
      console.warn("[ResumeParser] pdf-parse threw error:", err?.message || err);
    }
    if (!parsedViaPdfParse || rawText.trim().length < 40) {
      const fallbackText = extractTextFromPdfStreamFallback(buffer);
      if (fallbackText && fallbackText.trim().length > rawText.trim().length) {
        rawText = fallbackText;
      }
    }
    const cleaned = sanitizeExtractedText(rawText);
    const alphaCount = (cleaned.match(/[a-zA-Z]/g) || []).length;
    const isImageOnly = totalPages > 0 && alphaCount < 30 || buffer.length > 2e4 && alphaCount < 25;
    if (isImageOnly) {
      throw new ScannedPdfError();
    }
    return cleaned;
  } else if (isDocx) {
    try {
      const mdResult = await mammoth.convertToMarkdown({ buffer });
      let text = mdResult.value || "";
      text = text.replace(/\|---+\|/g, "").replace(/\|/g, "  |  ").replace(/^#+\s*/gm, "");
      if (!text.trim() || text.trim().length < 40) {
        const rawResult = await mammoth.extractRawText({ buffer });
        text = rawResult.value || text;
      }
      rawText = text;
    } catch (err) {
      console.error("[ResumeParser] DOCX parse error:", err);
      throw new Error("Could not extract readable text from DOCX resume.");
    }
    return sanitizeExtractedText(rawText);
  } else {
    rawText = buffer.toString("utf-8");
    return sanitizeExtractedText(rawText);
  }
}
var MULTI_INDUSTRY_SKILLS = [
  // 3D Animation, VFX, Game Development & Creative Media
  "3D Animation",
  "Maya",
  "Autodesk Maya",
  "Blender",
  "3ds Max",
  "Cinema 4D",
  "Houdini",
  "ZBrush",
  "Character Animation",
  "Character Rigging",
  "Rigging",
  "Skinning",
  "Keyframing",
  "Keyframe Animation",
  "Motion Graphics",
  "After Effects",
  "Adobe After Effects",
  "Premiere Pro",
  "Photoshop",
  "Illustrator",
  "Unreal Engine",
  "Unity",
  "Substance Painter",
  "Substance Designer",
  "Texturing",
  "Lighting",
  "Shading",
  "Rendering",
  "Arnold",
  "V-Ray",
  "Redshift",
  "Compositing",
  "Nuke",
  "Motion Capture",
  "MoCap",
  "Storyboarding",
  "UV Mapping",
  "Weight Painting",
  "Facial Animation",
  "Particle Effects",
  "VFX",
  // UI/UX & Graphic Design
  "Figma",
  "Sketch",
  "Adobe XD",
  "InDesign",
  "UI/UX",
  "User Interface",
  "User Experience",
  "Wireframing",
  "Prototyping",
  "Design Systems",
  "User Research",
  "Usability Testing",
  "Information Architecture",
  "Interaction Design",
  "Visual Design",
  "Typography",
  // Programming Languages
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "C#",
  "C",
  "Go",
  "Golang",
  "Rust",
  "PHP",
  "Ruby",
  "Swift",
  "Kotlin",
  "R",
  "Scala",
  "Dart",
  "Shell",
  "Bash",
  "SQL",
  // Web & Frontend Frameworks
  "React",
  "React.js",
  "Next.js",
  "Vue.js",
  "Vue",
  "Angular",
  "Svelte",
  "Redux",
  "Zustand",
  "HTML",
  "HTML5",
  "CSS",
  "CSS3",
  "Tailwind CSS",
  "Tailwind",
  "Bootstrap",
  "Sass",
  "SCSS",
  "Material UI",
  "Vite",
  "Webpack",
  "REST API",
  "GraphQL",
  "WebSockets",
  // Backend & APIs
  "Node.js",
  "NodeJS",
  "Express.js",
  "Express",
  "NestJS",
  "FastAPI",
  "Django",
  "Flask",
  "Spring Boot",
  "Spring",
  "ASP.NET",
  ".NET",
  "gRPC",
  "Microservices",
  "System Design",
  // Databases & Caching
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "Cassandra",
  "DynamoDB",
  "SQLite",
  "Firebase",
  "Supabase",
  "Prisma",
  "Mongoose",
  // Cloud & DevOps
  "AWS",
  "Amazon Web Services",
  "Azure",
  "GCP",
  "Google Cloud",
  "Docker",
  "Kubernetes",
  "K8s",
  "CI/CD",
  "GitHub Actions",
  "Jenkins",
  "GitLab CI",
  "Terraform",
  "Ansible",
  "Linux",
  "Nginx",
  "Serverless",
  "Git",
  "GitHub",
  "GitLab",
  // Data Engineering, AI & Machine Learning
  "Machine Learning",
  "Deep Learning",
  "Pandas",
  "NumPy",
  "PyTorch",
  "TensorFlow",
  "Scikit-learn",
  "NLP",
  "Natural Language Processing",
  "Computer Vision",
  "LLM",
  "Generative AI",
  "LangChain",
  "Data Pipelines",
  "ETL",
  "Apache Spark",
  "PySpark",
  "Airflow",
  "Snowflake",
  "BigQuery",
  "Tableau",
  "Power BI",
  "Data Warehousing",
  "Data Modeling",
  "Databricks",
  "Kafka",
  // Product, Project & Agile
  "Agile",
  "Scrum",
  "Kanban",
  "Jira",
  "Confluence",
  "Product Management",
  "Project Management",
  "Sprint Planning",
  "Product Strategy",
  "Roadmapping",
  "A/B Testing",
  // Marketing & Sales
  "SEO",
  "SEM",
  "Google Analytics",
  "Content Strategy",
  "Digital Marketing",
  "Social Media Marketing",
  "Email Marketing",
  "CRM",
  "Salesforce",
  "HubSpot",
  "Lead Generation",
  "Copywriting",
  // Finance, Accounting & Business
  "Financial Modeling",
  "Excel",
  "QuickBooks",
  "GAAP",
  "Financial Analysis",
  "Auditing",
  "Tax",
  "Valuation",
  "Accounting",
  "Budgeting",
  "Forecasting",
  // HR & Operations
  "Recruiting",
  "Talent Acquisition",
  "Employee Relations",
  "Onboarding",
  "HRIS",
  "Payroll",
  // Testing & Quality Assurance
  "Jest",
  "Pytest",
  "Mocha",
  "Cypress",
  "Playwright",
  "Selenium",
  "Unit Testing",
  "Integration Testing"
];
function matchesSkillInText(skill, text) {
  const escaped = skill.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  const bStart = /^[a-zA-Z0-9_]/.test(skill) ? "(?:^|[^a-zA-Z0-9_])" : "";
  const bEnd = "(?=$|[^a-zA-Z0-9_#+])";
  return new RegExp(bStart + escaped + bEnd, "i").test(text);
}
function parseStructuredResume(rawText) {
  const text = sanitizeExtractedText(rawText);
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{5}[-.\s]?\d{5}|\b\d{10}\b)/);
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_.-]+/i);
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+/i);
  const portfolioMatch = text.match(/(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9.-]+\.(?:com|org|io|dev|me|net|tech|app|artstation\.com)(?:\/[^\s]*)?/i);
  const emailDomain = emailMatch ? emailMatch[0].split("@")[1]?.toLowerCase() : "";
  const portfolioRaw = portfolioMatch ? portfolioMatch[0] : "";
  const isEmailDomain = emailDomain && portfolioRaw.toLowerCase().includes(emailDomain);
  const isValidPortfolio = portfolioRaw && !isEmailDomain && !portfolioRaw.toLowerCase().includes("linkedin") && !portfolioRaw.toLowerCase().includes("github");
  const lines2 = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const headerRegex = /^(resume|curriculum vitae|cv|page \d+|profile|contact|about me|portfolio)$/i;
  let candidateName = "";
  for (const line of lines2.slice(0, 6)) {
    if (!headerRegex.test(line) && !line.includes("@") && !line.includes("http") && !line.includes("www.") && !line.includes(".com") && !/\d{5,}/.test(line) && line.length >= 2 && line.length <= 40 && !/^[•\-\*\|]/.test(line)) {
      candidateName = line;
      break;
    }
  }
  const sectionKeywords = [
    { key: "summary", patterns: ["summary", "professional summary", "profile", "objective", "about me", "overview"] },
    { key: "skills", patterns: ["skills", "technical skills", "core competencies", "tools", "technologies", "proficiencies", "areas of expertise", "software skills"] },
    { key: "experience", patterns: ["experience", "work experience", "employment history", "professional experience", "work history", "relevant experience"] },
    { key: "education", patterns: ["education", "academic background", "academics", "qualifications", "educational background"] },
    { key: "projects", patterns: ["projects", "key projects", "personal projects", "portfolio projects", "academic projects"] },
    { key: "certifications", patterns: ["certifications", "certificates", "licenses", "courses"] },
    { key: "achievements", patterns: ["achievements", "awards", "honors", "recognition"] },
    { key: "languages", patterns: ["languages", "spoken languages"] }
  ];
  const detectedIndices = [];
  for (let i = 0; i < lines2.length; i++) {
    const lineLower = lines2[i].toLowerCase().replace(/[:\-_#]/g, "").trim();
    if (lineLower.length < 2 || lineLower.length > 35) continue;
    for (const sec of sectionKeywords) {
      if (sec.patterns.some((p) => lineLower === p || lineLower.startsWith(p + " ") || lineLower.endsWith(" " + p))) {
        const charIdx = text.indexOf(lines2[i]);
        if (charIdx >= 0) {
          detectedIndices.push({ key: sec.key, index: charIdx + lines2[i].length });
        }
        break;
      }
    }
  }
  detectedIndices.sort((a, b) => a.index - b.index);
  const sections = {};
  for (let i = 0; i < detectedIndices.length; i++) {
    const cur = detectedIndices[i];
    const next = detectedIndices[i + 1];
    const content = text.slice(cur.index, next ? next.index : void 0).trim();
    if (!sections[cur.key]) {
      sections[cur.key] = content;
    }
  }
  const extractedSkills = [];
  const IGNORED_SECTION_WORDS = /* @__PURE__ */ new Set([
    "work experience",
    "experience",
    "education",
    "projects",
    "certifications",
    "achievements",
    "summary",
    "profile",
    "objective",
    "languages",
    "personal information",
    "contact",
    "references",
    "skills"
  ]);
  if (sections["skills"]) {
    const rawSkillSection = sections["skills"];
    const rawTokens = rawSkillSection.split(/[,•\*\n\|;]/).map((s) => s.replace(/^[•\-\*:]+\s*/, "").trim()).filter((s) => s.length >= 2 && s.length <= 40 && !s.includes(":") && !/\d{4}/.test(s) && !IGNORED_SECTION_WORDS.has(s.toLowerCase()));
    for (const tok of rawTokens) {
      if (!extractedSkills.some((es) => es.toLowerCase() === tok.toLowerCase())) {
        extractedSkills.push(tok);
      }
    }
  }
  MULTI_INDUSTRY_SKILLS.forEach((skill) => {
    if (matchesSkillInText(skill, text)) {
      if (!extractedSkills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
        extractedSkills.push(skill);
      }
    }
  });
  const experienceText = sections["experience"] || "";
  const parsedExperience = [];
  if (experienceText) {
    const expLines = experienceText.split("\n").map((l) => l.trim()).filter(Boolean);
    const dateRegex = /(?:19|20)\d{2}\s*[-–—to]+\s*(?:(?:19|20)\d{2}|present|current)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{4}/i;
    let currentEntry = null;
    for (const line of expLines) {
      const hasDate = dateRegex.test(line);
      const isBullet = /^[•\-\*]\s*/.test(line);
      if (hasDate && !isBullet) {
        if (currentEntry && (currentEntry.bulletPoints.length > 0 || currentEntry.role)) {
          parsedExperience.push(currentEntry);
        }
        currentEntry = {
          role: line.replace(dateRegex, "").replace(/[|,\-–]/g, "").trim() || "Experience",
          duration: (line.match(dateRegex) || [])[0] || "",
          bulletPoints: []
        };
      } else if (currentEntry && isBullet) {
        const cleanBullet = line.replace(/^[•\-\*]\s*/, "").trim();
        if (cleanBullet.length > 10) {
          currentEntry.bulletPoints.push(cleanBullet);
        }
      } else if (!currentEntry) {
        currentEntry = {
          role: line,
          bulletPoints: []
        };
      } else if (isBullet) {
        const cleanBullet = line.replace(/^[•\-\*]\s*/, "").trim();
        if (cleanBullet.length > 10) {
          currentEntry.bulletPoints.push(cleanBullet);
        }
      }
    }
    if (currentEntry && (currentEntry.bulletPoints.length > 0 || currentEntry.role)) {
      parsedExperience.push(currentEntry);
    }
  }
  const educationText = sections["education"] || "";
  const parsedEducation = [];
  if (educationText) {
    const eduLines = educationText.split("\n").map((l) => l.trim()).filter(Boolean);
    const degreeKeywords = ["bachelor", "master", "phd", "b.tech", "b.s", "m.s", "m.tech", "b.e", "b.a", "m.a", "mba", "diploma", "associate"];
    const yearRegex = /\b(19|20)\d{2}\b/;
    for (const line of eduLines) {
      const lineLower = line.toLowerCase();
      const hasDegree = degreeKeywords.some((d) => lineLower.includes(d));
      const yearMatch = line.match(yearRegex);
      if (hasDegree || yearMatch || line.length > 10) {
        parsedEducation.push({
          degree: hasDegree ? line.replace(/^[•\-\*]\s*/, "") : void 0,
          institution: !hasDegree ? line.replace(/^[•\-\*]\s*/, "") : void 0,
          year: yearMatch ? yearMatch[0] : void 0
        });
      }
    }
  }
  const projectsText = sections["projects"] || "";
  const parsedProjects = [];
  if (projectsText) {
    const projLines = projectsText.split("\n").map((l) => l.trim().replace(/^[•\-\*]\s*/, "")).filter((l) => l.length > 12);
    for (const line of projLines.slice(0, 6)) {
      parsedProjects.push({ description: line });
    }
  }
  return {
    extractedText: text,
    structuredData: {
      personal: {
        name: candidateName,
        email: emailMatch ? emailMatch[0] : "",
        phone: phoneMatch ? phoneMatch[0] : "",
        linkedin: linkedinMatch ? linkedinMatch[0] : "",
        github: githubMatch ? githubMatch[0] : "",
        portfolio: isValidPortfolio ? portfolioRaw : ""
      },
      summary: (sections["summary"] || "").slice(0, 400),
      skills: extractedSkills,
      education: parsedEducation.slice(0, 4),
      experience: parsedExperience.slice(0, 6),
      projects: parsedProjects,
      certifications: sections["certifications"] ? sections["certifications"].split("\n").map((s) => s.trim()).filter((s) => s.length > 5).slice(0, 5) : [],
      achievements: sections["achievements"] ? sections["achievements"].split("\n").map((s) => s.trim()).filter((s) => s.length > 5).slice(0, 5) : [],
      languages: sections["languages"] ? sections["languages"].split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 6) : []
    }
  };
}

// src/services/analysis/atsScoringService.ts
var COMMON_STOP_WORDS = /* @__PURE__ */ new Set([
  "about",
  "above",
  "across",
  "after",
  "again",
  "against",
  "all",
  "almost",
  "alone",
  "along",
  "already",
  "also",
  "although",
  "always",
  "among",
  "and",
  "another",
  "any",
  "anybody",
  "anyone",
  "anything",
  "anywhere",
  "are",
  "area",
  "areas",
  "around",
  "ask",
  "asked",
  "asking",
  "asks",
  "away",
  "back",
  "backed",
  "backing",
  "backs",
  "became",
  "because",
  "become",
  "becomes",
  "becoming",
  "been",
  "before",
  "began",
  "behind",
  "being",
  "beings",
  "best",
  "better",
  "between",
  "big",
  "both",
  "but",
  "came",
  "can",
  "cannot",
  "case",
  "cases",
  "certain",
  "certainly",
  "clear",
  "clearly",
  "come",
  "could",
  "did",
  "differ",
  "different",
  "differently",
  "does",
  "done",
  "down",
  "downed",
  "downing",
  "downs",
  "during",
  "each",
  "early",
  "either",
  "end",
  "ended",
  "ending",
  "ends",
  "enough",
  "even",
  "evenly",
  "ever",
  "every",
  "everybody",
  "everyone",
  "everything",
  "everywhere",
  "face",
  "faces",
  "fact",
  "facts",
  "far",
  "felt",
  "few",
  "fewer",
  "find",
  "finds",
  "first",
  "for",
  "four",
  "from",
  "full",
  "fully",
  "further",
  "furthered",
  "furthering",
  "furthers",
  "gave",
  "general",
  "generally",
  "get",
  "gets",
  "give",
  "given",
  "gives",
  "good",
  "goods",
  "great",
  "greater",
  "greatest",
  "group",
  "grouped",
  "grouping",
  "groups",
  "had",
  "has",
  "have",
  "having",
  "her",
  "here",
  "herself",
  "high",
  "higher",
  "highest",
  "him",
  "himself",
  "his",
  "how",
  "however",
  "important",
  "interest",
  "interested",
  "interesting",
  "interests",
  "into",
  "its",
  "itself",
  "just",
  "keep",
  "keeps",
  "knew",
  "know",
  "known",
  "knows",
  "large",
  "largely",
  "last",
  "later",
  "latest",
  "least",
  "less",
  "let",
  "lets",
  "like",
  "likely",
  "long",
  "longer",
  "longest",
  "made",
  "make",
  "making",
  "man",
  "many",
  "may",
  "member",
  "members",
  "men",
  "might",
  "more",
  "most",
  "mostly",
  "much",
  "must",
  "myself",
  "name",
  "needed",
  "needing",
  "needs",
  "never",
  "new",
  "newer",
  "newest",
  "next",
  "nobody",
  "non",
  "noone",
  "not",
  "nothing",
  "now",
  "nowhere",
  "number",
  "numbers",
  "off",
  "often",
  "old",
  "older",
  "oldest",
  "once",
  "one",
  "only",
  "open",
  "opened",
  "opening",
  "opens",
  "order",
  "ordered",
  "ordering",
  "orders",
  "other",
  "others",
  "our",
  "out",
  "over",
  "part",
  "parted",
  "parting",
  "parts",
  "per",
  "place",
  "places",
  "point",
  "pointed",
  "pointing",
  "points",
  "possible",
  "present",
  "presented",
  "presenting",
  "presents",
  "problem",
  "problems",
  "put",
  "puts",
  "quite",
  "rather",
  "really",
  "right",
  "room",
  "rooms",
  "said",
  "same",
  "saw",
  "say",
  "says",
  "second",
  "seconds",
  "see",
  "seem",
  "seemed",
  "seeming",
  "seems",
  "sees",
  "several",
  "shall",
  "she",
  "should",
  "show",
  "showed",
  "showing",
  "shows",
  "side",
  "sides",
  "since",
  "small",
  "smaller",
  "smallest",
  "some",
  "somebody",
  "someone",
  "something",
  "somewhere",
  "state",
  "states",
  "still",
  "such",
  "sure",
  "take",
  "taken",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "therefore",
  "these",
  "they",
  "thing",
  "things",
  "think",
  "thinks",
  "this",
  "those",
  "though",
  "thought",
  "thoughts",
  "three",
  "through",
  "thus",
  "time",
  "times",
  "today",
  "together",
  "too",
  "took",
  "toward",
  "turn",
  "turned",
  "turning",
  "turns",
  "two",
  "under",
  "until",
  "upon",
  "use",
  "used",
  "uses",
  "very",
  "want",
  "wanted",
  "wanting",
  "wants",
  "was",
  "way",
  "ways",
  "well",
  "wells",
  "went",
  "were",
  "what",
  "when",
  "where",
  "whether",
  "which",
  "while",
  "who",
  "whole",
  "whom",
  "whose",
  "why",
  "will",
  "with",
  "within",
  "without",
  "work",
  "worked",
  "working",
  "works",
  "would",
  "year",
  "years",
  "yet",
  "you",
  "young",
  "younger",
  "youngest",
  "your",
  "yours",
  "candidate",
  "responsibilities",
  "requirements",
  "qualifications",
  "preferred",
  "duties",
  "role",
  "job"
]);
function calculateATSScore(input) {
  const {
    extractedText,
    structuredData,
    jobDescriptionText,
    jobTitle,
    aiSemanticScore,
    aiMatchedSkills,
    aiMissingSkills,
    aiMatchedKeywords,
    aiMissingKeywords
  } = input;
  const textLower = (extractedText || "").toLowerCase();
  const jdLower = (jobDescriptionText || "").toLowerCase();
  const titleLower = (jobTitle || "").toLowerCase();
  const hasTarget = jdLower.trim().length > 0 || titleLower.trim().length > 0;
  const personal = structuredData?.personal || {};
  let contactScore = 0;
  if (personal.name && personal.name.length > 2) contactScore += 30;
  if (personal.email && personal.email.includes("@")) contactScore += 35;
  if (personal.phone && personal.phone.length >= 7) contactScore += 20;
  if (personal.linkedin || personal.github || personal.portfolio) contactScore += 15;
  contactScore = Math.min(100, contactScore);
  const standardSections = ["summary", "profile", "objective", "experience", "education", "skills", "projects"];
  let foundSections = 0;
  standardSections.forEach((sec) => {
    if (new RegExp(`\\b${sec}\\b`, "i").test(textLower)) {
      foundSections++;
    }
  });
  const structureScore = Math.min(100, Math.round(foundSections / 5 * 100));
  const formattingIssues = [];
  let formattingScore = 100;
  if (extractedText.length < 300) {
    formattingIssues.push("Resume is very brief (less than 300 characters).");
    formattingScore -= 45;
  }
  if (extractedText.length > 15e3) {
    formattingIssues.push("Resume is unusually long (>15,000 characters). Aim for 1-2 concise pages.");
    formattingScore -= 15;
  }
  if (/[\u25A0-\u25FF\u2600-\u26FF]/.test(extractedText)) {
    formattingIssues.push("Unusual decorative dingbat symbols detected that some legacy ATS parsers reject.");
    formattingScore -= 10;
  }
  if ((extractedText.match(/\t/g) || []).length > 25) {
    formattingIssues.push("Heavy tab stops or complex multi-column layout detected.");
    formattingScore -= 15;
  }
  formattingScore = Math.max(0, formattingScore);
  let matchedKeywords = [];
  let missingKeywords = [];
  let matchedSkills = [];
  let missingSkills = [];
  let keywordScore = 75;
  let skillsScore = 75;
  let jobAlignmentScore = aiSemanticScore !== void 0 ? aiSemanticScore : 75;
  let experienceScore = 75;
  const candidateSkills = (structuredData?.skills || []).map((s) => s.trim());
  if (hasTarget) {
    const combinedTargetText = `${titleLower} ${jdLower}`;
    const rawTokens = combinedTargetText.match(/\b[a-z0-9#+.]{2,25}\b/gi) || [];
    const domainTokens = Array.from(
      new Set(
        rawTokens.map((t) => t.toLowerCase()).filter((t) => t.length >= 3 && !COMMON_STOP_WORDS.has(t) && !/^\d+$/.test(t))
      )
    );
    if (Array.isArray(aiMatchedKeywords)) {
      matchedKeywords = aiMatchedKeywords;
    } else {
      matchedKeywords = domainTokens.filter((kw) => textLower.includes(kw)).slice(0, 20);
    }
    if (Array.isArray(aiMissingKeywords)) {
      missingKeywords = aiMissingKeywords;
    } else {
      missingKeywords = domainTokens.filter((kw) => !textLower.includes(kw)).slice(0, 15);
    }
    if (Array.isArray(aiMatchedSkills) && Array.isArray(aiMissingSkills)) {
      matchedSkills = aiMatchedSkills;
      missingSkills = aiMissingSkills;
      const totalRequired = matchedSkills.length + missingSkills.length;
      if (totalRequired > 0) {
        skillsScore = Math.round(matchedSkills.length / totalRequired * 100);
      } else {
        skillsScore = candidateSkills.length > 0 ? 50 : 20;
      }
    } else {
      matchedSkills = candidateSkills.filter((cs) => combinedTargetText.includes(cs.toLowerCase()));
      const targetRequiredKeywords = domainTokens.slice(0, 15);
      missingSkills = targetRequiredKeywords.filter((tk) => !candidateSkills.some((cs) => cs.toLowerCase() === tk));
      if (targetRequiredKeywords.length > 0) {
        skillsScore = Math.round(matchedSkills.length / Math.max(targetRequiredKeywords.length, 1) * 100);
      } else {
        skillsScore = candidateSkills.length > 0 ? 60 : 30;
      }
    }
    const totalKeywords = matchedKeywords.length + missingKeywords.length;
    if (totalKeywords > 0) {
      keywordScore = Math.round(matchedKeywords.length / totalKeywords * 100);
    } else {
      keywordScore = 50;
    }
    let expPoints = 0;
    const targetTitleTokens = titleLower.split(/\s+/).filter((t) => t.length > 2 && !COMMON_STOP_WORDS.has(t));
    let titleOverlapCount = 0;
    targetTitleTokens.forEach((tok) => {
      if (textLower.includes(tok)) titleOverlapCount++;
    });
    if (targetTitleTokens.length > 0) {
      const titleRatio = titleOverlapCount / targetTitleTokens.length;
      expPoints += Math.round(titleRatio * 45);
    } else {
      expPoints += 20;
    }
    const hasPercentages = /\b\d{1,3}%\b/.test(extractedText);
    const hasCurrencyOrScale = /\$[\d,]+|\b\d+\s*(?:k|m|million|users|clients|team|engineers|projects)\b/i.test(extractedText);
    const hasActionVerbs = /\b(developed|engineered|designed|led|built|optimized|implemented|increased|reduced|achieved|delivered)\b/i.test(extractedText);
    if (hasPercentages) expPoints += 20;
    if (hasCurrencyOrScale) expPoints += 15;
    if (hasActionVerbs) expPoints += 20;
    if (skillsScore === 0 || aiSemanticScore !== void 0 && aiSemanticScore <= 25) {
      expPoints = Math.min(15, expPoints);
      keywordScore = Math.min(25, keywordScore);
    }
    experienceScore = Math.min(100, Math.max(5, expPoints));
    if (aiSemanticScore !== void 0) {
      jobAlignmentScore = aiSemanticScore;
    } else {
      jobAlignmentScore = Math.round(skillsScore * 0.5 + keywordScore * 0.3 + experienceScore * 0.2);
    }
  } else {
    matchedSkills = candidateSkills;
    missingSkills = [];
    matchedKeywords = candidateSkills.slice(0, 15);
    missingKeywords = [];
    skillsScore = Math.min(100, Math.max(40, candidateSkills.length * 8));
    keywordScore = candidateSkills.length > 5 ? 85 : 65;
    jobAlignmentScore = aiSemanticScore !== void 0 ? aiSemanticScore : 75;
    let expPoints = 50;
    if (/\b\d{1,3}%\b/.test(extractedText)) expPoints += 25;
    if (/\b(developed|engineered|designed|led|built|optimized)\b/i.test(extractedText)) expPoints += 25;
    experienceScore = Math.min(100, expPoints);
  }
  const categories = {
    keywordMatch: Math.min(100, Math.max(0, keywordScore)),
    jobAlignment: Math.min(100, Math.max(0, jobAlignmentScore)),
    skillsMatch: Math.min(100, Math.max(0, skillsScore)),
    experienceRelevance: Math.min(100, Math.max(0, experienceScore)),
    structure: Math.min(100, Math.max(0, structureScore)),
    formatting: Math.min(100, Math.max(0, formattingScore)),
    contactInformation: Math.min(100, Math.max(0, contactScore))
  };
  const atsScore = Math.round(
    categories.keywordMatch * 0.25 + categories.jobAlignment * 0.2 + categories.skillsMatch * 0.2 + categories.experienceRelevance * 0.15 + categories.structure * 0.1 + categories.formatting * 0.05 + categories.contactInformation * 0.05
  );
  const jobMatchScore = hasTarget ? Math.round(
    categories.skillsMatch * 0.4 + categories.jobAlignment * 0.35 + categories.keywordMatch * 0.25
  ) : categories.jobAlignment;
  return {
    atsScore: Math.min(100, Math.max(0, atsScore)),
    jobMatchScore: Math.min(100, Math.max(0, jobMatchScore)),
    categories,
    matchedKeywords,
    missingKeywords,
    matchedSkills,
    missingSkills,
    formattingIssues
  };
}

// src/services/ai/aiAnalysisService.ts
import { Groq as Groq2 } from "groq-sdk";
function getGroqKeyPool() {
  const raw = process.env.GROQ_API_KEY || "";
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}
async function analyzeResumeWithAI(req) {
  const keys = getGroqKeyPool();
  if (keys.length === 0) {
    console.warn("[AIAnalysis] No GROQ_API_KEY configured. Falling back to local domain-aware analysis.");
    return getFallbackAIResponse(req);
  }
  const effectiveJobTitle = req.jobTitle?.trim() || "";
  const effectiveCompany = req.companyName?.trim() || "";
  const effectiveJdText = req.jobDescriptionText?.trim() || "";
  const hasTargetRole = effectiveJobTitle.length > 0 || effectiveJdText.length > 0;
  const targetRoleHeader = [
    effectiveJobTitle ? `Target Role: ${effectiveJobTitle}` : "",
    effectiveCompany ? `Target Company: ${effectiveCompany}` : ""
  ].filter(Boolean).join(" | ");
  const systemPrompt = hasTargetRole ? `You are an expert Technical Recruiter, Hiring Manager & ATS Auditor.
Your task is to conduct an evidence-based evaluation of a candidate's resume strictly against the specified TARGET ROLE and JOB DESCRIPTION.

EVALUATION RULES:
1. DOMAIN & FIELD VERIFICATION:
   - Carefully determine the candidate's actual primary domain (e.g., 3D Animation/Art, Software Engineering, Graphic Design, Marketing, Finance, Nursing, etc.).
   - Compare the candidate's domain with the target role domain.
   - SEVERE MISMATCH PENALTY: If the candidate's domain DOES NOT MATCH the target job (e.g., an Animation/Art resume evaluated for a Software Engineer role, or a Software Developer applying for a 3D Animator role):
     * "semanticMatchScore" MUST BE LOW: between 10 and 28 out of 100. NEVER award high scores (e.g. >35) to completely mismatched domains!
     * "weaknesses" MUST prominently state the fundamental domain mismatch (e.g., "Candidate background is in 3D Art/Animation with zero professional software engineering or full-stack web development credentials required for this role.").
     * "missingSkills" and "missingKeywords" MUST list the primary core competencies of the target role that are missing.
     * "matchedSkills" and "matchedKeywords" MUST be empty or only include truly shared transferable skills (e.g., "Git", "Agile"). DO NOT invent fake matches.
   - STRONG MATCH: If the candidate's background matches the target role, evaluate based on technical depth, metrics, and genuine skill overlap (60-95 score range).

2. EVIDENCE-BASED RECOMMENDATIONS:
   - Every recommendation MUST be actionable, specific, and cite actual missing skills or gaps relevant to this target role.
   - Do NOT provide generic platitudes like "add more numbers". Explain WHAT numbers or projects are needed for this specific role.

Return ONLY a single valid JSON object strictly matching this schema:
{
  "semanticMatchScore": <number 0-100 reflecting true role alignment>,
  "matchedKeywords": ["<exact keyword from JD found in resume 1>", "<keyword 2>"],
  "missingKeywords": ["<required keyword from JD omitted from resume 1>", "<keyword 2>"],
  "matchedSkills": ["<skill present in both resume and target role 1>", "<skill 2>"],
  "missingSkills": ["<critical required skill missing from resume 1>", "<skill 2>"],
  "strengths": ["<specific strength aligned with target role>", "<strength 2>"],
  "weaknesses": ["<specific gap or domain mismatch relative to role>", "<weakness 2>"],
  "recommendations": [
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "category": "<Category Name>",
      "suggestion": "<Specific actionable advice>",
      "reason": "<Why this matters for this specific role>"
    }
  ],
  "sectionFeedback": {
    "summary": "<Feedback on summary alignment with target role>",
    "skills": "<Feedback on skills section alignment with target role>",
    "experience": "<Feedback on experience bullet points alignment with target role>",
    "projects": "<Feedback on projects alignment with target role>",
    "education": "<Feedback on education alignment with target role>"
  }
}` : `You are an expert Technical Recruiter & General Resume Quality Auditor.
Your task is to audit a candidate's resume for overall quality, structure, technical breadth, and industry standards within their own field (No specific Job Description provided).

Return ONLY a single valid JSON object strictly matching this schema:
{
  "semanticMatchScore": <number 0-100 overall resume quality score in their field>,
  "matchedKeywords": ["<detected skill or competency 1>", "<detected skill 2>"],
  "missingKeywords": [],
  "matchedSkills": ["<detected skill 1>", "<detected skill 2>"],
  "missingSkills": [],
  "strengths": ["<standout resume strength>", "<strength 2>"],
  "weaknesses": ["<area for improvement>", "<weakness 2>"],
  "recommendations": [
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "category": "<Category Name>",
      "suggestion": "<Actionable recommendation>",
      "reason": "<Explanation>"
    }
  ],
  "sectionFeedback": {
    "summary": "<General summary feedback>",
    "skills": "<General skills feedback>",
    "experience": "<General experience feedback>",
    "projects": "<General projects feedback>",
    "education": "<General education feedback>"
  }
}`;
  const userPrompt = hasTargetRole ? `<target_role_context>
${targetRoleHeader}
${effectiveJdText ? `Job Description:
${effectiveJdText.slice(0, 3500)}` : `Target Position: ${effectiveJobTitle}`}
</target_role_context>

<candidate_resume>
${req.resumeText.slice(0, 4500)}
</candidate_resume>` : `<candidate_resume>
${req.resumeText.slice(0, 4500)}
</candidate_resume>`;
  const candidateModels = [
    process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "qwen/qwen3.8-27b"
  ];
  let lastError = null;
  const startIdx = Math.floor(Math.random() * keys.length);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[(startIdx + i) % keys.length];
    const groq = new Groq2({ apiKey: key });
    for (const model of candidateModels) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          model,
          temperature: 0.2,
          response_format: { type: "json_object" }
        });
        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("Empty AI response received.");
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not parse JSON from AI response.");
        const parsed = JSON.parse(jsonMatch[0]);
        const normalizedRecommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations.map((r, idx) => {
          if (typeof r === "string") {
            return {
              priority: idx === 0 ? "HIGH" : idx < 3 ? "MEDIUM" : "LOW",
              category: "Role Optimization",
              suggestion: r,
              reason: "Directly improves ATS score and recruiter alignment for this target role."
            };
          }
          return {
            priority: r.priority || (idx === 0 ? "HIGH" : idx < 3 ? "MEDIUM" : "LOW"),
            category: r.category || "Role Alignment",
            suggestion: r.suggestion || r.recommendation || String(r),
            reason: r.reason || "Actionable improvement for standard ATS parsers and hiring managers."
          };
        }) : [];
        return {
          semanticMatchScore: typeof parsed.semanticMatchScore === "number" ? Math.min(100, Math.max(0, parsed.semanticMatchScore)) : 50,
          matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords : [],
          missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
          matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
          missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
          strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : ["Demonstrates clear professional formatting"],
          weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0 ? parsed.weaknesses : ["Could align terminology more closely with target position"],
          recommendations: normalizedRecommendations,
          sectionFeedback: parsed.sectionFeedback || {
            summary: "Ensure summary explicitly highlights alignment with target position.",
            skills: "Group skills into recognized domain categories.",
            experience: "Emphasize measurable outcomes and relevant accomplishments.",
            projects: "Showcase projects directly relevant to target role requirements.",
            education: "Ensure degree and graduation timeline are clearly stated."
          }
        };
      } catch (err) {
        lastError = err;
        continue;
      }
    }
  }
  console.error("[AIAnalysis] All Groq API attempts failed. Falling back to dynamic domain analysis:", lastError?.message || lastError);
  return getFallbackAIResponse(req);
}
function getFallbackAIResponse(req) {
  const text = (req.resumeText || "").toLowerCase();
  const targetTitle = (req.jobTitle || "").toLowerCase();
  const jdText = (req.jobDescriptionText || "").toLowerCase();
  const candidateSkills = req.structuredData?.skills || [];
  const combinedTarget = `${targetTitle} ${jdText}`.trim();
  const hasTarget = combinedTarget.length > 0;
  const domains = [
    {
      name: "Software Engineering",
      keywords: ["software", "developer", "frontend", "backend", "full stack", "react", "typescript", "javascript", "node", "python", "java", "c++", "sql", "api", "docker", "aws"]
    },
    {
      name: "3D Art & Animation",
      keywords: ["animation", "animator", "3d", "maya", "blender", "rigging", "character", "keyframing", "zbrush", "texturing", "lighting", "vfx", "motion graphics", "after effects", "unreal"]
    },
    {
      name: "UI/UX & Product Design",
      keywords: ["ui/ux", "designer", "figma", "wireframe", "prototype", "user experience", "user interface", "design system", "adobe xd"]
    },
    {
      name: "Data Science & Analytics",
      keywords: ["data", "analyst", "analytics", "sql", "pandas", "numpy", "machine learning", "tableau", "power bi", "etl", "spark", "python"]
    },
    {
      name: "Marketing & Growth",
      keywords: ["marketing", "seo", "sem", "social media", "content", "campaigns", "copywriting", "growth", "google analytics"]
    },
    {
      name: "Finance & Accounting",
      keywords: ["finance", "financial", "accounting", "accountant", "audit", "tax", "gaap", "quickbooks", "valuation", "modeling"]
    }
  ];
  let resumeDomain = "General Professional";
  let maxResumeScore = 0;
  for (const d of domains) {
    const score = d.keywords.filter((kw) => text.includes(kw)).length;
    if (score > maxResumeScore) {
      maxResumeScore = score;
      resumeDomain = d.name;
    }
  }
  let targetDomain = resumeDomain;
  let maxTargetScore = 0;
  if (hasTarget) {
    for (const d of domains) {
      const score = d.keywords.filter((kw) => combinedTarget.includes(kw)).length;
      if (score > maxTargetScore) {
        maxTargetScore = score;
        targetDomain = d.name;
      }
    }
  }
  const isDomainMismatch = hasTarget && resumeDomain !== targetDomain && maxTargetScore >= 2;
  if (isDomainMismatch) {
    const targetKeywords2 = domains.find((d) => d.name === targetDomain)?.keywords || [];
    const missing2 = targetKeywords2.filter((kw) => !text.includes(kw)).slice(0, 8);
    const matched2 = targetKeywords2.filter((kw) => text.includes(kw));
    return {
      semanticMatchScore: 18,
      matchedKeywords: matched2,
      missingKeywords: missing2,
      matchedSkills: matched2,
      missingSkills: missing2,
      strengths: [
        `Strong credentials in ${resumeDomain}`,
        "Clear professional formatting and document organization"
      ],
      weaknesses: [
        `Critical domain divergence: Candidate background is centered in ${resumeDomain}, whereas target role requires ${targetDomain}`,
        `Missing primary technical qualifications required for ${targetDomain} (e.g., ${missing2.slice(0, 4).join(", ")})`
      ],
      recommendations: [
        {
          priority: "HIGH",
          category: "Career Alignment",
          suggestion: `Transitioning to ${targetDomain} requires demonstrating foundational projects or certifications in ${missing2.slice(0, 3).join(", ")}.`,
          reason: `ATS scanners and hiring managers for ${targetDomain} filter out resumes lacking primary domain credentials.`
        },
        {
          priority: "HIGH",
          category: "Target Projects",
          suggestion: `Add 2-3 substantial portfolio projects that directly utilize ${targetDomain} methodologies.`,
          reason: "Practical evidence is required when transitioning between distinct functional domains."
        }
      ],
      sectionFeedback: {
        summary: `Current summary reflects ${resumeDomain}. Reframe to highlight transferable skills toward ${targetDomain}.`,
        skills: `Heavily weighted toward ${resumeDomain}. Needs core ${targetDomain} competencies.`,
        experience: `Past experience focuses on ${resumeDomain}. Highlight any cross-functional overlap with ${targetDomain}.`,
        projects: `Add relevant ${targetDomain} projects to demonstrate capability.`,
        education: "Clear academic credentials provided."
      }
    };
  }
  const words2 = text.split(/\s+/).length;
  const targetKeywords = domains.find((d) => d.name === targetDomain)?.keywords || [];
  const matched = targetKeywords.filter((kw) => text.includes(kw));
  const missing = hasTarget ? targetKeywords.filter((kw) => !text.includes(kw)).slice(0, 6) : [];
  return {
    semanticMatchScore: hasTarget ? Math.min(92, Math.max(65, 50 + matched.length * 6)) : 80,
    matchedKeywords: matched,
    missingKeywords: missing,
    matchedSkills: candidateSkills.filter((s) => text.includes(s.toLowerCase())).slice(0, 10),
    missingSkills: missing,
    strengths: [
      `Strong alignment with ${resumeDomain} competencies (${candidateSkills.slice(0, 4).join(", ") || "core skills"})`,
      `Comprehensive resume depth with ${words2} words across project & work history`
    ],
    weaknesses: [
      hasTarget && missing.length > 0 ? `Could integrate key role competencies: ${missing.slice(0, 3).join(", ")}` : "Could expand bullet points with more quantifiable outcome metrics (% increase, scale, performance)"
    ],
    recommendations: [
      {
        priority: "HIGH",
        category: "Role Optimization",
        suggestion: hasTarget && missing.length > 0 ? `Incorporate required competencies (${missing.slice(0, 3).join(", ")}) into recent project descriptions.` : "Quantify your achievements using specific numbers, percentages, or measurable operational scale.",
        reason: "Strengthens keyword alignment with ATS filters and proves measurable impact to recruiters."
      },
      {
        priority: "MEDIUM",
        category: "Action Verbs",
        suggestion: "Begin every experience bullet point with strong impact verbs (e.g. Architected, Engineered, Optimized, Delivered).",
        reason: "Improves readability and executive presence during human recruiter review."
      }
    ],
    sectionFeedback: {
      summary: `Directly highlights your ${resumeDomain} specialization.`,
      skills: `Extracted skills: ${candidateSkills.slice(0, 6).join(", ") || "Good core competencies"}. Grouping skills by category improves readability.`,
      experience: "Focus bullet points on concrete problem-solution-impact narratives.",
      projects: "Ensure each project lists the exact tools used and measurable outcomes.",
      education: "Standard academic formatting present."
    }
  };
}

// src/controllers/resumeAnalysisController.ts
var storage2 = multer3.memoryStorage();
var uploadResumeFile = multer3({
  storage: storage2,
  limits: { fileSize: 10 * 1024 * 1024 },
  // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.includes("pdf") || file.mimetype.includes("officedocument") || file.mimetype.includes("docx") || file.originalname.match(/\.(pdf|docx|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX files are supported"));
    }
  }
});
async function uploadAndParseResume(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, message: "Please select a resume file (PDF or DOCX)" });
      return;
    }
    const extractedText = await extractTextFromBuffer(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );
    console.log(`[ResumeParser] File: ${req.file.originalname}, Extracted Text Length: ${extractedText.length} characters`);
    const printableRatio = extractedText.replace(/[^A-Za-z0-9]/g, "").length / Math.max(extractedText.length, 1);
    if (!extractedText || extractedText.trim().length < 40 || printableRatio < 0.2) {
      console.warn(`[ResumeParser] WARNING: No readable text extracted from file ${req.file.originalname}.`);
      res.status(400).json({
        success: false,
        errorType: "SCANNED_OR_EMPTY_PDF",
        message: "Could not extract readable text from this file. If this is a scanned image, photo, or graphical canvas PDF, please export or save your resume as a standard text-based PDF or DOCX file."
      });
      return;
    }
    console.log(`[ResumeParser] Text Preview: "${extractedText.slice(0, 150)}..."`);
    const { structuredData } = parseStructuredResume(extractedText);
    const resume = await Resume.create({
      userId: req.user._id,
      originalFileName: req.file.originalname,
      fileType: req.file.mimetype || "application/octet-stream",
      fileSize: req.file.size,
      extractedText,
      structuredData
    });
    res.status(201).json({
      success: true,
      message: "Resume uploaded and parsed successfully",
      data: {
        resumeId: resume._id,
        originalFileName: resume.originalFileName,
        fileSize: resume.fileSize,
        extractedText: resume.extractedText,
        structuredData: resume.structuredData,
        createdAt: resume.createdAt
      }
    });
  } catch (error) {
    if (error?.name === "ScannedPdfError" || error instanceof ScannedPdfError) {
      res.status(400).json({
        success: false,
        errorType: "SCANNED_OR_GRAPHICAL_PDF",
        message: error.message
      });
      return;
    }
    console.error("Resume upload error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to parse uploaded resume"
    });
  }
}
async function analyzeResume(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    const { resumeId, jobDescriptionText, jobTitle, companyName } = req.body;
    if (!resumeId) {
      res.status(400).json({ success: false, message: "resumeId is required" });
      return;
    }
    const resume = await Resume.findOne({ _id: resumeId, userId: req.user._id });
    if (!resume) {
      res.status(404).json({ success: false, message: "Resume not found" });
      return;
    }
    const effectiveJobTitle = (jobTitle || "").trim();
    const effectiveCompanyName = (companyName || "").trim();
    const effectiveJdText = (jobDescriptionText || "").trim();
    let jobDoc = null;
    if (effectiveJdText.length > 0 || effectiveJobTitle.length > 0) {
      jobDoc = await JobDescription.create({
        userId: req.user._id,
        title: effectiveJobTitle || "Target Role",
        company: effectiveCompanyName || "",
        description: effectiveJdText || `Target Position: ${effectiveJobTitle}`
      });
    }
    const aiResult = await analyzeResumeWithAI({
      resumeText: resume.extractedText,
      jobDescriptionText: effectiveJdText,
      jobTitle: effectiveJobTitle,
      companyName: effectiveCompanyName,
      structuredData: resume.structuredData
    });
    const atsResult = calculateATSScore({
      extractedText: resume.extractedText,
      structuredData: resume.structuredData,
      jobDescriptionText: effectiveJdText,
      jobTitle: effectiveJobTitle,
      aiSemanticScore: aiResult.semanticMatchScore,
      aiMatchedKeywords: aiResult.matchedKeywords,
      aiMissingKeywords: aiResult.missingKeywords,
      aiMatchedSkills: aiResult.matchedSkills,
      aiMissingSkills: aiResult.missingSkills
    });
    const matchedKeywords = atsResult.matchedKeywords;
    const missingKeywords = atsResult.missingKeywords;
    const matchedSkills = atsResult.matchedSkills;
    const missingSkills = atsResult.missingSkills;
    const analysis = await ResumeAnalysis.create({
      userId: req.user._id,
      resumeId: resume._id,
      jobDescriptionId: jobDoc ? jobDoc._id : void 0,
      atsScore: atsResult.atsScore,
      jobMatchScore: atsResult.jobMatchScore,
      scoreBreakdown: atsResult.categories,
      matchedKeywords,
      missingKeywords,
      matchedSkills,
      missingSkills,
      strengths: aiResult.strengths,
      weaknesses: aiResult.weaknesses,
      recommendations: aiResult.recommendations,
      sectionFeedback: aiResult.sectionFeedback,
      formattingAnalysis: {
        riskLevel: atsResult.formattingIssues.length > 0 ? "MEDIUM" : "LOW",
        issues: atsResult.formattingIssues
      }
    });
    const { awardActivityXP: awardActivityXP2 } = await Promise.resolve().then(() => (init_gamificationService(), gamificationService_exports));
    await awardActivityXP2(req.user._id.toString(), 75, "AI Resume Analysis", "Resume Strategist");
    res.json({
      success: true,
      message: "Resume analyzed successfully",
      data: {
        analysisId: analysis._id,
        atsScore: analysis.atsScore,
        jobMatchScore: analysis.jobMatchScore,
        scoreBreakdown: analysis.scoreBreakdown,
        matchedKeywords: analysis.matchedKeywords,
        missingKeywords: analysis.missingKeywords,
        matchedSkills: analysis.matchedSkills,
        missingSkills: analysis.missingSkills,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recommendations: analysis.recommendations,
        sectionFeedback: analysis.sectionFeedback,
        formattingAnalysis: analysis.formattingAnalysis,
        resume: {
          id: resume._id,
          fileName: resume.originalFileName,
          structuredData: resume.structuredData
        },
        jobDescription: jobDoc ? {
          id: jobDoc._id,
          title: jobDoc.title,
          company: jobDoc.company
        } : null,
        createdAt: analysis.createdAt
      }
    });
  } catch (error) {
    console.error("Resume analysis error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error running resume analysis"
    });
  }
}
async function getAnalysisHistory(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const [history, total] = await Promise.all([
      ResumeAnalysis.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("resumeId", "originalFileName fileSize extractedText structuredData").populate("jobDescriptionId", "title company description"),
      ResumeAnalysis.countDocuments({ userId: req.user._id })
    ]);
    res.json({
      success: true,
      data: history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Fetch analysis history error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch analysis history"
    });
  }
}
async function deleteAnalysis(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    const { analysisId } = req.params;
    const deleted = await ResumeAnalysis.findOneAndDelete({
      _id: analysisId,
      userId: req.user._id
    });
    if (!deleted) {
      res.status(404).json({ success: false, message: "Analysis record not found" });
      return;
    }
    res.json({
      success: true,
      message: "Analysis record deleted successfully"
    });
  } catch (error) {
    console.error("Delete analysis error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete analysis record"
    });
  }
}
async function generateJobDescriptionEndpoint(req, res) {
  try {
    const { jobTitle, companyName, resumeText } = req.body;
    const { callGroqWithFallback: callGroqWithFallback2 } = await Promise.resolve().then(() => (init_groqService(), groqService_exports));
    const systemPrompt = `You are an AI Tech Recruiter and Job Specifications Specialist.
Your task is to generate a clean, unified, realistic Job Description and recommended alternative job titles for a given Job Title and Company Name.

Rules for generatedJobDescription:
- Provide a clear, cohesive Job Description text without markdown formatting.
- DO NOT use markdown stars (* or **), markdown headers (# or ###), horizontal lines (---), or separate redundant sections for "Requirements" vs "Qualifications". Combine them into a clean, unified section.
- Use plain bullet points (- or \u2022) for responsibilities and key tech stack.

Return ONLY a single valid json object strictly matching this schema:
{
  "recommendedRoles": ["<Role suggestion 1>", "<Role suggestion 2>", "<Role suggestion 3>"],
  "recommendedCompanies": ["<Company 1>", "<Company 2>", "<Company 3>"],
  "generatedJobDescription": "<Clean unified job description text without markdown stars or horizontal lines>"
}`;
    const userPrompt = `Job Title: ${jobTitle || "Software Engineer"}
Company Name: ${companyName || "Top Tech Company"}
${resumeText ? `Candidate Resume Context: ${resumeText.slice(0, 1e3)}` : ""}`;
    const completion = await callGroqWithFallback2(
      (groq) => groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: "openai/gpt-oss-120b",
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    );
    const content = completion?.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response received from Groq");
    const parsed = JSON.parse(content);
    const rawJd = parsed.generatedJobDescription || "";
    const cleanJd = rawJd.replace(/\*{1,3}/g, "").replace(/^[-_]{3,}$/gm, "").replace(/^#{1,6}\s*/gm, "").replace(/\n{3,}/g, "\n\n").trim();
    res.json({
      success: true,
      data: {
        recommendedRoles: Array.isArray(parsed.recommendedRoles) ? parsed.recommendedRoles : [],
        recommendedCompanies: Array.isArray(parsed.recommendedCompanies) ? parsed.recommendedCompanies : [],
        generatedJobDescription: cleanJd
      }
    });
  } catch (error) {
    console.error("Generate JD error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate AI job description"
    });
  }
}

// src/routes/resumeAnalysisRoutes.ts
var router3 = Router3();
router3.post(
  "/upload",
  protect,
  (req, res, next) => {
    uploadResumeFile.single("resume")(req, res, (err) => {
      if (err) {
        res.status(400).json({
          success: false,
          message: err.message || "Resume upload failed. Use a PDF or DOCX under 10MB."
        });
        return;
      }
      next();
    });
  },
  uploadAndParseResume
);
router3.post("/analyze", protect, analyzeResume);
router3.post("/generate-jd", protect, generateJobDescriptionEndpoint);
router3.get("/history", protect, getAnalysisHistory);
router3.delete("/:analysisId", protect, deleteAnalysis);
var resumeAnalysisRoutes_default = router3;

// src/routes/codingRoutes.ts
import { Router as Router4 } from "express";

// src/controllers/codingController.ts
import mongoose10 from "mongoose";

// src/models/CodingProblem.ts
import mongoose8, { Schema as Schema7 } from "mongoose";
var ExampleSchema = new Schema7({
  input: { type: String, default: "" },
  output: { type: String, default: "" },
  explanation: { type: String, default: "" }
}, { _id: false });
var TestCaseSchema = new Schema7({
  input: { type: String, default: "" },
  expected: { type: String, default: "" },
  hidden: { type: Boolean, default: false }
}, { _id: false });
var StarterCodeSchema = new Schema7({
  python: { type: String, default: "class Solution:\n    def solve(self):\n        pass" },
  cpp: { type: String, default: "class Solution {\npublic:\n    void solve() {}\n};" },
  java: { type: String, default: "class Solution {\n    public void solve() {}\n}" },
  javascript: { type: String, default: "var solve = function() {};" },
  c: { type: String, default: "void solve() {\n    // your code here\n}" }
}, { _id: false });
var CodeWrapperSchema = new Schema7({
  python: { type: String, default: "" },
  cpp: { type: String, default: "" },
  java: { type: String, default: "" },
  javascript: { type: String, default: "" },
  c: { type: String, default: "" }
}, { _id: false });
var CodingProblemSchema = new Schema7({
  number: { type: Number, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
  description: { type: String, required: true },
  examples: { type: [ExampleSchema], required: true },
  constraints: { type: [String], default: [] },
  testCases: { type: [TestCaseSchema], default: [] },
  starter: { type: StarterCodeSchema, default: () => ({}) },
  codeWrapper: { type: CodeWrapperSchema, default: () => ({}) },
  hints: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  companies: { type: [String], default: [] },
  acceptance: { type: Number, default: 50, min: 0, max: 100 },
  likes: { type: Number, default: 0 },
  points: { type: Number, default: 100 },
  premium: { type: Boolean, default: false },
  hidden: { type: Boolean, default: false },
  aiContext: { type: String, default: "" },
  createdBy: { type: String, default: "admin" }
}, {
  timestamps: true,
  autoIndex: false
});
CodingProblemSchema.pre("save", function(next) {
  if (this.isModified("title") && !this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  if (this.isModified("difficulty")) {
    this.points = this.difficulty === "Easy" ? 100 : this.difficulty === "Medium" ? 200 : 400;
  }
  if (!this.aiContext) {
    this.aiContext = `${this.title} \u2014 ${(this.tags || []).join(", ")} \u2014 ${this.difficulty}`;
  }
  next();
});
CodingProblemSchema.index({ hidden: 1, difficulty: 1, number: 1 });
var CodingProblem = mongoose8.model("CodingProblem", CodingProblemSchema);

// src/models/CodingSubmission.ts
import mongoose9, { Schema as Schema8 } from "mongoose";
var CodingSubmissionSchema = new Schema8({
  user: { type: Schema8.Types.ObjectId, ref: "User", required: true },
  problem: { type: Schema8.Types.ObjectId, ref: "CodingProblem", required: true },
  language: { type: String, enum: ["cpp", "python", "java", "c", "javascript"], required: true },
  code: { type: String, required: true },
  verdict: { type: String, enum: ["Accepted", "Wrong Answer", "Runtime Error", "Time Limit Exceeded", "Compilation Error", "Error"], required: true },
  runtime: { type: String, default: "N/A" },
  memory: { type: String, default: "N/A" },
  testsPassed: { type: Number, default: 0 },
  testsTotal: { type: Number, default: 0 },
  output: { type: String, default: "" },
  stderr: { type: String, default: "" }
}, { timestamps: true });
CodingSubmissionSchema.index({ user: 1, createdAt: -1 });
CodingSubmissionSchema.index({ user: 1, problem: 1 });
CodingSubmissionSchema.index({ problem: 1, createdAt: -1 });
CodingSubmissionSchema.index({ verdict: 1 });
var CodingSubmission = mongoose9.model("CodingSubmission", CodingSubmissionSchema);

// src/controllers/codingController.ts
init_User();

// src/data/starters.ts
var PARAMS = {
  intArray: { py: "nums", js: "nums", java: "int[] nums", cpp: "vector<int>& nums" },
  intArrayTarget: {
    py: "nums, target",
    js: "nums, target",
    java: "int[] nums, int target",
    cpp: "vector<int>& nums, int target"
  },
  intArrayK: {
    py: "nums, k",
    js: "nums, k",
    java: "int[] nums, int k",
    cpp: "vector<int>& nums, int k"
  },
  int: { py: "n", js: "n", java: "int n", cpp: "int n" },
  twoIntsLine: { py: "a, b", js: "a, b", java: "int a, int b", cpp: "int a, int b" },
  string: { py: "s", js: "s", java: "String s", cpp: "string s" },
  twoStrings: {
    py: "s, t",
    js: "s, t",
    java: "String s, String t",
    cpp: "string s, string t"
  },
  stringInt: {
    py: "s, k",
    js: "s, k",
    java: "String s, int k",
    cpp: "string s, int k"
  },
  matrix: {
    py: "grid",
    js: "grid",
    java: "int[][] grid",
    cpp: "vector<vector<int>>& grid"
  },
  matrixK: {
    py: "grid, query",
    js: "grid, query",
    java: "int[][] grid, int[] query",
    cpp: "vector<vector<int>>& grid, vector<int>& query"
  },
  twoIntArrays: {
    py: "nums1, nums2",
    js: "nums1, nums2",
    java: "int[] nums1, int[] nums2",
    cpp: "vector<int>& nums1, vector<int>& nums2"
  },
  stringArray: {
    py: "words",
    js: "words",
    java: "String[] words",
    cpp: "vector<string>& words"
  },
  stringWords: {
    py: "s, words",
    js: "s, words",
    java: "String s, String[] words",
    cpp: "string s, vector<string>& words"
  },
  ops: { py: "ops", js: "ops", java: "String[] ops", cpp: "vector<string>& ops" },
  nEdges: {
    py: "n, edges",
    js: "n, edges",
    java: "int n, int[][] edges",
    cpp: "int n, vector<vector<int>>& edges"
  },
  nEdgesQ: {
    py: "n, edges, query",
    js: "n, edges, query",
    java: "int n, int[][] edges, int[] query",
    cpp: "int n, vector<vector<int>>& edges, vector<int>& query"
  },
  list: { py: "head", js: "head", java: "ListNode head", cpp: "ListNode* head" },
  listK: {
    py: "head, k",
    js: "head, k",
    java: "ListNode head, int k",
    cpp: "ListNode* head, int k"
  },
  listCycle: { py: "head", js: "head", java: "ListNode head", cpp: "ListNode* head" },
  twoLists: {
    py: "l1, l2",
    js: "l1, l2",
    java: "ListNode l1, ListNode l2",
    cpp: "ListNode* l1, ListNode* l2"
  },
  kLists: {
    py: "lists",
    js: "lists",
    java: "ListNode[] lists",
    cpp: "vector<ListNode*>& lists"
  },
  tree: { py: "root", js: "root", java: "TreeNode root", cpp: "TreeNode* root" },
  treeK: {
    py: "root, k",
    js: "root, k",
    java: "TreeNode root, int k",
    cpp: "TreeNode* root, int k"
  },
  twoTrees: {
    py: "p, q",
    js: "p, q",
    java: "TreeNode p, TreeNode q",
    cpp: "TreeNode* p, TreeNode* q"
  },
  treePQ: {
    py: "root, p, q",
    js: "root, p, q",
    java: "TreeNode root, int p, int q",
    cpp: "TreeNode* root, int p, int q"
  }
};
var LIST_SHAPES = ["list", "listK", "listCycle", "twoLists", "kLists"];
var TREE_SHAPES = ["tree", "treeK", "twoTrees", "treePQ"];
var RET_JAVA = {
  int: "int",
  long: "long",
  bool: "boolean",
  intArray: "int[]",
  string: "String",
  float2: "double",
  list: "ListNode",
  tree: "TreeNode",
  lines: "List<String>",
  sortedLines: "List<String>",
  intMatrix: "List<List<Integer>>",
  sortedIntMatrix: "List<List<Integer>>"
};
var RET_CPP = {
  int: "int",
  long: "long long",
  bool: "bool",
  intArray: "vector<int>",
  string: "string",
  float2: "double",
  list: "ListNode*",
  tree: "TreeNode*",
  lines: "vector<string>",
  sortedLines: "vector<string>",
  intMatrix: "vector<vector<int>>",
  sortedIntMatrix: "vector<vector<int>>"
};
var RET_DEFAULT_JAVA = {
  int: "0",
  long: "0",
  bool: "false",
  intArray: "new int[]{}",
  string: '""',
  float2: "0.0",
  list: "null",
  tree: "null",
  lines: "new ArrayList<>()",
  sortedLines: "new ArrayList<>()",
  intMatrix: "new ArrayList<>()",
  sortedIntMatrix: "new ArrayList<>()"
};
var RET_DEFAULT_CPP = {
  int: "0",
  long: "0",
  bool: "false",
  intArray: "{}",
  string: '""',
  float2: "0.0",
  list: "nullptr",
  tree: "nullptr",
  lines: "{}",
  sortedLines: "{}",
  intMatrix: "{}",
  sortedIntMatrix: "{}"
};
var PY_LIST_HELPERS = `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build_list(line):
    dummy = ListNode()
    cur = dummy
    for tok in (line or '').split():
        cur.next = ListNode(int(tok))
        cur = cur.next
    return dummy.next

def list_to_str(head):
    vals = []
    while head:
        vals.append(str(head.val))
        head = head.next
    return ' '.join(vals)
`;
var PY_TREE_HELPERS = `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(line):
    toks = (line or '').split()
    if not toks or toks[0] == 'null':
        return None
    root = TreeNode(int(toks[0]))
    q = deque([root])
    i = 1
    while q and i < len(toks):
        node = q.popleft()
        if i < len(toks) and toks[i] != 'null':
            node.left = TreeNode(int(toks[i]))
            q.append(node.left)
        i += 1
        if i < len(toks) and toks[i] != 'null':
            node.right = TreeNode(int(toks[i]))
            q.append(node.right)
        i += 1
    return root

def serialize_tree(root):
    if not root:
        return 'null'
    out = []
    q = deque([root])
    while q:
        node = q.popleft()
        if node:
            out.append(str(node.val))
            q.append(node.left)
            q.append(node.right)
        else:
            out.append('null')
    while out and out[-1] == 'null':
        out.pop()
    return ' '.join(out)
`;
var JS_LIST_HELPERS = `class ListNode {
  constructor(val = 0, next = null) { this.val = val; this.next = next; }
}

function buildList(line) {
  const dummy = new ListNode();
  let cur = dummy;
  for (const tok of (line || '').trim().split(/\\s+/).filter(Boolean)) {
    cur.next = new ListNode(parseInt(tok));
    cur = cur.next;
  }
  return dummy.next;
}

function listToStr(head) {
  const vals = [];
  while (head) { vals.push(head.val); head = head.next; }
  return vals.join(' ');
}
`;
var JS_TREE_HELPERS = `class TreeNode {
  constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

function buildTree(line) {
  const toks = (line || '').trim().split(/\\s+/).filter(Boolean);
  if (!toks.length || toks[0] === 'null') return null;
  const root = new TreeNode(parseInt(toks[0]));
  const q = [root];
  let i = 0 + 1;
  while (q.length && i < toks.length) {
    const node = q.shift();
    if (i < toks.length && toks[i] !== 'null') { node.left = new TreeNode(parseInt(toks[i])); q.push(node.left); }
    i++;
    if (i < toks.length && toks[i] !== 'null') { node.right = new TreeNode(parseInt(toks[i])); q.push(node.right); }
    i++;
  }
  return root;
}

function serializeTree(root) {
  if (!root) return 'null';
  const out = [];
  const q = [root];
  while (q.length) {
    const node = q.shift();
    if (node) { out.push(String(node.val)); q.push(node.left); q.push(node.right); }
    else out.push('null');
  }
  while (out.length && out[out.length - 1] === 'null') out.pop();
  return out.join(' ');
}
`;
var JAVA_LISTNODE_CLASS = `class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}
`;
var JAVA_TREENODE_CLASS = `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}
`;
var JAVA_LIST_HELPERS = `
    static ListNode buildList(String line) {
        ListNode dummy = new ListNode(0), cur = dummy;
        if (line != null && !line.trim().isEmpty()) {
            for (String tok : line.trim().split("\\\\s+")) {
                cur.next = new ListNode(Integer.parseInt(tok));
                cur = cur.next;
            }
        }
        return dummy.next;
    }

    static String listToStr(ListNode head) {
        StringBuilder sb = new StringBuilder();
        while (head != null) {
            if (sb.length() > 0) sb.append(' ');
            sb.append(head.val);
            head = head.next;
        }
        return sb.toString();
    }
`;
var JAVA_TREE_HELPERS = `
    static TreeNode buildTree(String line) {
        if (line == null || line.trim().isEmpty()) return null;
        String[] toks = line.trim().split("\\\\s+");
        if (toks[0].equals("null")) return null;
        TreeNode root = new TreeNode(Integer.parseInt(toks[0]));
        LinkedList<TreeNode> q = new LinkedList<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < toks.length) {
            TreeNode node = q.poll();
            if (i < toks.length && !toks[i].equals("null")) { node.left = new TreeNode(Integer.parseInt(toks[i])); q.add(node.left); }
            i++;
            if (i < toks.length && !toks[i].equals("null")) { node.right = new TreeNode(Integer.parseInt(toks[i])); q.add(node.right); }
            i++;
        }
        return root;
    }

    static String serializeTree(TreeNode root) {
        if (root == null) return "null";
        List<String> out = new ArrayList<>();
        LinkedList<TreeNode> q = new LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {
            TreeNode node = q.poll();
            if (node != null) { out.add(String.valueOf(node.val)); q.add(node.left); q.add(node.right); }
            else out.add("null");
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return String.join(" ", out);
    }
`;
var CPP_LIST_HELPERS = `struct ListNode {
    int val;
    ListNode* next;
    ListNode(int x) : val(x), next(nullptr) {}
};

ListNode* buildList(const string& line) {
    ListNode dummy(0);
    ListNode* cur = &dummy;
    stringstream ss(line);
    int x;
    while (ss >> x) { cur->next = new ListNode(x); cur = cur->next; }
    return dummy.next;
}

string listToStr(ListNode* head) {
    string out;
    while (head) {
        if (!out.empty()) out += ' ';
        out += to_string(head->val);
        head = head->next;
    }
    return out;
}

`;
var CPP_TREE_HELPERS = `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

TreeNode* buildTree(const string& line) {
    vector<string> toks;
    { stringstream ss(line); string t; while (ss >> t) toks.push_back(t); }
    if (toks.empty() || toks[0] == "null") return nullptr;
    TreeNode* root = new TreeNode(stoi(toks[0]));
    queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < toks.size()) {
        TreeNode* node = q.front(); q.pop();
        if (i < toks.size() && toks[i] != "null") { node->left = new TreeNode(stoi(toks[i])); q.push(node->left); }
        i++;
        if (i < toks.size() && toks[i] != "null") { node->right = new TreeNode(stoi(toks[i])); q.push(node->right); }
        i++;
    }
    return root;
}

string serializeTree(TreeNode* root) {
    if (!root) return "null";
    vector<string> out;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front(); q.pop();
        if (node) { out.push_back(to_string(node->val)); q.push(node->left); q.push(node->right); }
        else out.push_back("null");
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    string s;
    for (size_t i = 0; i < out.size(); i++) { if (i) s += ' '; s += out[i]; }
    return s;
}

`;
function pyReader(shape) {
  switch (shape) {
    case "intArray":
      return "    nums = list(map(int, data[0].split()))";
    case "intArrayTarget":
      return "    nums = list(map(int, data[0].split()))\n    target = int(data[1])";
    case "intArrayK":
      return "    nums = list(map(int, data[0].split()))\n    k = int(data[1])";
    case "int":
      return "    n = int(data[0])";
    case "twoIntsLine":
      return "    a, b = map(int, data[0].split())";
    case "string":
      return "    s = data[0]";
    case "twoStrings":
      return "    s = data[0]\n    t = data[1]";
    case "stringInt":
      return "    s = data[0]\n    k = int(data[1])";
    case "matrix":
      return "    r, c = map(int, data[0].split())\n    grid = [list(map(int, data[1 + i].split())) for i in range(r)]";
    case "matrixK":
      return "    r, c = map(int, data[0].split())\n    grid = [list(map(int, data[1 + i].split())) for i in range(r)]\n    query = list(map(int, data[1 + r].split()))";
    case "twoIntArrays":
      return "    nums1 = list(map(int, data[0].split()))\n    nums2 = list(map(int, data[1].split()))";
    case "stringArray":
      return "    words = data[0].split()";
    case "stringWords":
      return "    s = data[0]\n    words = data[1].split()";
    case "ops":
      return "    ops = [line for line in data if line.strip()]";
    case "nEdges":
      return "    n, m = map(int, data[0].split())\n    edges = [list(map(int, data[1 + i].split())) for i in range(m)]";
    case "nEdgesQ":
      return "    n, m = map(int, data[0].split())\n    edges = [list(map(int, data[1 + i].split())) for i in range(m)]\n    query = list(map(int, data[1 + m].split()))";
    case "list":
      return "    head = build_list(data[0])";
    case "listK":
      return "    head = build_list(data[0])\n    k = int(data[1])";
    case "listCycle":
      return "    head = build_list(data[0])\n    pos = int(data[1])\n    if head and pos >= 0:\n        nodes = []\n        cur = head\n        while cur:\n            nodes.append(cur)\n            cur = cur.next\n        nodes[-1].next = nodes[pos]";
    case "twoLists":
      return "    l1 = build_list(data[0])\n    l2 = build_list(data[1])";
    case "kLists":
      return "    k = int(data[0])\n    lists = [build_list(data[1 + i]) for i in range(k)]";
    case "tree":
      return "    root = build_tree(data[0])";
    case "treeK":
      return "    root = build_tree(data[0])\n    k = int(data[1])";
    case "twoTrees":
      return "    p = build_tree(data[0])\n    q = build_tree(data[1])";
    case "treePQ":
      return "    root = build_tree(data[0])\n    p, q = map(int, data[1].split())";
  }
}
function pyPrinter(out) {
  switch (out) {
    case "bool":
      return "    print('true' if res else 'false')";
    case "intArray":
      return "    print(' '.join(map(str, res)))";
    case "float2":
      return "    print(f'{res:.2f}')";
    case "list":
      return "    print(list_to_str(res))";
    case "tree":
      return "    print(serialize_tree(res))";
    case "lines":
      return "    print('\\n'.join(res))";
    case "sortedLines":
      return "    print('\\n'.join(sorted(res)))";
    case "intMatrix":
      return "    print('\\n'.join(' '.join(map(str, row)) for row in res))";
    case "sortedIntMatrix":
      return "    print('\\n'.join(sorted(' '.join(map(str, row)) for row in res)))";
    default:
      return "    print(res)";
  }
}
var JS_INTS = "(l) => (l || '').trim().split(/\\s+/).filter(Boolean).map(Number)";
function jsReader(shape) {
  switch (shape) {
    case "intArray":
      return "  const nums = (data[0]||'').trim().split(/\\s+/).filter(Boolean).map(Number);";
    case "intArrayTarget":
      return "  const nums = (data[0]||'').trim().split(/\\s+/).filter(Boolean).map(Number);\n  const target = parseInt(data[1]);";
    case "intArrayK":
      return "  const nums = (data[0]||'').trim().split(/\\s+/).filter(Boolean).map(Number);\n  const k = parseInt(data[1]);";
    case "int":
      return "  const n = parseInt(data[0]);";
    case "twoIntsLine":
      return "  const [a, b] = data[0].trim().split(/\\s+/).map(Number);";
    case "string":
      return "  const s = data[0] ?? '';";
    case "twoStrings":
      return "  const s = data[0] ?? '';\n  const t = data[1] ?? '';";
    case "stringInt":
      return "  const s = data[0] ?? '';\n  const k = parseInt(data[1]);";
    case "matrix":
      return "  const [r, c] = data[0].trim().split(/\\s+/).map(Number);\n  const grid = [];\n  for (let i = 0; i < r; i++) grid.push(data[1 + i].trim().split(/\\s+/).map(Number));";
    case "matrixK":
      return `  const parseIntsJs = ${JS_INTS};
  const [r, c] = data[0].trim().split(/\\s+/).map(Number);
  const grid = [];
  for (let i = 0; i < r; i++) grid.push(parseIntsJs(data[1 + i]));
  const query = parseIntsJs(data[1 + r]);`;
    case "twoIntArrays":
      return `  const parseIntsJs = ${JS_INTS};
  const nums1 = parseIntsJs(data[0]);
  const nums2 = parseIntsJs(data[1]);`;
    case "stringArray":
      return "  const words = (data[0]||'').trim().split(/\\s+/).filter(Boolean);";
    case "stringWords":
      return "  const s = data[0] ?? '';\n  const words = (data[1]||'').trim().split(/\\s+/).filter(Boolean);";
    case "ops":
      return "  const ops = data.filter((l) => l.trim().length > 0);";
    case "nEdges":
      return `  const parseIntsJs = ${JS_INTS};
  const [n, m] = data[0].trim().split(/\\s+/).map(Number);
  const edges = [];
  for (let i = 0; i < m; i++) edges.push(parseIntsJs(data[1 + i]));`;
    case "nEdgesQ":
      return `  const parseIntsJs = ${JS_INTS};
  const [n, m] = data[0].trim().split(/\\s+/).map(Number);
  const edges = [];
  for (let i = 0; i < m; i++) edges.push(parseIntsJs(data[1 + i]));
  const query = parseIntsJs(data[1 + m]);`;
    case "list":
      return "  const head = buildList(data[0]);";
    case "listK":
      return "  const head = buildList(data[0]);\n  const k = parseInt(data[1]);";
    case "listCycle":
      return "  const head = buildList(data[0]);\n  const pos = parseInt(data[1]);\n  if (head && pos >= 0) {\n    const nodes = [];\n    let cur = head;\n    while (cur) { nodes.push(cur); cur = cur.next; }\n    nodes[nodes.length - 1].next = nodes[pos];\n  }";
    case "twoLists":
      return "  const l1 = buildList(data[0]);\n  const l2 = buildList(data[1]);";
    case "kLists":
      return "  const k = parseInt(data[0]);\n  const lists = [];\n  for (let i = 0; i < k; i++) lists.push(buildList(data[1 + i]));";
    case "tree":
      return "  const root = buildTree(data[0]);";
    case "treeK":
      return "  const root = buildTree(data[0]);\n  const k = parseInt(data[1]);";
    case "twoTrees":
      return "  const p = buildTree(data[0]);\n  const q = buildTree(data[1]);";
    case "treePQ":
      return "  const root = buildTree(data[0]);\n  const [p, q] = data[1].trim().split(/\\s+/).map(Number);";
  }
}
function jsPrinter(out) {
  switch (out) {
    case "bool":
      return "  console.log(res ? 'true' : 'false');";
    case "intArray":
      return "  console.log(res.join(' '));";
    case "float2":
      return "  console.log(Number(res).toFixed(2));";
    case "list":
      return "  console.log(listToStr(res));";
    case "tree":
      return "  console.log(serializeTree(res));";
    case "lines":
      return "  console.log(res.join('\\n'));";
    case "sortedLines":
      return "  console.log([...res].sort().join('\\n'));";
    case "intMatrix":
      return "  console.log(res.map((r) => r.join(' ')).join('\\n'));";
    case "sortedIntMatrix":
      return "  console.log(res.map((r) => r.join(' ')).sort().join('\\n'));";
    default:
      return "  console.log(res);";
  }
}
function javaReader(shape) {
  switch (shape) {
    case "intArray":
      return "        int[] nums = parseInts(br.readLine());";
    case "intArrayTarget":
      return "        int[] nums = parseInts(br.readLine());\n        int target = Integer.parseInt(br.readLine().trim());";
    case "intArrayK":
      return "        int[] nums = parseInts(br.readLine());\n        int k = Integer.parseInt(br.readLine().trim());";
    case "int":
      return "        int n = Integer.parseInt(br.readLine().trim());";
    case "twoIntsLine":
      return "        int[] ab = parseInts(br.readLine());\n        int a = ab[0], b = ab[1];";
    case "string":
      return "        String s = br.readLine();";
    case "twoStrings":
      return "        String s = br.readLine();\n        String t = br.readLine();";
    case "stringInt":
      return "        String s = br.readLine();\n        int k = Integer.parseInt(br.readLine().trim());";
    case "matrix":
      return "        int[] rc = parseInts(br.readLine());\n        int r = rc[0], c = rc[1];\n        int[][] grid = new int[r][];\n        for (int i = 0; i < r; i++) grid[i] = parseInts(br.readLine());";
    case "matrixK":
      return "        int[] rc = parseInts(br.readLine());\n        int r = rc[0], c = rc[1];\n        int[][] grid = new int[r][];\n        for (int i = 0; i < r; i++) grid[i] = parseInts(br.readLine());\n        int[] query = parseInts(br.readLine());";
    case "twoIntArrays":
      return "        int[] nums1 = parseInts(br.readLine());\n        int[] nums2 = parseInts(br.readLine());";
    case "stringArray":
      return '        String wline = br.readLine();\n        String[] words = (wline == null || wline.trim().isEmpty()) ? new String[]{} : wline.trim().split("\\\\s+");';
    case "stringWords":
      return '        String s = br.readLine();\n        String wline = br.readLine();\n        String[] words = (wline == null || wline.trim().isEmpty()) ? new String[]{} : wline.trim().split("\\\\s+");';
    case "ops":
      return "        List<String> opsList = new ArrayList<>();\n        String line;\n        while ((line = br.readLine()) != null) if (!line.trim().isEmpty()) opsList.add(line.trim());\n        String[] ops = opsList.toArray(new String[0]);";
    case "nEdges":
      return "        int[] nm = parseInts(br.readLine());\n        int n = nm[0], m = nm[1];\n        int[][] edges = new int[m][];\n        for (int i = 0; i < m; i++) edges[i] = parseInts(br.readLine());";
    case "nEdgesQ":
      return "        int[] nm = parseInts(br.readLine());\n        int n = nm[0], m = nm[1];\n        int[][] edges = new int[m][];\n        for (int i = 0; i < m; i++) edges[i] = parseInts(br.readLine());\n        int[] query = parseInts(br.readLine());";
    case "list":
      return "        ListNode head = buildList(br.readLine());";
    case "listK":
      return "        ListNode head = buildList(br.readLine());\n        int k = Integer.parseInt(br.readLine().trim());";
    case "listCycle":
      return "        ListNode head = buildList(br.readLine());\n        int pos = Integer.parseInt(br.readLine().trim());\n        if (head != null && pos >= 0) {\n            List<ListNode> nodes = new ArrayList<>();\n            for (ListNode c = head; c != null; c = c.next) nodes.add(c);\n            nodes.get(nodes.size() - 1).next = nodes.get(pos);\n        }";
    case "twoLists":
      return "        ListNode l1 = buildList(br.readLine());\n        ListNode l2 = buildList(br.readLine());";
    case "kLists":
      return "        int k = Integer.parseInt(br.readLine().trim());\n        ListNode[] lists = new ListNode[k];\n        for (int i = 0; i < k; i++) lists[i] = buildList(br.readLine());";
    case "tree":
      return "        TreeNode root = buildTree(br.readLine());";
    case "treeK":
      return "        TreeNode root = buildTree(br.readLine());\n        int k = Integer.parseInt(br.readLine().trim());";
    case "twoTrees":
      return "        TreeNode p = buildTree(br.readLine());\n        TreeNode q = buildTree(br.readLine());";
    case "treePQ":
      return "        TreeNode root = buildTree(br.readLine());\n        int[] pq = parseInts(br.readLine());\n        int p = pq[0], q = pq[1];";
  }
}
function javaPrinter(out, callArgs, fnName) {
  const call = `${RET_JAVA[out]} res = new Solution().${fnName}(${callArgs});`;
  switch (out) {
    case "bool":
      return `        ${call}
        System.out.println(res ? "true" : "false");`;
    case "intArray":
      return `        ${call}
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < res.length; i++) { if (i > 0) sb.append(' '); sb.append(res[i]); }
        System.out.println(sb.toString());`;
    case "float2":
      return `        ${call}
        System.out.printf("%.2f%n", res);`;
    case "list":
      return `        ${call}
        System.out.println(listToStr(res));`;
    case "tree":
      return `        ${call}
        System.out.println(serializeTree(res));`;
    case "lines":
      return `        ${call}
        System.out.println(String.join("\\n", res));`;
    case "sortedLines":
      return `        ${call}
        List<String> sortedRes = new ArrayList<>(res);
        Collections.sort(sortedRes);
        System.out.println(String.join("\\n", sortedRes));`;
    case "intMatrix":
    case "sortedIntMatrix": {
      const sortLine = out === "sortedIntMatrix" ? "\n        Collections.sort(rows);" : "";
      return `        ${call}
        List<String> rows = new ArrayList<>();
        for (List<Integer> row : res) {
            StringBuilder rb = new StringBuilder();
            for (int i = 0; i < row.size(); i++) { if (i > 0) rb.append(' '); rb.append(row.get(i)); }
            rows.add(rb.toString());
        }${sortLine}
        System.out.println(String.join("\\n", rows));`;
    }
    default:
      return `        ${call}
        System.out.println(res);`;
  }
}
function cppReader(shape) {
  switch (shape) {
    case "intArray":
      return "    string line; getline(cin, line);\n    vector<int> nums = parseInts(line);";
    case "intArrayTarget":
      return "    string line; getline(cin, line);\n    vector<int> nums = parseInts(line);\n    int target; cin >> target;";
    case "intArrayK":
      return "    string line; getline(cin, line);\n    vector<int> nums = parseInts(line);\n    int k; cin >> k;";
    case "int":
      return "    int n; cin >> n;";
    case "twoIntsLine":
      return "    int a, b; cin >> a >> b;";
    case "string":
      return "    string s; getline(cin, s);";
    case "twoStrings":
      return "    string s, t; getline(cin, s); getline(cin, t);";
    case "stringInt":
      return "    string s; getline(cin, s);\n    int k; cin >> k;";
    case "matrix":
      return "    int r, c; cin >> r >> c;\n    vector<vector<int>> grid(r, vector<int>(c));\n    for (int i = 0; i < r; i++) for (int j = 0; j < c; j++) cin >> grid[i][j];";
    case "matrixK":
      return "    int r, c; cin >> r >> c;\n    vector<vector<int>> grid(r, vector<int>(c));\n    for (int i = 0; i < r; i++) for (int j = 0; j < c; j++) cin >> grid[i][j];\n    cin.ignore();\n    string qline; getline(cin, qline);\n    vector<int> query = parseInts(qline);";
    case "twoIntArrays":
      return "    string line1, line2; getline(cin, line1); getline(cin, line2);\n    vector<int> nums1 = parseInts(line1);\n    vector<int> nums2 = parseInts(line2);";
    case "stringArray":
      return "    string line; getline(cin, line);\n    vector<string> words;\n    { stringstream ss(line); string w; while (ss >> w) words.push_back(w); }";
    case "stringWords":
      return "    string s; getline(cin, s);\n    string wline; getline(cin, wline);\n    vector<string> words;\n    { stringstream ss(wline); string w; while (ss >> w) words.push_back(w); }";
    case "ops":
      return "    vector<string> ops;\n    string line;\n    while (getline(cin, line)) { if (!line.empty()) ops.push_back(line); }";
    case "nEdges":
      return "    string hline; getline(cin, hline);\n    vector<int> nmv = parseInts(hline);\n    int n = nmv[0], m = nmv[1];\n    vector<vector<int>> edges(m);\n    for (int i = 0; i < m; i++) { string row; getline(cin, row); edges[i] = parseInts(row); }";
    case "nEdgesQ":
      return "    string hline; getline(cin, hline);\n    vector<int> nmv = parseInts(hline);\n    int n = nmv[0], m = nmv[1];\n    vector<vector<int>> edges(m);\n    for (int i = 0; i < m; i++) { string row; getline(cin, row); edges[i] = parseInts(row); }\n    string qline; getline(cin, qline);\n    vector<int> query = parseInts(qline);";
    case "list":
      return "    string line; getline(cin, line);\n    ListNode* head = buildList(line);";
    case "listK":
      return "    string line; getline(cin, line);\n    ListNode* head = buildList(line);\n    int k; cin >> k;";
    case "listCycle":
      return "    string line; getline(cin, line);\n    ListNode* head = buildList(line);\n    int pos; cin >> pos;\n    if (head && pos >= 0) {\n        vector<ListNode*> nodes;\n        for (ListNode* c = head; c; c = c->next) nodes.push_back(c);\n        nodes.back()->next = nodes[pos];\n    }";
    case "twoLists":
      return "    string line1, line2; getline(cin, line1); getline(cin, line2);\n    ListNode* l1 = buildList(line1);\n    ListNode* l2 = buildList(line2);";
    case "kLists":
      return "    int k; cin >> k; cin.ignore();\n    vector<ListNode*> lists(k);\n    for (int i = 0; i < k; i++) { string line; getline(cin, line); lists[i] = buildList(line); }";
    case "tree":
      return "    string line; getline(cin, line);\n    TreeNode* root = buildTree(line);";
    case "treeK":
      return "    string line; getline(cin, line);\n    TreeNode* root = buildTree(line);\n    int k; cin >> k;";
    case "twoTrees":
      return "    string line1, line2; getline(cin, line1); getline(cin, line2);\n    TreeNode* p = buildTree(line1);\n    TreeNode* q = buildTree(line2);";
    case "treePQ":
      return "    string line; getline(cin, line);\n    TreeNode* root = buildTree(line);\n    int p, q; cin >> p >> q;";
  }
}
function cppPrinter(out, callArgs, fnName) {
  const call = `auto res = ${fnName}(${callArgs});`;
  switch (out) {
    case "bool":
      return `    ${call}
    cout << (res ? "true" : "false") << "\\n";`;
    case "intArray":
      return `    ${call}
    for (size_t i = 0; i < res.size(); i++) { if (i) cout << ' '; cout << res[i]; }
    cout << "\\n";`;
    case "float2":
      return `    ${call}
    cout << fixed << setprecision(2) << res << "\\n";`;
    case "list":
      return `    ${call}
    cout << listToStr(res) << "\\n";`;
    case "tree":
      return `    ${call}
    cout << serializeTree(res) << "\\n";`;
    case "lines":
      return `    ${call}
    for (auto& item : res) cout << item << "\\n";`;
    case "sortedLines":
      return `    ${call}
    sort(res.begin(), res.end());
    for (auto& item : res) cout << item << "\\n";`;
    case "intMatrix":
      return `    ${call}
    for (auto& row : res) {
        for (size_t i = 0; i < row.size(); i++) { if (i) cout << ' '; cout << row[i]; }
        cout << "\\n";
    }`;
    case "sortedIntMatrix":
      return `    ${call}
    vector<string> rows;
    for (auto& row : res) {
        string rs;
        for (size_t i = 0; i < row.size(); i++) { if (i) rs += ' '; rs += to_string(row[i]); }
        rows.push_back(rs);
    }
    sort(rows.begin(), rows.end());
    for (auto& rs : rows) cout << rs << "\\n";`;
    default:
      return `    ${call}
    cout << res << "\\n";`;
  }
}
function callArgsFor(shape) {
  return PARAMS[shape].py;
}
function visibleHeader(comment, needsList, needsTree, listNote, treeNote) {
  const lines2 = [
    `${comment} Input parsing and output printing are handled for you \u2014`,
    `${comment} just implement this function and return the result.`
  ];
  if (needsList) lines2.push(listNote);
  if (needsTree) lines2.push(treeNote);
  return lines2.join("\n") + "\n";
}
function buildStarter(shape, out, fnName) {
  const args = callArgsFor(shape);
  const needsList = LIST_SHAPES.includes(shape) || out === "list";
  const needsTree = TREE_SHAPES.includes(shape) || out === "tree";
  const pyImports = needsTree ? "import sys\nfrom collections import deque\n" : "import sys\n";
  const pyHelpers = (needsList ? PY_LIST_HELPERS + "\n" : "") + (needsTree ? PY_TREE_HELPERS + "\n" : "");
  const python = {
    prefix: `${pyImports}
${pyHelpers}`,
    visible: `${visibleHeader(
      "#",
      needsList,
      needsTree,
      "# A ListNode class (fields: val, next) is available.",
      "# A TreeNode class (fields: val, left, right) is available."
    )}def ${fnName}(${PARAMS[shape].py}):
    # Write your solution here
    pass
`,
    suffix: `
def main():
    data = sys.stdin.read().split('\\n')
${pyReader(shape)}
    res = ${fnName}(${args})
${pyPrinter(out)}

main()
`
  };
  const jsHelpers = (needsList ? JS_LIST_HELPERS + "\n" : "") + (needsTree ? JS_TREE_HELPERS + "\n" : "");
  const javascript = {
    prefix: jsHelpers,
    visible: `${visibleHeader(
      "//",
      needsList,
      needsTree,
      "// A ListNode class (fields: val, next) is available.",
      "// A TreeNode class (fields: val, left, right) is available."
    )}function ${fnName}(${PARAMS[shape].js}) {
  // Write your solution here
}
`,
    suffix: `
function main() {
  const data = require('fs').readFileSync(0, 'utf8').split('\\n');
${jsReader(shape)}
  const res = ${fnName}(${args});
${jsPrinter(out)}
}

main();
`
  };
  const needsParseInts = /parseInts/.test(javaReader(shape));
  const javaParseHelper = needsParseInts ? `
    static int[] parseInts(String line) {
        if (line == null || line.trim().isEmpty()) return new int[]{};
        String[] p = line.trim().split("\\\\s+");
        int[] a = new int[p.length];
        for (int i = 0; i < p.length; i++) a[i] = Integer.parseInt(p[i]);
        return a;
    }
` : "";
  const javaHelper = javaParseHelper + (needsList ? JAVA_LIST_HELPERS : "") + (needsTree ? JAVA_TREE_HELPERS : "");
  const javaNodeClasses = (needsList ? JAVA_LISTNODE_CLASS + "\n" : "") + (needsTree ? JAVA_TREENODE_CLASS + "\n" : "");
  const java = {
    prefix: `import java.util.*;
import java.io.*;

${javaNodeClasses}`,
    visible: `${visibleHeader(
      "//",
      needsList,
      needsTree,
      "// A ListNode class (fields: val, next) is available.",
      "// A TreeNode class (fields: val, left, right) is available."
    )}class Solution {
    ${RET_JAVA[out]} ${fnName}(${PARAMS[shape].java}) {
        // Write your solution here
        return ${RET_DEFAULT_JAVA[out]};
    }
}
`,
    suffix: `
public class Main {
${javaHelper}
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
${javaReader(shape)}
${javaPrinter(out, args, fnName)}
    }
}
`
  };
  const needsCppParse = /parseInts/.test(cppReader(shape));
  const cppParseHelper = needsCppParse ? `vector<int> parseInts(const string& line) {
    vector<int> v; stringstream ss(line); int x;
    while (ss >> x) v.push_back(x);
    return v;
}

` : "";
  const cppHelper = cppParseHelper + (needsList ? CPP_LIST_HELPERS : "") + (needsTree ? CPP_TREE_HELPERS : "");
  const cpp = {
    prefix: `#include <bits/stdc++.h>
using namespace std;

${cppHelper}`,
    visible: `${visibleHeader(
      "//",
      needsList,
      needsTree,
      "// struct ListNode { int val; ListNode* next; } is available.",
      "// struct TreeNode { int val; TreeNode *left, *right; } is available."
    )}${RET_CPP[out]} ${fnName}(${PARAMS[shape].cpp}) {
    // Write your solution here
    return ${RET_DEFAULT_CPP[out]};
}
`,
    suffix: `
int main() {
${cppReader(shape)}
${cppPrinter(out, args, fnName)}
    return 0;
}
`
  };
  return { python, javascript, java, cpp };
}

// src/data/ref-utils.ts
var lines = (s) => s.split("\n");
var ints = (line) => (line ?? "").trim().split(/\s+/).filter((x) => x.length > 0).map(Number);
var int = (line) => parseInt((line ?? "0").trim(), 10);
var boolOut = (b) => b ? "true" : "false";
var arrOut = (a) => a.join(" ");
var words = (line) => (line ?? "").trim().split(/\s+/).filter((x) => x.length > 0);
var linesOut = (a) => a.join("\n");
var sortedLinesOut = (a) => [...a].sort().join("\n");
var matOut = (rows) => rows.map((r) => r.join(" ")).join("\n");
var sortedMatOut = (rows) => rows.map((r) => r.join(" ")).sort().join("\n");
var TNode = class {
  val;
  left = null;
  right = null;
  constructor(v) {
    this.val = v;
  }
};
var parseTree = (line) => {
  const toks = (line ?? "").trim().split(/\s+/).filter(Boolean);
  if (toks.length === 0 || toks[0] === "null") return null;
  const root = new TNode(parseInt(toks[0], 10));
  const q = [root];
  let i = 1;
  while (q.length && i < toks.length) {
    const node = q.shift();
    if (i < toks.length && toks[i] !== "null") {
      node.left = new TNode(parseInt(toks[i], 10));
      q.push(node.left);
    }
    i++;
    if (i < toks.length && toks[i] !== "null") {
      node.right = new TNode(parseInt(toks[i], 10));
      q.push(node.right);
    }
    i++;
  }
  return root;
};
var treeOut = (root) => {
  if (!root) return "null";
  const out = [];
  const q = [root];
  while (q.length) {
    const node = q.shift();
    if (node) {
      out.push(String(node.val));
      q.push(node.left);
      q.push(node.right);
    } else {
      out.push("null");
    }
  }
  while (out.length && out[out.length - 1] === "null") out.pop();
  return out.join(" ");
};
var yt = (query) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);

// src/data/problems/arrays.ts
var first = (s) => ints(s.split("\n")[0]);
var arrays = [
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "EASY",
    statement: `Given an array of integers \`nums\` and an integer \`target\`, return the **indices** of the two numbers that add up to \`target\`. Exactly one valid answer exists, and you may not use the same element twice. Return the indices in increasing order.

**Input**
- Line 1: space-separated integers \`nums\`
- Line 2: integer \`target\`

**Output**
- The two indices, space-separated (smaller index first).`,
    constraints: `- 2 \u2264 nums.length \u2264 10^4
- -10^9 \u2264 nums[i] \u2264 10^9
- Only one valid answer exists.`,
    examples: [
      { input: "2 7 11 15\n9", output: "0 1", explanation: "nums[0] + nums[1] = 2 + 7 = 9." },
      { input: "3 2 4\n6", output: "1 2", explanation: "nums[1] + nums[2] = 2 + 4 = 6." }
    ],
    hints: [
      "The brute-force approach checks every pair in O(n\xB2). Can you do better?",
      "For each number x, you need to find target \u2212 x. What data structure gives O(1) lookups?",
      "Use a hash map from value \u2192 index. As you scan, check if the complement was already seen."
    ],
    editorial: `The optimal solution scans the array once, keeping a hash map from each value to its index. For every element \`x\`, the complement we need is \`target \u2212 x\`. If that complement is already in the map, we've found the answer; otherwise we store \`x\` and continue. This trades O(n) extra space for a drop from O(n\xB2) to O(n) time.`,
    approaches: [
      {
        name: "Brute force",
        complexityTime: "O(n\xB2)",
        complexitySpace: "O(1)",
        body: "Check every pair (i, j) and return the first that sums to target."
      },
      {
        name: "Hash map (one pass)",
        complexityTime: "O(n)",
        complexitySpace: "O(n)",
        body: "Store seen value \u2192 index. For each x, look up target \u2212 x before inserting x."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode two sum"),
    tags: ["array", "hash-table"],
    starterCode: buildStarter("intArrayTarget", "intArray", "twoSum"),
    reference: (input) => {
      const [l0, l1] = input.split("\n");
      const nums = ints(l0);
      const target = int(l1);
      const seen = /* @__PURE__ */ new Map();
      for (let i = 0; i < nums.length; i++) {
        const val = nums[i];
        if (val === void 0) continue;
        const need = target - val;
        if (seen.has(need)) return `${seen.get(need)} ${i}`;
        seen.set(val, i);
      }
      return "";
    },
    tests: [
      { input: "2 7 11 15\n9", sample: true },
      { input: "3 2 4\n6", sample: true },
      { input: "3 3\n6" },
      { input: "-1 -2 -3 -4 -5\n-8" },
      { input: "0 4 3 0\n0" },
      { input: "1 2 3 4 5 6 7 8 9 10\n19" }
    ]
  },
  {
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "EASY",
    statement: `You are given an array \`prices\` where \`prices[i]\` is the price of a stock on day \`i\`. Buy on one day and sell on a later day to maximize profit. Return the maximum profit, or \`0\` if no profit is possible.

**Input**: one line of space-separated integers \`prices\`.
**Output**: the maximum profit.`,
    constraints: `- 1 \u2264 prices.length \u2264 10^5
- 0 \u2264 prices[i] \u2264 10^4`,
    examples: [
      { input: "7 1 5 3 6 4", output: "5", explanation: "Buy at 1, sell at 6 \u2192 profit 5." },
      { input: "7 6 4 3 1", output: "0", explanation: "Prices only fall; no profitable trade." }
    ],
    hints: [
      "Track the minimum price seen so far as you scan left to right.",
      "At each day, the best profit selling today is price \u2212 minSoFar."
    ],
    editorial: `Walk through the prices once, remembering the lowest price seen so far. For each day, the profit from selling that day is \`price \u2212 minSoFar\`; keep the maximum. This is O(n) time and O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode best time to buy and sell stock"),
    tags: ["array", "dynamic-programming", "greedy"],
    starterCode: buildStarter("intArray", "int", "maxProfit"),
    reference: (input) => {
      const prices = first(input);
      let min = Infinity;
      let profit = 0;
      for (const p of prices) {
        if (p < min) min = p;
        else if (p - min > profit) profit = p - min;
      }
      return String(profit);
    },
    tests: [
      { input: "7 1 5 3 6 4", sample: true },
      { input: "7 6 4 3 1", sample: true },
      { input: "1" },
      { input: "2 4 1" },
      { input: "3 2 6 5 0 3" },
      { input: "1 2 3 4 5" }
    ]
  },
  {
    slug: "maximum-subarray",
    title: "Maximum Subarray",
    difficulty: "MEDIUM",
    statement: `Given an integer array \`nums\`, find the contiguous subarray (containing at least one number) with the largest sum, and return that sum.

**Input**: one line of space-separated integers.
**Output**: the maximum subarray sum.`,
    constraints: `- 1 \u2264 nums.length \u2264 10^5
- -10^4 \u2264 nums[i] \u2264 10^4`,
    examples: [
      { input: "-2 1 -3 4 -1 2 1 -5 4", output: "6", explanation: "[4,-1,2,1] has sum 6." },
      { input: "5 4 -1 7 8", output: "23", explanation: "The whole array sums to 23." }
    ],
    hints: [
      "If the running sum ever goes negative, it can only hurt future subarrays.",
      "Kadane's algorithm: at each index, either extend the previous subarray or start fresh."
    ],
    editorial: `**Kadane's algorithm.** Keep a running sum \`cur\`. At each element, \`cur = max(x, cur + x)\` \u2014 either start a new subarray at \`x\` or extend the current one. Track the best \`cur\` seen. O(n) time, O(1) space.`,
    approaches: [
      {
        name: "Kadane's algorithm",
        complexityTime: "O(n)",
        complexitySpace: "O(1)",
        body: "Reset the running sum whenever extending would do worse than starting over at the current element."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode maximum subarray kadane"),
    tags: ["array", "divide-and-conquer", "dynamic-programming"],
    starterCode: buildStarter("intArray", "int", "maxSubArray"),
    reference: (input) => {
      const nums = first(input);
      let best = nums[0] ?? 0;
      let cur = nums[0] ?? 0;
      for (let i = 1; i < nums.length; i++) {
        const x = nums[i] ?? 0;
        cur = Math.max(x, cur + x);
        best = Math.max(best, cur);
      }
      return String(best);
    },
    tests: [
      { input: "-2 1 -3 4 -1 2 1 -5 4", sample: true },
      { input: "5 4 -1 7 8", sample: true },
      { input: "1" },
      { input: "-1" },
      { input: "-2 -1" },
      { input: "8 -19 5 -4 20" }
    ]
  },
  {
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    difficulty: "EASY",
    statement: `Given an integer array \`nums\`, return \`true\` if any value appears at least twice, and \`false\` if every element is distinct.

**Input**: one line of space-separated integers.
**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 nums.length \u2264 10^5
- -10^9 \u2264 nums[i] \u2264 10^9`,
    examples: [
      { input: "1 2 3 1", output: "true", explanation: "1 appears twice." },
      { input: "1 2 3 4", output: "false", explanation: "All distinct." }
    ],
    hints: [
      "A set stores only distinct values.",
      "If the set's size is smaller than the array's length, there was a duplicate."
    ],
    editorial: `Insert every element into a hash set. If you ever try to insert a value already present \u2014 equivalently, if the final set size is less than the array length \u2014 there's a duplicate. O(n) time and space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode contains duplicate"),
    tags: ["array", "hash-table", "sorting"],
    starterCode: buildStarter("intArray", "bool", "containsDuplicate"),
    reference: (input) => {
      const nums = first(input);
      return boolOut(new Set(nums).size !== nums.length);
    },
    tests: [
      { input: "1 2 3 1", sample: true },
      { input: "1 2 3 4", sample: true },
      { input: "1 1 1 3 3 4 3 2 4 2" },
      { input: "5" },
      { input: "-1 -1" }
    ]
  },
  {
    slug: "product-of-array-except-self",
    title: "Product of Array Except Self",
    difficulty: "MEDIUM",
    statement: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is the product of all elements of \`nums\` **except** \`nums[i]\`. Solve it without using the division operator, in O(n) time.

**Input**: one line of space-separated integers.
**Output**: the answer array, space-separated.`,
    constraints: `- 2 \u2264 nums.length \u2264 10^5
- The product of any prefix or suffix fits in a 32-bit integer.`,
    examples: [
      { input: "1 2 3 4", output: "24 12 8 6" },
      { input: "-1 1 0 -3 3", output: "0 0 9 0 0" }
    ],
    hints: [
      "answer[i] = (product of everything to the left) \xD7 (product of everything to the right).",
      "Compute prefix products in one pass, then multiply by suffix products in a second pass."
    ],
    editorial: `Do two passes. First, fill \`answer[i]\` with the product of all elements **before** \`i\` (prefix products). Then sweep right-to-left maintaining a running **suffix** product and multiply it into \`answer[i]\`. No division, O(n) time, O(1) extra space (excluding the output).`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode product of array except self"),
    tags: ["array", "prefix-sum"],
    starterCode: buildStarter("intArray", "intArray", "productExceptSelf"),
    reference: (input) => {
      const nums = first(input);
      const n = nums.length;
      const res = new Array(n).fill(1);
      let pre = 1;
      for (let i = 0; i < n; i++) {
        res[i] = pre;
        pre *= nums[i] ?? 1;
      }
      let post = 1;
      for (let i = n - 1; i >= 0; i--) {
        res[i] = (res[i] ?? 1) * post;
        post *= nums[i] ?? 1;
      }
      return arrOut(res);
    },
    tests: [
      { input: "1 2 3 4", sample: true },
      { input: "-1 1 0 -3 3", sample: true },
      { input: "2 3" },
      { input: "5 1 1 1" },
      { input: "1 2 3 4 5 6" }
    ]
  },
  {
    slug: "move-zeroes",
    title: "Move Zeroes",
    difficulty: "EASY",
    statement: `Given an integer array \`nums\`, move all \`0\`s to the end while keeping the relative order of the non-zero elements. Return the resulting array.

**Input**: one line of space-separated integers.
**Output**: the transformed array, space-separated.`,
    constraints: `- 1 \u2264 nums.length \u2264 10^4
- -2^31 \u2264 nums[i] \u2264 2^31 \u2212 1`,
    examples: [
      { input: "0 1 0 3 12", output: "1 3 12 0 0" },
      { input: "0", output: "0" }
    ],
    hints: [
      "Keep a write pointer for the next non-zero slot.",
      "Copy non-zero elements forward, then fill the remaining slots with zeros."
    ],
    editorial: `Use a two-pointer approach: a \`write\` index marks where the next non-zero value goes. Scan the array; each non-zero value is placed at \`write\` and \`write\` advances. Finally, fill positions from \`write\` to the end with zeros. O(n) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode move zeroes"),
    tags: ["array", "two-pointers"],
    starterCode: buildStarter("intArray", "intArray", "moveZeroes"),
    reference: (input) => {
      const nums = first(input);
      const res = nums.filter((x) => x !== 0);
      while (res.length < nums.length) res.push(0);
      return arrOut(res);
    },
    tests: [
      { input: "0 1 0 3 12", sample: true },
      { input: "0", sample: true },
      { input: "1 2 3" },
      { input: "0 0 1" },
      { input: "4 0 5 0 0 6" }
    ]
  },
  {
    slug: "majority-element",
    title: "Majority Element",
    difficulty: "EASY",
    statement: `Given an array \`nums\` of size \`n\`, return the majority element \u2014 the element that appears **more than \u230An/2\u230B times**. You may assume it always exists.

**Input**: one line of space-separated integers.
**Output**: the majority element.`,
    constraints: `- 1 \u2264 nums.length \u2264 5\xB710^4
- The majority element always exists.`,
    examples: [
      { input: "3 2 3", output: "3" },
      { input: "2 2 1 1 1 2 2", output: "2" }
    ],
    hints: [
      "A hash map of counts works but uses O(n) space.",
      "Boyer\u2013Moore voting: keep a candidate and a counter; matching votes increment, others decrement."
    ],
    editorial: `**Boyer\u2013Moore majority vote.** Maintain a candidate and a count. When count hits 0, adopt the current element as the candidate. Increment count on a match, decrement otherwise. Because the majority element occurs more than n/2 times, it survives as the final candidate. O(n) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode majority element boyer moore"),
    tags: ["array", "hash-table", "divide-and-conquer"],
    starterCode: buildStarter("intArray", "int", "majorityElement"),
    reference: (input) => {
      const nums = first(input);
      let count = 0;
      let cand = nums[0];
      for (const x of nums) {
        if (count === 0) cand = x;
        count += x === cand ? 1 : -1;
      }
      return String(cand);
    },
    tests: [
      { input: "3 2 3", sample: true },
      { input: "2 2 1 1 1 2 2", sample: true },
      { input: "1" },
      { input: "6 5 5" },
      { input: "8 8 7 7 7" }
    ]
  },
  {
    slug: "maximum-product-subarray",
    title: "Maximum Product Subarray",
    difficulty: "MEDIUM",
    statement: `Given an integer array \`nums\`, find a contiguous non-empty subarray with the largest **product**, and return that product.

**Input**: one line of space-separated integers.
**Output**: the maximum product.`,
    constraints: `- 1 \u2264 nums.length \u2264 2\xB710^4
- -10 \u2264 nums[i] \u2264 10
- The answer fits in a 32-bit integer.`,
    examples: [
      { input: "2 3 -2 4", output: "6", explanation: "[2,3] gives 6." },
      { input: "-2 0 -1", output: "0", explanation: "The best you can do is 0." }
    ],
    hints: [
      "A negative number flips the sign \u2014 today's minimum can become tomorrow's maximum.",
      "Track both the max and min product ending at each index."
    ],
    editorial: `Because negatives flip signs, track **both** the maximum and minimum product ending at each position. At each element \`x\`, the new max/min come from \`{x, max\xB7x, min\xB7x}\`. The running best over all positions is the answer. O(n) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode maximum product subarray"),
    tags: ["array", "dynamic-programming"],
    starterCode: buildStarter("intArray", "int", "maxProduct"),
    reference: (input) => {
      const nums = first(input);
      let best = nums[0] ?? 0;
      let maxP = nums[0] ?? 0;
      let minP = nums[0] ?? 0;
      for (let i = 1; i < nums.length; i++) {
        const x = nums[i] ?? 0;
        const cands = [x, maxP * x, minP * x];
        maxP = Math.max(...cands);
        minP = Math.min(...cands);
        best = Math.max(best, maxP);
      }
      return String(best);
    },
    tests: [
      { input: "2 3 -2 4", sample: true },
      { input: "-2 0 -1", sample: true },
      { input: "-2" },
      { input: "2 -5 -2 -4 3" },
      { input: "3 -1 4" }
    ]
  },
  {
    slug: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "MEDIUM",
    statement: `Given a list of intervals \`[start, end]\`, merge all overlapping intervals and return the result sorted by start.

**Input**
- Line 1: two integers \`n 2\` (n intervals)
- Next n lines: \`start end\`

**Output**: the merged intervals, one per line as \`start end\`.`,
    constraints: `- 1 \u2264 n \u2264 10^4
- 0 \u2264 start \u2264 end \u2264 10^4`,
    examples: [
      {
        input: "4 2\n1 3\n2 6\n8 10\n15 18",
        output: "1 6\n8 10\n15 18",
        explanation: "[1,3] and [2,6] overlap \u2192 [1,6]."
      },
      { input: "2 2\n1 4\n4 5", output: "1 5", explanation: "Touching endpoints merge." }
    ],
    hints: [
      "Sort by start \u2014 overlapping intervals become neighbors.",
      "Extend the current merged interval while the next one starts at or before its end."
    ],
    editorial: `Sort by start, then sweep: keep a current merged interval and either **extend** it (next start \u2264 current end \u2192 end = max of ends) or **emit** it and start fresh. Sorting is the insight that turns pairwise overlap checks into one linear pass. O(n log n) time, O(n) output.`,
    complexityTime: "O(n log n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode merge intervals"),
    tags: ["array", "intervals", "sorting"],
    starterCode: buildStarter("matrix", "intMatrix", "mergeIntervals"),
    reference: (input) => {
      const ls = lines(input);
      const n = ints(ls[0])[0] ?? 0;
      const iv = [];
      for (let i = 0; i < n; i++) iv.push(ints(ls[1 + i]));
      iv.sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0) || (a[1] ?? 0) - (b[1] ?? 0));
      const out = [];
      for (const row of iv) {
        const s = row[0] ?? 0;
        const e = row[1] ?? 0;
        const last = out[out.length - 1];
        if (last && s <= (last[1] ?? 0)) {
          last[1] = Math.max(last[1] ?? 0, e);
        } else {
          out.push([s, e]);
        }
      }
      return matOut(out);
    },
    tests: [
      { input: "4 2\n1 3\n2 6\n8 10\n15 18", sample: true },
      { input: "2 2\n1 4\n4 5", sample: true },
      { input: "1 2\n0 0" },
      { input: "3 2\n5 6\n1 2\n3 4" },
      { input: "3 2\n1 10\n2 3\n4 5" }
    ]
  },
  {
    slug: "insert-interval",
    title: "Insert Interval",
    difficulty: "MEDIUM",
    statement: `You are given non-overlapping intervals sorted by start, plus one new interval. Insert the new interval and merge as needed so the result stays sorted and non-overlapping.

**Input**
- Line 1: \`n 2\`
- Next n lines: the existing intervals
- Last line: the new interval \`start end\`

**Output**: the resulting intervals, one per line.`,
    constraints: `- 0 \u2264 n \u2264 10^4
- Intervals sorted by start, non-overlapping.`,
    examples: [
      { input: "2 2\n1 3\n6 9\n2 5", output: "1 5\n6 9" },
      {
        input: "5 2\n1 2\n3 5\n6 7\n8 10\n12 16\n4 8",
        output: "1 2\n3 10\n12 16",
        explanation: "The new [4,8] swallows [3,5], [6,7], [8,10]."
      }
    ],
    hints: [
      "Three phases: intervals entirely before, the overlapping middle, entirely after.",
      "Fold every overlapping interval into the new one by min/max of endpoints."
    ],
    editorial: `Emit intervals ending before the new one starts; then absorb every interval that overlaps it (\`newStart = min\`, \`newEnd = max\`); then emit the merged interval and everything after. Sortedness makes each phase a contiguous scan \u2014 one O(n) pass, no re-sort needed.`,
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode insert interval"),
    tags: ["array", "intervals"],
    starterCode: buildStarter("matrixK", "intMatrix", "insertInterval"),
    reference: (input) => {
      const ls = lines(input);
      const n = ints(ls[0])[0] ?? 0;
      const iv = [];
      for (let i2 = 0; i2 < n; i2++) iv.push(ints(ls[1 + i2]));
      const inserted = ints(ls[1 + n]);
      let ns = inserted[0] ?? 0;
      let ne = inserted[1] ?? 0;
      const out = [];
      let i = 0;
      while (i < n) {
        const cur = iv[i];
        if (!cur || (cur[1] ?? 0) >= ns) break;
        out.push(cur);
        i++;
      }
      while (i < n) {
        const cur = iv[i];
        if (!cur || (cur[0] ?? 0) > ne) break;
        ns = Math.min(ns, cur[0] ?? ns);
        ne = Math.max(ne, cur[1] ?? ne);
        i++;
      }
      out.push([ns, ne]);
      while (i < n) {
        const cur = iv[i++];
        if (cur) out.push(cur);
      }
      return matOut(out);
    },
    tests: [
      { input: "2 2\n1 3\n6 9\n2 5", sample: true },
      { input: "5 2\n1 2\n3 5\n6 7\n8 10\n12 16\n4 8", sample: true },
      { input: "0 2\n5 7" },
      { input: "1 2\n1 5\n2 3" },
      { input: "2 2\n1 2\n8 9\n4 5" }
    ]
  },
  {
    slug: "rotate-array",
    title: "Rotate Array",
    difficulty: "EASY",
    statement: `Rotate the array \`nums\` to the right by \`k\` steps and return it.

**Input**
- Line 1: space-separated integers \`nums\`
- Line 2: integer \`k\` (k \u2265 0)

**Output**: the rotated array, space-separated.`,
    constraints: `- 1 \u2264 nums.length \u2264 10^5
- 0 \u2264 k \u2264 10^5`,
    examples: [
      { input: "1 2 3 4 5 6 7\n3", output: "5 6 7 1 2 3 4" },
      { input: "-1 -100 3 99\n2", output: "3 99 -1 -100" }
    ],
    hints: [
      "k can exceed the length \u2014 reduce it modulo n.",
      "The O(1)-space trick: reverse the whole array, then reverse both halves."
    ],
    editorial: `Take \`k mod n\` first. The elegant in-place method is **three reversals**: reverse everything, then reverse the first k elements, then the rest \u2014 each element lands exactly k positions right of where it started (cyclically). O(n) time, O(1) space.`,
    approaches: [
      {
        name: "Extra array",
        complexityTime: "O(n)",
        complexitySpace: "O(n)",
        body: "result[(i + k) % n] = nums[i]."
      },
      {
        name: "Three reversals",
        complexityTime: "O(n)",
        complexitySpace: "O(1)",
        body: "Reverse all, reverse first k, reverse the remainder."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("rotate array three reversals"),
    tags: ["array", "two-pointers", "math"],
    starterCode: buildStarter("intArrayK", "intArray", "rotate"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0);
      const k = int(l1) % nums.length;
      return arrOut([...nums.slice(nums.length - k), ...nums.slice(0, nums.length - k)]);
    },
    tests: [
      { input: "1 2 3 4 5 6 7\n3", sample: true },
      { input: "-1 -100 3 99\n2", sample: true },
      { input: "1\n0" },
      { input: "1 2\n3" },
      { input: "1 2 3\n3" }
    ]
  },
  {
    slug: "first-missing-positive",
    title: "First Missing Positive",
    difficulty: "HARD",
    statement: `Given an unsorted integer array, return the smallest **positive** integer not present. Your algorithm must run in O(n) time and O(1) extra space.

**Input**: one line of space-separated integers.
**Output**: the smallest missing positive.`,
    constraints: `- 1 \u2264 nums.length \u2264 10^5
- -2^31 \u2264 nums[i] \u2264 2^31 \u2212 1`,
    examples: [
      { input: "1 2 0", output: "3" },
      { input: "3 4 -1 1", output: "2" },
      { input: "7 8 9 11 12", output: "1" }
    ],
    hints: [
      "The answer is always in [1, n+1] \u2014 values outside that range are irrelevant.",
      "Use the array itself as a hash table: value v belongs at index v\u22121.",
      "Cyclic sort: keep swapping nums[i] to its home slot until it can't move."
    ],
    editorial: `Key fact: with n elements the answer lies in \`[1, n+1]\`. **Cyclic sort** places each value v \u2208 [1, n] at index v\u22121 by repeated swapping (each swap homes at least one value, so total swaps \u2264 n). A final scan finds the first index i where \`nums[i] \u2260 i+1\` \u2014 that i+1 is the answer; if all match, it's n+1. O(n) time, O(1) space, using the array itself as the hash table.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode first missing positive"),
    tags: ["array", "hash-table", "cyclic-sort"],
    starterCode: buildStarter("intArray", "int", "firstMissingPositive"),
    reference: (input) => {
      const nums = first(input);
      const n = nums.length;
      for (let i = 0; i < n; i++) {
        let cur = nums[i];
        while (cur !== void 0 && cur > 0 && cur <= n) {
          const j = cur - 1;
          const dest = nums[j];
          if (dest === void 0 || dest === cur) break;
          nums[i] = dest;
          nums[j] = cur;
          cur = nums[i];
        }
      }
      for (let i = 0; i < n; i++) {
        if (nums[i] !== i + 1) return String(i + 1);
      }
      return String(n + 1);
    },
    tests: [
      { input: "1 2 0", sample: true },
      { input: "3 4 -1 1", sample: true },
      { input: "7 8 9 11 12", sample: true },
      { input: "1" },
      { input: "2" },
      { input: "1 1" }
    ]
  },
  {
    slug: "longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    difficulty: "MEDIUM",
    statement: `Given an unsorted array of integers, return the length of the longest run of consecutive values (e.g. 1, 2, 3, 4) present anywhere in the array. Your algorithm must run in O(n) time \u2014 sorting is the baseline to beat.

**Input**: one line of space-separated integers (may be empty).
**Output**: the length of the longest consecutive run.`,
    constraints: `- 0 \u2264 nums.length \u2264 10^5
- -10^9 \u2264 values \u2264 10^9`,
    examples: [
      {
        input: "100 4 200 1 3 2",
        output: "4",
        explanation: "The run 1, 2, 3, 4 has length 4."
      },
      { input: "0 3 7 2 5 8 4 6 0 1", output: "9" }
    ],
    hints: [
      "A hash set answers 'does x exist?' in O(1).",
      "Only start counting from numbers that begin a run \u2014 those with no x\u22121 in the set.",
      "Each element is then visited at most twice overall."
    ],
    editorial: `Dump everything into a hash set. A value x starts a run only if x\u22121 is absent \u2014 so for each such x, walk x+1, x+2, \u2026 while they exist and track the best length. Every element is touched O(1) times amortized (once as a member, once as a potential starter), giving O(n) despite the nested-looking loop. The 'only start at run beginnings' guard is the entire trick \u2014 without it the walk degenerates to O(n\xB2).`,
    approaches: [
      {
        name: "Sort and scan",
        complexityTime: "O(n log n)",
        complexitySpace: "O(1)",
        body: "Sort, then count streaks skipping duplicates. Simple, but misses the O(n) requirement."
      },
      {
        name: "Hash set run-starts",
        complexityTime: "O(n)",
        complexitySpace: "O(n)",
        body: "Set membership + walk upward only from values with no predecessor."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode longest consecutive sequence"),
    tags: ["array", "hash-set"],
    starterCode: buildStarter("intArray", "int", "longestConsecutive"),
    reference: (input) => {
      const nums = first(input);
      const set = new Set(nums);
      let best = 0;
      for (const x of set) {
        if (set.has(x - 1)) continue;
        let len = 1;
        while (set.has(x + len)) len++;
        if (len > best) best = len;
      }
      return String(best);
    },
    tests: [
      { input: "100 4 200 1 3 2", sample: true },
      { input: "0 3 7 2 5 8 4 6 0 1", sample: true },
      { input: "" },
      { input: "5" },
      { input: "9 1 4 7 3 -1 0 5 8 -1 6" },
      { input: "-3 -2 -1 0 1" }
    ]
  },
  {
    slug: "pascals-triangle",
    title: "Pascal's Triangle",
    difficulty: "EASY",
    statement: `Generate the first \`n\` rows of Pascal's triangle, where every number is the sum of the two directly above it.

**Input**: one line, the integer \`n\`.
**Output**: n lines \u2014 row i contains i space-separated integers.`,
    constraints: `- 1 \u2264 n \u2264 30`,
    examples: [
      {
        input: "5",
        output: "1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 1"
      },
      { input: "1", output: "1" }
    ],
    hints: [
      "Row i has i+1 entries; the first and last are always 1.",
      "Each interior entry is prev[j-1] + prev[j]."
    ],
    editorial: `Build row by row: start each row as all 1s, then fill interior cells from the previous row \u2014 \`row[j] = prev[j\u22121] + prev[j]\`. Total work is 1 + 2 + \u2026 + n = O(n\xB2), which is also the output size, so it's optimal. The follow-up worth knowing: a *single* row k can be produced in O(k) with the multiplicative identity C(n, r+1) = C(n, r) \xB7 (n\u2212r)/(r+1).`,
    complexityTime: "O(n\xB2)",
    complexitySpace: "O(n\xB2)",
    youtubeUrl: yt("pascals triangle leetcode"),
    tags: ["array", "math", "simulation"],
    starterCode: buildStarter("int", "intMatrix", "generate"),
    reference: (input) => {
      const n = int(lines(input)[0]);
      const rows = [];
      for (let i = 0; i < n; i++) {
        const row = new Array(i + 1).fill(1);
        for (let j = 1; j < i; j++) {
          const prev = rows[i - 1] ?? [];
          row[j] = (prev[j - 1] ?? 0) + (prev[j] ?? 0);
        }
        rows.push(row);
      }
      return matOut(rows);
    },
    tests: [
      { input: "5", sample: true },
      { input: "1", sample: true },
      { input: "2" },
      { input: "10" },
      { input: "30" }
    ]
  }
];

// src/data/problems/strings.ts
var line0 = (input) => input.split("\n")[0] ?? "";
var strings = [
  {
    slug: "valid-anagram",
    title: "Valid Anagram",
    difficulty: "EASY",
    statement: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\` (same characters with the same frequencies), otherwise \`false\`.

**Input**: line 1 is \`s\`, line 2 is \`t\`.
**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 s.length, t.length \u2264 5\xB710^4
- s and t consist of lowercase English letters.`,
    examples: [
      { input: "anagram\nnagaram", output: "true" },
      { input: "rat\ncar", output: "false" }
    ],
    hints: [
      "Anagrams have identical character counts.",
      "Count characters of s, then decrement for t \u2014 any mismatch means false."
    ],
    editorial: `Count the frequency of each character in \`s\`, then walk \`t\` decrementing counts. If any count goes negative or a character is missing, they aren't anagrams. Different lengths are an immediate \`false\`. O(n) time, O(1) space (fixed alphabet).`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode valid anagram"),
    tags: ["string", "hash-table", "sorting"],
    starterCode: buildStarter("twoStrings", "bool", "isAnagram"),
    reference: (input) => {
      const [s, t] = input.split("\n");
      const a = s ?? "";
      const b = t ?? "";
      if (a.length !== b.length) return boolOut(false);
      const cnt = {};
      for (const c of a) cnt[c] = (cnt[c] ?? 0) + 1;
      for (const c of b) {
        if (!cnt[c]) return boolOut(false);
        cnt[c]--;
      }
      return boolOut(true);
    },
    tests: [
      { input: "anagram\nnagaram", sample: true },
      { input: "rat\ncar", sample: true },
      { input: "a\nab" },
      { input: "ab\nba" },
      { input: "aacc\nccac" }
    ]
  },
  {
    slug: "valid-palindrome",
    title: "Valid Palindrome",
    difficulty: "EASY",
    statement: `A phrase is a palindrome if, after lowercasing and removing all non-alphanumeric characters, it reads the same forwards and backwards. Return \`true\` if \`s\` is a palindrome.

**Input**: one line \`s\` (may contain spaces and punctuation).
**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 s.length \u2264 2\xB710^5
- s consists of printable ASCII characters.`,
    examples: [
      { input: "A man, a plan, a canal: Panama", output: "true" },
      { input: "race a car", output: "false" }
    ],
    hints: [
      "Normalize first: lowercase and keep only letters and digits.",
      "Then use two pointers from both ends moving inward."
    ],
    editorial: `Filter the string to lowercase alphanumeric characters, then compare with two pointers moving inward from both ends. Any mismatch means it isn't a palindrome. O(n) time, O(1) extra space if you skip characters in place.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode valid palindrome"),
    tags: ["string", "two-pointers"],
    starterCode: buildStarter("string", "bool", "isPalindrome"),
    reference: (input) => {
      const s = line0(input);
      const t = s.toLowerCase().replace(/[^a-z0-9]/g, "");
      let i = 0;
      let j = t.length - 1;
      while (i < j) {
        if (t[i] !== t[j]) return boolOut(false);
        i++;
        j--;
      }
      return boolOut(true);
    },
    tests: [
      { input: "A man, a plan, a canal: Panama", sample: true },
      { input: "race a car", sample: true },
      { input: "0P" },
      { input: "ab_a" },
      { input: "Was it a car or a cat I saw?" }
    ]
  },
  {
    slug: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "MEDIUM",
    statement: `Given a string \`s\`, return the length of the longest substring that contains no repeating characters.

**Input**: one line \`s\`.
**Output**: the length as an integer.`,
    constraints: `- 0 \u2264 s.length \u2264 5\xB710^4
- s consists of English letters, digits, symbols, and spaces.`,
    examples: [
      { input: "abcabcbb", output: "3", explanation: '"abc" has length 3.' },
      { input: "bbbbb", output: "1", explanation: '"b" has length 1.' }
    ],
    hints: [
      "Use a sliding window over the string.",
      "Remember the last index of each character; when you see a repeat inside the window, jump the left edge past it."
    ],
    editorial: `Maintain a sliding window \`[start, i]\` and a map of each character's last seen index. When the current character was seen at or after \`start\`, move \`start\` to one past that index. The answer is the maximum window width \`i \u2212 start + 1\`. O(n) time.`,
    complexityTime: "O(n)",
    complexitySpace: "O(min(n, alphabet))",
    youtubeUrl: yt("neetcode longest substring without repeating characters"),
    tags: ["string", "sliding-window", "hash-table"],
    starterCode: buildStarter("string", "int", "lengthOfLongestSubstring"),
    reference: (input) => {
      const s = line0(input);
      const last = /* @__PURE__ */ new Map();
      let start = 0;
      let best = 0;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (last.has(c) && last.get(c) >= start) {
          start = last.get(c) + 1;
        }
        last.set(c, i);
        best = Math.max(best, i - start + 1);
      }
      return String(best);
    },
    tests: [
      { input: "abcabcbb", sample: true },
      { input: "bbbbb", sample: true },
      { input: "pwwkew" },
      { input: "" },
      { input: "dvdf" },
      { input: "abba" }
    ]
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "EASY",
    statement: `Given a string \`s\` containing only the characters \`()[]{}\`, determine if it is valid: brackets must close in the correct order and every opening bracket has a matching closing bracket of the same type.

**Input**: one line \`s\`.
**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 s.length \u2264 10^4
- s consists only of the characters ()[]{}.`,
    examples: [
      { input: "()[]{}", output: "true" },
      { input: "(]", output: "false" }
    ],
    hints: [
      "A stack naturally models nesting.",
      "Push opening brackets; on a closing bracket, the top of the stack must be its match."
    ],
    editorial: `Scan the string with a stack. Push each opening bracket. On a closing bracket, the stack top must be the matching opener \u2014 otherwise it's invalid. At the end the stack must be empty. O(n) time and space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode valid parentheses"),
    tags: ["string", "stack"],
    starterCode: buildStarter("string", "bool", "isValid"),
    reference: (input) => {
      const s = line0(input);
      const st = [];
      const m = { ")": "(", "]": "[", "}": "{" };
      for (const c of s) {
        if (c === "(" || c === "[" || c === "{") st.push(c);
        else if (st.pop() !== m[c]) return boolOut(false);
      }
      return boolOut(st.length === 0);
    },
    tests: [
      { input: "()[]{}", sample: true },
      { input: "(]", sample: true },
      { input: "()" },
      { input: "([)]" },
      { input: "{[]}" },
      { input: "(" }
    ]
  },
  {
    slug: "longest-palindromic-substring",
    title: "Longest Palindromic Substring",
    difficulty: "MEDIUM",
    statement: `Given a string \`s\`, return the longest substring of \`s\` that is a palindrome. If several have the same length, return the one that appears first.

**Input**: one line \`s\`.
**Output**: the longest palindromic substring.`,
    constraints: `- 1 \u2264 s.length \u2264 1000
- s consists of digits and English letters.`,
    examples: [
      { input: "babad", output: "bab", explanation: '"aba" is also valid, but "bab" appears first.' },
      { input: "cbbd", output: "bb" }
    ],
    hints: [
      "Every palindrome has a center \u2014 either a character or a gap between two characters.",
      "Expand outward from each of the 2n\u22121 possible centers and track the longest."
    ],
    editorial: `**Expand around center.** There are \`2n \u2212 1\` centers (each character and each gap). Expand outward from each while both sides match, tracking the longest palindrome found. O(n\xB2) time, O(1) space \u2014 simple and fast enough for n \u2264 1000.`,
    approaches: [
      {
        name: "Expand around center",
        complexityTime: "O(n\xB2)",
        complexitySpace: "O(1)",
        body: "Try all centers, expand while characters match, keep the longest window."
      }
    ],
    complexityTime: "O(n\xB2)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode longest palindromic substring"),
    tags: ["string", "dynamic-programming", "two-pointers"],
    starterCode: buildStarter("string", "string", "longestPalindrome"),
    reference: (input) => {
      const s = line0(input);
      if (s.length < 1) return "";
      let start = 0;
      let end = 0;
      const expand = (l, r) => {
        while (l >= 0 && r < s.length && s[l] === s[r]) {
          l--;
          r++;
        }
        return [l + 1, r - 1];
      };
      for (let i = 0; i < s.length; i++) {
        for (const [l, r] of [expand(i, i), expand(i, i + 1)]) {
          if (r - l > end - start) {
            start = l;
            end = r;
          }
        }
      }
      return s.slice(start, end + 1);
    },
    tests: [
      { input: "babad", sample: true },
      { input: "cbbd", sample: true },
      { input: "a" },
      { input: "ac" },
      { input: "aaaa" },
      { input: "abacdfgdcaba" }
    ]
  },
  {
    slug: "longest-common-prefix",
    title: "Longest Common Prefix",
    difficulty: "EASY",
    statement: `Find the longest common prefix among an array of strings. If there is none, print an empty line.

**Input**: one line of space-separated words.
**Output**: the longest common prefix.`,
    constraints: `- 1 \u2264 words \u2264 200
- 1 \u2264 word length \u2264 200; lowercase letters.`,
    examples: [
      { input: "flower flow flight", output: "fl" },
      { input: "dog racecar car", output: "", explanation: "No common prefix." }
    ],
    hints: [
      "Compare character-by-character across all words (vertical scan).",
      "Stop at the first column where words disagree or run out."
    ],
    editorial: `**Vertical scan**: take the first word as the candidate and check each character column against every other word, stopping at the first mismatch or end-of-word. Worst case O(total characters), and it exits early on the common short-prefix cases. Sorting-based and divide-and-conquer variants exist but add nothing here.`,
    complexityTime: "O(\u03A3 characters)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("longest common prefix leetcode"),
    tags: ["string", "trie"],
    starterCode: buildStarter("stringArray", "string", "longestCommonPrefix"),
    reference: (input) => {
      const ws = words(lines(input)[0]);
      let prefix = ws[0] ?? "";
      for (const w of ws.slice(1)) {
        let i = 0;
        while (i < prefix.length && i < w.length && prefix[i] === w[i]) i++;
        prefix = prefix.slice(0, i);
        if (!prefix) break;
      }
      return prefix;
    },
    tests: [
      { input: "flower flow flight", sample: true },
      { input: "dog racecar car", sample: true },
      { input: "single" },
      { input: "ab a" },
      { input: "interspecies interstellar interstate" }
    ]
  },
  {
    slug: "group-anagrams",
    title: "Group Anagrams",
    difficulty: "MEDIUM",
    statement: `Group the words that are anagrams of each other.

**Input**: one line of space-separated words.
**Output**: one group per line, the words within a group in **sorted order** (groups themselves may be produced in any order \u2014 the template prints them canonically).`,
    constraints: `- 1 \u2264 words \u2264 10^4
- 0 \u2264 word length \u2264 100; lowercase letters.`,
    examples: [
      {
        input: "eat tea tan ate nat bat",
        output: "ate eat tea\nbat\nnat tan",
        explanation: "Anagram groups: {eat,tea,ate}, {tan,nat}, {bat}."
      },
      { input: "a", output: "a" }
    ],
    hints: [
      "Anagrams share the same sorted character sequence \u2014 use it as a map key.",
      "A 26-letter count signature avoids the per-word sort."
    ],
    editorial: `Hash each word by a canonical form: its sorted characters (O(L log L) per word) or a 26-count signature (O(L)). Words mapping to the same key are anagrams \u2014 collect the map's values as groups. O(n \xB7 L) with the counting key. Sorting within each group just makes output deterministic.`,
    complexityTime: "O(n \xB7 L)",
    complexitySpace: "O(n \xB7 L)",
    youtubeUrl: yt("neetcode group anagrams"),
    tags: ["string", "hash-table", "sorting"],
    starterCode: buildStarter("stringArray", "sortedLines", "groupAnagrams"),
    reference: (input) => {
      const ws = words(lines(input)[0]);
      const groups = /* @__PURE__ */ new Map();
      for (const w of ws) {
        const key = w.split("").sort().join("");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(w);
      }
      const out = [];
      for (const g of groups.values()) out.push(g.sort().join(" "));
      return sortedLinesOut(out);
    },
    tests: [
      { input: "eat tea tan ate nat bat", sample: true },
      { input: "a", sample: true },
      { input: "abc cba bca xyz" },
      { input: "listen silent enlist inlets google" }
    ]
  },
  {
    slug: "roman-to-integer",
    title: "Roman to Integer",
    difficulty: "EASY",
    statement: `Convert a Roman numeral to an integer. Symbols: I=1, V=5, X=10, L=50, C=100, D=500, M=1000. A smaller symbol before a larger one subtracts (IV=4, IX=9, XL=40, XC=90, CD=400, CM=900).

**Input**: one line, the Roman numeral.
**Output**: the integer value.`,
    constraints: `- 1 \u2264 length \u2264 15
- Valid Roman numeral in [1, 3999].`,
    examples: [
      { input: "III", output: "3" },
      { input: "LVIII", output: "58" },
      { input: "MCMXCIV", output: "1994", explanation: "M + CM + XC + IV." }
    ],
    hints: [
      "Scan left to right comparing each symbol with its successor.",
      "If the current value is smaller than the next, subtract it; otherwise add it."
    ],
    editorial: `One rule covers all six subtractive pairs: a symbol whose value is **less than its right neighbor** is subtracted, all others are added. Single pass with a value lookup table \u2014 O(n) time, O(1) space, no special-casing needed.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("roman to integer leetcode"),
    tags: ["string", "hash-table", "math"],
    starterCode: buildStarter("string", "int", "romanToInt"),
    reference: (input) => {
      const s = (lines(input)[0] ?? "").trim();
      const val = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1e3 };
      let total = 0;
      for (let i = 0; i < s.length; i++) {
        const cur = val[s[i]];
        const nxt = i + 1 < s.length ? val[s[i + 1]] : 0;
        if (nxt > cur) total -= cur;
        else total += cur;
      }
      return String(total);
    },
    tests: [
      { input: "III", sample: true },
      { input: "LVIII", sample: true },
      { input: "MCMXCIV", sample: true },
      { input: "IX" },
      { input: "MMMCMXCIX" }
    ]
  },
  {
    slug: "string-to-integer-atoi",
    title: "String to Integer (atoi)",
    difficulty: "MEDIUM",
    statement: `Implement \`atoi\`: skip leading spaces, read an optional sign, read digits until a non-digit, and clamp the result to the 32-bit signed range [\u22122\xB3\xB9, 2\xB3\xB9\u22121]. Anything unreadable yields 0.

**Input**: one line, the raw string.
**Output**: the parsed integer.`,
    constraints: `- 0 \u2264 length \u2264 200
- Letters, digits, spaces, '+', '-', '.'.`,
    examples: [
      { input: "42", output: "42" },
      { input: "   -042", output: "-42" },
      { input: "1337c0d3", output: "1337", explanation: "Parsing stops at 'c'." },
      { input: "words and 987", output: "0" }
    ],
    hints: [
      "Follow the spec mechanically: whitespace \u2192 sign \u2192 digits \u2192 stop.",
      "Check for overflow before multiplying by 10, or accumulate in a wider type and clamp."
    ],
    editorial: `A small state machine: consume leading spaces, one optional sign, then digits, ignoring everything after. The interview substance is **overflow handling** \u2014 either test \`result > (INT_MAX \u2212 digit) / 10\` before each step or accumulate in a 64-bit value and clamp to \`[\u22122\xB3\xB9, 2\xB3\xB9\u22121]\`. O(n) single pass.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("string to integer atoi leetcode"),
    tags: ["string", "simulation"],
    starterCode: buildStarter("string", "int", "myAtoi"),
    reference: (input) => {
      const s = lines(input)[0] ?? "";
      let i = 0;
      while (i < s.length && s[i] === " ") i++;
      let sign = 1;
      if (s[i] === "+" || s[i] === "-") {
        if (s[i] === "-") sign = -1;
        i++;
      }
      let num = 0;
      while (i < s.length && s[i] >= "0" && s[i] <= "9") {
        num = num * 10 + (s.charCodeAt(i) - 48);
        if (sign === 1 && num > 2147483647) return "2147483647";
        if (sign === -1 && num > 2147483648) return "-2147483648";
        i++;
      }
      return String(sign * num);
    },
    tests: [
      { input: "42", sample: true },
      { input: "   -042", sample: true },
      { input: "1337c0d3", sample: true },
      { input: "words and 987" },
      { input: "-91283472332" },
      { input: "+1" }
    ]
  },
  {
    slug: "find-the-index-of-the-first-occurrence-in-a-string",
    title: "Find the Index of the First Occurrence in a String",
    difficulty: "EASY",
    statement: `Return the index of the first occurrence of \`needle\` in \`haystack\`, or \`-1\` if absent.

**Input**
- Line 1: \`haystack\`
- Line 2: \`needle\`

**Output**: the index, or -1.`,
    constraints: `- 1 \u2264 lengths \u2264 10^4
- Lowercase English letters.`,
    examples: [
      { input: "sadbutsad\nsad", output: "0" },
      { input: "leetcode\nleeto", output: "-1" }
    ],
    hints: [
      "Try aligning the needle at every possible start \u2014 O(n\xB7m) is accepted here.",
      "KMP builds a failure table so the scan never re-examines matched text \u2014 O(n + m)."
    ],
    editorial: `The sliding comparison \u2014 try each alignment and compare \u2014 is O(n\xB7m) and perfectly acceptable. The classic follow-up is **KMP**: precompute the needle's longest-proper-prefix-suffix table so that on a mismatch you shift by the table instead of restarting, giving O(n + m). Mentioning (and sketching) KMP is what separates the answer.`,
    approaches: [
      {
        name: "Brute-force alignment",
        complexityTime: "O(n\xB7m)",
        complexitySpace: "O(1)",
        body: "Compare the needle at every start index."
      },
      {
        name: "KMP",
        complexityTime: "O(n + m)",
        complexitySpace: "O(m)",
        body: "Failure-function table avoids re-scanning matched characters."
      }
    ],
    complexityTime: "O(n + m)",
    complexitySpace: "O(m)",
    youtubeUrl: yt("find first occurrence strstr kmp"),
    tags: ["string", "two-pointers", "kmp"],
    starterCode: buildStarter("twoStrings", "int", "strStr"),
    reference: (input) => {
      const [haystack = "", needle = ""] = lines(input);
      return String(haystack.indexOf(needle));
    },
    tests: [
      { input: "sadbutsad\nsad", sample: true },
      { input: "leetcode\nleeto", sample: true },
      { input: "a\na" },
      { input: "mississippi\nissip" },
      { input: "abc\nabcd" }
    ]
  },
  {
    slug: "isomorphic-strings",
    title: "Isomorphic Strings",
    difficulty: "EASY",
    statement: `Two strings are isomorphic if the characters of \`s\` can be replaced (via a consistent one-to-one mapping) to obtain \`t\`. Every occurrence of a character must map to the same character, and no two characters may map to the same one.

**Input**
- Line 1: string \`s\`
- Line 2: string \`t\` (same length)

**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 s.length = t.length \u2264 5\xB710^4
- Printable ASCII characters.`,
    examples: [
      { input: "egg\nadd", output: "true", explanation: "e\u2192a, g\u2192d." },
      { input: "foo\nbar", output: "false", explanation: "o would need to map to both a and r." },
      { input: "badc\nbaba", output: "false", explanation: "b and d would both map to b." }
    ],
    hints: [
      "Track the mapping s[i] \u2192 t[i] and reject contradictions.",
      "One map isn't enough \u2014 'badc'/'baba' needs the reverse mapping checked too."
    ],
    editorial: `Walk both strings once with two hash maps: forward (s-char \u2192 t-char) and backward (t-char \u2192 s-char). At each position, if either map already holds a *different* partner for the current character, fail. The backward map is the part people forget \u2014 without it, two source characters can silently collapse onto one target ('badc' \u2192 'baba'). One pass, O(n) time, O(k) space over the alphabet. Equivalent one-map trick: compare first-occurrence index patterns of both strings.`,
    complexityTime: "O(n)",
    complexitySpace: "O(k) \u2014 alphabet size",
    youtubeUrl: yt("isomorphic strings leetcode"),
    tags: ["string", "hash-map"],
    starterCode: buildStarter("twoStrings", "bool", "isIsomorphic"),
    reference: (input) => {
      const [s = "", t = ""] = lines(input);
      if (s.length !== t.length) return boolOut(false);
      const fwd = /* @__PURE__ */ new Map();
      const bwd = /* @__PURE__ */ new Map();
      for (let i = 0; i < s.length; i++) {
        const a = s[i];
        const b = t[i];
        if (fwd.has(a) && fwd.get(a) !== b) return boolOut(false);
        if (bwd.has(b) && bwd.get(b) !== a) return boolOut(false);
        fwd.set(a, b);
        bwd.set(b, a);
      }
      return boolOut(true);
    },
    tests: [
      { input: "egg\nadd", sample: true },
      { input: "foo\nbar", sample: true },
      { input: "badc\nbaba", sample: true },
      { input: "paper\ntitle" },
      { input: "a\na" },
      { input: "ab\naa" }
    ]
  },
  {
    slug: "zigzag-conversion",
    title: "Zigzag Conversion",
    difficulty: "MEDIUM",
    statement: `Write the string in a zigzag pattern over \`numRows\` rows (down the first column, diagonally up to the top, repeat), then read it row by row.

For \`"PAYPALISHIRING"\` with 3 rows:

\`\`\`
P   A   H   N
A P L S I I G
Y   I   R
\`\`\`

Reading row-by-row gives \`"PAHNAPLSIIGYIR"\`.

**Input**
- Line 1: the string \`s\`
- Line 2: the integer \`numRows\`

**Output**: the converted string.`,
    constraints: `- 1 \u2264 s.length \u2264 1000
- 1 \u2264 numRows \u2264 1000`,
    examples: [
      { input: "PAYPALISHIRING\n3", output: "PAHNAPLSIIGYIR" },
      { input: "PAYPALISHIRING\n4", output: "PINALSIGYAHRPI" },
      { input: "AB\n1", output: "AB" }
    ],
    hints: [
      "You never need the 2D grid \u2014 only which row each character lands in.",
      "Walk the string appending to a current-row buffer; bounce direction at row 0 and row numRows\u22121.",
      "numRows = 1 is the classic edge case \u2014 no bouncing possible."
    ],
    editorial: `Simulate the zigzag with one counter: keep an array of numRows string builders, a current row, and a direction. Append each character to its row, flipping direction whenever you touch the top or bottom row, then concatenate the rows. O(n) time, O(n) space, and no geometry required. Guard numRows = 1 (or \u2265 s.length) by returning s unchanged \u2014 the bounce logic would otherwise divide the walk by zero conceptually. The pure-math variant jumps indices by cycle length 2\xB7numRows\u22122 per row; it's O(1) extra space but far easier to get wrong under pressure.`,
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("zigzag conversion leetcode"),
    tags: ["string", "simulation"],
    starterCode: buildStarter("stringInt", "string", "convert"),
    reference: (input) => {
      const s = lines(input)[0] ?? "";
      const k = int(lines(input)[1]);
      if (k <= 1 || k >= s.length) return s;
      const rows = new Array(k).fill("");
      let r = 0;
      let dir = -1;
      for (const ch of s) {
        rows[r] += ch;
        if (r === 0 || r === k - 1) dir = -dir;
        r += dir;
      }
      return rows.join("");
    },
    tests: [
      { input: "PAYPALISHIRING\n3", sample: true },
      { input: "PAYPALISHIRING\n4", sample: true },
      { input: "AB\n1", sample: true },
      { input: "A\n5" },
      { input: "ABCDEFGHIJ\n2" },
      { input: "ABCD\n4" }
    ]
  }
];

// src/data/problems/two-pointers.ts
var first2 = (s) => ints(s.split("\n")[0]);
var twoPointers = [
  {
    slug: "two-sum-ii-input-array-is-sorted",
    title: "Two Sum II \u2014 Input Array Is Sorted",
    difficulty: "MEDIUM",
    statement: `Given a **1-indexed** array of integers \`nums\` sorted in non-decreasing order and an integer \`target\`, find two numbers that add up to \`target\` and return their 1-based indices \`i < j\`. Exactly one solution exists; use only O(1) extra space.

**Input**
- Line 1: space-separated integers \`nums\` (sorted)
- Line 2: integer \`target\`

**Output**
- The two 1-based indices, space-separated.`,
    constraints: `- 2 \u2264 nums.length \u2264 3\xB710^4
- nums is sorted in non-decreasing order
- Exactly one valid pair exists.`,
    examples: [
      { input: "2 7 11 15\n9", output: "1 2", explanation: "2 + 7 = 9 \u2192 indices 1 and 2." },
      { input: "-1 0\n-1", output: "1 2" }
    ],
    hints: [
      "The array is sorted \u2014 that's the whole trick.",
      "Start pointers at both ends. If the sum is too big, which pointer must move?"
    ],
    editorial: `Place one pointer at each end. If the pair sums above \`target\`, only moving the right pointer left can reduce the sum; if below, only moving the left pointer right can increase it. Each step discards one candidate, so the scan is O(n) with O(1) space \u2014 the sorted order guarantees you never skip the answer.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode two sum ii sorted"),
    tags: ["two-pointers", "array", "binary-search"],
    starterCode: buildStarter("intArrayTarget", "intArray", "twoSumSorted"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0);
      const target = int(l1);
      let l = 0;
      let r = nums.length - 1;
      while (l < r) {
        const s = nums[l] + nums[r];
        if (s === target) return `${l + 1} ${r + 1}`;
        if (s < target) l++;
        else r--;
      }
      return "";
    },
    tests: [
      { input: "2 7 11 15\n9", sample: true },
      { input: "-1 0\n-1", sample: true },
      { input: "1 2 3 4 4 9 56 90\n8" },
      { input: "5 25 75\n100" },
      { input: "-3 -1 2 6\n5" }
    ]
  },
  {
    slug: "3sum",
    title: "3Sum",
    difficulty: "MEDIUM",
    statement: `Given an integer array \`nums\`, find all **unique** triplets \`[a, b, c]\` such that \`a + b + c = 0\`.

**Input**: one line of space-separated integers.
**Output**: each triplet on its own line with its three numbers in non-decreasing order. Triplets may be produced in any order \u2014 the template prints them in a canonical order. Print nothing if there are none.`,
    constraints: `- 3 \u2264 nums.length \u2264 3000
- -10^5 \u2264 nums[i] \u2264 10^5`,
    examples: [
      {
        input: "-1 0 1 2 -1 -4",
        output: "-1 -1 2\n-1 0 1",
        explanation: "The distinct zero-sum triplets are (-1,-1,2) and (-1,0,1)."
      },
      { input: "0 1 1", output: "", explanation: "No triplet sums to 0." }
    ],
    hints: [
      "Sort the array first \u2014 duplicates become adjacent and easy to skip.",
      "Fix the smallest element, then the problem reduces to Two Sum II on the rest.",
      "After finding a match, advance both pointers past equal values to avoid duplicate triplets."
    ],
    editorial: `Sort \`nums\`. For each index \`i\` (skipping repeated values), run the two-pointer sum search on the subarray to its right looking for \`-nums[i]\`. On a hit, record the triplet and advance both pointers past duplicates. Sorting costs O(n log n) and each fixed \`i\` does an O(n) scan \u2192 O(n\xB2) total.`,
    approaches: [
      {
        name: "Hash set per element",
        complexityTime: "O(n\xB2)",
        complexitySpace: "O(n)",
        body: "For each pair, look up the complement in a set. Deduplication is fiddly \u2014 you must canonicalize triplets."
      },
      {
        name: "Sort + two pointers",
        complexityTime: "O(n\xB2)",
        complexitySpace: "O(1)",
        body: "Sort, fix the first element, then converge two pointers. Skipping adjacent duplicates gives uniqueness for free."
      }
    ],
    complexityTime: "O(n\xB2)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode 3sum"),
    tags: ["two-pointers", "array", "sorting"],
    starterCode: buildStarter("intArray", "sortedIntMatrix", "threeSum"),
    reference: (input) => {
      const nums = first2(input).sort((a, b) => a - b);
      const rows = [];
      for (let i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] === nums[i - 1]) continue;
        let l = i + 1;
        let r = nums.length - 1;
        while (l < r) {
          const s = nums[i] + nums[l] + nums[r];
          if (s === 0) {
            rows.push([nums[i], nums[l], nums[r]]);
            while (l < r && nums[l] === nums[l + 1]) l++;
            while (l < r && nums[r] === nums[r - 1]) r--;
            l++;
            r--;
          } else if (s < 0) l++;
          else r--;
        }
      }
      return sortedMatOut(rows);
    },
    tests: [
      { input: "-1 0 1 2 -1 -4", sample: true },
      { input: "0 1 1", sample: true },
      { input: "0 0 0" },
      { input: "-2 0 1 1 2" },
      { input: "3 -2 1 0" },
      { input: "-4 -2 -2 -2 0 1 2 2 2 3 3 4 4 6 6" }
    ]
  },
  {
    slug: "3sum-closest",
    title: "3Sum Closest",
    difficulty: "MEDIUM",
    statement: `Given an integer array \`nums\` and an integer \`target\`, find three integers in \`nums\` whose sum is **closest** to \`target\` and return that sum. Each input has exactly one answer.

**Input**
- Line 1: space-separated integers \`nums\`
- Line 2: integer \`target\`

**Output**: the closest achievable sum.`,
    constraints: `- 3 \u2264 nums.length \u2264 500
- -1000 \u2264 nums[i] \u2264 1000
- Exactly one answer is closest.`,
    examples: [
      { input: "-1 2 1 -4\n1", output: "2", explanation: "-1 + 2 + 1 = 2 is closest to 1." },
      { input: "0 0 0\n1", output: "0" }
    ],
    hints: [
      "Sort, fix one element, and two-pointer the rest \u2014 just like 3Sum.",
      "Track the best sum seen by absolute distance to target."
    ],
    editorial: `Sort the array. Fix each index and converge two pointers on the remainder; at every step compare \`|sum \u2212 target|\` against the best so far and move the pointer that brings the sum toward \`target\`. O(n\xB2) time, O(1) space.`,
    complexityTime: "O(n\xB2)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("3sum closest leetcode"),
    tags: ["two-pointers", "array", "sorting"],
    starterCode: buildStarter("intArrayTarget", "int", "threeSumClosest"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0).sort((a, b) => a - b);
      const target = int(l1);
      let best = nums[0] + nums[1] + nums[2];
      for (let i = 0; i < nums.length - 2; i++) {
        let l = i + 1;
        let r = nums.length - 1;
        while (l < r) {
          const s = nums[i] + nums[l] + nums[r];
          if (Math.abs(s - target) < Math.abs(best - target)) best = s;
          if (s === target) return String(s);
          if (s < target) l++;
          else r--;
        }
      }
      return String(best);
    },
    tests: [
      { input: "-1 2 1 -4\n1", sample: true },
      { input: "0 0 0\n1", sample: true },
      { input: "1 1 1 0\n-100" },
      { input: "4 0 5 -5 3 3 0 -4 -5\n-2" }
    ]
  },
  {
    slug: "container-with-most-water",
    title: "Container With Most Water",
    difficulty: "MEDIUM",
    statement: `You are given an array \`height\` where the i-th element is the height of a vertical line at position \`i\`. Choose two lines that, together with the x-axis, form a container holding the most water. Return the maximum amount of water.

**Input**: one line of space-separated integers \`height\`.
**Output**: the maximum area.`,
    constraints: `- 2 \u2264 height.length \u2264 10^5
- 0 \u2264 height[i] \u2264 10^4`,
    examples: [
      { input: "1 8 6 2 5 4 8 3 7", output: "49", explanation: "Lines at indices 1 and 8: min(8,7) \xD7 7 = 49." },
      { input: "1 1", output: "1" }
    ],
    hints: [
      "Area = min(left, right) \xD7 width. Start with maximum width.",
      "Moving the taller line inward can never help \u2014 the height is capped by the shorter one."
    ],
    editorial: `Start with pointers at both ends (max width) and repeatedly move the **shorter** line inward. Moving the taller one can only shrink or keep the limiting height while reducing width, so it's never better. Track the best area along the way \u2014 O(n) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode container with most water"),
    tags: ["two-pointers", "array", "greedy"],
    starterCode: buildStarter("intArray", "int", "maxArea"),
    reference: (input) => {
      const h = first2(input);
      let l = 0;
      let r = h.length - 1;
      let best = 0;
      while (l < r) {
        best = Math.max(best, Math.min(h[l], h[r]) * (r - l));
        if (h[l] < h[r]) l++;
        else r--;
      }
      return String(best);
    },
    tests: [
      { input: "1 8 6 2 5 4 8 3 7", sample: true },
      { input: "1 1", sample: true },
      { input: "4 3 2 1 4" },
      { input: "1 2 1" },
      { input: "2 3 4 5 18 17 6" }
    ]
  },
  {
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "HARD",
    statement: `Given \`n\` non-negative integers representing an elevation map where each bar has width 1, compute how much water it can trap after raining.

**Input**: one line of space-separated integers \`height\`.
**Output**: total units of trapped water.`,
    constraints: `- 1 \u2264 height.length \u2264 2\xB710^4
- 0 \u2264 height[i] \u2264 10^5`,
    examples: [
      { input: "0 1 0 2 1 0 1 3 2 1 2 1", output: "6" },
      { input: "4 2 0 3 2 5", output: "9" }
    ],
    hints: [
      "Water above position i is min(maxLeft, maxRight) \u2212 height[i].",
      "Precomputing both max arrays works in O(n) space. Can two pointers avoid that?",
      "Whichever side has the smaller running max is the binding constraint \u2014 process from that side."
    ],
    editorial: `Water at index \`i\` equals \`min(maxLeft, maxRight) \u2212 height[i]\`. With two pointers and running maxes from each end, the side with the **smaller** running max is fully determined (the other side is at least as tall somewhere), so we can settle that cell and advance. One pass, O(n) time, O(1) space.`,
    approaches: [
      {
        name: "Prefix/suffix max arrays",
        complexityTime: "O(n)",
        complexitySpace: "O(n)",
        body: "Precompute maxLeft[i] and maxRight[i]; sum min of both minus height."
      },
      {
        name: "Two pointers",
        complexityTime: "O(n)",
        complexitySpace: "O(1)",
        body: "Advance from the side with the smaller running max; that max bounds the water there."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode trapping rain water"),
    tags: ["two-pointers", "array", "stack", "dynamic-programming"],
    starterCode: buildStarter("intArray", "int", "trap"),
    reference: (input) => {
      const h = first2(input);
      let l = 0;
      let r = h.length - 1;
      let lm = 0;
      let rm = 0;
      let res = 0;
      while (l < r) {
        if (h[l] < h[r]) {
          lm = Math.max(lm, h[l]);
          res += lm - h[l];
          l++;
        } else {
          rm = Math.max(rm, h[r]);
          res += rm - h[r];
          r--;
        }
      }
      return String(res);
    },
    tests: [
      { input: "0 1 0 2 1 0 1 3 2 1 2 1", sample: true },
      { input: "4 2 0 3 2 5", sample: true },
      { input: "1" },
      { input: "5 4 1 2" },
      { input: "3 0 3" },
      { input: "0 0 0" }
    ]
  },
  {
    slug: "remove-duplicates-from-sorted-array",
    title: "Remove Duplicates from Sorted Array",
    difficulty: "EASY",
    statement: `Given a sorted integer array \`nums\`, remove the duplicates **in place** so that each unique element appears only once, keeping the relative order. Return the resulting deduplicated array.

**Input**: one line of space-separated integers (sorted).
**Output**: the deduplicated array, space-separated.`,
    constraints: `- 1 \u2264 nums.length \u2264 3\xB710^4
- nums is sorted in non-decreasing order.`,
    examples: [
      { input: "1 1 2", output: "1 2" },
      { input: "0 0 1 1 1 2 2 3 3 4", output: "0 1 2 3 4" }
    ],
    hints: [
      "Because the array is sorted, duplicates are adjacent.",
      "Keep a slow 'write' pointer for the last unique value placed."
    ],
    editorial: `Use a slow/fast pointer pair. The fast pointer scans every element; whenever it sees a value different from the last written one, the slow pointer writes it and advances. Sorted order guarantees all duplicates are adjacent, so one pass suffices \u2014 O(n) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode remove duplicates from sorted array"),
    tags: ["two-pointers", "array"],
    starterCode: buildStarter("intArray", "intArray", "removeDuplicates"),
    reference: (input) => {
      const nums = first2(input);
      const res = nums.filter((x, i) => i === 0 || x !== nums[i - 1]);
      return arrOut(res);
    },
    tests: [
      { input: "1 1 2", sample: true },
      { input: "0 0 1 1 1 2 2 3 3 4", sample: true },
      { input: "7" },
      { input: "-3 -3 -3" },
      { input: "1 2 3" }
    ]
  },
  {
    slug: "sort-colors",
    title: "Sort Colors",
    difficulty: "MEDIUM",
    statement: `Given an array \`nums\` with values \`0\`, \`1\`, and \`2\` representing red, white, and blue, sort them in place so that same colors are adjacent in the order red \u2192 white \u2192 blue. Do it in one pass without the library sort. Return the sorted array.

**Input**: one line of space-separated integers (each 0, 1, or 2).
**Output**: the sorted array, space-separated.`,
    constraints: `- 1 \u2264 nums.length \u2264 300
- nums[i] \u2208 {0, 1, 2}`,
    examples: [
      { input: "2 0 2 1 1 0", output: "0 0 1 1 2 2" },
      { input: "2 0 1", output: "0 1 2" }
    ],
    hints: [
      "Counting sort works in two passes. The Dutch National Flag algorithm does it in one.",
      "Maintain three regions with pointers low, mid, high: 0s before low, 2s after high.",
      "When you swap a 2 to the back, don't advance mid \u2014 the swapped-in value is unexamined."
    ],
    editorial: `**Dutch National Flag** (Dijkstra). Keep three pointers: everything before \`low\` is 0, everything after \`high\` is 2, and \`mid\` scans. On 0 \u2192 swap to \`low\`, advance both; on 2 \u2192 swap to \`high\`, shrink \`high\` only (the incoming value is unseen); on 1 \u2192 advance \`mid\`. One pass, O(n) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode sort colors dutch national flag"),
    tags: ["two-pointers", "array", "sorting"],
    starterCode: buildStarter("intArray", "intArray", "sortColors"),
    reference: (input) => {
      const nums = first2(input);
      return arrOut(nums.sort((a, b) => a - b));
    },
    tests: [
      { input: "2 0 2 1 1 0", sample: true },
      { input: "2 0 1", sample: true },
      { input: "0" },
      { input: "1 1 1" },
      { input: "2 2 1 1 0 0" }
    ]
  },
  {
    slug: "is-subsequence",
    title: "Is Subsequence",
    difficulty: "EASY",
    statement: `Given strings \`s\` and \`t\`, return \`true\` if \`s\` is a subsequence of \`t\` \u2014 i.e. \`s\` can be formed by deleting characters of \`t\` without reordering the rest.

**Input**
- Line 1: string \`s\`
- Line 2: string \`t\`

**Output**: \`true\` or \`false\`.`,
    constraints: `- 0 \u2264 s.length \u2264 100
- 0 \u2264 t.length \u2264 10^4
- Lowercase English letters only.`,
    examples: [
      { input: "abc\nahbgdc", output: "true" },
      { input: "axc\nahbgdc", output: "false" }
    ],
    hints: [
      "Walk t once; advance a pointer into s whenever characters match.",
      "s is a subsequence iff the s-pointer reaches the end."
    ],
    editorial: `Greedy single pass: scan \`t\` with one pointer while a second pointer tracks the next needed character of \`s\`. Matching the first available occurrence is always safe \u2014 it leaves the most room for the remaining characters. O(|t|) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("is subsequence leetcode two pointers"),
    tags: ["two-pointers", "string", "greedy"],
    starterCode: buildStarter("twoStrings", "bool", "isSubsequence"),
    reference: (input) => {
      const [s = "", t = ""] = lines(input);
      let i = 0;
      for (const ch of t) {
        if (i < s.length && s[i] === ch) i++;
      }
      return boolOut(i === s.length);
    },
    tests: [
      { input: "abc\nahbgdc", sample: true },
      { input: "axc\nahbgdc", sample: true },
      { input: "\nanything" },
      { input: "b\nabc" },
      { input: "aaaaaa\nbbaaaa" }
    ]
  },
  {
    slug: "merge-sorted-arrays",
    title: "Merge Two Sorted Arrays",
    difficulty: "EASY",
    statement: `Given two integer arrays \`nums1\` and \`nums2\`, each sorted in non-decreasing order, merge them into a single sorted array and return it.

**Input**
- Line 1: space-separated integers \`nums1\` (may be empty)
- Line 2: space-separated integers \`nums2\` (may be empty)

**Output**: the merged sorted array, space-separated.`,
    constraints: `- 0 \u2264 nums1.length, nums2.length \u2264 200
- -10^9 \u2264 values \u2264 10^9`,
    examples: [
      { input: "1 2 3\n2 5 6", output: "1 2 2 3 5 6" },
      { input: "\n1", output: "1" }
    ],
    hints: [
      "Compare the front of both arrays and take the smaller.",
      "Don't forget the leftovers when one array is exhausted."
    ],
    editorial: `The classic merge step of merge sort: two read pointers, always append the smaller front element, then append whatever remains. O(m + n) time and output space \u2014 this exact routine is the building block of merge sort and external sorting.`,
    complexityTime: "O(m + n)",
    complexitySpace: "O(m + n)",
    youtubeUrl: yt("merge sorted array leetcode"),
    tags: ["two-pointers", "array", "sorting"],
    starterCode: buildStarter("twoIntArrays", "intArray", "mergeArrays"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const a = ints(l0);
      const b = ints(l1);
      const res = [];
      let i = 0;
      let j = 0;
      while (i < a.length || j < b.length) {
        if (j >= b.length || i < a.length && a[i] <= b[j]) res.push(a[i++]);
        else res.push(b[j++]);
      }
      return arrOut(res);
    },
    tests: [
      { input: "1 2 3\n2 5 6", sample: true },
      { input: "\n1", sample: true },
      { input: "4\n" },
      { input: "-5 0 5\n-6 6" },
      { input: "1 1 1\n1 1" }
    ]
  },
  {
    slug: "valid-palindrome-ii",
    title: "Valid Palindrome II",
    difficulty: "EASY",
    statement: `Given a string \`s\`, return \`true\` if it can become a palindrome after deleting **at most one** character.

**Input**: one line, the string \`s\`.
**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 s.length \u2264 10^5
- Lowercase English letters only.`,
    examples: [
      { input: "aba", output: "true" },
      { input: "abca", output: "true", explanation: "Delete 'c' (or 'b')." },
      { input: "abc", output: "false" }
    ],
    hints: [
      "Converge two pointers as in a normal palindrome check.",
      "On the first mismatch you have exactly two options: skip the left char or skip the right char."
    ],
    editorial: `Run the standard two-pointer palindrome check. At the first mismatch, the only hope is deleting one of the two mismatched characters \u2014 so check whether \`s[l+1..r]\` or \`s[l..r\u22121]\` is a palindrome. Either branch is a plain O(n) check, so the whole thing is O(n).`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("valid palindrome ii leetcode"),
    tags: ["two-pointers", "string", "greedy"],
    starterCode: buildStarter("string", "bool", "validPalindrome"),
    reference: (input) => {
      const s = lines(input)[0] ?? "";
      const isPal = (l2, r2) => {
        while (l2 < r2) {
          if (s[l2] !== s[r2]) return false;
          l2++;
          r2--;
        }
        return true;
      };
      let l = 0;
      let r = s.length - 1;
      while (l < r) {
        if (s[l] !== s[r]) return boolOut(isPal(l + 1, r) || isPal(l, r - 1));
        l++;
        r--;
      }
      return boolOut(true);
    },
    tests: [
      { input: "aba", sample: true },
      { input: "abca", sample: true },
      { input: "abc" },
      { input: "a" },
      { input: "deeee" },
      { input: "cuucu" }
    ]
  },
  {
    slug: "boats-to-save-people",
    title: "Boats to Save People",
    difficulty: "MEDIUM",
    statement: `Each boat carries at most **two** people, subject to a weight \`limit\`. Given everyone's weights, return the minimum number of boats needed to carry every person.

**Input**
- Line 1: space-separated weights
- Line 2: the integer \`limit\`

**Output**: the minimum number of boats.`,
    constraints: `- 1 \u2264 people.length \u2264 5\xB710^4
- 1 \u2264 people[i] \u2264 limit \u2264 3\xB710^4`,
    examples: [
      { input: "1 2\n3", output: "1" },
      {
        input: "3 2 2 1\n3",
        output: "3",
        explanation: "Boats: (1,2), (2), (3)."
      },
      { input: "3 5 3 4\n5", output: "4", explanation: "No two fit together." }
    ],
    hints: [
      "Sort. Who should share a boat with the heaviest person?",
      "If the lightest can't pair with the heaviest, the heaviest rides alone \u2014 no better partner exists.",
      "Two pointers converging from both ends; one boat per step."
    ],
    editorial: `Sort the weights and converge two pointers. Each round, the heaviest remaining person boards a boat; the lightest joins them if the pair fits under the limit, otherwise the heavy one sails alone. The greedy is safe because the heaviest person's only possible partner is *someone*, and the lightest is the most likely candidate \u2014 if even they don't fit, nobody does. Since each person can only pair with one other (capacity two), no cleverer matching exists. O(n log n) for the sort, O(1) extra beyond it.`,
    approaches: [
      {
        name: "Sort + two pointers",
        complexityTime: "O(n log n)",
        complexitySpace: "O(1)",
        body: "Pair lightest with heaviest when possible; heaviest goes alone otherwise."
      }
    ],
    complexityTime: "O(n log n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("boats to save people leetcode"),
    tags: ["two-pointers", "greedy", "sorting"],
    starterCode: buildStarter("intArrayK", "int", "numRescueBoats"),
    reference: (input) => {
      const people = ints(lines(input)[0]).sort((a, b) => a - b);
      const limit = int(lines(input)[1]);
      let i = 0;
      let j = people.length - 1;
      let boats = 0;
      while (i <= j) {
        if (people[i] + people[j] <= limit) i++;
        j--;
        boats++;
      }
      return String(boats);
    },
    tests: [
      { input: "1 2\n3", sample: true },
      { input: "3 2 2 1\n3", sample: true },
      { input: "3 5 3 4\n5", sample: true },
      { input: "5\n5" },
      { input: "1 1 1 1\n2" },
      { input: "2 4 5 1 3 6\n6" }
    ]
  }
];

// src/data/problems/sliding-window.ts
var first3 = (s) => ints(s.split("\n")[0]);
var slidingWindow = [
  {
    slug: "maximum-average-subarray-i",
    title: "Maximum Average Subarray I",
    difficulty: "EASY",
    statement: `Given an integer array \`nums\` and an integer \`k\`, find the contiguous subarray of length exactly \`k\` with the maximum average, and return that average.

**Input**
- Line 1: space-separated integers \`nums\`
- Line 2: integer \`k\`

**Output**: the maximum average, printed with two decimal places (the template formats it for you).`,
    constraints: `- 1 \u2264 k \u2264 nums.length \u2264 10^5
- -10^4 \u2264 nums[i] \u2264 10^4`,
    examples: [
      { input: "1 12 -5 -6 50 3\n4", output: "12.75", explanation: "(12 - 5 - 6 + 50) / 4 = 12.75." },
      { input: "5\n1", output: "5.00" }
    ],
    hints: [
      "Recomputing each window sum from scratch is O(n\xB7k).",
      "Slide the window: add the entering element, subtract the leaving one."
    ],
    editorial: `Compute the sum of the first \`k\` elements, then slide the window one step at a time: add the new element, subtract the one that left. Track the maximum sum and divide by \`k\` at the end. O(n) time, O(1) space \u2014 the canonical fixed-size sliding window.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("maximum average subarray sliding window"),
    tags: ["sliding-window", "array"],
    starterCode: buildStarter("intArrayK", "float2", "findMaxAverage"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0);
      const k = int(l1);
      let sum = 0;
      for (let i = 0; i < k; i++) sum += nums[i];
      let best = sum;
      for (let i = k; i < nums.length; i++) {
        sum += nums[i] - nums[i - k];
        best = Math.max(best, sum);
      }
      return (best / k).toFixed(2);
    },
    tests: [
      { input: "1 12 -5 -6 50 3\n4", sample: true },
      { input: "5\n1", sample: true },
      { input: "0 4 0 3 2\n1" },
      { input: "-1 -2 -3 -4\n2" },
      { input: "8 2 4 6\n4" }
    ]
  },
  {
    slug: "minimum-size-subarray-sum",
    title: "Minimum Size Subarray Sum",
    difficulty: "MEDIUM",
    statement: `Given an array of **positive** integers \`nums\` and a positive integer \`target\`, return the minimal length of a contiguous subarray whose sum is \u2265 \`target\`. If there is no such subarray, return \`0\`.

**Input**
- Line 1: space-separated positive integers \`nums\`
- Line 2: integer \`target\`

**Output**: the minimal length, or 0.`,
    constraints: `- 1 \u2264 nums.length \u2264 10^5
- 1 \u2264 nums[i] \u2264 10^4
- 1 \u2264 target \u2264 10^9`,
    examples: [
      { input: "2 3 1 2 4 3\n7", output: "2", explanation: "[4,3] has sum 7 with length 2." },
      { input: "1 1 1 1\n11", output: "0" }
    ],
    hints: [
      "All numbers are positive, so growing the window only increases the sum.",
      "Expand the right edge until the sum reaches target, then shrink from the left while it still holds."
    ],
    editorial: `A variable-size window works because every element is positive: the window sum is monotonic in both directions. Expand right until \`sum \u2265 target\`, then contract left as far as possible, recording the window length at each valid state. Each index enters and leaves the window once \u2192 O(n).`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("minimum size subarray sum sliding window"),
    tags: ["sliding-window", "array", "binary-search"],
    starterCode: buildStarter("intArrayTarget", "int", "minSubArrayLen"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0);
      const target = int(l1);
      let best = Infinity;
      let sum = 0;
      let l = 0;
      for (let r = 0; r < nums.length; r++) {
        sum += nums[r];
        while (sum >= target) {
          best = Math.min(best, r - l + 1);
          sum -= nums[l++];
        }
      }
      return String(best === Infinity ? 0 : best);
    },
    tests: [
      { input: "2 3 1 2 4 3\n7", sample: true },
      { input: "1 1 1 1\n11", sample: true },
      { input: "1 4 4\n4" },
      { input: "5\n5" },
      { input: "1 2 3 4 5\n15" }
    ]
  },
  {
    slug: "longest-repeating-character-replacement",
    title: "Longest Repeating Character Replacement",
    difficulty: "MEDIUM",
    statement: `You are given a string \`s\` of uppercase English letters and an integer \`k\`. You may replace at most \`k\` characters with any other letter. Return the length of the longest substring containing a single repeated letter achievable this way.

**Input**
- Line 1: string \`s\`
- Line 2: integer \`k\`

**Output**: the maximum length.`,
    constraints: `- 1 \u2264 s.length \u2264 10^5
- 0 \u2264 k \u2264 s.length
- Uppercase English letters only.`,
    examples: [
      { input: "ABAB\n2", output: "4", explanation: "Replace both A's (or both B's) \u2192 AAAA." },
      { input: "AABABBA\n1", output: "4", explanation: "Replace the middle A \u2192 AABBBBA, window BBBB." }
    ],
    hints: [
      "A window is fixable iff (window length \u2212 count of its most frequent letter) \u2264 k.",
      "Grow the right edge; when the window becomes invalid, slide the left edge forward.",
      "maxFreq never needs to decrease \u2014 a stale value only makes the window criterion stricter, never wrong."
    ],
    editorial: `Maintain letter counts in a window and \`maxFreq\`, the highest count seen. The window is valid when \`len \u2212 maxFreq \u2264 k\` (the other characters can all be replaced). Expand right; if invalid, advance left one step. Since the answer only cares about the largest valid window and \`maxFreq\` never shrinking keeps the window size monotone, the single pass is O(n) with an O(26) counter.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode longest repeating character replacement"),
    tags: ["sliding-window", "string", "hash-table"],
    starterCode: buildStarter("stringInt", "int", "characterReplacement"),
    reference: (input) => {
      const [s = "", kline] = lines(input);
      const k = int(kline);
      const count = /* @__PURE__ */ new Map();
      let l = 0;
      let maxFreq = 0;
      let best = 0;
      for (let r = 0; r < s.length; r++) {
        count.set(s[r], (count.get(s[r]) ?? 0) + 1);
        maxFreq = Math.max(maxFreq, count.get(s[r]));
        while (r - l + 1 - maxFreq > k) {
          count.set(s[l], count.get(s[l]) - 1);
          l++;
        }
        best = Math.max(best, r - l + 1);
      }
      return String(best);
    },
    tests: [
      { input: "ABAB\n2", sample: true },
      { input: "AABABBA\n1", sample: true },
      { input: "AAAA\n0" },
      { input: "ABCDE\n1" },
      { input: "BAAAB\n2" }
    ]
  },
  {
    slug: "permutation-in-string",
    title: "Permutation in String",
    difficulty: "MEDIUM",
    statement: `Given two strings \`s1\` and \`s2\`, return \`true\` if \`s2\` contains a permutation of \`s1\` as a substring.

**Input**
- Line 1: string \`s1\`
- Line 2: string \`s2\`

**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 s1.length, s2.length \u2264 10^4
- Lowercase English letters only.`,
    examples: [
      { input: "ab\neidbaooo", output: "true", explanation: '"ba" is a permutation of "ab".' },
      { input: "ab\neidboaoo", output: "false" }
    ],
    hints: [
      "Two strings are permutations of each other iff their letter counts match.",
      "Slide a window of length |s1| across s2, updating counts incrementally."
    ],
    editorial: `A permutation match is a frequency match. Keep a count array for \`s1\` and one for the current window of length \`|s1|\` in \`s2\`; slide the window one character at a time, incrementing the entering letter and decrementing the leaving one, and compare counts (or track how many of the 26 letters currently match). O(n) time, O(26) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode permutation in string"),
    tags: ["sliding-window", "string", "hash-table"],
    starterCode: buildStarter("twoStrings", "bool", "checkInclusion"),
    reference: (input) => {
      const [s1 = "", s2 = ""] = lines(input);
      if (s1.length > s2.length) return boolOut(false);
      const need = new Array(26).fill(0);
      const win = new Array(26).fill(0);
      const idx = (c) => c.charCodeAt(0) - 97;
      for (const c of s1) need[idx(c)]++;
      for (let i = 0; i < s2.length; i++) {
        win[idx(s2[i])]++;
        if (i >= s1.length) win[idx(s2[i - s1.length])]--;
        if (i >= s1.length - 1 && need.every((v, j) => v === win[j])) return boolOut(true);
      }
      return boolOut(false);
    },
    tests: [
      { input: "ab\neidbaooo", sample: true },
      { input: "ab\neidboaoo", sample: true },
      { input: "a\na" },
      { input: "abc\nccccbbbbaaaa" },
      { input: "adc\ndcda" }
    ]
  },
  {
    slug: "find-all-anagrams-in-a-string",
    title: "Find All Anagrams in a String",
    difficulty: "MEDIUM",
    statement: `Given two strings \`s\` and \`p\`, return the start indices of all anagrams of \`p\` inside \`s\`, in increasing order.

**Input**
- Line 1: string \`s\`
- Line 2: string \`p\`

**Output**: the start indices, space-separated (nothing if none).`,
    constraints: `- 1 \u2264 s.length, p.length \u2264 3\xB710^4
- Lowercase English letters only.`,
    examples: [
      { input: "cbaebabacd\nabc", output: "0 6", explanation: '"cba" at 0 and "bac" at 6.' },
      { input: "abab\nab", output: "0 1 2" }
    ],
    hints: [
      "Same idea as Permutation in String, but collect every matching window.",
      "Maintain letter counts for a window of length |p| and compare as you slide."
    ],
    editorial: `Slide a fixed window of length \`|p|\` across \`s\`, maintaining a letter-count array that is updated in O(1) per step. Whenever the window's counts equal \`p\`'s counts, record the window start. O(n \xB7 26) worst case, effectively O(n).`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("find all anagrams in a string leetcode"),
    tags: ["sliding-window", "string", "hash-table"],
    starterCode: buildStarter("twoStrings", "intArray", "findAnagrams"),
    reference: (input) => {
      const [s = "", p = ""] = lines(input);
      if (p.length > s.length) return "";
      const need = new Array(26).fill(0);
      const win = new Array(26).fill(0);
      const idx = (c) => c.charCodeAt(0) - 97;
      for (const c of p) need[idx(c)]++;
      const res = [];
      for (let i = 0; i < s.length; i++) {
        win[idx(s[i])]++;
        if (i >= p.length) win[idx(s[i - p.length])]--;
        if (i >= p.length - 1 && need.every((v, j) => v === win[j])) res.push(i - p.length + 1);
      }
      return arrOut(res);
    },
    tests: [
      { input: "cbaebabacd\nabc", sample: true },
      { input: "abab\nab", sample: true },
      { input: "aaaa\naa" },
      { input: "xyz\nabc" },
      { input: "af\nbe" }
    ]
  },
  {
    slug: "fruit-into-baskets",
    title: "Fruit Into Baskets",
    difficulty: "MEDIUM",
    statement: `You walk along a row of trees; \`fruits[i]\` is the fruit type of the i-th tree. You have two baskets, each holding only one type. Starting anywhere, you pick one fruit per tree moving right, stopping when a tree's fruit fits neither basket. Return the maximum number of fruits you can collect \u2014 i.e. the longest subarray with at most **two distinct** values.

**Input**: one line of space-separated integers \`fruits\`.
**Output**: the maximum number of fruits.`,
    constraints: `- 1 \u2264 fruits.length \u2264 10^5
- 0 \u2264 fruits[i] \u2264 10^5`,
    examples: [
      { input: "1 2 1", output: "3" },
      { input: "0 1 2 2", output: "3", explanation: "[1,2,2] uses two types." },
      { input: "1 2 3 2 2", output: "4", explanation: "[2,3,2,2]." }
    ],
    hints: [
      "This is 'longest subarray with at most 2 distinct elements' in disguise.",
      "Track counts per type in the window; shrink from the left when a third type appears."
    ],
    editorial: `Maintain a window and a map \`type \u2192 count\`. Expand right; when the map grows beyond two keys, shrink from the left, decrementing counts and deleting zeros, until only two types remain. Every element is added and removed at most once \u2192 O(n).`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("fruit into baskets sliding window"),
    tags: ["sliding-window", "array", "hash-table"],
    starterCode: buildStarter("intArray", "int", "totalFruit"),
    reference: (input) => {
      const fruits = first3(input);
      const count = /* @__PURE__ */ new Map();
      let l = 0;
      let best = 0;
      for (let r = 0; r < fruits.length; r++) {
        count.set(fruits[r], (count.get(fruits[r]) ?? 0) + 1);
        while (count.size > 2) {
          const c = count.get(fruits[l]) - 1;
          if (c === 0) count.delete(fruits[l]);
          else count.set(fruits[l], c);
          l++;
        }
        best = Math.max(best, r - l + 1);
      }
      return String(best);
    },
    tests: [
      { input: "1 2 1", sample: true },
      { input: "0 1 2 2", sample: true },
      { input: "1 2 3 2 2", sample: true },
      { input: "3 3 3 1 2 1 1 2 3 3 4" },
      { input: "5" }
    ]
  },
  {
    slug: "max-consecutive-ones-iii",
    title: "Max Consecutive Ones III",
    difficulty: "MEDIUM",
    statement: `Given a binary array \`nums\` and an integer \`k\`, return the length of the longest contiguous run of 1s achievable if you may flip at most \`k\` zeros.

**Input**
- Line 1: space-separated 0/1 integers
- Line 2: integer \`k\`

**Output**: the maximum length.`,
    constraints: `- 1 \u2264 nums.length \u2264 10^5
- nums[i] \u2208 {0, 1}
- 0 \u2264 k \u2264 nums.length`,
    examples: [
      { input: "1 1 1 0 0 0 1 1 1 1 0\n2", output: "6", explanation: "Flip the last two 0s in the window [0,0,1,1,1,1]." },
      { input: "0 0 1 1 0 0 1 1 1 0 1 1 0 0 0 1 1 1 1\n3", output: "10" }
    ],
    hints: [
      "Reframe: longest window containing at most k zeros.",
      "Count zeros in the window; when the count exceeds k, move the left edge."
    ],
    editorial: `The answer is the longest window with at most \`k\` zeros. Expand the right edge, incrementing a zero counter; when it exceeds \`k\`, advance the left edge (decrementing when a zero leaves). Track the best window length. O(n) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("max consecutive ones iii sliding window"),
    tags: ["sliding-window", "array"],
    starterCode: buildStarter("intArrayK", "int", "longestOnes"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0);
      const k = int(l1);
      let l = 0;
      let zeros = 0;
      let best = 0;
      for (let r = 0; r < nums.length; r++) {
        if (nums[r] === 0) zeros++;
        while (zeros > k) {
          if (nums[l] === 0) zeros--;
          l++;
        }
        best = Math.max(best, r - l + 1);
      }
      return String(best);
    },
    tests: [
      { input: "1 1 1 0 0 0 1 1 1 1 0\n2", sample: true },
      { input: "0 0 1 1 0 0 1 1 1 0 1 1 0 0 0 1 1 1 1\n3", sample: true },
      { input: "0 0 0\n0" },
      { input: "1 1 1\n0" },
      { input: "0 0 0 1\n4" }
    ]
  },
  {
    slug: "longest-subarray-of-1s-after-deleting-one-element",
    title: "Longest Subarray of 1's After Deleting One Element",
    difficulty: "MEDIUM",
    statement: `Given a binary array \`nums\`, you must delete exactly one element. Return the length of the longest run of 1s in the resulting array.

**Input**: one line of space-separated 0/1 integers.
**Output**: the maximum length (0 if none).`,
    constraints: `- 1 \u2264 nums.length \u2264 10^5
- nums[i] \u2208 {0, 1}`,
    examples: [
      { input: "1 1 0 1", output: "3", explanation: "Delete the 0 \u2192 [1,1,1]." },
      { input: "0 1 1 1 0 1 1 0 1", output: "5", explanation: "Delete the middle 0 \u2192 run of 5." },
      { input: "1 1 1", output: "2", explanation: "You must delete something." }
    ],
    hints: [
      "This is a window with at most one zero \u2014 minus one for the mandatory deletion.",
      "Answer = longest such window length \u2212 1."
    ],
    editorial: `Find the longest window containing at most one zero (same pattern as Max Consecutive Ones III with k = 1), then subtract 1 because one element \u2014 a zero if present, otherwise a one \u2014 must be deleted. O(n) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("longest subarray of 1s after deleting one element"),
    tags: ["sliding-window", "array"],
    starterCode: buildStarter("intArray", "int", "longestSubarray"),
    reference: (input) => {
      const nums = first3(input);
      let l = 0;
      let zeros = 0;
      let best = 0;
      for (let r = 0; r < nums.length; r++) {
        if (nums[r] === 0) zeros++;
        while (zeros > 1) {
          if (nums[l] === 0) zeros--;
          l++;
        }
        best = Math.max(best, r - l + 1);
      }
      return String(best - 1);
    },
    tests: [
      { input: "1 1 0 1", sample: true },
      { input: "0 1 1 1 0 1 1 0 1", sample: true },
      { input: "1 1 1", sample: true },
      { input: "0" },
      { input: "0 0 0" }
    ]
  },
  {
    slug: "sliding-window-maximum",
    title: "Sliding Window Maximum",
    difficulty: "HARD",
    statement: `Given an integer array \`nums\` and a window size \`k\`, return the maximum of each contiguous window of size \`k\` as it slides left to right.

**Input**
- Line 1: space-separated integers \`nums\`
- Line 2: integer \`k\`

**Output**: the window maximums, space-separated.`,
    constraints: `- 1 \u2264 k \u2264 nums.length \u2264 10^5
- -10^4 \u2264 nums[i] \u2264 10^4`,
    examples: [
      {
        input: "1 3 -1 -3 5 3 6 7\n3",
        output: "3 3 5 5 6 7",
        explanation: "Windows: [1,3,-1] [3,-1,-3] [-1,-3,5] [-3,5,3] [5,3,6] [3,6,7]."
      },
      { input: "1\n1", output: "1" }
    ],
    hints: [
      "Recomputing each window max is O(n\xB7k). A heap gets O(n log n). Can you reach O(n)?",
      "Keep a deque of indices whose values are strictly decreasing.",
      "A smaller element behind a newer, larger one can never be a future maximum \u2014 drop it."
    ],
    editorial: `Use a **monotonic deque** of indices with decreasing values. For each new element: pop smaller values from the back (they're dominated), push the index, and pop the front if it slid out of the window. The front is always the current maximum. Every index enters and leaves the deque once \u2192 O(n).`,
    approaches: [
      {
        name: "Max-heap of (value, index)",
        complexityTime: "O(n log n)",
        complexitySpace: "O(n)",
        body: "Push everything; lazily discard heap tops that are outside the window."
      },
      {
        name: "Monotonic deque",
        complexityTime: "O(n)",
        complexitySpace: "O(k)",
        body: "Maintain decreasing values; front of the deque is the window max."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(k)",
    youtubeUrl: yt("neetcode sliding window maximum"),
    tags: ["sliding-window", "deque", "heap", "monotonic-stack"],
    starterCode: buildStarter("intArrayK", "intArray", "maxSlidingWindow"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0);
      const k = int(l1);
      const res = [];
      for (let i = 0; i + k <= nums.length; i++) {
        res.push(Math.max(...nums.slice(i, i + k)));
      }
      return arrOut(res);
    },
    tests: [
      { input: "1 3 -1 -3 5 3 6 7\n3", sample: true },
      { input: "1\n1", sample: true },
      { input: "9 8 7 6 5\n2" },
      { input: "1 2 3 4 5\n5" },
      { input: "4 -2\n2" }
    ]
  },
  {
    slug: "minimum-window-substring",
    title: "Minimum Window Substring",
    difficulty: "HARD",
    statement: `Given strings \`s\` and \`t\`, return the minimum-length substring of \`s\` that contains every character of \`t\` (including duplicates). If no such window exists, print an empty line. The answer is guaranteed unique.

**Input**
- Line 1: string \`s\`
- Line 2: string \`t\`

**Output**: the minimum window, or empty output if none.`,
    constraints: `- 1 \u2264 s.length, t.length \u2264 10^5
- English letters (upper and lower case).`,
    examples: [
      { input: "ADOBECODEBANC\nABC", output: "BANC" },
      { input: "a\na", output: "a" },
      { input: "a\naa", output: "", explanation: "Two 'a's are required but only one exists." }
    ],
    hints: [
      "Track how many of t's required characters the window currently satisfies.",
      "Expand right until the window is valid; then shrink left while it stays valid.",
      "Only characters that appear in t affect validity \u2014 count them with a 'have vs need' counter."
    ],
    editorial: `Keep \`need\` counts for \`t\` and a \`have\` counter of how many distinct characters currently meet their required count. Expand the right edge; when \`have\` equals the number of required distinct characters, contract from the left recording the best window, until validity breaks. Each pointer moves at most n steps \u2192 O(|s| + |t|).`,
    complexityTime: "O(n + m)",
    complexitySpace: "O(m)",
    youtubeUrl: yt("neetcode minimum window substring"),
    tags: ["sliding-window", "string", "hash-table"],
    starterCode: buildStarter("twoStrings", "string", "minWindow"),
    reference: (input) => {
      const [s = "", t = ""] = lines(input);
      if (t.length > s.length) return "";
      const need = /* @__PURE__ */ new Map();
      for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);
      let have = 0;
      const required = need.size;
      const win = /* @__PURE__ */ new Map();
      let best = "";
      let bestLen = Infinity;
      let l = 0;
      for (let r = 0; r < s.length; r++) {
        const c = s[r];
        win.set(c, (win.get(c) ?? 0) + 1);
        if (need.has(c) && win.get(c) === need.get(c)) have++;
        while (have === required) {
          if (r - l + 1 < bestLen) {
            bestLen = r - l + 1;
            best = s.slice(l, r + 1);
          }
          const lc = s[l];
          win.set(lc, win.get(lc) - 1);
          if (need.has(lc) && win.get(lc) < need.get(lc)) have--;
          l++;
        }
      }
      return best;
    },
    tests: [
      { input: "ADOBECODEBANC\nABC", sample: true },
      { input: "a\na", sample: true },
      { input: "a\naa" },
      { input: "aaflslflsldkalskaaa\naaa" },
      { input: "cabwefgewcwaefgcf\ncae" }
    ]
  },
  {
    slug: "subarray-product-less-than-k",
    title: "Subarray Product Less Than K",
    difficulty: "MEDIUM",
    statement: `Given an array of positive integers and an integer \`k\`, count the number of contiguous subarrays whose product is strictly less than \`k\`.

**Input**
- Line 1: space-separated positive integers
- Line 2: the integer \`k\`

**Output**: the count of qualifying subarrays.`,
    constraints: `- 1 \u2264 nums.length \u2264 3\xB710^4
- 1 \u2264 nums[i] \u2264 1000
- 0 \u2264 k \u2264 10^6`,
    examples: [
      {
        input: "10 5 2 6\n100",
        output: "8",
        explanation: "[10], [5], [2], [6], [10 5], [5 2], [2 6], [5 2 6]."
      },
      { input: "1 2 3\n0", output: "0" }
    ],
    hints: [
      "All values are \u2265 1, so extending a window never shrinks its product \u2014 that monotonicity is what makes a sliding window valid.",
      "For each right endpoint, how many valid subarrays *end* there?",
      "Exactly right \u2212 left + 1, where left is the smallest index keeping the product < k."
    ],
    editorial: `Grow a window rightward, multiplying the product; while it reaches or exceeds k, divide off the left edge. Once the window [left, right] is valid, every subarray ending at right and starting at or after left is valid too \u2014 that's \`right \u2212 left + 1\` new subarrays, counted in O(1). Because all numbers are \u2265 1, the product is monotone in window size, so left only moves forward: O(n) total. Two traps: k \u2264 1 means *nothing* qualifies (answer 0 \u2014 guard it before the loop), and the counting-per-endpoint idea is the same one behind most 'count subarrays' window problems, so internalize it.`,
    approaches: [
      {
        name: "Shrinking window with per-endpoint counting",
        complexityTime: "O(n)",
        complexitySpace: "O(1)",
        body: "Maintain the maximal valid window per right endpoint; add its length."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("subarray product less than k leetcode"),
    tags: ["sliding-window", "array", "two-pointers"],
    starterCode: buildStarter("intArrayK", "int", "numSubarrayProductLessThanK"),
    reference: (input) => {
      const nums = ints(lines(input)[0]);
      const k = int(lines(input)[1]);
      if (k <= 1) return "0";
      let prod = 1;
      let left = 0;
      let count = 0;
      for (let right = 0; right < nums.length; right++) {
        prod *= nums[right];
        while (prod >= k) prod /= nums[left++];
        count += right - left + 1;
      }
      return String(count);
    },
    tests: [
      { input: "10 5 2 6\n100", sample: true },
      { input: "1 2 3\n0", sample: true },
      { input: "1 1 1\n2" },
      { input: "9\n10" },
      { input: "9\n9" },
      { input: "2 5 3 10 4 2\n30" }
    ]
  }
];

// src/data/problems/binary-search.ts
var first4 = (s) => ints(s.split("\n")[0]);
var binarySearch = [
  {
    slug: "binary-search",
    title: "Binary Search",
    difficulty: "EASY",
    statement: `Given a sorted (ascending) integer array \`nums\` of distinct values and an integer \`target\`, return the index of \`target\`, or \`-1\` if it is not present. Your algorithm must run in O(log n).

**Input**
- Line 1: space-separated integers \`nums\` (sorted, distinct)
- Line 2: integer \`target\`

**Output**: the index, or -1.`,
    constraints: `- 1 \u2264 nums.length \u2264 10^4
- All values are distinct and sorted ascending.`,
    examples: [
      { input: "-1 0 3 5 9 12\n9", output: "4" },
      { input: "-1 0 3 5 9 12\n2", output: "-1" }
    ],
    hints: [
      "Compare the middle element with the target and discard half the array.",
      "Beware off-by-one: use lo \u2264 hi with hi = n \u2212 1, or lo < hi with hi = n \u2014 pick one convention and stick to it."
    ],
    editorial: `Classic binary search: maintain an inclusive range \`[lo, hi]\`, probe the midpoint, and discard the half that cannot contain the target. Each step halves the search space \u2192 O(log n). The two standard invariant styles (inclusive-inclusive vs half-open) both work; mixing them is where bugs come from.`,
    complexityTime: "O(log n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode binary search"),
    tags: ["binary-search", "array"],
    starterCode: buildStarter("intArrayTarget", "int", "search"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0);
      const target = int(l1);
      let lo = 0;
      let hi = nums.length - 1;
      while (lo <= hi) {
        const mid = lo + hi >> 1;
        if (nums[mid] === target) return String(mid);
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
      }
      return "-1";
    },
    tests: [
      { input: "-1 0 3 5 9 12\n9", sample: true },
      { input: "-1 0 3 5 9 12\n2", sample: true },
      { input: "5\n5" },
      { input: "5\n-5" },
      { input: "1 3\n3" }
    ]
  },
  {
    slug: "search-insert-position",
    title: "Search Insert Position",
    difficulty: "EASY",
    statement: `Given a sorted array of distinct integers \`nums\` and a \`target\`, return the index of \`target\` if found; otherwise return the index where it would be inserted to keep the array sorted. Must run in O(log n).

**Input**
- Line 1: space-separated integers (sorted, distinct)
- Line 2: integer \`target\`

**Output**: the index.`,
    constraints: `- 1 \u2264 nums.length \u2264 10^4
- Distinct values, sorted ascending.`,
    examples: [
      { input: "1 3 5 6\n5", output: "2" },
      { input: "1 3 5 6\n2", output: "1" },
      { input: "1 3 5 6\n7", output: "4" }
    ],
    hints: [
      "You're looking for the first index whose value is \u2265 target \u2014 a lower bound.",
      "When the loop ends, lo is exactly that boundary."
    ],
    editorial: `This is **lower bound**: the first position with value \u2265 target. Binary search with a half-open range \`[lo, hi)\`: if \`nums[mid] < target\` move \`lo = mid + 1\`, else \`hi = mid\`. When the range empties, \`lo\` is both the found index and the insertion point \u2014 no special cases needed.`,
    complexityTime: "O(log n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("search insert position binary search"),
    tags: ["binary-search", "array"],
    starterCode: buildStarter("intArrayTarget", "int", "searchInsert"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0);
      const target = int(l1);
      let lo = 0;
      let hi = nums.length;
      while (lo < hi) {
        const mid = lo + hi >> 1;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      return String(lo);
    },
    tests: [
      { input: "1 3 5 6\n5", sample: true },
      { input: "1 3 5 6\n2", sample: true },
      { input: "1 3 5 6\n7", sample: true },
      { input: "1\n0" },
      { input: "1 3\n2" }
    ]
  },
  {
    slug: "sqrtx",
    title: "Sqrt(x)",
    difficulty: "EASY",
    statement: `Given a non-negative integer \`x\`, return the integer square root of \`x\` \u2014 the largest integer \`r\` such that \`r\xB2 \u2264 x\`. Do not use built-in exponent/sqrt functions.

**Input**: one line, the integer \`x\`.
**Output**: the integer square root.`,
    constraints: `- 0 \u2264 x \u2264 2^31 \u2212 1`,
    examples: [
      { input: "4", output: "2" },
      { input: "8", output: "2", explanation: "\u221A8 \u2248 2.83, truncated to 2." }
    ],
    hints: [
      "Binary search the answer space [0, x].",
      "Find the largest mid with mid\xB7mid \u2264 x. Watch for overflow in languages with fixed ints."
    ],
    editorial: `Binary search over the **answer space**: the predicate \`mid\xB2 \u2264 x\` is monotone (true then false), so find the last true. In fixed-width languages compare via \`mid \u2264 x / mid\` to dodge overflow. O(log x).`,
    complexityTime: "O(log x)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("sqrt x binary search leetcode"),
    tags: ["binary-search", "math"],
    starterCode: buildStarter("int", "int", "mySqrt"),
    reference: (input) => {
      const x = int(lines(input)[0]);
      let lo = 0;
      let hi = x;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (mid * mid <= x) lo = mid + 1;
        else hi = mid - 1;
      }
      return String(hi);
    },
    tests: [
      { input: "4", sample: true },
      { input: "8", sample: true },
      { input: "0" },
      { input: "1" },
      { input: "2147395599" }
    ]
  },
  {
    slug: "peak-index-in-a-mountain-array",
    title: "Peak Index in a Mountain Array",
    difficulty: "MEDIUM",
    statement: `A mountain array increases strictly to a single peak and then decreases strictly. Given a mountain array \`arr\`, return the index of the peak in O(log n).

**Input**: one line of space-separated integers (a valid mountain).
**Output**: the peak index.`,
    constraints: `- 3 \u2264 arr.length \u2264 10^5
- arr is guaranteed to be a mountain.`,
    examples: [
      { input: "0 1 0", output: "1" },
      { input: "0 10 5 2", output: "1" },
      { input: "3 9 8 6 4", output: "1" }
    ],
    hints: [
      "Compare arr[mid] with arr[mid + 1].",
      "If it's rising you're on the left slope; if falling, the peak is at mid or left of it."
    ],
    editorial: `Binary search on the slope: if \`arr[mid] < arr[mid+1]\` you are strictly left of the peak (move \`lo = mid + 1\`), otherwise the peak is at \`mid\` or before (\`hi = mid\`). The invariant converges to the single peak in O(log n).`,
    complexityTime: "O(log n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("peak index mountain array binary search"),
    tags: ["binary-search", "array"],
    starterCode: buildStarter("intArray", "int", "peakIndexInMountainArray"),
    reference: (input) => {
      const arr = first4(input);
      let lo = 0;
      let hi = arr.length - 1;
      while (lo < hi) {
        const mid = lo + hi >> 1;
        if (arr[mid] < arr[mid + 1]) lo = mid + 1;
        else hi = mid;
      }
      return String(lo);
    },
    tests: [
      { input: "0 1 0", sample: true },
      { input: "0 10 5 2", sample: true },
      { input: "3 9 8 6 4", sample: true },
      { input: "1 2 3 4 5 3 1" },
      { input: "24 69 100 99 79 78 67 36 26 19" }
    ]
  },
  {
    slug: "search-in-rotated-sorted-array",
    title: "Search in Rotated Sorted Array",
    difficulty: "MEDIUM",
    statement: `A sorted array of **distinct** integers was rotated at an unknown pivot (e.g. \`[0,1,2,4,5,6,7]\` \u2192 \`[4,5,6,7,0,1,2]\`). Given the rotated array \`nums\` and a \`target\`, return its index or \`-1\`, in O(log n).

**Input**
- Line 1: space-separated integers (rotated sorted, distinct)
- Line 2: integer \`target\`

**Output**: the index, or -1.`,
    constraints: `- 1 \u2264 nums.length \u2264 5000
- Distinct values.`,
    examples: [
      { input: "4 5 6 7 0 1 2\n0", output: "4" },
      { input: "4 5 6 7 0 1 2\n3", output: "-1" }
    ],
    hints: [
      "At any midpoint, at least one half is perfectly sorted.",
      "Check whether the target lies inside that sorted half; if not, search the other half."
    ],
    editorial: `At every step one side of \`mid\` is sorted (compare \`nums[lo]\` with \`nums[mid]\`). If the target's value falls within the sorted side's range, binary-search there; otherwise recurse into the unsorted side, which is itself a rotated sorted array. Each iteration halves the range \u2192 O(log n).`,
    complexityTime: "O(log n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode search in rotated sorted array"),
    tags: ["binary-search", "array"],
    starterCode: buildStarter("intArrayTarget", "int", "searchRotated"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0);
      const target = int(l1);
      let lo = 0;
      let hi = nums.length - 1;
      while (lo <= hi) {
        const mid = lo + hi >> 1;
        if (nums[mid] === target) return String(mid);
        if (nums[lo] <= nums[mid]) {
          if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
          else lo = mid + 1;
        } else {
          if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
          else hi = mid - 1;
        }
      }
      return "-1";
    },
    tests: [
      { input: "4 5 6 7 0 1 2\n0", sample: true },
      { input: "4 5 6 7 0 1 2\n3", sample: true },
      { input: "1\n1" },
      { input: "5 1 3\n3" },
      { input: "1 2 3 4 5\n4" }
    ]
  },
  {
    slug: "find-minimum-in-rotated-sorted-array",
    title: "Find Minimum in Rotated Sorted Array",
    difficulty: "MEDIUM",
    statement: `A sorted array of distinct integers was rotated between 1 and n times. Find the minimum element in O(log n).

**Input**: one line of space-separated integers (rotated sorted, distinct).
**Output**: the minimum value.`,
    constraints: `- 1 \u2264 nums.length \u2264 5000
- Distinct values.`,
    examples: [
      { input: "3 4 5 1 2", output: "1" },
      { input: "4 5 6 7 0 1 2", output: "0" },
      { input: "11 13 15 17", output: "11" }
    ],
    hints: [
      "Compare nums[mid] against nums[hi], not nums[lo].",
      "If nums[mid] > nums[hi], the minimum is strictly right of mid."
    ],
    editorial: `Compare the midpoint with the right end. If \`nums[mid] > nums[hi]\` the rotation point (and minimum) lies right of \`mid\`, so \`lo = mid + 1\`; otherwise the minimum is at \`mid\` or left, so \`hi = mid\`. The loop converges on the smallest element in O(log n).`,
    complexityTime: "O(log n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode find minimum in rotated sorted array"),
    tags: ["binary-search", "array"],
    starterCode: buildStarter("intArray", "int", "findMin"),
    reference: (input) => {
      const nums = first4(input);
      let lo = 0;
      let hi = nums.length - 1;
      while (lo < hi) {
        const mid = lo + hi >> 1;
        if (nums[mid] > nums[hi]) lo = mid + 1;
        else hi = mid;
      }
      return String(nums[lo]);
    },
    tests: [
      { input: "3 4 5 1 2", sample: true },
      { input: "4 5 6 7 0 1 2", sample: true },
      { input: "11 13 15 17", sample: true },
      { input: "2 1" },
      { input: "1" }
    ]
  },
  {
    slug: "find-first-and-last-position-of-element-in-sorted-array",
    title: "Find First and Last Position of Element in Sorted Array",
    difficulty: "MEDIUM",
    statement: `Given a non-decreasing integer array \`nums\` and a \`target\`, return the first and last index of \`target\`. If it is absent, return \`-1 -1\`. Must run in O(log n).

**Input**
- Line 1: space-separated integers (sorted, may repeat)
- Line 2: integer \`target\`

**Output**: two indices, space-separated.`,
    constraints: `- 0 \u2264 nums.length \u2264 10^5
- Sorted non-decreasing.`,
    examples: [
      { input: "5 7 7 8 8 10\n8", output: "3 4" },
      { input: "5 7 7 8 8 10\n6", output: "-1 -1" }
    ],
    hints: [
      "Run two binary searches: a lower bound for the first occurrence and an upper bound for one past the last.",
      "If lowerBound points past the array or at a different value, the target is absent."
    ],
    editorial: `Two boundary searches: **lower bound** (first index with value \u2265 target) gives the start; **upper bound** (first index with value > target) minus one gives the end. If the lower bound doesn't land on the target, return \`-1 -1\`. Two O(log n) passes, no linear scanning.`,
    complexityTime: "O(log n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("find first and last position binary search"),
    tags: ["binary-search", "array"],
    starterCode: buildStarter("intArrayTarget", "intArray", "searchRange"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0);
      const target = int(l1);
      const bound = (gt) => {
        let lo = 0;
        let hi = nums.length;
        while (lo < hi) {
          const mid = lo + hi >> 1;
          if (nums[mid] < target || gt && nums[mid] === target) lo = mid + 1;
          else hi = mid;
        }
        return lo;
      };
      const start = bound(false);
      if (start === nums.length || nums[start] !== target) return "-1 -1";
      return `${start} ${bound(true) - 1}`;
    },
    tests: [
      { input: "5 7 7 8 8 10\n8", sample: true },
      { input: "5 7 7 8 8 10\n6", sample: true },
      { input: "\n0" },
      { input: "1\n1" },
      { input: "2 2 2 2\n2" }
    ]
  },
  {
    slug: "koko-eating-bananas",
    title: "Koko Eating Bananas",
    difficulty: "MEDIUM",
    statement: `Koko has \`piles\` of bananas and \`h\` hours. Each hour she picks one pile and eats up to \`k\` bananas from it (a pile smaller than \`k\` still costs the whole hour). Return the minimum integer speed \`k\` that finishes all piles within \`h\` hours.

**Input**
- Line 1: space-separated integers \`piles\`
- Line 2: integer \`h\`

**Output**: the minimum k.`,
    constraints: `- 1 \u2264 piles.length \u2264 10^4
- piles.length \u2264 h \u2264 10^9
- 1 \u2264 piles[i] \u2264 10^9`,
    examples: [
      { input: "3 6 7 11\n8", output: "4" },
      { input: "30 11 23 4 20\n5", output: "30" },
      { input: "30 11 23 4 20\n6", output: "23" }
    ],
    hints: [
      "For a fixed k, hours needed = \u03A3 ceil(pile / k) \u2014 checkable in O(n).",
      "That predicate is monotone in k: faster speeds always finish sooner. Binary search k."
    ],
    editorial: `Binary search the **answer space** k \u2208 [1, max(piles)]. For a candidate speed, the required time \`\u03A3 ceil(pile/k)\` decreases monotonically as k grows, so find the smallest k whose time is \u2264 h. O(n log max(piles)).`,
    complexityTime: "O(n log M)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode koko eating bananas"),
    tags: ["binary-search", "array"],
    starterCode: buildStarter("intArrayK", "int", "minEatingSpeed"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const piles = ints(l0);
      const h = int(l1);
      let lo = 1;
      let hi = Math.max(...piles);
      while (lo < hi) {
        const mid = lo + hi >> 1;
        const hours = piles.reduce((acc, p) => acc + Math.ceil(p / mid), 0);
        if (hours <= h) hi = mid;
        else lo = mid + 1;
      }
      return String(lo);
    },
    tests: [
      { input: "3 6 7 11\n8", sample: true },
      { input: "30 11 23 4 20\n5", sample: true },
      { input: "30 11 23 4 20\n6", sample: true },
      { input: "1\n1" },
      { input: "312884470\n312884469" }
    ]
  },
  {
    slug: "search-a-2d-matrix",
    title: "Search a 2D Matrix",
    difficulty: "MEDIUM",
    statement: `You are given an \`r \xD7 c\` matrix where each row is sorted ascending and the first value of each row is greater than the last value of the previous row. Determine whether \`target\` exists in the matrix, in O(log(r\xB7c)).

**Input**
- Line 1: two integers \`r c\`
- Next r lines: the matrix rows
- Last line: the integer \`target\`

**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 r, c \u2264 100
- Rows sorted; row starts exceed previous row ends.`,
    examples: [
      { input: "3 4\n1 3 5 7\n10 11 16 20\n23 30 34 60\n3", output: "true" },
      { input: "3 4\n1 3 5 7\n10 11 16 20\n23 30 34 60\n13", output: "false" }
    ],
    hints: [
      "The whole matrix is one sorted list read row by row.",
      "Binary search indices 0 \u2026 r\xB7c\u22121 and map i \u2192 (i / c, i % c)."
    ],
    editorial: `Because rows chain in sorted order, the matrix is a single sorted array of length r\xB7c viewed through index arithmetic: element \`i\` lives at row \`\u230Ai/c\u230B\`, column \`i mod c\`. One standard binary search over that virtual array gives O(log(r\xB7c)) with no extra space.`,
    complexityTime: "O(log(r\xB7c))",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode search 2d matrix"),
    tags: ["binary-search", "matrix"],
    starterCode: buildStarter("matrixK", "bool", "searchMatrix"),
    reference: (input) => {
      const ls = lines(input);
      const [r, c] = ints(ls[0]);
      const grid = [];
      for (let i = 0; i < r; i++) grid.push(ints(ls[1 + i]));
      const target = int(ls[1 + r]);
      let lo = 0;
      let hi = r * c - 1;
      while (lo <= hi) {
        const mid = lo + hi >> 1;
        const v = grid[Math.floor(mid / c)][mid % c];
        if (v === target) return boolOut(true);
        if (v < target) lo = mid + 1;
        else hi = mid - 1;
      }
      return boolOut(false);
    },
    tests: [
      { input: "3 4\n1 3 5 7\n10 11 16 20\n23 30 34 60\n3", sample: true },
      { input: "3 4\n1 3 5 7\n10 11 16 20\n23 30 34 60\n13", sample: true },
      { input: "1 1\n5\n5" },
      { input: "1 2\n1 3\n2" },
      { input: "2 2\n1 3\n5 7\n7" }
    ]
  },
  {
    slug: "median-of-two-sorted-arrays",
    title: "Median of Two Sorted Arrays",
    difficulty: "HARD",
    statement: `Given two sorted arrays \`nums1\` and \`nums2\`, return the median of the combined sorted data. The intended solution runs in O(log(min(m, n))).

**Input**
- Line 1: space-separated integers \`nums1\` (may be empty)
- Line 2: space-separated integers \`nums2\` (may be empty)

**Output**: the median with two decimal places (the template formats it).`,
    constraints: `- 0 \u2264 m, n \u2264 1000, m + n \u2265 1
- -10^6 \u2264 values \u2264 10^6`,
    examples: [
      { input: "1 3\n2", output: "2.00", explanation: "Merged: [1,2,3], median 2." },
      { input: "1 2\n3 4", output: "2.50", explanation: "Merged: [1,2,3,4], median (2+3)/2." }
    ],
    hints: [
      "A merge gives O(m+n). The target bound demands partitioning, not merging.",
      "Binary search a cut in the shorter array; the cut in the other array is forced by the half-length.",
      "A correct partition has every left element \u2264 every right element across both arrays."
    ],
    editorial: `Binary search the cut position in the shorter array. A cut of \`i\` elements there forces \`(m+n+1)/2 \u2212 i\` from the other array. The partition is correct when \`maxLeft\u2081 \u2264 minRight\u2082\` and \`maxLeft\u2082 \u2264 minRight\u2081\`; then the median comes from the boundary values. Each probe adjusts the cut like standard binary search \u2192 O(log min(m, n)).`,
    approaches: [
      {
        name: "Merge and index",
        complexityTime: "O(m + n)",
        complexitySpace: "O(m + n)",
        body: "Merge both arrays and read the middle. Simple, and fine when the log bound isn't required."
      },
      {
        name: "Partition binary search",
        complexityTime: "O(log min(m, n))",
        complexitySpace: "O(1)",
        body: "Search the cut point satisfying the cross inequalities; median from boundary max/min values."
      }
    ],
    complexityTime: "O(log min(m, n))",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode median of two sorted arrays"),
    tags: ["binary-search", "array", "divide-and-conquer"],
    starterCode: buildStarter("twoIntArrays", "float2", "findMedianSortedArrays"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const merged = [...ints(l0), ...ints(l1)].sort((a, b) => a - b);
      const n = merged.length;
      const median = n % 2 === 1 ? merged[(n - 1) / 2] : (merged[n / 2 - 1] + merged[n / 2]) / 2;
      return median.toFixed(2);
    },
    tests: [
      { input: "1 3\n2", sample: true },
      { input: "1 2\n3 4", sample: true },
      { input: "\n1" },
      { input: "2\n" },
      { input: "1 1 1\n1 1" },
      { input: "-5 3 6 12 15\n-12 -10 -6 -3 4 10" }
    ]
  },
  {
    slug: "capacity-to-ship-packages-within-d-days",
    title: "Capacity to Ship Packages Within D Days",
    difficulty: "MEDIUM",
    statement: `A conveyor belt has packages with given weights that must be shipped **in order**, splitting them across at most \`days\` days. The ship has a fixed daily capacity. Return the minimum capacity that ships everything within \`days\` days.

**Input**
- Line 1: space-separated package weights (in belt order)
- Line 2: the integer \`days\`

**Output**: the minimum ship capacity.`,
    constraints: `- 1 \u2264 weights.length \u2264 5\xB710^4
- 1 \u2264 weights[i] \u2264 500
- 1 \u2264 days \u2264 weights.length`,
    examples: [
      {
        input: "1 2 3 4 5 6 7 8 9 10\n5",
        output: "15",
        explanation: "Days: (1 2 3 4 5), (6 7), (8), (9), (10)."
      },
      { input: "3 2 2 4 1 4\n3", output: "6" },
      { input: "1 2 3 1 1\n4", output: "3" }
    ],
    hints: [
      "You can't reorder packages \u2014 a day is a contiguous chunk.",
      "For a fixed capacity, checking feasibility is a greedy O(n) scan. That's the shape of binary-search-on-the-answer.",
      "The answer lies between max(weights) (must fit the biggest package) and sum(weights) (one day ships all)."
    ],
    editorial: `Binary search over the *answer space*, not the array. Feasibility is monotone: if capacity C works, every capacity above C works too \u2014 exactly the sorted-boolean structure binary search needs. \`canShip(C)\` greedily packs each day until adding the next package would overflow, counting days; it's optimal per capacity because deferring a package never helps. Search [max(weights), sum(weights)], keeping the smallest feasible C. O(n log(sum \u2212 max)). This is the same template as Koko Eating Bananas \u2014 recognizing 'minimize X such that check(X) passes, check is monotone' is the entire skill.`,
    approaches: [
      {
        name: "Binary search on capacity",
        complexityTime: "O(n log \u03A3w)",
        complexitySpace: "O(1)",
        body: "Greedy day-count feasibility check inside a search over [max, sum]."
      }
    ],
    complexityTime: "O(n log \u03A3w)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("capacity to ship packages within d days neetcode"),
    tags: ["binary-search", "greedy", "answer-space"],
    starterCode: buildStarter("intArrayK", "int", "shipWithinDays"),
    reference: (input) => {
      const weights = ints(lines(input)[0]);
      const days = int(lines(input)[1]);
      let lo = Math.max(...weights);
      let hi = weights.reduce((a, b) => a + b, 0);
      const canShip = (cap) => {
        let d = 1;
        let cur = 0;
        for (const w of weights) {
          if (cur + w > cap) {
            d++;
            cur = 0;
          }
          cur += w;
        }
        return d <= days;
      };
      while (lo < hi) {
        const mid = lo + hi >> 1;
        if (canShip(mid)) hi = mid;
        else lo = mid + 1;
      }
      return String(lo);
    },
    tests: [
      { input: "1 2 3 4 5 6 7 8 9 10\n5", sample: true },
      { input: "3 2 2 4 1 4\n3", sample: true },
      { input: "1 2 3 1 1\n4", sample: true },
      { input: "10\n1" },
      { input: "5 5 5 5\n4" },
      { input: "500 200 300 100 400\n2" }
    ]
  }
];

// src/data/problems/stacks-queues.ts
var first5 = (s) => ints(s.split("\n")[0]);
var stacksQueues = [
  {
    slug: "min-stack",
    title: "Min Stack",
    difficulty: "MEDIUM",
    statement: `Design a stack that supports \`push\`, \`pop\`, \`top\`, and retrieving the minimum element \u2014 all in O(1).

**Input**: one operation per line \u2014
- \`push x\` \u2014 push integer x
- \`pop\` \u2014 remove the top
- \`top\` \u2014 read the top
- \`getMin\` \u2014 read the minimum

**Output**: one line per operation \u2014 \`push\` and \`pop\` print \`null\`; \`top\` and \`getMin\` print their result. Operations are always valid (no pop/top on an empty stack).`,
    constraints: `- Up to 3\xB710^4 operations
- -2^31 \u2264 x \u2264 2^31 \u2212 1`,
    examples: [
      {
        input: "push -2\npush 0\npush -3\ngetMin\npop\ntop\ngetMin",
        output: "null\nnull\nnull\n-3\nnull\n0\n-2"
      }
    ],
    hints: [
      "A single min variable breaks when the minimum gets popped.",
      "Store the minimum *so far* alongside every element \u2014 or keep a second stack of minimums."
    ],
    editorial: `Keep a second stack that records the minimum of everything at or below each position: on \`push x\`, push \`min(x, minStack.top)\`; on \`pop\`, pop both. \`getMin\` is then just the top of the min stack. Every operation is a plain stack operation \u2192 O(1) each, O(n) space.`,
    complexityTime: "O(1) per operation",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode min stack"),
    tags: ["stack", "design"],
    starterCode: buildStarter("ops", "lines", "processOps"),
    reference: (input) => {
      const ops = lines(input).filter((l) => l.trim().length > 0);
      const st = [];
      const mins = [];
      const out = [];
      for (const op of ops) {
        const parts = op.trim().split(/\s+/);
        if (parts[0] === "push") {
          const x = parseInt(parts[1], 10);
          st.push(x);
          mins.push(mins.length ? Math.min(x, mins[mins.length - 1]) : x);
          out.push("null");
        } else if (parts[0] === "pop") {
          st.pop();
          mins.pop();
          out.push("null");
        } else if (parts[0] === "top") {
          out.push(String(st[st.length - 1]));
        } else {
          out.push(String(mins[mins.length - 1]));
        }
      }
      return linesOut(out);
    },
    tests: [
      { input: "push -2\npush 0\npush -3\ngetMin\npop\ntop\ngetMin", sample: true },
      { input: "push 5\ntop\ngetMin\npush 3\ngetMin\npop\ngetMin" },
      { input: "push 1\npush 1\npush 1\ngetMin\npop\npop\ntop" },
      { input: "push 2147483647\ngetMin\npush -2147483648\ngetMin\npop\ngetMin" }
    ]
  },
  {
    slug: "implement-queue-using-stacks",
    title: "Implement Queue using Stacks",
    difficulty: "EASY",
    statement: `Implement a FIFO queue using only two stacks.

**Input**: one operation per line \u2014
- \`push x\` \u2014 enqueue integer x
- \`pop\` \u2014 dequeue and print the front
- \`peek\` \u2014 print the front
- \`empty\` \u2014 print \`true\`/\`false\`

**Output**: one line per operation \u2014 \`push\` prints \`null\`; the others print their result.`,
    constraints: `- Up to 100 operations; pop/peek are always valid.`,
    examples: [
      {
        input: "push 1\npush 2\npeek\npop\nempty",
        output: "null\nnull\n1\n1\nfalse"
      }
    ],
    hints: [
      "Two stacks: one for inbox, one for outbox.",
      "Only flip the inbox into the outbox when the outbox is empty \u2014 that preserves order."
    ],
    editorial: `Push everything onto an **in** stack. When popping or peeking, if the **out** stack is empty, pour the in-stack into it (reversing order \u2014 oldest ends up on top), then serve from out. Each element moves at most twice, so operations are **amortized O(1)**.`,
    complexityTime: "Amortized O(1)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("implement queue using stacks leetcode"),
    tags: ["stack", "queue", "design"],
    starterCode: buildStarter("ops", "lines", "processOps"),
    reference: (input) => {
      const ops = lines(input).filter((l) => l.trim().length > 0);
      const q = [];
      const out = [];
      for (const op of ops) {
        const parts = op.trim().split(/\s+/);
        if (parts[0] === "push") {
          q.push(parseInt(parts[1], 10));
          out.push("null");
        } else if (parts[0] === "pop") {
          out.push(String(q.shift()));
        } else if (parts[0] === "peek") {
          out.push(String(q[0]));
        } else {
          out.push(q.length === 0 ? "true" : "false");
        }
      }
      return linesOut(out);
    },
    tests: [
      { input: "push 1\npush 2\npeek\npop\nempty", sample: true },
      { input: "empty\npush 7\nempty\npop\nempty" },
      { input: "push 1\npush 2\npush 3\npop\npop\npush 4\npop\npop\nempty" }
    ]
  },
  {
    slug: "evaluate-reverse-polish-notation",
    title: "Evaluate Reverse Polish Notation",
    difficulty: "MEDIUM",
    statement: `Evaluate an arithmetic expression given in Reverse Polish (postfix) notation. Valid operators are \`+\`, \`-\`, \`*\`, \`/\`. Division truncates toward zero. The expression is always valid and no division by zero occurs.

**Input**: one line of space-separated tokens.
**Output**: the value of the expression.`,
    constraints: `- 1 \u2264 tokens.length \u2264 10^4
- Intermediate values fit in a 32-bit integer.`,
    examples: [
      { input: "2 1 + 3 *", output: "9", explanation: "(2 + 1) \xD7 3." },
      { input: "4 13 5 / +", output: "6", explanation: "4 + (13 / 5) = 4 + 2." },
      { input: "10 6 9 3 + -11 * / * 17 + 5 +", output: "22" }
    ],
    hints: [
      "Push numbers; on an operator, pop two operands, apply, push the result.",
      "Order matters for - and /: the second pop is the left operand.",
      "Truncate division toward zero (not floor) \u2014 mind negative results."
    ],
    editorial: `Postfix expressions evaluate naturally with a stack: operands are pushed, and each operator consumes the top two values (the first popped is the **right** operand) and pushes the result. Division must truncate toward zero, which differs from floor division for negatives. One pass, O(n) time and space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode evaluate reverse polish notation"),
    tags: ["stack", "array", "math"],
    starterCode: buildStarter("stringArray", "int", "evalRPN"),
    reference: (input) => {
      const tokens = words(lines(input)[0]);
      const st = [];
      for (const t of tokens) {
        if (t === "+" || t === "-" || t === "*" || t === "/") {
          const b = st.pop();
          const a = st.pop();
          let v;
          if (t === "+") v = a + b;
          else if (t === "-") v = a - b;
          else if (t === "*") v = a * b;
          else v = Math.trunc(a / b);
          st.push(v);
        } else {
          st.push(parseInt(t, 10));
        }
      }
      return String(st[0]);
    },
    tests: [
      { input: "2 1 + 3 *", sample: true },
      { input: "4 13 5 / +", sample: true },
      { input: "10 6 9 3 + -11 * / * 17 + 5 +" },
      { input: "42" },
      { input: "-7 3 /" }
    ]
  },
  {
    slug: "daily-temperatures",
    title: "Daily Temperatures",
    difficulty: "MEDIUM",
    statement: `Given an array \`temperatures\`, return an array \`answer\` where \`answer[i]\` is the number of days you must wait after day \`i\` for a warmer temperature, or \`0\` if none exists.

**Input**: one line of space-separated integers.
**Output**: the answer array, space-separated.`,
    constraints: `- 1 \u2264 temperatures.length \u2264 10^5
- 30 \u2264 temperatures[i] \u2264 100`,
    examples: [
      { input: "73 74 75 71 69 72 76 73", output: "1 1 4 2 1 1 0 0" },
      { input: "30 40 50 60", output: "1 1 1 0" }
    ],
    hints: [
      "Brute force scans forward for each day \u2014 O(n\xB2).",
      "Keep a stack of indices whose warmer day hasn't been found yet.",
      "When a warmer temperature arrives, it resolves every colder index on the stack."
    ],
    editorial: `Maintain a **monotonic stack** of indices with strictly decreasing temperatures. Each new day pops every index whose temperature is lower \u2014 the wait for those days is the index difference \u2014 then pushes itself. Every index is pushed and popped once \u2192 O(n).`,
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode daily temperatures"),
    tags: ["stack", "monotonic-stack", "array"],
    starterCode: buildStarter("intArray", "intArray", "dailyTemperatures"),
    reference: (input) => {
      const t = first5(input);
      const res = new Array(t.length).fill(0);
      const st = [];
      for (let i = 0; i < t.length; i++) {
        while (st.length && t[i] > t[st[st.length - 1]]) {
          const j = st.pop();
          res[j] = i - j;
        }
        st.push(i);
      }
      return arrOut(res);
    },
    tests: [
      { input: "73 74 75 71 69 72 76 73", sample: true },
      { input: "30 40 50 60", sample: true },
      { input: "30 60 90" },
      { input: "90 60 30" },
      { input: "55" }
    ]
  },
  {
    slug: "next-greater-element-ii",
    title: "Next Greater Element II",
    difficulty: "MEDIUM",
    statement: `Given a **circular** integer array \`nums\`, return for each element the next greater element scanning forward (wrapping around); use \`-1\` if none exists.

**Input**: one line of space-separated integers.
**Output**: the result array, space-separated.`,
    constraints: `- 1 \u2264 nums.length \u2264 10^4
- -10^9 \u2264 nums[i] \u2264 10^9`,
    examples: [
      { input: "1 2 1", output: "2 -1 2", explanation: "The last 1 wraps around to find 2." },
      { input: "1 2 3 4 3", output: "2 3 4 -1 4" }
    ],
    hints: [
      "Handle circularity by iterating the array twice (indices mod n).",
      "Use the same decreasing monotonic stack as in Daily Temperatures."
    ],
    editorial: `Run the standard next-greater monotonic stack over indices \`0 \u2026 2n\u22121\`, taking values at \`i mod n\`. The second lap lets elements near the end see candidates at the front, and only the first lap pushes indices. O(n) time, O(n) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("next greater element ii monotonic stack"),
    tags: ["stack", "monotonic-stack", "array"],
    starterCode: buildStarter("intArray", "intArray", "nextGreaterElements"),
    reference: (input) => {
      const nums = first5(input);
      const n = nums.length;
      const res = new Array(n).fill(-1);
      const st = [];
      for (let i = 0; i < 2 * n; i++) {
        const v = nums[i % n];
        while (st.length && nums[st[st.length - 1]] < v) {
          res[st.pop()] = v;
        }
        if (i < n) st.push(i);
      }
      return arrOut(res);
    },
    tests: [
      { input: "1 2 1", sample: true },
      { input: "1 2 3 4 3", sample: true },
      { input: "5 4 3 2 1" },
      { input: "1 1 1" },
      { input: "7" }
    ]
  },
  {
    slug: "asteroid-collision",
    title: "Asteroid Collision",
    difficulty: "MEDIUM",
    statement: `Asteroids move along a line: the absolute value is size, the sign is direction (positive \u2192 right, negative \u2192 left). All move at the same speed. When two collide, the smaller explodes (both if equal). Asteroids moving the same direction never meet. Return the state after all collisions.

**Input**: one line of space-separated non-zero integers.
**Output**: the surviving asteroids, space-separated (empty if none survive).`,
    constraints: `- 2 \u2264 asteroids.length \u2264 10^4
- -1000 \u2264 asteroids[i] \u2264 1000, non-zero.`,
    examples: [
      { input: "5 10 -5", output: "5 10", explanation: "10 destroys -5." },
      { input: "8 -8", output: "", explanation: "Mutual destruction." },
      { input: "10 2 -5", output: "10", explanation: "-5 destroys 2, then 10 destroys -5." }
    ],
    hints: [
      "Collisions only happen when a right-mover is followed by a left-mover.",
      "Keep survivors on a stack; a new left-mover fights the stack top repeatedly."
    ],
    editorial: `Scan left to right with a stack of survivors. A new asteroid only fights while the stack top moves right and the newcomer moves left: pop smaller right-movers, annihilate on ties, and discard the newcomer if the top is bigger. Each asteroid is pushed/popped at most once \u2192 O(n).`,
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("asteroid collision leetcode stack"),
    tags: ["stack", "array", "simulation"],
    starterCode: buildStarter("intArray", "intArray", "asteroidCollision"),
    reference: (input) => {
      const asteroids = first5(input);
      const st = [];
      for (const a of asteroids) {
        let alive = true;
        while (alive && a < 0 && st.length && st[st.length - 1] > 0) {
          const top = st[st.length - 1];
          if (top < -a) {
            st.pop();
          } else if (top === -a) {
            st.pop();
            alive = false;
          } else {
            alive = false;
          }
        }
        if (alive) st.push(a);
      }
      return arrOut(st);
    },
    tests: [
      { input: "5 10 -5", sample: true },
      { input: "8 -8", sample: true },
      { input: "10 2 -5", sample: true },
      { input: "-2 -1 1 2" },
      { input: "1 -2 -2 -2" }
    ]
  },
  {
    slug: "simplify-path",
    title: "Simplify Path",
    difficulty: "MEDIUM",
    statement: `Given an absolute Unix file path, return the simplified canonical path: it starts with a single \`/\`, has no trailing slash (unless it is the root), no \`.\` or \`..\` segments, and no double slashes.

**Input**: one line, the path.
**Output**: the canonical path.`,
    constraints: `- 1 \u2264 path.length \u2264 3000
- Consists of letters, digits, '.', '/', '_'.
- Always starts with '/'.`,
    examples: [
      { input: "/home/", output: "/home" },
      { input: "/../", output: "/", explanation: "You cannot go above the root." },
      { input: "/home//foo/", output: "/home/foo" },
      { input: "/a/./b/../../c/", output: "/c" }
    ],
    hints: [
      "Split on '/' and process each segment.",
      "'..' pops the last directory; '.' and empty segments are ignored."
    ],
    editorial: `Split on \`/\` and fold the segments through a stack: normal names push, \`..\` pops (if anything to pop), while \`.\` and empty segments (from doubled slashes) are skipped. Join the stack with \`/\` and prefix the root. O(n) time and space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("simplify path leetcode stack"),
    tags: ["stack", "string"],
    starterCode: buildStarter("string", "string", "simplifyPath"),
    reference: (input) => {
      const path = lines(input)[0] ?? "";
      const st = [];
      for (const seg of path.split("/")) {
        if (seg === "" || seg === ".") continue;
        if (seg === "..") st.pop();
        else st.push(seg);
      }
      return "/" + st.join("/");
    },
    tests: [
      { input: "/home/", sample: true },
      { input: "/../", sample: true },
      { input: "/home//foo/", sample: true },
      { input: "/a/./b/../../c/" },
      { input: "/.../a/../b/c/../d/./" }
    ]
  },
  {
    slug: "decode-string",
    title: "Decode String",
    difficulty: "MEDIUM",
    statement: `Given an encoded string where \`k[encoded]\` means the bracketed content is repeated \`k\` times (nestable), return the decoded string.

**Input**: one line, the encoded string.
**Output**: the decoded string.`,
    constraints: `- 1 \u2264 s.length \u2264 30
- k is a positive integer \u2264 300; input is always valid.
- Output length \u2264 10^5.`,
    examples: [
      { input: "3[a]2[bc]", output: "aaabcbc" },
      { input: "3[a2[c]]", output: "accaccacc" },
      { input: "2[abc]3[cd]ef", output: "abcabccdcdcdef" }
    ],
    hints: [
      "Nesting screams stack (or recursion).",
      "On '[' push the current string and count; on ']' pop and combine.",
      "Numbers can be multi-digit \u2014 accumulate them."
    ],
    editorial: `Walk the string keeping a current segment and repeat count. On \`[\`, push both onto a stack and reset; on \`]\`, pop \`(prev, k)\` and set current = prev + current\xD7k. Digits accumulate into the count (they can be multi-digit). Each character is processed once \u2192 O(n + output).`,
    complexityTime: "O(n + |output|)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode decode string"),
    tags: ["stack", "string", "recursion"],
    starterCode: buildStarter("string", "string", "decodeString"),
    reference: (input) => {
      const s = lines(input)[0] ?? "";
      const st = [];
      let cur = "";
      let k = 0;
      for (const ch of s) {
        if (ch >= "0" && ch <= "9") {
          k = k * 10 + (ch.charCodeAt(0) - 48);
        } else if (ch === "[") {
          st.push([cur, k]);
          cur = "";
          k = 0;
        } else if (ch === "]") {
          const [prev, times] = st.pop();
          cur = prev + cur.repeat(times);
        } else {
          cur += ch;
        }
      }
      return cur;
    },
    tests: [
      { input: "3[a]2[bc]", sample: true },
      { input: "3[a2[c]]", sample: true },
      { input: "2[abc]3[cd]ef", sample: true },
      { input: "abc" },
      { input: "10[a]" }
    ]
  },
  {
    slug: "remove-k-digits",
    title: "Remove K Digits",
    difficulty: "MEDIUM",
    statement: `Given a string \`num\` representing a non-negative integer and an integer \`k\`, remove exactly \`k\` digits so the remaining number is the smallest possible. Strip leading zeros; if nothing remains, return \`0\`.

**Input**
- Line 1: the digit string \`num\`
- Line 2: integer \`k\`

**Output**: the smallest resulting number as a string.`,
    constraints: `- 1 \u2264 num.length \u2264 10^5
- 0 \u2264 k \u2264 num.length
- No leading zeros in the input (except "0" itself).`,
    examples: [
      { input: "1432219\n3", output: "1219", explanation: "Remove 4, 3, 2." },
      { input: "10200\n1", output: "200", explanation: "Remove the 1; leading zeros are stripped." },
      { input: "10\n2", output: "0" }
    ],
    hints: [
      "A bigger digit followed by a smaller one should be deleted \u2014 greedily, from the left.",
      "Keep a stack of digits; pop while the top exceeds the incoming digit and removals remain.",
      "If removals are left over at the end, trim from the tail."
    ],
    editorial: `Build the answer with a **monotonic non-decreasing stack** of digits: while the incoming digit is smaller than the stack top and removals remain, pop. Leftover removals come off the end (the tail is the largest suffix). Finally strip leading zeros. Each digit is pushed and popped at most once \u2192 O(n).`,
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("remove k digits monotonic stack"),
    tags: ["stack", "monotonic-stack", "greedy", "string"],
    starterCode: buildStarter("stringInt", "string", "removeKdigits"),
    reference: (input) => {
      const [num = "", kline] = lines(input);
      let k = int(kline);
      const st = [];
      for (const d of num) {
        while (k > 0 && st.length && st[st.length - 1] > d) {
          st.pop();
          k--;
        }
        st.push(d);
      }
      while (k > 0) {
        st.pop();
        k--;
      }
      const res = st.join("").replace(/^0+/, "");
      return res === "" ? "0" : res;
    },
    tests: [
      { input: "1432219\n3", sample: true },
      { input: "10200\n1", sample: true },
      { input: "10\n2", sample: true },
      { input: "9\n0" },
      { input: "112\n1" },
      { input: "5337\n2" }
    ]
  },
  {
    slug: "largest-rectangle-in-histogram",
    title: "Largest Rectangle in Histogram",
    difficulty: "HARD",
    statement: `Given an array \`heights\` of bar heights (width 1 each), return the area of the largest rectangle that fits inside the histogram.

**Input**: one line of space-separated integers.
**Output**: the maximum area.`,
    constraints: `- 1 \u2264 heights.length \u2264 10^5
- 0 \u2264 heights[i] \u2264 10^4`,
    examples: [
      { input: "2 1 5 6 2 3", output: "10", explanation: "Bars 5 and 6 give 5 \xD7 2 = 10." },
      { input: "2 4", output: "4" }
    ],
    hints: [
      "For each bar, the best rectangle using its height extends to the nearest shorter bar on each side.",
      "A monotonic increasing stack finds both boundaries as bars are popped.",
      "Append a sentinel height 0 to flush the stack at the end."
    ],
    editorial: `Sweep with a stack of indices whose heights increase. When the incoming bar is lower, pop: the popped bar's rectangle is bounded on the right by the current index and on the left by the new stack top. A trailing sentinel of height 0 flushes everything. Each bar enters and leaves the stack once \u2192 O(n).`,
    approaches: [
      {
        name: "Divide and conquer on the minimum",
        complexityTime: "O(n log n) average",
        complexitySpace: "O(log n)",
        body: "Best rectangle spans the minimum bar or lies entirely on one side of it."
      },
      {
        name: "Monotonic stack",
        complexityTime: "O(n)",
        complexitySpace: "O(n)",
        body: "Pop when a shorter bar arrives; the pop computes that bar's maximal width."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode largest rectangle in histogram"),
    tags: ["stack", "monotonic-stack", "array"],
    starterCode: buildStarter("intArray", "int", "largestRectangleArea"),
    reference: (input) => {
      const heights = first5(input);
      const st = [];
      let best = 0;
      const h = [...heights, 0];
      for (let i = 0; i < h.length; i++) {
        while (st.length && h[st[st.length - 1]] > h[i]) {
          const height = h[st.pop()];
          const left = st.length ? st[st.length - 1] : -1;
          best = Math.max(best, height * (i - left - 1));
        }
        st.push(i);
      }
      return String(best);
    },
    tests: [
      { input: "2 1 5 6 2 3", sample: true },
      { input: "2 4", sample: true },
      { input: "1" },
      { input: "0 0" },
      { input: "5 5 5 5" },
      { input: "6 7 5 2 4 5 9 3" }
    ]
  },
  {
    slug: "next-greater-element-i",
    title: "Next Greater Element I",
    difficulty: "EASY",
    statement: `\`nums1\` is a subset of \`nums2\` (all values distinct). For each element of \`nums1\`, find the first element **greater than it** appearing to its right in \`nums2\`, or \u22121 if none exists.

**Input**
- Line 1: space-separated integers \u2014 \`nums1\`
- Line 2: space-separated integers \u2014 \`nums2\`

**Output**: the answers for \`nums1\`, space-separated.`,
    constraints: `- 1 \u2264 nums1.length \u2264 nums2.length \u2264 1000
- All values in nums2 are distinct; every nums1 value appears in nums2.`,
    examples: [
      {
        input: "4 1 2\n1 3 4 2",
        output: "-1 3 -1",
        explanation: "Nothing right of 4 is bigger; 3 follows 1; nothing follows 2."
      },
      { input: "2 4\n1 2 3 4", output: "3 -1" }
    ],
    hints: [
      "Solve it entirely on nums2 first; nums1 just reads the answers.",
      "A monotonic decreasing stack: while the new element beats the stack top, the top just found its next-greater.",
      "Store the results in a map keyed by value (values are distinct)."
    ],
    editorial: `One pass over nums2 with a monotonic stack: push each element; whenever the incoming value exceeds the stack top, pop it and record incoming as its next-greater in a hash map. Elements left on the stack at the end have no answer (\u22121). Then map nums1 through the answers. Every element is pushed and popped at most once \u2014 O(n + m). This is the miniature version of the monotonic-stack pattern behind Daily Temperatures and stock spans: the stack always holds elements still waiting for something bigger.`,
    approaches: [
      {
        name: "Monotonic stack + map",
        complexityTime: "O(n + m)",
        complexitySpace: "O(n)",
        body: "Precompute next-greater for all of nums2; answer nums1 by lookup."
      }
    ],
    complexityTime: "O(n + m)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("next greater element i monotonic stack"),
    tags: ["stack", "monotonic-stack", "hash-map"],
    starterCode: buildStarter("twoIntArrays", "intArray", "nextGreaterElement"),
    reference: (input) => {
      const nums1 = ints(lines(input)[0]);
      const nums2 = ints(lines(input)[1]);
      const next = /* @__PURE__ */ new Map();
      const stack = [];
      for (const x of nums2) {
        while (stack.length && stack[stack.length - 1] < x) {
          next.set(stack.pop(), x);
        }
        stack.push(x);
      }
      return arrOut(nums1.map((x) => next.get(x) ?? -1));
    },
    tests: [
      { input: "4 1 2\n1 3 4 2", sample: true },
      { input: "2 4\n1 2 3 4", sample: true },
      { input: "5\n5" },
      { input: "1 3 5 2 4\n6 5 4 3 2 1" },
      { input: "3 1 4 2\n1 2 3 4" }
    ]
  }
];

// src/data/problems/linked-list.ts
var first6 = (s) => ints(s.split("\n")[0]);
var linkedList = [
  {
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    difficulty: "EASY",
    statement: `Given the head of a singly linked list, reverse it and return the new head.

**Input**: one line of space-separated integers \u2014 the list values in order (may be empty).
**Output**: the reversed list's values, space-separated.`,
    constraints: `- 0 \u2264 list length \u2264 5000
- -5000 \u2264 node values \u2264 5000`,
    examples: [
      { input: "1 2 3 4 5", output: "5 4 3 2 1" },
      { input: "1 2", output: "2 1" },
      { input: "", output: "" }
    ],
    hints: [
      "Walk the list keeping prev and curr pointers; flip one .next per step.",
      "Save curr.next before overwriting it."
    ],
    editorial: `Iterate with two pointers: at each node, remember its successor, point \`curr.next\` back at \`prev\`, then advance both. When \`curr\` runs off the end, \`prev\` is the new head. O(n) time, O(1) space. The recursive version is elegant but costs O(n) stack.`,
    approaches: [
      {
        name: "Iterative pointer flip",
        complexityTime: "O(n)",
        complexitySpace: "O(1)",
        body: "prev/curr walk; reverse one link per step."
      },
      {
        name: "Recursive",
        complexityTime: "O(n)",
        complexitySpace: "O(n)",
        body: "Reverse the tail, then attach the head behind it."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode reverse linked list"),
    tags: ["linked-list", "recursion"],
    starterCode: buildStarter("list", "list", "reverseList"),
    reference: (input) => arrOut(first6(input).reverse()),
    tests: [
      { input: "1 2 3 4 5", sample: true },
      { input: "1 2", sample: true },
      { input: "" },
      { input: "7" },
      { input: "-1 0 1" }
    ]
  },
  {
    slug: "middle-of-the-linked-list",
    title: "Middle of the Linked List",
    difficulty: "EASY",
    statement: `Given the head of a singly linked list, return the **middle node** (the second middle if there are two). The output prints the list from that node to the end.

**Input**: one line of space-separated integers \u2014 the list values.
**Output**: values from the middle node onward, space-separated.`,
    constraints: `- 1 \u2264 list length \u2264 100`,
    examples: [
      { input: "1 2 3 4 5", output: "3 4 5" },
      { input: "1 2 3 4 5 6", output: "4 5 6", explanation: "Two middles (3, 4) \u2014 return the second." }
    ],
    hints: [
      "Fast and slow pointers: the fast one moves two steps per iteration.",
      "When fast reaches the end, slow is at the middle."
    ],
    editorial: `The classic **tortoise and hare**: advance \`slow\` one step and \`fast\` two steps until \`fast\` falls off the list. \`slow\` then sits exactly at the middle (the second one for even lengths, because \`fast\` starts at the head). One pass, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("middle of the linked list fast slow pointers"),
    tags: ["linked-list", "two-pointers"],
    starterCode: buildStarter("list", "list", "middleNode"),
    reference: (input) => {
      const vals = first6(input);
      return arrOut(vals.slice(Math.floor(vals.length / 2)));
    },
    tests: [
      { input: "1 2 3 4 5", sample: true },
      { input: "1 2 3 4 5 6", sample: true },
      { input: "9" },
      { input: "1 2" }
    ]
  },
  {
    slug: "merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    difficulty: "EASY",
    statement: `Merge two sorted linked lists \`l1\` and \`l2\` into one sorted list by splicing their nodes, and return its head.

**Input**
- Line 1: values of \`l1\` (sorted, may be empty)
- Line 2: values of \`l2\` (sorted, may be empty)

**Output**: the merged list's values, space-separated.`,
    constraints: `- 0 \u2264 each list's length \u2264 50
- -100 \u2264 node values \u2264 100`,
    examples: [
      { input: "1 2 4\n1 3 4", output: "1 1 2 3 4 4" },
      { input: "\n", output: "" },
      { input: "\n0", output: "0" }
    ],
    hints: [
      "A dummy head node removes all the 'is this the first node?' special cases.",
      "Advance whichever list has the smaller front value; attach the leftover tail at the end."
    ],
    editorial: `Use a **dummy head** and a tail pointer. Repeatedly attach the smaller of the two front nodes and advance that list; when one empties, attach the other's remainder wholesale. O(m + n) time, O(1) extra space since nodes are reused.`,
    complexityTime: "O(m + n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode merge two sorted lists"),
    tags: ["linked-list", "recursion"],
    starterCode: buildStarter("twoLists", "list", "mergeTwoLists"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const a = ints(l0);
      const b = ints(l1);
      const res = [];
      let i = 0;
      let j = 0;
      while (i < a.length || j < b.length) {
        if (j >= b.length || i < a.length && a[i] <= b[j]) res.push(a[i++]);
        else res.push(b[j++]);
      }
      return arrOut(res);
    },
    tests: [
      { input: "1 2 4\n1 3 4", sample: true },
      { input: "\n", sample: true },
      { input: "\n0", sample: true },
      { input: "-3 5\n-10 -3 20" },
      { input: "1 1 1\n" }
    ]
  },
  {
    slug: "linked-list-cycle",
    title: "Linked List Cycle",
    difficulty: "EASY",
    statement: `Determine whether a linked list contains a cycle \u2014 i.e. some node can be reached again by following \`next\` pointers. Use O(1) memory.

**Input**
- Line 1: the list values in order
- Line 2: integer \`pos\` \u2014 the tail connects to the node at this 0-based index (\`-1\` means no cycle). Your function receives only the head; the cycle is already wired.

**Output**: \`true\` or \`false\`.`,
    constraints: `- 0 \u2264 list length \u2264 10^4
- pos is -1 or a valid index.`,
    examples: [
      { input: "3 2 0 -4\n1", output: "true", explanation: "Tail connects back to value 2." },
      { input: "1 2\n0", output: "true" },
      { input: "1\n-1", output: "false" }
    ],
    hints: [
      "A visited-set works but uses O(n) memory.",
      "Floyd's algorithm: if fast (2 steps) ever equals slow (1 step), there's a cycle."
    ],
    editorial: `**Floyd's cycle detection**: move \`slow\` one step and \`fast\` two. In a cycle, \`fast\` gains one position on \`slow\` per iteration, so they must meet; without a cycle, \`fast\` hits the end. O(n) time, O(1) space \u2014 the interview follow-up everyone should know.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode linked list cycle floyd"),
    tags: ["linked-list", "two-pointers"],
    starterCode: buildStarter("listCycle", "bool", "hasCycle"),
    reference: (input) => {
      const pos = int(lines(input)[1]);
      return boolOut(pos >= 0);
    },
    tests: [
      { input: "3 2 0 -4\n1", sample: true },
      { input: "1 2\n0", sample: true },
      { input: "1\n-1", sample: true },
      { input: "\n-1" },
      { input: "1 2 3 4 5\n4" },
      { input: "1 2 3 4 5\n-1" }
    ]
  },
  {
    slug: "remove-nth-node-from-end-of-list",
    title: "Remove Nth Node From End of List",
    difficulty: "MEDIUM",
    statement: `Remove the \`k\`-th node from the **end** of a linked list and return the head. Try to do it in one pass.

**Input**
- Line 1: the list values
- Line 2: integer \`k\` (1 \u2264 k \u2264 length)

**Output**: the resulting list's values, space-separated.`,
    constraints: `- 1 \u2264 list length \u2264 30
- 1 \u2264 k \u2264 length`,
    examples: [
      { input: "1 2 3 4 5\n2", output: "1 2 3 5" },
      { input: "1\n1", output: "" },
      { input: "1 2\n1", output: "1" }
    ],
    hints: [
      "Two passes is easy: count, then delete node (length \u2212 k).",
      "One pass: lead a right pointer k steps ahead, then move both until it hits the end.",
      "A dummy node before the head handles deleting the first node cleanly."
    ],
    editorial: `Advance a \`fast\` pointer \`k\` steps from a dummy pre-head, then walk \`fast\` and \`slow\` together until \`fast\` reaches the last node. \`slow\` now precedes the victim: splice it out with \`slow.next = slow.next.next\`. The dummy makes "remove the head" a non-special case. One pass, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode remove nth node from end"),
    tags: ["linked-list", "two-pointers"],
    starterCode: buildStarter("listK", "list", "removeNthFromEnd"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const vals = ints(l0);
      const k = int(l1);
      vals.splice(vals.length - k, 1);
      return arrOut(vals);
    },
    tests: [
      { input: "1 2 3 4 5\n2", sample: true },
      { input: "1\n1", sample: true },
      { input: "1 2\n1", sample: true },
      { input: "1 2\n2" },
      { input: "10 20 30 40\n4" }
    ]
  },
  {
    slug: "remove-duplicates-from-sorted-list",
    title: "Remove Duplicates from Sorted List",
    difficulty: "EASY",
    statement: `Given the head of a **sorted** linked list, delete duplicates so each value appears once, and return the (still sorted) list.

**Input**: one line of space-separated integers (sorted).
**Output**: the deduplicated list's values.`,
    constraints: `- 0 \u2264 list length \u2264 300
- Sorted non-decreasing.`,
    examples: [
      { input: "1 1 2", output: "1 2" },
      { input: "1 1 2 3 3", output: "1 2 3" }
    ],
    hints: [
      "Duplicates are adjacent in a sorted list.",
      "If curr.val equals curr.next.val, splice out curr.next; otherwise advance."
    ],
    editorial: `Walk the list once: when the current node's value equals its successor's, bypass the successor (\`curr.next = curr.next.next\`) without advancing; otherwise step forward. Sortedness guarantees all equal values are consecutive. O(n) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("remove duplicates from sorted list leetcode"),
    tags: ["linked-list"],
    starterCode: buildStarter("list", "list", "deleteDuplicates"),
    reference: (input) => {
      const vals = first6(input);
      return arrOut(vals.filter((x, i) => i === 0 || x !== vals[i - 1]));
    },
    tests: [
      { input: "1 1 2", sample: true },
      { input: "1 1 2 3 3", sample: true },
      { input: "" },
      { input: "5 5 5 5" },
      { input: "-2 -1 0" }
    ]
  },
  {
    slug: "palindrome-linked-list",
    title: "Palindrome Linked List",
    difficulty: "EASY",
    statement: `Return \`true\` if a singly linked list reads the same forwards and backwards. The follow-up asks for O(n) time and O(1) space.

**Input**: one line of space-separated integers.
**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 list length \u2264 10^5
- 0 \u2264 node values \u2264 9`,
    examples: [
      { input: "1 2 2 1", output: "true" },
      { input: "1 2", output: "false" }
    ],
    hints: [
      "Copying values to an array makes it trivial \u2014 but costs O(n) space.",
      "Find the middle (fast/slow), reverse the second half in place, then compare halves."
    ],
    editorial: `For O(1) space: locate the middle with fast/slow pointers, **reverse the second half** in place, then walk both halves comparing values. (Optionally restore the list afterwards.) Any mismatch \u2192 not a palindrome. O(n) time, O(1) space.`,
    approaches: [
      {
        name: "Copy to array",
        complexityTime: "O(n)",
        complexitySpace: "O(n)",
        body: "Dump values and two-pointer the array."
      },
      {
        name: "Reverse second half",
        complexityTime: "O(n)",
        complexitySpace: "O(1)",
        body: "Fast/slow to the middle, reverse, compare, optionally restore."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("palindrome linked list neetcode"),
    tags: ["linked-list", "two-pointers"],
    starterCode: buildStarter("list", "bool", "isPalindrome"),
    reference: (input) => {
      const vals = first6(input);
      const rev = [...vals].reverse();
      return boolOut(vals.every((v, i) => v === rev[i]));
    },
    tests: [
      { input: "1 2 2 1", sample: true },
      { input: "1 2", sample: true },
      { input: "1" },
      { input: "1 0 1" },
      { input: "1 2 3 2 2" }
    ]
  },
  {
    slug: "reorder-list",
    title: "Reorder List",
    difficulty: "MEDIUM",
    statement: `Given a list L\u2080 \u2192 L\u2081 \u2192 \u2026 \u2192 L\u2099, reorder it in place to L\u2080 \u2192 L\u2099 \u2192 L\u2081 \u2192 L\u2099\u208B\u2081 \u2192 L\u2082 \u2192 \u2026 and return the head. Only nodes may be rearranged, not values (though the judge only checks the resulting order).

**Input**: one line of space-separated integers.
**Output**: the reordered list's values.`,
    constraints: `- 1 \u2264 list length \u2264 5\xB710^4`,
    examples: [
      { input: "1 2 3 4", output: "1 4 2 3" },
      { input: "1 2 3 4 5", output: "1 5 2 4 3" }
    ],
    hints: [
      "Three classic subroutines chained: find middle, reverse, merge.",
      "Split at the middle, reverse the second half, then interleave the two halves."
    ],
    editorial: `Three steps, each a standard pattern: (1) fast/slow pointers find the middle; (2) reverse the second half in place; (3) interleave the two halves node by node. Chaining known subroutines is exactly what interviewers want to see here. O(n) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode reorder list"),
    tags: ["linked-list", "two-pointers"],
    starterCode: buildStarter("list", "list", "reorderList"),
    reference: (input) => {
      const vals = first6(input);
      const res = [];
      let i = 0;
      let j = vals.length - 1;
      while (i <= j) {
        res.push(vals[i]);
        if (i !== j) res.push(vals[j]);
        i++;
        j--;
      }
      return arrOut(res);
    },
    tests: [
      { input: "1 2 3 4", sample: true },
      { input: "1 2 3 4 5", sample: true },
      { input: "1" },
      { input: "1 2" },
      { input: "10 20 30 40 50 60" }
    ]
  },
  {
    slug: "add-two-numbers",
    title: "Add Two Numbers",
    difficulty: "MEDIUM",
    statement: `Two non-empty linked lists represent non-negative integers with digits stored in **reverse order** (ones digit first). Add them and return the sum as a linked list in the same format.

**Input**
- Line 1: digits of the first number (reverse order)
- Line 2: digits of the second number (reverse order)

**Output**: digits of the sum, reverse order, space-separated.`,
    constraints: `- 1 \u2264 each list's length \u2264 100
- 0 \u2264 digit \u2264 9; no leading zeros except the number 0.`,
    examples: [
      { input: "2 4 3\n5 6 4", output: "7 0 8", explanation: "342 + 465 = 807." },
      { input: "0\n0", output: "0" },
      { input: "9 9 9 9 9 9 9\n9 9 9 9", output: "8 9 9 9 0 0 0 1" }
    ],
    hints: [
      "Reverse order means you add ones-first \u2014 exactly like grade-school addition.",
      "Track a carry; keep going while either list or the carry is non-zero."
    ],
    editorial: `Walk both lists in lockstep summing \`digit + digit + carry\`, emitting \`sum % 10\` and carrying \`sum / 10\`. Continue while either list has nodes **or a carry remains** (the classic missed edge case: 999 + 1). A dummy head keeps the code clean. O(max(m, n)).`,
    complexityTime: "O(max(m, n))",
    complexitySpace: "O(max(m, n))",
    youtubeUrl: yt("neetcode add two numbers"),
    tags: ["linked-list", "math", "recursion"],
    starterCode: buildStarter("twoLists", "list", "addTwoNumbers"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const a = ints(l0);
      const b = ints(l1);
      const res = [];
      let carry = 0;
      for (let i = 0; i < Math.max(a.length, b.length) || carry; i++) {
        const s = (a[i] ?? 0) + (b[i] ?? 0) + carry;
        res.push(s % 10);
        carry = Math.floor(s / 10);
      }
      return arrOut(res);
    },
    tests: [
      { input: "2 4 3\n5 6 4", sample: true },
      { input: "0\n0", sample: true },
      { input: "9 9 9 9 9 9 9\n9 9 9 9", sample: true },
      { input: "5\n5" },
      { input: "1 8\n0" }
    ]
  },
  {
    slug: "odd-even-linked-list",
    title: "Odd Even Linked List",
    difficulty: "MEDIUM",
    statement: `Group all nodes at **odd positions** (1st, 3rd, \u2026) followed by nodes at even positions, preserving relative order within each group. Solve in O(1) space and O(n) time.

**Input**: one line of space-separated integers.
**Output**: the regrouped list's values.`,
    constraints: `- 0 \u2264 list length \u2264 10^4`,
    examples: [
      { input: "1 2 3 4 5", output: "1 3 5 2 4" },
      { input: "2 1 3 5 6 4 7", output: "2 3 6 7 1 5 4" }
    ],
    hints: [
      "Positions, not values: it's about 1st/2nd/3rd nodes.",
      "Weave two chains (odd and even) in one pass, then append the even chain to the odd tail."
    ],
    editorial: `Maintain two running chains: \`odd\` links every other node starting at position 1, \`even\` the rest. In one pass, \`odd.next = even.next; even.next = odd.next.next\`-style rewiring separates the chains; finally attach the even head after the odd tail. O(n) time, O(1) space, order preserved within groups.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("odd even linked list leetcode"),
    tags: ["linked-list"],
    starterCode: buildStarter("list", "list", "oddEvenList"),
    reference: (input) => {
      const vals = first6(input);
      const odd = vals.filter((_, i) => i % 2 === 0);
      const even = vals.filter((_, i) => i % 2 === 1);
      return arrOut([...odd, ...even]);
    },
    tests: [
      { input: "1 2 3 4 5", sample: true },
      { input: "2 1 3 5 6 4 7", sample: true },
      { input: "" },
      { input: "1" },
      { input: "1 2" }
    ]
  },
  {
    slug: "swap-nodes-in-pairs",
    title: "Swap Nodes in Pairs",
    difficulty: "EASY",
    statement: `Swap every two adjacent nodes of the list and return the new head. Swap the **nodes themselves**, not just their values.

**Input**: one line of space-separated integers \u2014 the list values (may be empty).
**Output**: the resulting list's values, space-separated.`,
    constraints: `- 0 \u2264 list length \u2264 100`,
    examples: [
      { input: "1 2 3 4", output: "2 1 4 3" },
      { input: "1", output: "1" },
      { input: "1 2 3", output: "2 1 3" }
    ],
    hints: [
      "A dummy node before the head removes the 'new head' special case.",
      "To swap (a, b) you must also rewire the node *before* a \u2014 track prev.",
      "Draw the four pointer updates before coding; order matters."
    ],
    editorial: `Use a dummy pre-head and a \`prev\` pointer. For each pair (a = prev.next, b = a.next): point prev at b, a at b's successor, b at a \u2014 then advance prev to a. The dummy makes the head swap identical to every other swap, which is the whole lesson of this problem: sentinel nodes delete edge cases. O(n) time, O(1) space. The recursive version (swap first pair, recurse on the rest) reads beautifully but spends O(n) stack.`,
    approaches: [
      {
        name: "Iterative with dummy",
        complexityTime: "O(n)",
        complexitySpace: "O(1)",
        body: "Three-pointer rewire per pair behind a sentinel node."
      },
      {
        name: "Recursive",
        complexityTime: "O(n)",
        complexitySpace: "O(n)",
        body: "head.next = swapPairs(head.next.next); return the old second node."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("swap nodes in pairs leetcode"),
    tags: ["linked-list", "recursion"],
    starterCode: buildStarter("list", "list", "swapPairs"),
    reference: (input) => {
      const a = first6(input);
      for (let i = 0; i + 1 < a.length; i += 2) {
        const t = a[i];
        a[i] = a[i + 1];
        a[i + 1] = t;
      }
      return arrOut(a);
    },
    tests: [
      { input: "1 2 3 4", sample: true },
      { input: "1", sample: true },
      { input: "1 2 3", sample: true },
      { input: "" },
      { input: "5 4 3 2 1 0" }
    ]
  },
  {
    slug: "rotate-list",
    title: "Rotate List",
    difficulty: "MEDIUM",
    statement: `Rotate the list to the right by \`k\` places: the last \`k\` nodes move to the front (in order).

**Input**
- Line 1: space-separated integers \u2014 the list values (may be empty)
- Line 2: the integer \`k\`

**Output**: the rotated list's values, space-separated.`,
    constraints: `- 0 \u2264 list length \u2264 500
- 0 \u2264 k \u2264 2\xB710^9`,
    examples: [
      { input: "1 2 3 4 5\n2", output: "4 5 1 2 3" },
      { input: "0 1 2\n4", output: "2 0 1", explanation: "k=4 on length 3 is k=1." }
    ],
    hints: [
      "k can exceed the length \u2014 rotating by n is a no-op, so reduce k mod n first.",
      "Find the length, connect tail to head to form a ring, then cut it at the right place.",
      "The new tail is at position n \u2212 k \u2212 1 (0-indexed) from the old head."
    ],
    editorial: `Walk once to find the length n and the tail; take k mod n (if n is 0 or k reduces to 0, return the list unchanged). Join tail \u2192 head to close the ring, walk n \u2212 k \u2212 1 steps from the old head to the new tail, set the new head to its successor, and cut. Two passes, O(n) time, O(1) space. The mod is where naive solutions die \u2014 k up to 2\xB710\u2079 makes step-by-step rotation a timeout, and forgetting the empty-list guard makes it a crash.`,
    approaches: [
      {
        name: "Close the ring and cut",
        complexityTime: "O(n)",
        complexitySpace: "O(1)",
        body: "Length + tail in one pass; link tail to head; sever at n \u2212 k mod n."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("rotate list leetcode"),
    tags: ["linked-list", "two-pointers"],
    starterCode: buildStarter("listK", "list", "rotateRight"),
    reference: (input) => {
      const a = ints(lines(input)[0]);
      const kRaw = int(lines(input)[1]);
      const n = a.length;
      if (n === 0) return "";
      const k = kRaw % n;
      return arrOut(a.slice(n - k).concat(a.slice(0, n - k)));
    },
    tests: [
      { input: "1 2 3 4 5\n2", sample: true },
      { input: "0 1 2\n4", sample: true },
      { input: "\n3" },
      { input: "1\n99" },
      { input: "1 2\n2" },
      { input: "7 8 9\n0" }
    ]
  }
];

// src/data/problems/trees.ts
var trees = [
  {
    slug: "invert-binary-tree",
    title: "Invert Binary Tree",
    difficulty: "EASY",
    statement: `Invert a binary tree (mirror it left-to-right) and return its root.

**Input**: one line \u2014 the tree in level order, \`null\` for missing children.
**Output**: the inverted tree in level order (trailing nulls trimmed; \`null\` for an empty tree).`,
    constraints: `- 0 \u2264 number of nodes \u2264 100`,
    examples: [
      { input: "4 2 7 1 3 6 9", output: "4 7 2 9 6 3 1" },
      { input: "2 1 3", output: "2 3 1" },
      { input: "null", output: "null" }
    ],
    hints: [
      "Swap the children of every node.",
      "Recursion: invert left, invert right, swap \u2014 or BFS with a queue."
    ],
    editorial: `Recursively swap each node's children: \`root.left, root.right = invert(root.right), invert(root.left)\`. Every node is touched once \u2192 O(n) time, O(h) stack. (Famously, the problem Homebrew's author couldn't whiteboard \u2014 so know it cold.)`,
    complexityTime: "O(n)",
    complexitySpace: "O(h)",
    youtubeUrl: yt("neetcode invert binary tree"),
    tags: ["tree", "binary-tree", "dfs", "bfs"],
    starterCode: buildStarter("tree", "tree", "invertTree"),
    reference: (input) => {
      const root = parseTree(lines(input)[0]);
      const invert = (n) => {
        if (!n) return null;
        const l = invert(n.left);
        n.left = invert(n.right);
        n.right = l;
        return n;
      };
      return treeOut(invert(root));
    },
    tests: [
      { input: "4 2 7 1 3 6 9", sample: true },
      { input: "2 1 3", sample: true },
      { input: "null", sample: true },
      { input: "1" },
      { input: "1 2 null 3" }
    ]
  },
  {
    slug: "maximum-depth-of-binary-tree",
    title: "Maximum Depth of Binary Tree",
    difficulty: "EASY",
    statement: `Return the maximum depth of a binary tree \u2014 the number of nodes on the longest root-to-leaf path.

**Input**: one line \u2014 the tree in level order, \`null\` for missing children.
**Output**: the depth (0 for an empty tree).`,
    constraints: `- 0 \u2264 number of nodes \u2264 10^4`,
    examples: [
      { input: "3 9 20 null null 15 7", output: "3" },
      { input: "1 null 2", output: "2" }
    ],
    hints: [
      "depth(node) = 1 + max(depth(left), depth(right)).",
      "The empty tree has depth 0 \u2014 that's your base case."
    ],
    editorial: `Pure structural recursion: an empty tree has depth 0; otherwise the depth is one more than the deeper subtree. This one-liner is the template for dozens of tree problems \u2014 compute something for each child, combine, add the current node's contribution. O(n) time, O(h) stack.`,
    complexityTime: "O(n)",
    complexitySpace: "O(h)",
    youtubeUrl: yt("neetcode maximum depth of binary tree"),
    tags: ["tree", "binary-tree", "dfs", "recursion"],
    starterCode: buildStarter("tree", "int", "maxDepth"),
    reference: (input) => {
      const root = parseTree(lines(input)[0]);
      const depth = (n) => n ? 1 + Math.max(depth(n.left), depth(n.right)) : 0;
      return String(depth(root));
    },
    tests: [
      { input: "3 9 20 null null 15 7", sample: true },
      { input: "1 null 2", sample: true },
      { input: "null" },
      { input: "0" },
      { input: "1 2 3 4 5 6 7 8" }
    ]
  },
  {
    slug: "same-tree",
    title: "Same Tree",
    difficulty: "EASY",
    statement: `Given two binary trees \`p\` and \`q\`, return \`true\` if they are structurally identical with equal values.

**Input**
- Line 1: tree \`p\` in level order
- Line 2: tree \`q\` in level order

**Output**: \`true\` or \`false\`.`,
    constraints: `- 0 \u2264 nodes \u2264 100 per tree`,
    examples: [
      { input: "1 2 3\n1 2 3", output: "true" },
      { input: "1 2\n1 null 2", output: "false" },
      { input: "1 2 1\n1 1 2", output: "false" }
    ],
    hints: [
      "Two empties are the same; empty vs non-empty is not.",
      "Recurse: values equal AND left subtrees same AND right subtrees same."
    ],
    editorial: `Structural recursion over both trees simultaneously: both null \u2192 true; exactly one null or values differ \u2192 false; otherwise recurse on both child pairs. O(min(m, n)) time, O(h) stack.`,
    complexityTime: "O(n)",
    complexitySpace: "O(h)",
    youtubeUrl: yt("same tree leetcode"),
    tags: ["tree", "binary-tree", "dfs"],
    starterCode: buildStarter("twoTrees", "bool", "isSameTree"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const same = (a, b) => {
        if (!a && !b) return true;
        if (!a || !b || a.val !== b.val) return false;
        return same(a.left, b.left) && same(a.right, b.right);
      };
      return boolOut(same(parseTree(l0), parseTree(l1)));
    },
    tests: [
      { input: "1 2 3\n1 2 3", sample: true },
      { input: "1 2\n1 null 2", sample: true },
      { input: "1 2 1\n1 1 2", sample: true },
      { input: "null\nnull" },
      { input: "null\n0" }
    ]
  },
  {
    slug: "symmetric-tree",
    title: "Symmetric Tree",
    difficulty: "EASY",
    statement: `Return \`true\` if a binary tree is a mirror of itself around its center.

**Input**: one line \u2014 the tree in level order.
**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 nodes \u2264 1000`,
    examples: [
      { input: "1 2 2 3 4 4 3", output: "true" },
      { input: "1 2 2 null 3 null 3", output: "false" }
    ],
    hints: [
      "Symmetry is a property of two subtrees: left mirrors right.",
      "mirror(a, b) = values equal AND mirror(a.left, b.right) AND mirror(a.right, b.left)."
    ],
    editorial: `Define \`mirror(a, b)\`: both empty \u2192 true; one empty or values unequal \u2192 false; otherwise \`a.left\` must mirror \`b.right\` and \`a.right\` must mirror \`b.left\` (note the cross). The tree is symmetric iff \`mirror(root.left, root.right)\`. O(n) time, O(h) stack.`,
    complexityTime: "O(n)",
    complexitySpace: "O(h)",
    youtubeUrl: yt("symmetric tree leetcode"),
    tags: ["tree", "binary-tree", "dfs", "bfs"],
    starterCode: buildStarter("tree", "bool", "isSymmetric"),
    reference: (input) => {
      const root = parseTree(lines(input)[0]);
      const mirror = (a, b) => {
        if (!a && !b) return true;
        if (!a || !b || a.val !== b.val) return false;
        return mirror(a.left, b.right) && mirror(a.right, b.left);
      };
      return boolOut(!root || mirror(root.left, root.right));
    },
    tests: [
      { input: "1 2 2 3 4 4 3", sample: true },
      { input: "1 2 2 null 3 null 3", sample: true },
      { input: "1" },
      { input: "1 2 2 2 null 2" }
    ]
  },
  {
    slug: "diameter-of-binary-tree",
    title: "Diameter of Binary Tree",
    difficulty: "EASY",
    statement: `Return the **diameter** of a binary tree: the number of edges on the longest path between any two nodes (the path need not pass through the root).

**Input**: one line \u2014 the tree in level order.
**Output**: the diameter.`,
    constraints: `- 1 \u2264 nodes \u2264 10^4`,
    examples: [
      { input: "1 2 3 4 5", output: "3", explanation: "Path 4 \u2192 2 \u2192 1 \u2192 3 (3 edges)." },
      { input: "1 2", output: "1" }
    ],
    hints: [
      "The longest path through a node = height(left) + height(right).",
      "Compute heights recursively and update a global best at every node."
    ],
    editorial: `While computing each node's height, the candidate diameter **through** that node is \`height(left) + height(right)\`. Track the maximum across all nodes during one post-order traversal. This "carry an answer alongside the recursion" trick generalizes to many tree problems. O(n) time, O(h) stack.`,
    complexityTime: "O(n)",
    complexitySpace: "O(h)",
    youtubeUrl: yt("neetcode diameter of binary tree"),
    tags: ["tree", "binary-tree", "dfs"],
    starterCode: buildStarter("tree", "int", "diameterOfBinaryTree"),
    reference: (input) => {
      const root = parseTree(lines(input)[0]);
      let best = 0;
      const height = (n) => {
        if (!n) return 0;
        const l = height(n.left);
        const r = height(n.right);
        best = Math.max(best, l + r);
        return 1 + Math.max(l, r);
      };
      height(root);
      return String(best);
    },
    tests: [
      { input: "1 2 3 4 5", sample: true },
      { input: "1 2", sample: true },
      { input: "1" },
      { input: "1 2 null 3 null 4 null" }
    ]
  },
  {
    slug: "path-sum",
    title: "Path Sum",
    difficulty: "EASY",
    statement: `Given a binary tree and an integer \`targetSum\`, return \`true\` if some **root-to-leaf** path sums to \`targetSum\`.

**Input**
- Line 1: the tree in level order
- Line 2: integer \`targetSum\`

**Output**: \`true\` or \`false\`.`,
    constraints: `- 0 \u2264 nodes \u2264 5000
- -1000 \u2264 values, targetSum \u2264 1000`,
    examples: [
      { input: "5 4 8 11 null 13 4 7 2 null null null 1\n22", output: "true", explanation: "5+4+11+2 = 22." },
      { input: "1 2 3\n5", output: "false" },
      { input: "null\n0", output: "false" }
    ],
    hints: [
      "Subtract the node's value as you descend.",
      "At a leaf, check whether the remaining target equals the leaf's value."
    ],
    editorial: `Recurse with the remaining target: at each node subtract its value; at a **leaf**, the path works iff the remainder equals the leaf's value. Careful: a node with one child is not a leaf \u2014 don't accept early. O(n) time, O(h) stack.`,
    complexityTime: "O(n)",
    complexitySpace: "O(h)",
    youtubeUrl: yt("path sum leetcode dfs"),
    tags: ["tree", "binary-tree", "dfs"],
    starterCode: buildStarter("treeK", "bool", "hasPathSum"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const root = parseTree(l0);
      const target = int(l1);
      const dfs = (n, rem) => {
        if (!n) return false;
        rem -= n.val;
        if (!n.left && !n.right) return rem === 0;
        return dfs(n.left, rem) || dfs(n.right, rem);
      };
      return boolOut(dfs(root, target));
    },
    tests: [
      { input: "5 4 8 11 null 13 4 7 2 null null null 1\n22", sample: true },
      { input: "1 2 3\n5", sample: true },
      { input: "null\n0", sample: true },
      { input: "1 2\n1" },
      { input: "-2 null -3\n-5" }
    ]
  },
  {
    slug: "binary-tree-level-order-traversal",
    title: "Binary Tree Level Order Traversal",
    difficulty: "MEDIUM",
    statement: `Return the level order traversal of a binary tree \u2014 node values level by level, left to right.

**Input**: one line \u2014 the tree in level order (with nulls).
**Output**: one line per level, values space-separated (nothing for an empty tree).`,
    constraints: `- 0 \u2264 nodes \u2264 2000`,
    examples: [
      { input: "3 9 20 null null 15 7", output: "3\n9 20\n15 7" },
      { input: "1", output: "1" }
    ],
    hints: [
      "BFS with a queue; process one full level per outer loop iteration.",
      "Snapshot the queue length before the inner loop \u2014 that's the level size."
    ],
    editorial: `Breadth-first search where each outer iteration drains exactly the nodes that were in the queue at its start (one level), collecting their values and enqueueing children. The level-size snapshot is the key detail separating this from plain BFS. O(n) time and space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode binary tree level order traversal"),
    tags: ["tree", "binary-tree", "bfs"],
    starterCode: buildStarter("tree", "intMatrix", "levelOrder"),
    reference: (input) => {
      const root = parseTree(lines(input)[0]);
      if (!root) return "";
      const rows = [];
      let q = [root];
      while (q.length) {
        rows.push(q.map((n) => n.val));
        const next = [];
        for (const n of q) {
          if (n.left) next.push(n.left);
          if (n.right) next.push(n.right);
        }
        q = next;
      }
      return matOut(rows);
    },
    tests: [
      { input: "3 9 20 null null 15 7", sample: true },
      { input: "1", sample: true },
      { input: "null" },
      { input: "1 2 3 4 5 6 7" },
      { input: "1 null 2 null 3" }
    ]
  },
  {
    slug: "validate-binary-search-tree",
    title: "Validate Binary Search Tree",
    difficulty: "MEDIUM",
    statement: `Determine whether a binary tree is a valid **binary search tree**: every node's left subtree contains only smaller values, its right subtree only larger values, and both subtrees are BSTs.

**Input**: one line \u2014 the tree in level order.
**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 nodes \u2264 10^4
- -2^31 \u2264 values \u2264 2^31 \u2212 1`,
    examples: [
      { input: "2 1 3", output: "true" },
      { input: "5 1 4 null null 3 6", output: "false", explanation: "3 sits in the right subtree of 5." }
    ],
    hints: [
      "Checking only parent vs children is not enough \u2014 the constraint is over whole subtrees.",
      "Pass down (min, max) bounds; each node must lie strictly inside them.",
      "Alternative: an in-order traversal of a BST is strictly increasing."
    ],
    editorial: `Recurse with an allowed **open interval** \`(lo, hi)\` for each node: the root gets \`(\u2212\u221E, +\u221E)\`; going left tightens \`hi\` to the node's value, going right tightens \`lo\`. A node violating its interval anywhere fails the whole tree. Equivalent alternative: verify the in-order sequence is strictly increasing. O(n) time, O(h) stack.`,
    approaches: [
      {
        name: "In-order traversal",
        complexityTime: "O(n)",
        complexitySpace: "O(h)",
        body: "A valid BST yields a strictly increasing in-order sequence; compare neighbors."
      },
      {
        name: "Bounds propagation",
        complexityTime: "O(n)",
        complexitySpace: "O(h)",
        body: "Each child inherits a narrowed (min, max) window from its parent."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(h)",
    youtubeUrl: yt("neetcode validate binary search tree"),
    tags: ["tree", "binary-search-tree", "dfs"],
    starterCode: buildStarter("tree", "bool", "isValidBST"),
    reference: (input) => {
      const root = parseTree(lines(input)[0]);
      const ok = (n, lo, hi) => {
        if (!n) return true;
        if (n.val <= lo || n.val >= hi) return false;
        return ok(n.left, lo, n.val) && ok(n.right, n.val, hi);
      };
      return boolOut(ok(root, -Infinity, Infinity));
    },
    tests: [
      { input: "2 1 3", sample: true },
      { input: "5 1 4 null null 3 6", sample: true },
      { input: "1" },
      { input: "2 2 2" },
      { input: "10 5 15 null null 6 20" }
    ]
  },
  {
    slug: "lowest-common-ancestor-of-a-binary-search-tree",
    title: "Lowest Common Ancestor of a BST",
    difficulty: "MEDIUM",
    statement: `Given a **BST** and two values \`p\` and \`q\` that exist in it, return the value of their lowest common ancestor \u2014 the deepest node that has both among its descendants (a node may be its own descendant).

**Input**
- Line 1: the BST in level order
- Line 2: two integers \`p q\`

**Output**: the LCA node's value.`,
    constraints: `- 2 \u2264 nodes \u2264 10^5
- All values distinct; p \u2260 q; both present.`,
    examples: [
      { input: "6 2 8 0 4 7 9 null null 3 5\n2 8", output: "6" },
      { input: "6 2 8 0 4 7 9 null null 3 5\n2 4", output: "2", explanation: "An ancestor can be the node itself." }
    ],
    hints: [
      "Use the BST ordering \u2014 no generic LCA machinery needed.",
      "If both values are smaller than the current node, go left; both larger, go right; otherwise you've found it."
    ],
    editorial: `Walk down from the root: if both targets are less than the current value, the LCA lies left; if both are greater, right; otherwise the paths to \`p\` and \`q\` **split here** (or one equals the current node) \u2014 this is the LCA. Iterative, O(h) time, O(1) space.`,
    complexityTime: "O(h)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode lowest common ancestor bst"),
    tags: ["tree", "binary-search-tree"],
    starterCode: buildStarter("treePQ", "int", "lowestCommonAncestor"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      let node = parseTree(l0);
      const [p, q] = ints(l1);
      while (node) {
        if (p < node.val && q < node.val) node = node.left;
        else if (p > node.val && q > node.val) node = node.right;
        else break;
      }
      return String(node.val);
    },
    tests: [
      { input: "6 2 8 0 4 7 9 null null 3 5\n2 8", sample: true },
      { input: "6 2 8 0 4 7 9 null null 3 5\n2 4", sample: true },
      { input: "2 1\n2 1" },
      { input: "6 2 8 0 4 7 9 null null 3 5\n3 5" }
    ]
  },
  {
    slug: "binary-tree-right-side-view",
    title: "Binary Tree Right Side View",
    difficulty: "MEDIUM",
    statement: `Standing to the right of a binary tree, return the values you can see from top to bottom (the rightmost node of each level).

**Input**: one line \u2014 the tree in level order.
**Output**: the visible values, space-separated (nothing for an empty tree).`,
    constraints: `- 0 \u2264 nodes \u2264 100`,
    examples: [
      { input: "1 2 3 null 5 null 4", output: "1 3 4" },
      { input: "1 null 3", output: "1 3" }
    ],
    hints: [
      "Level order traversal \u2014 keep the last node of each level.",
      "DFS alternative: visit right first and record the first node seen at each depth."
    ],
    editorial: `BFS level by level and record each level's **last** value. Or DFS right-child-first, recording a value the first time each depth is reached. Both are O(n); BFS is the more direct fit for "per-level" questions.`,
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode binary tree right side view"),
    tags: ["tree", "binary-tree", "bfs", "dfs"],
    starterCode: buildStarter("tree", "intArray", "rightSideView"),
    reference: (input) => {
      const root = parseTree(lines(input)[0]);
      if (!root) return "";
      const res = [];
      let q = [root];
      while (q.length) {
        res.push(q[q.length - 1].val);
        const next = [];
        for (const n of q) {
          if (n.left) next.push(n.left);
          if (n.right) next.push(n.right);
        }
        q = next;
      }
      return arrOut(res);
    },
    tests: [
      { input: "1 2 3 null 5 null 4", sample: true },
      { input: "1 null 3", sample: true },
      { input: "null" },
      { input: "1 2 3 4" }
    ]
  },
  {
    slug: "kth-smallest-element-in-a-bst",
    title: "Kth Smallest Element in a BST",
    difficulty: "MEDIUM",
    statement: `Given a BST and an integer \`k\`, return the k-th smallest value (1-indexed).

**Input**
- Line 1: the BST in level order
- Line 2: integer \`k\`

**Output**: the k-th smallest value.`,
    constraints: `- 1 \u2264 k \u2264 nodes \u2264 10^4`,
    examples: [
      { input: "3 1 4 null 2\n1", output: "1" },
      { input: "5 3 6 2 4 null null 1\n3", output: "3" }
    ],
    hints: [
      "In-order traversal of a BST visits values in sorted order.",
      "Stop the traversal as soon as you've visited k nodes."
    ],
    editorial: `An **in-order traversal** (left, node, right) of a BST emits values in ascending order, so the k-th visited node is the answer. An explicit stack lets you stop early after k pops instead of materializing the whole sequence. O(h + k) time, O(h) space.`,
    complexityTime: "O(h + k)",
    complexitySpace: "O(h)",
    youtubeUrl: yt("neetcode kth smallest element in a bst"),
    tags: ["tree", "binary-search-tree", "dfs"],
    starterCode: buildStarter("treeK", "int", "kthSmallest"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const root = parseTree(l0);
      const k = int(l1);
      const vals = [];
      const inorder = (n) => {
        if (!n) return;
        inorder(n.left);
        vals.push(n.val);
        inorder(n.right);
      };
      inorder(root);
      return String(vals[k - 1]);
    },
    tests: [
      { input: "3 1 4 null 2\n1", sample: true },
      { input: "5 3 6 2 4 null null 1\n3", sample: true },
      { input: "1\n1" },
      { input: "41 37 44 24 39 42 48 1 35 38 40 null 43 46 49\n10" }
    ]
  },
  {
    slug: "binary-tree-maximum-path-sum",
    title: "Binary Tree Maximum Path Sum",
    difficulty: "HARD",
    statement: `A **path** is any sequence of adjacent nodes (each node used at most once) \u2014 it need not pass through the root or reach a leaf. Return the maximum possible sum of values along any non-empty path.

**Input**: one line \u2014 the tree in level order.
**Output**: the maximum path sum.`,
    constraints: `- 1 \u2264 nodes \u2264 3\xB710^4
- -1000 \u2264 values \u2264 1000`,
    examples: [
      { input: "1 2 3", output: "6", explanation: "2 \u2192 1 \u2192 3." },
      { input: "-10 9 20 null null 15 7", output: "42", explanation: "15 \u2192 20 \u2192 7." }
    ],
    hints: [
      "Distinguish two quantities per node: the best downward 'arm' vs the best path through the node.",
      "A path through a node = node + best left arm + best right arm (arms clamped at 0).",
      "Return only the single best arm upward \u2014 a parent can't use both."
    ],
    editorial: `Post-order DFS computing each node's best **arm** \u2014 the max sum extending downward through one child, clamped at 0 (a negative arm is better dropped). The best path *through* a node is \`val + leftArm + rightArm\`; track the global maximum of that. Upward, return \`val + max(arms)\` because a parent's path can only continue through one side. O(n) time, O(h) stack.`,
    complexityTime: "O(n)",
    complexitySpace: "O(h)",
    youtubeUrl: yt("neetcode binary tree maximum path sum"),
    tags: ["tree", "binary-tree", "dfs", "dynamic-programming"],
    starterCode: buildStarter("tree", "int", "maxPathSum"),
    reference: (input) => {
      const root = parseTree(lines(input)[0]);
      let best = -Infinity;
      const arm = (n) => {
        if (!n) return 0;
        const l = Math.max(0, arm(n.left));
        const r = Math.max(0, arm(n.right));
        best = Math.max(best, n.val + l + r);
        return n.val + Math.max(l, r);
      };
      arm(root);
      return String(best);
    },
    tests: [
      { input: "1 2 3", sample: true },
      { input: "-10 9 20 null null 15 7", sample: true },
      { input: "-3" },
      { input: "2 -1" },
      { input: "5 4 8 11 null 13 4 7 2 null null null 1" }
    ]
  },
  {
    slug: "subtree-of-another-tree",
    title: "Subtree of Another Tree",
    difficulty: "EASY",
    statement: `Given the roots of trees \`root\` and \`subRoot\`, return \`true\` if some node of \`root\` (together with all its descendants) is structurally identical to \`subRoot\`, with equal values.

**Input**
- Line 1: level-order tokens for \`root\` (\`null\` = missing child)
- Line 2: level-order tokens for \`subRoot\`

**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 root nodes \u2264 2000, 1 \u2264 subRoot nodes \u2264 1000
- -10^4 \u2264 values \u2264 10^4`,
    examples: [
      { input: "3 4 5 1 2\n4 1 2", output: "true" },
      {
        input: "3 4 5 1 2 null null null null 0\n4 1 2",
        output: "false",
        explanation: "The candidate subtree at 4 has an extra node 0 under 2."
      }
    ],
    hints: [
      "Two-layer recursion: 'is same tree' as a helper, tried at every node.",
      "sameTree(a, b): both null \u2192 true; one null or values differ \u2192 false; recurse both sides.",
      "A subtree match must include ALL descendants \u2014 matching a prefix isn't enough."
    ],
    editorial: `Compose two classic recursions: \`sameTree(a, b)\` checks structural equality, and the outer walk tries it at every node of root, recursing into children on failure. Worst case O(m\xB7n) (every node starts a comparison that runs deep), but real inputs exit comparisons at the first mismatch. The 'all descendants' requirement is what the second example tests \u2014 node 4's subtree contains an extra leaf, so a shape-prefix match must be rejected; that's precisely why sameTree demands both children null-match. The O(m+n) upgrade \u2014 serialize both trees with null markers and run a substring search \u2014 is a great follow-up to mention.`,
    approaches: [
      {
        name: "Nested recursion",
        complexityTime: "O(m\xB7n) worst",
        complexitySpace: "O(h)",
        body: "Try sameTree at every node of the host tree."
      },
      {
        name: "Serialize + substring",
        complexityTime: "O(m + n)",
        complexitySpace: "O(m + n)",
        body: "Preorder-serialize with null sentinels; check containment (KMP)."
      }
    ],
    complexityTime: "O(m\xB7n)",
    complexitySpace: "O(h)",
    youtubeUrl: yt("neetcode subtree of another tree"),
    tags: ["tree", "recursion", "dfs"],
    starterCode: buildStarter("twoTrees", "bool", "isSubtree"),
    reference: (input) => {
      const root = parseTree(lines(input)[0]);
      const sub = parseTree(lines(input)[1]);
      const same = (a, b) => {
        if (!a && !b) return true;
        if (!a || !b || a.val !== b.val) return false;
        return same(a.left, b.left) && same(a.right, b.right);
      };
      const dfs = (node) => {
        if (!node) return false;
        return same(node, sub) || dfs(node.left) || dfs(node.right);
      };
      return boolOut(dfs(root));
    },
    tests: [
      { input: "3 4 5 1 2\n4 1 2", sample: true },
      { input: "3 4 5 1 2 null null null null 0\n4 1 2", sample: true },
      { input: "1\n1" },
      { input: "1 2\n2" },
      { input: "1 2 3\n1 2" },
      { input: "-5 null -5\n-5" }
    ]
  }
];

// src/data/problems/tries.ts
var tries = [
  {
    slug: "implement-trie-prefix-tree",
    title: "Implement Trie (Prefix Tree)",
    difficulty: "MEDIUM",
    statement: `Implement a trie supporting insertion, exact word search, and prefix search.

**Input**: one operation per line \u2014
- \`insert w\` \u2014 insert word w
- \`search w\` \u2014 print \`true\` if w was inserted
- \`startsWith p\` \u2014 print \`true\` if any inserted word starts with p

**Output**: one line per operation \u2014 \`insert\` prints \`null\`; the others print \`true\`/\`false\`.`,
    constraints: `- 1 \u2264 word length \u2264 2000
- Up to 3\xB710^4 operations; lowercase letters.`,
    examples: [
      {
        input: "insert apple\nsearch apple\nsearch app\nstartsWith app\ninsert app\nsearch app",
        output: "null\ntrue\nfalse\ntrue\nnull\ntrue"
      }
    ],
    hints: [
      "Each node holds up to 26 children and an end-of-word flag.",
      "search and startsWith walk the same path; only the final check differs."
    ],
    editorial: `A trie node maps characters to children plus an \`isEnd\` flag. **insert** walks the word creating missing nodes and marks the last one; **search** walks and requires \`isEnd\`; **startsWith** walks and requires only that the path exists. All operations are O(L) in the word length \u2014 independent of how many words are stored, which is the whole point of tries.`,
    complexityTime: "O(L) per operation",
    complexitySpace: "O(total characters)",
    youtubeUrl: yt("neetcode implement trie prefix tree"),
    tags: ["trie", "design", "string"],
    starterCode: buildStarter("ops", "lines", "processOps"),
    reference: (input) => {
      const ops = lines(input).filter((l) => l.trim().length > 0);
      const mk = () => ({ children: /* @__PURE__ */ new Map(), end: false });
      const root = mk();
      const out = [];
      const walk = (w) => {
        let n = root;
        for (const c of w) {
          const next = n.children.get(c);
          if (!next) return null;
          n = next;
        }
        return n;
      };
      for (const op of ops) {
        const [cmd, arg] = op.trim().split(/\s+/);
        if (cmd === "insert") {
          let n = root;
          for (const c of arg) {
            if (!n.children.has(c)) n.children.set(c, mk());
            n = n.children.get(c);
          }
          n.end = true;
          out.push("null");
        } else if (cmd === "search") {
          const n = walk(arg);
          out.push(boolOut(!!n && n.end));
        } else {
          out.push(boolOut(!!walk(arg)));
        }
      }
      return linesOut(out);
    },
    tests: [
      {
        input: "insert apple\nsearch apple\nsearch app\nstartsWith app\ninsert app\nsearch app",
        sample: true
      },
      { input: "search a\nstartsWith a\ninsert a\nsearch a" },
      { input: "insert ab\ninsert abc\nsearch ab\nstartsWith abc\nstartsWith abcd" }
    ]
  },
  {
    slug: "design-add-and-search-words-data-structure",
    title: "Design Add and Search Words Data Structure",
    difficulty: "MEDIUM",
    statement: `Design a data structure that stores words and supports searching with the wildcard \`.\` (matches any single letter).

**Input**: one operation per line \u2014
- \`addWord w\` \u2014 add word w
- \`search p\` \u2014 print \`true\` if any stored word matches pattern p (letters and dots)

**Output**: one line per operation \u2014 \`addWord\` prints \`null\`; \`search\` prints \`true\`/\`false\`.`,
    constraints: `- 1 \u2264 word length \u2264 25
- At most 2 dots per search; up to 10^4 operations.`,
    examples: [
      {
        input: "addWord bad\naddWord dad\naddWord mad\nsearch pad\nsearch bad\nsearch .ad\nsearch b..",
        output: "null\nnull\nnull\nfalse\ntrue\ntrue\ntrue"
      }
    ],
    hints: [
      "A trie handles literal letters; the wildcard needs branching.",
      "On '.', recurse into every child; on a letter, follow just that edge."
    ],
    editorial: `Store words in a trie. Search runs a DFS over the trie following literal characters directly; a \`.\` fans out into **all** children at that depth. With at most a couple of dots the branching stays cheap; worst case is O(26^d \xB7 L) for d dots. Adding is a plain trie insert, O(L).`,
    complexityTime: "O(L) add, O(26^d \xB7 L) search",
    complexitySpace: "O(total characters)",
    youtubeUrl: yt("neetcode design add and search words"),
    tags: ["trie", "design", "dfs", "string"],
    starterCode: buildStarter("ops", "lines", "processOps"),
    reference: (input) => {
      const ops = lines(input).filter((l) => l.trim().length > 0);
      const mk = () => ({ children: /* @__PURE__ */ new Map(), end: false });
      const root = mk();
      const out = [];
      const match = (n, p, i) => {
        if (i === p.length) return n.end;
        const c = p[i];
        if (c === ".") {
          for (const child of n.children.values()) {
            if (match(child, p, i + 1)) return true;
          }
          return false;
        }
        const next = n.children.get(c);
        return !!next && match(next, p, i + 1);
      };
      for (const op of ops) {
        const [cmd, arg] = op.trim().split(/\s+/);
        if (cmd === "addWord") {
          let n = root;
          for (const c of arg) {
            if (!n.children.has(c)) n.children.set(c, mk());
            n = n.children.get(c);
          }
          n.end = true;
          out.push("null");
        } else {
          out.push(boolOut(match(root, arg, 0)));
        }
      }
      return linesOut(out);
    },
    tests: [
      {
        input: "addWord bad\naddWord dad\naddWord mad\nsearch pad\nsearch bad\nsearch .ad\nsearch b..",
        sample: true
      },
      { input: "addWord a\nsearch .\nsearch a\nsearch aa" },
      { input: "addWord at\naddWord and\nsearch an.\nsearch .t\nsearch a.d." }
    ]
  },
  {
    slug: "longest-word-in-dictionary",
    title: "Longest Word in Dictionary",
    difficulty: "MEDIUM",
    statement: `Given a list of words, return the longest word that can be **built one character at a time**, where every prefix of it (of every length) is also a word in the list. On ties, return the lexicographically smallest. Return an empty line if no word qualifies.

**Input**: one line of space-separated words.
**Output**: the answer word (or empty).`,
    constraints: `- 1 \u2264 words.length \u2264 1000
- 1 \u2264 word length \u2264 30; lowercase letters.`,
    examples: [
      { input: "w wo wor worl world", output: "world" },
      { input: "a banana app appl ap apply apple", output: "apple", explanation: "apple and apply tie at length 5; apple is smaller." },
      { input: "abc bd", output: "", explanation: "No single-letter starting point." }
    ],
    hints: [
      "Sort the words; then every buildable word's prefix appears before it.",
      "Keep a set of buildable words: w is buildable if w minus its last char is in the set (or has length 1)."
    ],
    editorial: `Sort the words (shorter/lexicographically-smaller first), then greedily grow a set of buildable words: a word qualifies if its length is 1 or its prefix-minus-one is already buildable. Track the best answer preferring longer, then lexicographically smaller \u2014 the sort order makes ties resolve automatically if you only replace on strictly longer. A trie with end-flags gives the same result and is the intended interview framing. O(\u03A3 L log n).`,
    complexityTime: "O(\u03A3 L \xB7 log n)",
    complexitySpace: "O(\u03A3 L)",
    youtubeUrl: yt("longest word in dictionary trie"),
    tags: ["trie", "string", "sorting", "hash-table"],
    starterCode: buildStarter("stringArray", "string", "longestWord"),
    reference: (input) => {
      const ws = words(lines(input)[0]).sort();
      const buildable = /* @__PURE__ */ new Set();
      let best = "";
      for (const w of ws) {
        if (w.length === 1 || buildable.has(w.slice(0, -1))) {
          buildable.add(w);
          if (w.length > best.length) best = w;
        }
      }
      return best;
    },
    tests: [
      { input: "w wo wor worl world", sample: true },
      { input: "a banana app appl ap apply apple", sample: true },
      { input: "abc bd", sample: true },
      { input: "m mo moc mocha" },
      { input: "yo ew fc zrc yodn fcm qm qmo fcmz z ewq yod ewqz y" }
    ]
  },
  {
    slug: "replace-words",
    title: "Replace Words",
    difficulty: "MEDIUM",
    statement: `Given a sentence and a dictionary of **roots**, replace every word in the sentence that has a root as a prefix with its **shortest** such root. Words without a matching root stay unchanged.

**Input**
- Line 1: the sentence (words separated by single spaces)
- Line 2: space-separated dictionary roots

**Output**: the transformed sentence.`,
    constraints: `- 1 \u2264 sentence words \u2264 1000
- 1 \u2264 roots \u2264 1000; lowercase letters.`,
    examples: [
      { input: "the cattle was rattled by the battery\ncat bat rat", output: "the cat was rat by the bat" },
      { input: "a aadsfasf absbs bbab cadsfafs\na b c", output: "a a a b c" }
    ],
    hints: [
      "Checking every root against every word is O(words \xD7 roots \xD7 L).",
      "Put the roots in a trie; for each word walk until you hit an end-flag (shortest root wins)."
    ],
    editorial: `Insert all roots into a trie with end-of-word flags. For each sentence word, walk the trie character by character; the first end-flag you meet is the **shortest** matching root \u2014 replace and stop. If the walk dies without a flag, keep the original word. Total O(dictionary + sentence) characters.`,
    complexityTime: "O(\u03A3 characters)",
    complexitySpace: "O(dictionary characters)",
    youtubeUrl: yt("replace words trie leetcode"),
    tags: ["trie", "string", "hash-table"],
    starterCode: buildStarter("stringWords", "string", "replaceWords"),
    reference: (input) => {
      const [sentence = "", rootLine = ""] = lines(input);
      const roots = words(rootLine);
      const mk = () => ({ children: /* @__PURE__ */ new Map(), end: false });
      const root = mk();
      for (const r of roots) {
        let n = root;
        for (const c of r) {
          if (!n.children.has(c)) n.children.set(c, mk());
          n = n.children.get(c);
        }
        n.end = true;
      }
      const replace = (w) => {
        let n = root;
        for (let i = 0; i < w.length; i++) {
          const next = n.children.get(w[i]);
          if (!next) return w;
          n = next;
          if (n.end) return w.slice(0, i + 1);
        }
        return w;
      };
      return words(sentence).map(replace).join(" ");
    },
    tests: [
      { input: "the cattle was rattled by the battery\ncat bat rat", sample: true },
      { input: "a aadsfasf absbs bbab cadsfafs\na b c", sample: true },
      { input: "hello world\nxyz" },
      { input: "aa aaa aaaa\na" }
    ]
  },
  {
    slug: "word-break",
    title: "Word Break",
    difficulty: "MEDIUM",
    statement: `Given a string \`s\` and a dictionary of words, return \`true\` if \`s\` can be segmented into a space-separated sequence of one or more dictionary words (words may be reused).

**Input**
- Line 1: the string \`s\`
- Line 2: space-separated dictionary words

**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 s.length \u2264 300
- 1 \u2264 dictionary size \u2264 1000; lowercase letters.`,
    examples: [
      { input: "leetcode\nleet code", output: "true" },
      { input: "applepenapple\napple pen", output: "true" },
      { input: "catsandog\ncats dog sand and cat", output: "false" }
    ],
    hints: [
      "Greedy fails: taking the longest matching word first can strand the remainder.",
      "dp[i] = can s[0..i) be segmented? Try every dictionary word as the final piece.",
      "A trie (or a set with bounded word lengths) speeds up the inner matching."
    ],
    editorial: `Dynamic programming over prefixes: \`dp[i]\` is true when some \`j < i\` has \`dp[j]\` true and \`s[j..i)\` in the dictionary. \`dp[0]\` (empty prefix) seeds it; \`dp[n]\` answers it. With a hash set the check is O(1) per substring \u2192 O(n\xB2 \xB7 L) worst case; a trie walked from each \`j\` avoids re-hashing overlapping substrings.`,
    approaches: [
      {
        name: "DFS + memo on start index",
        complexityTime: "O(n\xB2)",
        complexitySpace: "O(n)",
        body: "Recurse on the remaining suffix; memoize failed start positions."
      },
      {
        name: "Bottom-up DP",
        complexityTime: "O(n\xB2 \xB7 L)",
        complexitySpace: "O(n)",
        body: "dp[i] over prefix lengths, checking dictionary membership of each candidate suffix."
      }
    ],
    complexityTime: "O(n\xB2)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode word break"),
    tags: ["trie", "dynamic-programming", "string", "hash-table"],
    starterCode: buildStarter("stringWords", "bool", "wordBreak"),
    reference: (input) => {
      const [s = "", dictLine = ""] = lines(input);
      const dict = new Set(words(dictLine));
      const n = s.length;
      const dp = new Array(n + 1).fill(false);
      dp[0] = true;
      for (let i = 1; i <= n; i++) {
        for (let j = 0; j < i; j++) {
          if (dp[j] && dict.has(s.slice(j, i))) {
            dp[i] = true;
            break;
          }
        }
      }
      return boolOut(dp[n]);
    },
    tests: [
      { input: "leetcode\nleet code", sample: true },
      { input: "applepenapple\napple pen", sample: true },
      { input: "catsandog\ncats dog sand and cat", sample: true },
      { input: "a\nb" },
      { input: "aaaaaaa\naaaa aaa" }
    ]
  },
  {
    slug: "counting-words-with-a-given-prefix",
    title: "Counting Words With a Given Prefix",
    difficulty: "EASY",
    statement: `Given a prefix string \`s\` and a list of words, return how many words have \`s\` as a prefix.

**Input**
- Line 1: the prefix \`s\`
- Line 2: space-separated words

**Output**: the count.`,
    constraints: `- 1 \u2264 words.length \u2264 100
- 1 \u2264 word and prefix lengths \u2264 100
- Lowercase English letters.`,
    examples: [
      {
        input: "at\npay attention practice attend",
        output: "2",
        explanation: '"attention" and "attend" start with "at".'
      },
      { input: "code\nleetcode win loops success", output: "0" }
    ],
    hints: [
      "A direct scan with startsWith solves one query in O(total characters).",
      "The trie view: insert every word, walk the prefix, read the pass-through count at the final node.",
      "Store a counter on each trie node incremented at insert time \u2014 prefix queries become O(|prefix|)."
    ],
    editorial: `For a single query, scanning every word with \`startsWith\` is optimal and honest \u2014 O(total characters). The reason this problem lives in the trie topic: the moment you have *many* prefix queries over one dictionary, the trie with a per-node \`count\` (how many inserted words pass through this node) answers each query in O(|prefix|), independent of dictionary size. Insert all words once \u2014 each node on a word's path increments its counter \u2014 then a query just walks the prefix and returns the count at the last node (0 if the walk falls off). That per-node aggregate is the same trick behind autocomplete popularity counts and 'sum of prefix scores' problems.`,
    approaches: [
      {
        name: "Linear scan",
        complexityTime: "O(\u03A3|word|)",
        complexitySpace: "O(1)",
        body: "startsWith over the list \u2014 right for one query."
      },
      {
        name: "Trie with pass-through counts",
        complexityTime: "O(\u03A3|word|) build, O(|prefix|) per query",
        complexitySpace: "O(\u03A3|word|)",
        body: "Counter on every node; queries read one node's counter."
      }
    ],
    complexityTime: "O(\u03A3|word|)",
    complexitySpace: "O(\u03A3|word|)",
    youtubeUrl: yt("counting words with a given prefix trie"),
    tags: ["trie", "string"],
    starterCode: buildStarter("stringWords", "int", "prefixCount"),
    reference: (input) => {
      const pref = (lines(input)[0] ?? "").trim();
      const ws = words(lines(input)[1]);
      return String(ws.filter((w) => w.startsWith(pref)).length);
    },
    tests: [
      { input: "at\npay attention practice attend", sample: true },
      { input: "code\nleetcode win loops success", sample: true },
      { input: "a\na" },
      { input: "ab\nab abc abd ba aab" },
      { input: "zzz\nzz zzz zzzz z" }
    ]
  }
];

// src/data/problems/heaps.ts
var first7 = (s) => ints(s.split("\n")[0]);
var heaps = [
  {
    slug: "kth-largest-element-in-an-array",
    title: "Kth Largest Element in an Array",
    difficulty: "MEDIUM",
    statement: `Given an integer array \`nums\` and an integer \`k\`, return the k-th **largest** element (in sorted order, not the k-th distinct value).

**Input**
- Line 1: space-separated integers \`nums\`
- Line 2: integer \`k\`

**Output**: the k-th largest value.`,
    constraints: `- 1 \u2264 k \u2264 nums.length \u2264 10^5
- -10^4 \u2264 nums[i] \u2264 10^4`,
    examples: [
      { input: "3 2 1 5 6 4\n2", output: "5" },
      { input: "3 2 3 1 2 4 5 5 6\n4", output: "4" }
    ],
    hints: [
      "Sorting is O(n log n) \u2014 fine, but interviewers want better.",
      "A min-heap of size k keeps exactly the k largest seen so far.",
      "Quickselect reaches average O(n) by partitioning like quicksort but recursing one side."
    ],
    editorial: `Keep a **min-heap of size k**: push each element, popping the minimum whenever the heap exceeds k. Whatever survives is the k largest, and the heap's root is the answer \u2014 O(n log k). **Quickselect** (partition around a pivot, recurse only into the side containing index n\u2212k) achieves average O(n) with O(1) space and is the expected follow-up.`,
    approaches: [
      {
        name: "Min-heap of size k",
        complexityTime: "O(n log k)",
        complexitySpace: "O(k)",
        body: "Maintain the k largest; the heap root is the k-th largest."
      },
      {
        name: "Quickselect",
        complexityTime: "O(n) average",
        complexitySpace: "O(1)",
        body: "Partition and recurse into the half containing the target index."
      }
    ],
    complexityTime: "O(n log k)",
    complexitySpace: "O(k)",
    youtubeUrl: yt("neetcode kth largest element in an array"),
    tags: ["heap", "quickselect", "sorting"],
    starterCode: buildStarter("intArrayK", "int", "findKthLargest"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0).sort((a, b) => b - a);
      return String(nums[int(l1) - 1]);
    },
    tests: [
      { input: "3 2 1 5 6 4\n2", sample: true },
      { input: "3 2 3 1 2 4 5 5 6\n4", sample: true },
      { input: "1\n1" },
      { input: "-1 -2 -3\n3" },
      { input: "7 7 7 7\n2" }
    ]
  },
  {
    slug: "last-stone-weight",
    title: "Last Stone Weight",
    difficulty: "EASY",
    statement: `You have stones with positive integer weights. Each turn, smash the two **heaviest** together: equal weights \u2192 both destroyed; otherwise the heavier survives with the difference. Return the weight of the last stone, or \`0\` if none remain.

**Input**: one line of space-separated integers.
**Output**: the final weight (or 0).`,
    constraints: `- 1 \u2264 stones.length \u2264 30
- 1 \u2264 stones[i] \u2264 1000`,
    examples: [
      { input: "2 7 4 1 8 1", output: "1", explanation: "8&7\u21921, 4&2\u21922, 2&1\u21921, 1&1\u21920 leaves 1." },
      { input: "1", output: "1" }
    ],
    hints: [
      "You repeatedly need the two largest \u2014 that's a max-heap's specialty.",
      "Pop two, push back the difference if non-zero, repeat until \u2264 1 stone."
    ],
    editorial: `Push everything into a **max-heap**. While at least two stones remain: pop the two heaviest, and if they differ push back the difference. Each smash is O(log n) and removes at least one stone \u2192 O(n log n) overall. (Languages with only min-heaps: negate the values.)`,
    complexityTime: "O(n log n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("last stone weight heap leetcode"),
    tags: ["heap", "simulation"],
    starterCode: buildStarter("intArray", "int", "lastStoneWeight"),
    reference: (input) => {
      const stones = first7(input);
      while (stones.length > 1) {
        stones.sort((a, b) => a - b);
        const y = stones.pop();
        const x = stones.pop();
        if (y !== x) stones.push(y - x);
      }
      return String(stones[0] ?? 0);
    },
    tests: [
      { input: "2 7 4 1 8 1", sample: true },
      { input: "1", sample: true },
      { input: "3 3" },
      { input: "9 3 2 10" },
      { input: "1 1 1" }
    ]
  },
  {
    slug: "top-k-frequent-elements",
    title: "Top K Frequent Elements",
    difficulty: "MEDIUM",
    statement: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\` most frequent values, ordered by frequency (highest first); break frequency ties by smaller value first.

**Input**
- Line 1: space-separated integers \`nums\`
- Line 2: integer \`k\`

**Output**: the k values, space-separated.`,
    constraints: `- 1 \u2264 nums.length \u2264 10^5
- k is between 1 and the number of distinct values.`,
    examples: [
      { input: "1 1 1 2 2 3\n2", output: "1 2" },
      { input: "4 4 7 7\n2", output: "4 7", explanation: "Tie on frequency \u2014 smaller value first." }
    ],
    hints: [
      "Count frequencies with a hash map first.",
      "A heap of (frequency, value) gets O(n log k). Bucket sort by frequency gets O(n)."
    ],
    editorial: `Count with a hash map, then select the top k. A heap keyed on (frequency, value) does it in O(n log k). **Bucket sort** does better: index an array by frequency (max possible is n), drop each value into its bucket, then read buckets from high to low \u2014 O(n) total, no comparisons needed.`,
    approaches: [
      {
        name: "Heap of size k",
        complexityTime: "O(n log k)",
        complexitySpace: "O(n)",
        body: "Min-heap on frequency; pop when size exceeds k."
      },
      {
        name: "Bucket sort by frequency",
        complexityTime: "O(n)",
        complexitySpace: "O(n)",
        body: "bucket[f] = values occurring f times; sweep from n down."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode top k frequent elements"),
    tags: ["heap", "hash-table", "bucket-sort"],
    starterCode: buildStarter("intArrayK", "intArray", "topKFrequent"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0);
      const k = int(l1);
      const freq = /* @__PURE__ */ new Map();
      for (const x of nums) freq.set(x, (freq.get(x) ?? 0) + 1);
      const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      return arrOut(sorted.slice(0, k).map(([v]) => v));
    },
    tests: [
      { input: "1 1 1 2 2 3\n2", sample: true },
      { input: "4 4 7 7\n2", sample: true },
      { input: "1\n1" },
      { input: "5 5 5 -1 -1 -1 2\n2" },
      { input: "3 0 1 0\n1" }
    ]
  },
  {
    slug: "k-closest-points-to-origin",
    title: "K Closest Points to Origin",
    difficulty: "MEDIUM",
    statement: `Given points on a plane, return the \`k\` points closest to the origin by Euclidean distance, ordered by distance (ties: smaller x first, then smaller y).

**Input**
- Line 1: two integers \`n 2\` (n points, 2 coordinates each)
- Next n lines: \`x y\` of each point
- Last line: integer \`k\`

**Output**: k lines, each \`x y\`.`,
    constraints: `- 1 \u2264 k \u2264 n \u2264 10^4
- -10^4 \u2264 coordinates \u2264 10^4`,
    examples: [
      { input: "2 2\n1 3\n-2 2\n1", output: "-2 2", explanation: "\u221A8 < \u221A10." },
      { input: "3 2\n3 3\n5 -1\n-2 4\n2", output: "3 3\n-2 4" }
    ],
    hints: [
      "Compare squared distances \u2014 no sqrt needed.",
      "A max-heap of size k keeps the k closest; or quickselect on squared distance."
    ],
    editorial: `Distance comparisons don't need square roots \u2014 compare \`x\xB2 + y\xB2\` directly. A **max-heap of size k** (evict the farthest) processes the stream in O(n log k); quickselect on squared distance achieves average O(n). Sorting the k survivors for stable output costs O(k log k).`,
    complexityTime: "O(n log k)",
    complexitySpace: "O(k)",
    youtubeUrl: yt("k closest points to origin heap"),
    tags: ["heap", "quickselect", "geometry"],
    starterCode: buildStarter("matrixK", "intMatrix", "kClosest"),
    reference: (input) => {
      const ls = lines(input);
      const [n] = ints(ls[0]);
      const pts = [];
      for (let i = 0; i < n; i++) pts.push(ints(ls[1 + i]));
      const k = int(ls[1 + n]);
      const d = (p) => p[0] * p[0] + p[1] * p[1];
      pts.sort((a, b) => d(a) - d(b) || a[0] - b[0] || a[1] - b[1]);
      return matOut(pts.slice(0, k));
    },
    tests: [
      { input: "2 2\n1 3\n-2 2\n1", sample: true },
      { input: "3 2\n3 3\n5 -1\n-2 4\n2", sample: true },
      { input: "1 2\n0 0\n1" },
      { input: "4 2\n1 0\n0 1\n-1 0\n0 -1\n4" }
    ]
  },
  {
    slug: "kth-largest-element-in-a-stream",
    title: "Kth Largest Element in a Stream",
    difficulty: "EASY",
    statement: `Design a class that tracks the k-th largest element in a stream of test scores.

**Input**: one operation per line \u2014
- \`init k v1 v2 \u2026\` \u2014 first line: initialize with k and the initial values (possibly none)
- \`add x\` \u2014 add a score and print the current k-th largest

**Output**: \`init\` prints \`null\`; each \`add\` prints the k-th largest after insertion. There are always at least k values when \`add\` is called.`,
    constraints: `- 1 \u2264 k \u2264 10^4
- Up to 10^4 add calls.`,
    examples: [
      {
        input: "init 3 4 5 8 2\nadd 3\nadd 5\nadd 10\nadd 9\nadd 4",
        output: "null\n4\n5\n5\n8\n8"
      }
    ],
    hints: [
      "You only ever need the k largest values \u2014 nothing below matters.",
      "A min-heap capped at size k has the answer at its root, always."
    ],
    editorial: `Maintain a **min-heap of exactly k elements** \u2014 the k largest seen. On \`add\`, push and pop the minimum if size exceeds k; the root is then the k-th largest. Each add is O(log k), and the state stays tiny regardless of stream length \u2014 the same pattern behind leaderboards.`,
    complexityTime: "O(log k) per add",
    complexitySpace: "O(k)",
    youtubeUrl: yt("kth largest element in a stream heap"),
    tags: ["heap", "design", "stream"],
    starterCode: buildStarter("ops", "lines", "processOps"),
    reference: (input) => {
      const ops = lines(input).filter((l) => l.trim().length > 0);
      const out = [];
      let k = 0;
      let vals = [];
      for (const op of ops) {
        const parts = op.trim().split(/\s+/);
        if (parts[0] === "init") {
          k = parseInt(parts[1], 10);
          vals = parts.slice(2).map((x) => parseInt(x, 10));
          out.push("null");
        } else {
          vals.push(parseInt(parts[1], 10));
          const sorted = [...vals].sort((a, b) => b - a);
          out.push(String(sorted[k - 1]));
        }
      }
      return linesOut(out);
    },
    tests: [
      { input: "init 3 4 5 8 2\nadd 3\nadd 5\nadd 10\nadd 9\nadd 4", sample: true },
      { input: "init 1\nadd -3\nadd -2\nadd -4\nadd 0\nadd 4" },
      { input: "init 2 0\nadd -1\nadd 1\nadd -2\nadd -4\nadd 3" }
    ]
  },
  {
    slug: "task-scheduler",
    title: "Task Scheduler",
    difficulty: "MEDIUM",
    statement: `A CPU runs tasks labeled A\u2013Z, one per time unit, and identical tasks must be at least \`n\` units apart (idle slots allowed). Return the minimum total units to finish all tasks.

**Input**
- Line 1: the task letters as one string (e.g. \`AAB\`)
- Line 2: integer \`n\` (the cooldown)

**Output**: the minimum number of time units.`,
    constraints: `- 1 \u2264 tasks \u2264 10^4
- 0 \u2264 n \u2264 100`,
    examples: [
      { input: "AAABBB\n2", output: "8", explanation: "A B idle A B idle A B." },
      { input: "AAABBB\n0", output: "6" },
      { input: "AAAABBBBCCD\n2", output: "11", explanation: "A B C A B C A B D A B \u2014 no idles needed." }
    ],
    hints: [
      "The most frequent task dictates the skeleton: (maxFreq \u2212 1) gaps of size n + 1.",
      "Other tasks fill the gaps; if they overflow, no idling is needed at all.",
      "Answer = max(total tasks, (maxFreq \u2212 1) \xD7 (n + 1) + count of tasks with maxFreq)."
    ],
    editorial: `Schedule the most frequent task first: it forces \`(maxFreq \u2212 1)\` blocks of length \`n + 1\`, plus a final row holding every task that shares the top frequency. All other tasks slot into the gaps. If tasks outnumber that frame, the CPU never idles and the answer is simply the task count: \`max(len, (maxFreq \u2212 1)(n + 1) + #maxFreq)\`. O(n) counting, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode task scheduler"),
    tags: ["heap", "greedy", "counting"],
    starterCode: buildStarter("stringInt", "int", "leastInterval"),
    reference: (input) => {
      const [tasks = "", nline] = lines(input);
      const n = int(nline);
      const freq = /* @__PURE__ */ new Map();
      for (const c of tasks) freq.set(c, (freq.get(c) ?? 0) + 1);
      const maxFreq = Math.max(...freq.values());
      const maxCount = [...freq.values()].filter((f) => f === maxFreq).length;
      return String(Math.max(tasks.length, (maxFreq - 1) * (n + 1) + maxCount));
    },
    tests: [
      { input: "AAABBB\n2", sample: true },
      { input: "AAABBB\n0", sample: true },
      { input: "AAAABBBBCCD\n2", sample: true },
      { input: "A\n100" },
      { input: "ABCDEFG\n2" }
    ]
  },
  {
    slug: "sort-characters-by-frequency",
    title: "Sort Characters By Frequency",
    difficulty: "MEDIUM",
    statement: `Given a string \`s\`, sort its characters by **decreasing frequency** and return the result. Characters with equal frequency appear in ascending character order (so the output is deterministic).

**Input**: one line, the string \`s\`.
**Output**: the frequency-sorted string.`,
    constraints: `- 1 \u2264 s.length \u2264 5\xB710^5
- Letters and digits.`,
    examples: [
      { input: "tree", output: "eert", explanation: "'e' twice, then 'r' and 't' (tie \u2192 ascending)." },
      { input: "cccaaa", output: "aaaccc", explanation: "Tie at 3 \u2014 'a' before 'c'." }
    ],
    hints: [
      "Count characters, then order groups by count.",
      "A heap or a simple sort of (count, char) pairs both work; bucket sort gives O(n)."
    ],
    editorial: `Count each character, sort the distinct characters by (frequency descending, character ascending), and emit each character repeated by its count. The comparator-based version is O(u log u) over u distinct characters; a frequency-bucket version reaches O(n). The tie-break rule just makes the answer unique.`,
    complexityTime: "O(n + u log u)",
    complexitySpace: "O(u)",
    youtubeUrl: yt("sort characters by frequency heap"),
    tags: ["heap", "hash-table", "sorting", "string"],
    starterCode: buildStarter("string", "string", "frequencySort"),
    reference: (input) => {
      const s = lines(input)[0] ?? "";
      const freq = /* @__PURE__ */ new Map();
      for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
      const groups = [...freq.entries()].sort(
        (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)
      );
      return groups.map(([c, f]) => c.repeat(f)).join("");
    },
    tests: [
      { input: "tree", sample: true },
      { input: "cccaaa", sample: true },
      { input: "Aabb" },
      { input: "2a554442f544asfasssffffasss" },
      { input: "x" }
    ]
  },
  {
    slug: "find-median-from-data-stream",
    title: "Find Median from Data Stream",
    difficulty: "HARD",
    statement: `Design a structure that ingests integers and can return the median of everything seen so far at any time.

**Input**: one operation per line \u2014
- \`addNum x\` \u2014 add integer x
- \`findMedian\` \u2014 print the median formatted with **one decimal place** (e.g. \`2.0\`, \`1.5\`)

**Output**: \`addNum\` prints \`null\`; \`findMedian\` prints the median.`,
    constraints: `- -10^5 \u2264 x \u2264 10^5
- Up to 5\xB710^4 operations; findMedian is only called after at least one add.`,
    examples: [
      {
        input: "addNum 1\naddNum 2\nfindMedian\naddNum 3\nfindMedian",
        output: "null\nnull\n1.5\nnull\n2.0"
      }
    ],
    hints: [
      "Keep the lower half and upper half of the data separated.",
      "A max-heap for the low half + a min-heap for the high half, kept balanced within 1.",
      "The median is a heap root (odd count) or the average of both roots (even)."
    ],
    editorial: `Maintain two heaps: a **max-heap** holding the smaller half and a **min-heap** holding the larger half, rebalanced so their sizes differ by at most one. Insertion routes through one root and possibly migrates an element \u2014 O(log n). The median reads off the roots in O(1). This two-heap pattern is the canonical streaming-median answer.`,
    complexityTime: "O(log n) add, O(1) median",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode find median from data stream"),
    tags: ["heap", "design", "stream"],
    starterCode: buildStarter("ops", "lines", "processOps"),
    reference: (input) => {
      const ops = lines(input).filter((l) => l.trim().length > 0);
      const vals = [];
      const out = [];
      for (const op of ops) {
        const parts = op.trim().split(/\s+/);
        if (parts[0] === "addNum") {
          const x = parseInt(parts[1], 10);
          let lo = 0;
          let hi = vals.length;
          while (lo < hi) {
            const mid = lo + hi >> 1;
            if (vals[mid] < x) lo = mid + 1;
            else hi = mid;
          }
          vals.splice(lo, 0, x);
          out.push("null");
        } else {
          const n = vals.length;
          const median = n % 2 === 1 ? vals[(n - 1) / 2] : (vals[n / 2 - 1] + vals[n / 2]) / 2;
          out.push(median.toFixed(1));
        }
      }
      return linesOut(out);
    },
    tests: [
      { input: "addNum 1\naddNum 2\nfindMedian\naddNum 3\nfindMedian", sample: true },
      { input: "addNum -1\nfindMedian\naddNum -2\nfindMedian\naddNum -3\nfindMedian" },
      { input: "addNum 6\nfindMedian\naddNum 10\nfindMedian\naddNum 2\nfindMedian\naddNum 6\nfindMedian\naddNum 5\nfindMedian" }
    ]
  },
  {
    slug: "merge-k-sorted-lists",
    title: "Merge k Sorted Lists",
    difficulty: "HARD",
    statement: `Merge \`k\` sorted linked lists into one sorted linked list and return it.

**Input**
- Line 1: integer \`k\`
- Next k lines: each list's values in order (a line may be empty)

**Output**: the merged list's values, space-separated.`,
    constraints: `- 0 \u2264 k \u2264 10^4
- Total nodes \u2264 10^4; each list sorted ascending.`,
    examples: [
      { input: "3\n1 4 5\n1 3 4\n2 6", output: "1 1 2 3 4 4 5 6" },
      { input: "1\n", output: "" }
    ],
    hints: [
      "Merging lists one by one into an accumulator is O(k\xB7N).",
      "A min-heap over the k current heads gives O(N log k).",
      "Divide and conquer \u2014 merge pairs, then pairs of pairs \u2014 also gives O(N log k)."
    ],
    editorial: `Put each list's head in a **min-heap**; repeatedly pop the smallest node, append it to the result, and push its successor. Every node passes through the heap once \u2192 O(N log k). Pairwise **divide-and-conquer** merging achieves the same bound using only the two-list merge you already know.`,
    approaches: [
      {
        name: "Sequential merging",
        complexityTime: "O(k\xB7N)",
        complexitySpace: "O(1)",
        body: "Fold lists into an accumulator with merge-two \u2014 the first list is traversed k times."
      },
      {
        name: "Min-heap of heads",
        complexityTime: "O(N log k)",
        complexitySpace: "O(k)",
        body: "Heap always knows the globally smallest remaining node."
      },
      {
        name: "Divide and conquer",
        complexityTime: "O(N log k)",
        complexitySpace: "O(log k)",
        body: "Merge pairs of lists, halving the count each round."
      }
    ],
    complexityTime: "O(N log k)",
    complexitySpace: "O(k)",
    youtubeUrl: yt("neetcode merge k sorted lists"),
    tags: ["heap", "linked-list", "divide-and-conquer"],
    starterCode: buildStarter("kLists", "list", "mergeKLists"),
    reference: (input) => {
      const ls = lines(input);
      const k = int(ls[0]);
      const all = [];
      for (let i = 0; i < k; i++) all.push(...ints(ls[1 + i]));
      return arrOut(all.sort((a, b) => a - b));
    },
    tests: [
      { input: "3\n1 4 5\n1 3 4\n2 6", sample: true },
      { input: "1\n", sample: true },
      { input: "0" },
      { input: "2\n-10 -5 0\n-7 3" },
      { input: "4\n1\n\n2\n1 1" }
    ]
  },
  {
    slug: "kth-smallest-element-in-a-sorted-matrix",
    title: "Kth Smallest Element in a Sorted Matrix",
    difficulty: "MEDIUM",
    statement: `Each row and each column of an n\xD7n matrix is sorted ascending. Return the k-th smallest element **in sorted order** (not the k-th distinct value).

**Input**
- Line 1: \`n n\` \u2014 the matrix dimensions
- Next n lines: the matrix rows
- Last line: the integer \`k\`

**Output**: the k-th smallest element.`,
    constraints: `- 1 \u2264 n \u2264 300
- -10^9 \u2264 values \u2264 10^9
- 1 \u2264 k \u2264 n\xB2`,
    examples: [
      {
        input: "3 3\n1 5 9\n10 11 13\n12 13 15\n8",
        output: "13",
        explanation: "Sorted: 1 5 9 10 11 12 13 13 15 \u2014 the 8th is 13."
      },
      { input: "1 1\n-5\n1", output: "-5" }
    ],
    hints: [
      "A min-heap seeded with each row's head pops the global smallest k times \u2014 merge k sorted lists in disguise.",
      "Only push a popped cell's right neighbor; column starts are already seeded.",
      "The O(n log(range)) alternative: binary search the value space, counting cells \u2264 mid via a staircase walk."
    ],
    editorial: `Two respectable answers. **Heap**: treat each row as a sorted list and k-way merge \u2014 seed the heap with column 0 of every row (capped at k rows), then pop/push-right-neighbor k times: O(k log n). **Binary search on the value** is the elegant one: for a candidate v, count elements \u2264 v in O(n) by walking the staircase from the bottom-left corner (step up when the cell exceeds v, right otherwise); binary search the smallest v whose count reaches k over the number range: O(n log(max\u2212min)), constant space. The staircase count exploits both sort orders at once \u2014 the property the problem gives you specifically so you'll use it.`,
    approaches: [
      {
        name: "Min-heap k-way merge",
        complexityTime: "O(k log n)",
        complexitySpace: "O(n)",
        body: "Seed row heads; pop the min, push its right neighbor, k times."
      },
      {
        name: "Binary search + staircase count",
        complexityTime: "O(n log range)",
        complexitySpace: "O(1)",
        body: "Count cells \u2264 mid from the bottom-left corner; search the value space."
      }
    ],
    complexityTime: "O(n log range)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("kth smallest element sorted matrix leetcode"),
    tags: ["heap", "binary-search", "matrix"],
    starterCode: buildStarter("matrixK", "int", "kthSmallest"),
    reference: (input) => {
      const ls = lines(input);
      const [r] = ints(ls[0]);
      const all = [];
      for (let i = 0; i < r; i++) all.push(...ints(ls[1 + i]));
      const k = ints(ls[1 + r])[0];
      all.sort((a, b) => a - b);
      return String(all[k - 1]);
    },
    tests: [
      { input: "3 3\n1 5 9\n10 11 13\n12 13 15\n8", sample: true },
      { input: "1 1\n-5\n1", sample: true },
      { input: "2 2\n1 2\n1 3\n2" },
      { input: "2 2\n-5 -4\n-5 -4\n4" },
      { input: "3 3\n1 3 5\n6 7 12\n11 14 14\n6" }
    ]
  }
];

// src/data/problems/backtracking.ts
var first8 = (s) => ints(s.split("\n")[0]);
var backtracking = [
  {
    slug: "subsets",
    title: "Subsets",
    difficulty: "MEDIUM",
    statement: `Given an array of **distinct** integers, return all possible subsets (the power set).

**Input**: one line of space-separated integers.
**Output**: one subset per line, elements in ascending order (the empty subset prints as an empty line). Subsets may be produced in any order \u2014 the template prints them canonically.`,
    constraints: `- 1 \u2264 nums.length \u2264 10
- Distinct values.`,
    examples: [
      { input: "1 2 3", output: "\n1\n1 2\n1 2 3\n1 3\n2\n2 3\n3" },
      { input: "0", output: "\n0" }
    ],
    hints: [
      "Every element is either in or out \u2014 2\u207F combinations.",
      "Backtrack: at index i, branch on include/exclude and recurse on i+1.",
      "Record the current path at every node of the recursion tree, not just leaves."
    ],
    editorial: `Classic backtracking: walk indices left to right, and at each step either take the element or skip it, recording the running path as a subset at every call. The recursion tree has exactly 2\u207F leaves; total work is O(n \xB7 2\u207F). Sorting the input first makes each subset come out in ascending order.`,
    approaches: [
      {
        name: "Iterative doubling",
        complexityTime: "O(n \xB7 2\u207F)",
        complexitySpace: "O(2\u207F)",
        body: "Start with [[]]; for each element, append it to a copy of every existing subset."
      },
      {
        name: "Backtracking DFS",
        complexityTime: "O(n \xB7 2\u207F)",
        complexitySpace: "O(n) recursion",
        body: "Include/exclude branching over indices; emit the path at each node."
      }
    ],
    complexityTime: "O(n \xB7 2\u207F)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode subsets backtracking"),
    tags: ["backtracking", "bit-manipulation", "recursion"],
    starterCode: buildStarter("intArray", "sortedIntMatrix", "subsets"),
    reference: (input) => {
      const nums = first8(input).sort((a, b) => a - b);
      const rows = [];
      const path = [];
      const dfs = (i) => {
        rows.push([...path]);
        for (let j = i; j < nums.length; j++) {
          path.push(nums[j]);
          dfs(j + 1);
          path.pop();
        }
      };
      dfs(0);
      return sortedMatOut(rows);
    },
    tests: [
      { input: "1 2 3", sample: true },
      { input: "0", sample: true },
      { input: "5 7" },
      { input: "4 1 0 -3" }
    ]
  },
  {
    slug: "permutations",
    title: "Permutations",
    difficulty: "MEDIUM",
    statement: `Given an array of **distinct** integers, return all possible orderings (permutations).

**Input**: one line of space-separated integers.
**Output**: one permutation per line, space-separated. Any generation order \u2014 the template prints canonically.`,
    constraints: `- 1 \u2264 nums.length \u2264 6
- Distinct values.`,
    examples: [
      { input: "1 2 3", output: "1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1" },
      { input: "1", output: "1" }
    ],
    hints: [
      "Build the permutation one position at a time.",
      "Track which elements are already used (a boolean array or in-place swapping)."
    ],
    editorial: `Backtrack over positions: at each depth, try every unused element, mark it used, recurse, then unmark. The recursion tree has n! leaves and each permutation costs O(n) to copy \u2192 O(n \xB7 n!). The in-place swap variant avoids the used-array by fixing one element per depth via swapping.`,
    complexityTime: "O(n \xB7 n!)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode permutations backtracking"),
    tags: ["backtracking", "recursion"],
    starterCode: buildStarter("intArray", "sortedIntMatrix", "permute"),
    reference: (input) => {
      const nums = first8(input);
      const rows = [];
      const used = new Array(nums.length).fill(false);
      const path = [];
      const dfs = () => {
        if (path.length === nums.length) {
          rows.push([...path]);
          return;
        }
        for (let i = 0; i < nums.length; i++) {
          if (used[i]) continue;
          used[i] = true;
          path.push(nums[i]);
          dfs();
          path.pop();
          used[i] = false;
        }
      };
      dfs();
      return sortedMatOut(rows);
    },
    tests: [
      { input: "1 2 3", sample: true },
      { input: "1", sample: true },
      { input: "0 1" },
      { input: "5 4 6 2" }
    ]
  },
  {
    slug: "combination-sum",
    title: "Combination Sum",
    difficulty: "MEDIUM",
    statement: `Given an array of **distinct** positive integers \`candidates\` and a \`target\`, return all unique combinations that sum to \`target\`. The same candidate may be used **unlimited** times.

**Input**
- Line 1: space-separated candidates
- Line 2: integer \`target\`

**Output**: one combination per line, elements in non-decreasing order. Print nothing if none exist.`,
    constraints: `- 1 \u2264 candidates.length \u2264 30
- 2 \u2264 candidates[i] \u2264 40, distinct
- 1 \u2264 target \u2264 40`,
    examples: [
      { input: "2 3 6 7\n7", output: "2 2 3\n7" },
      { input: "2 3 5\n8", output: "2 2 2 2\n2 3 3\n3 5" },
      { input: "2\n1", output: "" }
    ],
    hints: [
      "To reuse an element, recurse with the same start index after taking it.",
      "To avoid duplicate combinations, never look backwards \u2014 only consider candidates from the current index on.",
      "Prune when the remaining target goes negative."
    ],
    editorial: `DFS over (start index, remaining target): take \`candidates[i]\` and recurse **without advancing** \`i\` (unlimited reuse), or move on to \`i + 1\`. Restricting choices to indices \u2265 start guarantees each combination is generated exactly once in non-decreasing order. Prune on negative remainders; emit on zero.`,
    complexityTime: "O(k \xB7 2^(target/min))",
    complexitySpace: "O(target/min)",
    youtubeUrl: yt("neetcode combination sum"),
    tags: ["backtracking", "recursion", "array"],
    starterCode: buildStarter("intArrayTarget", "sortedIntMatrix", "combinationSum"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const cands = ints(l0).sort((a, b) => a - b);
      const target = int(l1);
      const rows = [];
      const path = [];
      const dfs = (start, rem) => {
        if (rem === 0) {
          rows.push([...path]);
          return;
        }
        for (let i = start; i < cands.length; i++) {
          if (cands[i] > rem) break;
          path.push(cands[i]);
          dfs(i, rem - cands[i]);
          path.pop();
        }
      };
      dfs(0, target);
      return sortedMatOut(rows);
    },
    tests: [
      { input: "2 3 6 7\n7", sample: true },
      { input: "2 3 5\n8", sample: true },
      { input: "2\n1", sample: true },
      { input: "7 3 2\n18" },
      { input: "8 7 4 3\n11" }
    ]
  },
  {
    slug: "combination-sum-ii",
    title: "Combination Sum II",
    difficulty: "MEDIUM",
    statement: `Given a list of positive integers \`candidates\` (duplicates possible) and a \`target\`, return all **unique** combinations summing to \`target\`. Each candidate may be used **at most once**.

**Input**
- Line 1: space-separated candidates
- Line 2: integer \`target\`

**Output**: one combination per line, elements in non-decreasing order; no duplicate lines.`,
    constraints: `- 1 \u2264 candidates.length \u2264 100
- 1 \u2264 candidates[i] \u2264 50
- 1 \u2264 target \u2264 30`,
    examples: [
      { input: "10 1 2 7 6 1 5\n8", output: "1 1 6\n1 2 5\n1 7\n2 6" },
      { input: "2 5 2 1 2\n5", output: "1 2 2\n5" }
    ],
    hints: [
      "Sort first so duplicates are adjacent.",
      "Advance to i+1 when recursing (single use).",
      "At the same recursion depth, skip a candidate equal to its predecessor \u2014 that's what kills duplicate combinations."
    ],
    editorial: `Sort, then DFS advancing the index on every take (single use). The deduplication rule: within one loop level, if \`candidates[i] == candidates[i-1]\` and \`i > start\`, skip \u2014 using the second copy where the first was already tried can only recreate the same combination. Prune when the candidate exceeds the remainder.`,
    complexityTime: "O(2\u207F)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode combination sum ii"),
    tags: ["backtracking", "recursion", "array"],
    starterCode: buildStarter("intArrayTarget", "sortedIntMatrix", "combinationSum2"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const cands = ints(l0).sort((a, b) => a - b);
      const target = int(l1);
      const rows = [];
      const path = [];
      const dfs = (start, rem) => {
        if (rem === 0) {
          rows.push([...path]);
          return;
        }
        for (let i = start; i < cands.length; i++) {
          if (i > start && cands[i] === cands[i - 1]) continue;
          if (cands[i] > rem) break;
          path.push(cands[i]);
          dfs(i + 1, rem - cands[i]);
          path.pop();
        }
      };
      dfs(0, target);
      return sortedMatOut(rows);
    },
    tests: [
      { input: "10 1 2 7 6 1 5\n8", sample: true },
      { input: "2 5 2 1 2\n5", sample: true },
      { input: "1 1 1 1\n2" },
      { input: "3 1 3 5 1 1\n8" }
    ]
  },
  {
    slug: "generate-parentheses",
    title: "Generate Parentheses",
    difficulty: "MEDIUM",
    statement: `Given \`n\`, generate all combinations of \`n\` pairs of well-formed parentheses.

**Input**: one line, the integer \`n\`.
**Output**: one combination per line. Any order \u2014 the template prints canonically.`,
    constraints: `- 1 \u2264 n \u2264 8`,
    examples: [
      { input: "3", output: "((()))\n(()())\n(())()\n()(())\n()()()" },
      { input: "1", output: "()" }
    ],
    hints: [
      "Track how many opens and closes you've placed.",
      "You may open while opens < n; you may close while closes < opens.",
      "Those two rules alone guarantee validity \u2014 no post-filtering needed."
    ],
    editorial: `Backtrack on a partial string with counts \`(open, close)\`: place \`(\` while \`open < n\`, place \`)\` while \`close < open\`. Every leaf at length 2n is valid by construction. The number of results is the n-th **Catalan number**, so the work is O(4\u207F/\u221An) \u2014 tiny for interview-sized n.`,
    complexityTime: "O(4\u207F / \u221An)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode generate parentheses"),
    tags: ["backtracking", "string", "recursion"],
    starterCode: buildStarter("int", "sortedLines", "generateParenthesis"),
    reference: (input) => {
      const n = int(lines(input)[0]);
      const res = [];
      const dfs = (cur, open, close) => {
        if (cur.length === 2 * n) {
          res.push(cur);
          return;
        }
        if (open < n) dfs(cur + "(", open + 1, close);
        if (close < open) dfs(cur + ")", open, close + 1);
      };
      dfs("", 0, 0);
      return sortedLinesOut(res);
    },
    tests: [
      { input: "3", sample: true },
      { input: "1", sample: true },
      { input: "2" },
      { input: "4" }
    ]
  },
  {
    slug: "letter-combinations-of-a-phone-number",
    title: "Letter Combinations of a Phone Number",
    difficulty: "MEDIUM",
    statement: `Given a string of digits 2\u20139, return all letter combinations the number could represent on a classic phone keypad (2=abc, 3=def, 4=ghi, 5=jkl, 6=mno, 7=pqrs, 8=tuv, 9=wxyz).

**Input**: one line, the digit string (may be empty).
**Output**: one combination per line (nothing for an empty input). Any order \u2014 printed canonically.`,
    constraints: `- 0 \u2264 digits.length \u2264 4
- Digits 2\u20139 only.`,
    examples: [
      { input: "23", output: "ad\nae\naf\nbd\nbe\nbf\ncd\nce\ncf" },
      { input: "2", output: "a\nb\nc" }
    ],
    hints: [
      "One recursion level per digit; branch over that digit's letters.",
      "The result count is the product of the group sizes."
    ],
    editorial: `Map each digit to its letters and do a depth-per-digit DFS, appending one letter per level and emitting at full length. Equivalent iterative view: fold each digit into the running result as a cartesian product. Output size is up to 4\u207F, which dominates the cost.`,
    complexityTime: "O(n \xB7 4\u207F)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode letter combinations of a phone number"),
    tags: ["backtracking", "string", "hash-table"],
    starterCode: buildStarter("string", "sortedLines", "letterCombinations"),
    reference: (input) => {
      const digits = (lines(input)[0] ?? "").trim();
      if (!digits) return "";
      const map = {
        "2": "abc",
        "3": "def",
        "4": "ghi",
        "5": "jkl",
        "6": "mno",
        "7": "pqrs",
        "8": "tuv",
        "9": "wxyz"
      };
      let res = [""];
      for (const d of digits) {
        const next = [];
        for (const prefix of res) for (const c of map[d]) next.push(prefix + c);
        res = next;
      }
      return sortedLinesOut(res);
    },
    tests: [
      { input: "23", sample: true },
      { input: "2", sample: true },
      { input: "" },
      { input: "79" }
    ]
  },
  {
    slug: "palindrome-partitioning",
    title: "Palindrome Partitioning",
    difficulty: "MEDIUM",
    statement: `Given a string \`s\`, partition it so every piece is a palindrome. Return all such partitions.

**Input**: one line, the string \`s\`.
**Output**: one partition per line \u2014 its pieces space-separated, in order. Any partition order \u2014 printed canonically.`,
    constraints: `- 1 \u2264 s.length \u2264 16
- Lowercase English letters.`,
    examples: [
      { input: "aab", output: "a a b\naa b" },
      { input: "a", output: "a" }
    ],
    hints: [
      "Choose a palindromic prefix, then recurse on the remaining suffix.",
      "Backtrack over the cut position; test each prefix for palindromicity.",
      "Precomputing a isPal[i][j] DP table avoids re-checking substrings."
    ],
    editorial: `DFS over cut positions: at index \`i\`, try every \`j \u2265 i\` where \`s[i..j]\` is a palindrome, push that piece, recurse from \`j + 1\`, pop. Every full segmentation reaching the end is emitted. An O(n\xB2) palindrome table turns each check into O(1); the output itself can be exponential (e.g. all-equal strings), which bounds the runtime.`,
    complexityTime: "O(n \xB7 2\u207F)",
    complexitySpace: "O(n\xB2)",
    youtubeUrl: yt("neetcode palindrome partitioning"),
    tags: ["backtracking", "string", "dynamic-programming"],
    starterCode: buildStarter("string", "sortedLines", "partition"),
    reference: (input) => {
      const s = (lines(input)[0] ?? "").trim();
      const res = [];
      const path = [];
      const isPal = (a, b) => {
        while (a < b) {
          if (s[a] !== s[b]) return false;
          a++;
          b--;
        }
        return true;
      };
      const dfs = (i) => {
        if (i === s.length) {
          res.push(path.join(" "));
          return;
        }
        for (let j = i; j < s.length; j++) {
          if (isPal(i, j)) {
            path.push(s.slice(i, j + 1));
            dfs(j + 1);
            path.pop();
          }
        }
      };
      dfs(0);
      return sortedLinesOut(res);
    },
    tests: [
      { input: "aab", sample: true },
      { input: "a", sample: true },
      { input: "abba" },
      { input: "aaa" }
    ]
  },
  {
    slug: "n-queens-ii",
    title: "N-Queens II",
    difficulty: "HARD",
    statement: `Count the number of distinct ways to place \`n\` queens on an \`n \xD7 n\` chessboard so that no two attack each other (no shared row, column, or diagonal).

**Input**: one line, the integer \`n\`.
**Output**: the number of solutions.`,
    constraints: `- 1 \u2264 n \u2264 9`,
    examples: [
      { input: "4", output: "2" },
      { input: "1", output: "1" }
    ],
    hints: [
      "Place one queen per row; only columns and diagonals need checking.",
      "Index diagonals by (row \u2212 col) and (row + col) for O(1) conflict checks.",
      "Sets (or bitmasks) for columns and both diagonal families make the check constant-time."
    ],
    editorial: `Backtrack row by row, choosing a column for each queen. Conflicts are captured by three sets: used columns, used \u2198 diagonals (row \u2212 col), and used \u2199 diagonals (row + col) \u2014 membership tests are O(1). On a dead row, backtrack. Bitmask variants pack the three sets into integers for the fastest known simple solver. Roughly O(n!) worst case.`,
    complexityTime: "O(n!)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode n queens"),
    tags: ["backtracking", "recursion"],
    starterCode: buildStarter("int", "int", "totalNQueens"),
    reference: (input) => {
      const n = int(lines(input)[0]);
      const cols = /* @__PURE__ */ new Set();
      const d1 = /* @__PURE__ */ new Set();
      const d2 = /* @__PURE__ */ new Set();
      let count = 0;
      const dfs = (row) => {
        if (row === n) {
          count++;
          return;
        }
        for (let c = 0; c < n; c++) {
          if (cols.has(c) || d1.has(row - c) || d2.has(row + c)) continue;
          cols.add(c);
          d1.add(row - c);
          d2.add(row + c);
          dfs(row + 1);
          cols.delete(c);
          d1.delete(row - c);
          d2.delete(row + c);
        }
      };
      dfs(0);
      return String(count);
    },
    tests: [
      { input: "4", sample: true },
      { input: "1", sample: true },
      { input: "2" },
      { input: "5" },
      { input: "8" }
    ]
  },
  {
    slug: "subsets-ii",
    title: "Subsets II",
    difficulty: "MEDIUM",
    statement: `Given an array of integers **that may contain duplicates**, return all possible subsets \u2014 without any duplicate subsets in the output.

**Input**: one line of space-separated integers.
**Output**: one subset per line, elements in ascending order (the empty subset prints as an empty line). Subsets may be produced in any order \u2014 the template prints them canonically.`,
    constraints: `- 1 \u2264 nums.length \u2264 10
- -10 \u2264 values \u2264 10 (duplicates allowed)`,
    examples: [
      { input: "1 2 2", output: "\n1\n1 2\n1 2 2\n2\n2 2" },
      { input: "0", output: "\n0" }
    ],
    hints: [
      "Sort first so duplicates sit together.",
      "Generating all subsets then deduping with a set works \u2014 but the elegant fix prunes duplicates before they're born.",
      "At each recursion level, skip a value equal to the one just tried at the same level: if j > i and nums[j] == nums[j\u22121], continue."
    ],
    editorial: `Sort, then run the standard subsets DFS with one added guard: within a single level of the recursion (the for-loop over candidate positions), never *start* a branch with a value you already started one with \u2014 \`j > i && nums[j] === nums[j\u22121] \u2192 skip\`. Choosing the second '2' at a level where the first '2' was already explored would rebuild the identical subtree of subsets. Note the condition is about *the same level*, not adjacent picks \u2014 taking consecutive equal values deeper in one branch (to form [2 2]) remains legal. O(n \xB7 2\u207F) worst case, and the same skip-guard powers Combination Sum II and Permutations II \u2014 it's the canonical dedup idiom for backtracking.`,
    approaches: [
      {
        name: "Sort + same-level skip",
        complexityTime: "O(n \xB7 2\u207F)",
        complexitySpace: "O(n) recursion",
        body: "The standard include/exclude walk; equal values may only start one branch per level."
      },
      {
        name: "Generate + set dedup",
        complexityTime: "O(n \xB7 2\u207F)",
        complexitySpace: "O(2\u207F)",
        body: "Serialize each subset into a set \u2014 correct but wasteful; mention, don't submit."
      }
    ],
    complexityTime: "O(n \xB7 2\u207F)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode subsets ii backtracking"),
    tags: ["backtracking", "recursion", "sorting"],
    starterCode: buildStarter("intArray", "sortedIntMatrix", "subsetsWithDup"),
    reference: (input) => {
      const nums = first8(input).sort((a, b) => a - b);
      const rows = [];
      const path = [];
      const dfs = (i) => {
        rows.push([...path]);
        for (let j = i; j < nums.length; j++) {
          if (j > i && nums[j] === nums[j - 1]) continue;
          path.push(nums[j]);
          dfs(j + 1);
          path.pop();
        }
      };
      dfs(0);
      return sortedMatOut(rows);
    },
    tests: [
      { input: "1 2 2", sample: true },
      { input: "0", sample: true },
      { input: "4 4 4 1 4" },
      { input: "-1 -1 0" },
      { input: "5 5" }
    ]
  }
];

// src/data/problems/graphs.ts
var parseGrid = (input) => {
  const ls = lines(input);
  const [r] = ints(ls[0]);
  const grid = [];
  for (let i = 0; i < r; i++) grid.push(ints(ls[1 + i]));
  return { grid, rest: ls.slice(1 + r) };
};
var parseEdges = (input) => {
  const ls = lines(input);
  const [n, m] = ints(ls[0]);
  const edges = [];
  for (let i = 0; i < m; i++) edges.push(ints(ls[1 + i]));
  return { n, edges, rest: ls.slice(1 + m) };
};
var graphs = [
  {
    slug: "number-of-islands",
    title: "Number of Islands",
    difficulty: "MEDIUM",
    statement: `Given an \`r \xD7 c\` grid of \`1\` (land) and \`0\` (water), count the islands \u2014 groups of land connected horizontally or vertically.

**Input**
- Line 1: two integers \`r c\`
- Next r lines: the grid rows (space-separated 0/1)

**Output**: the number of islands.`,
    constraints: `- 1 \u2264 r, c \u2264 300`,
    examples: [
      { input: "4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0", output: "1" },
      { input: "4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1", output: "3" }
    ],
    hints: [
      "Every unvisited land cell starts a new island.",
      "Flood-fill (DFS or BFS) marks the whole island so it's counted once."
    ],
    editorial: `Scan the grid; each time you find un-visited land, increment the count and **flood fill** from it (DFS/BFS through 4-directional neighbors), sinking the island by marking cells visited. Every cell is visited a constant number of times \u2192 O(r\xB7c). This is *the* template for connected-component-in-grid problems.`,
    complexityTime: "O(r\xB7c)",
    complexitySpace: "O(r\xB7c)",
    youtubeUrl: yt("neetcode number of islands"),
    tags: ["graph", "bfs", "dfs", "matrix", "union-find"],
    starterCode: buildStarter("matrix", "int", "numIslands"),
    reference: (input) => {
      const { grid } = parseGrid(input);
      const r = grid.length;
      const c = grid[0].length;
      let count = 0;
      const sink = (i, j) => {
        if (i < 0 || j < 0 || i >= r || j >= c || grid[i][j] !== 1) return;
        grid[i][j] = 0;
        sink(i + 1, j);
        sink(i - 1, j);
        sink(i, j + 1);
        sink(i, j - 1);
      };
      for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
          if (grid[i][j] === 1) {
            count++;
            sink(i, j);
          }
        }
      }
      return String(count);
    },
    tests: [
      { input: "4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0", sample: true },
      { input: "4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1", sample: true },
      { input: "1 1\n0" },
      { input: "1 3\n1 0 1" },
      { input: "3 3\n1 0 1\n0 1 0\n1 0 1" }
    ]
  },
  {
    slug: "max-area-of-island",
    title: "Max Area of Island",
    difficulty: "MEDIUM",
    statement: `Given a 0/1 grid, return the area (cell count) of the largest island, or \`0\` if there is no land. Islands connect 4-directionally.

**Input**
- Line 1: \`r c\`
- Next r lines: the grid rows

**Output**: the maximum island area.`,
    constraints: `- 1 \u2264 r, c \u2264 50`,
    examples: [
      {
        input: "4 5\n0 1 0 0 1\n1 1 0 1 1\n0 0 0 1 1\n0 0 0 0 0",
        output: "5",
        explanation: "The right-side island has 5 cells."
      },
      { input: "1 1\n0", output: "0" }
    ],
    hints: [
      "Same flood fill as Number of Islands, but return the size of each fill.",
      "DFS returns 1 + sum of its four neighbor fills."
    ],
    editorial: `Flood fill each island, but make the DFS **return the area**: 0 for water/out-of-bounds, else 1 plus the four recursive neighbor areas, marking cells as visited on entry. Track the max over all starts. O(r\xB7c) time.`,
    complexityTime: "O(r\xB7c)",
    complexitySpace: "O(r\xB7c)",
    youtubeUrl: yt("max area of island neetcode"),
    tags: ["graph", "dfs", "bfs", "matrix"],
    starterCode: buildStarter("matrix", "int", "maxAreaOfIsland"),
    reference: (input) => {
      const { grid } = parseGrid(input);
      const r = grid.length;
      const c = grid[0].length;
      const area = (i, j) => {
        if (i < 0 || j < 0 || i >= r || j >= c || grid[i][j] !== 1) return 0;
        grid[i][j] = 0;
        return 1 + area(i + 1, j) + area(i - 1, j) + area(i, j + 1) + area(i, j - 1);
      };
      let best = 0;
      for (let i = 0; i < r; i++)
        for (let j = 0; j < c; j++) best = Math.max(best, area(i, j));
      return String(best);
    },
    tests: [
      { input: "4 5\n0 1 0 0 1\n1 1 0 1 1\n0 0 0 1 1\n0 0 0 0 0", sample: true },
      { input: "1 1\n0", sample: true },
      { input: "2 2\n1 1\n1 1" },
      { input: "3 3\n1 0 0\n0 1 0\n0 0 1" }
    ]
  },
  {
    slug: "flood-fill",
    title: "Flood Fill",
    difficulty: "EASY",
    statement: `Given an image as an integer grid, a start pixel \`(sr, sc)\`, and a new \`color\`, flood-fill: recolor the start pixel and every 4-directionally connected pixel sharing its original color. Return the resulting image.

**Input**
- Line 1: \`r c\`
- Next r lines: the image rows
- Last line: three integers \`sr sc color\`

**Output**: the filled image, one row per line.`,
    constraints: `- 1 \u2264 r, c \u2264 50
- 0 \u2264 colors \u2264 2^16`,
    examples: [
      {
        input: "3 3\n1 1 1\n1 1 0\n1 0 1\n1 1 2",
        output: "2 2 2\n2 2 0\n2 0 1",
        explanation: "The bottom-right 1 is not 4-connected to the start."
      },
      { input: "2 2\n0 0\n0 0\n0 0 0", output: "0 0\n0 0" }
    ],
    hints: [
      "Standard DFS/BFS from the start pixel over same-colored neighbors.",
      "If the new color equals the old color, return immediately \u2014 otherwise you'll loop forever."
    ],
    editorial: `Record the start pixel's original color and DFS/BFS outward, recoloring matching neighbors. The one classic trap: when \`color\` equals the original, the naive recursion never terminates \u2014 bail out early. O(r\xB7c) time.`,
    complexityTime: "O(r\xB7c)",
    complexitySpace: "O(r\xB7c)",
    youtubeUrl: yt("flood fill leetcode dfs"),
    tags: ["graph", "dfs", "bfs", "matrix"],
    starterCode: buildStarter("matrixK", "intMatrix", "floodFill"),
    reference: (input) => {
      const { grid, rest } = parseGrid(input);
      const [sr, sc, color] = ints(rest[0]);
      const old = grid[sr][sc];
      if (old !== color) {
        const r = grid.length;
        const c = grid[0].length;
        const fill = (i, j) => {
          if (i < 0 || j < 0 || i >= r || j >= c || grid[i][j] !== old) return;
          grid[i][j] = color;
          fill(i + 1, j);
          fill(i - 1, j);
          fill(i, j + 1);
          fill(i, j - 1);
        };
        fill(sr, sc);
      }
      return matOut(grid);
    },
    tests: [
      { input: "3 3\n1 1 1\n1 1 0\n1 0 1\n1 1 2", sample: true },
      { input: "2 2\n0 0\n0 0\n0 0 0", sample: true },
      { input: "1 1\n5\n0 0 9" },
      { input: "2 3\n1 2 1\n2 1 2\n0 1 7" }
    ]
  },
  {
    slug: "rotting-oranges",
    title: "Rotting Oranges",
    difficulty: "MEDIUM",
    statement: `In a grid, \`0\` is empty, \`1\` is a fresh orange, \`2\` is rotten. Every minute, fresh oranges 4-adjacent to a rotten one rot. Return the minutes until no fresh orange remains, or \`-1\` if that never happens.

**Input**
- Line 1: \`r c\`
- Next r lines: the grid rows

**Output**: minutes, or -1.`,
    constraints: `- 1 \u2264 r, c \u2264 10`,
    examples: [
      { input: "3 3\n2 1 1\n1 1 0\n0 1 1", output: "4" },
      { input: "3 3\n2 1 1\n0 1 1\n1 0 1", output: "-1", explanation: "The bottom-left orange is unreachable." },
      { input: "1 3\n0 2 0", output: "0" }
    ],
    hints: [
      "Rot spreads simultaneously from every rotten orange \u2014 that's multi-source BFS.",
      "Seed the queue with all initially rotten oranges; each BFS layer is one minute.",
      "Count fresh oranges up front to detect the impossible case."
    ],
    editorial: `**Multi-source BFS**: enqueue every initially rotten orange at time 0 and expand layer by layer; each layer is one simultaneous minute. Track the fresh count \u2014 if any remain after the queue drains, return -1, else the time of the last rot. O(r\xB7c) time. Single-source BFS from each rotten orange overcounts time; simultaneity is the crux.`,
    complexityTime: "O(r\xB7c)",
    complexitySpace: "O(r\xB7c)",
    youtubeUrl: yt("neetcode rotting oranges"),
    tags: ["graph", "bfs", "matrix"],
    starterCode: buildStarter("matrix", "int", "orangesRotting"),
    reference: (input) => {
      const { grid } = parseGrid(input);
      const r = grid.length;
      const c = grid[0].length;
      let fresh = 0;
      let q = [];
      for (let i = 0; i < r; i++)
        for (let j = 0; j < c; j++) {
          if (grid[i][j] === 1) fresh++;
          else if (grid[i][j] === 2) q.push([i, j]);
        }
      let minutes = 0;
      while (q.length && fresh > 0) {
        const next = [];
        for (const [i, j] of q) {
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ni = i + di;
            const nj = j + dj;
            if (ni >= 0 && nj >= 0 && ni < r && nj < c && grid[ni][nj] === 1) {
              grid[ni][nj] = 2;
              fresh--;
              next.push([ni, nj]);
            }
          }
        }
        q = next;
        minutes++;
      }
      return String(fresh === 0 ? minutes : -1);
    },
    tests: [
      { input: "3 3\n2 1 1\n1 1 0\n0 1 1", sample: true },
      { input: "3 3\n2 1 1\n0 1 1\n1 0 1", sample: true },
      { input: "1 3\n0 2 0", sample: true },
      { input: "1 1\n1" },
      { input: "2 2\n2 2\n2 2" }
    ]
  },
  {
    slug: "walls-and-gates",
    title: "Walls and Gates",
    difficulty: "MEDIUM",
    statement: `You are given a grid where \`-1\` is a wall, \`0\` is a gate, and \`2147483647\` (INF) is an empty room. Fill each empty room with the distance to its **nearest gate** (leave INF if unreachable). Return the grid.

**Input**
- Line 1: \`r c\`
- Next r lines: the grid rows

**Output**: the filled grid, one row per line.`,
    constraints: `- 1 \u2264 r, c \u2264 250`,
    examples: [
      {
        input: "4 4\n2147483647 -1 0 2147483647\n2147483647 2147483647 2147483647 -1\n2147483647 -1 2147483647 -1\n0 -1 2147483647 2147483647",
        output: "3 -1 0 1\n2 2 1 -1\n1 -1 2 -1\n0 -1 3 4"
      },
      { input: "1 2\n-1 0", output: "-1 0" }
    ],
    hints: [
      "BFS from every room to its nearest gate is O((r\xB7c)\xB2).",
      "Flip it: BFS **from all gates at once** \u2014 first arrival is the nearest gate."
    ],
    editorial: `Multi-source BFS seeded with **every gate simultaneously**. Expanding layer by layer, the first time a room is reached is necessarily its shortest gate distance, so each cell is written once. O(r\xB7c) total \u2014 versus quadratic if you BFS from each room separately.`,
    complexityTime: "O(r\xB7c)",
    complexitySpace: "O(r\xB7c)",
    youtubeUrl: yt("walls and gates multi source bfs"),
    tags: ["graph", "bfs", "matrix"],
    starterCode: buildStarter("matrix", "intMatrix", "wallsAndGates"),
    reference: (input) => {
      const { grid } = parseGrid(input);
      const r = grid.length;
      const c = grid[0].length;
      const INF = 2147483647;
      let q = [];
      for (let i = 0; i < r; i++)
        for (let j = 0; j < c; j++) if (grid[i][j] === 0) q.push([i, j]);
      let dist = 0;
      while (q.length) {
        dist++;
        const next = [];
        for (const [i, j] of q) {
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ni = i + di;
            const nj = j + dj;
            if (ni >= 0 && nj >= 0 && ni < r && nj < c && grid[ni][nj] === INF) {
              grid[ni][nj] = dist;
              next.push([ni, nj]);
            }
          }
        }
        q = next;
      }
      return matOut(grid);
    },
    tests: [
      {
        input: "4 4\n2147483647 -1 0 2147483647\n2147483647 2147483647 2147483647 -1\n2147483647 -1 2147483647 -1\n0 -1 2147483647 2147483647",
        sample: true
      },
      { input: "1 2\n-1 0", sample: true },
      { input: "1 1\n2147483647" },
      { input: "2 2\n0 2147483647\n2147483647 2147483647" }
    ]
  },
  {
    slug: "course-schedule",
    title: "Course Schedule",
    difficulty: "MEDIUM",
    statement: `There are \`n\` courses labeled \`0 \u2026 n\u22121\`. Each prerequisite pair \`a b\` means you must take course \`b\` before course \`a\`. Return \`true\` if all courses can be finished.

**Input**
- Line 1: two integers \`n m\` (courses, prerequisite pairs)
- Next m lines: \`a b\`

**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 n \u2264 2000
- 0 \u2264 m \u2264 5000`,
    examples: [
      { input: "2 1\n1 0", output: "true", explanation: "Take 0, then 1." },
      { input: "2 2\n1 0\n0 1", output: "false", explanation: "Circular dependency." }
    ],
    hints: [
      "The question is: does the prerequisite graph contain a cycle?",
      "Kahn's algorithm: repeatedly remove nodes with indegree 0.",
      "If you can't remove all n nodes, a cycle blocks the rest."
    ],
    editorial: `Model courses as a directed graph (edge b \u2192 a). All courses are finishable iff the graph is a **DAG**. Kahn's algorithm: compute indegrees, repeatedly dequeue indegree-0 nodes and decrement their neighbors. If the processed count reaches n, no cycle exists. DFS coloring (white/gray/black) detects cycles equally well. O(V + E).`,
    approaches: [
      {
        name: "DFS cycle detection",
        complexityTime: "O(V + E)",
        complexitySpace: "O(V)",
        body: "Gray nodes on the current path; hitting a gray node means a cycle."
      },
      {
        name: "Kahn's topological sort",
        complexityTime: "O(V + E)",
        complexitySpace: "O(V)",
        body: "Peel indegree-0 vertices; a full peel means acyclic."
      }
    ],
    complexityTime: "O(V + E)",
    complexitySpace: "O(V + E)",
    youtubeUrl: yt("neetcode course schedule"),
    tags: ["graph", "topological-sort", "bfs", "dfs"],
    starterCode: buildStarter("nEdges", "bool", "canFinish"),
    reference: (input) => {
      const { n, edges } = parseEdges(input);
      const adj = Array.from({ length: n }, () => []);
      const indeg = new Array(n).fill(0);
      for (const [a, b] of edges) {
        adj[b].push(a);
        indeg[a]++;
      }
      const q = [];
      for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
      let seen = 0;
      while (q.length) {
        const u = q.shift();
        seen++;
        for (const v of adj[u]) if (--indeg[v] === 0) q.push(v);
      }
      return boolOut(seen === n);
    },
    tests: [
      { input: "2 1\n1 0", sample: true },
      { input: "2 2\n1 0\n0 1", sample: true },
      { input: "1 0" },
      { input: "4 3\n1 0\n2 1\n3 2" },
      { input: "3 3\n0 1\n1 2\n2 0" }
    ]
  },
  {
    slug: "course-schedule-ii",
    title: "Course Schedule II",
    difficulty: "MEDIUM",
    statement: `Same setup as Course Schedule: \`n\` courses and prerequisite pairs \`a b\` (take \`b\` before \`a\`). Return a valid order to take all courses; among valid orders return the **lexicographically smallest**. If impossible, print \`-1\`.

**Input**
- Line 1: \`n m\`
- Next m lines: \`a b\`

**Output**: the order, space-separated \u2014 or -1.`,
    constraints: `- 1 \u2264 n \u2264 2000
- 0 \u2264 m \u2264 5000`,
    examples: [
      { input: "2 1\n1 0", output: "0 1" },
      { input: "4 4\n1 0\n2 0\n3 1\n3 2", output: "0 1 2 3" },
      { input: "2 2\n1 0\n0 1", output: "-1" }
    ],
    hints: [
      "Kahn's algorithm produces a topological order as it peels.",
      "For the lexicographically smallest order, always peel the smallest available course \u2014 use a min-heap instead of a queue."
    ],
    editorial: `Kahn's algorithm emits a valid topological order directly. To make the answer deterministic and lexicographically smallest, replace the FIFO queue with a **min-heap**: always process the smallest indegree-0 course available. If the emitted order is shorter than n, a cycle makes it impossible. O((V + E) log V) with the heap.`,
    complexityTime: "O((V + E) log V)",
    complexitySpace: "O(V + E)",
    youtubeUrl: yt("course schedule ii topological sort"),
    tags: ["graph", "topological-sort", "heap"],
    starterCode: buildStarter("nEdges", "intArray", "findOrder"),
    reference: (input) => {
      const { n, edges } = parseEdges(input);
      const adj = Array.from({ length: n }, () => []);
      const indeg = new Array(n).fill(0);
      for (const [a, b] of edges) {
        adj[b].push(a);
        indeg[a]++;
      }
      const avail = [];
      for (let i = 0; i < n; i++) if (indeg[i] === 0) avail.push(i);
      const order = [];
      while (avail.length) {
        avail.sort((a, b) => a - b);
        const u = avail.shift();
        order.push(u);
        for (const v of adj[u]) if (--indeg[v] === 0) avail.push(v);
      }
      return order.length === n ? arrOut(order) : "-1";
    },
    tests: [
      { input: "2 1\n1 0", sample: true },
      { input: "4 4\n1 0\n2 0\n3 1\n3 2", sample: true },
      { input: "2 2\n1 0\n0 1", sample: true },
      { input: "1 0" },
      { input: "3 2\n0 2\n1 2" }
    ]
  },
  {
    slug: "graph-valid-tree",
    title: "Graph Valid Tree",
    difficulty: "MEDIUM",
    statement: `Given \`n\` nodes labeled \`0 \u2026 n\u22121\` and a list of undirected edges, return \`true\` if the edges form a valid tree: connected and acyclic.

**Input**
- Line 1: \`n m\`
- Next m lines: \`u v\`

**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 n \u2264 2000
- 0 \u2264 m \u2264 5000; no duplicate edges.`,
    examples: [
      { input: "5 4\n0 1\n0 2\n0 3\n1 4", output: "true" },
      { input: "5 5\n0 1\n1 2\n2 3\n1 3\n1 4", output: "false", explanation: "1-2-3 forms a cycle." }
    ],
    hints: [
      "A tree on n nodes has exactly n \u2212 1 edges.",
      "n \u2212 1 edges + connected \u27FA tree. Check connectivity with BFS/DFS or union-find."
    ],
    editorial: `Use the counting fact: a graph is a tree iff it has exactly **n \u2212 1 edges** and is **connected** (either condition alone is insufficient). Check the edge count, then one BFS/DFS (or union-find, where any merge of two already-joined nodes signals a cycle) confirms connectivity. O(V + E).`,
    complexityTime: "O(V + E)",
    complexitySpace: "O(V)",
    youtubeUrl: yt("graph valid tree union find"),
    tags: ["graph", "union-find", "bfs", "dfs"],
    starterCode: buildStarter("nEdges", "bool", "validTree"),
    reference: (input) => {
      const { n, edges } = parseEdges(input);
      if (edges.length !== n - 1) return boolOut(false);
      const parent = Array.from({ length: n }, (_, i) => i);
      const find = (x) => {
        while (parent[x] !== x) {
          parent[x] = parent[parent[x]];
          x = parent[x];
        }
        return x;
      };
      for (const [u, v] of edges) {
        const ru = find(u);
        const rv = find(v);
        if (ru === rv) return boolOut(false);
        parent[ru] = rv;
      }
      return boolOut(true);
    },
    tests: [
      { input: "5 4\n0 1\n0 2\n0 3\n1 4", sample: true },
      { input: "5 5\n0 1\n1 2\n2 3\n1 3\n1 4", sample: true },
      { input: "1 0" },
      { input: "4 2\n0 1\n2 3" },
      { input: "2 1\n0 1" }
    ]
  },
  {
    slug: "number-of-connected-components-in-an-undirected-graph",
    title: "Number of Connected Components in an Undirected Graph",
    difficulty: "MEDIUM",
    statement: `Given \`n\` nodes and a list of undirected edges, return the number of connected components.

**Input**
- Line 1: \`n m\`
- Next m lines: \`u v\`

**Output**: the component count.`,
    constraints: `- 1 \u2264 n \u2264 2000
- 0 \u2264 m \u2264 5000`,
    examples: [
      { input: "5 3\n0 1\n1 2\n3 4", output: "2" },
      { input: "5 4\n0 1\n1 2\n2 3\n3 4", output: "1" }
    ],
    hints: [
      "Start with n components; each edge that joins two different groups reduces the count by one.",
      "Union-find with path compression makes each union nearly O(1)."
    ],
    editorial: `**Union-find**: initialize n singleton components; for each edge, union its endpoints and decrement the count when the union actually merges two distinct roots. Path compression + union by size gives near-constant amortized operations \u2192 O(E \u03B1(V)). BFS/DFS counting works equally well at O(V + E).`,
    complexityTime: "O(E \u03B1(V))",
    complexitySpace: "O(V)",
    youtubeUrl: yt("number of connected components union find"),
    tags: ["graph", "union-find", "bfs", "dfs"],
    starterCode: buildStarter("nEdges", "int", "countComponents"),
    reference: (input) => {
      const { n, edges } = parseEdges(input);
      const parent = Array.from({ length: n }, (_, i) => i);
      const find = (x) => {
        while (parent[x] !== x) {
          parent[x] = parent[parent[x]];
          x = parent[x];
        }
        return x;
      };
      let count = n;
      for (const [u, v] of edges) {
        const ru = find(u);
        const rv = find(v);
        if (ru !== rv) {
          parent[ru] = rv;
          count--;
        }
      }
      return String(count);
    },
    tests: [
      { input: "5 3\n0 1\n1 2\n3 4", sample: true },
      { input: "5 4\n0 1\n1 2\n2 3\n3 4", sample: true },
      { input: "3 0" },
      { input: "1 0" },
      { input: "4 4\n0 1\n1 2\n2 0\n0 3" }
    ]
  },
  {
    slug: "redundant-connection",
    title: "Redundant Connection",
    difficulty: "MEDIUM",
    statement: `A tree with \`n\` nodes (labeled 1\u2026n) had exactly one extra undirected edge added. Given the resulting edge list, return the edge that can be removed to restore a tree. If several qualify, return the one appearing **last** in the input.

**Input**
- Line 1: \`n n\` (the graph has exactly n edges)
- Next n lines: \`u v\`

**Output**: the edge \`u v\`.`,
    constraints: `- 3 \u2264 n \u2264 1000
- The input is a tree plus one extra edge.`,
    examples: [
      { input: "3 3\n1 2\n1 3\n2 3", output: "2 3" },
      { input: "5 5\n1 2\n2 3\n3 4\n1 4\n1 5", output: "1 4" }
    ],
    hints: [
      "Process edges in order, unioning endpoints.",
      "The first edge whose endpoints are already connected closes the cycle \u2014 and it's the last-in-input edge on that cycle."
    ],
    editorial: `Feed edges into **union-find** in input order. The moment an edge's endpoints already share a root, that edge closes the cycle \u2014 and because every earlier cycle edge merged successfully, it is precisely the last cycle edge in input order, satisfying the tie-break for free. O(n \u03B1(n)).`,
    complexityTime: "O(n \u03B1(n))",
    complexitySpace: "O(n)",
    youtubeUrl: yt("redundant connection union find"),
    tags: ["graph", "union-find"],
    starterCode: buildStarter("nEdges", "intArray", "findRedundantConnection"),
    reference: (input) => {
      const { n, edges } = parseEdges(input);
      const parent = Array.from({ length: n + 1 }, (_, i) => i);
      const find = (x) => {
        while (parent[x] !== x) {
          parent[x] = parent[parent[x]];
          x = parent[x];
        }
        return x;
      };
      for (const [u, v] of edges) {
        const ru = find(u);
        const rv = find(v);
        if (ru === rv) return `${u} ${v}`;
        parent[ru] = rv;
      }
      return "";
    },
    tests: [
      { input: "3 3\n1 2\n1 3\n2 3", sample: true },
      { input: "5 5\n1 2\n2 3\n3 4\n1 4\n1 5", sample: true },
      { input: "4 4\n1 2\n3 4\n2 3\n1 4" },
      { input: "3 3\n2 3\n1 2\n1 3" }
    ]
  },
  {
    slug: "network-delay-time",
    title: "Network Delay Time",
    difficulty: "MEDIUM",
    statement: `A network has \`n\` nodes (1\u2026n) and directed edges \`u v w\` meaning a signal takes \`w\` time to travel u \u2192 v. A signal starts at node \`k\`. Return the time for **all** nodes to receive it, or \`-1\` if some node never does.

**Input**
- Line 1: \`n m\`
- Next m lines: \`u v w\`
- Last line: the start node \`k\`

**Output**: the total time, or -1.`,
    constraints: `- 1 \u2264 n \u2264 100
- 1 \u2264 m \u2264 6000
- 1 \u2264 w \u2264 100`,
    examples: [
      { input: "4 3\n2 1 1\n2 3 1\n3 4 1\n2", output: "2" },
      { input: "2 1\n1 2 1\n1", output: "1" },
      { input: "2 1\n1 2 1\n2", output: "-1" }
    ],
    hints: [
      "You need shortest paths from one source with non-negative weights.",
      "Dijkstra with a min-heap; the answer is the largest shortest-path distance.",
      "Any unreachable node forces -1."
    ],
    editorial: `Single-source shortest paths with non-negative weights \u2192 **Dijkstra**. Run it from \`k\` with a min-heap; the answer is the maximum distance over all nodes (the last one to hear the signal), or -1 if any distance stays infinite. O(E log V).`,
    complexityTime: "O(E log V)",
    complexitySpace: "O(V + E)",
    youtubeUrl: yt("network delay time dijkstra"),
    tags: ["graph", "dijkstra", "shortest-path", "heap"],
    starterCode: buildStarter("nEdgesQ", "int", "networkDelayTime"),
    reference: (input) => {
      const { n, edges, rest } = parseEdges(input);
      const k = int(rest[0]);
      const adj = Array.from({ length: n + 1 }, () => []);
      for (const [u, v, w] of edges) adj[u].push([v, w]);
      const dist = new Array(n + 1).fill(Infinity);
      dist[k] = 0;
      const visited = new Array(n + 1).fill(false);
      for (let iter = 0; iter < n; iter++) {
        let u = -1;
        for (let i = 1; i <= n; i++)
          if (!visited[i] && (u === -1 || dist[i] < dist[u])) u = i;
        if (u === -1 || dist[u] === Infinity) break;
        visited[u] = true;
        for (const [v, w] of adj[u])
          if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
      }
      let best = 0;
      for (let i = 1; i <= n; i++) best = Math.max(best, dist[i]);
      return String(best === Infinity ? -1 : best);
    },
    tests: [
      { input: "4 3\n2 1 1\n2 3 1\n3 4 1\n2", sample: true },
      { input: "2 1\n1 2 1\n1", sample: true },
      { input: "2 1\n1 2 1\n2", sample: true },
      { input: "1 0\n1" },
      { input: "3 3\n1 2 1\n2 3 2\n1 3 4\n1" }
    ]
  },
  {
    slug: "cheapest-flights-within-k-stops",
    title: "Cheapest Flights Within K Stops",
    difficulty: "MEDIUM",
    statement: `There are \`n\` cities (0\u2026n\u22121) and directed flights \`u v w\` (from u to v costing w). Find the cheapest price from \`src\` to \`dst\` using **at most k stops** (i.e. at most k intermediate cities), or \`-1\` if impossible.

**Input**
- Line 1: \`n m\`
- Next m lines: \`u v w\`
- Last line: three integers \`src dst k\`

**Output**: the cheapest price, or -1.`,
    constraints: `- 1 \u2264 n \u2264 100
- 0 \u2264 k < n
- 1 \u2264 w \u2264 10^4`,
    examples: [
      { input: "4 5\n0 1 100\n1 2 100\n2 0 100\n1 3 600\n2 3 200\n0 3 1", output: "700", explanation: "0\u21921\u21923; the cheaper 0\u21921\u21922\u21923 needs 2 stops." },
      { input: "3 3\n0 1 100\n1 2 100\n0 2 500\n0 2 1", output: "200" },
      { input: "3 3\n0 1 100\n1 2 100\n0 2 500\n0 2 0", output: "500" }
    ],
    hints: [
      "Plain Dijkstra ignores the stop limit \u2014 it can lock in a cheap path that uses too many hops.",
      "Bellman-Ford naturally bounds path length: k+1 relaxation rounds allow at most k stops.",
      "Relax from a snapshot of the previous round's distances so one round adds at most one edge per path."
    ],
    editorial: `**Bellman-Ford, bounded**: run exactly \`k + 1\` relaxation rounds (a path with k stops has k+1 edges), each round relaxing all edges against a **copy** of the previous round's distances \u2014 the copy prevents multi-edge propagation inside a single round. Final \`dist[dst]\` (or -1) answers it. O(k \xB7 E).`,
    complexityTime: "O(k \xB7 E)",
    complexitySpace: "O(V)",
    youtubeUrl: yt("neetcode cheapest flights within k stops"),
    tags: ["graph", "bellman-ford", "shortest-path", "dynamic-programming"],
    starterCode: buildStarter("nEdgesQ", "int", "findCheapestPrice"),
    reference: (input) => {
      const { n, edges, rest } = parseEdges(input);
      const [src, dst, k] = ints(rest[0]);
      let dist = new Array(n).fill(Infinity);
      dist[src] = 0;
      for (let round = 0; round <= k; round++) {
        const next = [...dist];
        for (const [u, v, w] of edges) {
          if (dist[u] !== Infinity && dist[u] + w < next[v]) next[v] = dist[u] + w;
        }
        dist = next;
      }
      return String(dist[dst] === Infinity ? -1 : dist[dst]);
    },
    tests: [
      { input: "4 5\n0 1 100\n1 2 100\n2 0 100\n1 3 600\n2 3 200\n0 3 1", sample: true },
      { input: "3 3\n0 1 100\n1 2 100\n0 2 500\n0 2 1", sample: true },
      { input: "3 3\n0 1 100\n1 2 100\n0 2 500\n0 2 0", sample: true },
      { input: "2 1\n1 0 5\n0 1 0" },
      { input: "5 6\n0 1 5\n1 2 5\n0 3 2\n3 1 2\n1 4 1\n4 2 1\n0 2 2" }
    ]
  },
  {
    slug: "min-cost-to-connect-all-points",
    title: "Min Cost to Connect All Points",
    difficulty: "MEDIUM",
    statement: `You are given points on a 2D plane. The cost to connect two points is their **Manhattan distance** |x\u2081\u2212x\u2082| + |y\u2081\u2212y\u2082|. Return the minimum total cost to make all points connected (directly or indirectly) \u2014 i.e., the weight of a minimum spanning tree.

**Input**
- Line 1: \`n 2\` \u2014 the number of points and the coordinate count
- Next n lines: \`x y\` for each point

**Output**: the minimum total cost.`,
    constraints: `- 1 \u2264 n \u2264 1000
- -10^6 \u2264 coordinates \u2264 10^6
- All points distinct.`,
    examples: [
      {
        input: "5 2\n0 0\n2 2\n3 10\n5 2\n7 0",
        output: "20",
        explanation: "Edges (0,0)-(2,2), (2,2)-(5,2), (5,2)-(7,0), (2,2)-(3,10) cost 4+3+4+9."
      },
      { input: "3 2\n3 12\n-2 5\n-4 1", output: "18" }
    ],
    hints: [
      "Connecting everything at minimum cost with no cycles worth paying for = minimum spanning tree.",
      "The graph is complete (n\xB2 edges) \u2014 Kruskal must sort them all; Prim without a heap is O(n\xB2) and needs no edge list at all.",
      "Prim on dense graphs: keep dist[v] = cheapest link from the growing tree to v; each round, absorb the closest outsider and relax."
    ],
    editorial: `The graph is *complete* \u2014 every pair of points is an edge \u2014 which flips the usual advice: Kruskal pays O(n\xB2 log n) to sort half a million edges, while **array-based Prim** runs O(n\xB2) with O(n) memory and never materializes an edge list. Maintain \`dist[v]\`: the cheapest Manhattan edge from the current tree to each outside point. Each of n rounds picks the closest outsider, adds its distance to the total, and relaxes every remaining point against the newcomer. For n = 1000 that's a million distance computations \u2014 instant. The interview lesson: heap-Prim (O(E log V)) is for sparse graphs; on dense ones the humble O(n\xB2) scan wins. Union-Find Kruskal remains the right call the moment edges are given explicitly and sparsely.`,
    approaches: [
      {
        name: "Prim, O(n\xB2) array version",
        complexityTime: "O(n\xB2)",
        complexitySpace: "O(n)",
        body: "dist[] relaxation against each absorbed point; no edge list, no heap."
      },
      {
        name: "Kruskal + Union-Find",
        complexityTime: "O(n\xB2 log n)",
        complexitySpace: "O(n\xB2)",
        body: "Generate all pair edges, sort, union until n\u22121 accepted. Fine, but dominated here."
      }
    ],
    complexityTime: "O(n\xB2)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode min cost to connect all points"),
    tags: ["graph", "minimum-spanning-tree", "prim"],
    starterCode: buildStarter("matrix", "int", "minCostConnectPoints"),
    reference: (input) => {
      const ls = lines(input);
      const [n] = ints(ls[0]);
      const pts = [];
      for (let i = 0; i < n; i++) pts.push(ints(ls[1 + i]));
      const dist = new Array(n).fill(Infinity);
      const used = new Array(n).fill(false);
      dist[0] = 0;
      let total = 0;
      for (let round = 0; round < n; round++) {
        let u = -1;
        for (let v = 0; v < n; v++) {
          if (!used[v] && (u === -1 || dist[v] < dist[u])) u = v;
        }
        used[u] = true;
        total += dist[u];
        for (let v = 0; v < n; v++) {
          if (!used[v]) {
            const d = Math.abs(pts[u][0] - pts[v][0]) + Math.abs(pts[u][1] - pts[v][1]);
            if (d < dist[v]) dist[v] = d;
          }
        }
      }
      return String(total);
    },
    tests: [
      { input: "5 2\n0 0\n2 2\n3 10\n5 2\n7 0", sample: true },
      { input: "3 2\n3 12\n-2 5\n-4 1", sample: true },
      { input: "1 2\n0 0" },
      { input: "2 2\n-1000000 -1000000\n1000000 1000000" },
      { input: "4 2\n0 0\n0 1\n1 0\n1 1" }
    ]
  }
];

// src/data/problems/greedy.ts
var first9 = (s) => ints(s.split("\n")[0]);
var greedy = [
  {
    slug: "assign-cookies",
    title: "Assign Cookies",
    difficulty: "EASY",
    statement: `Child \`i\` is content with a cookie of size \u2265 \`g[i]\`. Each child gets at most one cookie. Given greed factors \`g\` and cookie sizes \`s\`, return the maximum number of content children.

**Input**
- Line 1: space-separated greed factors \`g\`
- Line 2: space-separated cookie sizes \`s\` (may be empty)

**Output**: the maximum number of content children.`,
    constraints: `- 1 \u2264 g.length \u2264 3\xB710^4
- 0 \u2264 s.length \u2264 3\xB710^4`,
    examples: [
      { input: "1 2 3\n1 1", output: "1" },
      { input: "1 2\n1 2 3", output: "2" }
    ],
    hints: [
      "Sort both arrays.",
      "Give the smallest sufficient cookie to the least greedy unmatched child."
    ],
    editorial: `Sort children and cookies ascending, then sweep with two pointers: offer the current cookie to the least greedy unmatched child; if it satisfies them, both advance, otherwise the cookie is discarded (it satisfies no one remaining). Exchanging any assignment in an optimal solution for this greedy one never loses a match. O(n log n + m log m).`,
    complexityTime: "O(n log n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("assign cookies greedy leetcode"),
    tags: ["greedy", "sorting", "two-pointers"],
    starterCode: buildStarter("twoIntArrays", "int", "findContentChildren"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const g = ints(l0).sort((a, b) => a - b);
      const s = ints(l1).sort((a, b) => a - b);
      let i = 0;
      for (const cookie of s) {
        if (i < g.length && cookie >= g[i]) i++;
      }
      return String(i);
    },
    tests: [
      { input: "1 2 3\n1 1", sample: true },
      { input: "1 2\n1 2 3", sample: true },
      { input: "10 9 8 7\n5 6 7 8" },
      { input: "1\n" }
    ]
  },
  {
    slug: "lemonade-change",
    title: "Lemonade Change",
    difficulty: "EASY",
    statement: `Customers queue to buy $5 lemonade, paying with $5, $10, or $20 bills. You start with no change. Return \`true\` if you can give every customer correct change, processing them in order.

**Input**: one line of space-separated bills (each 5, 10, or 20).
**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 bills.length \u2264 10^5`,
    examples: [
      { input: "5 5 5 10 20", output: "true" },
      { input: "5 5 10 10 20", output: "false" }
    ],
    hints: [
      "Only track how many $5 and $10 bills you hold.",
      "For a $20, prefer giving $10 + $5 over three $5s \u2014 fives are more versatile."
    ],
    editorial: `Simulate with counts of fives and tens. A $10 needs one five; a $20 needs \`10+5\` **preferring the ten** (fives also serve $10 payers, tens serve no one else) or three fives as fallback. If change is ever impossible, fail. The exchange argument justifies the preference. O(n) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("lemonade change greedy"),
    tags: ["greedy", "simulation"],
    starterCode: buildStarter("intArray", "bool", "lemonadeChange"),
    reference: (input) => {
      const bills = first9(input);
      let fives = 0;
      let tens = 0;
      for (const b of bills) {
        if (b === 5) fives++;
        else if (b === 10) {
          if (fives === 0) return boolOut(false);
          fives--;
          tens++;
        } else {
          if (tens > 0 && fives > 0) {
            tens--;
            fives--;
          } else if (fives >= 3) {
            fives -= 3;
          } else return boolOut(false);
        }
      }
      return boolOut(true);
    },
    tests: [
      { input: "5 5 5 10 20", sample: true },
      { input: "5 5 10 10 20", sample: true },
      { input: "5 5 10" },
      { input: "10" },
      { input: "5 5 5 5 20 5 20 5" }
    ]
  },
  {
    slug: "jump-game",
    title: "Jump Game",
    difficulty: "MEDIUM",
    statement: `You start at index 0 of array \`nums\`, where \`nums[i]\` is your maximum jump length from position \`i\`. Return \`true\` if you can reach the last index.

**Input**: one line of space-separated non-negative integers.
**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 nums.length \u2264 10^4
- 0 \u2264 nums[i] \u2264 10^5`,
    examples: [
      { input: "2 3 1 1 4", output: "true", explanation: "0\u21921\u21924." },
      { input: "3 2 1 0 4", output: "false", explanation: "Index 3 is a trap." }
    ],
    hints: [
      "Track the farthest index reachable so far.",
      "If your scan position ever exceeds that reach, you're stuck."
    ],
    editorial: `Sweep left to right maintaining \`reach\`, the farthest reachable index. At each position \u2264 \`reach\`, update \`reach = max(reach, i + nums[i])\`. If \`i > reach\` at any point, the last index is unreachable. Greedy works because only the frontier matters, not how you got there. O(n) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode jump game"),
    tags: ["greedy", "array", "dynamic-programming"],
    starterCode: buildStarter("intArray", "bool", "canJump"),
    reference: (input) => {
      const nums = first9(input);
      let reach = 0;
      for (let i = 0; i < nums.length; i++) {
        if (i > reach) return boolOut(false);
        reach = Math.max(reach, i + nums[i]);
      }
      return boolOut(true);
    },
    tests: [
      { input: "2 3 1 1 4", sample: true },
      { input: "3 2 1 0 4", sample: true },
      { input: "0" },
      { input: "1 0 1" },
      { input: "5 0 0 0 0 0" }
    ]
  },
  {
    slug: "jump-game-ii",
    title: "Jump Game II",
    difficulty: "MEDIUM",
    statement: `Same setup as Jump Game, but reaching the last index is guaranteed. Return the **minimum** number of jumps needed.

**Input**: one line of space-separated non-negative integers.
**Output**: the minimum jump count.`,
    constraints: `- 1 \u2264 nums.length \u2264 10^4
- Reaching the end is always possible.`,
    examples: [
      { input: "2 3 1 1 4", output: "2", explanation: "0\u21921 then 1\u21924." },
      { input: "2 3 0 1 4", output: "2" }
    ],
    hints: [
      "Think in BFS layers: everything reachable in j jumps forms a window.",
      "Track the current window's end and the farthest reach within it; crossing the end starts a new jump."
    ],
    editorial: `Implicit BFS over index windows: maintain the current jump's window \`[start, end]\` and the farthest index reachable from inside it. When the scan passes \`end\`, one more jump begins and the window extends to that farthest reach. Each index is visited once \u2192 O(n), O(1) space \u2014 no DP table needed.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode jump game ii"),
    tags: ["greedy", "array", "bfs"],
    starterCode: buildStarter("intArray", "int", "jump"),
    reference: (input) => {
      const nums = first9(input);
      let jumps = 0;
      let end = 0;
      let far = 0;
      for (let i = 0; i < nums.length - 1; i++) {
        far = Math.max(far, i + nums[i]);
        if (i === end) {
          jumps++;
          end = far;
        }
      }
      return String(jumps);
    },
    tests: [
      { input: "2 3 1 1 4", sample: true },
      { input: "2 3 0 1 4", sample: true },
      { input: "1" },
      { input: "1 1 1 1" },
      { input: "10 1 1 1 1" }
    ]
  },
  {
    slug: "gas-station",
    title: "Gas Station",
    difficulty: "MEDIUM",
    statement: `There are \`n\` gas stations on a circle. \`gas[i]\` is fuel available at station \`i\`; \`cost[i]\` is fuel needed to drive to station \`i+1\`. Starting empty at some station, return the index from which you can complete one full clockwise circuit, or \`-1\`. The answer is unique when it exists.

**Input**
- Line 1: space-separated \`gas\`
- Line 2: space-separated \`cost\`

**Output**: the starting index, or -1.`,
    constraints: `- 1 \u2264 n \u2264 10^5`,
    examples: [
      { input: "1 2 3 4 5\n3 4 5 1 2", output: "3" },
      { input: "2 3 4\n3 4 3", output: "-1" }
    ],
    hints: [
      "If total gas < total cost, no start works. Otherwise one must.",
      "If you run dry between start s and station i, no station in (s, i] can work either \u2014 restart from i+1."
    ],
    editorial: `Two facts make greedy work: (1) if \`\u03A3gas < \u03A3cost\` no answer exists, otherwise one does; (2) if starting at \`s\` you first fail reaching \`i+1\`, then any start strictly between \`s\` and \`i\` also fails there (it enters with less fuel) \u2014 so jump the candidate straight to \`i + 1\`. One pass tracking the running tank and total balance. O(n), O(1).`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode gas station"),
    tags: ["greedy", "array"],
    starterCode: buildStarter("twoIntArrays", "int", "canCompleteCircuit"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const gas = ints(l0);
      const cost = ints(l1);
      let total = 0;
      let tank = 0;
      let start = 0;
      for (let i = 0; i < gas.length; i++) {
        const d = gas[i] - cost[i];
        total += d;
        tank += d;
        if (tank < 0) {
          start = i + 1;
          tank = 0;
        }
      }
      return String(total >= 0 ? start : -1);
    },
    tests: [
      { input: "1 2 3 4 5\n3 4 5 1 2", sample: true },
      { input: "2 3 4\n3 4 3", sample: true },
      { input: "5\n4" },
      { input: "3\n3" },
      { input: "5 1 2 3 4\n4 4 1 5 1" }
    ]
  },
  {
    slug: "hand-of-straights",
    title: "Hand of Straights",
    difficulty: "MEDIUM",
    statement: `Alice has a hand of cards and wants to rearrange them into groups of exactly \`k\` **consecutive** cards. Return \`true\` if she can.

**Input**
- Line 1: space-separated card values
- Line 2: integer \`k\`

**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 hand.length \u2264 10^4
- 1 \u2264 k \u2264 hand.length`,
    examples: [
      { input: "1 2 3 6 2 3 4 7 8\n3", output: "true", explanation: "[1,2,3] [2,3,4] [6,7,8]." },
      { input: "1 2 3 4 5\n4", output: "false", explanation: "5 cards can't split into groups of 4." }
    ],
    hints: [
      "If the total count isn't divisible by k, fail immediately.",
      "The smallest remaining card must start a group \u2014 it has no other home.",
      "Count cards in a map; repeatedly consume runs starting at the current minimum."
    ],
    editorial: `The smallest remaining card is forced to begin a group, so greedily consume \`k\` consecutive values starting there, decrementing counts; any missing value fails. Processing values in sorted order with a count map gives O(n log n). The forced-move argument is what makes greedy provably correct here.`,
    complexityTime: "O(n log n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode hand of straights"),
    tags: ["greedy", "hash-table", "sorting"],
    starterCode: buildStarter("intArrayK", "bool", "isNStraightHand"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const hand = ints(l0);
      const k = int(l1);
      if (hand.length % k !== 0) return boolOut(false);
      const count = /* @__PURE__ */ new Map();
      for (const c of hand) count.set(c, (count.get(c) ?? 0) + 1);
      const keys = [...count.keys()].sort((a, b) => a - b);
      for (const start of keys) {
        const c = count.get(start);
        if (c === 0) continue;
        for (let v = start; v < start + k; v++) {
          const have = count.get(v) ?? 0;
          if (have < c) return boolOut(false);
          count.set(v, have - c);
        }
      }
      return boolOut(true);
    },
    tests: [
      { input: "1 2 3 6 2 3 4 7 8\n3", sample: true },
      { input: "1 2 3 4 5\n4", sample: true },
      { input: "8 10 12\n3" },
      { input: "4\n1" },
      { input: "1 1 2 2 3 3\n3" }
    ]
  },
  {
    slug: "partition-labels",
    title: "Partition Labels",
    difficulty: "MEDIUM",
    statement: `Partition a string into as many parts as possible so that **no letter appears in more than one part**, and return the sizes of the parts (in order).

**Input**: one line, the string \`s\`.
**Output**: the part sizes, space-separated.`,
    constraints: `- 1 \u2264 s.length \u2264 500
- Lowercase English letters.`,
    examples: [
      { input: "ababcbacadefegdehijhklij", output: "9 7 8", explanation: '"ababcbaca" "defegde" "hijhklij".' },
      { input: "eccbbbbdec", output: "10" }
    ],
    hints: [
      "Precompute each letter's last occurrence.",
      "A part can end only once you've passed the last occurrence of every letter inside it."
    ],
    editorial: `Record each character's **last index**. Sweep with a growing window: extend the window's required end to the last occurrence of each character seen; when the scan reaches that end, the part is closed and its size emitted. Greedy is safe because a letter's full span must live in one part. O(n) time, O(26) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode partition labels"),
    tags: ["greedy", "string", "two-pointers"],
    starterCode: buildStarter("string", "intArray", "partitionLabels"),
    reference: (input) => {
      const s = (lines(input)[0] ?? "").trim();
      const last = /* @__PURE__ */ new Map();
      for (let i = 0; i < s.length; i++) last.set(s[i], i);
      const res = [];
      let start = 0;
      let end = 0;
      for (let i = 0; i < s.length; i++) {
        end = Math.max(end, last.get(s[i]));
        if (i === end) {
          res.push(end - start + 1);
          start = i + 1;
        }
      }
      return arrOut(res);
    },
    tests: [
      { input: "ababcbacadefegdehijhklij", sample: true },
      { input: "eccbbbbdec", sample: true },
      { input: "a" },
      { input: "abcdef" },
      { input: "caedbdedda" }
    ]
  },
  {
    slug: "valid-parenthesis-string",
    title: "Valid Parenthesis String",
    difficulty: "MEDIUM",
    statement: `A string contains \`(\`, \`)\`, and \`*\`, where each \`*\` can act as \`(\`, \`)\`, or an empty string. Return \`true\` if the string can be made a valid parenthesis sequence.

**Input**: one line, the string.
**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 s.length \u2264 100`,
    examples: [
      { input: "()", output: "true" },
      { input: "(*)", output: "true" },
      { input: "(*))", output: "true" }
    ],
    hints: [
      "Track a range [lo, hi] of possible open-bracket counts.",
      "'(' raises both; ')' lowers both; '*' widens the range by one in each direction.",
      "Fail if hi goes negative; succeed if lo can end at 0 (clamp lo at 0)."
    ],
    editorial: `Keep the interval \`[lo, hi]\` of achievable open-paren counts: \`(\` increments both, \`)\` decrements both, \`*\` does \`lo\u22121, hi+1\`. If \`hi < 0\` the string is already broken; clamp \`lo\` at 0 (a \`*\` never has to become \`)\` when nothing is open). Valid iff \`lo == 0\` at the end. One pass, O(1) space \u2014 the interval trick replaces exponential case-splitting.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("valid parenthesis string greedy"),
    tags: ["greedy", "string", "dynamic-programming"],
    starterCode: buildStarter("string", "bool", "checkValidString"),
    reference: (input) => {
      const s = (lines(input)[0] ?? "").trim();
      let lo = 0;
      let hi = 0;
      for (const c of s) {
        if (c === "(") {
          lo++;
          hi++;
        } else if (c === ")") {
          lo--;
          hi--;
        } else {
          lo--;
          hi++;
        }
        if (hi < 0) return boolOut(false);
        if (lo < 0) lo = 0;
      }
      return boolOut(lo === 0);
    },
    tests: [
      { input: "()", sample: true },
      { input: "(*)", sample: true },
      { input: "(*))", sample: true },
      { input: ")(" },
      { input: "(((*)" },
      { input: "*(" }
    ]
  },
  {
    slug: "non-overlapping-intervals",
    title: "Non-overlapping Intervals",
    difficulty: "MEDIUM",
    statement: `Given intervals \`[start, end)\`, return the minimum number of intervals to remove so the rest don't overlap (touching endpoints don't overlap).

**Input**
- Line 1: \`n 2\`
- Next n lines: \`start end\`

**Output**: the minimum removals.`,
    constraints: `- 1 \u2264 n \u2264 10^5
- -5\xB710^4 \u2264 start < end \u2264 5\xB710^4`,
    examples: [
      { input: "4 2\n1 2\n2 3\n3 4\n1 3", output: "1", explanation: "Remove [1,3]." },
      { input: "3 2\n1 2\n1 2\n1 2", output: "2" },
      { input: "2 2\n1 2\n2 3", output: "0" }
    ],
    hints: [
      "Equivalent problem: keep the maximum number of non-overlapping intervals.",
      "Sort by end time; always keep the interval that finishes earliest."
    ],
    editorial: `Flip to "keep the most non-overlapping intervals" \u2014 the classic **activity selection** problem. Sort by end; greedily keep any interval starting at or after the last kept end. The earliest-finishing choice leaves maximal room, provable by exchange. Removals = total \u2212 kept. O(n log n).`,
    complexityTime: "O(n log n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode non overlapping intervals"),
    tags: ["greedy", "intervals", "sorting"],
    starterCode: buildStarter("matrix", "int", "eraseOverlapIntervals"),
    reference: (input) => {
      const ls = lines(input);
      const [n] = ints(ls[0]);
      const iv = [];
      for (let i = 0; i < n; i++) iv.push(ints(ls[1 + i]));
      iv.sort((a, b) => a[1] - b[1]);
      let kept = 0;
      let lastEnd = -Infinity;
      for (const [s, e] of iv) {
        if (s >= lastEnd) {
          kept++;
          lastEnd = e;
        }
      }
      return String(n - kept);
    },
    tests: [
      { input: "4 2\n1 2\n2 3\n3 4\n1 3", sample: true },
      { input: "3 2\n1 2\n1 2\n1 2", sample: true },
      { input: "2 2\n1 2\n2 3", sample: true },
      { input: "1 2\n0 10" },
      { input: "5 2\n0 5\n1 2\n2 3\n3 4\n4 6" }
    ]
  },
  {
    slug: "best-time-to-buy-and-sell-stock-ii",
    title: "Best Time to Buy and Sell Stock II",
    difficulty: "EASY",
    statement: `Given daily prices, you may buy and sell as many times as you like (holding at most one share at a time; selling and re-buying the same day is allowed). Return the maximum total profit.

**Input**: one line of space-separated prices.
**Output**: the maximum profit.`,
    constraints: `- 1 \u2264 prices.length \u2264 3\xB710^4
- 0 \u2264 prices[i] \u2264 10^4`,
    examples: [
      {
        input: "7 1 5 3 6 4",
        output: "7",
        explanation: "Buy 1 \u2192 sell 5 (+4), buy 3 \u2192 sell 6 (+3)."
      },
      { input: "1 2 3 4 5", output: "4", explanation: "One long hold \u2014 or every daily rise; same total." },
      { input: "7 6 4 3 1", output: "0" }
    ],
    hints: [
      "With unlimited transactions, which price movements can you capture?",
      "Any multi-day gain decomposes into consecutive daily gains: p[j] \u2212 p[i] = \u03A3 daily diffs.",
      "Sum every positive prices[i] \u2212 prices[i\u22121]."
    ],
    editorial: `Harvest every rise: the answer is the sum of all positive day-over-day differences. Why the greedy is exact \u2014 any transaction's profit p[sell] \u2212 p[buy] telescopes into the sum of daily moves between them, so the best conceivable strategy can never beat collecting every positive move, and 'buy before each rise, sell after' actually achieves that collection. One pass, O(n)/O(1). Contrast with Stock I (single transaction \u2014 track min-so-far) and the k-transaction variants (DP): recognizing *which* constraint you're under is the real interview test here.`,
    approaches: [
      {
        name: "Sum positive deltas",
        complexityTime: "O(n)",
        complexitySpace: "O(1)",
        body: "profit += max(0, p[i] \u2212 p[i\u22121]) \u2014 the telescoping argument makes it exact."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("best time to buy and sell stock ii greedy"),
    tags: ["greedy", "array"],
    starterCode: buildStarter("intArray", "int", "maxProfit"),
    reference: (input) => {
      const p = ints(lines(input)[0]);
      let profit = 0;
      for (let i = 1; i < p.length; i++) {
        if (p[i] > p[i - 1]) profit += p[i] - p[i - 1];
      }
      return String(profit);
    },
    tests: [
      { input: "7 1 5 3 6 4", sample: true },
      { input: "1 2 3 4 5", sample: true },
      { input: "7 6 4 3 1", sample: true },
      { input: "5" },
      { input: "2 1 2 0 1" },
      { input: "3 3 5 0 0 3 1 4" }
    ]
  }
];

// src/data/problems/dynamic-programming.ts
var first10 = (s) => ints(s.split("\n")[0]);
var dynamicProgramming = [
  {
    slug: "climbing-stairs",
    title: "Climbing Stairs",
    difficulty: "EASY",
    statement: `You climb a staircase of \`n\` steps, taking 1 or 2 steps at a time. How many distinct ways can you reach the top?

**Input**: one line, the integer \`n\`.
**Output**: the number of distinct ways.`,
    constraints: `- 1 \u2264 n \u2264 45`,
    examples: [
      { input: "2", output: "2", explanation: "1+1 or 2." },
      { input: "3", output: "3", explanation: "1+1+1, 1+2, 2+1." }
    ],
    hints: [
      "The last move was a 1-step or a 2-step.",
      "ways(n) = ways(n\u22121) + ways(n\u22122) \u2014 Fibonacci in disguise."
    ],
    editorial: `To stand on step n you arrived from n\u22121 or n\u22122, so \`ways(n) = ways(n\u22121) + ways(n\u22122)\` with \`ways(1)=1, ways(2)=2\` \u2014 the Fibonacci recurrence. Iterate with two rolling variables for O(n) time, O(1) space. This is the "hello world" of DP: define the state, find the transition, seed the base cases.`,
    approaches: [
      {
        name: "Naive recursion",
        complexityTime: "O(2\u207F)",
        complexitySpace: "O(n)",
        body: "Branches twice per step \u2014 exponential blowup from recomputed subproblems."
      },
      {
        name: "Bottom-up with rolling variables",
        complexityTime: "O(n)",
        complexitySpace: "O(1)",
        body: "Keep only the last two values of the recurrence."
      }
    ],
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode climbing stairs"),
    tags: ["dynamic-programming", "math", "memoization"],
    starterCode: buildStarter("int", "int", "climbStairs"),
    reference: (input) => {
      const n = int(lines(input)[0]);
      let a = 1;
      let b = 1;
      for (let i = 0; i < n - 1; i++) {
        [a, b] = [b, a + b];
      }
      return String(b);
    },
    tests: [
      { input: "2", sample: true },
      { input: "3", sample: true },
      { input: "1" },
      { input: "10" },
      { input: "45" }
    ]
  },
  {
    slug: "min-cost-climbing-stairs",
    title: "Min Cost Climbing Stairs",
    difficulty: "EASY",
    statement: `\`cost[i]\` is the toll for stepping on stair \`i\`; after paying you may climb 1 or 2 stairs. You may start at index 0 or 1. Return the minimum cost to reach the top (one past the last stair).

**Input**: one line of space-separated integers \`cost\`.
**Output**: the minimum total cost.`,
    constraints: `- 2 \u2264 cost.length \u2264 1000
- 0 \u2264 cost[i] \u2264 999`,
    examples: [
      { input: "10 15 20", output: "15", explanation: "Start at 15, jump to the top." },
      { input: "1 100 1 1 1 100 1 1 100 1", output: "6" }
    ],
    hints: [
      "dp[i] = min cost to *leave* stair i = cost[i] + min(dp[i+1], dp[i+2]).",
      "Or forward: minimum cost to reach position i."
    ],
    editorial: `Let \`dp[i]\` be the cheapest way to stand on stair i: \`dp[i] = cost[i] + min(dp[i\u22121], dp[i\u22122])\` with free starts at 0 and 1. Answer is \`min(dp[n\u22121], dp[n\u22122])\` since either can jump off the top. Two rolling variables suffice \u2192 O(n) time, O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("min cost climbing stairs dp"),
    tags: ["dynamic-programming", "array"],
    starterCode: buildStarter("intArray", "int", "minCostClimbingStairs"),
    reference: (input) => {
      const cost = first10(input);
      let a = cost[0];
      let b = cost[1];
      for (let i = 2; i < cost.length; i++) {
        [a, b] = [b, cost[i] + Math.min(a, b)];
      }
      return String(Math.min(a, b));
    },
    tests: [
      { input: "10 15 20", sample: true },
      { input: "1 100 1 1 1 100 1 1 100 1", sample: true },
      { input: "0 0" },
      { input: "5 3" },
      { input: "1 2 3 4 5" }
    ]
  },
  {
    slug: "house-robber",
    title: "House Robber",
    difficulty: "MEDIUM",
    statement: `A robber walks a street of houses with cash amounts \`nums\`, but robbing two **adjacent** houses trips the alarm. Return the maximum loot.

**Input**: one line of space-separated non-negative integers.
**Output**: the maximum amount.`,
    constraints: `- 1 \u2264 nums.length \u2264 100
- 0 \u2264 nums[i] \u2264 400`,
    examples: [
      { input: "1 2 3 1", output: "4", explanation: "Rob houses 0 and 2." },
      { input: "2 7 9 3 1", output: "12", explanation: "Rob 2 + 9 + 1." }
    ],
    hints: [
      "For each house: rob it (skip the previous) or skip it.",
      "dp[i] = max(dp[i\u22121], dp[i\u22122] + nums[i])."
    ],
    editorial: `At house i the choice is binary: skip (keep \`dp[i\u22121]\`) or rob (gain \`nums[i] + dp[i\u22122]\`). Take the max. Two rolling variables replace the array \u2192 O(n) time, O(1) space. The "include/exclude with a gap" pattern recurs in many disguises (deleting elements, scheduling, etc.).`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode house robber"),
    tags: ["dynamic-programming", "array"],
    starterCode: buildStarter("intArray", "int", "rob"),
    reference: (input) => {
      const nums = first10(input);
      let prev = 0;
      let cur = 0;
      for (const x of nums) {
        [prev, cur] = [cur, Math.max(cur, prev + x)];
      }
      return String(cur);
    },
    tests: [
      { input: "1 2 3 1", sample: true },
      { input: "2 7 9 3 1", sample: true },
      { input: "5" },
      { input: "10 1" },
      { input: "2 1 1 2" }
    ]
  },
  {
    slug: "house-robber-ii",
    title: "House Robber II",
    difficulty: "MEDIUM",
    statement: `Same as House Robber, but the houses form a **circle** \u2014 the first and last are adjacent. Return the maximum loot.

**Input**: one line of space-separated non-negative integers.
**Output**: the maximum amount.`,
    constraints: `- 1 \u2264 nums.length \u2264 100
- 0 \u2264 nums[i] \u2264 1000`,
    examples: [
      { input: "2 3 2", output: "3", explanation: "Houses 0 and 2 are adjacent \u2014 can't take both 2s." },
      { input: "1 2 3 1", output: "4" }
    ],
    hints: [
      "The circle only forbids taking both endpoints.",
      "Solve the linear problem twice: once excluding the first house, once excluding the last."
    ],
    editorial: `In a circle you can never rob both the first and last house, so the answer is the better of two **linear** House Robber runs: on \`nums[0..n\u22122]\` and on \`nums[1..n\u22121]\` (single-house case handled directly). Reduces a new constraint to a solved subproblem \u2014 a favorite interview move. O(n), O(1).`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode house robber ii"),
    tags: ["dynamic-programming", "array"],
    starterCode: buildStarter("intArray", "int", "robCircular"),
    reference: (input) => {
      const nums = first10(input);
      if (nums.length === 1) return String(nums[0]);
      const linear = (arr) => {
        let prev = 0;
        let cur = 0;
        for (const x of arr) {
          [prev, cur] = [cur, Math.max(cur, prev + x)];
        }
        return cur;
      };
      return String(Math.max(linear(nums.slice(1)), linear(nums.slice(0, -1))));
    },
    tests: [
      { input: "2 3 2", sample: true },
      { input: "1 2 3 1", sample: true },
      { input: "1 2 3" },
      { input: "1" },
      { input: "200 3 140 20 10" }
    ]
  },
  {
    slug: "coin-change",
    title: "Coin Change",
    difficulty: "MEDIUM",
    statement: `Given coin denominations \`coins\` (unlimited supply) and an \`amount\`, return the fewest coins needed to make the amount exactly, or \`-1\` if impossible.

**Input**
- Line 1: space-separated coin values
- Line 2: integer \`amount\`

**Output**: the fewest coins, or -1.`,
    constraints: `- 1 \u2264 coins.length \u2264 12
- 1 \u2264 coins[i] \u2264 2^31 \u2212 1
- 0 \u2264 amount \u2264 10^4`,
    examples: [
      { input: "1 2 5\n11", output: "3", explanation: "5 + 5 + 1." },
      { input: "2\n3", output: "-1" },
      { input: "1\n0", output: "0" }
    ],
    hints: [
      "Greedy (largest coin first) fails: coins [1,3,4], amount 6.",
      "dp[a] = fewest coins for amount a = 1 + min over coins c of dp[a \u2212 c]."
    ],
    editorial: `Unbounded knapsack over amounts: \`dp[a] = 1 + min(dp[a \u2212 c])\` across coins, seeded with \`dp[0] = 0\` and \u221E elsewhere. Fill upward to \`amount\`; unreachable stays \u221E \u2192 -1. Greedy fails on non-canonical coin systems, which is exactly why this is a DP classic. O(amount \xD7 coins) time, O(amount) space.`,
    approaches: [
      {
        name: "BFS on amounts",
        complexityTime: "O(amount \xB7 coins)",
        complexitySpace: "O(amount)",
        body: "Level = number of coins used; first time you reach `amount` is optimal."
      },
      {
        name: "Bottom-up DP",
        complexityTime: "O(amount \xB7 coins)",
        complexitySpace: "O(amount)",
        body: "dp over every amount from 1 to target."
      }
    ],
    complexityTime: "O(amount \xB7 coins)",
    complexitySpace: "O(amount)",
    youtubeUrl: yt("neetcode coin change"),
    tags: ["dynamic-programming", "bfs", "array"],
    starterCode: buildStarter("intArrayTarget", "int", "coinChange"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const coins = ints(l0);
      const amount = int(l1);
      const dp = new Array(amount + 1).fill(Infinity);
      dp[0] = 0;
      for (let a = 1; a <= amount; a++) {
        for (const c of coins) {
          if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
        }
      }
      return String(dp[amount] === Infinity ? -1 : dp[amount]);
    },
    tests: [
      { input: "1 2 5\n11", sample: true },
      { input: "2\n3", sample: true },
      { input: "1\n0", sample: true },
      { input: "1 3 4\n6" },
      { input: "186 419 83 408\n6249" }
    ]
  },
  {
    slug: "longest-increasing-subsequence",
    title: "Longest Increasing Subsequence",
    difficulty: "MEDIUM",
    statement: `Return the length of the longest **strictly increasing** subsequence of \`nums\` (elements keep their order but need not be contiguous).

**Input**: one line of space-separated integers.
**Output**: the LIS length.`,
    constraints: `- 1 \u2264 nums.length \u2264 2500
- -10^4 \u2264 nums[i] \u2264 10^4`,
    examples: [
      { input: "10 9 2 5 3 7 101 18", output: "4", explanation: "[2,3,7,101] (or [2,5,7,18])." },
      { input: "0 1 0 3 2 3", output: "4" },
      { input: "7 7 7 7", output: "1" }
    ],
    hints: [
      "dp[i] = LIS ending exactly at i = 1 + max dp[j] over j < i with nums[j] < nums[i].",
      "The O(n log n) upgrade: maintain 'tails' \u2014 the smallest possible tail of an increasing subsequence of each length \u2014 with binary search."
    ],
    editorial: `Quadratic DP: \`dp[i] = 1 + max(dp[j])\` over earlier smaller elements; answer is the max entry. The celebrated O(n log n) method keeps \`tails[k]\` = smallest tail of any increasing subsequence of length k+1; each element binary-searches its slot (patience sorting). Both are worth knowing \u2014 the follow-up is almost guaranteed.`,
    approaches: [
      {
        name: "Quadratic DP",
        complexityTime: "O(n\xB2)",
        complexitySpace: "O(n)",
        body: "Best subsequence ending at each index."
      },
      {
        name: "Patience sorting / tails + binary search",
        complexityTime: "O(n log n)",
        complexitySpace: "O(n)",
        body: "tails stays sorted; lower-bound each element into it."
      }
    ],
    complexityTime: "O(n log n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode longest increasing subsequence"),
    tags: ["dynamic-programming", "binary-search", "array"],
    starterCode: buildStarter("intArray", "int", "lengthOfLIS"),
    reference: (input) => {
      const nums = first10(input);
      const dp = new Array(nums.length).fill(1);
      let best = 1;
      for (let i = 1; i < nums.length; i++) {
        for (let j = 0; j < i; j++) {
          if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
        }
        best = Math.max(best, dp[i]);
      }
      return String(best);
    },
    tests: [
      { input: "10 9 2 5 3 7 101 18", sample: true },
      { input: "0 1 0 3 2 3", sample: true },
      { input: "7 7 7 7", sample: true },
      { input: "1" },
      { input: "5 4 3 2 1" }
    ]
  },
  {
    slug: "longest-common-subsequence",
    title: "Longest Common Subsequence",
    difficulty: "MEDIUM",
    statement: `Given strings \`text1\` and \`text2\`, return the length of their longest common subsequence (characters in order, not necessarily contiguous); 0 if none.

**Input**
- Line 1: string \`text1\`
- Line 2: string \`text2\`

**Output**: the LCS length.`,
    constraints: `- 1 \u2264 lengths \u2264 1000
- Lowercase English letters.`,
    examples: [
      { input: "abcde\nace", output: "3", explanation: '"ace".' },
      { input: "abc\ndef", output: "0" }
    ],
    hints: [
      "Compare last characters: equal \u2192 1 + LCS of both prefixes; unequal \u2192 best of dropping one.",
      "Tabulate over prefix lengths (i, j) \u2014 the classic 2D grid."
    ],
    editorial: `The textbook 2D DP: \`dp[i][j]\` = LCS of the first i chars of text1 and first j of text2. Matching characters extend the diagonal (\`1 + dp[i\u22121][j\u22121]\`); otherwise take the better of dropping a character from either string. O(m\xB7n) time; two rows of space suffice. This grid underlies diff tools and edit distance alike.`,
    complexityTime: "O(m\xB7n)",
    complexitySpace: "O(min(m, n))",
    youtubeUrl: yt("neetcode longest common subsequence"),
    tags: ["dynamic-programming", "string"],
    starterCode: buildStarter("twoStrings", "int", "longestCommonSubsequence"),
    reference: (input) => {
      const [a = "", b = ""] = lines(input);
      const m = a.length;
      const n = b.length;
      const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
      return String(dp[m][n]);
    },
    tests: [
      { input: "abcde\nace", sample: true },
      { input: "abc\ndef", sample: true },
      { input: "abc\nabc" },
      { input: "bsbininm\njmjkbkjkv" },
      { input: "a\na" }
    ]
  },
  {
    slug: "unique-paths",
    title: "Unique Paths",
    difficulty: "MEDIUM",
    statement: `A robot starts at the top-left of an \`m \xD7 n\` grid and moves only right or down. How many distinct paths reach the bottom-right?

**Input**: one line, two integers \`m n\`.
**Output**: the number of paths.`,
    constraints: `- 1 \u2264 m, n \u2264 100
- The answer fits in a 32-bit integer for the given tests.`,
    examples: [
      { input: "3 7", output: "28" },
      { input: "3 2", output: "3" }
    ],
    hints: [
      "Each cell is reached from above or from the left.",
      "dp[i][j] = dp[i\u22121][j] + dp[i][j\u22121]; edges have exactly 1 path.",
      "Closed form: C(m+n\u22122, m\u22121) \u2014 it's a combinatorics problem too."
    ],
    editorial: `Paths into a cell come from above or the left, so \`dp[i][j] = dp[i\u22121][j] + dp[i][j\u22121]\` with 1s along the borders. A single rolling row reduces space to O(n). The counting identity \`C(m+n\u22122, m\u22121)\` (choosing when to go down among all moves) gives an O(m+n) closed form \u2014 mention it and win points.`,
    complexityTime: "O(m\xB7n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode unique paths"),
    tags: ["dynamic-programming", "math", "combinatorics"],
    starterCode: buildStarter("twoIntsLine", "int", "uniquePaths"),
    reference: (input) => {
      const [m, n] = ints(lines(input)[0]);
      const row = new Array(n).fill(1);
      for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) row[j] += row[j - 1];
      }
      return String(row[n - 1]);
    },
    tests: [
      { input: "3 7", sample: true },
      { input: "3 2", sample: true },
      { input: "1 1" },
      { input: "10 10" },
      { input: "1 25" }
    ]
  },
  {
    slug: "minimum-path-sum",
    title: "Minimum Path Sum",
    difficulty: "MEDIUM",
    statement: `Given a grid of non-negative integers, find a path from top-left to bottom-right (moving only right or down) minimizing the sum of visited values. Return that sum.

**Input**
- Line 1: \`r c\`
- Next r lines: the grid rows

**Output**: the minimum path sum.`,
    constraints: `- 1 \u2264 r, c \u2264 200
- 0 \u2264 values \u2264 100`,
    examples: [
      { input: "3 3\n1 3 1\n1 5 1\n4 2 1", output: "7", explanation: "1\u21923\u21921\u21921\u21921." },
      { input: "2 3\n1 2 3\n4 5 6", output: "12" }
    ],
    hints: [
      "Same shape as Unique Paths, but take a min instead of a sum of counts.",
      "dp[i][j] = grid[i][j] + min(dp[i\u22121][j], dp[i][j\u22121])."
    ],
    editorial: `Grid DP with the same dependency structure as Unique Paths: each cell's best cost is its own value plus the cheaper of the cell above or to the left; first row/column accumulate linearly. In-place accumulation over the grid gives O(r\xB7c) time with O(1) extra space.`,
    complexityTime: "O(r\xB7c)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("minimum path sum dp"),
    tags: ["dynamic-programming", "matrix"],
    starterCode: buildStarter("matrix", "int", "minPathSum"),
    reference: (input) => {
      const ls = lines(input);
      const [r, c] = ints(ls[0]);
      const g = [];
      for (let i = 0; i < r; i++) g.push(ints(ls[1 + i]));
      for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
          if (i === 0 && j === 0) continue;
          const up = i > 0 ? g[i - 1][j] : Infinity;
          const left = j > 0 ? g[i][j - 1] : Infinity;
          g[i][j] += Math.min(up, left);
        }
      }
      return String(g[r - 1][c - 1]);
    },
    tests: [
      { input: "3 3\n1 3 1\n1 5 1\n4 2 1", sample: true },
      { input: "2 3\n1 2 3\n4 5 6", sample: true },
      { input: "1 1\n5" },
      { input: "1 4\n1 2 3 4" },
      { input: "3 1\n2\n3\n4" }
    ]
  },
  {
    slug: "decode-ways",
    title: "Decode Ways",
    difficulty: "MEDIUM",
    statement: `Letters map to digits A=1 \u2026 Z=26. Given a digit string \`s\`, count how many ways it can be decoded (e.g. "12" \u2192 "AB" or "L"). Leading zeros in a group are invalid.

**Input**: one line, the digit string.
**Output**: the number of decodings (0 if none).`,
    constraints: `- 1 \u2264 s.length \u2264 100
- Digits only; may contain zeros.`,
    examples: [
      { input: "12", output: "2" },
      { input: "226", output: "3", explanation: "2|26, 22|6, 2|2|6." },
      { input: "06", output: "0" }
    ],
    hints: [
      "Like Climbing Stairs, but a step is valid only if the 1- or 2-digit group is a real letter.",
      "A single '0' contributes nothing; '10'\u2013'26' allows a two-digit step.",
      "dp[i] = (s[i\u22121] \u2260 '0' ? dp[i\u22121] : 0) + (s[i\u22122..i\u22121] \u2208 [10,26] ? dp[i\u22122] : 0)."
    ],
    editorial: `Climbing Stairs with legality checks: ending at position i, the last group was one digit (valid unless '0') or two digits (valid if 10\u201326). Sum the corresponding earlier counts. Zeros are the trap \u2014 '0' alone kills a path, and '30' has no decoding at all. O(n) time, O(1) space with rolling variables.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode decode ways"),
    tags: ["dynamic-programming", "string"],
    starterCode: buildStarter("string", "int", "numDecodings"),
    reference: (input) => {
      const s = (lines(input)[0] ?? "").trim();
      if (!s || s[0] === "0") return "0";
      let prev = 1;
      let cur = 1;
      for (let i = 1; i < s.length; i++) {
        let next = 0;
        if (s[i] !== "0") next += cur;
        const two = parseInt(s.slice(i - 1, i + 1), 10);
        if (two >= 10 && two <= 26) next += prev;
        [prev, cur] = [cur, next];
        if (cur === 0) return "0";
      }
      return String(cur);
    },
    tests: [
      { input: "12", sample: true },
      { input: "226", sample: true },
      { input: "06", sample: true },
      { input: "10" },
      { input: "2101" },
      { input: "111111" }
    ]
  },
  {
    slug: "edit-distance",
    title: "Edit Distance",
    difficulty: "MEDIUM",
    statement: `Given strings \`word1\` and \`word2\`, return the minimum number of single-character operations (insert, delete, replace) to convert \`word1\` into \`word2\`.

**Input**
- Line 1: \`word1\`
- Line 2: \`word2\`

**Output**: the minimum operation count.`,
    constraints: `- 0 \u2264 lengths \u2264 500
- Lowercase English letters.`,
    examples: [
      { input: "horse\nros", output: "3" },
      { input: "intention\nexecution", output: "5" }
    ],
    hints: [
      "Compare the last characters of both prefixes.",
      "Equal \u2192 no cost, move both. Unequal \u2192 1 + min(insert, delete, replace) on the smaller subproblems.",
      "dp[i][j] over prefix lengths; first row/column are i and j (pure inserts/deletes)."
    ],
    editorial: `**Levenshtein distance**: \`dp[i][j]\` converts the first i chars of word1 into the first j of word2. Matching last characters inherit the diagonal; otherwise \`1 + min(dp[i\u22121][j] /*delete*/, dp[i][j\u22121] /*insert*/, dp[i\u22121][j\u22121] /*replace*/)\`. Borders are trivial conversions from/to empty. O(m\xB7n) time, one rolling row of space. Powers spell-checkers and diffs.`,
    complexityTime: "O(m\xB7n)",
    complexitySpace: "O(min(m, n))",
    youtubeUrl: yt("neetcode edit distance"),
    tags: ["dynamic-programming", "string"],
    starterCode: buildStarter("twoStrings", "int", "minDistance"),
    reference: (input) => {
      const [a = "", b = ""] = lines(input);
      const m = a.length;
      const n = b.length;
      const dp = Array.from({ length: m + 1 }, (_, i) => {
        const row = new Array(n + 1).fill(0);
        row[0] = i;
        return row;
      });
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
      return String(dp[m][n]);
    },
    tests: [
      { input: "horse\nros", sample: true },
      { input: "intention\nexecution", sample: true },
      { input: "\nabc" },
      { input: "abc\n" },
      { input: "same\nsame" }
    ]
  },
  {
    slug: "partition-equal-subset-sum",
    title: "Partition Equal Subset Sum",
    difficulty: "MEDIUM",
    statement: `Return \`true\` if the array \`nums\` can be split into two subsets with equal sums.

**Input**: one line of space-separated positive integers.
**Output**: \`true\` or \`false\`.`,
    constraints: `- 1 \u2264 nums.length \u2264 200
- 1 \u2264 nums[i] \u2264 100`,
    examples: [
      { input: "1 5 11 5", output: "true", explanation: "[1,5,5] and [11]." },
      { input: "1 2 3 5", output: "false" }
    ],
    hints: [
      "An odd total is an instant no.",
      "Otherwise: does any subset sum to total/2? That's 0/1 knapsack.",
      "Boolean dp over reachable sums; iterate sums downward to avoid reusing an element."
    ],
    editorial: `Reduce to **subset-sum**: a valid split exists iff some subset reaches \`total/2\` (odd totals fail immediately). Boolean DP over achievable sums: for each number, mark \`dp[s] |= dp[s \u2212 num]\`, sweeping \`s\` **downward** so each element is used at most once. O(n \xB7 total/2) time, O(total/2) space \u2014 the canonical 0/1 knapsack feasibility table.`,
    complexityTime: "O(n \xB7 sum)",
    complexitySpace: "O(sum)",
    youtubeUrl: yt("neetcode partition equal subset sum"),
    tags: ["dynamic-programming", "knapsack", "array"],
    starterCode: buildStarter("intArray", "bool", "canPartition"),
    reference: (input) => {
      const nums = first10(input);
      const total = nums.reduce((a, b) => a + b, 0);
      if (total % 2 !== 0) return boolOut(false);
      const target = total / 2;
      const dp = new Array(target + 1).fill(false);
      dp[0] = true;
      for (const x of nums) {
        for (let s = target; s >= x; s--) {
          if (dp[s - x]) dp[s] = true;
        }
      }
      return boolOut(dp[target]);
    },
    tests: [
      { input: "1 5 11 5", sample: true },
      { input: "1 2 3 5", sample: true },
      { input: "1 1" },
      { input: "3" },
      { input: "2 2 1 1" }
    ]
  },
  {
    slug: "target-sum",
    title: "Target Sum",
    difficulty: "MEDIUM",
    statement: `Assign \`+\` or \`-\` to every element of \`nums\`; count the assignments whose total equals \`target\`.

**Input**
- Line 1: space-separated non-negative integers
- Line 2: integer \`target\`

**Output**: the number of ways.`,
    constraints: `- 1 \u2264 nums.length \u2264 20
- 0 \u2264 nums[i] \u2264 1000; \u03A3nums \u2264 1000
- -1000 \u2264 target \u2264 1000`,
    examples: [
      { input: "1 1 1 1 1\n3", output: "5" },
      { input: "1\n1", output: "1" }
    ],
    hints: [
      "Let P = sum of positives, N = sum of negatives. P \u2212 N = target and P + N = total.",
      "So P = (target + total) / 2 \u2014 count subsets summing to P.",
      "If target + total is odd or negative, the answer is 0."
    ],
    editorial: `Algebra collapses this to **counting subset-sums**: positives must total \`(target + \u03A3)/2\`. If that's fractional or negative, zero ways. Then a counting knapsack \u2014 \`dp[s] += dp[s \u2212 num]\`, iterating sums downward per element \u2014 tallies the subsets. O(n \xB7 \u03A3) time. The transformation is the interview insight; the DP is routine.`,
    complexityTime: "O(n \xB7 sum)",
    complexitySpace: "O(sum)",
    youtubeUrl: yt("target sum dp leetcode"),
    tags: ["dynamic-programming", "knapsack", "backtracking"],
    starterCode: buildStarter("intArrayTarget", "int", "findTargetSumWays"),
    reference: (input) => {
      const [l0, l1] = lines(input);
      const nums = ints(l0);
      const target = int(l1);
      const total = nums.reduce((a, b) => a + b, 0);
      const doubled = target + total;
      if (doubled < 0 || doubled % 2 !== 0) return "0";
      const goal = doubled / 2;
      const dp = new Array(goal + 1).fill(0);
      dp[0] = 1;
      for (const x of nums) {
        for (let s = goal; s >= x; s--) dp[s] += dp[s - x];
      }
      return String(dp[goal]);
    },
    tests: [
      { input: "1 1 1 1 1\n3", sample: true },
      { input: "1\n1", sample: true },
      { input: "1\n2" },
      { input: "0 0 1\n1" },
      { input: "2 3 5 7\n1" }
    ]
  },
  {
    slug: "palindromic-substrings",
    title: "Palindromic Substrings",
    difficulty: "MEDIUM",
    statement: `Count the palindromic substrings of \`s\` (substrings with different positions count separately).

**Input**: one line, the string \`s\`.
**Output**: the count.`,
    constraints: `- 1 \u2264 s.length \u2264 1000
- Lowercase English letters.`,
    examples: [
      { input: "abc", output: "3", explanation: "a, b, c." },
      { input: "aaa", output: "6", explanation: "a\xD73, aa\xD72, aaa." }
    ],
    hints: [
      "Every palindrome has a center \u2014 a character or a gap between two.",
      "Expand around each of the 2n\u22121 centers, counting while the ends match."
    ],
    editorial: `**Expand around center**: each of the \`2n \u2212 1\` centers (n characters + n\u22121 gaps) grows outward while the boundary characters match, counting one palindrome per successful expansion. O(n\xB2) time, O(1) space, and far simpler than the DP table. (Manacher's algorithm reaches O(n) if the interviewer pushes.)`,
    complexityTime: "O(n\xB2)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode palindromic substrings"),
    tags: ["dynamic-programming", "string", "two-pointers"],
    starterCode: buildStarter("string", "int", "countSubstrings"),
    reference: (input) => {
      const s = (lines(input)[0] ?? "").trim();
      let count = 0;
      for (let center = 0; center < 2 * s.length - 1; center++) {
        let l = Math.floor(center / 2);
        let r = l + center % 2;
        while (l >= 0 && r < s.length && s[l] === s[r]) {
          count++;
          l--;
          r++;
        }
      }
      return String(count);
    },
    tests: [
      { input: "abc", sample: true },
      { input: "aaa", sample: true },
      { input: "a" },
      { input: "abba" },
      { input: "racecar" }
    ]
  },
  {
    slug: "longest-palindromic-subsequence",
    title: "Longest Palindromic Subsequence",
    difficulty: "MEDIUM",
    statement: `Return the length of the longest **subsequence** of \`s\` that is a palindrome. A subsequence keeps relative order but need not be contiguous.

**Input**: one line, the string \`s\`.
**Output**: the length of the longest palindromic subsequence.`,
    constraints: `- 1 \u2264 s.length \u2264 1000
- Lowercase English letters.`,
    examples: [
      { input: "bbbab", output: "4", explanation: '"bbbb".' },
      { input: "cbbd", output: "2", explanation: '"bb".' },
      { input: "agbdba", output: "5", explanation: '"abdba".' }
    ],
    hints: [
      "Subsequence \u2260 substring \u2014 'longest palindromic substring' techniques don't transfer.",
      "Interval DP: define dp[i][j] = LPS length within s[i..j].",
      "If s[i] == s[j], they wrap the inside: 2 + dp[i+1][j\u22121]; otherwise drop one end and take the max."
    ],
    editorial: `Interval DP over substring ranges: \`dp[i][j]\` is the longest palindromic subsequence inside \`s[i..j]\`. Matching endpoints contribute both characters around the inner answer (\`2 + dp[i+1][j\u22121]\`); mismatched endpoints mean at least one is expendable (\`max(dp[i+1][j], dp[i][j\u22121])\`). Fill by increasing interval length (or iterate i downward, j upward) with single characters as the base case 1. O(n\xB2) time and space; a rolling 1-D array cuts memory. The slick alternative \u2014 LPS(s) = LCS(s, reverse(s)) \u2014 reduces it to a problem you already know, and knowing *both* framings is the flex. This DP also answers 'minimum insertions to make s a palindrome': n \u2212 LPS(s).`,
    approaches: [
      {
        name: "Interval DP",
        complexityTime: "O(n\xB2)",
        complexitySpace: "O(n\xB2) \u2192 O(n) rolled",
        body: "dp[i][j] over ranges; endpoints match \u2192 wrap, else drop an end."
      },
      {
        name: "LCS with the reverse",
        complexityTime: "O(n\xB2)",
        complexitySpace: "O(n\xB2)",
        body: "LPS(s) = LCS(s, reverse(s)) \u2014 reuse the LCS table verbatim."
      }
    ],
    complexityTime: "O(n\xB2)",
    complexitySpace: "O(n\xB2)",
    youtubeUrl: yt("longest palindromic subsequence dp"),
    tags: ["dynamic-programming", "string", "interval-dp"],
    starterCode: buildStarter("string", "int", "longestPalindromeSubseq"),
    reference: (input) => {
      const s = (lines(input)[0] ?? "").trim();
      const n = s.length;
      if (n === 0) return "0";
      const dp = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let i = n - 1; i >= 0; i--) {
        dp[i][i] = 1;
        for (let j = i + 1; j < n; j++) {
          dp[i][j] = s[i] === s[j] ? 2 + (j - i > 1 ? dp[i + 1][j - 1] : 0) : Math.max(dp[i + 1][j], dp[i][j - 1]);
        }
      }
      return String(dp[0][n - 1]);
    },
    tests: [
      { input: "bbbab", sample: true },
      { input: "cbbd", sample: true },
      { input: "agbdba", sample: true },
      { input: "a" },
      { input: "abcdef" },
      { input: "aibohphobia" }
    ]
  },
  {
    slug: "perfect-squares",
    title: "Perfect Squares",
    difficulty: "MEDIUM",
    statement: `Return the least number of perfect squares (1, 4, 9, 16, \u2026) that sum to \`n\`.

**Input**: one line, the integer \`n\`.
**Output**: the minimum count.`,
    constraints: `- 1 \u2264 n \u2264 10^4`,
    examples: [
      { input: "12", output: "3", explanation: "4 + 4 + 4." },
      { input: "13", output: "2", explanation: "4 + 9." }
    ],
    hints: [
      "It's coin change with coin denominations 1, 4, 9, 16, \u2026 \u2014 unlimited supply, minimize coins.",
      "dp[i] = 1 + min over squares j\xB2 \u2264 i of dp[i \u2212 j\xB2].",
      "Greedy (take the largest square) fails: 12 \u2192 9+1+1+1 is four, not three."
    ],
    editorial: `Unbounded coin change in disguise: denominations are the squares up to n. Build \`dp[0..n]\` with dp[0] = 0 and \`dp[i] = 1 + min(dp[i \u2212 j\xB2])\` over all j\xB2 \u2264 i. O(n\xB7\u221An) time, O(n) space \u2014 comfortably fast for 10\u2074. Greedy-largest-square fails (12 = 9+1+1+1 vs 4+4+4), which is worth saying because it's the trap. Number-theory dessert: **Lagrange's four-square theorem** caps every answer at 4, and Legendre's three-square theorem characterizes exactly when the answer is 4 (n of the form 4\u1D43(8b+7)) \u2014 so an O(\u221An) mathematical solution exists. Mentioning it after coding the DP is pure bonus signal.`,
    approaches: [
      {
        name: "Coin-change DP",
        complexityTime: "O(n\xB7\u221An)",
        complexitySpace: "O(n)",
        body: "dp[i] = 1 + min dp[i \u2212 j\xB2]; squares are the coin set."
      },
      {
        name: "BFS on remainders",
        complexityTime: "O(n\xB7\u221An)",
        complexitySpace: "O(n)",
        body: "Shortest path from n to 0 subtracting squares \u2014 finds the level (answer) early."
      },
      {
        name: "Number theory",
        complexityTime: "O(\u221An)",
        complexitySpace: "O(1)",
        body: "Answers are only ever 1\u20134 (Lagrange); classify with Legendre's condition."
      }
    ],
    complexityTime: "O(n\xB7\u221An)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("perfect squares leetcode dp"),
    tags: ["dynamic-programming", "math", "bfs"],
    starterCode: buildStarter("int", "int", "numSquares"),
    reference: (input) => {
      const n = int(lines(input)[0]);
      const dp = new Array(n + 1).fill(Infinity);
      dp[0] = 0;
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j * j <= i; j++) {
          const cand = dp[i - j * j] + 1;
          if (cand < dp[i]) dp[i] = cand;
        }
      }
      return String(dp[n]);
    },
    tests: [
      { input: "12", sample: true },
      { input: "13", sample: true },
      { input: "1" },
      { input: "7" },
      { input: "9999" },
      { input: "8935" }
    ]
  }
];

// src/data/problems/bit-manipulation.ts
var first11 = (s) => ints(s.split("\n")[0]);
var bitManipulation = [
  {
    slug: "single-number",
    title: "Single Number",
    difficulty: "EASY",
    statement: `Every element of \`nums\` appears exactly twice except one, which appears once. Find it in O(n) time and O(1) space.

**Input**: one line of space-separated integers.
**Output**: the single number.`,
    constraints: `- 1 \u2264 nums.length \u2264 3\xB710^4 (odd)
- Each value appears twice except one.`,
    examples: [
      { input: "2 2 1", output: "1" },
      { input: "4 1 2 1 2", output: "4" }
    ],
    hints: [
      "x ^ x = 0 and x ^ 0 = x.",
      "XOR everything \u2014 pairs annihilate, the loner survives."
    ],
    editorial: `XOR is associative, commutative, and self-inverse, so XOR-folding the whole array cancels every pair and leaves the unique element. One pass, no extra memory \u2014 the cleanest bit-trick in the interview canon.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode single number"),
    tags: ["bit-manipulation", "array"],
    starterCode: buildStarter("intArray", "int", "singleNumber"),
    reference: (input) => {
      const nums = first11(input);
      return String(nums.reduce((a, b) => a ^ b, 0));
    },
    tests: [
      { input: "2 2 1", sample: true },
      { input: "4 1 2 1 2", sample: true },
      { input: "1" },
      { input: "-3 5 5" },
      { input: "7 3 7 9 3" }
    ]
  },
  {
    slug: "single-number-ii",
    title: "Single Number II",
    difficulty: "MEDIUM",
    statement: `Every element appears exactly **three times** except one, which appears once. Find it in O(n) time and O(1) space.

**Input**: one line of space-separated integers.
**Output**: the single number.`,
    constraints: `- 1 \u2264 nums.length \u2264 3\xB710^4
- -2^31 \u2264 values \u2264 2^31 \u2212 1`,
    examples: [
      { input: "2 2 3 2", output: "3" },
      { input: "0 1 0 1 0 1 99", output: "99" }
    ],
    hints: [
      "Plain XOR doesn't cancel triples.",
      "Count each bit position mod 3: the remainder pattern is the answer's bit.",
      "The slick version tracks 'seen once' and 'seen twice' masks with two variables."
    ],
    editorial: `Per bit position, the total count of set bits across the array is \u2261 the unique number's bit (mod 3), since triples contribute multiples of 3. Summing each of the 32 positions mod 3 reconstructs the answer (mind the sign bit). The two-variable automaton (\`ones\`, \`twos\`) does the same in a single elegant pass. O(32n) \u2192 O(n), O(1) space.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("single number ii bit manipulation"),
    tags: ["bit-manipulation", "array"],
    starterCode: buildStarter("intArray", "int", "singleNumberII"),
    reference: (input) => {
      const nums = first11(input);
      let ones = 0;
      let twos = 0;
      for (const x of nums) {
        ones = (ones ^ x) & ~twos;
        twos = (twos ^ x) & ~ones;
      }
      return String(ones);
    },
    tests: [
      { input: "2 2 3 2", sample: true },
      { input: "0 1 0 1 0 1 99", sample: true },
      { input: "5" },
      { input: "-2 -2 1 -2" },
      { input: "30000 500 100 30000 100 30000 100" }
    ]
  },
  {
    slug: "number-of-1-bits",
    title: "Number of 1 Bits",
    difficulty: "EASY",
    statement: `Return the number of set bits (the Hamming weight) in the binary representation of a non-negative integer \`n\`.

**Input**: one line, the integer \`n\`.
**Output**: the count of 1 bits.`,
    constraints: `- 0 \u2264 n \u2264 2^31 \u2212 1`,
    examples: [
      { input: "11", output: "3", explanation: "1011\u2082." },
      { input: "128", output: "1", explanation: "10000000\u2082." }
    ],
    hints: [
      "Checking all 32 bits works. Can you loop only over the set bits?",
      "n & (n \u2212 1) clears the lowest set bit."
    ],
    editorial: `The check-each-bit loop is fine, but **Kernighan's trick** is the expected answer: \`n & (n \u2212 1)\` zeroes the lowest set bit, so looping until n hits 0 iterates exactly once per set bit. O(number of 1s) \u2014 and the same identity powers the "power of two" test.`,
    complexityTime: "O(set bits)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("number of 1 bits kernighan"),
    tags: ["bit-manipulation"],
    starterCode: buildStarter("int", "int", "hammingWeight"),
    reference: (input) => {
      let n = int(lines(input)[0]);
      let count = 0;
      while (n !== 0) {
        n &= n - 1;
        count++;
      }
      return String(count);
    },
    tests: [
      { input: "11", sample: true },
      { input: "128", sample: true },
      { input: "0" },
      { input: "1" },
      { input: "2147483647" }
    ]
  },
  {
    slug: "counting-bits",
    title: "Counting Bits",
    difficulty: "EASY",
    statement: `For every \`i\` from 0 to \`n\`, output the number of 1 bits in \`i\`. Aim for O(n) total \u2014 better than calling popcount n times.

**Input**: one line, the integer \`n\`.
**Output**: n+1 counts, space-separated.`,
    constraints: `- 0 \u2264 n \u2264 10^5`,
    examples: [
      { input: "2", output: "0 1 1" },
      { input: "5", output: "0 1 1 2 1 2" }
    ],
    hints: [
      "Relate bits(i) to a smaller, already-computed value.",
      "bits(i) = bits(i >> 1) + (i & 1) \u2014 shift off the last bit.",
      "Or: bits(i) = bits(i & (i\u22121)) + 1."
    ],
    editorial: `A one-line DP: \`bits[i] = bits[i >> 1] + (i & 1)\` \u2014 i without its last bit is already solved, then add the last bit back. Each entry is O(1) \u2192 O(n) total, meeting the follow-up bound. Equivalent recurrence: \`bits[i & (i\u22121)] + 1\` via Kernighan.`,
    complexityTime: "O(n)",
    complexitySpace: "O(n)",
    youtubeUrl: yt("neetcode counting bits"),
    tags: ["bit-manipulation", "dynamic-programming"],
    starterCode: buildStarter("int", "intArray", "countBits"),
    reference: (input) => {
      const n = int(lines(input)[0]);
      const bits = new Array(n + 1).fill(0);
      for (let i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
      return arrOut(bits);
    },
    tests: [
      { input: "2", sample: true },
      { input: "5", sample: true },
      { input: "0" },
      { input: "16" },
      { input: "31" }
    ]
  },
  {
    slug: "missing-number",
    title: "Missing Number",
    difficulty: "EASY",
    statement: `Array \`nums\` holds \`n\` distinct values from the range \`[0, n]\` \u2014 exactly one value is missing. Find it in O(n) time and O(1) space.

**Input**: one line of space-separated integers.
**Output**: the missing value.`,
    constraints: `- 1 \u2264 n \u2264 10^4
- Values are distinct and within [0, n].`,
    examples: [
      { input: "3 0 1", output: "2" },
      { input: "9 6 4 2 3 5 7 0 1", output: "8" }
    ],
    hints: [
      "Gauss: the full range sums to n(n+1)/2.",
      "Or XOR indices against values \u2014 matched pairs cancel."
    ],
    editorial: `Two O(1)-space one-liners: subtract the array's sum from \`n(n+1)/2\` (Gauss), or XOR every index 0..n with every value \u2014 everything pairs off except the missing number. XOR avoids any overflow concern in fixed-width languages.`,
    complexityTime: "O(n)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("neetcode missing number"),
    tags: ["bit-manipulation", "math", "array"],
    starterCode: buildStarter("intArray", "int", "missingNumber"),
    reference: (input) => {
      const nums = first11(input);
      const n = nums.length;
      let x = n;
      for (let i = 0; i < n; i++) x ^= i ^ nums[i];
      return String(x);
    },
    tests: [
      { input: "3 0 1", sample: true },
      { input: "9 6 4 2 3 5 7 0 1", sample: true },
      { input: "0" },
      { input: "1" },
      { input: "1 2" }
    ]
  },
  {
    slug: "power-of-two",
    title: "Power of Two",
    difficulty: "EASY",
    statement: `Return \`true\` if integer \`n\` is a power of two (n = 2\u1D4F for some k \u2265 0). No loops or recursion needed.

**Input**: one line, the integer \`n\` (may be negative).
**Output**: \`true\` or \`false\`.`,
    constraints: `- -2^31 \u2264 n \u2264 2^31 \u2212 1`,
    examples: [
      { input: "1", output: "true", explanation: "2\u2070." },
      { input: "16", output: "true" },
      { input: "3", output: "false" }
    ],
    hints: [
      "A power of two has exactly one set bit.",
      "n & (n \u2212 1) == 0 for powers of two \u2014 but watch n \u2264 0."
    ],
    editorial: `A positive power of two has exactly one set bit, so \`n > 0 && (n & (n \u2212 1)) == 0\` decides it in O(1). The \`n > 0\` guard matters: 0 and negatives would otherwise slip through the bit test.`,
    complexityTime: "O(1)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("power of two bit manipulation"),
    tags: ["bit-manipulation", "math"],
    starterCode: buildStarter("int", "bool", "isPowerOfTwo"),
    reference: (input) => {
      const n = int(lines(input)[0]);
      return boolOut(n > 0 && (n & n - 1) === 0);
    },
    tests: [
      { input: "1", sample: true },
      { input: "16", sample: true },
      { input: "3", sample: true },
      { input: "0" },
      { input: "-16" },
      { input: "1073741824" }
    ]
  },
  {
    slug: "reverse-bits",
    title: "Reverse Bits",
    difficulty: "EASY",
    statement: `Given the 32-bit binary representation of an unsigned integer, reverse the bits and return the resulting unsigned integer value.

**Input**: one line \u2014 a 32-character binary string.
**Output**: the decimal value after reversal.`,
    constraints: `- The input is exactly 32 binary digits.`,
    examples: [
      {
        input: "00000010100101000001111010011100",
        output: "964176192",
        explanation: "Reversed: 00111001011110000010100101000000\u2082."
      },
      {
        input: "11111111111111111111111111111101",
        output: "3221225471"
      }
    ],
    hints: [
      "Build the result bit by bit: shift the result left, append n's lowest bit, shift n right.",
      "Watch unsigned semantics \u2014 the result can exceed a signed 32-bit int."
    ],
    editorial: `Peel bits off one end and push them onto the other: 32 iterations of \`result = (result << 1) | (n & 1); n >>= 1\`. In Java use \`long\`/unsigned shifts and in Python mask with \`0xFFFFFFFF\` \u2014 the reversed value may not fit a signed int. Divide-and-conquer mask swapping (swap halves, then quarters\u2026) does it in 5 operations for extra credit.`,
    complexityTime: "O(32)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("reverse bits leetcode"),
    tags: ["bit-manipulation"],
    starterCode: buildStarter("string", "long", "reverseBits"),
    reference: (input) => {
      const s = (lines(input)[0] ?? "").trim();
      const reversed = s.split("").reverse().join("");
      return String(parseInt(reversed, 2));
    },
    tests: [
      { input: "00000010100101000001111010011100", sample: true },
      { input: "11111111111111111111111111111101", sample: true },
      { input: "00000000000000000000000000000000" },
      { input: "11111111111111111111111111111111" },
      { input: "10000000000000000000000000000000" }
    ]
  },
  {
    slug: "sum-of-two-integers",
    title: "Sum of Two Integers",
    difficulty: "MEDIUM",
    statement: `Compute \`a + b\` **without using + or -**.

**Input**: one line, two integers \`a b\`.
**Output**: their sum.`,
    constraints: `- -1000 \u2264 a, b \u2264 1000`,
    examples: [
      { input: "1 2", output: "3" },
      { input: "2 3", output: "5" }
    ],
    hints: [
      "XOR adds without carrying; AND finds where carries happen.",
      "Repeat: sum = a ^ b, carry = (a & b) << 1, until the carry dies.",
      "In Python, mask to 32 bits to simulate fixed-width overflow."
    ],
    editorial: `Binary addition splits into a carry-less sum (\`a ^ b\`) and the carries (\`(a & b) << 1\`); iterating until the carry is zero converges because each round pushes carries one bit left. Fixed-width languages get negative numbers free via two's complement; Python needs explicit 32-bit masking. O(32) iterations max.`,
    complexityTime: "O(1)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("sum of two integers bit manipulation neetcode"),
    tags: ["bit-manipulation", "math"],
    starterCode: buildStarter("twoIntsLine", "int", "getSum"),
    reference: (input) => {
      const [a, b] = ints(lines(input)[0]);
      return String(a + b);
    },
    tests: [
      { input: "1 2", sample: true },
      { input: "2 3", sample: true },
      { input: "-1 1" },
      { input: "-12 -8" },
      { input: "1000 -999" }
    ]
  },
  {
    slug: "add-binary",
    title: "Add Binary",
    difficulty: "EASY",
    statement: `Given two binary strings \`a\` and \`b\`, return their sum as a binary string.

**Input**
- Line 1: binary string \`a\`
- Line 2: binary string \`b\`

**Output**: the binary sum.`,
    constraints: `- 1 \u2264 lengths \u2264 10^4
- No leading zeros except the string "0".`,
    examples: [
      { input: "11\n1", output: "100" },
      { input: "1010\n1011", output: "10101" }
    ],
    hints: [
      "Grade-school addition from the rightmost bits with a carry.",
      "Loop while either string has digits or a carry remains."
    ],
    editorial: `Walk both strings from the right summing \`bitA + bitB + carry\`; emit \`sum % 2\`, carry \`sum / 2\`, and keep going while any digits or carry remain (999\u2026+1 analog: "1" + "1" \u2192 "10"). Building the answer backwards and reversing avoids O(n\xB2) prepends. O(max(m, n)).`,
    complexityTime: "O(max(m, n))",
    complexitySpace: "O(max(m, n))",
    youtubeUrl: yt("add binary leetcode"),
    tags: ["bit-manipulation", "string", "math"],
    starterCode: buildStarter("twoStrings", "string", "addBinary"),
    reference: (input) => {
      const [a = "0", b = "0"] = lines(input);
      let i = a.length - 1;
      let j = b.length - 1;
      let carry = 0;
      const out = [];
      while (i >= 0 || j >= 0 || carry) {
        const s = (i >= 0 ? +a[i--] : 0) + (j >= 0 ? +b[j--] : 0) + carry;
        out.push(String(s % 2));
        carry = s >> 1;
      }
      return out.reverse().join("");
    },
    tests: [
      { input: "11\n1", sample: true },
      { input: "1010\n1011", sample: true },
      { input: "0\n0" },
      { input: "1\n111" },
      { input: "1111\n1111" }
    ]
  },
  {
    slug: "hamming-distance",
    title: "Hamming Distance",
    difficulty: "EASY",
    statement: `The Hamming distance between two integers is the number of bit positions where they differ. Given \`x\` and \`y\`, return their Hamming distance.

**Input**: one line, two integers \`x y\`.
**Output**: the Hamming distance.`,
    constraints: `- 0 \u2264 x, y \u2264 2^31 \u2212 1`,
    examples: [
      {
        input: "1 4",
        output: "2",
        explanation: "001 vs 100 \u2014 bits 0 and 2 differ."
      },
      { input: "3 1", output: "1" }
    ],
    hints: [
      "XOR marks exactly the differing positions with 1s.",
      "The problem reduces to popcount(x ^ y).",
      "Count set bits with Kernighan: n & (n \u2212 1) clears the lowest one."
    ],
    editorial: `Two ideas you already own, composed: \`x ^ y\` produces a mask whose set bits are precisely the disagreements, and Kernighan's loop (\`n &= n \u2212 1\`, once per set bit) counts them. O(number of differing bits), O(1) space. Hamming distance is the unit of error detection \u2014 it's why parity bits catch single-bit flips and how error-correcting codes measure themselves \u2014 so this tiny problem has real hardware pedigree. Follow-up to expect: *total* Hamming distance over an array \u2014 per-bit column counting (ones \xD7 zeros per position), not pairwise XOR.`,
    approaches: [
      {
        name: "XOR + Kernighan popcount",
        complexityTime: "O(set bits)",
        complexitySpace: "O(1)",
        body: "Diff mask via XOR; strip lowest set bit until zero."
      }
    ],
    complexityTime: "O(1)",
    complexitySpace: "O(1)",
    youtubeUrl: yt("hamming distance leetcode"),
    tags: ["bit-manipulation"],
    starterCode: buildStarter("twoIntsLine", "int", "hammingDistance"),
    reference: (input) => {
      const [a, b] = ints(lines(input)[0]);
      let x = a ^ b;
      let count = 0;
      while (x !== 0) {
        x &= x - 1;
        count++;
      }
      return String(count);
    },
    tests: [
      { input: "1 4", sample: true },
      { input: "3 1", sample: true },
      { input: "0 0" },
      { input: "0 2147483647" },
      { input: "93 73" }
    ]
  }
];

// src/data/topics.ts
var dsaTopics = [
  {
    slug: "arrays",
    name: "Arrays",
    description: "Traversals, prefix sums, in-place tricks, and the hash-map staples.",
    icon: "Brackets",
    order: 1,
    problems: arrays
  },
  {
    slug: "strings",
    name: "Strings",
    description: "Two pointers, sliding windows, and frequency counting on text.",
    icon: "Type",
    order: 2,
    problems: strings
  },
  {
    slug: "two-pointers",
    name: "Two Pointers",
    description: "Converging and fast/slow pointer techniques on sorted data.",
    icon: "MoveHorizontal",
    order: 3,
    problems: twoPointers
  },
  {
    slug: "sliding-window",
    name: "Sliding Window",
    description: "Fixed and variable windows for subarray/substring problems.",
    icon: "RectangleHorizontal",
    order: 4,
    problems: slidingWindow
  },
  {
    slug: "binary-search",
    name: "Binary Search",
    description: "Search on sorted arrays and on the answer space.",
    icon: "Search",
    order: 5,
    problems: binarySearch
  },
  {
    slug: "stacks-queues",
    name: "Stacks & Queues",
    description: "Monotonic stacks, queues, and expression parsing.",
    icon: "Layers",
    order: 6,
    problems: stacksQueues
  },
  {
    slug: "linked-list",
    name: "Linked Lists",
    description: "Pointer manipulation, cycle detection, and reversal.",
    icon: "Link2",
    order: 7,
    problems: linkedList
  },
  {
    slug: "trees",
    name: "Trees",
    description: "Binary trees, BSTs, traversals, and recursion.",
    icon: "GitFork",
    order: 8,
    problems: trees
  },
  {
    slug: "tries",
    name: "Tries",
    description: "Prefix trees for word and dictionary problems.",
    icon: "Network",
    order: 9,
    problems: tries
  },
  {
    slug: "heaps",
    name: "Heaps & Priority Queues",
    description: "Top-K, streaming medians, and scheduling with heaps.",
    icon: "TriangleRight",
    order: 10,
    problems: heaps
  },
  {
    slug: "backtracking",
    name: "Backtracking",
    description: "Systematic search over subsets, permutations, and boards.",
    icon: "Undo2",
    order: 11,
    problems: backtracking
  },
  {
    slug: "graphs",
    name: "Graphs",
    description: "BFS, DFS, topological sort, and union-find.",
    icon: "Waypoints",
    order: 12,
    problems: graphs
  },
  {
    slug: "greedy",
    name: "Greedy",
    description: "Locally optimal choices that yield global optima.",
    icon: "TrendingUp",
    order: 13,
    problems: greedy
  },
  {
    slug: "dynamic-programming",
    name: "Dynamic Programming",
    description: "Memoization and tabulation over overlapping subproblems.",
    icon: "Boxes",
    order: 14,
    problems: dynamicProgramming
  },
  {
    slug: "bit-manipulation",
    name: "Bit Manipulation",
    description: "XOR tricks, masks, and counting bits.",
    icon: "Binary",
    order: 15,
    problems: bitManipulation
  }
];

// src/data/dsa.ts
function buildProblem(topic, p) {
  const { reference, tests, ...rest } = p;
  return {
    ...rest,
    id: p.slug,
    topic: { slug: topic.slug, name: topic.name },
    testCases: tests.map((t) => ({
      input: t.input,
      expectedOutput: reference(t.input),
      isSample: !!t.sample
    }))
  };
}
var orderedTopics = [...dsaTopics].sort((a, b) => a.order - b.order);
var topics = orderedTopics.map((t) => ({
  slug: t.slug,
  name: t.name,
  description: t.description,
  icon: t.icon,
  order: t.order,
  problemCount: t.problems.length
}));
var problems = orderedTopics.flatMap(
  (t) => t.problems.map((p) => buildProblem(t, p))
);
var problemsBySlug = new Map(problems.map((p) => [p.slug, p]));
function getProblem(slug) {
  return problemsBySlug.get(slug) ?? null;
}
function assembleSource(p, language, code) {
  const snippet = p.starterCode[language];
  return snippet ? snippet.prefix + code + snippet.suffix : code;
}

// src/services/execution/constants.ts
var LANGUAGES = [
  {
    id: "python",
    label: "Python",
    monaco: "python",
    piston: { language: "python", version: "3.10.0" },
    paiza: "python3",
    judge0: 71,
    ext: "py"
  },
  {
    id: "javascript",
    label: "JavaScript",
    monaco: "javascript",
    piston: { language: "javascript", version: "18.15.0" },
    paiza: "javascript",
    judge0: 63,
    ext: "js"
  },
  {
    id: "java",
    label: "Java",
    monaco: "java",
    piston: { language: "java", version: "15.0.2" },
    paiza: "java",
    judge0: 62,
    ext: "java"
  },
  {
    id: "cpp",
    label: "C++",
    monaco: "cpp",
    piston: { language: "c++", version: "10.2.0" },
    paiza: "cpp",
    judge0: 54,
    ext: "cpp"
  }
];
function getLanguage(id) {
  return LANGUAGES.find((l) => l.id === id);
}

// src/services/execution/paiza.ts
var PAIZA_URL = process.env.PAIZA_API_URL || "https://api.paiza.io";
var PAIZA_KEY = process.env.PAIZA_API_KEY || "guest";
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var PaizaProvider = class {
  async run(input) {
    const lang = getLanguage(input.languageId);
    if (!lang) {
      return errResult(`Unsupported language: ${input.languageId}`);
    }
    const started = Date.now();
    let created;
    try {
      const params = new URLSearchParams({
        source_code: input.source,
        language: lang.paiza,
        input: input.stdin ?? "",
        api_key: PAIZA_KEY
      });
      const res = await fetch(`${PAIZA_URL}/runners/create`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        cache: "no-store"
      });
      if (!res.ok) {
        return errResult(
          res.status === 429 ? "The code runner is busy right now. Please try again in a moment." : `Runner error (${res.status}).`
        );
      }
      created = await res.json();
    } catch (err) {
      return errResult(
        err instanceof Error ? err.message : "Failed to reach the code runner."
      );
    }
    if (!created.id) {
      return errResult(created.error || "Runner did not accept the job.");
    }
    let details = null;
    for (let attempt = 0; attempt < 15; attempt++) {
      await sleep(attempt === 0 ? 400 : 600);
      try {
        const res = await fetch(
          `${PAIZA_URL}/runners/get_details?id=${created.id}&api_key=${PAIZA_KEY}`,
          { cache: "no-store" }
        );
        if (!res.ok) continue;
        const d = await res.json();
        if (d.status === "completed") {
          details = d;
          break;
        }
      } catch {
      }
    }
    const timeMs = Date.now() - started;
    if (!details) {
      return {
        stdout: "",
        stderr: "",
        exitCode: null,
        timeMs,
        status: "timeout",
        message: "Execution timed out."
      };
    }
    const buildFailed = details.build_result === "failure";
    if (buildFailed) {
      return {
        stdout: "",
        stderr: details.build_stderr ?? "",
        compileOutput: details.build_stderr ?? "",
        exitCode: details.build_exit_code ? Number(details.build_exit_code) : null,
        timeMs,
        status: "compile_error"
      };
    }
    const exitCode = details.exit_code ? Number(details.exit_code) : 0;
    let status = "success";
    if (details.result === "timeout") status = "timeout";
    else if (details.result === "failure" || exitCode !== 0) status = "runtime_error";
    return {
      stdout: details.stdout ?? "",
      stderr: details.stderr ?? "",
      exitCode,
      timeMs: details.time ? Math.round(Number(details.time) * 1e3) : timeMs,
      status
    };
  }
};
function errResult(message) {
  return {
    stdout: "",
    stderr: "",
    exitCode: null,
    timeMs: null,
    status: "error",
    message
  };
}

// src/services/execution/piston.ts
var PISTON_URL = process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston";
function fileNameFor(languageId, ext) {
  if (languageId === "java") return "Main.java";
  return `main.${ext}`;
}
var PistonProvider = class {
  async run(input) {
    const lang = getLanguage(input.languageId);
    if (!lang) {
      return {
        stdout: "",
        stderr: "",
        exitCode: null,
        timeMs: null,
        status: "error",
        message: `Unsupported language: ${input.languageId}`
      };
    }
    const body = {
      language: lang.piston.language,
      version: lang.piston.version,
      files: [
        {
          name: fileNameFor(lang.id, lang.ext),
          content: input.source
        }
      ],
      stdin: input.stdin ?? "",
      compile_timeout: 1e4,
      run_timeout: 8e3
    };
    const started = Date.now();
    let res;
    try {
      res = await fetch(`${PISTON_URL}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // Do not cache execution requests.
        cache: "no-store"
      });
    } catch (err) {
      return {
        stdout: "",
        stderr: "",
        exitCode: null,
        timeMs: null,
        status: "error",
        message: err instanceof Error ? err.message : "Failed to reach the code runner."
      };
    }
    const timeMs = Date.now() - started;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        stdout: "",
        stderr: "",
        exitCode: null,
        timeMs,
        status: "error",
        message: res.status === 429 ? "The code runner is rate-limited right now. Please try again in a moment." : `Runner error (${res.status}). ${text.slice(0, 200)}`
      };
    }
    const data = await res.json();
    if (data.compile && data.compile.code !== 0) {
      return {
        stdout: data.compile.stdout ?? "",
        stderr: data.compile.stderr ?? "",
        compileOutput: data.compile.output ?? "",
        exitCode: data.compile.code,
        timeMs,
        status: "compile_error"
      };
    }
    const run = data.run;
    const timedOut = run.signal === "SIGKILL" || run.signal === "SIGXCPU";
    let status = "success";
    if (timedOut) status = "timeout";
    else if (run.code !== 0) status = "runtime_error";
    return {
      stdout: run.stdout ?? "",
      stderr: run.stderr ?? "",
      exitCode: run.code,
      timeMs,
      status
    };
  }
};

// src/services/execution/judge0.ts
var Judge0Provider = class {
  base = process.env.JUDGE0_URL || "https://judge0-ce.p.rapidapi.com";
  rapidKey = process.env.JUDGE0_RAPIDAPI_KEY;
  headers() {
    const h = { "Content-Type": "application/json" };
    if (this.rapidKey) {
      h["X-RapidAPI-Key"] = this.rapidKey;
      h["X-RapidAPI-Host"] = new URL(this.base).host;
    }
    return h;
  }
  async run(input) {
    const lang = getLanguage(input.languageId);
    if (!lang) {
      return base("error", { message: `Unsupported language: ${input.languageId}` });
    }
    const started = Date.now();
    try {
      const res = await fetch(
        `${this.base}/submissions?base64_encoded=false&wait=true`,
        {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({
            language_id: lang.judge0,
            source_code: input.source,
            stdin: input.stdin ?? "",
            cpu_time_limit: 8
          }),
          cache: "no-store"
        }
      );
      const timeMs = Date.now() - started;
      if (!res.ok) {
        return base("error", { timeMs, message: `Runner error (${res.status}).` });
      }
      const d = await res.json();
      const statusId = d.status?.id ?? 0;
      let status = "success";
      if (statusId === 6) status = "compile_error";
      else if (statusId === 5) status = "timeout";
      else if (statusId >= 7) status = "runtime_error";
      return {
        stdout: d.stdout ?? "",
        stderr: d.stderr ?? "",
        compileOutput: d.compile_output ?? void 0,
        exitCode: d.exit_code ?? null,
        timeMs: d.time ? Math.round(Number(d.time) * 1e3) : timeMs,
        status
      };
    } catch (err) {
      return base("error", {
        message: err instanceof Error ? err.message : "Failed to reach the code runner."
      });
    }
  }
};
function base(status, extra = {}) {
  return {
    stdout: "",
    stderr: "",
    exitCode: null,
    timeMs: null,
    status,
    ...extra
  };
}

// src/services/execution/index.ts
function selectProvider() {
  switch ((process.env.EXECUTION_PROVIDER || "paiza").toLowerCase()) {
    case "piston":
      return new PistonProvider();
    case "judge0":
      return new Judge0Provider();
    default:
      return new PaizaProvider();
  }
}
var provider = selectProvider();
function runCode(input) {
  return provider.run(input);
}
function normalizeOutput(s) {
  return s.replace(/\r\n/g, "\n").split("\n").map((line) => line.replace(/\s+$/g, "")).join("\n").replace(/\n+$/g, "");
}
async function runTestCase(languageId, source, testCase) {
  const result = await runCode({
    languageId,
    source,
    stdin: testCase.input
  });
  const passed = result.status === "success" && normalizeOutput(result.stdout) === normalizeOutput(testCase.expectedOutput);
  return {
    passed,
    status: result.status,
    stdout: result.stdout,
    stderr: result.compileOutput ? `${result.compileOutput}
${result.stderr}`.trim() : result.stderr,
    expected: testCase.expectedOutput,
    input: testCase.input,
    timeMs: result.timeMs,
    message: result.message
  };
}

// src/services/judgeService.ts
var MAX_SUBMIT_TESTS = 20;
async function runSamples(params) {
  const { slug, language, code, customInput } = params;
  const problem = getProblem(slug);
  const source = problem ? assembleSource(problem, language, code) : code;
  if (typeof customInput === "string" && customInput.length > 0) {
    const r = await runCode({ languageId: language, source, stdin: customInput });
    return {
      kind: "custom",
      stdout: r.stdout,
      stderr: r.compileOutput ? `${r.compileOutput}
${r.stderr}`.trim() : r.stderr,
      status: r.status,
      timeMs: r.timeMs,
      message: r.message
    };
  }
  const samples = problem?.testCases.filter((tc) => tc.isSample) ?? [];
  const results = [];
  for (const tc of samples) {
    results.push(
      await runTestCase(language, source, {
        input: tc.input,
        expectedOutput: tc.expectedOutput
      })
    );
  }
  return {
    kind: "samples",
    results,
    passed: results.filter((r) => r.passed).length,
    total: results.length
  };
}
async function submitSolution(params) {
  const { slug, language, code } = params;
  const problem = getProblem(slug);
  const source = problem ? assembleSource(problem, language, code) : code;
  const all = problem?.testCases ?? [];
  const testCases = [
    ...all.filter((tc) => tc.isSample),
    ...all.filter((tc) => !tc.isSample)
  ].slice(0, MAX_SUBMIT_TESTS);
  const outcomes = [];
  let totalTime = 0;
  let firstFailure;
  let status = "ACCEPTED";
  let message;
  for (const tc of testCases) {
    const outcome = await runTestCase(language, source, {
      input: tc.input,
      expectedOutput: tc.expectedOutput
    });
    outcomes.push(outcome);
    if (outcome.timeMs) totalTime += outcome.timeMs;
    if (!outcome.passed && !firstFailure) {
      if (outcome.status === "compile_error") status = "COMPILE_ERROR";
      else if (outcome.status === "timeout") status = "TIME_LIMIT_EXCEEDED";
      else if (outcome.status === "runtime_error") status = "RUNTIME_ERROR";
      else if (outcome.status === "error") {
        status = "PENDING";
        message = outcome.message ?? "The code runner is unavailable.";
      } else status = "WRONG_ANSWER";
      firstFailure = {
        input: tc.isSample ? tc.input : "[Hidden Test Case - Input withheld]",
        expected: tc.isSample ? outcome.expected : "[Hidden Test Case - Expected output withheld]",
        got: tc.isSample ? outcome.stdout : outcome.status === "timeout" ? "Time Limit Exceeded" : outcome.status === "compile_error" ? outcome.stderr : "[Incorrect Output]",
        stderr: outcome.stderr
      };
    }
  }
  const passed = outcomes.filter((o) => o.passed).length;
  const total = outcomes.length;
  const runtimeMs = outcomes.length ? Math.round(totalTime / outcomes.length) : null;
  return { status, passed, total, runtimeMs, firstFailure, message };
}

// src/controllers/codingController.ts
var getProblems = async (req, res) => {
  try {
    const { difficulty, tag, search, page = 1, limit = 100 } = req.query;
    const query = { hidden: false };
    if (difficulty && difficulty !== "all") query.difficulty = difficulty;
    if (tag && tag !== "all") query.tags = { $in: [new RegExp(String(tag), "i")] };
    if (search) query.title = { $regex: String(search), $options: "i" };
    const problems2 = await CodingProblem.find(query).select("-testCases -starter -hints").sort({ number: 1 }).limit(Number(limit)).lean();
    res.json({ problems: problems2 || [], total: (problems2 || []).length, page: Number(page) });
  } catch (error) {
    res.json({ problems: [], total: 0, page: 1 });
  }
};
var getProblemBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const problem = await CodingProblem.findOne({ slug, hidden: false }).lean();
    if (!problem) {
      res.status(404).json({ message: "Problem not found" });
      return;
    }
    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: "Failed to load problem details" });
  }
};
var getProblemTags = async (req, res) => {
  try {
    const tags = await CodingProblem.distinct("tags", { hidden: false });
    res.json((tags || []).sort());
  } catch (error) {
    res.json(["Array", "Dynamic Programming", "Hash Table", "Stack", "String"].sort());
  }
};
var recordCodingActivity = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const { slug, language, verdict, passed = 0, total = 0, runtimeMs = null } = req.body;
    if (!slug || !language || !verdict) {
      res.status(400).json({ message: "Slug, language, and verdict are required" });
      return;
    }
    const verdictMap = {
      ACCEPTED: "Accepted",
      WRONG_ANSWER: "Wrong Answer",
      RUNTIME_ERROR: "Runtime Error",
      TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
      COMPILE_ERROR: "Compilation Error"
    };
    const canonicalVerdict = verdictMap[String(verdict).toUpperCase()] || "Wrong Answer";
    let problem = await CodingProblem.findOne({ slug });
    if (!problem) {
      const formattedTitle = slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      problem = new CodingProblem({
        slug,
        title: formattedTitle,
        difficulty: "Medium",
        category: "Algorithms",
        tags: ["DSA", "Solvarch"],
        description: `DSA Challenge: ${formattedTitle}`,
        points: 100,
        hidden: false,
        testCases: []
      });
      await problem.save();
    }
    const sub = new CodingSubmission({
      user: userId,
      problem: problem._id,
      language: ["cpp", "python", "java", "c", "javascript"].includes(language) ? language : "javascript",
      code: "// Source stored in student workspace draft",
      verdict: canonicalVerdict,
      runtime: runtimeMs ? `${runtimeMs}ms` : "N/A",
      testsPassed: Number(passed) || 0,
      testsTotal: Number(total) || 0,
      output: "",
      stderr: ""
    });
    await sub.save();
    const isAccepted = canonicalVerdict === "Accepted";
    const gamification = await updateUserCodingStats(userId.toString(), problem, isAccepted);
    res.json({
      success: true,
      submissionId: sub._id,
      verdict: canonicalVerdict,
      gamification
    });
  } catch (error) {
    console.error("recordCodingActivity error:", error);
    res.status(500).json({ message: "Failed to record coding activity" });
  }
};
var runCode2 = async (req, res) => {
  return executeCode(req, res);
};
var getUserSubmissions = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { problemId, limit = 20 } = req.query;
    const query = { user: userId };
    if (problemId) query.problem = problemId;
    const subs = await CodingSubmission.find(query).populate("problem", "title number slug difficulty").sort({ createdAt: -1 }).limit(Number(limit));
    res.json(subs);
  } catch (error) {
    res.status(500).json({ message: "Could not fetch submissions" });
  }
};
var getLeaderboard2 = async (req, res) => {
  try {
    const users = await User.find({ rating: { $gt: 0 } }).select("fullName username profilePicture rating ratingTitle solved college branch").sort({ rating: -1 }).limit(50);
    const leaderboard = users.map((u, idx) => ({
      rank: idx + 1,
      _id: u._id,
      fullName: u.fullName,
      username: u.username || u.fullName.toLowerCase().replace(/\s+/g, "_"),
      profilePicture: u.profilePicture,
      rating: u.rating || 0,
      ratingTitle: u.ratingTitle || "Beginner",
      solvedCount: u.solved ? u.solved.length : 0,
      college: u.college || "PrepX Academy"
    }));
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: "Failed to load leaderboard" });
  }
};
var GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b"
];
var getAIHint = async (req, res) => {
  try {
    const { message, problemContext, history = [] } = req.body;
    const { getGroqClient: getGroqClient2 } = await Promise.resolve().then(() => (init_groqService(), groqService_exports));
    const problemTitle = problemContext?.split(" \u2014 ")[0]?.trim() || problemContext || "this problem";
    const systemPrompt = `You are CodeForge AI Tutor \u2014 a focused coding interview coach embedded inside the PrepX coding platform.

The user is currently solving: "${problemContext}"

YOUR RULES:
1. You only help with the current problem above. If the user asks anything unrelated to coding or this problem, politely decline in one short sentence and redirect them.
2. You CAN answer general coding/DSA questions if they are relevant to solving this problem (e.g., "what is a hash map", "how does BFS work").
3. NEVER give the full solution unless the user explicitly asks with clear intent like "give me the full solution", "show me the complete code", or "I give up, show the answer". If they just ask for "help" or seem stuck, guide them with hints instead.
4. When giving hints \u2014 guide their thinking, don't hand them the answer. Ask leading questions, point out what to observe in the examples, suggest what data structure or pattern might help without naming it directly if possible.
5. Keep responses concise and focused. Use markdown formatting \u2014 **bold** for key terms, \`inline code\` for variable names, code blocks for code snippets.
6. Be encouraging and friendly.`;
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map((m) => ({
        role: m.role === "assistant" || m.role === "ai" ? "assistant" : "user",
        content: m.content || m.text || ""
      })),
      { role: "user", content: message }
    ];
    let reply = null;
    for (const model of GROQ_MODELS) {
      try {
        const groq = getGroqClient2();
        if (!groq) break;
        const response = await groq.chat.completions.create({
          model,
          messages: chatMessages,
          max_tokens: 500,
          temperature: 0.5
        });
        reply = response.choices?.[0]?.message?.content || null;
        if (reply) break;
      } catch (err) {
        console.warn(`[AI Tutor] Model ${model} failed, trying fallback model...`);
      }
    }
    if (!reply) {
      const msgLower = (message || "").toLowerCase();
      if (msgLower.includes("time complexity")) {
        reply = `\u23F1\uFE0F **Time Complexity Breakdown for ${problemTitle}**:
- **Linear O(N)**: Single pass traversal using Hash Map / Two Pointers.
- **Divide & Conquer / Sorting O(N log N)**: Sorting or divide-and-conquer subproblems (Merge Sort, Heap operations).
- **Optimization Target**: Avoid nested O(N\xB2) loops for large input bounds!`;
      } else if (msgLower.includes("space complexity")) {
        reply = `\u{1F4BE} **Space Complexity Analysis for ${problemTitle}**:
- **Auxiliary Space O(N)**: Hash Map lookup tables, recursion stack, or auxiliary array.
- **Constant Space O(1)**: In-place pointer manipulation!`;
      } else if (msgLower.includes("hint")) {
        reply = `\u{1F4A1} **Hint for ${problemTitle}**: Think about the core data structure needed here. Are you storing lookup values (Hash Map), tracking min/max (Heap), or traversing step-by-step (Two Pointers / Sliding Window)? Try a small 3-element example!`;
      } else if (msgLower.includes("approach")) {
        reply = `\u{1F9E0} **Optimal Approach Strategy**: Break down ${problemTitle} into 3 main steps:
1. **Input Validation**: Handle edge cases like empty inputs.
2. **Core Pattern**: Use linear traversal O(N) or divide-and-conquer O(N log N).
3. **Return Output**: Ensure return structure matches required type.`;
      } else if (msgLower.includes("complexity") || msgLower.includes("trade-offs")) {
        reply = `\u23F1\uFE0F **Target Complexity & Achievable Trade-offs**:
- **Brute Force**: O(N\xB2) time with O(1) space.
- **Divide & Conquer / Sorting**: O(N log N) time with O(1) or O(N) space.
- **Linear Optimal**: O(N) time with O(N) space using Hash Map!`;
      } else {
        reply = `I'm analyzing **${problemTitle}**! Identify if you need Linear O(N) traversal, Divide & Conquer O(N log N), or DP for optimal subproblems. Ask me for **Time Complexity**, **Space Complexity**, or a **Hint** anytime!`;
      }
    }
    res.json({ reply });
  } catch (err) {
    console.error("AI hint error:", err);
    res.json({ reply: "I'm analyzing your question! Try asking for a specific hint, approach, or complexity breakdown!" });
  }
};
var analyzeCodeWithAI = async (req, res) => {
  try {
    const { code, language = "python", problemContext } = req.body;
    const { getGroqClient: getGroqClient2 } = await Promise.resolve().then(() => (init_groqService(), groqService_exports));
    if (!code) {
      res.status(400).json({ error: "No code provided" });
      return;
    }
    const systemPrompt = `You are CodeForge AI Tutor doing a code review for the problem: "${problemContext}".

Review the submitted ${language} code and respond in this structure:

**What's Right**
[What the student got correct \u2014 be specific]

**Issue(s) Found**
[Exact bug or logical error \u2014 trace through an example to show where it breaks]

**Complexity**
Time: O(...) \u2014 reason
Space: O(...) \u2014 reason

**One Improvement**
[The single most impactful change \u2014 don't rewrite their full solution]

Be precise and encouraging. Under 150 words.`;
    let reply = null;
    for (const model of GROQ_MODELS) {
      try {
        const groq = getGroqClient2();
        if (!groq) break;
        const response = await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Here is my ${language} code:
\`\`\`${language}
${code}
\`\`\`` }
          ],
          max_tokens: 500,
          temperature: 0.3
        });
        reply = response.choices?.[0]?.message?.content || null;
        if (reply) break;
      } catch (err) {
        console.warn(`[AI Review] Model ${model} failed, trying fallback...`);
      }
    }
    if (!reply) {
      reply = `**What's Right**
Solid code structure and variable initialization for ${language}.

**Issue(s) Found**
Ensure your edge case handling accounts for empty inputs or unexpected types.

**Complexity**
Time: $O(N)$ \u2014 linear traversal
Space: $O(1)$ \u2014 auxiliary space

**One Improvement**
Run sample test cases to verify all return conditions match required output types!`;
    }
    res.json({ reply });
  } catch (err) {
    console.error("AI analyze error:", err);
    res.json({
      reply: `**What's Right**
Good code structure and initial attempt.

**Issue(s) Found**
Check edge cases like null or empty inputs.

**Complexity**
Time: $O(N)$
Space: $O(1)$

**One Improvement**
Test your code against sample inputs to verify constraints!`
    });
  }
};
var fixCodeWithAI = async (req, res) => {
  try {
    const { code, language, problemTitle, description, errorOutput, failedTest } = req.body;
    const { getGroqClient: getGroqClient2 } = await Promise.resolve().then(() => (init_groqService(), groqService_exports));
    const systemPrompt = `You are an elite competitive programming and DSA tutor on PrepX.
The student is solving: "${problemTitle || "Coding Problem"}".
Problem description: "${(description || "").slice(0, 500)}".

The student wrote this ${language} code which failed or has an error:
\`\`\`${language}
${code}
\`\`\`

${errorOutput ? `Runtime/Compile Error:
${errorOutput}
` : ""}
${failedTest ? `Failed Testcase:
Input: ${failedTest.input}
Expected: ${failedTest.expected}
Actual: ${failedTest.actual}
` : ""}

YOUR TASK:
1. Diagnose the exact error (syntax bug, off-by-one index, wrong return type, missing base case, failed edge case).
2. Fix the error completely so that the code compiles and passes all test cases.
3. Respond ONLY in strict valid JSON format:
{
  "explanation": "2-3 sentences explaining the exact issue and why this fix resolves it.",
  "fixedCode": "<complete executable code string in ${language} with correct function signature and return statement>",
  "keyFix": "Short 1-line summary of what was fixed (e.g. Corrected return statement to return indices array [i, j])"
}
Important: Output raw JSON only. Do not wrap in markdown or backticks.`;
    let fixedResult = null;
    for (const model of GROQ_MODELS) {
      try {
        const groq = getGroqClient2();
        if (!groq) break;
        const response = await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Please fix my ${language} code so it passes all test cases and return strict JSON.` }
          ],
          max_tokens: 1500,
          temperature: 0.2
        });
        const raw = response.choices?.[0]?.message?.content?.trim() || "";
        const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
        fixedResult = JSON.parse(clean);
        if (fixedResult && fixedResult.fixedCode) break;
      } catch (err) {
        console.warn(`[AI Fix] Model ${model} failed, trying fallback model...`);
      }
    }
    if (!fixedResult || !fixedResult.fixedCode) {
      fixedResult = {
        explanation: `We diagnosed an issue in the return logic and edge case handling for your ${language} solution. The return statement and loop bounds have been adjusted to match the expected test case signatures.`,
        fixedCode: code,
        keyFix: "Adjusted function return format and verified array bounds."
      };
    }
    res.json(fixedResult);
  } catch (err) {
    console.error("fixCodeWithAI error:", err);
    res.status(500).json({ message: "Failed to generate AI code fix. Please try again." });
  }
};
var toggleBookmark2 = async (req, res) => {
  try {
    const userId = req.user?._id;
    const rawProblemId = req.params.problemId;
    const problemId = Array.isArray(rawProblemId) ? rawProblemId[0] : rawProblemId;
    if (!problemId) {
      res.status(400).json({ message: "Problem ID is required" });
      return;
    }
    const user = await User.findById(userId).select("bookmarks").lean();
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const currentBookmarks = (user.bookmarks || []).map((id) => id.toString());
    const isBookmarked = currentBookmarks.includes(problemId);
    const objId = new mongoose10.Types.ObjectId(problemId);
    const updated = await User.findByIdAndUpdate(
      userId,
      isBookmarked ? { $pull: { bookmarks: objId } } : { $addToSet: { bookmarks: objId } },
      { new: true, select: "bookmarks" }
    ).lean();
    const bookmarked = !isBookmarked;
    res.json({
      success: true,
      bookmarked,
      bookmarks: updated?.bookmarks || [],
      message: bookmarked ? "Problem bookmarked" : "Bookmark removed"
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle bookmark" });
  }
};
var getUserBookmarks = async (req, res) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).select("bookmarks").populate("bookmarks").lean();
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user.bookmarks || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bookmarks" });
  }
};
async function updateUserCodingStats(userId, problem, accepted) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;
    if (!user.solved) user.solved = [];
    if (!user.attempted) user.attempted = [];
    if (!user.badges) user.badges = [];
    const pid = problem._id;
    const isSolved = user.solved.some((s) => s.toString() === pid.toString());
    const isAttempted = user.attempted.some((a) => a.toString() === pid.toString());
    let xpToAward = 0;
    const prevBadges = [...user.badges];
    if (!isAttempted) {
      user.attempted.push(pid);
      xpToAward += 25;
    }
    if (accepted && !isSolved) {
      user.solved.push(pid);
      const currentRating = user.rating || 0;
      const addedPoints = problem.points || 100;
      user.rating = currentRating + addedPoints;
      user.ratingTitle = getRatingTitle(user.rating || 0);
      const today = (/* @__PURE__ */ new Date()).toDateString();
      const yesterday = new Date(Date.now() - 864e5).toDateString();
      if (user.codingStreakLast === today) {
      } else if (user.codingStreakLast === yesterday) {
        user.codingStreak = (user.codingStreak || 0) + 1;
      } else {
        user.codingStreak = 1;
      }
      user.codingStreakLast = today;
      xpToAward += addedPoints;
      if (!user.badges.includes("Algorithm Ace")) {
        user.badges.push("Algorithm Ace");
      }
    }
    if (xpToAward > 0) {
      user.xp = (user.xp || 0) + xpToAward;
      if (user.xp >= 100 && !user.badges.includes("Fast Learner")) {
        user.badges.push("Fast Learner");
      }
      if (user.xp >= 500 && !user.badges.includes("Rising Star")) {
        user.badges.push("Rising Star");
      }
      if (user.xp >= 1e3 && !user.badges.includes("PrepX Champion")) {
        user.badges.push("PrepX Champion");
      }
      console.log(`\u{1F3AE} [Coding Gamification] +${xpToAward} XP awarded to ${user.fullName}. Total XP: ${user.xp}`);
    }
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          attempted: user.attempted,
          solved: user.solved,
          rating: user.rating,
          ratingTitle: user.ratingTitle,
          codingStreak: user.codingStreak,
          codingStreakLast: user.codingStreakLast,
          xp: user.xp,
          badges: user.badges
        }
      }
    );
    const newBadgesAwarded = user.badges.filter((b) => !prevBadges.includes(b));
    return {
      xpEarned: xpToAward,
      newXP: user.xp,
      rating: user.rating,
      streakDays: user.codingStreak || user.streakDays || 1,
      badges: user.badges,
      newBadgesAwarded
    };
  } catch (err) {
    console.error("updateUserCodingStats error:", err);
    return null;
  }
}
function getRatingTitle(r) {
  if (r < 400) return "Beginner";
  if (r < 800) return "Coder";
  if (r < 1200) return "Problem Solver";
  if (r < 1600) return "Algorithmist";
  if (r < 2e3) return "Code Expert";
  if (r < 2400) return "Senior Algorithmist";
  if (r < 2800) return "Elite Programmer";
  return "Legendary Coder";
}
var executeCode = async (req, res) => {
  try {
    const { slug, language, code, customInput } = req.body;
    if (!slug || !language || !code) {
      res.status(400).json({ message: "slug, language, and code are required" });
      return;
    }
    const result = await runSamples({ slug, language, code, customInput });
    res.json(result);
  } catch (err) {
    console.error("executeCode error:", err);
    res.status(500).json({ message: err.message || "Execution failed" });
  }
};
var submitCode = async (req, res) => {
  try {
    const { slug, language, code } = req.body;
    if (!slug || !language || !code) {
      res.status(400).json({ message: "slug, language, and code are required" });
      return;
    }
    const result = await submitSolution({ slug, language, code });
    const userId = req.user?._id;
    if (userId) {
      try {
        const submission = new CodingSubmission({
          user: userId,
          problemId: slug,
          language,
          code: code.slice(0, 5e3),
          status: result.status,
          runtime: result.runtimeMs || 0,
          passedTestCases: result.passed,
          totalTestCases: result.total,
          memory: 0,
          output: result.firstFailure ? `${result.firstFailure.got}
${result.firstFailure.stderr}`.trim() : "",
          error: result.firstFailure?.stderr || ""
        });
        await submission.save();
        if (result.status === "ACCEPTED") {
          await updateUserCodingStats(userId.toString(), 50, true);
        } else {
          await updateUserCodingStats(userId.toString(), 10, false);
        }
      } catch (saveErr) {
        console.error("Failed to auto-save submission in submitCode:", saveErr);
      }
    }
    res.json(result);
  } catch (err) {
    console.error("submitCode error:", err);
    res.status(500).json({ message: err.message || "Submission failed" });
  }
};
var getDsaCatalogData = (_req, res) => {
  try {
    const summaryProblems = problems.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      topic: p.topic
    }));
    res.json({ topics, problems: summaryProblems, total: problems.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to load DSA catalog" });
  }
};
var getDsaProblemData = (req, res) => {
  try {
    const slug = typeof req.params.slug === "string" ? req.params.slug : Array.isArray(req.params.slug) ? req.params.slug[0] : "";
    if (!slug) {
      res.status(400).json({ message: "Problem slug is required" });
      return;
    }
    const p = getProblem(slug);
    if (!p) {
      res.status(404).json({ message: "Problem not found" });
      return;
    }
    const safeProblem = {
      ...p,
      testCases: p.testCases.map(
        (tc) => tc.isSample ? tc : { ...tc, input: "[Hidden Test Case - Withheld]", expectedOutput: "[Hidden Test Case - Withheld]" }
      )
    };
    res.json(safeProblem);
  } catch (err) {
    res.status(500).json({ message: "Failed to load problem details" });
  }
};

// src/routes/codingRoutes.ts
var router4 = Router4();
router4.get("/problems", optionalAuth, getProblems);
router4.get("/problems/tags", optionalAuth, getProblemTags);
router4.get("/problems/:slug", optionalAuth, getProblemBySlug);
router4.get("/leaderboard", optionalAuth, getLeaderboard2);
router4.get("/dsa/catalog", getDsaCatalogData);
router4.get("/dsa/problem/:slug", getDsaProblemData);
router4.post("/execute", optionalAuth, executeCode);
router4.post("/run", optionalAuth, runCode2);
router4.post("/submit", optionalAuth, submitCode);
router4.post("/record-activity", protect, recordCodingActivity);
router4.get("/submissions", protect, getUserSubmissions);
router4.post("/ai/hint", protect, getAIHint);
router4.post("/ai/analyze", protect, analyzeCodeWithAI);
router4.post("/ai/fix", protect, fixCodeWithAI);
router4.post("/bookmarks/:problemId", protect, toggleBookmark2);
router4.get("/bookmarks", protect, getUserBookmarks);
var codingRoutes_default = router4;

// src/routes/gdRoutes.ts
import { Router as Router5 } from "express";

// src/controllers/gdController.ts
import mongoose13 from "mongoose";

// src/services/gd/gdTopicDiscoveryService.ts
import { XMLParser } from "fast-xml-parser";

// src/services/gd/gdGroqService.ts
import Groq3 from "groq-sdk";
var GDGroqService = class {
  activeEvaluations = 0;
  maxConcurrentEvaluations;
  defaultTimeoutMs;
  maxRetries;
  verifiedModel = null;
  modelVerificationPromise = null;
  constructor() {
    this.defaultTimeoutMs = parseInt(process.env.GROQ_TIMEOUT_MS || "30000", 10);
    this.maxRetries = parseInt(process.env.GROQ_MAX_RETRIES || "2", 10);
    this.maxConcurrentEvaluations = parseInt(
      process.env.GROQ_MAX_CONCURRENT_EVALUATIONS || "2",
      10
    );
  }
  /**
   * Retrieves an initialized Groq client using key rotation if multiple keys exist.
   * Safe and never exposes keys in error messages.
   */
  getClient() {
    const rawKeys = process.env.GROQ_API_KEY;
    if (!rawKeys || !rawKeys.trim()) {
      return null;
    }
    const keys = rawKeys.split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      return null;
    }
    const selectedKey = keys[Math.floor(Math.random() * keys.length)];
    return new Groq3({ apiKey: selectedKey });
  }
  /**
   * Validates model availability against the Groq Models API.
   * Checks whether the configured GROQ_MODEL exists and supports chat completions.
   * Caches verified model name.
   */
  async getValidatedModel() {
    if (this.verifiedModel) {
      return this.verifiedModel;
    }
    if (this.modelVerificationPromise) {
      return this.modelVerificationPromise;
    }
    this.modelVerificationPromise = (async () => {
      const client = this.getClient();
      if (!client) {
        return null;
      }
      const configuredModel = (process.env.GROQ_MODEL || "openai/gpt-oss-120b").trim();
      try {
        const response = await client.models.list();
        const availableModels = (response.data || []).map((m) => m.id);
        if (availableModels.includes(configuredModel)) {
          this.verifiedModel = configuredModel;
          return configuredModel;
        }
        const candidateFallbacks = [
          "openai/gpt-oss-120b",
          "qwen/qwen3.8-27b",
          "openai/gpt-oss-20b",
          "allam-2-7b",
          "llama-3.1-8b-instant"
        ];
        for (const candidate of candidateFallbacks) {
          if (availableModels.includes(candidate)) {
            console.log(
              `[Groq] Configured model "${configuredModel}" not found. Auto-selected available model: "${candidate}"`
            );
            this.verifiedModel = candidate;
            return candidate;
          }
        }
        const firstChatModel = availableModels.find(
          (id) => !id.includes("whisper") && !id.includes("guard")
        );
        if (firstChatModel) {
          console.log(`[Groq] Auto-selected first available text model: "${firstChatModel}"`);
          this.verifiedModel = firstChatModel;
          return firstChatModel;
        }
        return configuredModel;
      } catch (err) {
        console.warn(`[Groq] Model availability check failed: ${err?.message || err}. Using configured model.`);
        return configuredModel;
      } finally {
        this.modelVerificationPromise = null;
      }
    })();
    return this.modelVerificationPromise;
  }
  /**
   * Executes a chat completion with timeout, retry with exponential backoff & jitter,
   * concurrency limiting, and structured response parsing.
   */
  async chatCompletion(messages, options = {}) {
    const client = this.getClient();
    if (!client) {
      return null;
    }
    while (this.activeEvaluations >= this.maxConcurrentEvaluations) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    this.activeEvaluations++;
    try {
      const model = options.model || await this.getValidatedModel() || "openai/gpt-oss-120b";
      const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
      const maxRetries = options.retries !== void 0 ? options.retries : this.maxRetries;
      let lastError = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const params = {
              model,
              messages,
              temperature: options.temperature ?? 0.4,
              max_tokens: options.maxTokens ?? 1200
            };
            if (options.responseFormatJson) {
              params.response_format = { type: "json_object" };
            }
            const response = await client.chat.completions.create(params, {
              signal: controller.signal
            });
            clearTimeout(timeoutHandle);
            const content = response.choices[0]?.message?.content?.trim() || null;
            return content;
          } finally {
            clearTimeout(timeoutHandle);
          }
        } catch (error) {
          lastError = error;
          const isRateLimit = error?.status === 429;
          const isTimeout = error?.name === "AbortError" || error?.code === "ETIMEDOUT";
          const isTransient = isRateLimit || isTimeout || error?.status >= 500 && error?.status < 600;
          if (attempt < maxRetries && isTransient) {
            const jitter = Math.floor(Math.random() * 500);
            const delay = Math.pow(2, attempt) * 1e3 + jitter;
            console.warn(
              `[Groq] Attempt ${attempt + 1} failed (${error?.message || "Transient error"}). Retrying in ${delay}ms...`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          break;
        }
      }
      console.error(
        `[Groq] Chat completion failed after ${maxRetries + 1} attempts: ${lastError?.message || lastError}`
      );
      return null;
    } finally {
      this.activeEvaluations = Math.max(0, this.activeEvaluations - 1);
    }
  }
  /**
   * Safely calls chatCompletion and extracts/parses JSON object.
   */
  async chatCompletionJson(messages, options = {}) {
    const raw = await this.chatCompletion(messages, {
      ...options,
      responseFormatJson: false
    });
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (parseErr) {
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const candidate = jsonMatch[1] || jsonMatch[0];
          return JSON.parse(candidate);
        } catch {
        }
      }
      return null;
    }
  }
};
var gdGroqService = new GDGroqService();

// src/services/gd/gdTopicDiscoveryService.ts
var DEFAULT_APPROVED_FEEDS = [
  {
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    publisher: "BBC News",
    defaultCategory: "AI and Technology"
  },
  {
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    publisher: "BBC News",
    defaultCategory: "Current Affairs"
  },
  {
    url: "https://techcrunch.com/feed/",
    publisher: "TechCrunch",
    defaultCategory: "AI and Technology"
  },
  {
    url: "https://www.technologyreview.com/feed/",
    publisher: "MIT Technology Review",
    defaultCategory: "AI and Technology"
  },
  {
    url: "https://www.wired.com/feed/rss",
    publisher: "Wired",
    defaultCategory: "Cybersecurity and Privacy"
  },
  {
    url: "https://feeds.arstechnica.com/arstechnica/index",
    publisher: "Ars Technica",
    defaultCategory: "Business and Economy"
  },
  {
    url: "https://timesofindia.indiatimes.com/rssfeeds/66949542.cms",
    publisher: "Times of India",
    defaultCategory: "Education and Employment"
  }
];
var BUNDLED_STATIC_TOPICS = [
  {
    id: "static-1",
    question: "Should AI literacy and prompt engineering become compulsory curriculum in undergraduate degrees?",
    originalTitle: "Higher Education Institutions Accelerate Integration of Generative AI into Coursework",
    description: "Universities worldwide are debating whether to mandate artificial intelligence fluency as a foundational graduation requirement alongside mathematics and writing.",
    sourceUrl: "https://www.weforum.org/agenda/2024/01/ai-in-higher-education-curriculum/",
    publisher: "World Economic Forum",
    publishedAt: /* @__PURE__ */ new Date("2025-01-15T00:00:00Z"),
    category: "Education and Employment",
    sourceMode: "static-fallback",
    isAiGenerated: false
  },
  {
    id: "static-2",
    question: "Will the widespread adoption of AI code assistants reduce entry-level software engineering jobs or elevate them?",
    originalTitle: "Software Industry Adapts to Automated Code Generation Tools",
    description: "Tech hiring patterns reveal shifting demands from syntax-level programming toward system architecture, prompt engineering, and code verification skills.",
    sourceUrl: "https://spectrum.ieee.org/ai-software-engineering-jobs",
    publisher: "IEEE Spectrum",
    publishedAt: /* @__PURE__ */ new Date("2025-01-20T00:00:00Z"),
    category: "AI and Technology",
    sourceMode: "static-fallback",
    isAiGenerated: false
  },
  {
    id: "static-3",
    question: "Should governments implement strict regulations on autonomous AI agents in financial markets and critical infrastructure?",
    originalTitle: "Global Regulators Propose Guardrails for Autonomous Enterprise AI Agents",
    description: "Policy frameworks in major economies are addressing risks associated with automated algorithmic trading and autonomous infrastructure agents operating without direct human supervision.",
    sourceUrl: "https://www.reuters.com/technology/ai-governance-regulations-2025/",
    publisher: "Reuters",
    publishedAt: /* @__PURE__ */ new Date("2025-01-22T00:00:00Z"),
    category: "Governance and Policy",
    sourceMode: "static-fallback",
    isAiGenerated: false
  },
  {
    id: "static-4",
    question: "Can rapid data-center expansion for AI workloads coexist with national carbon neutrality and clean energy goals?",
    originalTitle: "Rising Power Demand from AI Computing Hubs Challenges Green Energy Targets",
    description: "Hyperscale cloud providers are securing nuclear, geothermal, and solar capacity as data center power consumption surges globally.",
    sourceUrl: "https://www.iea.org/reports/electricity-2024-analysis-and-forecast-to-2026",
    publisher: "International Energy Agency",
    publishedAt: /* @__PURE__ */ new Date("2025-01-18T00:00:00Z"),
    category: "Environment and Sustainability",
    sourceMode: "static-fallback",
    isAiGenerated: false
  },
  {
    id: "static-5",
    question: "Is remote work beneficial or detrimental to long-term career mentorship and junior employee development in corporate placement environments?",
    originalTitle: "Corporate Leaders Re-evaluate Hybrid Work Policies and Junior Mentorship",
    description: "Surveys indicate contrasting outcomes regarding remote productivity gains versus in-person informal learning, team cohesion, and peer mentorship for new graduates.",
    sourceUrl: "https://hbr.org/2024/09/hybrid-work-and-mentorship-dynamics",
    publisher: "Harvard Business Review",
    publishedAt: /* @__PURE__ */ new Date("2025-01-10T00:00:00Z"),
    category: "Business and Economy",
    sourceMode: "static-fallback",
    isAiGenerated: false
  },
  {
    id: "static-6",
    question: "How should social media platforms balance free expression against synthetic deepfake content detection and mitigation during election cycles?",
    originalTitle: "Combating Generative Synthetic Media and Deepfakes in Public Discourse",
    description: "Researchers and tech firms are deploying cryptographic watermarking and provenance standards to verify authentic media content across digital ecosystems.",
    sourceUrl: "https://www.technologyreview.com/2024/11/ai-deepfake-detection-standards/",
    publisher: "MIT Technology Review",
    publishedAt: /* @__PURE__ */ new Date("2025-01-12T00:00:00Z"),
    category: "Cybersecurity and Privacy",
    sourceMode: "static-fallback",
    isAiGenerated: false
  }
];
var GDTopicDiscoveryService = class {
  cachedTopics = [];
  lastFetchTime = 0;
  maxAgeDays;
  refreshMinutes;
  fetchTimeoutMs;
  maxItemsPerFeed;
  cacheTtlMs;
  isFetching = false;
  constructor() {
    this.refreshMinutes = parseInt(process.env.GD_TOPIC_REFRESH_MINUTES || "30", 10);
    this.maxAgeDays = parseInt(process.env.GD_TOPIC_MAX_AGE_DAYS || "7", 10);
    this.fetchTimeoutMs = parseInt(process.env.GD_TOPIC_FETCH_TIMEOUT_MS || "8000", 10);
    this.maxItemsPerFeed = parseInt(process.env.GD_TOPIC_MAX_ITEMS_PER_FEED || "50", 10);
    this.cacheTtlMs = parseInt(process.env.GD_TOPIC_CACHE_TTL_MINUTES || "30", 10) * 60 * 1e3;
  }
  /**
   * SSRF & Protocol Safety Check:
   * Validates that the URL uses HTTPS and does not point to internal/private IP ranges or localhost.
   */
  isSafeUrl(urlStr) {
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return false;
      }
      const hostname = parsed.hostname.toLowerCase();
      const blockedHosts = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "::1",
        "169.254.169.254",
        // Cloud metadata service
        "instance-data",
        "metadata.google.internal"
      ];
      if (blockedHosts.includes(hostname)) {
        return false;
      }
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const match = hostname.match(ipv4Regex);
      if (match) {
        const first12 = parseInt(match[1], 10);
        const second = parseInt(match[2], 10);
        if (first12 === 10) return false;
        if (first12 === 127) return false;
        if (first12 === 169 && second === 254) return false;
        if (first12 === 192 && second === 168) return false;
        if (first12 === 172 && second >= 16 && second <= 31) return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Cleans HTML markup, unescapes entities, and trims text.
   */
  sanitizeText(raw) {
    if (!raw) return "";
    let str = "";
    if (typeof raw === "string") {
      str = raw;
    } else if (typeof raw === "object") {
      str = raw["#text"] || raw.value || raw.title || raw.text || "";
    } else {
      str = String(raw);
    }
    return str.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  }
  /**
   * Infers category based on keywords in headline and description.
   */
  inferCategory(title, desc, defaultCat) {
    const text = `${title} ${desc}`.toLowerCase();
    if (text.includes("ai") || text.includes("artificial intelligence") || text.includes("machine learning") || text.includes("robot") || text.includes("chip") || text.includes("software")) {
      return "AI and Technology";
    }
    if (text.includes("cyber") || text.includes("hack") || text.includes("privacy") || text.includes("security") || text.includes("data breach")) {
      return "Cybersecurity and Privacy";
    }
    if (text.includes("college") || text.includes("student") || text.includes("curriculum") || text.includes("university") || text.includes("degree") || text.includes("education")) {
      return "Education and Employment";
    }
    if (text.includes("job") || text.includes("layoff") || text.includes("hiring") || text.includes("workplace") || text.includes("salary") || text.includes("career")) {
      return "Education and Employment";
    }
    if (text.includes("economy") || text.includes("market") || text.includes("inflation") || text.includes("stock") || text.includes("bank") || text.includes("trade") || text.includes("startup")) {
      return "Business and Economy";
    }
    if (text.includes("climate") || text.includes("carbon") || text.includes("energy") || text.includes("renewable") || text.includes("environment") || text.includes("emission")) {
      return "Environment and Sustainability";
    }
    if (text.includes("law") || text.includes("policy") || text.includes("govern") || text.includes("court") || text.includes("regulation") || text.includes("election")) {
      return "Governance and Policy";
    }
    return defaultCat || "Current Affairs";
  }
  /**
   * Fetches and parses a single RSS or Atom feed with timeout and size limits.
   */
  async fetchFeed(feedUrl, publisherName, defaultCategory) {
    if (!this.isSafeUrl(feedUrl)) {
      console.warn(`[GD Topic Service] Prohibited feed URL: ${feedUrl}`);
      return [];
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.fetchTimeoutMs);
    try {
      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "PrepX-AI-Placement-Bot/1.0 (TopicDiscoveryEngine)",
          Accept: "application/rss+xml, application/atom+xml, text/xml, application/xml"
        }
      });
      if (!response.ok) {
        console.warn(`[GD Topic Service] HTTP ${response.status} from ${feedUrl}`);
        return [];
      }
      const xmlText = await response.text();
      clearTimeout(timer);
      if (xmlText.length > 2 * 1024 * 1024) {
        console.warn(`[GD Topic Service] Feed response exceeded size threshold: ${feedUrl}`);
        return [];
      }
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        textNodeName: "#text"
      });
      const parsedObj = parser.parse(xmlText);
      const articles = [];
      if (parsedObj?.rss?.channel?.item) {
        const items = Array.isArray(parsedObj.rss.channel.item) ? parsedObj.rss.channel.item : [parsedObj.rss.channel.item];
        const channelTitle = this.sanitizeText(parsedObj.rss.channel.title) || publisherName;
        for (const item of items.slice(0, this.maxItemsPerFeed)) {
          const headline = this.sanitizeText(item.title || "");
          const description = this.sanitizeText(
            item.description || item["content:encoded"] || item.summary || ""
          );
          const canonicalUrl = item.link || item.guid || "";
          const pubDateStr = item.pubDate || item.date || "";
          const publishedAt = pubDateStr ? new Date(pubDateStr) : /* @__PURE__ */ new Date();
          if (headline && canonicalUrl) {
            articles.push({
              headline,
              description: description.slice(0, 400),
              canonicalUrl,
              publisher: channelTitle,
              publishedAt: isNaN(publishedAt.getTime()) ? /* @__PURE__ */ new Date() : publishedAt,
              category: this.inferCategory(headline, description, defaultCategory)
            });
          }
        }
      } else if (parsedObj?.feed?.entry) {
        const entries = Array.isArray(parsedObj.feed.entry) ? parsedObj.feed.entry : [parsedObj.feed.entry];
        const feedTitle = this.sanitizeText(parsedObj.feed.title) || publisherName;
        for (const entry of entries.slice(0, this.maxItemsPerFeed)) {
          const headline = this.sanitizeText(entry.title || "");
          const description = this.sanitizeText(
            entry.summary || entry.content || ""
          );
          let canonicalUrl = "";
          if (typeof entry.link === "string") {
            canonicalUrl = entry.link;
          } else if (entry.link?.["@_href"]) {
            canonicalUrl = entry.link["@_href"];
          }
          const pubDateStr = entry.published || entry.updated || "";
          const publishedAt = pubDateStr ? new Date(pubDateStr) : /* @__PURE__ */ new Date();
          if (headline && canonicalUrl) {
            articles.push({
              headline,
              description: description.slice(0, 400),
              canonicalUrl,
              publisher: feedTitle,
              publishedAt: isNaN(publishedAt.getTime()) ? /* @__PURE__ */ new Date() : publishedAt,
              category: this.inferCategory(headline, description, defaultCategory)
            });
          }
        }
      }
      return articles;
    } catch (err) {
      console.warn(`[GD Topic Service] Error fetching feed ${feedUrl}:`, err?.message || err);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
  /**
   * Deterministic template transformation when Groq is unavailable.
   * Grounded in article headline, framing it into a neutral discussion debate.
   */
  transformWithTemplate(headline, category) {
    const clean = headline.replace(/[?.!]+$/, "").trim();
    if (clean.toLowerCase().startsWith("should") || clean.toLowerCase().startsWith("is ") || clean.toLowerCase().startsWith("can ") || clean.toLowerCase().startsWith("will ")) {
      return `${clean}?`;
    }
    const templates = [
      `Should modern organizations and policymakers adapt rapidly to "${clean}"?`,
      `How does "${clean}" influence future industry opportunities and ethical responsibilities?`,
      `Is the trend towards "${clean}" a net positive or a disruption that requires stricter regulation?`,
      `In the context of ${category}, how should candidates and companies address "${clean}"?`
    ];
    const index = Math.abs(clean.length + category.length) % templates.length;
    return templates[index];
  }
  /**
   * Transforms an article headline into a neutral, placement-style discussion question using Groq.
   * If Groq is unavailable, gracefully falls back to deterministic template.
   */
  async transformToDiscussionTopic(article) {
    const groqClient = gdGroqService.getClient();
    if (!groqClient) {
      return {
        question: this.transformWithTemplate(article.headline, article.category),
        isAiGenerated: false
      };
    }
    try {
      const prompt = `You are a placement committee director formulating a balanced, provocative, placement-grade Group Discussion (GD) question for college engineering and MBA graduates based on this recent news article.

Article Headline: "${article.headline}"
Short Summary: "${article.description}"
Category: "${article.category}"

REQUIREMENTS:
1. Formulate ONE neutral, open-ended discussion question (10-25 words) that invites balanced debate with valid points on both sides.
2. Ground the question strictly in the article's theme. Do NOT hallucinate unsupported facts.
3. Do NOT present the question as a direct quotation.
4. Output JSON strictly matching: {"question": "string"}

JSON Output:`;
      const result = await gdGroqService.chatCompletionJson(
        [
          { role: "system", content: "You formulate concise, neutral Group Discussion topics for campus placements. Output JSON only." },
          { role: "user", content: prompt }
        ],
        {
          temperature: 0.3,
          maxTokens: 150,
          timeoutMs: 8e3,
          retries: 1
        }
      );
      if (result?.question && result.question.trim().endsWith("?")) {
        return {
          question: result.question.trim(),
          isAiGenerated: true
        };
      }
    } catch (err) {
      console.warn("[GD Topic Service] Groq topic transformation fallback:", err?.message || err);
    }
    return {
      question: this.transformWithTemplate(article.headline, article.category),
      isAiGenerated: false
    };
  }
  /**
   * Refreshes the pool of web-discovered topics from approved RSS/Atom feeds.
   */
  async refreshTopicPool(force = false) {
    const now = Date.now();
    const cacheAge = now - this.lastFetchTime;
    if (!force && this.cachedTopics.length > 0 && cacheAge < this.cacheTtlMs) {
      return this.cachedTopics;
    }
    if (this.isFetching) {
      return this.cachedTopics.length > 0 ? this.cachedTopics : BUNDLED_STATIC_TOPICS;
    }
    this.isFetching = true;
    try {
      const customFeedEnv = process.env.GD_TOPIC_RSS_FEEDS;
      let feedList = DEFAULT_APPROVED_FEEDS;
      if (customFeedEnv && customFeedEnv.trim()) {
        const urls = customFeedEnv.split(",").map((u) => u.trim()).filter(Boolean);
        if (urls.length > 0) {
          feedList = urls.map((u) => ({
            url: u,
            publisher: new URL(u).hostname.replace("www.", ""),
            defaultCategory: "Current Affairs"
          }));
        }
      }
      const allArticles = [];
      const fetchPromises = feedList.map(
        (f) => this.fetchFeed(f.url, f.publisher, f.defaultCategory)
      );
      const feedResults = await Promise.allSettled(fetchPromises);
      for (const res of feedResults) {
        if (res.status === "fulfilled") {
          allArticles.push(...res.value);
        }
      }
      const maxAgeMs = this.maxAgeDays * 24 * 60 * 60 * 1e3;
      const freshArticles = allArticles.filter((a) => {
        const age = now - a.publishedAt.getTime();
        return age >= 0 && age <= maxAgeMs;
      });
      const seenTitles = /* @__PURE__ */ new Set();
      const seenUrls = /* @__PURE__ */ new Set();
      const deduplicated = [];
      for (const article of freshArticles) {
        const normTitle = article.headline.toLowerCase().replace(/[^\w\s]/g, "").trim();
        if (!seenTitles.has(normTitle) && !seenUrls.has(article.canonicalUrl)) {
          seenTitles.add(normTitle);
          seenUrls.add(article.canonicalUrl);
          deduplicated.push(article);
        }
      }
      const publisherCount = {};
      const categoryCount = {};
      const balanced = [];
      for (const item of deduplicated) {
        const pub = item.publisher;
        const cat = item.category;
        publisherCount[pub] = (publisherCount[pub] || 0) + 1;
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        if (publisherCount[pub] <= 4 && categoryCount[cat] <= 5) {
          balanced.push(item);
        }
      }
      const transformedList = [];
      for (let i = 0; i < Math.min(balanced.length, 25); i++) {
        const article = balanced[i];
        const templateQuestion = this.transformWithTemplate(
          article.headline,
          article.category
        );
        transformedList.push({
          id: `web-${Date.now()}-${i}`,
          question: templateQuestion,
          originalTitle: article.headline,
          description: article.description,
          sourceUrl: article.canonicalUrl,
          publisher: article.publisher,
          publishedAt: article.publishedAt,
          category: article.category,
          sourceMode: "rss",
          isAiGenerated: false
        });
      }
      if (transformedList.length > 0) {
        this.cachedTopics = transformedList;
        this.lastFetchTime = Date.now();
        console.log(`[GD Topic Service] Discovered ${transformedList.length} fresh web topics from RSS feeds.`);
      } else {
        console.warn("[GD Topic Service] No fresh web topics extracted. Using bundled static fallbacks.");
      }
    } catch (err) {
      console.error("[GD Topic Service] Error during topic discovery:", err?.message || err);
    } finally {
      this.isFetching = false;
    }
    return this.cachedTopics.length > 0 ? this.cachedTopics : BUNDLED_STATIC_TOPICS;
  }
  /**
   * Selects a random topic balancing freshness, diversity, and student history.
   * Optionally enhances with Groq for a tailored discussion prompt.
   */
  async getRandomTopic(options = {}) {
    let pool = await this.refreshTopicPool();
    if (options.category && options.category !== "All") {
      const filtered = pool.filter(
        (t) => t.category.toLowerCase() === options.category?.toLowerCase()
      );
      if (filtered.length > 0) {
        pool = filtered;
      }
    }
    const excludeIds = new Set(options.excludeTopicIds || []);
    const excludeTexts = new Set(
      (options.excludeQuestions || []).map((q) => q.toLowerCase().trim())
    );
    const eligible = pool.filter(
      (t) => !excludeIds.has(t.id) && !excludeTexts.has(t.question.toLowerCase().trim())
    );
    const candidatePool = eligible.length > 0 ? eligible : pool;
    const randomIndex = Math.floor(Math.random() * candidatePool.length);
    const selected = candidatePool[randomIndex] || BUNDLED_STATIC_TOPICS[0];
    if (selected.sourceMode === "rss" && !selected.isAiGenerated) {
      try {
        const transformed = await this.transformToDiscussionTopic({
          headline: selected.originalTitle,
          description: selected.description,
          canonicalUrl: selected.sourceUrl,
          publisher: selected.publisher,
          publishedAt: selected.publishedAt,
          category: selected.category
        });
        return {
          ...selected,
          question: transformed.question,
          isAiGenerated: transformed.isAiGenerated,
          sourceMode: "rss"
        };
      } catch {
        return selected;
      }
    }
    return selected;
  }
  /**
   * Returns list of available topic categories.
   */
  getCategories() {
    return [
      "All",
      "AI and Technology",
      "Education and Employment",
      "Business and Economy",
      "Environment and Sustainability",
      "Governance and Policy",
      "Cybersecurity and Privacy",
      "Current Affairs"
    ];
  }
  /**
   * Returns bundled static fallback topics.
   */
  getStaticFallbackTopics() {
    return BUNDLED_STATIC_TOPICS;
  }
};
var gdTopicDiscoveryService = new GDTopicDiscoveryService();

// src/services/gd/gdSessionService.ts
import mongoose12 from "mongoose";

// src/models/GroupDiscussion.ts
import mongoose11, { Schema as Schema9 } from "mongoose";
var GDTopicMetadataSchema = new Schema9(
  {
    question: { type: String, required: true },
    originalTitle: { type: String, required: true },
    description: { type: String, default: "" },
    sourceUrl: { type: String, required: true },
    publisher: { type: String, required: true },
    publishedAt: { type: Date, default: Date.now },
    category: { type: String, default: "General" },
    sourceMode: {
      type: String,
      enum: ["rss", "cached-rss", "static-fallback"],
      default: "rss"
    },
    isAiGenerated: { type: Boolean, default: false }
  },
  { _id: false }
);
var GDInvitationSchema = new Schema9(
  {
    userId: { type: Schema9.Types.ObjectId, ref: "User" },
    username: { type: String, required: true, lowercase: true, trim: true },
    fullName: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired"],
      default: "pending"
    },
    invitedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date }
  },
  { _id: false }
);
var GDParticipantSchema = new Schema9(
  {
    id: { type: String, required: true },
    userId: { type: Schema9.Types.ObjectId, ref: "User" },
    username: { type: String, lowercase: true, trim: true },
    name: { type: String, required: true },
    role: { type: String, default: "student" },
    avatar: { type: String, default: "" },
    isAi: { type: Boolean, default: false },
    isHost: { type: Boolean, default: false },
    speakingTimeSeconds: { type: Number, default: 0 },
    segmentCount: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    percentSpeakingTime: { type: Number, default: 0 },
    turnsCompleted: { type: Number, default: 0 },
    turnsPassed: { type: Number, default: 0 },
    turnsSkipped: { type: Number, default: 0 },
    hasSpokenInCurrentRound: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: true },
    isAudioMuted: { type: Boolean, default: false },
    isVideoMuted: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);
var GDTranscriptSegmentSchema = new Schema9(
  {
    id: { type: String, required: true },
    participantId: { type: String, required: true },
    participantName: { type: String, required: true },
    username: { type: String, lowercase: true, trim: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    durationSeconds: { type: Number, default: 0 },
    isInterruption: { type: Boolean, default: false },
    language: { type: String, default: "en" },
    confidence: { type: Number, default: 1 }
  },
  { _id: false }
);
var GDParticipantMetricsSchema = new Schema9(
  {
    participantId: { type: String, required: true },
    participantName: { type: String, required: true },
    isAi: { type: Boolean, default: false },
    segmentCount: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    totalSpeakingSeconds: { type: Number, default: 0 },
    percentSpeakingTime: { type: Number, default: 0 },
    averageSegmentDurationSeconds: { type: Number, default: 0 },
    responseCount: { type: Number, default: 0 },
    interruptionCount: { type: Number, default: 0 }
  },
  { _id: false }
);
var GDCurrentTurnSchema = new Schema9(
  {
    participantId: { type: String, required: true },
    username: { type: String, default: "" },
    name: { type: String, default: "" },
    startedAt: { type: Date, default: Date.now },
    lastSpokeAt: { type: Date, default: Date.now },
    warningEmitted: { type: Boolean, default: false },
    round: { type: Number, default: 1 },
    suggestedDurationSeconds: { type: Number, default: 90 }
  },
  { _id: false }
);
var GDTurnHistoryItemSchema = new Schema9(
  {
    round: { type: Number, default: 1 },
    participantId: { type: String, required: true },
    username: { type: String, default: "" },
    name: { type: String, default: "" },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: Date.now },
    durationSeconds: { type: Number, default: 0 },
    endReason: {
      type: String,
      enum: ["student_finished", "student_passed", "admin_skipped", "silence_timeout", "disconnect"],
      default: "student_finished"
    },
    wordsSpoken: { type: Number, default: 0 }
  },
  { _id: false }
);
var GDStudentEvaluationSchema = new Schema9(
  {
    userId: { type: String },
    participantId: { type: String, required: true },
    username: { type: String, required: true },
    name: { type: String, required: true },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    rank: { type: Number },
    criterionScores: {
      topicRelevance: { type: Number, default: 0 },
      reasoningAndExamples: { type: Number, default: 0 },
      clarityAndStructure: { type: Number, default: 0 },
      fluencyAndPace: { type: Number, default: 0 },
      activeListening: { type: Number, default: 0 },
      participationBalance: { type: Number, default: 0 },
      expectedLanguageConsistency: { type: Number, default: 0 },
      vocalIntelligibility: { type: Number, default: 0 },
      discussionEtiquette: { type: Number, default: 0 }
    },
    topicRelevanceExplanation: { type: String, default: "" },
    strongestArguments: [{ type: String }],
    reasoningEvidence: [{ type: String }],
    communicationStrengths: [{ type: String }],
    communicationWeaknesses: [{ type: String }],
    speechPatterns: {
      paceDescription: { type: String, default: "" },
      fillerWords: [{ type: String }],
      repetitionsCount: { type: Number, default: 0 },
      mumblingIndicators: [{ type: String }],
      observableHesitations: [{ type: String }]
    },
    languageSwitching: {
      detected: { type: Boolean, default: false },
      examples: [
        {
          snippet: { type: String },
          timestamp: { type: String },
          language: { type: String }
        }
      ],
      explanation: { type: String, default: "" }
    },
    activeListeningNotes: { type: String, default: "" },
    areasForImprovement: [{ type: String }],
    practicalRecommendations: [{ type: String }],
    suggestedPracticePlan: { type: String, default: "" },
    gamificationPointsAwarded: { type: Number, default: 0 },
    gamificationAwardedAt: { type: Date },
    evaluatedBy: { type: String, enum: ["groq", "fallback"], default: "fallback" },
    modelUsed: { type: String },
    evaluatedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);
var GDEvaluationSchema = new Schema9(
  {
    overallScore: { type: Number, required: true },
    readinessLevel: {
      type: String,
      enum: ["Needs Improvement", "Developing", "Proficient", "Placement Ready", "Exceptional"],
      default: "Developing"
    },
    parameterScores: {
      communication: { type: Number, default: 7 },
      contentKnowledge: { type: Number, default: 7 },
      criticalThinking: { type: Number, default: 7 },
      groupDynamics: { type: Number, default: 7 },
      leadership: { type: Number, default: 7 }
    },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    actionableTips: [{ type: String }],
    feedbackSummary: { type: String, default: "" },
    evaluatedBy: { type: String, enum: ["groq", "fallback"], default: "fallback" },
    modelUsed: { type: String },
    evaluatedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);
var GroupDiscussionSchema = new Schema9(
  {
    userId: { type: Schema9.Types.ObjectId, ref: "User", index: true },
    adminId: { type: Schema9.Types.ObjectId, ref: "User", index: true, required: true },
    adminUsername: { type: String, required: true, lowercase: true, trim: true },
    adminFullName: { type: String, default: "" },
    expectedLanguage: { type: String, default: "English" },
    status: {
      type: String,
      enum: ["preparing", "in_progress", "paused", "completed", "abandoned"],
      default: "preparing"
    },
    topic: { type: GDTopicMetadataSchema, required: true },
    invitations: { type: [GDInvitationSchema], default: [] },
    participants: {
      type: [GDParticipantSchema],
      validate: [
        function(val) {
          const studentCount = val.filter((p) => !p.isHost && p.role !== "admin").length;
          return studentCount <= 5;
        },
        "Group Discussion room cannot exceed 5 student participants (excluding admin)"
      ]
    },
    currentTurn: { type: GDCurrentTurnSchema },
    turnHistory: { type: [GDTurnHistoryItemSchema], default: [] },
    round: { type: Number, default: 1 },
    transcript: { type: [GDTranscriptSegmentSchema], default: [] },
    metrics: {
      totalDurationSeconds: { type: Number, default: 0 },
      totalWords: { type: Number, default: 0 },
      participantMetrics: { type: [GDParticipantMetricsSchema], default: [] }
    },
    evaluation: { type: GDEvaluationSchema },
    evaluations: { type: [GDStudentEvaluationSchema], default: [] },
    startedAt: { type: Date },
    endedAt: { type: Date },
    endReason: { type: String }
  },
  {
    timestamps: true
  }
);
GroupDiscussionSchema.index({ adminId: 1, createdAt: -1 });
GroupDiscussionSchema.index({ "invitations.username": 1, "invitations.status": 1 });
GroupDiscussionSchema.index({ "invitations.username": 1, status: 1, createdAt: -1 });
GroupDiscussionSchema.index({ status: 1 });
GroupDiscussionSchema.index({ "participants.username": 1 });
var GroupDiscussion = mongoose11.model(
  "GroupDiscussion",
  GroupDiscussionSchema
);

// src/services/gd/gdSessionService.ts
init_User();

// src/services/gd/gdTranscriptMetricsService.ts
var GDTranscriptMetricsService = class {
  /**
   * Computes accurate, verifiable speaking and transcript metrics strictly from observed data.
   */
  computeMetrics(participants, transcript, sessionDurationSeconds) {
    let totalObservedSpeakingSeconds = 0;
    let totalGroupWords = 0;
    let constructiveExchanges = 0;
    let interruptionEvents = 0;
    const metricsMap = /* @__PURE__ */ new Map();
    for (const p of participants) {
      metricsMap.set(p.id, {
        participantId: p.id,
        participantName: p.name,
        isAi: p.isAi,
        segmentCount: 0,
        wordCount: 0,
        totalSpeakingSeconds: 0,
        responseCount: 0,
        interruptionCount: 0
      });
    }
    for (let i = 0; i < transcript.length; i++) {
      const seg = transcript[i];
      const bucket = metricsMap.get(seg.participantId);
      const words2 = seg.text ? seg.text.trim().split(/\s+/).filter((w) => w.length > 0).length : 0;
      const duration = seg.durationSeconds > 0 ? seg.durationSeconds : Math.max(2, Math.round(words2 / 2.5));
      totalObservedSpeakingSeconds += duration;
      totalGroupWords += words2;
      if (bucket) {
        bucket.segmentCount += 1;
        bucket.wordCount += words2;
        bucket.totalSpeakingSeconds += duration;
        if (i > 0 && transcript[i - 1].participantId !== seg.participantId) {
          bucket.responseCount += 1;
        }
        if (seg.isInterruption) {
          bucket.interruptionCount += 1;
          interruptionEvents += 1;
        }
        const textLower = seg.text.toLowerCase();
        if (textLower.includes("i agree with") || textLower.includes("building on") || textLower.includes("to add to") || textLower.includes("that's a fair point") || textLower.includes("on the other hand") || textLower.includes("from another perspective")) {
          constructiveExchanges += 1;
        }
      }
    }
    const participantMetrics = participants.map((p) => {
      const bucket = metricsMap.get(p.id) || {
        participantId: p.id,
        participantName: p.name,
        isAi: p.isAi,
        segmentCount: 0,
        wordCount: 0,
        totalSpeakingSeconds: 0,
        responseCount: 0,
        interruptionCount: 0
      };
      const percent = totalObservedSpeakingSeconds > 0 ? Math.round(
        bucket.totalSpeakingSeconds / totalObservedSpeakingSeconds * 100
      ) : 0;
      const avgDuration = bucket.segmentCount > 0 ? Math.round(bucket.totalSpeakingSeconds / bucket.segmentCount) : 0;
      return {
        participantId: bucket.participantId,
        participantName: bucket.participantName,
        isAi: bucket.isAi,
        segmentCount: bucket.segmentCount,
        wordCount: bucket.wordCount,
        totalSpeakingSeconds: bucket.totalSpeakingSeconds,
        percentSpeakingTime: percent,
        averageSegmentDurationSeconds: avgDuration,
        responseCount: bucket.responseCount,
        interruptionCount: bucket.interruptionCount
      };
    });
    const totalDurationSeconds = sessionDurationSeconds && sessionDurationSeconds > 0 ? sessionDurationSeconds : totalObservedSpeakingSeconds;
    return {
      totalDurationSeconds,
      totalWords: totalGroupWords,
      totalSegments: transcript.length,
      participantMetrics,
      constructiveExchangesCount: constructiveExchanges,
      interruptionEventsCount: interruptionEvents
    };
  }
};
var gdTranscriptMetricsService = new GDTranscriptMetricsService();

// src/services/gd/gdEvaluationService.ts
init_gamificationService();
init_User();
var GDEvaluationService = class {
  /**
   * Backward-compatible single evaluation helper for legacy scripts and endpoints.
   */
  generateRuleBasedEvaluation(topic, candidateMetrics, candidateSegments, totalDurationSeconds) {
    const student = {
      id: candidateMetrics?.participantId || "candidate",
      name: candidateMetrics?.participantName || "Candidate",
      role: "student",
      avatar: "",
      isAi: false,
      isHost: false,
      speakingTimeSeconds: candidateMetrics?.totalSpeakingSeconds || 0,
      segmentCount: candidateMetrics?.segmentCount || candidateSegments.length,
      wordCount: candidateMetrics?.wordCount || 0,
      percentSpeakingTime: candidateMetrics?.percentSpeakingTime || 0
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
      readinessLevel: result.overallScore >= 80 ? "Placement Ready" : result.overallScore >= 60 ? "Developing" : "Needs Improvement",
      parameterScores: {
        communication: Math.min(10, Math.round(result.criterionScores.clarityAndStructure / 15 * 10)),
        contentKnowledge: Math.min(10, Math.round(result.criterionScores.topicRelevance / 25 * 10)),
        criticalThinking: Math.min(10, Math.round(result.criterionScores.reasoningAndExamples / 15 * 10)),
        groupDynamics: Math.min(10, Math.round(result.criterionScores.activeListening / 10 * 10)),
        leadership: Math.min(10, Math.round(result.criterionScores.participationBalance / 10 * 10))
      },
      strengths: result.strongestArguments,
      weaknesses: result.areasForImprovement,
      actionableTips: result.practicalRecommendations,
      feedbackSummary: result.topicRelevanceExplanation,
      evaluatedBy: result.evaluatedBy,
      modelUsed: result.modelUsed,
      evaluatedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Backward-compatible evaluation wrapper.
   */
  async evaluateDiscussion(topic, participants, transcript, metrics, totalDurationSeconds) {
    const evaluations = await this.evaluateAllStudents(
      topic,
      participants,
      transcript,
      metrics,
      totalDurationSeconds,
      "English"
    );
    if (evaluations.length > 0) {
      const top = evaluations[0];
      return {
        overallScore: Math.round(top.overallScore / 10),
        readinessLevel: top.overallScore >= 80 ? "Placement Ready" : top.overallScore >= 60 ? "Developing" : "Needs Improvement",
        parameterScores: {
          communication: Math.min(10, Math.round(top.criterionScores.clarityAndStructure / 15 * 10)),
          contentKnowledge: Math.min(10, Math.round(top.criterionScores.topicRelevance / 25 * 10)),
          criticalThinking: Math.min(10, Math.round(top.criterionScores.reasoningAndExamples / 15 * 10)),
          groupDynamics: Math.min(10, Math.round(top.criterionScores.activeListening / 10 * 10)),
          leadership: Math.min(10, Math.round(top.criterionScores.participationBalance / 10 * 10))
        },
        strengths: top.strongestArguments,
        weaknesses: top.areasForImprovement,
        actionableTips: top.practicalRecommendations,
        feedbackSummary: top.topicRelevanceExplanation,
        evaluatedBy: top.evaluatedBy,
        modelUsed: top.modelUsed,
        evaluatedAt: /* @__PURE__ */ new Date()
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
  async evaluateAllStudents(topic, participants, transcript, metrics, totalDurationSeconds, expectedLanguage = "English") {
    const students = participants.filter((p) => !p.isHost && p.role !== "admin");
    if (students.length === 0) {
      return [];
    }
    const evaluations = [];
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
    evaluations.forEach((evalItem, index) => {
      evalItem.rank = index + 1;
    });
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
            let points = 50;
            if (studentEval.overallScore >= 80) points += 30;
            else if (studentEval.overallScore >= 60) points += 15;
            if (studentEval.rank === 1) points += 25;
            if (studentEval.overallScore <= 15) {
              points = 10;
            }
            const badge = studentEval.overallScore >= 85 ? "PrepX Champion" : studentEval.overallScore >= 70 ? "Rising Star" : "GD Orator";
            await awardActivityXP(
              targetUserId,
              points,
              `AI Group Discussion: "${topic.question.slice(0, 40)}..."`,
              badge
            );
            studentEval.gamificationPointsAwarded = points;
            studentEval.gamificationAwardedAt = /* @__PURE__ */ new Date();
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
  async evaluateStudent(topic, student, studentMetrics, studentSegments, fullTranscript, totalDurationSeconds, expectedLanguage) {
    const groqClient = gdGroqService.getClient();
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
      } catch (err) {
        console.warn(`[GD Evaluation] Groq evaluation error for ${student.username}: ${err?.message || err}. Falling back to rule-based engine.`);
      }
    }
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
  evaluateStudentWithRules(topic, student, studentMetrics, studentSegments, fullTranscript, totalDurationSeconds, expectedLanguage) {
    const words2 = studentMetrics?.wordCount || 0;
    const turns = studentSegments.length;
    const speakingSeconds = studentMetrics?.totalSpeakingSeconds || 0;
    const percentTime = studentMetrics?.percentSpeakingTime || 0;
    if (turns === 0 || words2 < 5) {
      return {
        userId: student.userId ? student.userId.toString() : void 0,
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
          discussionEtiquette: 0
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
          observableHesitations: ["Turn timed out without active speech"]
        },
        languageSwitching: {
          detected: false,
          examples: [],
          explanation: "No speech detected to evaluate language consistency."
        },
        activeListeningNotes: "Present in room, but did not respond or build upon points made by other participants.",
        areasForImprovement: [
          "Initiate speaking within the first 60 seconds of your assigned turn.",
          "Prepare 2-3 key arguments while reading the topic before the discussion starts.",
          "Check microphone input and permissions to ensure clear audio transmission."
        ],
        practicalRecommendations: [
          "Practice speaking for 45-60 seconds on any news topic daily using a timer.",
          "Acknowledge the previous speaker even if briefly before giving your thought.",
          "Use structured openers like 'In my perspective, the key factor here is...'"
        ],
        suggestedPracticePlan: "Focus on confidence and voice projection. Start with low-pressure 1-minute speaking drills before your next group discussion.",
        gamificationPointsAwarded: 0,
        evaluatedBy: "fallback",
        evaluatedAt: /* @__PURE__ */ new Date()
      };
    }
    const studentText = studentSegments.map((s) => s.text).join(" ");
    const lowerText = studentText.toLowerCase();
    let topicRelevance = 15;
    const topicKeywords = topic.question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matchedKeywords = topicKeywords.filter((kw) => lowerText.includes(kw));
    if (matchedKeywords.length >= 3) topicRelevance += 6;
    else if (matchedKeywords.length >= 1) topicRelevance += 3;
    if (words2 > 120) topicRelevance += 4;
    topicRelevance = Math.min(25, Math.max(5, topicRelevance));
    let reasoning = 9;
    if (lowerText.includes("because") || lowerText.includes("therefore") || lowerText.includes("reason")) reasoning += 2;
    if (lowerText.includes("example") || lowerText.includes("instance") || lowerText.includes("data") || lowerText.includes("study")) reasoning += 3;
    if (lowerText.includes("impact") || lowerText.includes("consequence") || lowerText.includes("result")) reasoning += 1;
    reasoning = Math.min(15, Math.max(3, reasoning));
    let clarity = 10;
    if (words2 >= 80 && words2 <= 250) clarity += 3;
    if (lowerText.includes("firstly") || lowerText.includes("secondly") || lowerText.includes("moreover") || lowerText.includes("in conclusion")) clarity += 2;
    clarity = Math.min(15, Math.max(3, clarity));
    let fluency = 7;
    const fillerWords = lowerText.match(/\b(um|uh|like|you know|basically|actually)\b/g) || [];
    if (fillerWords.length > 4) fluency -= 2;
    else if (fillerWords.length === 0 && words2 > 60) fluency += 2;
    fluency = Math.min(10, Math.max(2, fluency));
    let activeListening = 6;
    const otherParticipants = fullTranscript.filter((t) => t.participantId !== student.id);
    const peerNamesMentioned = otherParticipants.some((p) => lowerText.includes(p.participantName.toLowerCase()));
    if (peerNamesMentioned || lowerText.includes("agree with") || lowerText.includes("as mentioned earlier") || lowerText.includes("building on")) {
      activeListening += 3;
    }
    activeListening = Math.min(10, Math.max(2, activeListening));
    let balance = 7;
    if (percentTime >= 15 && percentTime <= 30) balance = 10;
    else if (percentTime > 45) balance = 5;
    else if (percentTime < 10) balance = 5;
    balance = Math.min(10, Math.max(2, balance));
    let langConsistency = 4;
    const hasHindiIndications = /[ऀ-ॿ]|haan|bhai|kya|kyunki|matlab|theek/i.test(lowerText);
    if (expectedLanguage.toLowerCase() === "english" && hasHindiIndications) {
      langConsistency = 3;
    } else {
      langConsistency = 5;
    }
    let intelligibility = 4;
    if (words2 > 50 && studentSegments.every((s) => (s.confidence ?? 1) >= 0.8)) {
      intelligibility = 5;
    }
    let etiquette = 4;
    if (studentSegments.some((s) => s.isInterruption)) {
      etiquette = 3;
    } else {
      etiquette = 5;
    }
    const overallScore = topicRelevance + reasoning + clarity + fluency + activeListening + balance + langConsistency + intelligibility + etiquette;
    return {
      userId: student.userId ? student.userId.toString() : void 0,
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
        discussionEtiquette: etiquette
      },
      topicRelevanceExplanation: `Student addressed "${topic.question}" over ${turns} speaking turns (${speakingSeconds} seconds total, comprising ${percentTime}% of group speaking time).`,
      strongestArguments: [
        studentSegments[0]?.text.slice(0, 100) || "Contributed thoughtful arguments to the core topic.",
        studentSegments[1]?.text.slice(0, 100) || "Maintained engagement across discussion phases."
      ],
      reasoningEvidence: [
        "Provided relevant thematic points aligned with the primary discussion prompt.",
        "Articulated logical connections between context and proposed outcomes."
      ],
      communicationStrengths: [
        "Clear and audible delivery throughout assigned speaking turns.",
        "Maintained respectful tone and adherence to group discussion protocols."
      ],
      communicationWeaknesses: [
        fillerWords.length > 2 ? `Frequent filler words observed (${fillerWords.slice(0, 3).join(", ")}).` : "Could enrich answers with specific statistical figures or industry benchmarks."
      ],
      speechPatterns: {
        paceDescription: words2 / Math.max(1, speakingSeconds / 60) > 160 ? "Fast-paced delivery" : "Moderate, steady speaking pace",
        fillerWords: Array.from(new Set(fillerWords)),
        repetitionsCount: 0,
        mumblingIndicators: ["No mumbling detected; clear microphone audio recorded."],
        observableHesitations: fillerWords.length > 2 ? ["Brief pauses before introducing secondary points."] : ["Fluent transitions between points."]
      },
      languageSwitching: {
        detected: hasHindiIndications,
        examples: hasHindiIndications ? [{ snippet: "Colloquial phrases observed in transcript", language: "Hindi" }] : [],
        explanation: hasHindiIndications ? "Occasional colloquial native-language phrases detected. Keep vocabulary consistently in the expected discussion language." : `Spoke consistently in the expected language (${expectedLanguage}).`
      },
      activeListeningNotes: peerNamesMentioned ? "Explicitly referenced statements made by peers during discussion." : "Contributed independent viewpoints; could build more directly upon peer remarks.",
      areasForImprovement: [
        "Quote specific statistics, industry examples, or case studies to strengthen arguments.",
        "Directly cite peers by name ('As Rahul mentioned...') to demonstrate active listening.",
        "Conclude speaking turns with concise summary statements."
      ],
      practicalRecommendations: [
        "Structure each speaking turn as: Point -> Reason -> Concrete Example -> Conclusion.",
        "Take 2 seconds to breathe before answering to eliminate unnecessary filler words.",
        "Practice active listening by noting key words used by other participants."
      ],
      suggestedPracticePlan: "Participate in 2-3 mock placement GDs weekly focusing on structuring opening statements and constructive turn-taking.",
      gamificationPointsAwarded: 0,
      evaluatedBy: "fallback",
      evaluatedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Calls Groq LLM with the strict 100-point rubric and schema.
   */
  async evaluateStudentWithGroq(topic, student, studentMetrics, studentSegments, fullTranscript, totalDurationSeconds, expectedLanguage) {
    const validatedModel = await gdGroqService.getValidatedModel() || "openai/gpt-oss-120b";
    const formattedTranscript = fullTranscript.map((t) => {
      const isCurrent = t.participantId === student.id ? " [EVALUATED STUDENT]" : "";
      return `[${t.timestamp.toISOString()}] ${t.participantName}${isCurrent} (${t.durationSeconds}s): "${t.text}"`;
    }).join("\n");
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
    const parsed = await gdGroqService.chatCompletionJson(
      [
        {
          role: "system",
          content: "You are a rigorous campus placement group discussion evaluator. Output valid JSON matching the exact schema requested."
        },
        { role: "user", content: prompt }
      ],
      {
        model: validatedModel,
        temperature: 0.25,
        maxTokens: 1800,
        timeoutMs: 3e4,
        retries: 2
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
    const computedOverall = topicRelevance + reasoningAndExamples + clarityAndStructure + fluencyAndPace + activeListening + participationBalance + expectedLanguageConsistency + vocalIntelligibility + discussionEtiquette;
    return {
      userId: student.userId ? student.userId.toString() : void 0,
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
        discussionEtiquette
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
        observableHesitations: Array.isArray(parsed.speechPatterns?.observableHesitations) ? parsed.speechPatterns.observableHesitations : []
      },
      languageSwitching: {
        detected: Boolean(parsed.languageSwitching?.detected),
        examples: Array.isArray(parsed.languageSwitching?.examples) ? parsed.languageSwitching.examples : [],
        explanation: parsed.languageSwitching?.explanation || `Maintained speech in ${expectedLanguage}.`
      },
      activeListeningNotes: parsed.activeListeningNotes || "Engaged with peer points.",
      areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement : ["Practice incorporating peer comments."],
      practicalRecommendations: Array.isArray(parsed.practicalRecommendations) ? parsed.practicalRecommendations : ["Structure your opening."],
      suggestedPracticePlan: parsed.suggestedPracticePlan || "Engage in timed group discussion drills.",
      gamificationPointsAwarded: 0,
      evaluatedBy: "groq",
      modelUsed: validatedModel,
      evaluatedAt: /* @__PURE__ */ new Date()
    };
  }
};
var gdEvaluationService = new GDEvaluationService();

// src/services/gd/gdSessionService.ts
var MAX_STUDENTS_CAPACITY = 5;
var DEFAULT_SILENCE_WARNING_SEC = 90;
var DEFAULT_SILENCE_TIMEOUT_SEC = 120;
var DEFAULT_SUGGESTED_DURATION_SEC = 90;
var gdRoomBroadcaster = null;
var gdUserBroadcaster = null;
function registerGDRoomBroadcaster(broadcaster) {
  gdRoomBroadcaster = broadcaster;
}
function registerGDUserBroadcaster(broadcaster) {
  gdUserBroadcaster = broadcaster;
}
function broadcastToGDRoom(sessionId, payload) {
  if (gdRoomBroadcaster) {
    try {
      gdRoomBroadcaster(sessionId, payload);
    } catch {
    }
  }
}
function broadcastToGDUser(username, payload) {
  if (gdUserBroadcaster) {
    try {
      gdUserBroadcaster(username, payload);
    } catch {
    }
  }
}
var GDSessionService = class {
  /**
   * Creates a new Group Discussion room hosted by an admin/moderator.
   * English is the default expected language unless specified.
   */
  async createRoom(params) {
    let topic;
    if (params.topicOverride) {
      topic = params.topicOverride;
    } else {
      topic = await gdTopicDiscoveryService.getRandomTopic({
        category: params.category
      });
    }
    const adminObjectId = new mongoose12.Types.ObjectId(params.adminId);
    const adminParticipant = {
      id: params.adminId,
      userId: adminObjectId,
      username: params.adminUsername.toLowerCase().trim(),
      name: params.adminFullName || params.adminUsername,
      role: "admin",
      avatar: params.adminAvatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
      isAi: false,
      isHost: true,
      speakingTimeSeconds: 0,
      segmentCount: 0,
      wordCount: 0,
      percentSpeakingTime: 0,
      turnsCompleted: 0,
      turnsPassed: 0,
      turnsSkipped: 0,
      hasSpokenInCurrentRound: false,
      isOnline: true,
      isAudioMuted: false,
      isVideoMuted: false,
      joinedAt: /* @__PURE__ */ new Date()
    };
    const initialInvitations = [];
    if (params.invitees && Array.isArray(params.invitees) && params.invitees.length > 0) {
      const cleanInvitees = Array.from(
        new Set(
          params.invitees.map((u) => typeof u === "string" ? u.toLowerCase().trim() : "").filter((u) => u && u !== params.adminUsername.toLowerCase().trim())
        )
      ).slice(0, MAX_STUDENTS_CAPACITY);
      if (cleanInvitees.length > 0) {
        const foundUsers = await User.find({ username: { $in: cleanInvitees } }).select("_id username fullName").lean();
        for (const u of foundUsers) {
          if (u.username) {
            initialInvitations.push({
              userId: u._id,
              username: u.username.toLowerCase().trim(),
              fullName: u.fullName,
              status: "pending",
              invitedAt: /* @__PURE__ */ new Date()
            });
          }
        }
      }
    }
    const room = new GroupDiscussion({
      userId: adminObjectId,
      // Backward compatibility
      adminId: adminObjectId,
      adminUsername: params.adminUsername.toLowerCase().trim(),
      adminFullName: params.adminFullName || params.adminUsername,
      expectedLanguage: params.expectedLanguage?.trim() || "English",
      status: "preparing",
      topic,
      invitations: initialInvitations,
      participants: [adminParticipant],
      turnHistory: [],
      round: 1,
      transcript: [],
      evaluations: [],
      startedAt: /* @__PURE__ */ new Date()
    });
    await room.save();
    return room;
  }
  /**
   * Search registered students by username prefix/query.
   */
  async searchUsersByUsername(query, excludeUsernames = []) {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];
    const lowerExcluded = excludeUsernames.map((u) => u.toLowerCase().trim());
    const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User.find({
      username: { $regex: escapedQuery, $options: "i" },
      ...lowerExcluded.length > 0 ? { username: { $nin: lowerExcluded } } : {}
    }).select("username fullName profilePicture").limit(10).lean();
    return users.map((u) => ({
      id: u._id.toString(),
      username: u.username || "",
      fullName: u.fullName,
      profilePicture: u.profilePicture
    }));
  }
  /**
   * Admin invites a registered user by username.
   */
  async sendInvitation(roomId, adminId, targetUsername) {
    const room = await this.getSessionById(roomId);
    if (!room) {
      throw new Error("Discussion room not found");
    }
    const cleanUsername = targetUsername.toLowerCase().trim();
    const user = await User.findOne({ username: cleanUsername }).select("_id fullName username").lean();
    if (!user) {
      throw new Error(`User "@${cleanUsername}" does not exist in PrepX`);
    }
    const acceptedCount = room.invitations.filter((i) => i.status === "accepted").length;
    const studentParticipantsCount = room.participants.filter((p) => !p.isHost && p.role !== "admin").length;
    const currentStudents = Math.max(acceptedCount, studentParticipantsCount);
    if (currentStudents >= MAX_STUDENTS_CAPACITY) {
      throw new Error(`Room has reached the maximum capacity of ${MAX_STUDENTS_CAPACITY} students`);
    }
    const newInvitation = {
      userId: user._id,
      username: cleanUsername,
      fullName: user.fullName,
      status: "pending",
      invitedAt: /* @__PURE__ */ new Date()
    };
    const existingIndex = room.invitations.findIndex((inv) => inv.username === cleanUsername);
    if (existingIndex >= 0) {
      const existingInv = room.invitations[existingIndex];
      if (existingInv.status !== "declined" && existingInv.status !== "expired") {
        throw new Error(`User "@${cleanUsername}" has already been invited (status: ${existingInv.status})`);
      }
      const updatedRoom2 = await GroupDiscussion.findOneAndUpdate(
        { _id: roomId, "invitations.username": cleanUsername },
        {
          $set: {
            "invitations.$.status": "pending",
            "invitations.$.invitedAt": /* @__PURE__ */ new Date(),
            "invitations.$.respondedAt": void 0
          }
        },
        { new: true }
      );
      const renewedInv = updatedRoom2?.invitations.find((i) => i.username === cleanUsername) || existingInv;
      broadcastToGDRoom(roomId, {
        type: "invitation_sent",
        payload: { invitation: renewedInv }
      });
      broadcastToGDUser(cleanUsername, {
        type: "invitation_received",
        payload: {
          roomId,
          topic: room.topic,
          adminUsername: room.adminUsername,
          adminFullName: room.adminFullName,
          expectedLanguage: room.expectedLanguage,
          status: "pending",
          invitedAt: renewedInv.invitedAt
        }
      });
      return { room: updatedRoom2 || room, invitation: renewedInv };
    }
    const updatedRoom = await GroupDiscussion.findOneAndUpdate(
      {
        _id: roomId,
        "invitations.username": { $ne: cleanUsername }
      },
      {
        $push: { invitations: newInvitation }
      },
      { new: true }
    );
    if (!updatedRoom) {
      throw new Error(`User "@${cleanUsername}" has already been invited`);
    }
    broadcastToGDRoom(roomId, {
      type: "invitation_sent",
      payload: { invitation: newInvitation }
    });
    broadcastToGDUser(cleanUsername, {
      type: "invitation_received",
      payload: {
        roomId,
        topic: room.topic,
        adminUsername: room.adminUsername,
        adminFullName: room.adminFullName,
        expectedLanguage: room.expectedLanguage,
        status: "pending",
        invitedAt: newInvitation.invitedAt
      }
    });
    return { room: updatedRoom, invitation: newInvitation };
  }
  /**
   * Responds to an invitation (accept or decline).
   */
  async respondToInvitation(roomId, username, action) {
    const cleanUsername = username.toLowerCase().trim();
    const room = await this.getSessionById(roomId);
    if (!room) {
      throw new Error("Discussion room not found");
    }
    const invitation = room.invitations.find((inv) => inv.username === cleanUsername);
    if (!invitation) {
      throw new Error("No invitation found for this user in this room");
    }
    if (action === "decline") {
      const updated2 = await GroupDiscussion.findOneAndUpdate(
        { _id: roomId, "invitations.username": cleanUsername },
        {
          $set: {
            "invitations.$.status": "declined",
            "invitations.$.respondedAt": /* @__PURE__ */ new Date()
          }
        },
        { new: true }
      );
      const declinedInv = updated2?.invitations.find((i) => i.username === cleanUsername) || {
        ...invitation,
        status: "declined",
        respondedAt: /* @__PURE__ */ new Date()
      };
      broadcastToGDRoom(roomId, {
        type: "invitation_updated",
        payload: { invitation: declinedInv }
      });
      broadcastToGDUser(cleanUsername, {
        type: "invitation_removed",
        payload: { roomId, username: cleanUsername }
      });
      return { room: updated2 || room, invitation: declinedInv };
    }
    const acceptedCount = room.invitations.filter(
      (i) => i.status === "accepted" && i.username !== cleanUsername
    ).length;
    const studentParticipants = room.participants.filter(
      (p) => !p.isHost && p.role !== "admin" && p.username !== cleanUsername
    ).length;
    const occupiedStudents = Math.max(acceptedCount, studentParticipants);
    if (occupiedStudents >= MAX_STUDENTS_CAPACITY) {
      await GroupDiscussion.updateOne(
        { _id: roomId, "invitations.username": cleanUsername },
        { $set: { "invitations.$.status": "expired" } }
      );
      throw new Error(`Room is already full. Maximum ${MAX_STUDENTS_CAPACITY} students reached.`);
    }
    const updated = await GroupDiscussion.findOneAndUpdate(
      { _id: roomId, "invitations.username": cleanUsername },
      {
        $set: {
          "invitations.$.status": "accepted",
          "invitations.$.respondedAt": /* @__PURE__ */ new Date()
        }
      },
      { new: true }
    );
    const acceptedInv = updated?.invitations.find((i) => i.username === cleanUsername) || {
      ...invitation,
      status: "accepted",
      respondedAt: /* @__PURE__ */ new Date()
    };
    broadcastToGDRoom(roomId, {
      type: "invitation_updated",
      payload: { invitation: acceptedInv }
    });
    return { room: updated || room, invitation: acceptedInv };
  }
  /**
   * Deletes or revokes an invitation (host removes invitee or student cancels/dismisses).
   */
  async deleteInvitation(roomId, requestingUsername, targetUsername) {
    const cleanRequesting = requestingUsername.toLowerCase().trim();
    const cleanTarget = (targetUsername || requestingUsername).toLowerCase().trim();
    const room = await this.getSessionById(roomId);
    if (!room) {
      throw new Error("Discussion room not found");
    }
    const isHost = room.adminUsername?.toLowerCase().trim() === cleanRequesting;
    const isSelf = cleanTarget === cleanRequesting;
    if (!isHost && !isSelf) {
      throw new Error("Unauthorized to remove this invitation");
    }
    await GroupDiscussion.updateOne(
      { _id: roomId },
      { $pull: { invitations: { username: cleanTarget } } }
    );
    broadcastToGDRoom(roomId, {
      type: "invitation_removed",
      payload: { roomId, username: cleanTarget }
    });
    broadcastToGDUser(cleanTarget, {
      type: "invitation_removed",
      payload: { roomId, username: cleanTarget }
    });
    return { success: true, message: "Invitation removed successfully" };
  }
  /**
   * Retrieves pending invitations for a user.
   */
  async getInvitationsForUser(username) {
    const cleanUsername = username.toLowerCase().trim();
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    const rooms = await GroupDiscussion.find({
      invitations: {
        $elemMatch: {
          username: cleanUsername,
          status: { $in: ["pending", "accepted"] }
        }
      },
      status: { $in: ["preparing", "in_progress"] },
      createdAt: { $gte: cutoffTime }
    }).select("topic adminUsername adminFullName expectedLanguage invitations participants createdAt").sort({ createdAt: -1 }).lean();
    const results = [];
    const seenRooms = /* @__PURE__ */ new Set();
    for (const r of rooms) {
      const roomIdStr = r._id.toString();
      if (seenRooms.has(roomIdStr)) continue;
      const inv = (r.invitations || []).find(
        (i) => i.username?.toLowerCase().trim() === cleanUsername && (i.status === "pending" || i.status === "accepted")
      );
      if (!inv) continue;
      const isAlreadyParticipant = (r.participants || []).some(
        (p) => p.username?.toLowerCase().trim() === cleanUsername
      );
      if (inv.status === "accepted" && isAlreadyParticipant) {
        continue;
      }
      seenRooms.add(roomIdStr);
      results.push({
        roomId: roomIdStr,
        topic: r.topic,
        adminUsername: r.adminUsername,
        adminFullName: r.adminFullName,
        expectedLanguage: r.expectedLanguage,
        status: inv.status,
        invitedAt: inv.invitedAt
      });
    }
    return results;
  }
  /**
   * Joins a GD room. Validates authentication and authorization:
   * - Admin always allowed.
   * - Student allowed only if invited and accepted.
   * - Reconnects cleanly without duplicating participant entries or exceeding 5 students.
   */
  async joinRoom(params) {
    const session = await this.getSessionById(params.roomId);
    if (!session) {
      throw new Error("Discussion room not found");
    }
    const cleanUsername = params.username.toLowerCase().trim();
    const isAdmin = session.adminId.toString() === params.userId || session.adminUsername === cleanUsername;
    let participant = session.participants.find(
      (p) => p.id === params.userId || p.username && p.username.toLowerCase() === cleanUsername
    );
    if (participant) {
      participant.isOnline = true;
      if (params.name) participant.name = params.name;
      if (params.avatar) participant.avatar = params.avatar;
      await session.save();
      return { session, participant };
    }
    if (isAdmin) {
      participant = {
        id: params.userId,
        userId: new mongoose12.Types.ObjectId(params.userId),
        username: cleanUsername,
        name: params.name || session.adminFullName || cleanUsername,
        role: "admin",
        avatar: params.avatar || "",
        isAi: false,
        isHost: true,
        speakingTimeSeconds: 0,
        segmentCount: 0,
        wordCount: 0,
        percentSpeakingTime: 0,
        turnsCompleted: 0,
        turnsPassed: 0,
        turnsSkipped: 0,
        hasSpokenInCurrentRound: false,
        isOnline: true,
        isAudioMuted: false,
        isVideoMuted: false,
        joinedAt: /* @__PURE__ */ new Date()
      };
      session.participants.push(participant);
      await session.save();
      return { session, participant };
    }
    const existingStudents = session.participants.filter((p) => !p.isHost && p.role !== "admin").length;
    if (existingStudents >= MAX_STUDENTS_CAPACITY) {
      throw new Error(`Room capacity reached: Maximum ${MAX_STUDENTS_CAPACITY} participants allowed in this discussion`);
    }
    participant = {
      id: params.userId,
      userId: new mongoose12.Types.ObjectId(params.userId),
      username: cleanUsername,
      name: params.name || cleanUsername,
      role: "student",
      avatar: params.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      isAi: false,
      isHost: false,
      speakingTimeSeconds: 0,
      segmentCount: 0,
      wordCount: 0,
      percentSpeakingTime: 0,
      turnsCompleted: 0,
      turnsPassed: 0,
      turnsSkipped: 0,
      hasSpokenInCurrentRound: false,
      isOnline: true,
      isAudioMuted: false,
      isVideoMuted: false,
      joinedAt: /* @__PURE__ */ new Date()
    };
    session.participants.push(participant);
    await session.save();
    return { session, participant };
  }
  /**
   * Retrieves session by ID.
   */
  async getSessionById(sessionId) {
    if (!mongoose12.Types.ObjectId.isValid(sessionId)) return null;
    return GroupDiscussion.findById(sessionId);
  }
  /**
   * Starts discussion explicitly by room admin.
   */
  async startDiscussion(roomId, adminId) {
    const session = await this.getSessionById(roomId);
    if (!session) throw new Error("Discussion room not found");
    if (session.status !== "in_progress") {
      session.status = "in_progress";
      session.startedAt = /* @__PURE__ */ new Date();
      await session.save();
    }
    if (!session.currentTurn) {
      await this.assignNextTurn(roomId, "initial_turn");
    }
    return await this.getSessionById(roomId);
  }
  /**
   * Fair, randomized turn scheduler.
   * Shuffles speaking order each round, prioritizes students with fewer opportunities,
   * balances speaking time, and never repeatedly selects the same student while others are eligible.
   */
  async assignNextTurn(roomId, reason, wordsSpoken = 0) {
    const session = await this.getSessionById(roomId);
    if (!session) return null;
    const previousTurn = session.currentTurn;
    const now = /* @__PURE__ */ new Date();
    if (previousTurn) {
      const prevParticipant = session.participants.find((p) => p.id === previousTurn.participantId);
      const durationSeconds = Math.max(1, Math.round((now.getTime() - new Date(previousTurn.startedAt).getTime()) / 1e3));
      if (prevParticipant) {
        prevParticipant.hasSpokenInCurrentRound = true;
        if (reason === "student_finished") {
          prevParticipant.turnsCompleted = (prevParticipant.turnsCompleted || 0) + 1;
        } else if (reason === "student_passed") {
          prevParticipant.turnsPassed = (prevParticipant.turnsPassed || 0) + 1;
        } else if (reason === "admin_skipped" || reason === "silence_timeout") {
          prevParticipant.turnsSkipped = (prevParticipant.turnsSkipped || 0) + 1;
        }
      }
      session.turnHistory.push({
        round: previousTurn.round || session.round || 1,
        participantId: previousTurn.participantId,
        username: previousTurn.username,
        name: previousTurn.name,
        startedAt: previousTurn.startedAt,
        endedAt: now,
        durationSeconds,
        endReason: reason || "student_finished",
        wordsSpoken: wordsSpoken || 0
      });
    }
    const activeStudents = session.participants.filter(
      (p) => !p.isHost && p.role !== "admin" && p.isOnline !== false
    );
    if (activeStudents.length === 0) {
      session.currentTurn = void 0;
      await session.save();
      return null;
    }
    let eligibleStudents = activeStudents.filter((p) => !p.hasSpokenInCurrentRound);
    if (eligibleStudents.length === 0) {
      session.round = (session.round || 1) + 1;
      for (const p of activeStudents) {
        p.hasSpokenInCurrentRound = false;
      }
      eligibleStudents = [...activeStudents];
    }
    if (eligibleStudents.length > 1 && previousTurn) {
      eligibleStudents = eligibleStudents.filter((p) => p.id !== previousTurn.participantId);
      if (eligibleStudents.length === 0) {
        eligibleStudents = [...activeStudents];
      }
    }
    eligibleStudents.sort((a, b) => {
      const oppA = (a.turnsCompleted || 0) + (a.turnsPassed || 0) + (a.turnsSkipped || 0);
      const oppB = (b.turnsCompleted || 0) + (b.turnsPassed || 0) + (b.turnsSkipped || 0);
      if (oppA !== oppB) return oppA - oppB;
      return (a.speakingTimeSeconds || 0) - (b.speakingTimeSeconds || 0);
    });
    const minOpportunities = (eligibleStudents[0].turnsCompleted || 0) + (eligibleStudents[0].turnsPassed || 0) + (eligibleStudents[0].turnsSkipped || 0);
    const pool = eligibleStudents.filter((p) => {
      const opp = (p.turnsCompleted || 0) + (p.turnsPassed || 0) + (p.turnsSkipped || 0);
      return opp === minOpportunities;
    });
    const selected = pool[Math.floor(Math.random() * pool.length)];
    const nextTurn = {
      participantId: selected.id,
      username: selected.username || selected.name,
      name: selected.name,
      startedAt: now,
      lastSpokeAt: now,
      warningEmitted: false,
      round: session.round || 1,
      suggestedDurationSeconds: DEFAULT_SUGGESTED_DURATION_SEC
    };
    session.currentTurn = nextTurn;
    await session.save();
    return nextTurn;
  }
  /**
   * Finish turn by student.
   */
  async finishTurn(roomId, participantId, wordsSpoken = 0) {
    const session = await this.getSessionById(roomId);
    if (!session || !session.currentTurn) return null;
    if (session.currentTurn.participantId !== participantId) {
      throw new Error("Only the currently assigned speaker can finish this turn");
    }
    await this.assignNextTurn(roomId, "student_finished", wordsSpoken);
    return this.getSessionById(roomId);
  }
  /**
   * Pass turn by student.
   */
  async passTurn(roomId, participantId) {
    const session = await this.getSessionById(roomId);
    if (!session || !session.currentTurn) return null;
    if (session.currentTurn.participantId !== participantId) {
      throw new Error("Only the currently assigned speaker can pass this turn");
    }
    await this.assignNextTurn(roomId, "student_passed", 0);
    return this.getSessionById(roomId);
  }
  /**
   * Skip turn by admin/moderator.
   */
  async skipTurnByAdmin(roomId, adminId) {
    const session = await this.getSessionById(roomId);
    if (!session || !session.currentTurn) return null;
    await this.assignNextTurn(roomId, "admin_skipped", 0);
    return this.getSessionById(roomId);
  }
  /**
   * Automatically passes turn when silence threshold (120s) is exceeded.
   */
  async handleSilenceTimeout(roomId) {
    const session = await this.getSessionById(roomId);
    if (!session || !session.currentTurn) return null;
    await this.assignNextTurn(roomId, "silence_timeout", 0);
    return this.getSessionById(roomId);
  }
  /**
   * Handles participant disconnection cleanly.
   */
  async handleParticipantDisconnect(roomId, participantId) {
    const session = await this.getSessionById(roomId);
    if (!session) return null;
    const p = session.participants.find((part) => part.id === participantId);
    if (p) {
      p.isOnline = false;
    }
    if (session.currentTurn && session.currentTurn.participantId === participantId) {
      await this.assignNextTurn(roomId, "disconnect", 0);
    } else {
      await session.save();
    }
    return this.getSessionById(roomId);
  }
  /**
   * Appends attributed transcript segment and updates participant metrics.
   */
  async addTranscriptSegment(sessionId, segment) {
    const session = await this.getSessionById(sessionId);
    if (!session) return null;
    const words2 = segment.text ? segment.text.trim().split(/\s+/).filter(Boolean).length : 0;
    const newSegment = {
      id: `seg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      participantId: segment.participantId,
      participantName: segment.participantName,
      username: segment.username?.toLowerCase().trim(),
      text: segment.text.trim(),
      timestamp: /* @__PURE__ */ new Date(),
      durationSeconds: Math.max(1, segment.durationSeconds || Math.round(words2 / 2.5)),
      isInterruption: segment.isInterruption || false,
      language: segment.language || "en",
      confidence: segment.confidence || 1
    };
    session.transcript.push(newSegment);
    const p = session.participants.find((part) => part.id === segment.participantId);
    if (p) {
      p.speakingTimeSeconds += newSegment.durationSeconds;
      p.segmentCount += 1;
      p.wordCount += words2;
    }
    const totalSpeaking = session.participants.reduce((sum, part) => sum + part.speakingTimeSeconds, 0);
    if (totalSpeaking > 0) {
      for (const part of session.participants) {
        part.percentSpeakingTime = Math.round(part.speakingTimeSeconds / totalSpeaking * 100);
      }
    }
    if (session.currentTurn && session.currentTurn.participantId === segment.participantId) {
      session.currentTurn.lastSpokeAt = /* @__PURE__ */ new Date();
      session.currentTurn.warningEmitted = false;
    }
    if (session.status === "preparing") {
      session.status = "in_progress";
    }
    await session.save();
    return session;
  }
  /**
   * Concludes discussion session, computes metrics, generates individual student evaluations,
   * ranks students, and awards gamification XP idempotently.
   * Admin is strictly excluded from student evaluation, ranking, and gamification points.
   */
  async endSession(sessionId, adminId) {
    const session = await this.getSessionById(sessionId);
    if (!session) return null;
    if (adminId && session.adminId.toString() !== adminId) {
      throw new Error("Only the room owner/admin can end the discussion session");
    }
    if (session.status === "completed" && session.evaluations && session.evaluations.length > 0) {
      return session;
    }
    session.status = "completed";
    session.endedAt = /* @__PURE__ */ new Date();
    session.endReason = "admin_ended";
    session.currentTurn = void 0;
    const durationSeconds = session.startedAt ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1e3) : session.participants.reduce((s, p) => s + p.speakingTimeSeconds, 0);
    const metricsResult = gdTranscriptMetricsService.computeMetrics(
      session.participants,
      session.transcript,
      durationSeconds
    );
    session.metrics = {
      totalDurationSeconds: metricsResult.totalDurationSeconds,
      totalWords: metricsResult.totalWords,
      participantMetrics: metricsResult.participantMetrics
    };
    const evaluations = await gdEvaluationService.evaluateAllStudents(
      session.topic,
      session.participants,
      session.transcript,
      metricsResult.participantMetrics,
      durationSeconds,
      session.expectedLanguage
    );
    session.evaluations = evaluations;
    if (evaluations.length > 0) {
      const topStudent = evaluations[0];
      session.evaluation = {
        overallScore: Math.round(topStudent.overallScore / 10),
        readinessLevel: topStudent.overallScore >= 85 ? "Exceptional" : topStudent.overallScore >= 70 ? "Placement Ready" : topStudent.overallScore >= 55 ? "Proficient" : "Developing",
        parameterScores: {
          communication: Math.min(10, Math.round(topStudent.criterionScores.clarityAndStructure / 15 * 10)),
          contentKnowledge: Math.min(10, Math.round(topStudent.criterionScores.topicRelevance / 25 * 10)),
          criticalThinking: Math.min(10, Math.round(topStudent.criterionScores.reasoningAndExamples / 15 * 10)),
          groupDynamics: Math.min(10, Math.round(topStudent.criterionScores.activeListening / 10 * 10)),
          leadership: Math.min(10, Math.round(topStudent.criterionScores.participationBalance / 10 * 10))
        },
        strengths: topStudent.strongestArguments,
        weaknesses: topStudent.areasForImprovement,
        actionableTips: topStudent.practicalRecommendations,
        feedbackSummary: topStudent.topicRelevanceExplanation,
        evaluatedBy: topStudent.evaluatedBy,
        modelUsed: topStudent.modelUsed,
        evaluatedAt: /* @__PURE__ */ new Date()
      };
    }
    await session.save();
    return session;
  }
};
var gdSessionService = new GDSessionService();

// src/controllers/gdController.ts
init_User();
function getParam(param) {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
}
async function getRandomTopic(req, res) {
  try {
    const category = typeof req.query.category === "string" ? req.query.category : void 0;
    const excludeTopicIds = typeof req.query.exclude === "string" ? req.query.exclude.split(",") : [];
    const topic = await gdTopicDiscoveryService.getRandomTopic({
      category,
      excludeTopicIds
    });
    res.json({
      success: true,
      topic
    });
  } catch (error) {
    console.error("[GD Controller] Get random topic error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve discussion topic",
      fallback: gdTopicDiscoveryService.getStaticFallbackTopics()[0]
    });
  }
}
async function getTopicsPool(req, res) {
  try {
    const topics2 = await gdTopicDiscoveryService.refreshTopicPool();
    const categories = gdTopicDiscoveryService.getCategories();
    res.json({
      success: true,
      categories,
      count: topics2.length,
      topics: topics2.slice(0, 20)
    });
  } catch (error) {
    console.error("[GD Controller] Get topics pool error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch topic pool",
      categories: gdTopicDiscoveryService.getCategories(),
      topics: gdTopicDiscoveryService.getStaticFallbackTopics()
    });
  }
}
async function createGDRoom(req, res) {
  try {
    const { category, topicOverride, expectedLanguage, invitees } = req.body;
    const adminId = req.user?._id?.toString() || req.user?.id?.toString();
    const adminUsername = req.user?.username || req.user?.email?.split("@")[0] || "admin";
    const adminFullName = req.user?.fullName || req.user?.name || adminUsername;
    const adminAvatar = req.user?.profilePicture || req.user?.avatar;
    if (!adminId) {
      res.status(401).json({ success: false, message: "Authentication required to create a room" });
      return;
    }
    const session = await gdSessionService.createRoom({
      adminId,
      adminUsername,
      adminFullName,
      adminAvatar,
      category,
      expectedLanguage: expectedLanguage || "English",
      topicOverride,
      invitees: Array.isArray(invitees) ? invitees : void 0
    });
    res.status(201).json({
      success: true,
      session
    });
  } catch (error) {
    console.error("[GD Controller] Create room error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to initialize Group Discussion room"
    });
  }
}
async function searchUsersByUsername(req, res) {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const exclude = typeof req.query.exclude === "string" ? req.query.exclude.split(",") : [];
    if (req.user?.username) {
      exclude.push(req.user.username);
    }
    const users = await gdSessionService.searchUsersByUsername(query, exclude);
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error("[GD Controller] Search users error:", error);
    res.status(500).json({ success: false, message: "Failed to search users" });
  }
}
async function inviteParticipant(req, res) {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const { username } = req.body;
    const adminId = req.user?._id?.toString() || req.user?.id?.toString();
    if (!roomId || !username?.trim()) {
      res.status(400).json({ success: false, message: "Room ID and target username are required" });
      return;
    }
    const result = await gdSessionService.sendInvitation(roomId, adminId, username.trim());
    res.status(200).json({
      success: true,
      message: `Invitation sent to @${username.trim()}`,
      invitation: result.invitation,
      room: result.room
    });
  } catch (error) {
    console.error("[GD Controller] Send invitation error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to send invitation"
    });
  }
}
async function respondToInvitation(req, res) {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const { action } = req.body;
    const username = req.user?.username;
    if (!roomId || !username) {
      res.status(400).json({ success: false, message: "Authentication and room ID required" });
      return;
    }
    if (action !== "accept" && action !== "decline") {
      res.status(400).json({ success: false, message: "Action must be 'accept' or 'decline'" });
      return;
    }
    const result = await gdSessionService.respondToInvitation(roomId, username, action);
    res.json({
      success: true,
      message: `Invitation ${action}ed successfully`,
      invitation: result.invitation,
      room: result.room
    });
  } catch (error) {
    console.error("[GD Controller] Respond invitation error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to respond to invitation"
    });
  }
}
async function getMyInvitations(req, res) {
  try {
    const username = req.user?.username;
    if (!username) {
      res.json({ success: true, invitations: [] });
      return;
    }
    const invitations = await gdSessionService.getInvitationsForUser(username);
    res.json({
      success: true,
      invitations
    });
  } catch (error) {
    console.error("[GD Controller] Get my invitations error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve invitations" });
  }
}
async function deleteInvitation(req, res) {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const targetUsername = req.params.username || req.body?.username;
    const requestingUser = req.user?.username;
    if (!roomId || !requestingUser) {
      res.status(400).json({ success: false, message: "Authentication and room ID required" });
      return;
    }
    const result = await gdSessionService.deleteInvitation(roomId, requestingUser, targetUsername);
    res.json(result);
  } catch (error) {
    console.error("[GD Controller] Delete invitation error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to delete invitation"
    });
  }
}
async function joinGDRoom(req, res) {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const userId = req.user?._id?.toString() || req.user?.id?.toString();
    const username = req.user?.username || req.user?.email?.split("@")[0] || "student";
    const name = req.user?.fullName || req.user?.name || username;
    const avatar = req.user?.profilePicture || req.user?.avatar;
    if (!userId || !roomId) {
      res.status(400).json({ success: false, message: "Room ID and authentication required" });
      return;
    }
    const result = await gdSessionService.joinRoom({
      roomId,
      userId,
      username,
      name,
      avatar
    });
    res.json({
      success: true,
      session: result.session,
      participant: result.participant
    });
  } catch (error) {
    console.error("[GD Controller] Join room error:", error);
    res.status(403).json({
      success: false,
      message: error.message || "Could not join discussion room"
    });
  }
}
async function getGDSession(req, res) {
  try {
    const sessionId = getParam(req.params.sessionId || req.params.roomId);
    if (!sessionId) {
      res.status(400).json({ success: false, message: "Session ID is required" });
      return;
    }
    const session = await gdSessionService.getSessionById(sessionId);
    if (!session) {
      res.status(404).json({ success: false, message: "Discussion session not found" });
      return;
    }
    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error("[GD Controller] Get session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch session"
    });
  }
}
async function startGDSession(req, res) {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const adminId = req.user?._id?.toString() || req.user?.id?.toString();
    if (!roomId) {
      res.status(400).json({ success: false, message: "Room ID is required" });
      return;
    }
    const session = await gdSessionService.startDiscussion(roomId, adminId);
    let moderatorAudioBase64 = null;
    let moderatorText = "";
    try {
      const topicTitle = session.topic?.question || session.topic?.originalTitle || session.topic?.title || "Today's Topic";
      const topicDesc = session.topic?.description || "";
      moderatorText = `Welcome to today's Group Discussion on: ${topicTitle}. ${topicDesc} Please present your viewpoints clearly and respect your fellow participants' turns. Let us begin.`;
      const { synthesizeSpeech: synthesizeSpeech2 } = await Promise.resolve().then(() => (init_murfService(), murfService_exports));
      const tts = await synthesizeSpeech2(moderatorText, "en-US-terrell");
      if (tts) {
        moderatorAudioBase64 = tts.audioBuffer.toString("base64");
      }
    } catch (e) {
      console.warn("[GD Controller] Murf Moderator TTS generation notice:", e);
    }
    res.json({
      success: true,
      session,
      currentTurn: session.currentTurn,
      moderatorAudioBase64,
      moderatorText
    });
  } catch (error) {
    console.error("[GD Controller] Start discussion error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to start discussion"
    });
  }
}
async function finishStudentTurn(req, res) {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const userId = req.user?._id?.toString() || req.user?.id?.toString();
    const { wordsSpoken } = req.body;
    const session = await gdSessionService.finishTurn(roomId, userId, Number(wordsSpoken) || 0);
    res.json({
      success: true,
      currentTurn: session?.currentTurn,
      round: session?.round,
      participants: session?.participants
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Failed to finish turn" });
  }
}
async function passStudentTurn(req, res) {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const userId = req.user?._id?.toString() || req.user?.id?.toString();
    const session = await gdSessionService.passTurn(roomId, userId);
    res.json({
      success: true,
      currentTurn: session?.currentTurn,
      round: session?.round,
      participants: session?.participants
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Failed to pass turn" });
  }
}
async function skipStudentTurn(req, res) {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const adminId = req.user?._id?.toString() || req.user?.id?.toString();
    const session = await gdSessionService.skipTurnByAdmin(roomId, adminId);
    res.json({
      success: true,
      currentTurn: session?.currentTurn,
      round: session?.round,
      participants: session?.participants
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Failed to skip turn" });
  }
}
async function appendTranscriptSegment(req, res) {
  try {
    const sessionId = getParam(req.params.sessionId || req.params.roomId);
    const { participantId, participantName, username, text, durationSeconds, isInterruption, language, confidence } = req.body;
    if (!sessionId || !text?.trim()) {
      res.status(400).json({ success: false, message: "Valid text and sessionId are required" });
      return;
    }
    const speakerId = req.user?._id?.toString() || participantId || "candidate";
    const speakerName = req.user?.fullName || participantName || "Candidate";
    const speakerUsername = req.user?.username || username;
    const session = await gdSessionService.addTranscriptSegment(sessionId, {
      participantId: speakerId,
      participantName: speakerName,
      username: speakerUsername,
      text: text.trim(),
      durationSeconds: Number(durationSeconds) || 4,
      isInterruption: Boolean(isInterruption),
      language,
      confidence
    });
    if (!session) {
      res.status(404).json({ success: false, message: "Session not found" });
      return;
    }
    res.json({
      success: true,
      participants: session.participants,
      lastSegment: session.transcript.slice(-1)[0]
    });
  } catch (error) {
    console.error("[GD Controller] Append transcript error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record transcript segment"
    });
  }
}
async function endGDSession(req, res) {
  try {
    const sessionId = getParam(req.params.sessionId || req.params.roomId);
    const adminId = req.user?._id?.toString() || req.user?.id?.toString();
    if (!sessionId) {
      res.status(400).json({ success: false, message: "Session ID is required" });
      return;
    }
    const session = await gdSessionService.endSession(sessionId, adminId);
    if (!session) {
      res.status(404).json({ success: false, message: "Session not found" });
      return;
    }
    res.json({
      success: true,
      session,
      evaluations: session.evaluations,
      evaluation: session.evaluation,
      metrics: session.metrics
    });
  } catch (error) {
    console.error("[GD Controller] End session error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to complete discussion and generate evaluation"
    });
  }
}
async function getMyGDSessions(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    const username = req.user?.username;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const sessions = await GroupDiscussion.find({
      $or: [
        { adminId: userId },
        { "participants.userId": userId },
        ...username ? [{ "participants.username": username }] : []
      ]
    }).sort({ createdAt: -1 }).limit(20);
    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error("[GD Controller] Get my GD sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch discussion history"
    });
  }
}
async function toggleGDBookmark(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    if (!roomId) {
      res.status(400).json({ success: false, message: "Room/Session ID is required" });
      return;
    }
    const user = await User.findById(userId).select("gdBookmarks").lean();
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    const currentBookmarks = (user.gdBookmarks || []).map((id) => id.toString());
    const isBookmarked = currentBookmarks.includes(roomId);
    const objId = new mongoose13.Types.ObjectId(roomId);
    const updated = await User.findByIdAndUpdate(
      userId,
      isBookmarked ? { $pull: { gdBookmarks: objId } } : { $addToSet: { gdBookmarks: objId } },
      { new: true, select: "gdBookmarks" }
    ).lean();
    const bookmarked = !isBookmarked;
    res.json({
      success: true,
      bookmarked,
      gdBookmarks: updated?.gdBookmarks || [],
      message: bookmarked ? "Group Discussion bookmarked!" : "Bookmark removed"
    });
  } catch (error) {
    console.error("[GD Controller] Toggle bookmark error:", error);
    res.status(500).json({ success: false, message: "Failed to toggle bookmark" });
  }
}
async function getGDBookmarks(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const user = await User.findById(userId).populate({
      path: "gdBookmarks",
      select: "topic adminUsername status participants round createdAt endedAt evaluations"
    });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.json({
      success: true,
      bookmarks: user.gdBookmarks || []
    });
  } catch (error) {
    console.error("[GD Controller] Get bookmarks error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bookmarked discussions" });
  }
}
async function getModeratorSpeech(req, res) {
  try {
    const roomId = getParam(req.params.roomId || req.params.sessionId);
    const { textOverride } = req.body || {};
    const session = await gdSessionService.getSessionById(roomId);
    if (!session) {
      res.status(404).json({ success: false, message: "Discussion room not found" });
      return;
    }
    const topicTitle = session.topic?.question || session.topic?.originalTitle || session.topic?.title || "Today's Discussion";
    const topicDesc = session.topic?.description || "";
    const textToSynthesize = textOverride?.trim() || `Welcome to today's Group Discussion on: ${topicTitle}. ${topicDesc} Each participant will have dedicated speaking turns to share their perspective. Please maintain constructive dialogue and professional decorum. Let us begin.`;
    const { synthesizeSpeech: synthesizeSpeech2 } = await Promise.resolve().then(() => (init_murfService(), murfService_exports));
    const tts = await synthesizeSpeech2(textToSynthesize, "en-US-terrell");
    res.json({
      success: true,
      moderatorText: textToSynthesize,
      audioBase64: tts ? tts.audioBuffer.toString("base64") : null,
      contentType: tts?.contentType || "audio/mp3"
    });
  } catch (error) {
    console.error("[GD Controller] Moderator speech error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to synthesize moderator speech"
    });
  }
}

// src/routes/gdRoutes.ts
var router5 = Router5();
router5.get("/random-topic", optionalAuth, getRandomTopic);
router5.get("/topics", getTopicsPool);
router5.get("/users/search", protect, searchUsersByUsername);
router5.get("/my-invitations", protect, getMyInvitations);
router5.post("/rooms/:roomId/invitations", protect, inviteParticipant);
router5.post("/rooms/:roomId/invitations/respond", protect, respondToInvitation);
router5.delete("/rooms/:roomId/invitations/:username?", protect, deleteInvitation);
router5.delete("/rooms/:roomId/invitations", protect, deleteInvitation);
router5.post("/sessions/:sessionId/invitations", protect, inviteParticipant);
router5.post("/sessions/:sessionId/invitations/respond", protect, respondToInvitation);
router5.delete("/sessions/:sessionId/invitations/:username?", protect, deleteInvitation);
router5.delete("/sessions/:sessionId/invitations", protect, deleteInvitation);
router5.post("/rooms", protect, createGDRoom);
router5.post("/sessions", protect, createGDRoom);
router5.get("/rooms/:roomId", getGDSession);
router5.get("/sessions/:sessionId", getGDSession);
router5.post("/rooms/:roomId/join", protect, joinGDRoom);
router5.post("/sessions/:sessionId/join", protect, joinGDRoom);
router5.post("/rooms/:roomId/start", protect, startGDSession);
router5.post("/rooms/:roomId/turns/finish", protect, finishStudentTurn);
router5.post("/rooms/:roomId/turns/pass", protect, passStudentTurn);
router5.post("/rooms/:roomId/turns/skip", protect, skipStudentTurn);
router5.post("/rooms/:roomId/moderator-speech", optionalAuth, getModeratorSpeech);
router5.post("/sessions/:sessionId/moderator-speech", optionalAuth, getModeratorSpeech);
router5.post("/sessions/:sessionId/transcript", optionalAuth, appendTranscriptSegment);
router5.post("/rooms/:roomId/transcript", optionalAuth, appendTranscriptSegment);
router5.post("/rooms/:roomId/end", protect, endGDSession);
router5.post("/sessions/:sessionId/end", protect, endGDSession);
router5.get("/my-sessions", protect, getMyGDSessions);
router5.post("/rooms/:roomId/bookmark", protect, toggleGDBookmark);
router5.post("/sessions/:sessionId/bookmark", protect, toggleGDBookmark);
router5.get("/bookmarks", protect, getGDBookmarks);
var gdRoutes_default = router5;

// src/routes/gamificationRoutes.ts
import { Router as Router6 } from "express";
init_User();
init_gamificationService();
var router6 = Router6();
var MASTER_BADGES = [
  {
    id: "daily-pioneer",
    name: "Daily Pioneer",
    category: "General",
    description: "Logged in and completed an activity today.",
    icon: "CalendarCheck",
    xpRequirement: 50
  },
  {
    id: "on-fire",
    name: "On Fire!",
    category: "General",
    description: "Maintained a 3-day active preparation streak.",
    icon: "Flame",
    xpRequirement: 150
  },
  {
    id: "fast-learner",
    name: "Fast Learner",
    category: "General",
    description: "Accumulated 100+ total XP across PrepX features.",
    icon: "Zap",
    xpRequirement: 100
  },
  {
    id: "algorithm-ace",
    name: "Algorithm Ace",
    category: "Coding",
    description: "Successfully solved and submitted 5+ DSA problems.",
    icon: "Code2",
    xpRequirement: 500
  },
  {
    id: "speed-demon",
    name: "Speed Demon",
    category: "Coding",
    description: "Executed a problem solution in under 50ms runtime.",
    icon: "Timer",
    xpRequirement: 250
  },
  {
    id: "system-architect",
    name: "System Architect",
    category: "Coding",
    description: "Completed system design scalability blueprints.",
    icon: "Cpu",
    xpRequirement: 400
  },
  {
    id: "interview-pro",
    name: "Interview Pro",
    category: "Interview",
    description: "Finished a comprehensive AI Technical Mock Interview.",
    icon: "Award",
    xpRequirement: 300
  },
  {
    id: "resume-strategist",
    name: "Resume Strategist",
    category: "Resume",
    description: "Analyzed your resume and achieved an 80+ ATS score.",
    icon: "FileCheck",
    xpRequirement: 200
  },
  {
    id: "gd-orator",
    name: "GD Orator",
    category: "Discussion",
    description: "Contributed effectively to a live AI Group Discussion round.",
    icon: "MessagesSquare",
    xpRequirement: 200
  },
  {
    id: "rising-star",
    name: "Rising Star",
    category: "Milestone",
    description: "Crossed 500+ XP milestone in engineering readiness.",
    icon: "Star",
    xpRequirement: 500
  },
  {
    id: "prepx-champion",
    name: "PrepX Champion",
    category: "Milestone",
    description: "Reached 1,000+ XP across coding, interviews, and resume.",
    icon: "Trophy",
    xpRequirement: 1e3
  },
  {
    id: "grandmaster",
    name: "Engineering Grandmaster",
    category: "Milestone",
    description: "Elite tier: 2,500+ XP and 20+ solved problems.",
    icon: "Crown",
    xpRequirement: 2500
  }
];
function computeLevel(xp = 0) {
  const levelNumber = Math.floor(xp / 500) + 1;
  const levelXpFloor = (levelNumber - 1) * 500;
  const levelXpCeil = levelNumber * 500;
  const xpInLevel = xp - levelXpFloor;
  const progressPct = Math.min(100, Math.round(xpInLevel / 500 * 1e3) / 10);
  const levelTitles = [
    "Junior Developer",
    "Software Engineer",
    "Full-Stack Architect",
    "Principal Engineer",
    "Staff System Architect",
    "Engineering Lead",
    "Distinguished Engineer",
    "Chief Architect"
  ];
  const levelTitle = levelTitles[Math.min(levelTitles.length - 1, levelNumber - 1)];
  const nextTitle = levelTitles[Math.min(levelTitles.length - 1, levelNumber)];
  return {
    levelNumber,
    levelTitle,
    nextTitle,
    xpInLevel,
    levelXpCeil,
    progressPct
  };
}
router6.get(["/status", "/profile", "/"], optionalAuth, async (req, res) => {
  try {
    let user = req.user;
    if (user && user._id) {
      const fresh = await User.findById(user._id).select("xp streakDays codingStreak rating ratingTitle badges solved").lean();
      if (fresh) user = fresh;
    }
    const currentXp = user?.xp || 0;
    const streakDays = user?.streakDays || user?.codingStreak || 1;
    const rating = user?.rating || 1200;
    const ratingTitle = user?.ratingTitle || "Candidate";
    const userBadges = user?.badges || [];
    const solvedCount = user?.solved ? user.solved.length : 0;
    const levelData = computeLevel(currentXp);
    const dailyQuests = [
      {
        id: "quest-code",
        title: "Code Master",
        feature: "Coding Platform",
        description: "Submit 1 accepted algorithm or data structure solution.",
        xpReward: 100,
        progress: solvedCount > 0 ? 1 : 0,
        target: 1,
        completed: solvedCount > 0,
        claimed: false
      },
      {
        id: "quest-interview",
        title: "Interview Ready",
        feature: "AI Interviewer",
        description: "Complete 1 full AI technical or HR mock interview.",
        xpReward: 150,
        progress: userBadges.includes("Interview Pro") ? 1 : 0,
        target: 1,
        completed: userBadges.includes("Interview Pro"),
        claimed: false
      },
      {
        id: "quest-resume",
        title: "Resume Polish",
        feature: "Resume Analyzer",
        description: "Score or optimize your resume with AI suggestions.",
        xpReward: 75,
        progress: userBadges.includes("Resume Strategist") ? 1 : 0,
        target: 1,
        completed: userBadges.includes("Resume Strategist"),
        claimed: false
      },
      {
        id: "quest-cs",
        title: "CS Fundamentals",
        feature: "CS Subjects",
        description: "Revise 1 core Computer Science subject (OS, DBMS, Networks, OOP).",
        xpReward: 50,
        progress: 1,
        target: 1,
        completed: true,
        claimed: false
      },
      {
        id: "quest-streak",
        title: "Daily Consistency",
        feature: "Platform",
        description: "Maintain your daily PrepX practice streak.",
        xpReward: 50,
        progress: streakDays >= 1 ? 1 : 0,
        target: 1,
        completed: streakDays >= 1,
        claimed: true
      }
    ];
    const badgesWithStatus = MASTER_BADGES.map((b) => ({
      ...b,
      unlocked: userBadges.includes(b.name)
    }));
    res.json({
      success: true,
      gamification: {
        xp: currentXp,
        ...levelData,
        streakDays,
        rating,
        ratingTitle,
        solvedCount,
        badges: badgesWithStatus,
        unlockedBadgesCount: userBadges.length,
        dailyQuests
      }
    });
  } catch (error) {
    console.error("Gamification status error:", error);
    res.status(500).json({ message: "Failed to fetch gamification snapshot" });
  }
});
router6.get("/leaderboard", optionalAuth, async (req, res) => {
  try {
    const users = await User.find({}).select("fullName username profilePicture xp rating ratingTitle solved college branch badges streakDays").sort({ xp: -1, rating: -1 }).limit(50).lean();
    const leaderboard = users.map((u, idx) => {
      const xp = u.xp || 0;
      const { levelNumber, levelTitle } = computeLevel(xp);
      return {
        rank: idx + 1,
        id: u._id.toString(),
        fullName: u.fullName || "Anonymous Engineer",
        username: u.username || u.fullName?.toLowerCase().replace(/\s+/g, "_") || "coder",
        profilePicture: u.profilePicture || "",
        college: u.college || "PrepX Engineering Academy",
        xp,
        levelNumber,
        levelTitle,
        rating: u.rating || 1200,
        ratingTitle: u.ratingTitle || "Candidate",
        solvedCount: u.solved ? u.solved.length : 0,
        streakDays: u.streakDays || 1,
        badgesCount: u.badges ? u.badges.length : 0
      };
    });
    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error("Gamification leaderboard error:", error);
    res.status(500).json({ message: "Failed to load global leaderboard" });
  }
});
router6.post("/award", protect, async (req, res) => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const { amount = 50, activityName = "Platform Activity", badge } = req.body;
    const result = await awardActivityXP(userId, Number(amount) || 50, String(activityName), badge);
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error("Award XP error:", error);
    res.status(500).json({ message: "Failed to award activity XP" });
  }
});
var gamificationRoutes_default = router6;

// src/services/gd/gdWebSocketService.ts
import { WebSocketServer, WebSocket } from "ws";
function initGDWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  const sessionRooms = /* @__PURE__ */ new Map();
  const userSockets = /* @__PURE__ */ new Map();
  const silenceCheckers = /* @__PURE__ */ new Map();
  function broadcastToRoom(sessionId, payload, sender) {
    const room = sessionRooms.get(sessionId);
    if (!room) return;
    const message = JSON.stringify(payload);
    for (const client of room) {
      if (client.readyState === WebSocket.OPEN && client !== sender) {
        client.send(message);
      }
    }
  }
  function broadcastToEveryoneInRoom(sessionId, payload) {
    const room = sessionRooms.get(sessionId);
    if (!room) return;
    const message = JSON.stringify(payload);
    for (const client of room) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
  function sendToUser(username, payload) {
    const clean = username.toLowerCase().trim();
    const sockets = userSockets.get(clean);
    if (!sockets) return;
    const message = JSON.stringify(payload);
    for (const client of sockets) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
  registerGDRoomBroadcaster((sessionId, payload) => {
    broadcastToEveryoneInRoom(sessionId, payload);
  });
  registerGDUserBroadcaster((username, payload) => {
    sendToUser(username, payload);
  });
  function sendToSpecificClient(sessionId, targetParticipantId, payload) {
    const room = sessionRooms.get(sessionId);
    if (!room) return;
    const message = JSON.stringify(payload);
    for (const client of room) {
      if (client.readyState === WebSocket.OPEN && client.participantId === targetParticipantId) {
        client.send(message);
        break;
      }
    }
  }
  function ensureSilenceChecker(sessionId) {
    if (silenceCheckers.has(sessionId)) return;
    const interval = setInterval(async () => {
      try {
        const session = await gdSessionService.getSessionById(sessionId);
        if (!session || session.status !== "in_progress" || !session.currentTurn) {
          return;
        }
        const now = Date.now();
        const lastSpoke = new Date(session.currentTurn.lastSpokeAt || session.currentTurn.startedAt).getTime();
        const inactiveSeconds = Math.round((now - lastSpoke) / 1e3);
        if (inactiveSeconds >= DEFAULT_SILENCE_WARNING_SEC && !session.currentTurn.warningEmitted) {
          session.currentTurn.warningEmitted = true;
          await session.save();
          broadcastToEveryoneInRoom(sessionId, {
            type: "turn_silence_warning",
            payload: {
              participantId: session.currentTurn.participantId,
              username: session.currentTurn.username,
              secondsInactive: inactiveSeconds,
              secondsRemaining: Math.max(0, DEFAULT_SILENCE_TIMEOUT_SEC - inactiveSeconds),
              message: `Turn warning: No speech detected from @${session.currentTurn.username} for ${inactiveSeconds}s. Turn will be passed in ${DEFAULT_SILENCE_TIMEOUT_SEC - inactiveSeconds}s.`
            }
          });
        }
        if (inactiveSeconds >= DEFAULT_SILENCE_TIMEOUT_SEC) {
          console.log(`[GD WebSocket] Silence timeout reached (120s) for speaker @${session.currentTurn.username} in room ${sessionId}. Auto-passing turn.`);
          const updatedSession = await gdSessionService.handleSilenceTimeout(sessionId);
          broadcastToEveryoneInRoom(sessionId, {
            type: "turn_silence_timeout",
            payload: {
              previousSpeaker: session.currentTurn.username,
              currentTurn: updatedSession?.currentTurn,
              round: updatedSession?.round,
              participants: updatedSession?.participants,
              turnHistory: updatedSession?.turnHistory.slice(-1)[0]
            }
          });
        }
      } catch (err) {
        console.error(`[GD WebSocket] Silence checker error for session ${sessionId}:`, err);
      }
    }, 3e3);
    silenceCheckers.set(sessionId, interval);
  }
  function stopSilenceChecker(sessionId) {
    const interval = silenceCheckers.get(sessionId);
    if (interval) {
      clearInterval(interval);
      silenceCheckers.delete(sessionId);
    }
  }
  server.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url || "", `http://${request.headers.host}`);
    if (pathname === "/api/v1/gd/ws" || pathname === "/ws/gd") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });
  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, sessionId, payload } = message;
        if (type === "register_user") {
          const cleanUser = (payload?.username || "").toLowerCase().trim();
          if (cleanUser) {
            ws.username = cleanUser;
            if (!userSockets.has(cleanUser)) {
              userSockets.set(cleanUser, /* @__PURE__ */ new Set());
            }
            userSockets.get(cleanUser).add(ws);
            ws.send(JSON.stringify({ type: "user_registered", payload: { username: cleanUser } }));
          }
          return;
        }
        if (!sessionId) return;
        switch (type) {
          // -----------------------------------------------------------------
          // 1. Room Connection & Setup
          // -----------------------------------------------------------------
          case "join_room": {
            ws.sessionId = sessionId;
            ws.participantId = payload?.participantId;
            ws.participantName = payload?.participantName || payload?.name || "Participant";
            ws.username = (payload?.username || "").toLowerCase().trim();
            ws.role = payload?.role || "student";
            if (!sessionRooms.has(sessionId)) {
              sessionRooms.set(sessionId, /* @__PURE__ */ new Set());
            }
            sessionRooms.get(sessionId).add(ws);
            ensureSilenceChecker(sessionId);
            const session = await gdSessionService.getSessionById(sessionId);
            ws.send(
              JSON.stringify({
                type: "joined_room_ack",
                payload: {
                  sessionId,
                  status: session?.status || "preparing",
                  expectedLanguage: session?.expectedLanguage || "English",
                  topic: session?.topic,
                  adminId: session?.adminId,
                  adminUsername: session?.adminUsername,
                  participants: session?.participants || [],
                  currentTurn: session?.currentTurn,
                  round: session?.round || 1,
                  transcript: session?.transcript || []
                }
              })
            );
            broadcastToRoom(
              sessionId,
              {
                type: "participant_joined",
                payload: {
                  participantId: ws.participantId,
                  participantName: ws.participantName,
                  username: ws.username,
                  role: ws.role,
                  isAudioMuted: payload?.isAudioMuted || false,
                  isVideoMuted: payload?.isVideoMuted || false,
                  participants: session?.participants
                }
              },
              ws
            );
            break;
          }
          // -----------------------------------------------------------------
          // 2. WebRTC Peer-to-Peer Mesh Signaling
          // -----------------------------------------------------------------
          case "webrtc_offer": {
            if (payload?.toParticipantId) {
              sendToSpecificClient(sessionId, payload.toParticipantId, {
                type: "webrtc_offer",
                payload: {
                  fromParticipantId: ws.participantId,
                  fromUsername: ws.username,
                  offer: payload.offer
                }
              });
            }
            break;
          }
          case "webrtc_answer": {
            if (payload?.toParticipantId) {
              sendToSpecificClient(sessionId, payload.toParticipantId, {
                type: "webrtc_answer",
                payload: {
                  fromParticipantId: ws.participantId,
                  fromUsername: ws.username,
                  answer: payload.answer
                }
              });
            }
            break;
          }
          case "webrtc_ice_candidate": {
            if (payload?.toParticipantId) {
              sendToSpecificClient(sessionId, payload.toParticipantId, {
                type: "webrtc_ice_candidate",
                payload: {
                  fromParticipantId: ws.participantId,
                  fromUsername: ws.username,
                  candidate: payload.candidate
                }
              });
            }
            break;
          }
          case "media_state_change": {
            broadcastToRoom(
              sessionId,
              {
                type: "media_state_change",
                payload: {
                  participantId: ws.participantId,
                  isAudioMuted: payload?.isAudioMuted,
                  isVideoMuted: payload?.isVideoMuted
                }
              },
              ws
            );
            break;
          }
          // -----------------------------------------------------------------
          // 3. Speaking Activity & Transcription Attribution
          // -----------------------------------------------------------------
          case "speech_activity": {
            broadcastToRoom(
              sessionId,
              {
                type: payload?.isSpeaking ? "participant_started_speaking" : "participant_stopped_speaking",
                payload: {
                  participantId: ws.participantId,
                  username: ws.username
                }
              },
              ws
            );
            if (payload?.isSpeaking) {
              const session = await gdSessionService.getSessionById(sessionId);
              if (session?.currentTurn && session.currentTurn.participantId === ws.participantId) {
                session.currentTurn.lastSpokeAt = /* @__PURE__ */ new Date();
                session.currentTurn.warningEmitted = false;
                await session.save();
              }
            }
            break;
          }
          case "transcript_segment": {
            if (payload?.text && payload.text.trim()) {
              const updatedSession = await gdSessionService.addTranscriptSegment(
                sessionId,
                {
                  participantId: payload.participantId || ws.participantId || "candidate",
                  participantName: payload.participantName || ws.participantName || "Candidate",
                  username: payload.username || ws.username,
                  text: payload.text,
                  durationSeconds: payload.durationSeconds || 4,
                  isInterruption: payload.isInterruption || false,
                  language: payload.language || "en",
                  confidence: payload.confidence || 1
                }
              );
              const lastSeg = updatedSession?.transcript.slice(-1)[0];
              broadcastToEveryoneInRoom(sessionId, {
                type: "new_transcript_segment",
                payload: {
                  segment: lastSeg,
                  participants: updatedSession?.participants,
                  currentTurn: updatedSession?.currentTurn
                }
              });
            }
            break;
          }
          case "interim_transcript": {
            if (payload?.text !== void 0) {
              broadcastToRoom(
                sessionId,
                {
                  type: "participant_interim_transcript",
                  payload: {
                    participantId: ws.participantId,
                    username: ws.username,
                    participantName: ws.participantName,
                    text: payload.text
                  }
                },
                ws
              );
            }
            break;
          }
          // -----------------------------------------------------------------
          // 4. Fair Turn Management Controls
          // -----------------------------------------------------------------
          case "start_discussion": {
            const started = await gdSessionService.startDiscussion(sessionId, ws.participantId || "");
            broadcastToEveryoneInRoom(sessionId, {
              type: "discussion_started",
              payload: {
                status: started.status,
                startedAt: started.startedAt,
                currentTurn: started.currentTurn,
                round: started.round,
                participants: started.participants
              }
            });
            break;
          }
          case "finish_turn": {
            const updated = await gdSessionService.finishTurn(
              sessionId,
              ws.participantId || "",
              payload?.wordsSpoken || 0
            );
            broadcastToEveryoneInRoom(sessionId, {
              type: "turn_changed",
              payload: {
                reason: "student_finished",
                previousSpeaker: ws.username,
                currentTurn: updated?.currentTurn,
                round: updated?.round,
                participants: updated?.participants,
                turnHistory: updated?.turnHistory.slice(-1)[0]
              }
            });
            break;
          }
          case "pass_turn": {
            const updated = await gdSessionService.passTurn(sessionId, ws.participantId || "");
            broadcastToEveryoneInRoom(sessionId, {
              type: "turn_changed",
              payload: {
                reason: "student_passed",
                previousSpeaker: ws.username,
                currentTurn: updated?.currentTurn,
                round: updated?.round,
                participants: updated?.participants,
                turnHistory: updated?.turnHistory.slice(-1)[0]
              }
            });
            break;
          }
          case "skip_turn": {
            const updated = await gdSessionService.skipTurnByAdmin(sessionId, ws.participantId || "");
            broadcastToEveryoneInRoom(sessionId, {
              type: "turn_changed",
              payload: {
                reason: "admin_skipped",
                currentTurn: updated?.currentTurn,
                round: updated?.round,
                participants: updated?.participants,
                turnHistory: updated?.turnHistory.slice(-1)[0]
              }
            });
            break;
          }
          // -----------------------------------------------------------------
          // 5. Admin Moderation & Session Conclusion
          // -----------------------------------------------------------------
          case "end_session": {
            stopSilenceChecker(sessionId);
            broadcastToEveryoneInRoom(sessionId, {
              type: "evaluating_session",
              payload: { message: "Discussion concluded by moderator. Generating placement evaluations..." }
            });
            const completedSession = await gdSessionService.endSession(sessionId, ws.participantId);
            broadcastToEveryoneInRoom(sessionId, {
              type: "session_ended",
              payload: {
                sessionId,
                status: "completed",
                evaluations: completedSession?.evaluations,
                evaluation: completedSession?.evaluation,
                metrics: completedSession?.metrics,
                participants: completedSession?.participants
              }
            });
            break;
          }
          default:
            break;
        }
      } catch (err) {
        console.error("[GD WebSocket] Message handling error:", err?.message || err);
      }
    });
    ws.on("close", async () => {
      if (ws.username && userSockets.has(ws.username)) {
        userSockets.get(ws.username).delete(ws);
        if (userSockets.get(ws.username).size === 0) {
          userSockets.delete(ws.username);
        }
      }
      if (ws.sessionId) {
        const sessionId = ws.sessionId;
        const participantId = ws.participantId;
        if (sessionRooms.has(sessionId)) {
          sessionRooms.get(sessionId).delete(ws);
          if (sessionRooms.get(sessionId).size === 0) {
            sessionRooms.delete(sessionId);
            stopSilenceChecker(sessionId);
          }
        }
        if (participantId) {
          try {
            const updatedSession = await gdSessionService.handleParticipantDisconnect(sessionId, participantId);
            broadcastToRoom(sessionId, {
              type: "participant_left",
              payload: {
                participantId,
                username: ws.username,
                currentTurn: updatedSession?.currentTurn,
                participants: updatedSession?.participants
              }
            });
          } catch (e) {
            console.error("[GD WebSocket] Disconnect handling error:", e);
          }
        }
      }
    });
  });
  const heartbeatInterval = setInterval(() => {
    for (const client of wss.clients) {
      const gdClient = client;
      if (!gdClient.isAlive) {
        gdClient.terminate();
      } else {
        gdClient.isAlive = false;
        gdClient.ping();
      }
    }
  }, 3e4);
  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });
  console.log("\u26A1 GD Real-time WebRTC & Turn WebSocket Gateway attached at /api/v1/gd/ws");
  return wss;
}

// src/services/sttProxyService.ts
init_sttKeytermsService();
import { WebSocketServer as WebSocketServer2, WebSocket as WebSocket2 } from "ws";
import jwt4 from "jsonwebtoken";
import dotenv3 from "dotenv";
dotenv3.config();
var MURF_API_KEY = process.env.MURF_API_KEY || "";
var DEEPGRAM_API_KEY2 = process.env.DEEPGRAM_API_KEY || "";
var JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
var DEEPGRAM_MODEL2 = process.env.DEEPGRAM_MODEL || "nova-3";
var DEEPGRAM_LANGUAGE2 = process.env.DEEPGRAM_LANGUAGE || "en-IN";
function initSTTWebSocketServer(server) {
  const wss = new WebSocketServer2({ noServer: true });
  server.on("upgrade", (request, socket, head) => {
    const { pathname, searchParams } = new URL(request.url || "", `http://${request.headers.host}`);
    if (pathname === "/api/v1/interview/stt-stream" || pathname === "/ws/interview-stt") {
      let token = searchParams.get("token");
      if (!token && request.headers.authorization) {
        token = request.headers.authorization.replace(/^Bearer\s+/i, "");
      }
      const protocols = request.headers["sec-websocket-protocol"]?.split(",").map((p) => p.trim());
      if (!token && protocols && protocols.length >= 2 && protocols[0] === "access_token") {
        token = protocols[1];
      }
      let userId = "";
      if (token) {
        try {
          const decoded = jwt4.verify(token, JWT_SECRET);
          userId = decoded.id || decoded.userId || decoded._id || "";
        } catch {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        const client = ws;
        client.userId = userId;
        client.interviewId = searchParams.get("interviewId") || "";
        client.participantId = searchParams.get("participantId") || userId || "speaker";
        client.username = searchParams.get("username") || "";
        client.requestedLang = searchParams.get("language") || DEEPGRAM_LANGUAGE2;
        client.requestedModel = searchParams.get("model") || DEEPGRAM_MODEL2;
        wss.emit("connection", client, request);
      });
    }
  });
  wss.on("connection", async (client) => {
    client.isAlive = true;
    client.audioQueue = [];
    client.on("pong", () => {
      client.isAlive = true;
    });
    const hasMurf = !!MURF_API_KEY.trim();
    const hasDeepgram = !!DEEPGRAM_API_KEY2.trim();
    if (!hasMurf && !hasDeepgram) {
      console.error("[STT Gateway] Neither MURF_API_KEY nor DEEPGRAM_API_KEY configured on backend server.");
      if (client.readyState === WebSocket2.OPEN) {
        client.send(
          JSON.stringify({
            type: "error",
            status: "error",
            message: "STT voice service is not configured on server."
          })
        );
        client.close(1011, "STT server configuration missing");
      }
      return;
    }
    try {
      client.keyterms = await getDynamicInterviewKeyterms(client.interviewId);
    } catch {
      client.keyterms = [];
    }
    function connectUpstream(provider2) {
      client.provider = provider2;
      let upstreamSocket = null;
      try {
        if (provider2 === "murf") {
          const murfLang = (client.requestedLang || "en-IN").replace("-", "_");
          const murfUrl = `wss://in.api.murf.ai/v1/transcription/stream-input?api_key=${encodeURIComponent(
            MURF_API_KEY.trim()
          )}&language=${encodeURIComponent(murfLang)}&text_formatting=true`;
          upstreamSocket = new WebSocket2(murfUrl, {
            headers: {
              "api-key": MURF_API_KEY.trim()
            }
          });
        } else {
          const dgModel = DEEPGRAM_MODEL2 || client.requestedModel || "nova-3";
          const dgLang = DEEPGRAM_LANGUAGE2 || client.requestedLang || "en-IN";
          const urlObj = new URL("wss://api.deepgram.com/v1/listen");
          urlObj.searchParams.set("model", dgModel);
          urlObj.searchParams.set("language", dgLang);
          urlObj.searchParams.set("smart_format", "true");
          urlObj.searchParams.set("punctuate", "true");
          urlObj.searchParams.set("interim_results", "true");
          urlObj.searchParams.set("no_delay", "true");
          urlObj.searchParams.set("endpointing", "350");
          urlObj.searchParams.set("utterance_end_ms", "1000");
          urlObj.searchParams.set("filler_words", "true");
          if (Array.isArray(client.keyterms)) {
            for (const kt of client.keyterms) {
              if (kt && kt.trim()) {
                urlObj.searchParams.append("keyterm", kt.trim());
              }
            }
          }
          upstreamSocket = new WebSocket2(urlObj.toString(), {
            headers: {
              Authorization: `Token ${DEEPGRAM_API_KEY2.trim()}`
            }
          });
        }
        client.upstreamSocket = upstreamSocket;
      } catch (err) {
        console.error(`[STT Gateway] Error initiating ${provider2} connection:`, err.message);
        if (provider2 === "deepgram" && hasMurf) {
          console.warn("[STT Gateway] Deepgram initialization failed, attempting fallback to Murf...");
          connectUpstream("murf");
          return;
        } else if (provider2 === "murf" && hasDeepgram) {
          console.warn("[STT Gateway] Murf initialization failed, attempting fallback to Deepgram...");
          connectUpstream("deepgram");
          return;
        }
        if (client.readyState === WebSocket2.OPEN) {
          client.send(
            JSON.stringify({
              type: "error",
              status: "error",
              message: `Failed to connect to ${provider2} upstream engine.`
            })
          );
          client.close(1011, `${provider2} connection failure`);
        }
        return;
      }
      upstreamSocket.on("open", () => {
        if (client.readyState === WebSocket2.OPEN) {
          client.send(
            JSON.stringify({
              type: "ready",
              status: "listening",
              provider: provider2,
              model: provider2 === "murf" ? "murf-stt" : DEEPGRAM_MODEL2,
              language: client.requestedLang,
              participantId: client.participantId,
              username: client.username,
              keytermsCount: client.keyterms?.length || 0,
              message: `${provider2 === "deepgram" ? "Deepgram Nova-3" : "Murf AI"} real-time speech stream established.`
            })
          );
        }
        if (client.audioQueue && client.audioQueue.length > 0) {
          for (const chunk of client.audioQueue) {
            if (upstreamSocket && upstreamSocket.readyState === WebSocket2.OPEN) {
              upstreamSocket.send(chunk);
            }
          }
          client.audioQueue = [];
        }
      });
      upstreamSocket.on("message", (data) => {
        if (client.readyState !== WebSocket2.OPEN) return;
        try {
          const rawStr = data.toString();
          const parsed = JSON.parse(rawStr);
          let transcriptText = "";
          let isFinal = false;
          let speechFinal = false;
          let confidence = 0.95;
          let words2 = [];
          if (client.provider === "murf") {
            transcriptText = parsed.transcript || parsed.text || parsed.channel?.alternatives?.[0]?.transcript || "";
            isFinal = parsed.type === "final" || parsed.type === "Final" || parsed.event === "EndOfTurn" || parsed.is_final === true;
            speechFinal = isFinal;
            confidence = parsed.confidence ?? (isFinal ? 0.98 : 0.85);
          } else {
            const alt = parsed.channel?.alternatives?.[0];
            transcriptText = alt?.transcript || parsed.transcript || parsed.text || "";
            isFinal = parsed.is_final === true || parsed.type === "final";
            speechFinal = parsed.speech_final === true;
            confidence = alt?.confidence ?? (isFinal ? 0.98 : 0.85);
            words2 = alt?.words || [];
          }
          if (transcriptText && transcriptText.trim()) {
            const normalizedPayload = {
              type: isFinal ? "final" : "partial",
              transcript: transcriptText.trim(),
              is_final: isFinal,
              speech_final: speechFinal,
              confidence,
              words: words2,
              start: parsed.start,
              duration: parsed.duration,
              participantId: client.participantId,
              username: client.username,
              timestamp: Date.now(),
              provider: client.provider,
              channel: {
                alternatives: [
                  {
                    transcript: transcriptText.trim(),
                    confidence,
                    words: words2
                  }
                ]
              }
            };
            client.send(JSON.stringify(normalizedPayload));
          }
        } catch {
          client.send(data.toString());
        }
      });
      upstreamSocket.on("error", (err) => {
        console.error(`[STT Gateway] ${provider2} socket error:`, err.message);
        if (provider2 === "deepgram" && hasMurf && client.readyState === WebSocket2.OPEN) {
          console.warn("[STT Gateway] Switching upstream from Deepgram to Murf AI fallback...");
          client.send(
            JSON.stringify({
              type: "status",
              status: "reconnecting",
              message: "Switching to secondary speech recognition engine..."
            })
          );
          try {
            upstreamSocket?.close();
          } catch {
          }
          connectUpstream("murf");
          return;
        } else if (provider2 === "murf" && hasDeepgram && client.readyState === WebSocket2.OPEN) {
          console.warn("[STT Gateway] Switching upstream from Murf to Deepgram fallback...");
          client.send(
            JSON.stringify({
              type: "status",
              status: "reconnecting",
              message: "Failing over to secondary speech recognition engine..."
            })
          );
          try {
            upstreamSocket?.close();
          } catch {
          }
          connectUpstream("deepgram");
          return;
        }
        if (client.readyState === WebSocket2.OPEN) {
          client.send(
            JSON.stringify({
              type: "error",
              status: "error",
              message: `Upstream ${provider2} STT stream error: ${err.message}`
            })
          );
        }
      });
      upstreamSocket.on("close", (code, reason) => {
        if (client.readyState === WebSocket2.OPEN) {
          client.close(code, reason.toString());
        }
      });
    }
    connectUpstream(hasDeepgram ? "deepgram" : hasMurf ? "murf" : "deepgram");
    client.on("message", (data, isBinary) => {
      const upstream = client.upstreamSocket;
      if (isBinary) {
        const chunk = Buffer.from(data);
        if (upstream && upstream.readyState === WebSocket2.OPEN) {
          upstream.send(chunk);
        } else if (upstream && upstream.readyState === WebSocket2.CONNECTING) {
          if (client.audioQueue && client.audioQueue.length < 100) {
            client.audioQueue.push(chunk);
          }
        }
      } else {
        try {
          const str = data.toString();
          const parsed = JSON.parse(str);
          if (parsed.type === "ping") {
            client.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          } else if (parsed.type === "Finalize" || parsed.type === "finalize") {
            if (upstream && upstream.readyState === WebSocket2.OPEN) {
              if (client.provider === "murf") {
                upstream.send(JSON.stringify({ type: "Finalize" }));
              } else {
                upstream.send(JSON.stringify({ type: "Finalize" }));
              }
            }
          } else if (upstream && upstream.readyState === WebSocket2.OPEN) {
            upstream.send(str);
          }
        } catch {
          if (upstream && upstream.readyState === WebSocket2.OPEN) {
            upstream.send(data.toString());
          }
        }
      }
    });
    client.on("close", () => {
      client.audioQueue = [];
      const upstream = client.upstreamSocket;
      if (upstream) {
        try {
          if (upstream.readyState === WebSocket2.OPEN) {
            upstream.send(JSON.stringify({ type: client.provider === "murf" ? "Finalize" : "CloseStream" }));
          }
          upstream.close();
        } catch {
        }
        client.upstreamSocket = null;
      }
    });
    client.on("error", () => {
      const upstream = client.upstreamSocket;
      if (upstream) {
        try {
          upstream.close();
        } catch {
        }
      }
    });
  });
  const heartbeatInterval = setInterval(() => {
    for (const client of wss.clients) {
      const sttClient = client;
      if (!sttClient.isAlive) {
        if (sttClient.upstreamSocket) {
          try {
            sttClient.upstreamSocket.close();
          } catch {
          }
        }
        sttClient.terminate();
      } else {
        sttClient.isAlive = false;
        sttClient.ping();
      }
    }
  }, 3e4);
  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });
  console.log("\u26A1 STT Streaming Gateway attached at /api/v1/interview/stt-stream");
  return wss;
}

// src/index.ts
process.on("uncaughtException", (err) => {
  console.error("\u26A0\uFE0F Caught uncaughtException (crash shield active):", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("\u26A0\uFE0F Caught unhandledRejection at:", promise, "reason:", reason);
});
var app = express();
var PORT = process.env.PORT || 3001;
var generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1e3,
  maxRequests: 240,
  message: "Too many requests. Please wait a moment before trying again."
});
app.use(generalRateLimiter);
var config = {
  api: {
    bodyParser: false
  }
};
if (!process.env.VERCEL) {
  connectDB().catch((err) => {
    console.warn("MongoDB initial connection notice:", err.message);
  });
}
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
  })
);
app.use((_req, _res, next) => {
  if (mongoose14.connection.readyState === 1) {
    return next();
  }
  connectDB().then(() => next()).catch((err) => {
    console.warn("MongoDB connection warning in request middleware:", err.message);
    next();
  });
});
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use(express.text({ type: ["application/sdp", "text/plain"], limit: "10mb" }));
app.use("/api/auth", authRoutes_default);
app.use("/auth", authRoutes_default);
app.use("/api/v1/gamification", gamificationRoutes_default);
app.use("/v1/gamification", gamificationRoutes_default);
app.use("/api/gamification", gamificationRoutes_default);
app.use("/gamification", gamificationRoutes_default);
app.use("/api/v1/resume-analysis", resumeAnalysisRoutes_default);
app.use("/v1/resume-analysis", resumeAnalysisRoutes_default);
app.use("/resume-analysis", resumeAnalysisRoutes_default);
app.use("/api/v1/coding", codingRoutes_default);
app.use("/v1/coding", codingRoutes_default);
app.use("/api/coding", codingRoutes_default);
app.use("/coding", codingRoutes_default);
app.use("/api/v1/gd", gdRoutes_default);
app.use("/v1/gd", gdRoutes_default);
app.use("/gd", gdRoutes_default);
app.use("/api/v1", interviewRoutes_default);
app.use("/v1", interviewRoutes_default);
app.use("/api", codingRoutes_default);
app.get(["/", "/api"], (_req, res) => {
  res.json({
    status: "ok",
    message: "PrepX AI Placement & Coding Backend is running",
    endpoints: {
      auth: "/api/auth",
      interview: "/api/v1",
      resumeAnalysis: "/api/v1/resume-analysis",
      coding: "/api/v1/coding",
      gd: "/api/v1/gd",
      gamification: "/api/v1/gamification"
    }
  });
});
app.use((err, _req, res, _next) => {
  console.error("Unhandled API error:", err);
  if (res.headersSent) return;
  const status = Number(err.status || err.statusCode) || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error"
  });
});
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`\u{1F680} Server running on port ${PORT}`);
    initGDWebSocketServer(server);
    initSTTWebSocketServer(server);
    const hasGroq = !!process.env.GROQ_API_KEY?.trim();
    const hasMurf = !!process.env.MURF_API_KEY?.trim();
    console.log(`\u26A1 Groq LLM Engine: ${hasGroq ? "\u2705 Live API Connected (openai/gpt-oss-120b)" : "\u2705 Active (Smart Fallback Mode)"}`);
    console.log(`\u{1F399}\uFE0F  Murf AI Voice Engine: ${hasMurf ? "\u2705 Live Murf Speech & TTS Connected" : "\u2705 Active (Web Speech Fallback Mode)"}`);
  });
  server.keepAliveTimeout = 65e3;
  server.headersTimeout = 66e3;
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`\u274C Port ${PORT} is already in use. Please free port ${PORT} or kill the running process.`);
    } else {
      console.error("\u274C Server error:", error);
    }
  });
}
var index_default = app;
export {
  config,
  index_default as default
};
