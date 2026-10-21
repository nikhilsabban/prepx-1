import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let cachedConn: typeof mongoose | null = null;

export async function connectDB(): Promise<typeof mongoose> {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }

  const URIs = [
    process.env.MONGO_URI,
    "mongodb://127.0.0.1:27017/ai-interviewer",
    "mongodb://localhost:27017/ai-interviewer",
  ].filter(Boolean) as string[];

  for (const uri of URIs) {
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      cachedConn = conn;
      
      // Clean up any stale Prisma indexes if present
      try {
        await mongoose.connection.collection("interviews").dropIndexes();
        await mongoose.connection.collection("messages").dropIndexes();
        await mongoose.connection.collection("users").dropIndexes();
      } catch (e) {
        // Ignore if collection doesn't exist or indexes already dropped
      }

      return conn;
    } catch (error: any) {
      console.warn(`⚠️ MongoDB connection attempt failed (${uri.split('@').pop()}): ${error.message}`);
    }
  }
  
  console.error("❌ Fatal: Could not connect to any MongoDB instance.");
  if (!process.env.VERCEL) {
    process.exit(1);
  }
  throw new Error("Could not connect to any MongoDB instance.");
}
