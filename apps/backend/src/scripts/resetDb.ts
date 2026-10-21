import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Error: MONGO_URI is missing in .env");
  process.exit(1);
}

async function resetDatabase() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(MONGO_URI!);
    console.log("Connected successfully.");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Failed to get database instance.");
    }

    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections:`, collections.map((c) => c.name));

    for (const col of collections) {
      console.log(`Clearing collection: ${col.name}...`);
      await db.collection(col.name).deleteMany({});
    }

    console.log("Creating default single user: admin@prepx.com / pass: admin123...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123", salt);

    await db.collection("users").insertOne({
      username: "admin_prepx",
      fullName: "PrepX Admin",
      email: "admin@prepx.com",
      password: hashedPassword,
      authProvider: "local",
      college: "PrepX Academy",
      branch: "Computer Science",
      degree: "B.Tech",
      graduationYear: "2026",
      cgpa: "10.0",
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("\n==========================================");
    console.log("SUCCESS: All user & analysis data reset.");
    console.log("Default admin account:");
    console.log("  Email:    admin@prepx.com");
    console.log("  Password: admin123");
    console.log("==========================================\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Failed to reset database:", error);
    process.exit(1);
  }
}

resetDatabase();
