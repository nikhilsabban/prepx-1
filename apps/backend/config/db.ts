import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export async function connectDB(): Promise<typeof mongoose> {
  const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/ai-interviewer";

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Clean up any stale Prisma indexes if present
    try {
      await mongoose.connection.collection("interviews").dropIndexes();
      await mongoose.connection.collection("messages").dropIndexes();
      await mongoose.connection.collection("users").dropIndexes();
    } catch (e) {
      // Ignore if collection doesn't exist or indexes already dropped
    }

    return conn;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
}
