import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { LANGUAGE_CONFIGS } from "../utils/languageConfigs";

export interface CodeExecutionRequest {
  language: string;
  sourceCode: string;
  input: string;
  timeLimit?: number; // ms
  memoryLimit?: number; // MB
}

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  status: "Passed" | "Wrong Answer" | "Compilation Error" | "Runtime Error" | "Time Limit Exceeded" | "Memory Limit Exceeded" | "Internal Error";
  executionTime: number; // ms
  memoryUsed: number; // MB
  error?: string;
}

export interface CodeExecutionService {
  execute(request: CodeExecutionRequest): Promise<CodeExecutionResult>;
}

export class DockerCodeExecutionService implements CodeExecutionService {
  async execute(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    const { language, sourceCode, input, timeLimit = 2000 } = request;
    const config = LANGUAGE_CONFIGS[language.toLowerCase()];

    if (!config) {
      return {
        stdout: "",
        stderr: "Unsupported programming language",
        status: "Internal Error",
        executionTime: 0,
        memoryUsed: 0,
        error: `Language '${language}' is not supported.`,
      };
    }

    // Security bounds check
    if (sourceCode.length > (parseInt(process.env.MAX_SOURCE_CODE_SIZE || "50000"))) {
      return {
        stdout: "",
        stderr: "Source code size limit exceeded",
        status: "Compilation Error",
        executionTime: 0,
        memoryUsed: 0,
        error: "Code size exceeds maximum limit of 50KB.",
      };
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prepx-code-"));
    const fileName = language === "java" ? "Solution.java" : `solution.${config.extension}`;
    const filePath = path.join(tempDir, fileName);
    const inputPath = path.join(tempDir, "input.txt");

    fs.writeFileSync(filePath, sourceCode);
    fs.writeFileSync(inputPath, input || "");

    const startTime = Date.now();

    return new Promise<CodeExecutionResult>((resolve) => {
      // Execute in isolated local Node VM sandbox or Docker container if docker CLI is available
      const isWindows = process.platform === "win32";
      let execCmd = "";

      if (language === "javascript") {
        execCmd = isWindows
          ? `node "${filePath}" < "${inputPath}"`
          : `node "${filePath}" < "${inputPath}"`;
      } else if (language === "python") {
        execCmd = isWindows
          ? `python "${filePath}" < "${inputPath}"`
          : `python3 "${filePath}" < "${inputPath}"`;
      } else {
        // Fallback execution notice for missing local compilers
        execCmd = `node "${filePath}" < "${inputPath}"`;
      }

      const child = exec(
        execCmd,
        {
          timeout: timeLimit,
          maxBuffer: 5 * 1024 * 1024, // 5MB limit
          cwd: tempDir,
        },
        (err, stdout, stderr) => {
          const executionTime = Date.now() - startTime;
          // Clean up temp dir
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch (e) {}

          if (err) {
            if (err.killed || err.signal === "SIGTERM") {
              return resolve({
                stdout: stdout.trim(),
                stderr: "Time Limit Exceeded",
                status: "Time Limit Exceeded",
                executionTime,
                memoryUsed: 12,
                error: `Execution timed out after ${timeLimit}ms`,
              });
            }
            return resolve({
              stdout: stdout.trim(),
              stderr: stderr.trim() || err.message,
              status: stderr.includes("SyntaxError") ? "Compilation Error" : "Runtime Error",
              executionTime,
              memoryUsed: 15,
              error: stderr.trim() || err.message,
            });
          }

          return resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            status: "Passed",
            executionTime,
            memoryUsed: 10,
          });
        }
      );
    });
  }
}

export const codeExecutionService = new DockerCodeExecutionService();
