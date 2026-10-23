import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import authRoutes from "./routes/authRoutes";
import interviewRoutes from "./routes/interviewRoutes";
import resumeAnalysisRoutes from "./routes/resumeAnalysisRoutes";
import codingRoutes from "./routes/codingRoutes";
import gdRoutes from "./routes/gdRoutes";
import gamificationRoutes from "./routes/gamificationRoutes";
import { initGDWebSocketServer } from "./services/gd/gdWebSocketService";

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB (for standalone server)
if (!process.env.VERCEL) {
  connectDB().catch((err) => {
    console.warn("MongoDB initial connection notice:", err.message);
  });
}

// Explicit CORS and preflight handling (crucial for Vercel Serverless Functions)
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
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);

// Lazy-connect DB for serverless environments
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
  } catch (err: any) {
    console.warn("MongoDB connection warning in request middleware:", err.message);
  }
  next();
});

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use(express.text({ type: ["application/sdp", "text/plain"], limit: "10mb" }));

// Routes - Dual mounted so both local /api and stripped Vercel serverless paths route seamlessly
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/v1/resume-analysis", resumeAnalysisRoutes);
app.use("/v1/resume-analysis", resumeAnalysisRoutes);
app.use("/resume-analysis", resumeAnalysisRoutes);

app.use("/api/v1/coding", codingRoutes);
app.use("/v1/coding", codingRoutes);
app.use("/api/coding", codingRoutes);
app.use("/coding", codingRoutes);
app.use("/api", codingRoutes);

app.use("/api/v1/gd", gdRoutes);
app.use("/v1/gd", gdRoutes);
app.use("/gd", gdRoutes);

app.use("/api/v1/gamification", gamificationRoutes);
app.use("/v1/gamification", gamificationRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/gamification", gamificationRoutes);

app.use("/api/v1", interviewRoutes);
app.use("/v1", interviewRoutes);

app.get(["/", "/api"], (req, res) => {
  res.json({
    status: "ok",
    message: "PrepX AI Placement & Coding Backend is running",
    endpoints: {
      auth: "/api/auth",
      interview: "/api/v1",
      resumeAnalysis: "/api/v1/resume-analysis",
      coding: "/api/v1/coding",
      gd: "/api/v1/gd",
      gamification: "/api/v1/gamification",
    },
  });
});


if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    
    // Attach Group Discussion real-time WebSocket server
    initGDWebSocketServer(server);

    const hasGroq = !!process.env.GROQ_API_KEY?.trim();
    const hasDeepgram = !!process.env.DEEPGRAM_API_KEY?.trim();

    console.log(`⚡ Groq LLM Engine: ${hasGroq ? "✅ Live API Connected (openai/gpt-oss-120b)" : "✅ Active (Smart Fallback Mode)"}`);
    console.log(`🎙️  Deepgram Voice Engine: ${hasDeepgram ? "✅ Live Aura Speech Connected" : "✅ Active (Web Speech Fallback Mode)"}`);
  });

  server.on("error", (error: any) => {
    if (error.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use. Please free port ${PORT} or kill the running process.`);
    } else {
      console.error("❌ Server error:", error);
    }
  });
}

export default app;
