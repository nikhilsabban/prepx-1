import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Import all active redesigned models
import { User } from "../models/User.js";
import { Interview } from "../models/Interview.js";
import { Message } from "../models/Message.js";
import { Resume } from "../models/Resume.js";
import { JobDescription } from "../models/JobDescription.js";
import { ResumeAnalysis } from "../models/ResumeAnalysis.js";
import { GroupDiscussion } from "../models/GroupDiscussion.js";
import { CodingProblem } from "../models/CodingProblem.js";
import { CodingSubmission } from "../models/CodingSubmission.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
}

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("FATAL: MONGO_URI missing in environment.");
  process.exit(1);
}

const OBSOLETE_COLLECTIONS = [
  "systemsettings",
  "plans",
  "sessions",
  "subjectanalyses",
  "systemprompts",
  "webhooklogs",
  "interviewtemplates",
  "jobs",
  "tests",
  "auditlogs",
  "usercodingprogresses",
  "transactions",
  "scraperconfigs",
  "scraperlogs",
  "problems",
  "submissions",
  "testcases",
];

const ACTIVE_COLLECTIONS = [
  "users",
  "interviews",
  "messages",
  "resumes",
  "jobdescriptions",
  "resumeanalyses",
  "groupdiscussions",
  "codingproblems",
  "codingsubmissions",
];

async function executeReset() {
  console.log("=== PREPX DATABASE RESET AND SCHEMA INITIALIZATION ===");
  console.log(`Connecting to: ${MONGO_URI?.split("@").pop()}...`);
  await mongoose.connect(MONGO_URI!);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Unable to access database instance.");
  }

  console.log(`Database name: ${db.databaseName}`);
  if (db.databaseName !== "test" && !db.databaseName.includes("dev") && !db.databaseName.includes("ai-interviewer")) {
    console.warn(`[SAFETY CHECK] Connected to unexpected database: ${db.databaseName}`);
  }

  // 1. Drop Obsolete Collections
  console.log("\n--- Phase 1: Dropping Obsolete Collections ---");
  const existingCollections = (await db.listCollections().toArray()).map((c) => c.name);
  for (const obsolete of OBSOLETE_COLLECTIONS) {
    if (existingCollections.includes(obsolete)) {
      await db.collection(obsolete).drop();
      console.log(`  ✓ Dropped obsolete collection: ${obsolete}`);
    } else {
      console.log(`  - Already absent: ${obsolete}`);
    }
  }

  // 2. Clear Active Application Collections (Reset Test Data)
  console.log("\n--- Phase 2: Clearing Active Application Test Records ---");
  for (const active of ACTIVE_COLLECTIONS) {
    if (existingCollections.includes(active)) {
      const result = await db.collection(active).deleteMany({});
      console.log(`  ✓ Cleared ${active}: ${result.deletedCount} documents removed.`);
    }
  }

  // 3. Drop existing obsolete indexes on active collections to guarantee fresh schema definitions
  console.log("\n--- Phase 3: Purging Old Indexes & Initializing Redesigned Schemas ---");
  const models = [
    User,
    Interview,
    Message,
    Resume,
    JobDescription,
    ResumeAnalysis,
    GroupDiscussion,
    CodingProblem,
    CodingSubmission,
  ];

  for (const model of models) {
    try {
      console.log(`  Syncing indexes for: ${model.modelName}...`);
      await model.syncIndexes();
      console.log(`  ✓ Indexes synchronized for: ${model.modelName}`);
    } catch (err: any) {
      console.warn(`  ⚠️ Warning syncing ${model.modelName}: ${err.message}`);
    }
  }

  // 4. Seed Essential Reference Data: Standard DSA Coding Problems
  console.log("\n--- Phase 4: Seeding Essential Reference DSA Coding Problems ---");
  const backupBase = path.resolve(process.cwd(), "backup");
  let backupFiles: string[] = [];
  if (fs.existsSync(backupBase)) {
    backupFiles = fs.readdirSync(backupBase).sort().reverse();
  }

  let seededCount = 0;
  if (backupFiles.length > 0) {
    const latestBackup = path.join(backupBase, backupFiles[0], "codingproblems.json");
    if (fs.existsSync(latestBackup)) {
      const problemsData = JSON.parse(fs.readFileSync(latestBackup, "utf8"));
      if (Array.isArray(problemsData) && problemsData.length > 0) {
        // Strip _id to allow fresh ObjectIds or preserve them cleanly
        const cleanProblems = problemsData.map((p) => {
          const { _id, __v, ...rest } = p;
          return rest;
        });
        await CodingProblem.insertMany(cleanProblems, { ordered: false });
        seededCount = cleanProblems.length;
        console.log(`  ✓ Seeded ${seededCount} standard reference coding problems.`);
      }
    }
  }

  if (seededCount === 0) {
    console.log("  (No external problem file found, reference problems will be dynamically added as needed)");
  }

  // 5. Verification Phase
  console.log("\n--- Phase 5: Verification of Active Redesigned Collections & Indexes ---");
  const finalCollections = await db.listCollections().toArray();
  console.log(`Active collections in database (${finalCollections.length}):`);
  for (const c of finalCollections) {
    const count = await db.collection(c.name).countDocuments();
    const indexes = await db.collection(c.name).indexes();
    const indexNames = indexes.map((i) => Object.keys(i.key).join("_")).join(", ");
    console.log(`  * ${c.name.padEnd(20)} [${count} docs] -> Indexes: ${indexNames}`);
  }

  console.log("\n=== DATABASE RESET & REDESIGN SUCCESSFULLY COMPLETED ===");
  await mongoose.disconnect();
}

executeReset().catch((err) => {
  console.error("FATAL ERROR during database reset:", err);
  process.exit(1);
});

