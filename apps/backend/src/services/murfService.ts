import axios from "axios";
import { synthesizeSpeechWithDeepgram } from "./deepgramService";

export interface MurfTTSOptions {
  voiceId?: string;
  style?: string;
  rate?: number; // -50 to 50
  pitch?: number; // -50 to 50
  format?: "MP3" | "WAV" | "FLAC" | "ALAW" | "ULAW";
  modelVersion?: "GEN2";
}

/**
 * Synthesizes text into spoken audio using Murf AI TTS API
 * Default voice: en-US-terrell (Dynamic, modern tech interviewer)
 */
export async function synthesizeSpeechWithMurf(
  text: string,
  options?: MurfTTSOptions
): Promise<{ audioBuffer: Buffer; contentType: string } | null> {
  const apiKey = process.env.MURF_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  const voiceId = options?.voiceId || process.env.MURF_VOICE_ID || "en-US-terrell";

  try {
    const payload = {
      voiceId,
      text: text.trim(),
      format: options?.format || "MP3",
      modelVersion: options?.modelVersion || "GEN2",
      encodeAsBase64: true,
      ...(options?.rate !== undefined ? { rate: options.rate } : {}),
      ...(options?.pitch !== undefined ? { pitch: options.pitch } : {}),
      ...(options?.style ? { style: options.style } : {}),
    };

    const response = await axios.post(
      "https://api.murf.ai/v1/speech/generate",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey.trim(),
        },
        timeout: 15000,
      }
    );

    // Murf returns base64 string directly when encodeAsBase64: true
    if (response.data?.encodedAudio) {
      const buffer = Buffer.from(response.data.encodedAudio, "base64");
      return {
        audioBuffer: buffer,
        contentType: "audio/mp3",
      };
    }

    // Fallback: If audioFile URL is returned
    if (response.data?.audioFile) {
      const downloadRes = await axios.get(response.data.audioFile, {
        responseType: "arraybuffer",
        timeout: 12000,
      });
      return {
        audioBuffer: Buffer.from(downloadRes.data),
        contentType: "audio/mp3",
      };
    }

    console.warn("[Murf TTS] No audio returned in response payload:", response.data);
    return null;
  } catch (error: any) {
    const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error("[Murf TTS] Error generating speech:", errorDetails);
    return null;
  }
}

/**
 * Primary Voice Synthesizer
 * Uses Murf AI (en-US-terrell) as primary engine; falls back to Deepgram if needed
 */
export async function synthesizeSpeech(
  text: string,
  preferredVoice?: string
): Promise<{ audioBuffer: Buffer; contentType: string } | null> {
  // 1. Try Murf AI
  if (process.env.MURF_API_KEY?.trim()) {
    const murfResult = await synthesizeSpeechWithMurf(text, {
      voiceId: preferredVoice || process.env.MURF_VOICE_ID || "en-US-terrell",
    });
    if (murfResult) {
      return murfResult;
    }
    console.warn("[Speech Engine] Murf synthesis failed or yielded no audio. Trying Deepgram Aura TTS...");
  }

  // 2. Resilient fallback: Deepgram Aura TTS (aura-orpheus-en)
  try {
    const deepgramResult = await synthesizeSpeechWithDeepgram(text, "aura-orpheus-en");
    if (deepgramResult) {
      return deepgramResult;
    }
  } catch (deepgramErr: any) {
    console.warn("[Speech Engine] Deepgram fallback TTS error:", deepgramErr?.message);
  }

  return null;
}
