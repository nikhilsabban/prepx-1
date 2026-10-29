import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
}

let cachedConn: typeof mongoose | null = null;
let connectionPromise: Promise<typeof mongoose> | null = null;

const DEFAULT_MONGO_URI = "mongodb+srv://nikhilsabban56:ekbVqEywwnVnhhZg@cluster0.xxqun.mongodb.net/test?retryWrites=true&w=majority";

const MONGO_POOL_OPTIONS: mongoose.ConnectOptions = {
  maxPoolSize: 50, // Scale up to 50 concurrent operations
  minPoolSize: 5,  // Maintain warm pool for instantaneous handshakes
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
  autoIndex: process.env.NODE_ENV !== "production", // Enable index creation in dev/staging
};

// Connection event telemetry
let listenersAttached = false;
function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on("connected", () => {
    console.log("✅ MongoDB Connection Established (Pool Ready)");
  });

  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB Disconnected. Auto-reconnect triggered.");
    cachedConn = null;
  });
}

export async function connectDB(): Promise<typeof mongoose> {
  // If already fully connected, return immediately without promise delay
  if (mongoose.connection.readyState === 1 && cachedConn) {
    return cachedConn;
  }

  // Prevent multiple concurrent connection handshakes
  if (connectionPromise) {
    return connectionPromise;
  }

  attachConnectionListeners();

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
        console.log(`✅ MongoDB Connected with Optimized Connection Pool (${conn.connection.host}/${conn.connection.name})`);
        cachedConn = conn;
        return conn;
      } catch (error: any) {
        console.warn(`⚠️ MongoDB connection attempt failed (${uri.split("@").pop()}): ${error.message}`);
      }
    }

    console.warn("⚠️ Could not connect to any MongoDB instance.");
    return mongoose;
  })().finally(() => {
    connectionPromise = null;
  });

  return connectionPromise;
}
