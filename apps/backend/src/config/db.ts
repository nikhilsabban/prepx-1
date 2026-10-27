import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let cachedConn: typeof mongoose | null = null;
let connectionPromise: Promise<typeof mongoose> | null = null;

const DEFAULT_MONGO_URI = "mongodb+srv://nikhilsabban56:ekbVqEywwnVnhhZg@cluster0.xxqun.mongodb.net/test?retryWrites=true&w=majority";


export async function connectDB(): Promise<typeof mongoose> {
  // If already fully connected, return immediately without any promise delay
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Prevent multiple concurrent connection handshakes
  if (connectionPromise) {
    return connectionPromise;
  }

  const MONGO_POOL_OPTIONS: mongoose.ConnectOptions = {
    maxPoolSize: 50, // Scale up to 50 concurrent operations
    minPoolSize: 2,  // Instant initial SSL handshake (reduces connection lag from ~9s to <2s)
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    heartbeatFrequencyMS: 10000,
    autoIndex: true, // Background index creation
  };

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
        console.log(`✅ MongoDB Connected with Optimized Connection Pool (${conn.connection.host})`);
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
