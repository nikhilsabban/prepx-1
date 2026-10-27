import Groq from "groq-sdk";

export interface GroqExecutionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormatJson?: boolean;
  timeoutMs?: number;
  retries?: number;
}

class GDGroqService {
  private activeEvaluations = 0;
  private maxConcurrentEvaluations: number;
  private defaultTimeoutMs: number;
  private maxRetries: number;
  private verifiedModel: string | null = null;
  private modelVerificationPromise: Promise<string | null> | null = null;

  constructor() {
    this.defaultTimeoutMs = parseInt(process.env.GROQ_TIMEOUT_MS || "30000", 10);
    this.maxRetries = parseInt(process.env.GROQ_MAX_RETRIES || "2", 10);
    this.maxConcurrentEvaluations = parseInt(
      process.env.GROQ_MAX_CONCURRENT_EVALUATIONS || "2",
      10
    );
  }

  /**
   * Retrieves an initialized Groq client using key rotation if multiple keys exist.
   * Safe and never exposes keys in error messages.
   */
  public getClient(): Groq | null {
    const rawKeys = process.env.GROQ_API_KEY;
    if (!rawKeys || !rawKeys.trim()) {
      return null;
    }

    const keys = rawKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (keys.length === 0) {
      return null;
    }

    // Key rotation to avoid rate limits
    const selectedKey = keys[Math.floor(Math.random() * keys.length)];
    return new Groq({ apiKey: selectedKey });
  }

  /**
   * Validates model availability against the Groq Models API.
   * Checks whether the configured GROQ_MODEL exists and supports chat completions.
   * Caches verified model name.
   */
  public async getValidatedModel(): Promise<string | null> {
    if (this.verifiedModel) {
      return this.verifiedModel;
    }

    if (this.modelVerificationPromise) {
      return this.modelVerificationPromise;
    }

    this.modelVerificationPromise = (async () => {
      const client = this.getClient();
      if (!client) {
        return null;
      }

      const configuredModel = (process.env.GROQ_MODEL || "openai/gpt-oss-120b").trim();

      try {
        const response = await client.models.list();
        const availableModels = (response.data || []).map((m) => m.id);

        // Check if configured model is in the account's available models
        if (availableModels.includes(configuredModel)) {
          this.verifiedModel = configuredModel;
          return configuredModel;
        }

        // Candidate fallback chat completion models in order of capability
        const candidateFallbacks = [
          "openai/gpt-oss-120b",
          "qwen/qwen3.8-27b",
          "openai/gpt-oss-20b",
          "allam-2-7b",
          "llama-3.1-8b-instant",
        ];

        for (const candidate of candidateFallbacks) {
          if (availableModels.includes(candidate)) {
            console.log(
              `[Groq] Configured model "${configuredModel}" not found. Auto-selected available model: "${candidate}"`
            );
            this.verifiedModel = candidate;
            return candidate;
          }
        }

        // If none of preferred candidates matched, select first non-whisper model
        const firstChatModel = availableModels.find(
          (id) => !id.includes("whisper") && !id.includes("guard")
        );

        if (firstChatModel) {
          console.log(`[Groq] Auto-selected first available text model: "${firstChatModel}"`);
          this.verifiedModel = firstChatModel;
          return firstChatModel;
        }

        return configuredModel;
      } catch (err: any) {
        console.warn(`[Groq] Model availability check failed: ${err?.message || err}. Using configured model.`);
        return configuredModel;
      } finally {
        this.modelVerificationPromise = null;
      }
    })();

    return this.modelVerificationPromise;
  }

  /**
   * Executes a chat completion with timeout, retry with exponential backoff & jitter,
   * concurrency limiting, and structured response parsing.
   */
  public async chatCompletion(
    messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
    options: GroqExecutionOptions = {}
  ): Promise<string | null> {
    const client = this.getClient();
    if (!client) {
      return null;
    }

    // Concurrency limit enforcement
    while (this.activeEvaluations >= this.maxConcurrentEvaluations) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    this.activeEvaluations++;

    try {
      const model = options.model || (await this.getValidatedModel()) || "openai/gpt-oss-120b";
      const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
      const maxRetries = options.retries !== undefined ? options.retries : this.maxRetries;

      let lastError: any = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

          try {
            const params: any = {
              model,
              messages,
              temperature: options.temperature ?? 0.4,
              max_tokens: options.maxTokens ?? 1200,
            };

            if (options.responseFormatJson) {
              params.response_format = { type: "json_object" };
            }

            const response = await client.chat.completions.create(params, {
              signal: controller.signal,
            });

            clearTimeout(timeoutHandle);
            const content = response.choices[0]?.message?.content?.trim() || null;
            return content;
          } finally {
            clearTimeout(timeoutHandle);
          }
        } catch (error: any) {
          lastError = error;
          const isRateLimit = error?.status === 429;
          const isTimeout = error?.name === "AbortError" || error?.code === "ETIMEDOUT";
          const isTransient = isRateLimit || isTimeout || (error?.status >= 500 && error?.status < 600);

          if (attempt < maxRetries && isTransient) {
            // Exponential backoff with jitter: (2^attempt * 1000) + random(0, 500)
            const jitter = Math.floor(Math.random() * 500);
            const delay = Math.pow(2, attempt) * 1000 + jitter;
            console.warn(
              `[Groq] Attempt ${attempt + 1} failed (${error?.message || "Transient error"}). Retrying in ${delay}ms...`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          break;
        }
      }

      console.error(
        `[Groq] Chat completion failed after ${maxRetries + 1} attempts: ${lastError?.message || lastError}`
      );
      return null;
    } finally {
      this.activeEvaluations = Math.max(0, this.activeEvaluations - 1);
    }
  }

  /**
   * Safely calls chatCompletion and extracts/parses JSON object.
   */
  public async chatCompletionJson<T = any>(
    messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
    options: GroqExecutionOptions = {}
  ): Promise<T | null> {
    const raw = await this.chatCompletion(messages, {
      ...options,
      responseFormatJson: false,
    });

    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch (parseErr) {
      // Attempt extracting JSON block wrapped in ```json ... ``` or { ... }
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const candidate = jsonMatch[1] || jsonMatch[0];
          return JSON.parse(candidate) as T;
        } catch {}
      }
      return null;
    }
  }
}

export const gdGroqService = new GDGroqService();
