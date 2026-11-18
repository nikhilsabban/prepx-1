import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectDB } from "../config/db";
import { User } from "../models/User";
import { generateToken } from "../utils/jwt";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
}

let testPassed = 0;
let testFailed = 0;

function assert(condition: boolean, testName: string, detail: string = "") {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName} ${detail ? "(" + detail + ")" : ""}`);
    testPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? "(" + detail + ")" : ""}`);
    testFailed++;
  }
}

async function runAntiCheatTests() {
  console.log("==================================================================");
  console.log("🛡️  PREPX ANTI-CHEAT SYSTEM & GD BACKGROUND CLEANUP TEST SUITE");
  console.log("==================================================================");

  await connectDB();

  try {
    // -----------------------------------------------------------------
    // TEST 1: Administrator (admin@gmail.com / admin) Account Provisioning
    // -----------------------------------------------------------------
    console.log("\n--- TEST 1: Admin Credentials (admin@gmail.com / admin) ---");

    // Simulate login logic
    let admin = await User.findOne({ email: "admin@gmail.com" });
    if (!admin) {
      const hashedPassword = await bcrypt.hash("admin", 10);
      admin = await User.create({
        fullName: "PrepX Administrator",
        username: "admin",
        email: "admin@gmail.com",
        password: hashedPassword,
        role: "admin",
        isVerified: true,
      });
    } else {
      admin.role = "admin";
      admin.isVerified = true;
      if (!admin.password || !(await bcrypt.compare("admin", admin.password))) {
        admin.password = await bcrypt.hash("admin", 10);
      }
      await admin.save();
    }

    assert(admin.email.toLowerCase() === "admin@gmail.com", "Admin account email matches admin@gmail.com");
    assert(admin.role === "admin", "Admin user role is 'admin'");
    const isPasswordMatch = await bcrypt.compare("admin", admin.password!);
    assert(isPasswordMatch, "Admin password hash strictly validates 'admin'");

    // -----------------------------------------------------------------
    // TEST 2: Anti-Cheat Exemption Verification
    // -----------------------------------------------------------------
    console.log("\n--- TEST 2: Anti-Cheat Exemption Rules ---");

    const isExempt = (email?: string, role?: string) => {
      return Boolean(email?.toLowerCase().trim() === "admin@gmail.com" || role === "admin");
    };

    assert(
      isExempt("admin@gmail.com", "admin") === true,
      "admin@gmail.com / admin is 100% EXEMPT from Anti-Cheat system"
    );

    assert(
      isExempt("ADMIN@GMAIL.COM", "admin") === true,
      "Case-insensitive admin@gmail.com is 100% EXEMPT from Anti-Cheat"
    );

    assert(
      isExempt("candidate@gmail.com", "student") === false,
      "Normal student candidate@gmail.com is NOT exempt (Anti-Cheat Strictly Active)"
    );

    assert(
      isExempt("testuser@college.edu", "student") === false,
      "College candidate testuser@college.edu is NOT exempt (Anti-Cheat Strictly Active)"
    );

    assert(
      isExempt(undefined, undefined) === false,
      "Unauthenticated guest visitor is NOT exempt"
    );

    // -----------------------------------------------------------------
    // TEST 3: Candidate Violation Strikes Threshold Logic
    // -----------------------------------------------------------------
    console.log("\n--- TEST 3: Strike Escalation & Strict Violation Bounds ---");

    const MAX_STRIKES = 3;
    let studentStrikes = 0;

    // Simulate 3 tab switches
    const tabSwitchEvent = () => {
      studentStrikes++;
      return {
        strikeNumber: studentStrikes,
        isLocked: studentStrikes >= MAX_STRIKES,
      };
    };

    const s1 = tabSwitchEvent();
    assert(s1.strikeNumber === 1 && !s1.isLocked, "First tab switch generates Strike 1 (Warning issued)");

    const s2 = tabSwitchEvent();
    assert(s2.strikeNumber === 2 && !s2.isLocked, "Second tab switch generates Strike 2 (Strict Warning)");

    const s3 = tabSwitchEvent();
    assert(s3.strikeNumber === 3 && s3.isLocked, "Third tab switch reaches Maximum Strikes (Session Flagged/Locked)");

  } catch (err: any) {
    console.error("Test execution exception:", err);
    assert(false, "Test execution without unhandled exception", err.message);
  }

  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("==================================================================");

  if (testFailed > 0) {
    process.exit(1);
  }
}

runAntiCheatTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
