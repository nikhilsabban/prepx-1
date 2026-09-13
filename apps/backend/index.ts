import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import authRoutes from "./routes/authRoutes";
import interviewRoutes from "./routes/interviewRoutes";
import resumeAnalysisRoutes from "./routes/resumeAnalysisRoutes";

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.text({ type: ["application/sdp", "text/plain"], limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/v1", interviewRoutes);
app.use("/api/v1/resume-analysis", resumeAnalysisRoutes);

import codingRoutes from "./src/modules/coding/routes/codingRoutes";
app.use("/api/coding", codingRoutes);

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "AI Interviewer MERN Backend is running",
    endpoints: {
      auth: "/api/auth",
      interview: "/api/v1",
      resumeAnalysis: "/api/v1/resume-analysis",
    },
  });
});


const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
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

export default app;
