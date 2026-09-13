import type { Response } from "express";
import type { AuthRequest } from "../../../../middleware/authMiddleware";
import { Problem } from "../models/Problem";
import { TestCase } from "../models/TestCase";
import { Submission } from "../models/Submission";
import { codeExecutionService } from "../services/codeExecutionService";
import { gamificationService } from "../services/gamificationService";

export async function runCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { problemId, language, sourceCode } = req.body;

    if (!problemId || !language || !sourceCode) {
      res.status(400).json({ success: false, message: "problemId, language, and sourceCode are required" });
      return;
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      res.status(404).json({ success: false, message: "Problem not found" });
      return;
    }

    // Get public sample test cases
    const testCases = await TestCase.find({ problemId, isHidden: false });
    const results = [];
    let allPassed = true;
    let maxTime = 0;
    let maxMemory = 0;

    for (const tc of testCases) {
      const execResult = await codeExecutionService.execute({
        language,
        sourceCode,
        input: tc.input,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
      });

      const passed = execResult.status === "Passed" && execResult.stdout.trim() === tc.expectedOutput.trim();
      if (!passed) allPassed = false;
      if (execResult.executionTime > maxTime) maxTime = execResult.executionTime;
      if (execResult.memoryUsed > maxMemory) maxMemory = execResult.memoryUsed;

      results.push({
        testCaseId: tc._id.toString(),
        passed,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: execResult.stdout,
        error: execResult.error || execResult.stderr,
        isHidden: false,
        executionTime: execResult.executionTime,
      });
    }

    res.json({
      success: true,
      data: {
        status: allPassed ? "Passed" : "Wrong Answer",
        passedTests: results.filter((r) => r.passed).length,
        totalTests: results.length,
        executionTime: maxTime,
        memoryUsed: maxMemory,
        testResults: results,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to run code" });
  }
}

export async function submitCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { problemId, language, sourceCode } = req.body;
    const problem = await Problem.findById(problemId);
    if (!problem) {
      res.status(404).json({ success: false, message: "Problem not found" });
      return;
    }

    // Run both public & hidden test cases
    const testCases = await TestCase.find({ problemId });
    const results = [];
    let passedCount = 0;
    let maxTime = 0;
    let maxMemory = 0;
    let firstError = "";

    for (const tc of testCases) {
      const execResult = await codeExecutionService.execute({
        language,
        sourceCode,
        input: tc.input,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
      });

      const passed = execResult.status === "Passed" && execResult.stdout.trim() === tc.expectedOutput.trim();
      if (passed) passedCount++;
      else if (!firstError) firstError = execResult.error || execResult.stderr || "Output Mismatch";

      if (execResult.executionTime > maxTime) maxTime = execResult.executionTime;
      if (execResult.memoryUsed > maxMemory) maxMemory = execResult.memoryUsed;

      results.push({
        testCaseId: tc._id.toString(),
        passed,
        input: tc.isHidden ? undefined : tc.input,
        expectedOutput: tc.isHidden ? undefined : tc.expectedOutput,
        actualOutput: tc.isHidden ? undefined : execResult.stdout,
        error: tc.isHidden ? undefined : execResult.error,
        isHidden: tc.isHidden,
        executionTime: execResult.executionTime,
      });
    }

    const isAccepted = passedCount === testCases.length && testCases.length > 0;
    const status = isAccepted ? "Accepted" : firstError.includes("Time Limit") ? "Time Limit Exceeded" : "Wrong Answer";

    // Save submission record
    const submission = await Submission.create({
      userId,
      problemId,
      language,
      sourceCode,
      status,
      score: Math.round((passedCount / Math.max(1, testCases.length)) * 100),
      passedTests: passedCount,
      totalTests: testCases.length,
      executionTime: maxTime,
      memoryUsed: maxMemory,
      errorMessage: firstError,
      testResults: results,
    });

    let gamificationResult = null;
    if (isAccepted) {
      gamificationResult = await gamificationService.processAcceptedSubmission(userId.toString(), problemId);
    }

    res.json({
      success: true,
      data: {
        submissionId: submission._id,
        status,
        score: submission.score,
        passedTests: passedCount,
        totalTests: testCases.length,
        executionTime: maxTime,
        memoryUsed: maxMemory,
        errorMessage: firstError,
        testResults: results,
        gamification: gamificationResult,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to submit code" });
  }
}

export async function getMySubmissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const submissions = await Submission.find({ userId })
      .populate("problemId", "title slug difficulty")
      .sort({ submittedAt: -1 })
      .limit(50);

    res.json({ success: true, data: { submissions } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch submissions" });
  }
}
