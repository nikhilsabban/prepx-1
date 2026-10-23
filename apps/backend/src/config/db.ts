import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let cachedConn: typeof mongoose | null = null;
let connectionPromise: Promise<typeof mongoose> | null = null;

const DEFAULT_MONGO_URI = "mongodb+srv://nikhilsabban56:ekbVqEywwnVnhhZg@cluster0.xxqun.mongodb.net/test?retryWrites=true&w=majority";

const MONGO_POOL_OPTIONS = {
  maxPoolSize: 50, // Support up to 50 concurrent database operations
  minPoolSize: 5,  // Maintain ready warm connections
  serverSelectionTimeoutMS: 8000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
};

export async function connectDB(): Promise<typeof mongoose> {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }

  // Prevent multiple concurrent connection handshakes
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const primaryUri = process.env.MONGO_URI || DEFAULT_MONGO_URI;

    const URIs = [
      primaryUri,
      !process.env.VERCEL ? "mongodb://127.0.0.1:27017/ai-interviewer" : null,
      !process.env.VERCEL ? "mongodb://localhost:27017/ai-interviewer" : null,
    ].filter(Boolean) as string[];

    for (const uri of URIs) {
      try {
        const conn = await mongoose.connect(uri, MONGO_POOL_OPTIONS);
        console.log(`✅ MongoDB Connected with High-Concurrency Pool (${conn.connection.host})`);
        cachedConn = conn;
        return conn;
      } catch (error: any) {
        console.warn(`⚠️ MongoDB connection attempt failed (${uri.split('@').pop()}): ${error.message}`);
      }
    }

    console.warn("⚠️ Could not connect to any MongoDB instance.");
    return mongoose;
  })().finally(() => {
    connectionPromise = null;
  });

  return connectionPromise;
}
