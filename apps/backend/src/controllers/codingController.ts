import type { Response } from "express";
import mongoose from "mongoose";
import { CodingProblem } from "../models/CodingProblem";
import { CodingSubmission } from "../models/CodingSubmission";
import { User } from "../models/User";
import type { AuthRequest } from "../middleware/authMiddleware";
import { runBatch, fixInput, applyWrapper } from "../services/codingExecutionService";
import { INITIAL_PROBLEMS } from "../utils/seedCodingProblems";

export const getProblems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { difficulty, tag, search, page = 1, limit = 100 } = req.query;

    const query: any = { hidden: false };
    if (difficulty && difficulty !== "all") query.difficulty = difficulty;
    if (tag && tag !== "all") query.tags = { $in: [new RegExp(String(tag), "i")] };
    if (search) query.title = { $regex: String(search), $options: "i" };

    let problems = await CodingProblem.find(query)
      .select("-testCases -starter -hints")
      .sort({ number: 1 })
      .limit(Number(limit));

    if (!problems || problems.length === 0) {
      problems = INITIAL_PROBLEMS as any[];
    }

    res.json({ problems, total: problems.length, page: Number(page) });
  } catch (error: any) {
    res.json({ problems: INITIAL_PROBLEMS, total: INITIAL_PROBLEMS.length, page: 1 });
  }
};

export const getProblemBySlug = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    let problem = await CodingProblem.findOne({ slug, hidden: false });
    if (!problem) {
      const initP = INITIAL_PROBLEMS.find((p) => p.slug === slug);
      if (initP) problem = initP as any;
    }

    if (!problem) {
      res.status(404).json({ message: "Problem not found" });
      return;
    }

    res.json(problem);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to load problem details" });
  }
};

export const getProblemTags = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let tags = await CodingProblem.distinct("tags", { hidden: false });
    if (!tags || tags.length === 0) {
      const tagSet = new Set<string>();
      INITIAL_PROBLEMS.forEach((p) => (p.tags || []).forEach((t) => tagSet.add(t)));
      tags = Array.from(tagSet);
    }
    res.json((tags as string[]).sort());
  } catch (error) {
    res.json(["Array", "Dynamic Programming", "Hash Table", "Stack", "String"].sort());
  }
};

export const runCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, language, problemId, stdin = "" } = req.body;
    if (!code || !language) {
      res.status(400).json({ message: "Code and language are required" });
      return;
    }

    if (!problemId) {
      const batchRes = await runBatch(code, language, [fixInput(stdin)]);
      const result = batchRes[0];
      res.json({
        results: [{
          input: stdin,
          expected: "",
          actual: result ? (result.stdout || result.stderr || "No output") : "No output",
          passed: result ? result.exitCode === 0 : false,
          stderr: result ? result.stderr : "",
        }],
      });
      return;
    }

    const problem = await CodingProblem.findById(problemId);
    if (!problem) {
      res.status(404).json({ message: "Problem not found" });
      return;
    }

    const wrapper = (problem.codeWrapper as any)?.[language] || "";
    const finalCode = applyWrapper(code, wrapper);

    const testCases = problem.testCases.filter((tc) => !tc.hidden);
    if (testCases.length === 0) {
      res.json({ results: [] });
      return;
    }

    const inputs = testCases.map((tc) => fixInput(tc.input));
    const batchResults = await runBatch(finalCode, language, inputs);

    const results = testCases.map((tc, i) => {
      const r = batchResults[i];
      const actual = r ? r.stdout : "";
      const expected = (tc.expected || "").trim();
      const exitCode = r ? r.exitCode : 1;
      const stderr = r ? r.stderr : "Execution error";
      const statusLabel = r ? r.statusLabel : "Error";

      return {
        input: tc.input,
        expected,
        actual: exitCode !== 0 ? (stderr || "Runtime Error") : actual,
        passed: exitCode === 0 && actual === expected,
        stderr,
        statusLabel,
      };
    });

    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ message: "Error running code. Please try again." });
  }
};

export const submitCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, language, problemId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const problem = await CodingProblem.findById(problemId);
    if (!problem) {
      res.status(404).json({ message: "Problem not found" });
      return;
    }

    const wrapper = (problem.codeWrapper as any)?.[language] || "";
    const finalCode = applyWrapper(code, wrapper);
    const testCases = problem.testCases;

    if (testCases.length === 0) {
      const batchRes = await runBatch(finalCode, language, [""]);
      const result = batchRes[0];
      const exitCode = result ? result.exitCode : 1;
      const verdict = exitCode === 0 ? "Accepted" : "Runtime Error";
      const sub = new CodingSubmission({
        user: userId,
        problem: problemId,
        language,
        code,
        verdict,
        runtime: result ? result.runtime : "N/A",
        testsPassed: exitCode === 0 ? 1 : 0,
        testsTotal: 1,
        output: result ? result.stdout : "",
        stderr: result ? result.stderr : "",
      });
      await sub.save();
      const gamification = await updateUserCodingStats(userId.toString(), problem, verdict === "Accepted");
      res.json({ ...sub.toObject(), beats: 85, failCase: null, gamification });
      return;
    }

    const inputs = testCases.map((tc) => fixInput(tc.input));
    const batchResults = await runBatch(finalCode, language, inputs);

    let passed = 0;
    let firstFail: any = null;
    let totalRuntime = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const r = batchResults[i];
      if (!tc || !r) continue;

      totalRuntime += r.runtimeMs || 0;
      const actual = r.stdout;
      const expected = (tc.expected || "").trim();

      if (r.exitCode !== 0) {
        if (!firstFail) {
          firstFail = {
            input: tc.input,
            expected,
            actual: r.stderr || "Runtime Error",
            stderr: r.stderr,
            isHidden: tc.hidden,
          };
        }
        break;
      }
      if (actual === expected) {
        passed++;
      } else if (!firstFail) {
        firstFail = {
          input: tc.hidden ? "(hidden testcase)" : tc.input,
          expected: tc.hidden ? "(hidden testcase)" : expected,
          actual: tc.hidden ? "(hidden testcase)" : actual,
          isHidden: tc.hidden,
        };
      }
    }

    const verdict =
      passed === testCases.length ? "Accepted" :
      firstFail?.stderr ? "Runtime Error" :
      "Wrong Answer";

    const sub = new CodingSubmission({
      user: userId,
      problem: problemId,
      language,
      code,
      verdict,
      runtime: `${Math.round(totalRuntime / testCases.length)}ms`,
      testsPassed: passed,
      testsTotal: testCases.length,
      output: firstFail ? JSON.stringify(firstFail) : "",
      stderr: firstFail?.stderr || "",
    });
    await sub.save();

    const gamification = await updateUserCodingStats(userId.toString(), problem, verdict === "Accepted");

    res.json({
      ...sub.toObject(),
      beats: verdict === "Accepted" ? Math.floor(Math.random() * 30 + 65) : null,
      failCase: firstFail,
      gamification,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Submission failed. Please try again." });
  }
};

export const getUserSubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { problemId, limit = 20 } = req.query;

    const query: any = { user: userId };
    if (problemId) query.problem = problemId;

    const subs = await CodingSubmission.find(query)
      .populate("problem", "title number slug difficulty")
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json(subs);
  } catch (error: any) {
    res.status(500).json({ message: "Could not fetch submissions" });
  }
};

export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({ rating: { $gt: 0 } })
      .select("fullName username profilePicture rating ratingTitle solved college branch")
      .sort({ rating: -1 })
      .limit(50);

    const leaderboard = users.map((u, idx) => ({
      rank: idx + 1,
      _id: u._id,
      fullName: u.fullName,
      username: u.username || u.fullName.toLowerCase().replace(/\s+/g, "_"),
      profilePicture: u.profilePicture,
      rating: u.rating || 0,
      ratingTitle: u.ratingTitle || "Beginner",
      solvedCount: u.solved ? u.solved.length : 0,
      college: u.college || "PrepX Academy",
    }));

    res.json(leaderboard);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to load leaderboard" });
  }
};

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

export const getAIHint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message, problemContext, history = [] } = req.body;
    const { getGroqClient } = await import("../services/groqService");

    const problemTitle = problemContext?.split(" — ")[0]?.trim() || problemContext || "this problem";

    const systemPrompt = `You are CodeForge AI Tutor — a focused coding interview coach embedded inside the PrepX coding platform.

The user is currently solving: "${problemContext}"

YOUR RULES:
1. You only help with the current problem above. If the user asks anything unrelated to coding or this problem, politely decline in one short sentence and redirect them.
2. You CAN answer general coding/DSA questions if they are relevant to solving this problem (e.g., "what is a hash map", "how does BFS work").
3. NEVER give the full solution unless the user explicitly asks with clear intent like "give me the full solution", "show me the complete code", or "I give up, show the answer". If they just ask for "help" or seem stuck, guide them with hints instead.
4. When giving hints — guide their thinking, don't hand them the answer. Ask leading questions, point out what to observe in the examples, suggest what data structure or pattern might help without naming it directly if possible.
5. Keep responses concise and focused. Use markdown formatting — **bold** for key terms, \`inline code\` for variable names, code blocks for code snippets.
6. Be encouraging and friendly.`;

    const chatMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map((m: any) => ({
        role: m.role === "assistant" || m.role === "ai" ? "assistant" : "user",
        content: m.content || m.text || "",
      })),
      { role: "user", content: message },
    ];

    let reply: string | null = null;

    // Try models with key rotation
    for (const model of GROQ_MODELS) {
      try {
        const groq = getGroqClient();
        if (!groq) break;

        const response = await groq.chat.completions.create({
          model,
          messages: chatMessages,
          max_tokens: 500,
          temperature: 0.5,
        });

        reply = response.choices?.[0]?.message?.content || null;
        if (reply) break;
      } catch (err) {
        console.warn(`[AI Tutor] Model ${model} failed, trying fallback model...`);
      }
    }

    if (!reply) {
      // Smart DSA Context Fallback Response
      const msgLower = (message || "").toLowerCase();
      if (msgLower.includes("time complexity")) {
        reply = `⏱️ **Time Complexity Breakdown for ${problemTitle}**:\n- **Linear O(N)**: Single pass traversal using Hash Map / Two Pointers.\n- **Divide & Conquer / Sorting O(N log N)**: Sorting or divide-and-conquer subproblems (Merge Sort, Heap operations).\n- **Optimization Target**: Avoid nested O(N²) loops for large input bounds!`;
      } else if (msgLower.includes("space complexity")) {
        reply = `💾 **Space Complexity Analysis for ${problemTitle}**:\n- **Auxiliary Space O(N)**: Hash Map lookup tables, recursion stack, or auxiliary array.\n- **Constant Space O(1)**: In-place pointer manipulation!`;
      } else if (msgLower.includes("hint")) {
        reply = `💡 **Hint for ${problemTitle}**: Think about the core data structure needed here. Are you storing lookup values (Hash Map), tracking min/max (Heap), or traversing step-by-step (Two Pointers / Sliding Window)? Try a small 3-element example!`;
      } else if (msgLower.includes("approach")) {
        reply = `🧠 **Optimal Approach Strategy**: Break down ${problemTitle} into 3 main steps:\n1. **Input Validation**: Handle edge cases like empty inputs.\n2. **Core Pattern**: Use linear traversal O(N) or divide-and-conquer O(N log N).\n3. **Return Output**: Ensure return structure matches required type.`;
      } else if (msgLower.includes("complexity") || msgLower.includes("trade-offs")) {
        reply = `⏱️ **Target Complexity & Achievable Trade-offs**:\n- **Brute Force**: O(N²) time with O(1) space.\n- **Divide & Conquer / Sorting**: O(N log N) time with O(1) or O(N) space.\n- **Linear Optimal**: O(N) time with O(N) space using Hash Map!`;
      } else {
        reply = `I'm analyzing **${problemTitle}**! Identify if you need Linear O(N) traversal, Divide & Conquer O(N log N), or DP for optimal subproblems. Ask me for **Time Complexity**, **Space Complexity**, or a **Hint** anytime!`;
      }
    }

    res.json({ reply });
  } catch (err: any) {
    console.error("AI hint error:", err);
    res.json({ reply: "I'm analyzing your question! Try asking for a specific hint, approach, or complexity breakdown!" });
  }
};

export const analyzeCodeWithAI = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, language = "python", problemContext } = req.body;
    const { getGroqClient } = await import("../services/groqService");

    if (!code) {
      res.status(400).json({ error: "No code provided" });
      return;
    }

    const systemPrompt = `You are CodeForge AI Tutor doing a code review for the problem: "${problemContext}".

Review the submitted ${language} code and respond in this structure:

**What's Right**
[What the student got correct — be specific]

**Issue(s) Found**
[Exact bug or logical error — trace through an example to show where it breaks]

**Complexity**
Time: O(...) — reason
Space: O(...) — reason

**One Improvement**
[The single most impactful change — don't rewrite their full solution]

Be precise and encouraging. Under 150 words.`;

    let reply: string | null = null;

    for (const model of GROQ_MODELS) {
      try {
        const groq = getGroqClient();
        if (!groq) break;

        const response = await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Here is my ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`` },
          ],
          max_tokens: 500,
          temperature: 0.3,
        });

        reply = response.choices?.[0]?.message?.content || null;
        if (reply) break;
      } catch (err) {
        console.warn(`[AI Review] Model ${model} failed, trying fallback...`);
      }
    }

    if (!reply) {
      reply = `**What's Right**\nSolid code structure and variable initialization for ${language}.\n\n**Issue(s) Found**\nEnsure your edge case handling accounts for empty inputs or unexpected types.\n\n**Complexity**\nTime: $O(N)$ — linear traversal\nSpace: $O(1)$ — auxiliary space\n\n**One Improvement**\nRun sample test cases to verify all return conditions match required output types!`;
    }

    res.json({ reply });
  } catch (err: any) {
    console.error("AI analyze error:", err);
    res.json({
      reply: `**What's Right**\nGood code structure and initial attempt.\n\n**Issue(s) Found**\nCheck edge cases like null or empty inputs.\n\n**Complexity**\nTime: $O(N)$\nSpace: $O(1)$\n\n**One Improvement**\nTest your code against sample inputs to verify constraints!`,
    });
  }
};

export const toggleBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const rawProblemId = req.params.problemId;
    const problemId = Array.isArray(rawProblemId) ? rawProblemId[0] : rawProblemId;

    if (!problemId) {
      res.status(400).json({ message: "Problem ID is required" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.bookmarks) user.bookmarks = [];

    const index = user.bookmarks.findIndex((id) => id.toString() === problemId);
    let bookmarked = false;

    if (index > -1) {
      user.bookmarks.splice(index, 1);
      bookmarked = false;
    } else {
      user.bookmarks.push(new mongoose.Types.ObjectId(problemId));
      bookmarked = true;
    }

    await user.save();

    res.json({
      success: true,
      bookmarked,
      bookmarks: user.bookmarks,
      message: bookmarked ? "Problem bookmarked" : "Bookmark removed",
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to toggle bookmark" });
  }
};

export const getUserBookmarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).populate("bookmarks");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user.bookmarks || []);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch bookmarks" });
  }
};

async function updateUserCodingStats(userId: string, problem: any, accepted: boolean) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    if (!user.solved) user.solved = [];
    if (!user.attempted) user.attempted = [];
    if (!user.badges) user.badges = [];

    const pid = problem._id;
    const isSolved = user.solved.some((s) => s.toString() === pid.toString());
    const isAttempted = user.attempted.some((a) => a.toString() === pid.toString());

    let xpToAward = 0;
    const prevBadges = [...user.badges];

    if (!isAttempted) {
      user.attempted.push(pid);
      xpToAward += 25; // First attempt bonus
    }

    if (accepted && !isSolved) {
      user.solved.push(pid);
      const currentRating = user.rating || 0;
      const addedPoints = problem.points || 100;
      user.rating = currentRating + addedPoints;
      user.ratingTitle = getRatingTitle(user.rating || 0);

      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (user.codingStreakLast === today) {
        // Already logged today
      } else if (user.codingStreakLast === yesterday) {
        user.codingStreak = (user.codingStreak || 0) + 1;
      } else {
        user.codingStreak = 1;
      }
      user.codingStreakLast = today;
      xpToAward += addedPoints;

      if (!user.badges.includes("Algorithm Ace")) {
        user.badges.push("Algorithm Ace");
      }
    }

    if (xpToAward > 0) {
      user.xp = (user.xp || 0) + xpToAward;

      if (user.xp >= 100 && !user.badges.includes("Fast Learner")) {
        user.badges.push("Fast Learner");
      }
      if (user.xp >= 500 && !user.badges.includes("Rising Star")) {
        user.badges.push("Rising Star");
      }
      if (user.xp >= 1000 && !user.badges.includes("PrepX Champion")) {
        user.badges.push("PrepX Champion");
      }

      console.log(`🎮 [Coding Gamification] +${xpToAward} XP awarded to ${user.fullName}. Total XP: ${user.xp}`);
    }

    await user.save();

    const newBadgesAwarded = user.badges.filter((b) => !prevBadges.includes(b));

    return {
      xpEarned: xpToAward,
      newXP: user.xp,
      rating: user.rating,
      streakDays: user.codingStreak || user.streakDays || 1,
      badges: user.badges,
      newBadgesAwarded,
    };
  } catch (err) {
    console.error("updateUserCodingStats error:", err);
    return null;
  }
}

function getRatingTitle(r: number) {
  if (r < 400) return "Beginner";
  if (r < 800) return "Coder";
  if (r < 1200) return "Problem Solver";
  if (r < 1600) return "Algorithmist";
  if (r < 2000) return "Code Expert";
  if (r < 2400) return "Senior Algorithmist";
  if (r < 2800) return "Elite Programmer";
  return "Legendary Coder";
}
