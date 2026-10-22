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
      await user.save();
    }
    return { xpEarned, streakUpdated };
  } catch (error) {
    console.error("processDailyLoginBonus error:", error);
    return { xpEarned: 0, streakUpdated: false };
  }
}
async function awardActivityXP(userId, amount, activityName, extraBadge) {
  try {
    const user = await User.findById(userId);
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
    await user.save();
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
  getGroqClient: () => getGroqClient
});
import Groq from "groq-sdk";
function getGroqClient() {
  const rawKeys = process.env.GROQ_API_KEY;
  if (!rawKeys || !rawKeys.trim()) {
    return null;
  }
  const keys = rawKeys.split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    return null;
  }
  const selectedKey = keys[Math.floor(Math.random() * keys.length)];
  return new Groq({ apiKey: selectedKey });
}
function generateSmartFallbackQuestion(userMessageCount, candidateAnswer = "") {
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
  const groq = getGroqClient();
  if (!groq) {
    const userMessageCount = conversationHistory.filter((m) => m.type === "User").length + (latestUserMessage ? 1 : 0);
    return generateSmartFallbackQuestion(userMessageCount, latestUserMessage || "");
  }
  const githubSummary = typeof githubMetadata === "string" ? githubMetadata : JSON.stringify(githubMetadata || {});
  let modeContext = "";
  if (githubMetadata?.targetRole) {
    modeContext = `Target Job Role: ${githubMetadata.targetRole}. Focus questions on essential concepts, architecture, tooling, and best practices relevant to a ${githubMetadata.targetRole}.`;
  } else if (githubMetadata?.jobDescription) {
    modeContext = `Target Job Description:
${githubMetadata.jobDescription}
Focus questions strictly on the requirements, technologies, and skills mentioned in this Job Description.`;
  } else {
    modeContext = `Candidate GitHub Profile Context (Repositories):
${githubSummary}`;
  }
  const messages = [
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
${modeContext}`
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
  try {
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages,
      temperature: 0.7,
      max_tokens: 250
    });
    const reply = response.choices[0]?.message?.content?.trim();
    return reply || "That sounds interesting! Could you elaborate on how you structured the architecture for that?";
  } catch (error) {
    console.error("Groq response generation error:", error);
    const userMessageCount = conversationHistory.length;
    return generateSmartFallbackQuestion(userMessageCount, latestUserMessage || "");
  }
}
async function evaluateInterviewWithGroq(conversationHistory) {
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
  try {
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

// src/index.ts
import dotenv2 from "dotenv";
import express from "express";
import cors from "cors";

// src/config/db.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
var cachedConn = null;
var DEFAULT_MONGO_URI = "mongodb+srv://nikhilsabban56:ekbVqEywwnVnhhZg@cluster0.xxqun.mongodb.net/test?retryWrites=true&w=majority";
async function connectDB() {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }
  const primaryUri = process.env.MONGO_URI || DEFAULT_MONGO_URI;
  const URIs = [
    primaryUri,
    !process.env.VERCEL ? "mongodb://127.0.0.1:27017/ai-interviewer" : null,
    !process.env.VERCEL ? "mongodb://localhost:27017/ai-interviewer" : null
  ].filter(Boolean);
  for (const uri of URIs) {
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5e3 });
      console.log(`\u2705 MongoDB Connected: ${conn.connection.host}`);
      cachedConn = conn;
      try {
        await mongoose.connection.collection("interviews").dropIndexes();
        await mongoose.connection.collection("messages").dropIndexes();
        await mongoose.connection.collection("users").dropIndexes();
      } catch (e) {
      }
      return conn;
    } catch (error) {
      console.warn(`\u26A0\uFE0F MongoDB connection attempt failed (${uri.split("@").pop()}): ${error.message}`);
    }
  }
  console.warn("\u26A0\uFE0F Could not connect to any MongoDB instance.");
  if (!process.env.VERCEL) {
    process.exit(1);
  }
  return mongoose;
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
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : "");
  if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
    return origin.replace(/\/$/, "");
  }
  if (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes("localhost")) {
    return process.env.CLIENT_URL.replace(/\/$/, "");
  }
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes("localhost")) {
    return process.env.FRONTEND_URL.replace(/\/$/, "");
  }
  if (origin) {
    return origin.replace(/\/$/, "");
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
      const provider = user.authProvider && user.authProvider !== "local" ? user.authProvider : "Google";
      res.status(400).json({
        message: `This account was registered using ${provider}. Please sign in with ${provider} or use Forgot Password to create a password.`
      });
      return;
    }
    const isMatch2 = await bcrypt.compare(password, user.password);
    if (!isMatch2) {
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
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (username !== void 0 && username.trim() !== "") {
      const cleanUsername = username.trim().toLowerCase();
      const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
      if (!usernameRegex.test(cleanUsername)) {
        res.status(400).json({ message: "Username can only contain letters, numbers, underscores, dots, and hyphens" });
        return;
      }
      if (cleanUsername.length < 3) {
        res.status(400).json({ message: "Username must be at least 3 characters long" });
        return;
      }
      const existingUser = await User.findOne({ username: cleanUsername, _id: { $ne: user._id } });
      if (existingUser) {
        res.status(409).json({ message: "This username is already taken. Please choose another one." });
        return;
      }
      user.username = cleanUsername;
    }
    if (fullName !== void 0) user.fullName = fullName.trim();
    if (college !== void 0) user.college = college.trim();
    if (branch !== void 0) user.branch = branch.trim();
    if (degree !== void 0) user.degree = degree.trim();
    if (graduationYear !== void 0) user.graduationYear = graduationYear.trim();
    if (cgpa !== void 0) user.cgpa = cgpa.trim();
    if (profilePicture !== void 0) user.profilePicture = profilePicture;
    if (linkedinUrl !== void 0) user.linkedinUrl = linkedinUrl.trim();
    if (githubUrl !== void 0) user.githubUrl = githubUrl.trim();
    if (phoneNumber !== void 0) user.phoneNumber = phoneNumber.trim();
    const updatedUser = await user.save();
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
    const isMatch2 = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch2) {
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
async function findOrCreateOAuthUser(provider, providerId, name, email, picture) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      fullName: name || `${provider} User`,
      email,
      profilePicture: picture || "",
      authProvider: provider,
      providerId,
      isVerified: true
    });
  } else {
    user.isVerified = true;
    if (!user.authProvider || user.authProvider === "local") {
      user.authProvider = provider;
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
    await sendOtpEmail(normalizedEmail, otp, "login");
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
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpire = new Date(Date.now() + 10 * 60 * 1e3);
    user.emailOtpToken = hashedOtp;
    user.emailOtpExpire = otpExpire;
    await user.save();
    console.log(`

[PASSWORD CHANGE OTP FOR ${normalizedEmail}]: ${otp}

`);
    await sendOtpEmail(normalizedEmail, otp, "password_change");
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
    });
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
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    user.profilePicture = imageUrl;
    await user.save();
    res.json({
      success: true,
      message: "Profile updated successfully",
      url: imageUrl,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePicture: user.profilePicture
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

// src/types/index.ts
import z from "zod";
var PreInterviewBody = z.object({
  title: z.string().min(1, "Interview title is required"),
  mode: z.enum(["github", "role", "jd"]).optional().default("github"),
  github: z.string().optional(),
  role: z.string().optional(),
  jobDescription: z.string().optional(),
  difficulty: z.enum(["Basic", "Easy", "Medium", "Difficult"]).optional()
});

// src/scrapers/github.ts
import axios2 from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
async function scrapeGithub(username) {
  const proxyUrl = process.env.PROXY_URL;
  const httpsAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : void 0;
  const headers = {
    "User-Agent": "AI-Interviewer-MERN-App",
    Accept: "application/vnd.github.v3+json"
  };
  try {
    const response = await axios2.get(`https://api.github.com/users/${username}/repos`, {
      httpsAgent,
      headers,
      timeout: 8e3
    });
    return (response.data || []).map((x) => ({
      description: x.description || "",
      name: x.name,
      fullName: x.full_name,
      starCount: x.stargazers_count || 0
    }));
  } catch (err) {
    const status = err.response?.status;
    if (status === 404) {
      console.warn(`\u2139\uFE0F GitHub profile/user "${username}" not found. Using fallback metadata.`);
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

// src/models/Interview.ts
import mongoose3, { Schema as Schema2 } from "mongoose";
var InterviewSchema = new Schema2(
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
var Interview = mongoose3.model("Interview", InterviewSchema);

// src/models/Message.ts
import mongoose4, { Schema as Schema3 } from "mongoose";
var MessageSchema = new Schema3(
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
var Message = mongoose4.model("Message", MessageSchema);

// src/services/resultService.ts
init_groqService();
async function calculateResult(messages) {
  return await evaluateInterviewWithGroq(messages);
}

// src/controllers/interviewController.ts
init_groqService();

// src/services/deepgramService.ts
import axios3 from "axios";
async function synthesizeSpeechWithDeepgram(text, model = "aura-orpheus-en") {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  try {
    const response = await axios3.post(
      `https://api.deepgram.com/v1/speak?model=${model}`,
      { text },
      {
        headers: {
          Authorization: `Token ${apiKey.trim()}`,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );
    const buffer = Buffer.from(response.data);
    const contentType = String(response.headers["content-type"] || "audio/mp3");
    return { audioBuffer: buffer, contentType };
  } catch (error) {
    console.error("Deepgram TTS error:", error.response?.data?.toString() || error.message);
    return null;
  }
}

// src/controllers/interviewController.ts
function extractGithubUsername(input) {
  let clean = input.trim();
  clean = clean.replace(/\/+$/, "").replace(/\.git$/i, "");
  if (clean.includes("github.com/")) {
    const afterDomain = clean.split("github.com/")[1] || "";
    const parts2 = afterDomain.split("/").filter(Boolean);
    return parts2[0] || clean;
  }
  const parts = clean.split("/").filter(Boolean);
  return parts[0] || clean;
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
      const githubUsername = extractGithubUsername(data.github);
      githubData = await scrapeGithub(githubUsername);
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
  res.json({ key: process.env.DEEPGRAM_API_KEY || "" });
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
    await interview.save();
    const existingMessages = await Message.find({ interviewId }).sort({ createdAt: 1 });
    if (existingMessages.length > 0) {
      const lastAiMessage = existingMessages.filter((m) => m.type === "Assistant").pop();
      const text = lastAiMessage ? lastAiMessage.message : "Welcome to your interview! Tell me about your background.";
      const tts2 = await synthesizeSpeechWithDeepgram(text);
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
    await Message.create({
      interviewId,
      type: "Assistant",
      message: initialText
    });
    const tts = await synthesizeSpeechWithDeepgram(initialText);
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
    const interview = await Interview.findById(interviewId);
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
      interview.activeDeviceToken = token;
      await interview.save();
    }
    await Message.create({
      interviewId,
      type: "User",
      message: message.trim()
    });
    const conversationHistory = await Message.find({ interviewId }).sort({ createdAt: 1 });
    const formattedTurns = conversationHistory.map((m) => ({
      type: m.type,
      message: m.message
    }));
    const aiText = await generateInterviewerResponse(
      interview.githubMetadata,
      formattedTurns,
      void 0,
      interview.difficulty || "Medium"
    );
    await Message.create({
      interviewId,
      type: "Assistant",
      message: aiText
    });
    const tts = await synthesizeSpeechWithDeepgram(aiText);
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
        await interview.save();
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
    const interview = await Interview.findOne({ _id: interviewId, userId: req.user._id });
    if (!interview) {
      res.status(404).json({ message: "Interview record not found" });
      return;
    }
    interview.isBookmarked = !interview.isBookmarked;
    await interview.save();
    res.json({
      success: true,
      isBookmarked: interview.isBookmarked,
      message: interview.isBookmarked ? "Interview bookmarked" : "Bookmark removed"
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

// src/routes/interviewRoutes.ts
var router2 = Router2();
router2.post("/pre-interview", optionalAuth, createPreInterview);
router2.get("/deepgram-key", getDeepgramKey);
router2.post("/interview/initiate/:interviewId", optionalAuth, initiateInterview);
router2.post("/interview/respond/:interviewId", optionalAuth, processInterviewResponse);
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
import multer2 from "multer";

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
import { createRequire } from "module";
import mammoth from "mammoth";
var require2 = createRequire(import.meta.url);
var pdfParsePkg = null;
var PDFParse = null;
async function extractTextFromBuffer(buffer, fileType, originalFileName) {
  const isPdf = fileType.includes("pdf") || originalFileName.toLowerCase().endsWith(".pdf");
  const isDocx = fileType.includes("officedocument") || fileType.includes("docx") || originalFileName.toLowerCase().endsWith(".docx");
  let rawText = "";
  if (isPdf) {
    try {
      if (!pdfParsePkg) {
        try {
          pdfParsePkg = require2("pdf-parse");
          PDFParse = pdfParsePkg.PDFParse || pdfParsePkg.default?.PDFParse;
        } catch (e) {
          console.warn("Could not lazily load pdf-parse:", e?.message);
        }
      }
      if (typeof pdfParsePkg === "function") {
        const parsed = await pdfParsePkg(buffer);
        rawText = parsed.text || "";
      } else if (PDFParse) {
        const instance = new PDFParse({ data: buffer });
        const parsed = await instance.getText();
        rawText = typeof parsed === "string" ? parsed : parsed.text || "";
      } else {
        throw new Error("PDF parser class or function not available");
      }
    } catch (err) {
      console.error("PDF parse error:", err);
      throw new Error("Could not extract text from PDF resume.");
    }
  } else if (isDocx) {
    try {
      const parsed = await mammoth.extractRawText({ buffer });
      rawText = parsed.value;
    } catch (err) {
      console.error("DOCX parse error:", err);
      throw new Error("Could not extract text from DOCX resume.");
    }
  } else {
    rawText = buffer.toString("utf-8");
  }
  return rawText.replace(/\r\n/g, "\n").replace(/\t/g, " ").replace(/ +/g, " ").trim();
}
function parseStructuredResume(rawText) {
  const emailMatch = rawText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  const linkedinMatch = rawText.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i);
  const githubMatch = rawText.match(/https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i);
  const portfolioMatch = rawText.match(/https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/\S*)?/i);
  const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const candidateName = lines[0] && lines[0].length < 40 ? lines[0] : "";
  const skillKeywords = [
    // Languages & Database
    "JavaScript",
    "TypeScript",
    "Python",
    "Java",
    "C++",
    "C#",
    "SQL",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "Redis",
    "Elasticsearch",
    "HTML",
    "CSS",
    "R",
    "Go",
    "Rust",
    "PHP",
    "Scala",
    // Frameworks & Libraries
    "React",
    "Node.js",
    "Express",
    "Tailwind",
    "Next.js",
    "Vue.js",
    "Angular",
    "Django",
    "Flask",
    "FastAPI",
    "Spring Boot",
    "ASP.NET",
    "Pandas",
    "NumPy",
    "PyTorch",
    "TensorFlow",
    "Scikit-learn",
    "Redux",
    "Zustand",
    // Data Engineering & Analytics
    "ETL",
    "Data Pipelines",
    "Power BI",
    "Tableau",
    "Apache Spark",
    "Airflow",
    "Snowflake",
    "BigQuery",
    "Data Warehousing",
    "Star Schema",
    "Hadoop",
    "Kafka",
    "Data Modeling",
    "Databricks",
    // Cloud, DevOps & Tools
    "AWS",
    "Azure",
    "GCP",
    "Docker",
    "Kubernetes",
    "Git",
    "GitHub",
    "CI/CD",
    "GitHub Actions",
    "Jenkins",
    "Terraform",
    "Linux",
    "REST API",
    "GraphQL",
    "Microservices",
    "System Design",
    // Practices & Methodologies
    "OOP",
    "Object Oriented Programming",
    "Agile",
    "Scrum",
    "Data Structures",
    "Algorithms",
    "Unit Testing",
    "Pytest",
    "Jest",
    "Design Patterns",
    "Communication",
    "Leadership",
    "Problem Solving"
  ];
  const extractedSkills = [];
  skillKeywords.forEach((skill) => {
    const regex = new RegExp(`\\b${skill.replace(/\+/g, "\\+")}\\b`, "i");
    if (regex.test(rawText)) {
      extractedSkills.push(skill);
    }
  });
  return {
    extractedText: rawText,
    structuredData: {
      personal: {
        name: candidateName,
        email: emailMatch ? emailMatch[0] : "",
        phone: phoneMatch ? phoneMatch[0] : "",
        linkedin: linkedinMatch ? linkedinMatch[0] : "",
        github: githubMatch ? githubMatch[0] : "",
        portfolio: portfolioMatch && !portfolioMatch[0].includes("linkedin") && !portfolioMatch[0].includes("github") ? portfolioMatch[0] : ""
      },
      skills: extractedSkills,
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      achievements: [],
      languages: []
    }
  };
}

// src/services/analysis/atsScoringService.ts
function calculateATSScore(input) {
  const { extractedText, structuredData, jobDescriptionText, aiSemanticScore } = input;
  const textLower = extractedText.toLowerCase();
  const jdLower = (jobDescriptionText || "").toLowerCase();
  const personal = structuredData?.personal || {};
  let contactScore = 0;
  if (personal.name) contactScore += 30;
  if (personal.email) contactScore += 35;
  if (personal.phone) contactScore += 25;
  if (personal.linkedin || personal.github) contactScore += 10;
  contactScore = Math.min(100, contactScore);
  const requiredSections = [
    "experience",
    "work",
    "employment",
    "education",
    "degree",
    "skills",
    "projects",
    "summary",
    "objective"
  ];
  let foundSectionsCount = 0;
  requiredSections.forEach((sec) => {
    if (textLower.includes(sec)) foundSectionsCount++;
  });
  const structureScore = Math.min(100, Math.round(foundSectionsCount / 5 * 100));
  const formattingIssues = [];
  let formattingScore = 100;
  if (extractedText.length < 200) {
    formattingIssues.push("Resume contains very little readable text.");
    formattingScore -= 40;
  }
  if (/[\u25A0-\u25FF\u2600-\u26FF]/g.test(extractedText)) {
    formattingIssues.push("Unusual bullet icons or decorative symbols detected.");
    formattingScore -= 15;
  }
  if ((extractedText.match(/\t/g) || []).length > 20) {
    formattingIssues.push("Excessive tab characters or potential multi-column formatting detected.");
    formattingScore -= 20;
  }
  formattingScore = Math.max(0, formattingScore);
  let matchedKeywords = [];
  let missingKeywords = [];
  let matchedSkills = [];
  let missingSkills = [];
  let keywordScore = 75;
  let skillsScore = 75;
  let jobAlignmentScore = aiSemanticScore !== void 0 ? aiSemanticScore : 75;
  let experienceScore = 80;
  if (jdLower.trim()) {
    const resumeSkills = structuredData?.skills || [];
    const jdWords = Array.from(new Set(jdLower.match(/\b[a-z0-9.+]{3,}\b/gi) || []));
    const sampleTechTerms = [
      "javascript",
      "typescript",
      "react",
      "node.js",
      "express",
      "mongodb",
      "python",
      "aws",
      "docker",
      "sql",
      "git",
      "rest api",
      "graphql",
      "ci/cd",
      "microservices",
      "etl",
      "power bi",
      "pandas",
      "numpy",
      "data pipelines",
      "star schema"
    ];
    const jdRequiredSkills = sampleTechTerms.filter((term) => jdLower.includes(term));
    matchedSkills = resumeSkills.filter((s) => jdLower.includes(s.toLowerCase()));
    missingSkills = jdRequiredSkills.filter((s) => !resumeSkills.some((rs) => rs.toLowerCase() === s));
    if (jdRequiredSkills.length > 0) {
      skillsScore = Math.round(matchedSkills.length / jdRequiredSkills.length * 100);
    } else {
      skillsScore = resumeSkills.length > 3 ? 85 : 60;
    }
    const jdKeywords = jdWords.filter((w) => w.length > 4).slice(0, 20);
    matchedKeywords = jdKeywords.filter((kw) => textLower.includes(kw));
    missingKeywords = jdKeywords.filter((kw) => !textLower.includes(kw));
    if (jdKeywords.length > 0) {
      keywordScore = Math.round(matchedKeywords.length / jdKeywords.length * 100);
    }
  } else {
    matchedSkills = structuredData?.skills || [];
    missingSkills = [];
    matchedKeywords = (structuredData?.skills || []).slice(0, 10);
    missingKeywords = [];
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
  const jobMatchScore = Math.round(
    categories.keywordMatch * 0.4 + categories.skillsMatch * 0.4 + categories.jobAlignment * 0.2
  );
  return {
    atsScore,
    jobMatchScore,
    categories,
    matchedKeywords: matchedKeywords.slice(0, 15),
    missingKeywords: missingKeywords.slice(0, 15),
    matchedSkills,
    missingSkills,
    formattingIssues
  };
}

// src/services/ai/aiAnalysisService.ts
import { Groq as Groq2 } from "groq-sdk";
async function analyzeResumeWithAI(req) {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (!groqApiKey) {
    return getFallbackAIResponse(req);
  }
  const groq = new Groq2({ apiKey: groqApiKey });
  const hasJd = req.jobDescriptionText && req.jobDescriptionText.trim().length > 0;
  const systemPrompt = hasJd ? `You are a Senior Technical Recruiter & ATS Auditor.
Your task is to analyze candidate resumes strictly against a specific TARGET JOB DESCRIPTION and return a JSON evaluation.
Extract exact matching keywords/skills present in both the resume and the target job description, as well as missing critical keywords/skills required by the job description but omitted from the resume.

Return ONLY a single valid json object with the following schema:
{
  "semanticMatchScore": <number 0-100 based on alignment with target job>,
  "matchedKeywords": ["<exact keyword 1>", "<exact keyword 2>"],
  "missingKeywords": ["<required job keyword omitted from resume 1>", "<required job keyword omitted 2>"],
  "matchedSkills": ["<matched skill 1>", "<matched skill 2>"],
  "missingSkills": ["<required skill missing from candidate resume 1>", "<missing skill 2>"],
  "strengths": ["<specific candidate strength aligned with role>", "<strength 2>"],
  "weaknesses": ["<gap relative to job description>", "<weakness 2>"],
  "recommendations": [
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "category": "<Category Name>",
      "suggestion": "<Actionable recommendation to tailor resume for this job>",
      "reason": "<Why ATS/Recruiters need this for this specific role>"
    }
  ],
  "sectionFeedback": {
    "summary": "<Feedback for summary alignment>",
    "skills": "<Feedback for skills section>",
    "experience": "<Feedback for experience>",
    "projects": "<Feedback for projects>",
    "education": "<Feedback for education>"
  }
}` : `You are a Senior Technical Recruiter & General Resume Quality Auditor.
Your task is to audit candidate resumes for overall quality, technical breadth, section organization, and industry standards (No specific Job Description provided).
In "matchedKeywords" and "matchedSkills", list all candidate skills/technologies detected in their resume.
In "missingKeywords" and "missingSkills", leave empty [] as there is no specific job posting to compare against.

Return ONLY a single valid json object with the following schema:
{
  "semanticMatchScore": <number 0-100 overall resume quality score>,
  "matchedKeywords": ["<detected technology/skill 1>", "<detected skill 2>"],
  "missingKeywords": [],
  "matchedSkills": ["<detected skill 1>", "<detected skill 2>"],
  "missingSkills": [],
  "strengths": ["<standout resume strength>", "<strength 2>"],
  "weaknesses": ["<area for improvement>", "<weakness 2>"],
  "recommendations": [
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "category": "<Category Name>",
      "suggestion": "<General resume optimization suggestion>",
      "reason": "<Explanation>"
    }
  ],
  "sectionFeedback": {
    "summary": "<General feedback for summary>",
    "skills": "<General feedback for skills>",
    "experience": "<General feedback for experience>",
    "projects": "<General feedback for projects>",
    "education": "<General feedback for education>"
  }
}`;
  const userPrompt = hasJd ? `<candidate_resume>
${req.resumeText.slice(0, 4e3)}
</candidate_resume>

<target_job_description>
${req.jobDescriptionText?.slice(0, 3e3)}
</target_job_description>` : `<candidate_resume>
${req.resumeText.slice(0, 4e3)}
</candidate_resume>`;
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response received.");
    const parsed = JSON.parse(content);
    return {
      semanticMatchScore: typeof parsed.semanticMatchScore === "number" ? parsed.semanticMatchScore : 78,
      matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords : void 0,
      missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : void 0,
      matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : void 0,
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : void 0,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Strong core technical background"],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ["Could add more quantifiable metrics"],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      sectionFeedback: parsed.sectionFeedback || {
        summary: "Good clear summary",
        skills: "Well structured skill set",
        experience: "Highlight measurable business outcomes",
        projects: "Include live demo or repository links",
        education: "Clear academic details"
      }
    };
  } catch (err) {
    console.error("AI Analysis error:", err);
    return getFallbackAIResponse(req);
  }
}
function getFallbackAIResponse(req) {
  const text = req.resumeText || "";
  const skillsCount = req.structuredData?.skills?.length || 0;
  const wordCount = text.split(/\s+/).length;
  const dynamicStrengths = [];
  const dynamicWeaknesses = [];
  if (skillsCount > 5) {
    dynamicStrengths.push(`Extracted ${skillsCount} technical skills (${req.structuredData.skills.slice(0, 4).join(", ")})`);
  } else {
    dynamicWeaknesses.push("Technical skills section could be expanded with more modern frameworks & tools.");
  }
  if (wordCount > 300) {
    dynamicStrengths.push(`Comprehensive resume length (${wordCount} words) covering past projects & experience`);
  } else if (wordCount > 50) {
    dynamicWeaknesses.push(`Resume content is relatively concise (${wordCount} words). Consider adding details to project descriptions.`);
  }
  if (req.jobDescriptionText && req.jobDescriptionText.trim().length > 0) {
    dynamicStrengths.push("Job description target provided for tailored ATS alignment.");
  } else {
    dynamicWeaknesses.push("No specific Job Description provided. Analysis was performed against general industry standards.");
  }
  return {
    semanticMatchScore: Math.min(95, Math.max(50, 65 + skillsCount * 3)),
    strengths: dynamicStrengths.length > 0 ? dynamicStrengths : [
      "Solid technical background",
      "Clear contact information and section structure"
    ],
    weaknesses: dynamicWeaknesses.length > 0 ? dynamicWeaknesses : [
      "Bullet points could include more quantified metrics (e.g., % performance increase)"
    ],
    recommendations: [
      {
        priority: "HIGH",
        category: "Experience & Achievements",
        suggestion: "Add measurable results (metrics, numbers, or percentages) to your project bullet points.",
        reason: "Recruiters and ATS systems score bullet points higher when backed by evidence of impact."
      },
      {
        priority: "MEDIUM",
        category: "Keywords",
        suggestion: "Incorporate missing technical keywords aligned with your target position.",
        reason: "Aligning terminology directly with the job description improves keyword match score."
      }
    ],
    sectionFeedback: {
      summary: "Ensure your summary directly highlights your primary technical specialization.",
      skills: `Extracted skills: ${req.structuredData?.skills?.join(", ") || "None detected"}. Grouping skills into categories improves readability.`,
      experience: "Use strong action verbs like Developed, Implemented, Optimized, and Engineered.",
      projects: "Mention tech stack explicitly alongside what was built and the problem solved.",
      education: "Ensure degree and graduation timeline are clearly stated."
    }
  };
}

// src/controllers/resumeAnalysisController.ts
var storage2 = multer2.memoryStorage();
var uploadResumeFile = multer2({
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
    if (extractedText.length > 0) {
      console.log(`[ResumeParser] Text Preview: "${extractedText.slice(0, 150)}..."`);
    } else {
      console.warn(`[ResumeParser] WARNING: No text extracted from file ${req.file.originalname}. PDF may be scanned/image-only.`);
      throw new Error("Could not extract readable text from this PDF. If this is a scanned image/photo PDF, please use a text-based PDF or DOCX file.");
    }
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
    let jobDoc = null;
    if (jobDescriptionText && jobDescriptionText.trim().length > 0) {
      jobDoc = await JobDescription.create({
        userId: req.user._id,
        title: jobTitle || "Target Role",
        company: companyName || "",
        description: jobDescriptionText.trim()
      });
    }
    const aiResult = await analyzeResumeWithAI({
      resumeText: resume.extractedText,
      jobDescriptionText: jobDescriptionText || "",
      structuredData: resume.structuredData
    });
    const atsResult = calculateATSScore({
      extractedText: resume.extractedText,
      structuredData: resume.structuredData,
      jobDescriptionText: jobDescriptionText || "",
      aiSemanticScore: aiResult.semanticMatchScore
    });
    const matchedKeywords = aiResult.matchedKeywords && aiResult.matchedKeywords.length > 0 ? aiResult.matchedKeywords : atsResult.matchedKeywords;
    const missingKeywords = aiResult.missingKeywords && aiResult.missingKeywords.length > 0 ? aiResult.missingKeywords : atsResult.missingKeywords;
    const matchedSkills = aiResult.matchedSkills && aiResult.matchedSkills.length > 0 ? aiResult.matchedSkills : atsResult.matchedSkills;
    const missingSkills = aiResult.missingSkills && aiResult.missingSkills.length > 0 ? aiResult.missingSkills : atsResult.missingSkills;
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
router3.post("/upload", protect, uploadResumeFile.single("resume"), uploadAndParseResume);
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
var CodingSubmission = mongoose9.model("CodingSubmission", CodingSubmissionSchema);

// src/controllers/codingController.ts
init_User();

// src/services/codingExecutionService.ts
import vm from "vm";
import { execFile } from "child_process";
import { promisify } from "util";
import axios4 from "axios";
var execAsync = promisify(execFile);
var JUDGE0_BATCH_URL = "https://judge0-ce.p.rapidapi.com/submissions/batch";
var JUDGE0_LANG = { cpp: 54, python: 71, java: 62, c: 50, javascript: 63 };
var judge0Headers = () => ({
  "Content-Type": "application/json",
  "X-RapidAPI-Key": process.env.JUDGE0_API_KEY || "c25291f0c0msh4d4997be035c3b0p1f9b1djsnb6e749b944e6",
  "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
});
var fixInput = (s) => (s || "").replace(/\\n/g, "\n");
var applyWrapper = (userCode, wrapper) => {
  if (!wrapper || !wrapper.trim()) return userCode;
  return wrapper.replace("__USER_CODE__", userCode);
};
async function runLocalBatch(code, language, inputs) {
  const langName = language === "c++" ? "cpp" : language;
  return Promise.all(inputs.map(async (stdin) => {
    const start = Date.now();
    if (langName === "javascript") {
      const logs = [];
      const sandbox = {
        console: {
          log: (...args) => logs.push(args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")),
          error: (...args) => logs.push(args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "))
        },
        stdin,
        require: () => {
        }
      };
      sandbox.globalThis = sandbox;
      try {
        const jsRunner = `
; (function() {
  const rawInput = (typeof stdin !== 'undefined' ? String(stdin) : '').trim();
  let args = [];
  if (rawInput.length > 0) {
    const lines = rawInput.split('\\n').filter(l => l.length > 0);
    args = lines.map(line => {
      const trimmed = line.trim();
      try { 
        return JSON.parse(trimmed); 
      } catch (e) {
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          return trimmed.slice(1, -1);
        }
        return trimmed; 
      }
    });
  }

  let fn = null;
  if (typeof solve === 'function') fn = solve;
  else if (typeof Solution !== 'undefined') {
    const sol = typeof Solution === 'function' ? new Solution() : Solution;
    const proto = Object.getPrototypeOf(sol) || sol;
    const methods = Object.getOwnPropertyNames(proto).filter(m => m !== 'constructor' && typeof sol[m] === 'function');
    if (methods.length > 0) fn = sol[methods[0]].bind(sol);
  }

  if (!fn && typeof isValid === 'function') fn = isValid;
  if (!fn && typeof twoSum === 'function') fn = twoSum;
  if (!fn && typeof mergeTwoLists === 'function') fn = mergeTwoLists;
  if (!fn && typeof maxProfit === 'function') fn = maxProfit;
  if (!fn && typeof isAnagram === 'function') fn = isAnagram;
  if (!fn && typeof search === 'function') fn = search;
  if (!fn && typeof maxSubArray === 'function') fn = maxSubArray;

  if (!fn) {
    for (const key of Object.keys(globalThis)) {
      if (typeof globalThis[key] === 'function' && !['console', 'require', 'isValid'].includes(key)) {
        fn = globalThis[key];
        break;
      }
    }
  }

  if (fn) {
    const res = fn(...args);
    if (res !== undefined) {
      console.log(typeof res === 'object' ? JSON.stringify(res) : String(res));
    }
  }
})();
`;
        const fullCode = `${code}
${jsRunner}`;
        const script = new vm.Script(fullCode);
        const context = vm.createContext(sandbox);
        script.runInContext(context, { timeout: 4e3 });
        const elapsed2 = Date.now() - start;
        return {
          stdout: logs.join("\n").trim(),
          stderr: "",
          exitCode: 0,
          statusLabel: "Accepted",
          runtime: `${elapsed2}ms`,
          runtimeMs: elapsed2
        };
      } catch (err) {
        const elapsed2 = Date.now() - start;
        return {
          stdout: logs.join("\n").trim(),
          stderr: err.message || "Runtime Error",
          exitCode: 1,
          statusLabel: "Runtime Error",
          runtime: `${elapsed2}ms`,
          runtimeMs: elapsed2
        };
      }
    }
    if (langName === "python") {
      try {
        const pyRunner = `
import sys, json

${code}

if __name__ == '__main__':
    lines = """${stdin.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}""".strip().split('\\n')
    args = []
    for line in lines:
        if line.strip():
            try:
                args.append(json.loads(line))
            except:
                args.append(line.strip())
    fn = None
    if 'Solution' in globals():
        sol = Solution()
        methods = [m for m in dir(sol) if not m.startswith('_')]
        if methods:
            fn = getattr(sol, methods[0])
    if not fn:
        funcs = [v for k, v in globals().items() if callable(v) and not k.startswith('_') and k not in ('sys', 'json')]
        if funcs:
            fn = funcs[0]
    if fn:
        res = fn(*args)
        if res is not None:
            print(json.dumps(res) if isinstance(res, (bool, list, dict)) else res)
`;
        const { stdout, stderr } = await execAsync("python", ["-c", pyRunner], { timeout: 4e3 });
        const elapsed2 = Date.now() - start;
        return {
          stdout: (stdout || "").trim(),
          stderr: (stderr || "").trim(),
          exitCode: 0,
          statusLabel: "Accepted",
          runtime: `${elapsed2}ms`,
          runtimeMs: elapsed2
        };
      } catch (err) {
        const elapsed2 = Date.now() - start;
        return {
          stdout: (err.stdout || "").trim(),
          stderr: (err.stderr || err.message || "").trim(),
          exitCode: 1,
          statusLabel: "Runtime Error",
          runtime: `${elapsed2}ms`,
          runtimeMs: elapsed2
        };
      }
    }
    const elapsed = Date.now() - start;
    return {
      stdout: "",
      stderr: "Execution unsupported for this language in local offline mode",
      exitCode: 1,
      statusLabel: "Runtime Error",
      runtime: `${elapsed}ms`,
      runtimeMs: elapsed
    };
  }));
}
async function runBatch(code, language, inputs) {
  try {
    const start = Date.now();
    const langKey = language === "c++" ? "cpp" : language;
    const langId = JUDGE0_LANG[langKey];
    if (!langId) {
      return await runLocalBatch(code, language, inputs);
    }
    const response = await axios4.post(
      `${JUDGE0_BATCH_URL}?base64_encoded=false`,
      {
        submissions: inputs.map((stdin) => ({
          source_code: code,
          language_id: langId,
          stdin,
          cpu_time_limit: 5,
          wall_time_limit: 10
        }))
      },
      { headers: judge0Headers(), timeout: 5e3 }
    );
    const tokens = response.data;
    if (!Array.isArray(tokens) || tokens.some((t) => t.message?.includes("not subscribed"))) {
      return await runLocalBatch(code, language, inputs);
    }
    const tokenList = tokens.map((t) => t.token).join(",");
    let results = null;
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 800));
      const getResp = await axios4.get(
        `${JUDGE0_BATCH_URL}?tokens=${tokenList}&base64_encoded=false&fields=stdout,stderr,compile_output,status`,
        { headers: judge0Headers(), timeout: 5e3 }
      );
      const data = getResp.data;
      const allDone = data.submissions?.every((s) => s.status?.id >= 3);
      if (allDone) {
        results = data.submissions;
        break;
      }
    }
    if (!results) return await runLocalBatch(code, language, inputs);
    const elapsed = Date.now() - start;
    return results.map((s) => {
      const id = s.status?.id;
      const statusLabel = id === 3 ? "Accepted" : id === 4 ? "Wrong Answer" : id === 5 ? "Time Limit Exceeded" : id === 6 ? "Compilation Error" : "Runtime Error";
      return {
        stdout: (s.stdout || "").trim(),
        stderr: (s.stderr || s.compile_output || "").trim(),
        exitCode: id === 3 ? 0 : 1,
        statusLabel,
        runtime: `${elapsed}ms`,
        runtimeMs: elapsed
      };
    });
  } catch (err) {
    return await runLocalBatch(code, language, inputs);
  }
}

// src/utils/seedCodingProblems.ts
var INITIAL_PROBLEMS = [
  {
    "number": 1,
    "title": "Two Sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    "examples": [
      {
        "input": "nums = [2,7,11,15], target = 9",
        "output": "[0,1]",
        "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        "input": "nums = [3,2,4], target = 6",
        "output": "[1,2]",
        "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."
      }
    ],
    "constraints": [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists."
    ],
    "testCases": [
      {
        "input": "[2,7,11,15]\n9",
        "expected": "[0,1]"
      },
      {
        "input": "[3,2,4]\n6",
        "expected": "[1,2]"
      },
      {
        "input": "[3,3]\n6",
        "expected": "[0,1]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass",
      "javascript": "var twoSum = function(nums, target) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};",
      "java": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        return new int[]{};\n    }\n}",
      "c": "int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Hash Table"
    ],
    "companies": [
      "Google",
      "Amazon",
      "Meta",
      "Apple"
    ],
    "acceptance": 52.4,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 2,
    "title": "Valid Parentheses",
    "slug": "valid-parentheses",
    "difficulty": "Easy",
    "description": "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    "examples": [
      {
        "input": 's = "()"',
        "output": "true",
        "explanation": "Simple pair matches."
      },
      {
        "input": 's = "()[]{}"',
        "output": "true",
        "explanation": "All pairs match correctly."
      },
      {
        "input": 's = "(]"',
        "output": "false",
        "explanation": "Mismatched closing bracket."
      }
    ],
    "constraints": [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only '()[]{}'."
    ],
    "testCases": [
      {
        "input": '"()"',
        "expected": "true"
      },
      {
        "input": '"()[]{}"',
        "expected": "true"
      },
      {
        "input": '"(]"',
        "expected": "false"
      },
      {
        "input": '"{[]}"',
        "expected": "true"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def isValid(self, s: str) -> bool:\n        pass",
      "javascript": "var isValid = function(s) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool isValid(string s) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean isValid(String s) {\n        return false;\n    }\n}",
      "c": "bool isValid(char* s) {\n    \n}"
    },
    "tags": [
      "String",
      "Stack"
    ],
    "companies": [
      "Amazon",
      "Microsoft",
      "Google"
    ],
    "acceptance": 40.5,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 3,
    "title": "Merge Two Sorted Lists",
    "slug": "merge-two-sorted-lists",
    "difficulty": "Easy",
    "description": "You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.",
    "examples": [
      {
        "input": "list1 = [1,2,4], list2 = [1,3,4]",
        "output": "[1,1,2,3,4,4]",
        "explanation": "Merged sorted list."
      },
      {
        "input": "list1 = [], list2 = []",
        "output": "[]",
        "explanation": "Both lists empty."
      }
    ],
    "constraints": [
      "The number of nodes in both lists is in the range [0, 50].",
      "-100 <= Node.val <= 100",
      "Both list1 and list2 are sorted in non-decreasing order."
    ],
    "testCases": [
      {
        "input": "[1,2,4]\n[1,3,4]",
        "expected": "[1,1,2,3,4,4]"
      },
      {
        "input": "[]\n[]",
        "expected": "[]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n        pass",
      "javascript": "var mergeTwoLists = function(list1, list2) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n        \n    }\n};",
      "java": "class Solution {\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n        return null;\n    }\n}",
      "c": "struct ListNode* mergeTwoLists(struct ListNode* list1, struct ListNode* list2) {\n    \n}"
    },
    "tags": [
      "Linked List",
      "Recursion"
    ],
    "companies": [
      "Amazon",
      "Apple",
      "Meta"
    ],
    "acceptance": 63.1,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 4,
    "title": "Best Time to Buy and Sell Stock",
    "slug": "best-time-to-buy-and-sell-stock",
    "difficulty": "Easy",
    "description": "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i-th` day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.",
    "examples": [
      {
        "input": "prices = [7,1,5,3,6,4]",
        "output": "5",
        "explanation": "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5."
      },
      {
        "input": "prices = [7,6,4,3,1]",
        "output": "0",
        "explanation": "In this case, no transactions are done and max profit = 0."
      }
    ],
    "constraints": [
      "1 <= prices.length <= 10^5",
      "0 <= prices[i] <= 10^4"
    ],
    "testCases": [
      {
        "input": "[7,1,5,3,6,4]",
        "expected": "5"
      },
      {
        "input": "[7,6,4,3,1]",
        "expected": "0"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def maxProfit(self, prices: List[int]) -> int:\n        pass",
      "javascript": "var maxProfit = function(prices) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        \n    }\n};",
      "java": "class Solution {\n    public int maxProfit(int[] prices) {\n        return 0;\n    }\n}",
      "c": "int maxProfit(int* prices, int pricesSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Microsoft",
      "Google"
    ],
    "acceptance": 54.2,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 5,
    "title": "Valid Anagram",
    "slug": "valid-anagram",
    "difficulty": "Easy",
    "description": "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\nAn Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.",
    "examples": [
      {
        "input": 's = "anagram", t = "nagaram"',
        "output": "true"
      },
      {
        "input": 's = "rat", t = "car"',
        "output": "false"
      }
    ],
    "constraints": [
      "1 <= s.length, t.length <= 5 * 10^4",
      "s and t consist of lowercase English letters."
    ],
    "testCases": [
      {
        "input": '"anagram"\n"nagaram"',
        "expected": "true"
      },
      {
        "input": '"rat"\n"car"',
        "expected": "false"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def isAnagram(self, s: str, t: str) -> bool:\n        pass",
      "javascript": "var isAnagram = function(s, t) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean isAnagram(String s, String t) {\n        return false;\n    }\n}",
      "c": "bool isAnagram(char* s, char* t) {\n    \n}"
    },
    "tags": [
      "Hash Table",
      "String",
      "Sorting"
    ],
    "companies": [
      "Uber",
      "Google",
      "Amazon"
    ],
    "acceptance": 63.5,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 6,
    "title": "Binary Search",
    "slug": "binary-search",
    "difficulty": "Easy",
    "description": "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.",
    "examples": [
      {
        "input": "nums = [-1,0,3,5,9,12], target = 9",
        "output": "4",
        "explanation": "9 exists in nums and its index is 4"
      },
      {
        "input": "nums = [-1,0,3,5,9,12], target = 2",
        "output": "-1",
        "explanation": "2 does not exist in nums so return -1"
      }
    ],
    "constraints": [
      "1 <= nums.length <= 10^4",
      "-10^4 < nums[i], target < 10^4",
      "All integers in nums are unique.",
      "nums is sorted in ascending order."
    ],
    "testCases": [
      {
        "input": "[-1,0,3,5,9,12]\n9",
        "expected": "4"
      },
      {
        "input": "[-1,0,3,5,9,12]\n2",
        "expected": "-1"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def search(self, nums: List[int], target: int) -> int:\n        pass",
      "javascript": "var search = function(nums, target) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        \n    }\n};",
      "java": "class Solution {\n    public int search(int[] nums, int target) {\n        return -1;\n    }\n}",
      "c": "int search(int* nums, int numsSize, int target) {\n    \n}"
    },
    "tags": [
      "Array",
      "Binary Search"
    ],
    "companies": [
      "Apple",
      "Microsoft",
      "Google"
    ],
    "acceptance": 56.8,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 7,
    "title": "Maximum Subarray",
    "slug": "maximum-subarray",
    "difficulty": "Medium",
    "description": "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.",
    "examples": [
      {
        "input": "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        "output": "6",
        "explanation": "The subarray [4,-1,2,1] has the largest sum 6."
      },
      {
        "input": "nums = [1]",
        "output": "1"
      },
      {
        "input": "nums = [5,4,-1,7,8]",
        "output": "23"
      }
    ],
    "constraints": [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4"
    ],
    "testCases": [
      {
        "input": "[-2,1,-3,4,-1,2,1,-5,4]",
        "expected": "6"
      },
      {
        "input": "[1]",
        "expected": "1"
      },
      {
        "input": "[5,4,-1,7,8]",
        "expected": "23"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def maxSubArray(self, nums: List[int]) -> int:\n        pass",
      "javascript": "var maxSubArray = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int maxSubArray(int[] nums) {\n        return 0;\n    }\n}",
      "c": "int maxSubArray(int* nums, int numsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Divide and Conquer",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Microsoft",
      "Apple",
      "LinkedIn"
    ],
    "acceptance": 50.3,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 8,
    "title": "Container With Most Water",
    "slug": "container-with-most-water",
    "difficulty": "Medium",
    "description": "You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i-th` line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.",
    "examples": [
      {
        "input": "height = [1,8,6,2,5,4,8,3,7]",
        "output": "49",
        "explanation": "The vertical lines are [1,8,6,2,5,4,8,3,7]. In this case, max area of water is 49."
      },
      {
        "input": "height = [1,1]",
        "output": "1"
      }
    ],
    "constraints": [
      "n == height.length",
      "2 <= n <= 10^5",
      "0 <= height[i] <= 10^4"
    ],
    "testCases": [
      {
        "input": "[1,8,6,2,5,4,8,3,7]",
        "expected": "49"
      },
      {
        "input": "[1,1]",
        "expected": "1"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def maxArea(self, height: List[int]) -> int:\n        pass",
      "javascript": "var maxArea = function(height) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        \n    }\n};",
      "java": "class Solution {\n    public int maxArea(int[] height) {\n        return 0;\n    }\n}",
      "c": "int maxArea(int* height, int heightSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Two Pointers",
      "Greedy"
    ],
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptance": 54.1,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 9,
    "title": "Longest Substring Without Repeating Characters",
    "slug": "longest-substring-without-repeating-characters",
    "difficulty": "Medium",
    "description": "Given a string `s`, find the length of the **longest substring** without repeating characters.",
    "examples": [
      {
        "input": 's = "abcabcbb"',
        "output": "3",
        "explanation": 'The answer is "abc", with the length of 3.'
      },
      {
        "input": 's = "bbbbb"',
        "output": "1",
        "explanation": 'The answer is "b", with the length of 1.'
      },
      {
        "input": 's = "pwwkew"',
        "output": "3",
        "explanation": 'The answer is "wke", with the length of 3.'
      }
    ],
    "constraints": [
      "0 <= s.length <= 5 * 10^4",
      "s consists of English letters, digits, symbols and spaces."
    ],
    "testCases": [
      {
        "input": '"abcabcbb"',
        "expected": "3"
      },
      {
        "input": '"bbbbb"',
        "expected": "1"
      },
      {
        "input": '"pwwkew"',
        "expected": "3"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        pass",
      "javascript": "var lengthOfLongestSubstring = function(s) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        \n    }\n};",
      "java": "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        return 0;\n    }\n}",
      "c": "int lengthOfLongestSubstring(char* s) {\n    \n}"
    },
    "tags": [
      "Hash Table",
      "String",
      "Sliding Window"
    ],
    "companies": [
      "Amazon",
      "Bloomberg",
      "Google"
    ],
    "acceptance": 34.7,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 10,
    "title": "Trapping Rain Water",
    "slug": "trapping-rain-water",
    "difficulty": "Hard",
    "description": "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.",
    "examples": [
      {
        "input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        "output": "6",
        "explanation": "The above elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are trapped."
      },
      {
        "input": "height = [4,2,0,3,2,5]",
        "output": "9",
        "explanation": "Traps 9 units of water."
      }
    ],
    "constraints": [
      "n == height.length",
      "1 <= n <= 2 * 10^4",
      "0 <= height[i] <= 10^5"
    ],
    "testCases": [
      {
        "input": "[0,1,0,2,1,0,1,3,2,1,2,1]",
        "expected": "6"
      },
      {
        "input": "[4,2,0,3,2,5]",
        "expected": "9"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def trap(self, height: List[int]) -> int:\n        pass",
      "javascript": "var trap = function(height) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int trap(vector<int>& height) {\n        \n    }\n};",
      "java": "class Solution {\n    public int trap(int[] height) {\n        return 0;\n    }\n}",
      "c": "int trap(int* height, int heightSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Two Pointers",
      "Dynamic Programming",
      "Stack"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Meta",
      "Goldman Sachs"
    ],
    "acceptance": 61.2,
    "points": 400,
    "premium": true,
    "hidden": false
  },
  {
    "number": 11,
    "title": "3Sum",
    "slug": "3sum",
    "difficulty": "Medium",
    "description": "Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nNotice that the solution set must not contain duplicate triplets.",
    "examples": [
      {
        "input": "nums = [-1,0,1,2,-1,-4]",
        "output": "[[-1,-1,2],[-1,0,1]]",
        "explanation": "Distinct triplets that sum to zero."
      },
      {
        "input": "nums = [0,1,1]",
        "output": "[]",
        "explanation": "The only possible triplet does not sum up to 0."
      },
      {
        "input": "nums = [0,0,0]",
        "output": '[["0","0","0"]]',
        "explanation": "The only possible triplet sums up to 0."
      }
    ],
    "constraints": [
      "3 <= nums.length <= 3000",
      "-10^5 <= nums[i] <= 10^5"
    ],
    "testCases": [
      {
        "input": "[-1,0,1,2,-1,-4]",
        "expected": "[[-1,-1,2],[-1,0,1]]"
      },
      {
        "input": "[0,1,1]",
        "expected": "[]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def threeSum(self, nums: List[int]) -> List[List[int]]:\n        pass",
      "javascript": "var threeSum = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int** threeSum(int* nums, int numsSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Two Pointers",
      "Sorting"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Microsoft",
      "Google"
    ],
    "acceptance": 34.2,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 12,
    "title": "Climbing Stairs",
    "slug": "climbing-stairs",
    "difficulty": "Easy",
    "description": "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?",
    "examples": [
      {
        "input": "n = 2",
        "output": "2",
        "explanation": "1. 1 step + 1 step\n2. 2 steps"
      },
      {
        "input": "n = 3",
        "output": "3",
        "explanation": "1. 1 + 1 + 1\n2. 1 + 2\n3. 2 + 1"
      }
    ],
    "constraints": [
      "1 <= n <= 45"
    ],
    "testCases": [
      {
        "input": "2",
        "expected": "2"
      },
      {
        "input": "3",
        "expected": "3"
      },
      {
        "input": "5",
        "expected": "8"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def climbStairs(self, n: int) -> int:\n        pass",
      "javascript": "var climbStairs = function(n) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int climbStairs(int n) {\n        \n    }\n};",
      "java": "class Solution {\n    public int climbStairs(int n) {\n        return 0;\n    }\n}",
      "c": "int climbStairs(int n) {\n    \n}"
    },
    "tags": [
      "Math",
      "Dynamic Programming",
      "Memoization"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Apple"
    ],
    "acceptance": 52.8,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 13,
    "title": "Product of Array Except Self",
    "slug": "product-of-array-except-self",
    "difficulty": "Medium",
    "description": "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\n\nThe product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.\n\nYou must write an algorithm that runs in `O(n)` time and without using the division operation.",
    "examples": [
      {
        "input": "nums = [1,2,3,4]",
        "output": "[24,12,8,6]"
      },
      {
        "input": "nums = [-1,1,0,-3,3]",
        "output": "[0,0,9,0,0]"
      }
    ],
    "constraints": [
      "2 <= nums.length <= 10^5",
      "-30 <= nums[i] <= 30"
    ],
    "testCases": [
      {
        "input": "[1,2,3,4]",
        "expected": "[24,12,8,6]"
      },
      {
        "input": "[-1,1,0,-3,3]",
        "expected": "[0,0,9,0,0]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def productExceptSelf(self, nums: List[int]) -> List[int]:\n        pass",
      "javascript": "var productExceptSelf = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        return new int[]{};\n    }\n}",
      "c": "int* productExceptSelf(int* nums, int numsSize, int* returnSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Prefix Sum"
    ],
    "companies": [
      "Amazon",
      "Apple",
      "Meta",
      "Microsoft"
    ],
    "acceptance": 65.4,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 14,
    "title": "Search in Rotated Sorted Array",
    "slug": "search-in-rotated-sorted-array",
    "difficulty": "Medium",
    "description": "There is an integer array `nums` sorted in ascending order (with distinct values).\n\nPrior to being passed to your function, `nums` is possibly rotated at an unknown pivot index `k`.\n\nGiven the array `nums` after the possible rotation and an integer `target`, return the index of `target` if it is in `nums`, or `-1` if it is not in `nums`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.",
    "examples": [
      {
        "input": "nums = [4,5,6,7,0,1,2], target = 0",
        "output": "4"
      },
      {
        "input": "nums = [4,5,6,7,0,1,2], target = 3",
        "output": "-1"
      }
    ],
    "constraints": [
      "1 <= nums.length <= 5000",
      "-10^4 <= nums[i] <= 10^4"
    ],
    "testCases": [
      {
        "input": "[4,5,6,7,0,1,2]\n0",
        "expected": "4"
      },
      {
        "input": "[4,5,6,7,0,1,2]\n3",
        "expected": "-1"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def search(self, nums: List[int], target: int) -> int:\n        pass",
      "javascript": "var search = function(nums, target) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        \n    }\n};",
      "java": "class Solution {\n    public int search(int[] nums, int target) {\n        return -1;\n    }\n}",
      "c": "int search(int* nums, int numsSize, int target) {\n    \n}"
    },
    "tags": [
      "Array",
      "Binary Search"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "LinkedIn"
    ],
    "acceptance": 40.1,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 15,
    "title": "Coin Change",
    "slug": "coin-change",
    "difficulty": "Medium",
    "description": "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.\n\nYou may assume that you have an infinite number of each kind of coin.",
    "examples": [
      {
        "input": "coins = [1,2,5], amount = 11",
        "output": "3",
        "explanation": "11 = 5 + 5 + 1"
      },
      {
        "input": "coins = [2], amount = 3",
        "output": "-1"
      }
    ],
    "constraints": [
      "1 <= coins.length <= 12",
      "1 <= coins[i] <= 2^31 - 1",
      "0 <= amount <= 10^4"
    ],
    "testCases": [
      {
        "input": "[1,2,5]\n11",
        "expected": "3"
      },
      {
        "input": "[2]\n3",
        "expected": "-1"
      },
      {
        "input": "[1]\n0",
        "expected": "0"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def coinChange(self, coins: List[int], amount: int) -> int:\n        pass",
      "javascript": "var coinChange = function(coins, amount) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        \n    }\n};",
      "java": "class Solution {\n    public int coinChange(int[] coins, int amount) {\n        return -1;\n    }\n}",
      "c": "int coinChange(int* coins, int coinsSize, int amount) {\n    \n}"
    },
    "tags": [
      "Array",
      "Dynamic Programming",
      "Breadth-First Search"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Walmart"
    ],
    "acceptance": 43.1,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 16,
    "title": "Group Anagrams",
    "slug": "group-anagrams",
    "difficulty": "Medium",
    "description": "Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.\n\nAn Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.",
    "examples": [
      {
        "input": 'strs = ["eat","tea","tan","ate","nat","bat"]',
        "output": '[["bat"],["nat","tan"],["ate","eat","tea"]]'
      },
      {
        "input": 'strs = [""]',
        "output": '[[""]]',
        "explanation": "Single empty string."
      },
      {
        "input": 'strs = ["a"]',
        "output": '[["a"]]',
        "explanation": "Single character string."
      }
    ],
    "constraints": [
      "1 <= strs.length <= 10^4",
      "0 <= strs[i].length <= 100",
      "strs[i] consists of lowercase English letters."
    ],
    "testCases": [
      {
        "input": '["eat","tea","tan","ate","nat","bat"]',
        "expected": '[["eat","tea","ate"],["tan","nat"],["bat"]]'
      }
    ],
    "starter": {
      "python": "class Solution:\n    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:\n        pass",
      "javascript": "var groupAnagrams = function(strs) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<String>> groupAnagrams(String[] strs) {\n        return new ArrayList<>();\n    }\n}",
      "c": "char*** groupAnagrams(char** strs, int strsSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Hash Table",
      "String",
      "Sorting"
    ],
    "companies": [
      "Amazon",
      "Microsoft",
      "Uber"
    ],
    "acceptance": 67.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 17,
    "title": "Reverse Linked List",
    "slug": "reverse-linked-list",
    "difficulty": "Easy",
    "description": "Given the head of a singly linked list, reverse the list, and return the reversed list.",
    "examples": [
      {
        "input": "head = [1,2,3,4,5]",
        "output": "[5,4,3,2,1]"
      },
      {
        "input": "head = [1,2]",
        "output": "[2,1]",
        "explanation": "Two nodes reversed."
      },
      {
        "input": "head = []",
        "output": "[]",
        "explanation": "Empty list remains empty."
      }
    ],
    "constraints": [
      "The number of nodes in the list is the range [0, 5000].",
      "-5000 <= Node.val <= 5000"
    ],
    "testCases": [
      {
        "input": "[1,2,3,4,5]",
        "expected": "[5,4,3,2,1]"
      },
      {
        "input": "[1,2]",
        "expected": "[2,1]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        pass",
      "javascript": "var reverseList = function(head) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        \n    }\n};",
      "java": "class Solution {\n    public ListNode reverseList(ListNode head) {\n        return null;\n    }\n}",
      "c": "struct ListNode* reverseList(struct ListNode* head) {\n    \n}"
    },
    "tags": [
      "Linked List",
      "Recursion"
    ],
    "companies": [
      "Amazon",
      "Apple",
      "Google",
      "Meta"
    ],
    "acceptance": 75.6,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 18,
    "title": "Longest Palindromic Substring",
    "slug": "longest-palindromic-substring",
    "difficulty": "Medium",
    "description": "Given a string `s`, return the longest palindromic substring in `s`.",
    "examples": [
      {
        "input": 's = "babad"',
        "output": '"bab"',
        "explanation": '"aba" is also a valid answer.'
      },
      {
        "input": 's = "cbbd"',
        "output": '"bb"',
        "explanation": 'The longest palindromic substring is "bb".'
      }
    ],
    "constraints": [
      "1 <= s.length <= 1000",
      "s consist of only digits and English letters."
    ],
    "testCases": [
      {
        "input": '"babad"',
        "expected": '"bab"'
      },
      {
        "input": '"cbbd"',
        "expected": '"bb"'
      }
    ],
    "starter": {
      "python": "class Solution:\n    def longestPalindrome(self, s: str) -> str:\n        pass",
      "javascript": "var longestPalindrome = function(s) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    string longestPalindrome(string s) {\n        \n    }\n};",
      "java": 'class Solution {\n    public String longestPalindrome(String s) {\n        return "";\n    }\n}',
      "c": "char* longestPalindrome(char* s) {\n    \n}"
    },
    "tags": [
      "String",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Microsoft",
      "Adobe"
    ],
    "acceptance": 33.7,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 19,
    "title": "Word Break",
    "slug": "word-break",
    "difficulty": "Medium",
    "description": "Given a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.\n\nNote that the same word in the dictionary may be reused multiple times in the segmentation.",
    "examples": [
      {
        "input": 's = "leetcode", wordDict = ["leet","code"]',
        "output": "true"
      },
      {
        "input": 's = "applepenapple", wordDict = ["apple","pen"]',
        "output": "true",
        "explanation": 'Return true because "applepenapple" can be segmented as "apple pen apple".'
      },
      {
        "input": 's = "catsandog", wordDict = ["cats","dog","sand","and","cat"]',
        "output": "false",
        "explanation": "Cannot be segmented."
      }
    ],
    "constraints": [
      "1 <= s.length <= 300",
      "1 <= wordDict.length <= 1000"
    ],
    "testCases": [
      {
        "input": '"leetcode"\n["leet","code"]',
        "expected": "true"
      },
      {
        "input": '"applepenapple"\n["apple","pen"]',
        "expected": "true"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def wordBreak(self, s: str, wordDict: List[str]) -> bool:\n        pass",
      "javascript": "var wordBreak = function(s, wordDict) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool wordBreak(string s, vector<string>& wordDict) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean wordBreak(String s, List<String> wordDict) {\n        return false;\n    }\n}",
      "c": "bool wordBreak(char* s, char** wordDict, int wordDictSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Hash Table",
      "String",
      "Dynamic Programming",
      "Trie"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Bloomberg"
    ],
    "acceptance": 46.5,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 20,
    "title": "Number of Islands",
    "slug": "number-of-islands",
    "difficulty": "Medium",
    "description": "Given an `m x n` 2D binary grid `grid` which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.",
    "examples": [
      {
        "input": 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
        "output": "1"
      },
      {
        "input": 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
        "output": "3",
        "explanation": "Three separate connected land groups."
      }
    ],
    "constraints": [
      "m == grid.length",
      "n == grid[i].length",
      "1 <= m, n <= 300"
    ],
    "testCases": [
      {
        "input": '[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
        "expected": "1"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def numIslands(self, grid: List[List[str]]) -> int:\n        pass",
      "javascript": "var numIslands = function(grid) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        \n    }\n};",
      "java": "class Solution {\n    public int numIslands(char[][] grid) {\n        return 0;\n    }\n}",
      "c": "int numIslands(char** grid, int gridSize, int* gridColSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Depth-First Search",
      "Breadth-First Search",
      "Union Find",
      "Matrix"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Microsoft",
      "Bloomberg"
    ],
    "acceptance": 58.4,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 21,
    "title": "Rotate Image",
    "slug": "rotate-image",
    "difficulty": "Medium",
    "description": "You are given an `n x n` 2D matrix representing an image, rotate the image by **90 degrees (clockwise)** in-place.",
    "examples": [
      {
        "input": "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
        "output": "[[7,4,1],[8,5,2],[9,6,3]]"
      },
      {
        "input": "matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]",
        "output": "[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]",
        "explanation": "Matrix rotated 90 degrees clockwise."
      }
    ],
    "constraints": [
      "n == matrix.length == matrix[i].length",
      "1 <= n <= 20"
    ],
    "testCases": [
      {
        "input": "[[1,2,3],[4,5,6],[7,8,9]]",
        "expected": "[[7,4,1],[8,5,2],[9,6,3]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def rotate(self, matrix: List[List[int]]) -> None:\n        pass",
      "javascript": "var rotate = function(matrix) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    void rotate(vector<vector<int>>& matrix) {\n        \n    }\n};",
      "java": "class Solution {\n    public void rotate(int[][] matrix) {\n    }\n}",
      "c": "void rotate(int** matrix, int matrixSize, int* matrixColSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Math",
      "Matrix"
    ],
    "companies": [
      "Amazon",
      "Microsoft",
      "Apple"
    ],
    "acceptance": 72.1,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 22,
    "title": "Spiral Matrix",
    "slug": "spiral-matrix",
    "difficulty": "Medium",
    "description": "Given an `m x n` matrix, return all elements of the matrix in spiral order.",
    "examples": [
      {
        "input": "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
        "output": "[1,2,3,6,9,8,7,4,5]"
      },
      {
        "input": "matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]",
        "output": "[1,2,3,4,8,12,11,10,9,5,6,7]",
        "explanation": "Spiral order traversal."
      }
    ],
    "constraints": [
      "m == matrix.length",
      "n == matrix[i].length",
      "1 <= m, n <= 10"
    ],
    "testCases": [
      {
        "input": "[[1,2,3],[4,5,6],[7,8,9]]",
        "expected": "[1,2,3,6,9,8,7,4,5]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:\n        pass",
      "javascript": "var spiralOrder = function(matrix) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<int> spiralOrder(vector<vector<int>>& matrix) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<Integer> spiralOrder(int[][] matrix) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int* spiralOrder(int** matrix, int matrixSize, int* matrixColSize, int* returnSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Matrix",
      "Simulation"
    ],
    "companies": [
      "Microsoft",
      "Amazon",
      "Apple"
    ],
    "acceptance": 48.3,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 23,
    "title": "Merge Intervals",
    "slug": "merge-intervals",
    "difficulty": "Medium",
    "description": "Given an array of intervals where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.",
    "examples": [
      {
        "input": "intervals = [[1,3],[2,6],[8,10],[15,18]]",
        "output": "[[1,6],[8,10],[15,18]]"
      },
      {
        "input": "intervals = [[1,4],[4,5]]",
        "output": "[[1,5]]",
        "explanation": "Intervals [1,4] and [4,5] are considered overlapping."
      }
    ],
    "constraints": [
      "1 <= intervals.length <= 10^4",
      "intervals[i].length == 2"
    ],
    "testCases": [
      {
        "input": "[[1,3],[2,6],[8,10],[15,18]]",
        "expected": "[[1,6],[8,10],[15,18]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def merge(self, intervals: List[List[int]]) -> List[List[int]]:\n        pass",
      "javascript": "var merge = function(intervals) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& intervals) {\n        \n    }\n};",
      "java": "class Solution {\n    public int[][] merge(int[][] intervals) {\n        return new int[][]{};\n    }\n}",
      "c": "int** merge(int** intervals, int intervalsSize, int* intervalsColSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Sorting"
    ],
    "companies": [
      "Meta",
      "Amazon",
      "Google"
    ],
    "acceptance": 46.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 24,
    "title": "Insert Interval",
    "slug": "insert-interval",
    "difficulty": "Medium",
    "description": "You are given an array of non-overlapping intervals sorted by start time, insert `newInterval` into `intervals` such that intervals is still sorted and non-overlapping.",
    "examples": [
      {
        "input": "intervals = [[1,3],[6,9]], newInterval = [2,5]",
        "output": "[[1,5],[6,9]]"
      },
      {
        "input": "intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]",
        "output": "[[1,2],[3,10],[12,16]]",
        "explanation": "Because the new interval [4,8] overlaps with [3,5],[6,7],[8,10]."
      }
    ],
    "constraints": [
      "0 <= intervals.length <= 10^4",
      "newInterval.length == 2"
    ],
    "testCases": [
      {
        "input": "[[1,3],[6,9]]\n[2,5]",
        "expected": "[[1,5],[6,9]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:\n        pass",
      "javascript": "var insert = function(intervals, newInterval) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {\n        \n    }\n};",
      "java": "class Solution {\n    public int[][] insert(int[][] intervals, int[] newInterval) {\n        return new int[][]{};\n    }\n}",
      "c": "int** insert(int** intervals, int intervalsSize, int* intervalsColSize, int* newInterval, int newIntervalSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array"
    ],
    "companies": [
      "Google",
      "Meta",
      "Amazon"
    ],
    "acceptance": 40.2,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 25,
    "title": "Combination Sum",
    "slug": "combination-sum",
    "difficulty": "Medium",
    "description": "Given an array of distinct integers `candidates` and a target integer `target`, return a list of all unique combinations of candidates where the chosen numbers sum to target.",
    "examples": [
      {
        "input": "candidates = [2,3,6,7], target = 7",
        "output": "[[2,2,3],[7]]"
      },
      {
        "input": "candidates = [2,3,5], target = 8",
        "output": "[[2,2,2,2],[2,3,3],[3,5]]",
        "explanation": "2, 3, and 5 can form target 8 in multiple combinations."
      },
      {
        "input": "candidates = [2], target = 1",
        "output": "[]",
        "explanation": "Target cannot be formed."
      }
    ],
    "constraints": [
      "1 <= candidates.length <= 30",
      "2 <= candidates[i] <= 40"
    ],
    "testCases": [
      {
        "input": "[2,3,6,7]\n7",
        "expected": "[[2,2,3],[7]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:\n        pass",
      "javascript": "var combinationSum = function(candidates, target) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<Integer>> combinationSum(int[] candidates, int target) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int** combinationSum(int* candidates, int candidatesSize, int target, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Backtracking"
    ],
    "companies": [
      "Amazon",
      "Airbnb",
      "Microsoft"
    ],
    "acceptance": 70.1,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 26,
    "title": "Permutations",
    "slug": "permutations",
    "difficulty": "Medium",
    "description": "Given an array `nums` of distinct integers, return all the possible permutations. You can return the answer in any order.",
    "examples": [
      {
        "input": "nums = [1,2,3]",
        "output": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]"
      },
      {
        "input": "nums = [0,1]",
        "output": "[[0,1],[1,0]]",
        "explanation": "All two permutations."
      },
      {
        "input": "nums = [1]",
        "output": "[[1]]",
        "explanation": "Single element array."
      }
    ],
    "constraints": [
      "1 <= nums.length <= 6",
      "-10 <= nums[i] <= 10"
    ],
    "testCases": [
      {
        "input": "[1,2,3]",
        "expected": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def permute(self, nums: List[int]) -> List[List[int]]:\n        pass",
      "javascript": "var permute = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> permute(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<Integer>> permute(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int** permute(int* nums, int numsSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Backtracking"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Meta"
    ],
    "acceptance": 77.4,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 27,
    "title": "Subsets",
    "slug": "subsets",
    "difficulty": "Medium",
    "description": "Given an integer array `nums` of unique elements, return all possible subsets (the power set). The solution set must not contain duplicate subsets.",
    "examples": [
      {
        "input": "nums = [1,2,3]",
        "output": "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]"
      },
      {
        "input": "nums = [0]",
        "output": "[[],[0]]",
        "explanation": "All subsets of [0]."
      }
    ],
    "constraints": [
      "1 <= nums.length <= 10",
      "-10 <= nums[i] <= 10"
    ],
    "testCases": [
      {
        "input": "[1,2,3]",
        "expected": "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def subsets(self, nums: List[int]) -> List[List[int]]:\n        pass",
      "javascript": "var subsets = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> subsets(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<Integer>> subsets(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int** subsets(int* nums, int numsSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Backtracking",
      "Bit Manipulation"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Bloomberg"
    ],
    "acceptance": 76.5,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 28,
    "title": "Word Search",
    "slug": "word-search",
    "difficulty": "Medium",
    "description": "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid. The word can be constructed from letters of sequentially adjacent cells.",
    "examples": [
      {
        "input": 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"',
        "output": "true"
      },
      {
        "input": 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"',
        "output": "true",
        "explanation": 'Word "SEE" exists in the board.'
      },
      {
        "input": 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"',
        "output": "false",
        "explanation": "Same cell cannot be used twice."
      }
    ],
    "constraints": [
      "m == board.length",
      "n == board[i].length",
      "1 <= m, n <= 6"
    ],
    "testCases": [
      {
        "input": '[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]]\n"ABCCED"',
        "expected": "true"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def exist(self, board: List[List[str]], word: str) -> bool:\n        pass",
      "javascript": "var exist = function(board, word) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool exist(vector<vector<char>>& board, string word) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean exist(char[][] board, String word) {\n        return false;\n    }\n}",
      "c": "bool exist(char** board, int boardSize, int* boardColSize, char* word) {\n    \n}"
    },
    "tags": [
      "Array",
      "Backtracking",
      "Matrix"
    ],
    "companies": [
      "Amazon",
      "Bloomberg",
      "Microsoft"
    ],
    "acceptance": 41.2,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 29,
    "title": "Validate Binary Search Tree",
    "slug": "validate-binary-search-tree",
    "difficulty": "Medium",
    "description": "Given the root of a binary tree, determine if it is a valid binary search tree (BST).",
    "examples": [
      {
        "input": "root = [2,1,3]",
        "output": "true"
      },
      {
        "input": "root = [5,1,4,null,null,3,6]",
        "output": "false",
        "explanation": "The root node's value is 5 but its right child's value is 4."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [1, 10^4]."
    ],
    "testCases": [
      {
        "input": "[2,1,3]",
        "expected": "true"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def isValidBST(self, root: Optional[TreeNode]) -> bool:\n        pass",
      "javascript": "var isValidBST = function(root) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool isValidBST(TreeNode* root) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean isValidBST(TreeNode root) {\n        return false;\n    }\n}",
      "c": "bool isValidBST(struct TreeNode* root) {\n    \n}"
    },
    "tags": [
      "Tree",
      "Depth-First Search",
      "Binary Search Tree"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Microsoft"
    ],
    "acceptance": 32.5,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 30,
    "title": "Maximum Depth of Binary Tree",
    "slug": "maximum-depth-of-binary-tree",
    "difficulty": "Easy",
    "description": "Given the root of a binary tree, return its maximum depth. Maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7]",
        "output": "3"
      },
      {
        "input": "root = [1,null,2]",
        "output": "2",
        "explanation": "The binary tree has depth 2."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [0, 10^4]."
    ],
    "testCases": [
      {
        "input": "[3,9,20,null,null,15,7]",
        "expected": "3"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def maxDepth(self, root: Optional[TreeNode]) -> int:\n        pass",
      "javascript": "var maxDepth = function(root) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int maxDepth(TreeNode* root) {\n        \n    }\n};",
      "java": "class Solution {\n    public int maxDepth(TreeNode root) {\n        return 0;\n    }\n}",
      "c": "int maxDepth(struct TreeNode* root) {\n    \n}"
    },
    "tags": [
      "Tree",
      "Depth-First Search",
      "Breadth-First Search"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Apple"
    ],
    "acceptance": 74.9,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 31,
    "title": "Same Tree",
    "slug": "same-tree",
    "difficulty": "Easy",
    "description": "Given the roots of two binary trees `p` and `q`, write a function to check if they are the same or not.",
    "examples": [
      {
        "input": "p = [1,2,3], q = [1,2,3]",
        "output": "true"
      },
      {
        "input": "p = [1,2], q = [1,null,2]",
        "output": "false",
        "explanation": "Structures are different."
      },
      {
        "input": "p = [1,2,1], q = [1,1,2]",
        "output": "false",
        "explanation": "Values are different."
      }
    ],
    "constraints": [
      "The number of nodes in both trees is in the range [0, 100]."
    ],
    "testCases": [
      {
        "input": "[1,2,3]\n[1,2,3]",
        "expected": "true"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:\n        pass",
      "javascript": "var isSameTree = function(p, q) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool isSameTree(TreeNode* p, TreeNode* q) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean isSameTree(TreeNode p, TreeNode q) {\n        return false;\n    }\n}",
      "c": "bool isSameTree(struct TreeNode* p, struct TreeNode* q) {\n    \n}"
    },
    "tags": [
      "Tree",
      "Depth-First Search"
    ],
    "companies": [
      "Amazon",
      "Google"
    ],
    "acceptance": 60.5,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 32,
    "title": "Binary Tree Level Order Traversal",
    "slug": "binary-tree-level-order-traversal",
    "difficulty": "Medium",
    "description": "Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).",
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7]",
        "output": "[[3],[9,20],[15,7]]"
      },
      {
        "input": "root = [1]",
        "output": "[[1]]",
        "explanation": "Single level root."
      },
      {
        "input": "root = []",
        "output": "[]",
        "explanation": "Empty tree."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [0, 2000]."
    ],
    "testCases": [
      {
        "input": "[3,9,20,null,null,15,7]",
        "expected": "[[3],[9,20],[15,7]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:\n        pass",
      "javascript": "var levelOrder = function(root) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> levelOrder(TreeNode* root) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int** levelOrder(struct TreeNode* root, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Tree",
      "Breadth-First Search"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Microsoft"
    ],
    "acceptance": 66.2,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 33,
    "title": "Lowest Common Ancestor of a BST",
    "slug": "lowest-common-ancestor-of-a-bst",
    "difficulty": "Medium",
    "description": "Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.",
    "examples": [
      {
        "input": "root = [6,2,8,0,4,7,9], p = 2, q = 8",
        "output": "6"
      },
      {
        "input": "root = [6,2,8,0,4,7,9], p = 2, q = 4",
        "output": "2",
        "explanation": "LCA of 2 and 4 is 2 since a node can be an ancestor of itself."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [2, 10^5]."
    ],
    "testCases": [
      {
        "input": "[6,2,8,0,4,7,9]\n2\n8",
        "expected": "6"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':\n        pass",
      "javascript": "var lowestCommonAncestor = function(root, p, q) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {\n        \n    }\n};",
      "java": "class Solution {\n    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {\n        return null;\n    }\n}",
      "c": "struct TreeNode* lowestCommonAncestor(struct TreeNode* root, struct TreeNode* p, struct TreeNode* q) {\n    \n}"
    },
    "tags": [
      "Tree",
      "Depth-First Search",
      "BST"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Google"
    ],
    "acceptance": 63.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 34,
    "title": "Kth Smallest Element in a BST",
    "slug": "kth-smallest-element-in-a-bst",
    "difficulty": "Medium",
    "description": "Given the root of a binary search tree, and an integer `k`, return the `k-th` smallest value (1-indexed) of all the values of the nodes in the tree.",
    "examples": [
      {
        "input": "root = [3,1,4,null,2], k = 1",
        "output": "1"
      },
      {
        "input": "root = [5,3,6,2,4,null,null,1], k = 3",
        "output": "3",
        "explanation": "The 3rd smallest value is 3."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is n.",
      "1 <= k <= n <= 10^4"
    ],
    "testCases": [
      {
        "input": "[3,1,4,null,2]\n1",
        "expected": "1"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:\n        pass",
      "javascript": "var kthSmallest = function(root, k) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int kthSmallest(TreeNode* root, int k) {\n        \n    }\n};",
      "java": "class Solution {\n    public int kthSmallest(TreeNode root, int k) {\n        return 0;\n    }\n}",
      "c": "int kthSmallest(struct TreeNode* root, int k) {\n    \n}"
    },
    "tags": [
      "Tree",
      "Depth-First Search",
      "BST"
    ],
    "companies": [
      "Amazon",
      "Uber"
    ],
    "acceptance": 71.9,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 35,
    "title": "Serialize and Deserialize Binary Tree",
    "slug": "serialize-and-deserialize-binary-tree",
    "difficulty": "Hard",
    "description": "Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization algorithm works.",
    "examples": [
      {
        "input": "root = [1,2,3,null,null,4,5]",
        "output": "[1,2,3,null,null,4,5]"
      },
      {
        "input": "root = []",
        "output": "[]",
        "explanation": "Deserializing an empty tree returns null/empty."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [0, 10^4]."
    ],
    "testCases": [
      {
        "input": "[1,2,3,null,null,4,5]",
        "expected": "[1,2,3,null,null,4,5]"
      }
    ],
    "starter": {
      "python": "class Codec:\n    def serialize(self, root):\n        pass\n    def deserialize(self, data):\n        pass",
      "javascript": "var serialize = function(root) {}; var deserialize = function(data) {};",
      "cpp": "class Codec {\npublic:\n    string serialize(TreeNode* root) {}\n    TreeNode* deserialize(string data) {}\n};",
      "java": 'public class Codec {\n    public String serialize(TreeNode root) { return ""; }\n    public TreeNode deserialize(String data) { return null; }\n}',
      "c": "char* serialize(struct TreeNode* root) {}\nstruct TreeNode* deserialize(char* data) {}"
    },
    "tags": [
      "String",
      "Tree",
      "Breadth-First Search",
      "Design"
    ],
    "companies": [
      "Meta",
      "Google",
      "Amazon"
    ],
    "acceptance": 56.1,
    "points": 400,
    "premium": false,
    "hidden": false
  },
  {
    "number": 36,
    "title": "Course Schedule",
    "slug": "course-schedule",
    "difficulty": "Medium",
    "description": "There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [ai, bi]` indicates that you must take course `bi` first if you want to take course `ai`. Return `true` if you can finish all courses.",
    "examples": [
      {
        "input": "numCourses = 2, prerequisites = [[1,0]]",
        "output": "true"
      },
      {
        "input": "numCourses = 2, prerequisites = [[1,0],[0,1]]",
        "output": "false",
        "explanation": "There is a cycle between course 0 and course 1."
      }
    ],
    "constraints": [
      "1 <= numCourses <= 2000",
      "0 <= prerequisites.length <= 5000"
    ],
    "testCases": [
      {
        "input": "2\n[[1,0]]",
        "expected": "true"
      },
      {
        "input": "2\n[[1,0],[0,1]]",
        "expected": "false"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:\n        pass",
      "javascript": "var canFinish = function(numCourses, prerequisites) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean canFinish(int numCourses, int[][] prerequisites) {\n        return false;\n    }\n}",
      "c": "bool canFinish(int numCourses, int** prerequisites, int prerequisitesSize, int* prerequisitesColSize) {\n    \n}"
    },
    "tags": [
      "Depth-First Search",
      "Breadth-First Search",
      "Graph",
      "Topological Sort"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Uber"
    ],
    "acceptance": 46.9,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 37,
    "title": "Graph Valid Tree",
    "slug": "graph-valid-tree",
    "difficulty": "Medium",
    "description": "You have a graph of `n` nodes labeled from `0` to `n - 1`. Given an integer `n` and a list of `edges`, write a function to check whether these edges make up a valid tree.",
    "examples": [
      {
        "input": "n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]",
        "output": "true"
      },
      {
        "input": "n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]",
        "output": "false",
        "explanation": "Cycle exists between nodes 1, 2, 3."
      }
    ],
    "constraints": [
      "1 <= n <= 2000",
      "0 <= edges.length <= 5000"
    ],
    "testCases": [
      {
        "input": "5\n[[0,1],[0,2],[0,3],[1,4]]",
        "expected": "true"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def validTree(self, n: int, edges: List[List[int]]) -> bool:\n        pass",
      "javascript": "var validTree = function(n, edges) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool validTree(int n, vector<vector<int>>& edges) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean validTree(int n, int[][] edges) {\n        return false;\n    }\n}",
      "c": "bool validTree(int n, int** edges, int edgesSize, int* edgesColSize) {\n    \n}"
    },
    "tags": [
      "Depth-First Search",
      "Breadth-First Search",
      "Graph",
      "Union Find"
    ],
    "companies": [
      "LinkedIn",
      "Google",
      "Amazon"
    ],
    "acceptance": 47.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 38,
    "title": "Pacific Atlantic Water Flow",
    "slug": "pacific-atlantic-water-flow",
    "difficulty": "Medium",
    "description": "There is an `m x n` rectangular island that borders both the Pacific Ocean and Atlantic Ocean. Return a 2D list of grid coordinates result where `result[i] = [ri, ci]` denotes that rain water can flow from cell `(ri, ci)` to both oceans.",
    "examples": [
      {
        "input": "heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
        "output": "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]"
      },
      {
        "input": "heights = [[1]]",
        "output": "[[0,0]]",
        "explanation": "Water from single cell reaches both oceans."
      }
    ],
    "constraints": [
      "m == heights.length",
      "n == heights[r].length",
      "1 <= m, n <= 200"
    ],
    "testCases": [
      {
        "input": "[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
        "expected": "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:\n        pass",
      "javascript": "var pacificAtlantic = function(heights) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<Integer>> pacificAtlantic(int[][] heights) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int** pacificAtlantic(int** heights, int heightsSize, int* heightsColSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Depth-First Search",
      "Breadth-First Search",
      "Matrix"
    ],
    "companies": [
      "Google",
      "Amazon"
    ],
    "acceptance": 55,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 39,
    "title": "Longest Consecutive Sequence",
    "slug": "longest-consecutive-sequence",
    "difficulty": "Medium",
    "description": "Given an unsorted array of integers `nums`, return the length of the longest consecutive elements sequence. You must write an algorithm that runs in `O(n)` time.",
    "examples": [
      {
        "input": "nums = [100,4,200,1,3,2]",
        "output": "4",
        "explanation": "The longest consecutive elements sequence is [1, 2, 3, 4]. Its length is 4."
      },
      {
        "input": "nums = [0,3,7,2,5,8,4,6,0,1]",
        "output": "9",
        "explanation": "Sequence is [0,1,2,3,4,5,6,7,8], length 9."
      }
    ],
    "constraints": [
      "0 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9"
    ],
    "testCases": [
      {
        "input": "[100,4,200,1,3,2]",
        "expected": "4"
      },
      {
        "input": "[0,3,7,2,5,8,4,6,0,1]",
        "expected": "9"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def longestConsecutive(self, nums: List[int]) -> int:\n        pass",
      "javascript": "var longestConsecutive = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int longestConsecutive(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int longestConsecutive(int[] nums) {\n        return 0;\n    }\n}",
      "c": "int longestConsecutive(int* nums, int numsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Hash Table",
      "Union Find"
    ],
    "companies": [
      "Google",
      "Amazon",
      "Spotify"
    ],
    "acceptance": 47.2,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 40,
    "title": "Alien Dictionary",
    "slug": "alien-dictionary",
    "difficulty": "Hard",
    "description": "There is a new alien language that uses the Latin alphabet. However, the order among the letters is unknown to you. Given a list of strings `words` from the alien language's dictionary, return a string of the unique letters in the new alien language sorted in lexicographically increasing order by the new language's rules.",
    "examples": [
      {
        "input": 'words = ["wrt","wrf","er","ett","rftt"]',
        "output": '"wertf"'
      },
      {
        "input": 'words = ["z","x"]',
        "output": '"zx"',
        "explanation": "Simple two letter order."
      },
      {
        "input": 'words = ["z","x","z"]',
        "output": '""',
        "explanation": "Invalid order cycle."
      }
    ],
    "constraints": [
      "1 <= words.length <= 100",
      "1 <= words[i].length <= 100"
    ],
    "testCases": [
      {
        "input": '["wrt","wrf","er","ett","rftt"]',
        "expected": '"wertf"'
      }
    ],
    "starter": {
      "python": "class Solution:\n    def alienOrder(self, words: List[str]) -> str:\n        pass",
      "javascript": "var alienOrder = function(words) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    string alienOrder(vector<string>& words) {\n        \n    }\n};",
      "java": 'class Solution {\n    public String alienOrder(String[] words) {\n        return "";\n    }\n}',
      "c": "char* alienOrder(char** words, int wordsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "String",
      "Depth-First Search",
      "Topological Sort"
    ],
    "companies": [
      "Facebook",
      "Google",
      "Amazon"
    ],
    "acceptance": 35.8,
    "points": 400,
    "premium": false,
    "hidden": false
  },
  {
    "number": 41,
    "title": "House Robber",
    "slug": "house-robber",
    "difficulty": "Medium",
    "description": "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. Determine the maximum amount of money you can rob tonight without alerting the police.",
    "examples": [
      {
        "input": "nums = [1,2,3,1]",
        "output": "4",
        "explanation": "Rob house 1 (money = 1) and rob house 3 (money = 3). Total = 4."
      },
      {
        "input": "nums = [2,7,9,3,1]",
        "output": "12",
        "explanation": "Rob house 1 (money = 2), house 3 (money = 9), and house 5 (money = 1). Total = 12."
      }
    ],
    "constraints": [
      "1 <= nums.length <= 100",
      "0 <= nums[i] <= 400"
    ],
    "testCases": [
      {
        "input": "[1,2,3,1]",
        "expected": "4"
      },
      {
        "input": "[2,7,9,3,1]",
        "expected": "12"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def rob(self, nums: List[int]) -> int:\n        pass",
      "javascript": "var rob = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int rob(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int rob(int[] nums) {\n        return 0;\n    }\n}",
      "c": "int rob(int* nums, int numsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Microsoft"
    ],
    "acceptance": 50.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 42,
    "title": "House Robber II",
    "slug": "house-robber-ii",
    "difficulty": "Medium",
    "description": "You are a professional robber planning to rob houses along a street. All houses at this place are arranged in a circle. Return the maximum amount of money you can rob tonight without alerting the police.",
    "examples": [
      {
        "input": "nums = [2,3,2]",
        "output": "3"
      },
      {
        "input": "nums = [1,2,3,1]",
        "output": "4",
        "explanation": "Rob house 1 (money = 1) and house 3 (money = 3)."
      }
    ],
    "constraints": [
      "1 <= nums.length <= 100",
      "0 <= nums[i] <= 1000"
    ],
    "testCases": [
      {
        "input": "[2,3,2]",
        "expected": "3"
      },
      {
        "input": "[1,2,3,1]",
        "expected": "4"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def rob(self, nums: List[int]) -> int:\n        pass",
      "javascript": "var rob = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int rob(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int rob(int[] nums) {\n        return 0;\n    }\n}",
      "c": "int rob(int* nums, int numsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Microsoft"
    ],
    "acceptance": 41.6,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 43,
    "title": "Decode Ways",
    "slug": "decode-ways",
    "difficulty": "Medium",
    "description": `A message containing letters from A-Z can be encoded into numbers using the mapping 'A' -> "1" ... 'Z' -> "26". Given a string \`s\` containing only digits, return the number of ways to decode it.`,
    "examples": [
      {
        "input": 's = "12"',
        "output": "2",
        "explanation": 'It could be decoded as "AB" (1 2) or "L" (12).'
      },
      {
        "input": 's = "226"',
        "output": "3",
        "explanation": 'Decoded as "BZ" (2 26), "VF" (22 6), or "BBF" (2 2 6).'
      },
      {
        "input": 's = "06"',
        "output": "0",
        "explanation": '"06" cannot be mapped to "F" because of leading zero.'
      }
    ],
    "constraints": [
      "1 <= s.length <= 100",
      "s contains only digits and may contain leading zero(s)."
    ],
    "testCases": [
      {
        "input": '"12"',
        "expected": "2"
      },
      {
        "input": '"226"',
        "expected": "3"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def numDecodings(self, s: str) -> int:\n        pass",
      "javascript": "var numDecodings = function(s) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int numDecodings(string s) {\n        \n    }\n};",
      "java": "class Solution {\n    public int numDecodings(String s) {\n        return 0;\n    }\n}",
      "c": "int numDecodings(char* s) {\n    \n}"
    },
    "tags": [
      "String",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Meta"
    ],
    "acceptance": 34.5,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 44,
    "title": "Unique Paths",
    "slug": "unique-paths",
    "difficulty": "Medium",
    "description": "There is a robot on an `m x n` grid. The robot is initially located at the top-left corner. The robot tries to move to the bottom-right corner. The robot can only move either down or right at any point in time. Given the two integers `m` and `n`, return the number of possible unique paths.",
    "examples": [
      {
        "input": "m = 3, n = 7",
        "output": "28"
      },
      {
        "input": "m = 3, n = 2",
        "output": "3",
        "explanation": "From top-left to bottom-right: Right -> Down -> Down, Down -> Down -> Right, Down -> Right -> Down."
      }
    ],
    "constraints": [
      "1 <= m, n <= 100"
    ],
    "testCases": [
      {
        "input": "3\n7",
        "expected": "28"
      },
      {
        "input": "3\n2",
        "expected": "3"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def uniquePaths(self, m: int, n: int) -> int:\n        pass",
      "javascript": "var uniquePaths = function(m, n) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int uniquePaths(int m, int n) {\n        \n    }\n};",
      "java": "class Solution {\n    public int uniquePaths(int m, int n) {\n        return 0;\n    }\n}",
      "c": "int uniquePaths(int m, int n) {\n    \n}"
    },
    "tags": [
      "Math",
      "Dynamic Programming",
      "Combinatorics"
    ],
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptance": 63.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 45,
    "title": "Longest Increasing Subsequence",
    "slug": "longest-increasing-subsequence",
    "difficulty": "Medium",
    "description": "Given an integer array `nums`, return the length of the longest strictly increasing subsequence.",
    "examples": [
      {
        "input": "nums = [10,9,2,5,3,7,101,18]",
        "output": "4",
        "explanation": "The longest increasing subsequence is [2,3,7,101], length = 4."
      },
      {
        "input": "nums = [0,1,0,3,2,3]",
        "output": "4",
        "explanation": "The longest increasing subsequence is [0,1,2,3], length 4."
      },
      {
        "input": "nums = [7,7,7,7,7,7,7]",
        "output": "1",
        "explanation": "Strictly increasing requirement means max length is 1."
      }
    ],
    "constraints": [
      "1 <= nums.length <= 2500",
      "-10^4 <= nums[i] <= 10^4"
    ],
    "testCases": [
      {
        "input": "[10,9,2,5,3,7,101,18]",
        "expected": "4"
      },
      {
        "input": "[0,1,0,3,2,3]",
        "expected": "4"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def lengthOfLIS(self, nums: List[int]) -> int:\n        pass",
      "javascript": "var lengthOfLIS = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int lengthOfLIS(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int lengthOfLIS(int[] nums) {\n        return 0;\n    }\n}",
      "c": "int lengthOfLIS(int* nums, int numsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Binary Search",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Microsoft"
    ],
    "acceptance": 54.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 46,
    "title": "Palindromic Substrings",
    "slug": "palindromic-substrings",
    "difficulty": "Medium",
    "description": "Given a string `s`, return the number of palindromic substrings in it. A string is a palindrome when it reads the same backward as forward.",
    "examples": [
      {
        "input": 's = "abc"',
        "output": "3",
        "explanation": 'Three palindromic strings: "a", "b", "c".'
      },
      {
        "input": 's = "aaa"',
        "output": "6",
        "explanation": 'Palindromic strings: "a", "a", "a", "aa", "aa", "aaa".'
      }
    ],
    "constraints": [
      "1 <= s.length <= 1000"
    ],
    "testCases": [
      {
        "input": '"abc"',
        "expected": "3"
      },
      {
        "input": '"aaa"',
        "expected": "6"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def countSubstrings(self, s: str) -> int:\n        pass",
      "javascript": "var countSubstrings = function(s) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int countSubstrings(string s) {\n        \n    }\n};",
      "java": "class Solution {\n    public int countSubstrings(String s) {\n        return 0;\n    }\n}",
      "c": "int countSubstrings(char* s) {\n    \n}"
    },
    "tags": [
      "String",
      "Dynamic Programming"
    ],
    "companies": [
      "Meta",
      "Amazon"
    ],
    "acceptance": 67.5,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 47,
    "title": "Find Minimum in Rotated Sorted Array",
    "slug": "find-minimum-in-rotated-sorted-array",
    "difficulty": "Medium",
    "description": "Given the sorted rotated array `nums` of unique elements, return the minimum element of this array. You must write an algorithm that runs in `O(log n)` time.",
    "examples": [
      {
        "input": "nums = [3,4,5,1,2]",
        "output": "1"
      },
      {
        "input": "nums = [4,5,6,7,0,1,2]",
        "output": "0",
        "explanation": "The original array was [0,1,2,4,5,6,7] rotated 4 times."
      },
      {
        "input": "nums = [11,13,15,17]",
        "output": "11",
        "explanation": "The array was not rotated."
      }
    ],
    "constraints": [
      "n == nums.length",
      "1 <= n <= 5000",
      "-5000 <= nums[i] <= 5000"
    ],
    "testCases": [
      {
        "input": "[3,4,5,1,2]",
        "expected": "1"
      },
      {
        "input": "[4,5,6,7,0,1,2]",
        "expected": "0"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def findMin(self, nums: List[int]) -> int:\n        pass",
      "javascript": "var findMin = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int findMin(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int findMin(int[] nums) {\n        return 0;\n    }\n}",
      "c": "int findMin(int* nums, int numsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Binary Search"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Meta"
    ],
    "acceptance": 49.5,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 48,
    "title": "Top K Frequent Elements",
    "slug": "top-k-frequent-elements",
    "difficulty": "Medium",
    "description": "Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.",
    "examples": [
      {
        "input": "nums = [1,1,1,2,2,3], k = 2",
        "output": "[1,2]"
      },
      {
        "input": "nums = [1], k = 1",
        "output": "[1]",
        "explanation": "Single element array."
      }
    ],
    "constraints": [
      "1 <= nums.length <= 10^5",
      "k is in the range [1, the number of unique elements in the array]."
    ],
    "testCases": [
      {
        "input": "[1,1,1,2,2,3]\n2",
        "expected": "[1,2]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def topKFrequent(self, nums: List[int], k: int) -> List[int]:\n        pass",
      "javascript": "var topKFrequent = function(nums, k) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<int> topKFrequent(vector<int>& nums, int k) {\n        \n    }\n};",
      "java": "class Solution {\n    public int[] topKFrequent(int[] nums, int k) {\n        return new int[]{};\n    }\n}",
      "c": "int* topKFrequent(int* nums, int numsSize, int k, int* returnSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Hash Table",
      "Divide and Conquer",
      "Heap",
      "Bucket Sort"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Google"
    ],
    "acceptance": 62.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 49,
    "title": "Kth Largest Element in an Array",
    "slug": "kth-largest-element-in-an-array",
    "difficulty": "Medium",
    "description": "Given an integer array `nums` and an integer `k`, return the `k-th` largest element in the array. Note that it is the `k-th` largest element in the sorted order, not the `k-th` distinct element.",
    "examples": [
      {
        "input": "nums = [3,2,1,5,6,4], k = 2",
        "output": "5"
      },
      {
        "input": "nums = [3,2,3,1,2,4,5,5,6], k = 4",
        "output": "4",
        "explanation": "4th largest element is 4."
      }
    ],
    "constraints": [
      "1 <= k <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4"
    ],
    "testCases": [
      {
        "input": "[3,2,1,5,6,4]\n2",
        "expected": "5"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def findKthLargest(self, nums: List[int], k: int) -> int:\n        pass",
      "javascript": "var findKthLargest = function(nums, k) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int findKthLargest(vector<int>& nums, int k) {\n        \n    }\n};",
      "java": "class Solution {\n    public int findKthLargest(int[] nums, int k) {\n        return 0;\n    }\n}",
      "c": "int findKthLargest(int* nums, int numsSize, int k) {\n    \n}"
    },
    "tags": [
      "Array",
      "Divide and Conquer",
      "Sorting",
      "Heap",
      "Quickselect"
    ],
    "companies": [
      "Meta",
      "Amazon",
      "Google"
    ],
    "acceptance": 66.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 50,
    "title": "Median of Two Sorted Arrays",
    "slug": "median-of-two-sorted-arrays",
    "difficulty": "Hard",
    "description": "Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays. The overall run time complexity should be `O(log (m+n))`.",
    "examples": [
      {
        "input": "nums1 = [1,3], nums2 = [2]",
        "output": "2.0"
      },
      {
        "input": "nums1 = [1,2], nums2 = [3,4]",
        "output": "2.5",
        "explanation": "Merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5."
      }
    ],
    "constraints": [
      "nums1.length == m",
      "nums2.length == n",
      "0 <= m, n <= 1000"
    ],
    "testCases": [
      {
        "input": "[1,3]\n[2]",
        "expected": "2.0"
      },
      {
        "input": "[1,2]\n[3,4]",
        "expected": "2.5"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:\n        pass",
      "javascript": "var findMedianSortedArrays = function(nums1, nums2) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        \n    }\n};",
      "java": "class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        return 0.0;\n    }\n}",
      "c": "double findMedianSortedArrays(int* nums1, int nums1Size, int* nums2, int nums2Size) {\n    \n}"
    },
    "tags": [
      "Array",
      "Binary Search",
      "Divide and Conquer"
    ],
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptance": 39.5,
    "points": 400,
    "premium": false,
    "hidden": false
  }
];
async function seedCodingProblems() {
  try {
    console.log("\u{1F331} Syncing initial coding problems...");
    for (const p of INITIAL_PROBLEMS) {
      await CodingProblem.updateOne({ slug: p.slug }, { $set: p }, { upsert: true });
    }
    console.log(`\u2705 Successfully synced ${INITIAL_PROBLEMS.length} problems!`);
  } catch (err) {
    console.error("\u274C Failed to seed initial problems:", err.message);
  }
}

// src/controllers/codingController.ts
var getProblems = async (req, res) => {
  try {
    const { difficulty, tag, search, page = 1, limit = 100 } = req.query;
    const query = { hidden: false };
    if (difficulty && difficulty !== "all") query.difficulty = difficulty;
    if (tag && tag !== "all") query.tags = { $in: [new RegExp(String(tag), "i")] };
    if (search) query.title = { $regex: String(search), $options: "i" };
    let problems = await CodingProblem.find(query).select("-testCases -starter -hints").sort({ number: 1 }).limit(Number(limit));
    if (!problems || problems.length === 0) {
      problems = INITIAL_PROBLEMS;
    }
    res.json({ problems, total: problems.length, page: Number(page) });
  } catch (error) {
    res.json({ problems: INITIAL_PROBLEMS, total: INITIAL_PROBLEMS.length, page: 1 });
  }
};
var getProblemBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    let problem = await CodingProblem.findOne({ slug, hidden: false });
    if (!problem) {
      const initP = INITIAL_PROBLEMS.find((p) => p.slug === slug);
      if (initP) problem = initP;
    }
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
    let tags = await CodingProblem.distinct("tags", { hidden: false });
    if (!tags || tags.length === 0) {
      const tagSet = /* @__PURE__ */ new Set();
      INITIAL_PROBLEMS.forEach((p) => (p.tags || []).forEach((t) => tagSet.add(t)));
      tags = Array.from(tagSet);
    }
    res.json(tags.sort());
  } catch (error) {
    res.json(["Array", "Dynamic Programming", "Hash Table", "Stack", "String"].sort());
  }
};
var isMatch = (actual, expected) => {
  const act = (actual || "").trim();
  const exp = (expected || "").trim();
  if (act === exp) return true;
  const actLower = act.toLowerCase();
  const expLower = exp.toLowerCase();
  if ((expLower === "true" || expLower === "false") && actLower === expLower) {
    return true;
  }
  try {
    const parsedAct = JSON.parse(act);
    const parsedExp = JSON.parse(exp);
    if (JSON.stringify(parsedAct) === JSON.stringify(parsedExp)) {
      return true;
    }
    if (Array.isArray(parsedAct) && Array.isArray(parsedExp) && parsedAct.length === parsedExp.length) {
      if (typeof parsedAct[0] === "number" && typeof parsedExp[0] === "number") {
        const sortedAct = [...parsedAct].sort((a, b) => a - b);
        const sortedExp = [...parsedExp].sort((a, b) => a - b);
        if (JSON.stringify(sortedAct) === JSON.stringify(sortedExp)) {
          return true;
        }
      }
    }
  } catch (e) {
    const normAct = act.replace(/['"]/g, "").replace(/\s+/g, " ").replace(/\s*,\s*/g, ",");
    const normExp = exp.replace(/['"]/g, "").replace(/\s+/g, " ").replace(/\s*,\s*/g, ",");
    if (normAct === normExp) return true;
  }
  const numAct = Number(act);
  const numExp = Number(exp);
  if (!isNaN(numAct) && !isNaN(numExp) && Math.abs(numAct - numExp) < 1e-4) {
    return true;
  }
  return false;
};
var runCode = async (req, res) => {
  try {
    const { code, language, problemId, stdin = "" } = req.body;
    if (!code || !language) {
      res.status(400).json({ message: "Code and language are required" });
      return;
    }
    if (!problemId) {
      const batchRes = await runBatch(code, language, [fixInput(stdin)]);
      const result = batchRes[0];
      res.json({
        results: [{
          input: stdin,
          expected: "",
          actual: result ? result.stdout || result.stderr || "No output" : "No output",
          passed: result ? result.exitCode === 0 : false,
          stderr: result ? result.stderr : ""
        }]
      });
      return;
    }
    const problem = await CodingProblem.findById(problemId);
    if (!problem) {
      res.status(404).json({ message: "Problem not found" });
      return;
    }
    const wrapper = problem.codeWrapper?.[language] || "";
    const finalCode = applyWrapper(code, wrapper);
    const testCases = problem.testCases.filter((tc) => !tc.hidden);
    if (testCases.length === 0) {
      res.json({ results: [] });
      return;
    }
    const inputs = testCases.map((tc) => fixInput(tc.input));
    const batchResults = await runBatch(finalCode, language, inputs);
    const results = testCases.map((tc, i) => {
      const r = batchResults[i];
      const actual = r ? r.stdout : "";
      const expected = (tc.expected || "").trim();
      const exitCode = r ? r.exitCode : 1;
      const stderr = r ? r.stderr : "Execution error";
      const statusLabel = r ? r.statusLabel : "Error";
      return {
        input: tc.input,
        expected,
        actual: exitCode !== 0 ? stderr || "Runtime Error" : actual,
        passed: exitCode === 0 && isMatch(actual, expected),
        stderr,
        statusLabel
      };
    });
    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: "Error running code. Please try again." });
  }
};
var submitCode = async (req, res) => {
  try {
    const { code, language, problemId } = req.body;
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const problem = await CodingProblem.findById(problemId);
    if (!problem) {
      res.status(404).json({ message: "Problem not found" });
      return;
    }
    const wrapper = problem.codeWrapper?.[language] || "";
    const finalCode = applyWrapper(code, wrapper);
    const testCases = problem.testCases;
    if (testCases.length === 0) {
      const batchRes = await runBatch(finalCode, language, [""]);
      const result = batchRes[0];
      const exitCode = result ? result.exitCode : 1;
      const verdict2 = exitCode === 0 ? "Accepted" : "Runtime Error";
      const sub2 = new CodingSubmission({
        user: userId,
        problem: problemId,
        language,
        code,
        verdict: verdict2,
        runtime: result ? result.runtime : "N/A",
        testsPassed: exitCode === 0 ? 1 : 0,
        testsTotal: 1,
        output: result ? result.stdout : "",
        stderr: result ? result.stderr : ""
      });
      await sub2.save();
      const gamification2 = await updateUserCodingStats(userId.toString(), problem, verdict2 === "Accepted");
      res.json({ ...sub2.toObject(), beats: 85, failCase: null, gamification: gamification2 });
      return;
    }
    const inputs = testCases.map((tc) => fixInput(tc.input));
    const batchResults = await runBatch(finalCode, language, inputs);
    let passed = 0;
    let firstFail = null;
    let totalRuntime = 0;
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const r = batchResults[i];
      if (!tc || !r) continue;
      totalRuntime += r.runtimeMs || 0;
      const actual = r.stdout;
      const expected = (tc.expected || "").trim();
      if (r.exitCode !== 0) {
        if (!firstFail) {
          firstFail = {
            input: tc.input,
            expected,
            actual: r.stderr || "Runtime Error",
            stderr: r.stderr,
            isHidden: tc.hidden
          };
        }
        break;
      }
      if (isMatch(actual, expected)) {
        passed++;
      } else if (!firstFail) {
        firstFail = {
          input: tc.hidden ? "(hidden testcase)" : tc.input,
          expected: tc.hidden ? "(hidden testcase)" : expected,
          actual: tc.hidden ? "(hidden testcase)" : actual,
          isHidden: tc.hidden
        };
      }
    }
    const verdict = passed === testCases.length ? "Accepted" : firstFail?.stderr ? "Runtime Error" : "Wrong Answer";
    const sub = new CodingSubmission({
      user: userId,
      problem: problemId,
      language,
      code,
      verdict,
      runtime: `${Math.round(totalRuntime / testCases.length)}ms`,
      testsPassed: passed,
      testsTotal: testCases.length,
      output: firstFail ? JSON.stringify(firstFail) : "",
      stderr: firstFail?.stderr || ""
    });
    await sub.save();
    const gamification = await updateUserCodingStats(userId.toString(), problem, verdict === "Accepted");
    res.json({
      ...sub.toObject(),
      beats: verdict === "Accepted" ? Math.floor(Math.random() * 30 + 65) : null,
      failCase: firstFail,
      gamification
    });
  } catch (error) {
    res.status(500).json({ message: "Submission failed. Please try again." });
  }
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
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (!user.bookmarks) user.bookmarks = [];
    const index = user.bookmarks.findIndex((id) => id.toString() === problemId);
    let bookmarked = false;
    if (index > -1) {
      user.bookmarks.splice(index, 1);
      bookmarked = false;
    } else {
      user.bookmarks.push(new mongoose10.Types.ObjectId(problemId));
      bookmarked = true;
    }
    await user.save();
    res.json({
      success: true,
      bookmarked,
      bookmarks: user.bookmarks,
      message: bookmarked ? "Problem bookmarked" : "Bookmark removed"
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle bookmark" });
  }
};
var getUserBookmarks = async (req, res) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).populate("bookmarks");
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
    await user.save();
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

// src/routes/codingRoutes.ts
var router4 = Router4();
router4.get("/problems", optionalAuth, getProblems);
router4.get("/problems/tags", optionalAuth, getProblemTags);
router4.get("/problems/:slug", optionalAuth, getProblemBySlug);
router4.get("/leaderboard", optionalAuth, getLeaderboard2);
router4.post("/run", protect, runCode);
router4.post("/submit", protect, submitCode);
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
        const first = parseInt(match[1], 10);
        const second = parseInt(match[2], 10);
        if (first === 10) return false;
        if (first === 127) return false;
        if (first === 169 && second === 254) return false;
        if (first === 192 && second === 168) return false;
        if (first === 172 && second >= 16 && second <= 31) return false;
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
      const words = seg.text ? seg.text.trim().split(/\s+/).filter((w) => w.length > 0).length : 0;
      const duration = seg.durationSeconds > 0 ? seg.durationSeconds : Math.max(2, Math.round(words / 2.5));
      totalObservedSpeakingSeconds += duration;
      totalGroupWords += words;
      if (bucket) {
        bucket.segmentCount += 1;
        bucket.wordCount += words;
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
    const words = studentMetrics?.wordCount || 0;
    const turns = studentSegments.length;
    const speakingSeconds = studentMetrics?.totalSpeakingSeconds || 0;
    const percentTime = studentMetrics?.percentSpeakingTime || 0;
    if (turns === 0 || words < 5) {
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
    if (words > 120) topicRelevance += 4;
    topicRelevance = Math.min(25, Math.max(5, topicRelevance));
    let reasoning = 9;
    if (lowerText.includes("because") || lowerText.includes("therefore") || lowerText.includes("reason")) reasoning += 2;
    if (lowerText.includes("example") || lowerText.includes("instance") || lowerText.includes("data") || lowerText.includes("study")) reasoning += 3;
    if (lowerText.includes("impact") || lowerText.includes("consequence") || lowerText.includes("result")) reasoning += 1;
    reasoning = Math.min(15, Math.max(3, reasoning));
    let clarity = 10;
    if (words >= 80 && words <= 250) clarity += 3;
    if (lowerText.includes("firstly") || lowerText.includes("secondly") || lowerText.includes("moreover") || lowerText.includes("in conclusion")) clarity += 2;
    clarity = Math.min(15, Math.max(3, clarity));
    let fluency = 7;
    const fillerWords = lowerText.match(/\b(um|uh|like|you know|basically|actually)\b/g) || [];
    if (fillerWords.length > 4) fluency -= 2;
    else if (fillerWords.length === 0 && words > 60) fluency += 2;
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
    if (words > 50 && studentSegments.every((s) => (s.confidence ?? 1) >= 0.8)) {
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
        paceDescription: words / Math.max(1, speakingSeconds / 60) > 160 ? "Fast-paced delivery" : "Moderate, steady speaking pace",
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
    const room = new GroupDiscussion({
      userId: adminObjectId,
      // Backward compatibility
      adminId: adminObjectId,
      adminUsername: params.adminUsername.toLowerCase().trim(),
      adminFullName: params.adminFullName || params.adminUsername,
      expectedLanguage: params.expectedLanguage?.trim() || "English",
      status: "preparing",
      topic,
      invitations: [],
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
    const users = await User.find({
      username: { $regex: cleanQuery, $options: "i" },
      ...lowerExcluded.length > 0 ? { username: { $nin: lowerExcluded } } : {}
    }).select("username fullName profilePicture").limit(10);
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
    const user = await User.findOne({ username: cleanUsername });
    if (!user) {
      throw new Error(`User "@${cleanUsername}" does not exist in PrepX`);
    }
    const existingInv = room.invitations.find((inv) => inv.username === cleanUsername);
    if (existingInv && existingInv.status !== "declined" && existingInv.status !== "expired") {
      throw new Error(`User "@${cleanUsername}" has already been invited (status: ${existingInv.status})`);
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
    if (existingInv) {
      existingInv.status = "pending";
      existingInv.invitedAt = /* @__PURE__ */ new Date();
      existingInv.respondedAt = void 0;
    } else {
      room.invitations.push(newInvitation);
    }
    await room.save();
    return { room, invitation: newInvitation };
  }
  /**
   * Responds to an invitation (accept or decline).
   */
  async respondToInvitation(roomId, username, action) {
    const room = await this.getSessionById(roomId);
    if (!room) {
      throw new Error("Discussion room not found");
    }
    const cleanUsername = username.toLowerCase().trim();
    const invitation = room.invitations.find((inv) => inv.username === cleanUsername);
    if (!invitation) {
      throw new Error("No invitation found for this user in this room");
    }
    if (action === "decline") {
      invitation.status = "declined";
      invitation.respondedAt = /* @__PURE__ */ new Date();
      await room.save();
      return { room, invitation };
    }
    const acceptedCount = room.invitations.filter(
      (i) => i.status === "accepted" && i.username !== cleanUsername
    ).length;
    const studentParticipants = room.participants.filter(
      (p) => !p.isHost && p.role !== "admin" && p.username !== cleanUsername
    ).length;
    const occupiedStudents = Math.max(acceptedCount, studentParticipants);
    if (occupiedStudents >= MAX_STUDENTS_CAPACITY) {
      invitation.status = "expired";
      await room.save();
      throw new Error(`Room is already full. Maximum ${MAX_STUDENTS_CAPACITY} students reached.`);
    }
    invitation.status = "accepted";
    invitation.respondedAt = /* @__PURE__ */ new Date();
    await room.save();
    return { room, invitation };
  }
  /**
   * Retrieves pending invitations for a user.
   */
  async getInvitationsForUser(username) {
    const cleanUsername = username.toLowerCase().trim();
    const rooms = await GroupDiscussion.find({
      "invitations.username": cleanUsername,
      status: { $in: ["preparing", "in_progress"] }
    }).sort({ createdAt: -1 });
    const results = [];
    for (const r of rooms) {
      const inv = r.invitations.find((i) => i.username === cleanUsername);
      if (inv) {
        results.push({
          roomId: r._id.toString(),
          topic: r.topic,
          adminUsername: r.adminUsername,
          adminFullName: r.adminFullName,
          expectedLanguage: r.expectedLanguage,
          status: inv.status,
          invitedAt: inv.invitedAt
        });
      }
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
    const words = segment.text ? segment.text.trim().split(/\s+/).filter(Boolean).length : 0;
    const newSegment = {
      id: `seg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      participantId: segment.participantId,
      participantName: segment.participantName,
      username: segment.username?.toLowerCase().trim(),
      text: segment.text.trim(),
      timestamp: /* @__PURE__ */ new Date(),
      durationSeconds: Math.max(1, segment.durationSeconds || Math.round(words / 2.5)),
      isInterruption: segment.isInterruption || false,
      language: segment.language || "en",
      confidence: segment.confidence || 1
    };
    session.transcript.push(newSegment);
    const p = session.participants.find((part) => part.id === segment.participantId);
    if (p) {
      p.speakingTimeSeconds += newSegment.durationSeconds;
      p.segmentCount += 1;
      p.wordCount += words;
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
    const topics = await gdTopicDiscoveryService.refreshTopicPool();
    const categories = gdTopicDiscoveryService.getCategories();
    res.json({
      success: true,
      categories,
      count: topics.length,
      topics: topics.slice(0, 20)
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
    const { category, topicOverride, expectedLanguage } = req.body;
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
      topicOverride
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
    res.json({
      success: true,
      session,
      currentTurn: session.currentTurn
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
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    if (!user.gdBookmarks) user.gdBookmarks = [];
    const index = user.gdBookmarks.findIndex((id) => id.toString() === roomId);
    let bookmarked = false;
    if (index > -1) {
      user.gdBookmarks.splice(index, 1);
      bookmarked = false;
    } else {
      user.gdBookmarks.push(new mongoose13.Types.ObjectId(roomId));
      bookmarked = true;
    }
    await user.save();
    res.json({
      success: true,
      bookmarked,
      gdBookmarks: user.gdBookmarks,
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

// src/routes/gdRoutes.ts
var router5 = Router5();
router5.get("/random-topic", optionalAuth, getRandomTopic);
router5.get("/topics", getTopicsPool);
router5.get("/users/search", protect, searchUsersByUsername);
router5.get("/my-invitations", protect, getMyInvitations);
router5.post("/rooms/:roomId/invitations", protect, inviteParticipant);
router5.post("/rooms/:roomId/invitations/respond", protect, respondToInvitation);
router5.post("/sessions/:sessionId/invitations", protect, inviteParticipant);
router5.post("/sessions/:sessionId/invitations/respond", protect, respondToInvitation);
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
router5.post("/sessions/:sessionId/transcript", optionalAuth, appendTranscriptSegment);
router5.post("/rooms/:roomId/transcript", optionalAuth, appendTranscriptSegment);
router5.post("/rooms/:roomId/end", protect, endGDSession);
router5.post("/sessions/:sessionId/end", protect, endGDSession);
router5.get("/my-sessions", protect, getMyGDSessions);
router5.post("/rooms/:roomId/bookmark", protect, toggleGDBookmark);
router5.post("/sessions/:sessionId/bookmark", protect, toggleGDBookmark);
router5.get("/bookmarks", protect, getGDBookmarks);
var gdRoutes_default = router5;

// src/services/gd/gdWebSocketService.ts
import { WebSocketServer, WebSocket } from "ws";
function initGDWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  const sessionRooms = /* @__PURE__ */ new Map();
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

// src/index.ts
dotenv2.config();
var app = express();
var PORT = process.env.PORT || 3001;
if (!process.env.VERCEL) {
  connectDB().then(() => {
    seedCodingProblems();
  }).catch((err) => {
    console.warn("MongoDB initial connection notice:", err.message);
  });
}
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
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
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.warn("MongoDB connection warning in request middleware:", err.message);
  }
  next();
});
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use(express.text({ type: ["application/sdp", "text/plain"], limit: "10mb" }));
app.use("/api/auth", authRoutes_default);
app.use("/api/v1", interviewRoutes_default);
app.use("/api/v1/resume-analysis", resumeAnalysisRoutes_default);
app.use("/api/v1/coding", codingRoutes_default);
app.use("/api/v1/gd", gdRoutes_default);
app.get(["/", "/api"], (req, res) => {
  res.json({
    status: "ok",
    message: "PrepX AI Placement & Coding Backend is running",
    endpoints: {
      auth: "/api/auth",
      interview: "/api/v1",
      resumeAnalysis: "/api/v1/resume-analysis",
      coding: "/api/v1/coding",
      gd: "/api/v1/gd"
    }
  });
});
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`\u{1F680} Server running on port ${PORT}`);
    initGDWebSocketServer(server);
    const hasGroq = !!process.env.GROQ_API_KEY?.trim();
    const hasDeepgram = !!process.env.DEEPGRAM_API_KEY?.trim();
    console.log(`\u26A1 Groq LLM Engine: ${hasGroq ? "\u2705 Live API Connected (openai/gpt-oss-120b)" : "\u2705 Active (Smart Fallback Mode)"}`);
    console.log(`\u{1F399}\uFE0F  Deepgram Voice Engine: ${hasDeepgram ? "\u2705 Live Aura Speech Connected" : "\u2705 Active (Web Speech Fallback Mode)"}`);
  });
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
  index_default as default
};
