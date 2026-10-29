import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
}

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("FATAL: MONGO_URI missing in environment.");
  process.exit(1);
}

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.resolve(process.cwd(), "backup", timestamp);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`[Backup] Connecting to MongoDB: ${MONGO_URI?.split("@").pop()}...`);
  await mongoose.connect(MONGO_URI!);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Unable to access database instance.");
  }

  const collections = await db.listCollections().toArray();
  console.log(`[Backup] Found ${collections.length} collections.`);

  const manifest: Record<string, any> = {
    timestamp: new Date().toISOString(),
    databaseName: db.databaseName,
    collections: {},
    totalDocuments: 0,
  };

  for (const col of collections) {
    const colName = col.name;
    const docs = await db.collection(colName).find({}).toArray();
    const filePath = path.join(backupDir, `${colName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf8");

    const indexes = await db.collection(colName).indexes();

    manifest.collections[colName] = {
      count: docs.length,
      file: `${colName}.json`,
      indexes,
    };
    manifest.totalDocuments += docs.length;
    console.log(`  ✓ Backed up ${colName}: ${docs.length} docs -> ${filePath}`);
  }

  const manifestPath = path.join(backupDir, "backup_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`\n[Backup] SUCCESS! Full backup created at: ${backupDir}`);
  console.log(`[Backup] Total documents backed up: ${manifest.totalDocuments}`);

  await mongoose.disconnect();
  return { backupDir, manifestPath, totalDocs: manifest.totalDocuments };
}

runBackup().catch((err) => {
  console.error("[Backup] FAILED:", err);
  process.exit(1);
});

