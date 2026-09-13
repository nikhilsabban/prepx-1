import axios from "axios";

/**
 * Synthesizes text into spoken audio using Deepgram Aura TTS API
 * Model options: aura-orpheus-en (Male, warmest/most natural), aura-asteria-en (Female), aura-helios-en (Male)
 */
export async function synthesizeSpeechWithDeepgram(
  text: string,
  model: string = "aura-orpheus-en"  // Orpheus: most human-sounding Deepgram voice
): Promise<{ audioBuffer: Buffer; contentType: string } | null> {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  try {
    const response = await axios.post(
      `https://api.deepgram.com/v1/speak?model=${model}`,
      { text },
      {
        headers: {
          Authorization: `Token ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    const buffer = Buffer.from(response.data);
    const contentType = String(response.headers["content-type"] || "audio/mp3");

    return { audioBuffer: buffer, contentType };
  } catch (error: any) {
    console.error("Deepgram TTS error:", error.response?.data?.toString() || error.message);
    return null;
  }
}
