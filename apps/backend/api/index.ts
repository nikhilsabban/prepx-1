import app from "../src/index";
import { connectDB } from "../src/config/db";

export default async function handler(req: any, res: any) {
  // Always attach CORS headers on all serverless responses
  const origin = req.headers?.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");

  // Handle browser preflight OPTIONS request immediately
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    await connectDB();
  } catch (err: any) {
    console.warn("MongoDB connection warning in serverless handler:", err.message);
  }

  return app(req, res);
}
