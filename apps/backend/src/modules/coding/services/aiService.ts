import axios from "axios";
import { HINT_PROMPT, DEBUG_PROMPT, EXPLANATION_PROMPT, REVIEW_PROMPT, COMPLEXITY_PROMPT } from "../utils/aiPrompts";

export interface AICodingService {
  generateHint(problemTitle: string, description: string, code: string, language: string, hintLevel?: number): Promise<string>;
  debugCode(problemTitle: string, code: string, language: string, errorOutput: string): Promise<string>;
  explainSolution(problemTitle: string, code: string, language: string): Promise<string>;
  reviewCode(code: string, language: string): Promise<string>;
  analyzeComplexity(code: string, language: string): Promise<{ timeComplexity: string; spaceComplexity: string; explanation: string }>;
}

export class OllamaCodingAIService implements AICodingService {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.model = process.env.OLLAMA_MODEL || "llama3.2";
  }

  private async callOllama(prompt: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
      }, { timeout: 10000 });

      return response.data?.response || "No response received from AI model.";
    } catch (err) {
      // Graceful offline fallback
      return "AI service is currently unavailable locally. Ensure Ollama service is running on http://localhost:11434.";
    }
  }

  async generateHint(problemTitle: string, description: string, code: string, language: string, hintLevel: number = 1): Promise<string> {
    const prompt = HINT_PROMPT(problemTitle, description, code, language, hintLevel);
    return this.callOllama(prompt);
  }

  async debugCode(problemTitle: string, code: string, language: string, errorOutput: string): Promise<string> {
    const prompt = DEBUG_PROMPT(problemTitle, code, language, errorOutput);
    return this.callOllama(prompt);
  }

  async explainSolution(problemTitle: string, code: string, language: string): Promise<string> {
    const prompt = EXPLANATION_PROMPT(problemTitle, code, language);
    return this.callOllama(prompt);
  }

  async reviewCode(code: string, language: string): Promise<string> {
    const prompt = REVIEW_PROMPT(code, language);
    return this.callOllama(prompt);
  }

  async analyzeComplexity(code: string, language: string): Promise<{ timeComplexity: string; spaceComplexity: string; explanation: string }> {
    const prompt = COMPLEXITY_PROMPT(code, language);
    const response = await this.callOllama(prompt);

    // Heuristic extraction
    const timeMatch = response.match(/Time Complexity:\s*(O\([^\)]+\))/i);
    const spaceMatch = response.match(/Space Complexity:\s*(O\([^\)]+\))/i);

    return {
      timeComplexity: (timeMatch && timeMatch[1]) ? timeMatch[1] : "O(N) (Estimated)",
      spaceComplexity: (spaceMatch && spaceMatch[1]) ? spaceMatch[1] : "O(1) (Estimated)",
      explanation: response,
    };
  }
}

export const aiCodingService = new OllamaCodingAIService();
