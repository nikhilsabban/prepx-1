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
import { initGDWebSocketServer } from "./services/gd/gdWebSocketService";
import { seedCodingProblems } from "./utils/seedCodingProblems";

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB().then(() => {
  seedCodingProblems();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use(express.text({ type: ["application/sdp", "text/plain"], limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/v1", interviewRoutes);
app.use("/api/v1/resume-analysis", resumeAnalysisRoutes);
app.use("/api/v1/coding", codingRoutes);
app.use("/api/v1/gd", gdRoutes);

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "PrepX AI Placement & Coding Backend is running",
    endpoints: {
      auth: "/api/auth",
      interview: "/api/v1",
      resumeAnalysis: "/api/v1/resume-analysis",
      coding: "/api/v1/coding",
      gd: "/api/v1/gd",
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
