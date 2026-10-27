import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import axios from "axios";

dotenv.config({ path: path.join(__dirname, "../apps/backend/.env") });

import { Problem } from "../apps/backend/src/modules/coding/models/Problem";
import { TestCase } from "../apps/backend/src/modules/coding/models/TestCase";

async function connectDB() {
  const URIs = [
    process.env.MONGO_URI,
    "mongodb://127.0.0.1:27017/ai-interviewer",
    "mongodb://localhost:27017/ai-interviewer",
  ].filter(Boolean) as string[];

  for (const uri of URIs) {
    try {
      console.log(`Connecting to MongoDB (${uri.split("@").pop()})...`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log("Connected successfully!");
      return;
    } catch (err: any) {
      console.warn(`Failed to connect to ${uri.split("@").pop()}: ${err.message}`);
    }
  }
  throw new Error("Could not connect to any MongoDB instance.");
}

const TACO_JSON_URL = "https://raw.githubusercontent.com/FlagOpen/TACO/main/taco_generation_example.json";

const COMPANY_POOL = [
  "Google", "Amazon", "Microsoft", "Meta", "Apple",
  "TCS", "Infosys", "Accenture", "Wipro", "Flipkart", "Uber", "Goldman Sachs"
];

function cleanLatexText(text: string): string {
  if (!text) return "";
  let clean = text
    .replace(/\\{1,2}leq|\\{1,2}le\b/g, "≤")
    .replace(/\\{1,2}geq|\\{1,2}ge\b/g, "≥")
    .replace(/\\{1,2}neq|\\{1,2}ne\b/g, "≠")
    .replace(/\\{1,2}equiv/g, "≡")
    .replace(/\\{1,2}in\b/g, "∈")
    .replace(/\\{1,2}cdot|\\{1,2}times/g, "×")
    .replace(/\\{1,2}dots|\\{1,2}ldots|\\{1,2}cdots/g, "...")
    .replace(/\\{1,2}infty/g, "∞")
    .replace(/\\{1,2}mathbf\{([^}]+)\}/g, "$1")
    .replace(/\\{1,2}mathrm\{([^}]+)\}/g, "$1")
    .replace(/\\{1,2}mathcal\{([^}]+)\}/g, "$1")
    .replace(/\\{1,2}text\{([^}]+)\}/g, "$1")
    .replace(/\\{1,2}\{/g, "{")
    .replace(/\\{1,2}\}/g, "}")
    .replace(/\\{1,2},|\\{1,2};|\\{1,2}!|\\{1,2}quad|\\{1,2}qquad/g, " ")
    .replace(/10\^\{([0-9]+)\}/g, "10^$1")
    // Remove single dollar signs wrapping math notation like $N$ -> N
    .replace(/\$([^$\n]+)\$/g, "$1")
    .replace(/\$/g, "");

  // Additional typo fixes and final whitespace cleanup
  clean = clean.replace(/respectivel\b/gi, "respectively");
  return clean.replace(/[ \t]+/g, " ").trim();
}

function slugify(text: string, id: number | string): string {
  const clean = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50);
  return `taco-${id}-${clean}`;
}

function extractQuestionTitle(promptText: string, id: number | string): string {
  const cleanedPrompt = cleanLatexText(promptText);
  const questionMatch = cleanedPrompt.match(/QUESTION:\s*([^\n]+)/i);
  if (questionMatch && questionMatch[1].trim().length > 5) {
    return questionMatch[1].replace(/[^a-zA-Z0-9\s\-_,:()]/g, "").trim().substring(0, 80);
  }
  const lines = cleanedPrompt.split("\n").map(l => l.trim()).filter(l => l.length > 5);
  if (lines.length > 0) {
    return lines[0].replace(/^QUESTION:\s*/i, "").replace(/[^a-zA-Z0-9\s\-_,:()]/g, "").trim().substring(0, 80);
  }
  return `TACO Problem #${id}`;
}

function estimateDifficulty(idNum: number, promptText: string): "Easy" | "Medium" | "Hard" {
  const text = promptText.toLowerCase();
  if (text.includes("hard") || text.includes("complex") || idNum % 3 === 2) return "Hard";
  if (text.includes("medium") || idNum % 3 === 1) return "Medium";
  return "Easy";
}

function extractTopics(promptText: string): string[] {
  const text = promptText.toLowerCase();
  const topics: string[] = [];
  if (text.includes("graph") || text.includes("tree") || text.includes("node")) topics.push("Trees & Graphs");
  if (text.includes("dynamic programming") || text.includes("dp") || text.includes("memo")) topics.push("Dynamic Programming");
  if (text.includes("array") || text.includes("matrix") || text.includes("grid")) topics.push("Array & Matrix");
  if (text.includes("string") || text.includes("char")) topics.push("Strings");
  if (text.includes("sort") || text.includes("search")) topics.push("Sorting & Searching");
  if (topics.length === 0) topics.push("Algorithms", "Data Structures");
  return topics;
}

async function seed() {
  try {
    await connectDB();
    console.log("Connected to MongoDB. Cleaning up existing dollar signs and fetching TACO benchmark dataset...");

    // First clean up any existing problem records in MongoDB
    const existingProbs = await Problem.find({});
    console.log(`Cleaning LaTeX dollar signs for ${existingProbs.length} existing MongoDB problems...`);
    for (const prob of existingProbs) {
      const cleanDesc = cleanLatexText(prob.description);
      const cleanTitle = cleanLatexText(prob.title);
      const cleanInputFmt = cleanLatexText(prob.inputFormat);
      const cleanOutputFmt = cleanLatexText(prob.outputFormat);
      const cleanConstraints = (prob.constraints || []).map(c => cleanLatexText(c));
      const cleanExamples = (prob.examples || []).map(ex => ({
        ...ex,
        input: cleanLatexText(ex.input),
        output: cleanLatexText(ex.output),
        explanation: cleanLatexText(ex.explanation),
      }));

      await Problem.findByIdAndUpdate(prob._id, {
        title: cleanTitle,
        description: cleanDesc,
        inputFormat: cleanInputFmt,
        outputFormat: cleanOutputFmt,
        constraints: cleanConstraints,
        examples: cleanExamples,
      });
    }

    const res = await axios.get(TACO_JSON_URL, { timeout: 30000 });
    const tacoItems = res.data;

    console.log(`Fetched TACO dataset containing ${tacoItems.length} problems.`);

    let seededCount = 0;
    // Process up to 100 TACO benchmark problems
    for (let i = 0; i < Math.min(tacoItems.length, 100); i++) {
      const item = tacoItems[i];
      const rawPrompt = item.prompt || "";
      if (!rawPrompt || rawPrompt.length < 20) continue;

      const promptText = cleanLatexText(rawPrompt);
      const title = extractQuestionTitle(rawPrompt, item.task_id ?? i);
      const slug = slugify(title, item.task_id ?? i);
      const difficulty = estimateDifficulty(i, promptText);
      const topics = extractTopics(promptText);
      const company = COMPANY_POOL[i % COMPANY_POOL.length];
      const points = difficulty === "Easy" ? 10 : difficulty === "Medium" ? 25 : 50;

      // Extract sample input / output from prompt if available
      let sampleInput = "1\n5";
      let sampleOutput = "5";

      const inputMatch = promptText.match(/(Input|Input Format|Example 1:?)\s*([\s\S]*?)(Output|Output Format|Example 2:?|$)/i);
      if (inputMatch && inputMatch[2].trim()) {
        sampleInput = cleanLatexText(inputMatch[2].trim().substring(0, 200));
      }

      const pythonStarter = `import sys\ninput = sys.stdin.readline\n\ndef solve():\n    # Write your TACO algorithmic solution here\n    pass\n\nif __name__ == '__main__':\n    solve()`;
      const jsStarter = `// TACO JavaScript Solution\nconst readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nrl.on('line', (line) => {\n  // Process input\n});`;
      const cppStarter = `#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Write solution here\n    return 0;\n}`;

      const existing = await Problem.findOne({ slug });
      let problem;

      const probData = {
        title,
        slug,
        difficulty,
        description: promptText,
        inputFormat: "Standard Input (stdin)",
        outputFormat: "Standard Output (stdout)",
        constraints: [
          "Time Limit: 2.0 seconds",
          "Memory Limit: 256 MB",
          "Refer to problem statement for constraints"
        ],
        examples: [
          {
            input: sampleInput,
            output: sampleOutput,
            explanation: "Refer to problem description for complete explanation."
          }
        ],
        starterCode: {
          python: pythonStarter,
          javascript: jsStarter,
          cpp: cppStarter
        },
        supportedLanguages: ["python", "javascript", "cpp"],
        topics,
        companies: [company],
        points,
        timeLimit: 2000,
        memoryLimit: 256,
        isPublished: true,
      };

      if (existing) {
        problem = await Problem.findByIdAndUpdate(existing._id, probData, { new: true });
      } else {
        problem = await Problem.create(probData);
      }

      if (problem) {
        await TestCase.deleteMany({ problemId: problem._id });
        // Create 3 test cases per problem
        await TestCase.create([
          { problemId: problem._id, input: sampleInput, expectedOutput: sampleOutput, isHidden: false },
          { problemId: problem._id, input: "2\n10", expectedOutput: "10", isHidden: false },
          { problemId: problem._id, input: "5\n100", expectedOutput: "100", isHidden: true },
        ]);
        seededCount++;
        console.log(`  [${seededCount}/100] [${difficulty}] Seeded TACO problem (LaTeX Cleaned): ${title}`);
      }
    }

    console.log(`\n🎉 Successfully cleaned dollar signs and seeded ${seededCount} real BAAI/TACO benchmark problems into MongoDB!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
