/**
 * High-performance AudioWorkletProcessor for PrepX Group Discussion.
 * Continuously downsamples microphone audio (e.g. 44.1kHz or 48kHz) to standard 16,000 Hz,
 * converts Float32 to signed 16-bit little-endian PCM integers, and posts bounded frames
 * to the main thread via zero-copy ArrayBuffer transfer.
 */
class GDAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.chunkSize = 2048; // 2048 samples = 128ms of audio at 16kHz (optimal for real-time STT)
    this.buffer = [];
    this.isPaused = false;

    this.port.onmessage = (event) => {
      if (event.data && event.data.command === "pause") {
        this.isPaused = true;
      } else if (event.data && event.data.command === "resume") {
        this.isPaused = false;
      }
    };
  }

  process(inputs) {
    if (this.isPaused) return true;

    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) return true;

    const channelData = input[0];
    const currentSampleRate = sampleRate; // Global AudioWorklet scope sampleRate

    if (currentSampleRate === this.targetSampleRate) {
      // Direct pass-through if browser is already running at 16kHz
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
        this.buffer.push(Math.round(int16));

        if (this.buffer.length >= this.chunkSize) {
          const pcmChunk = new Int16Array(this.buffer.splice(0, this.chunkSize));
          this.port.postMessage(pcmChunk.buffer, [pcmChunk.buffer]);
        }
      }
    } else {
      // Linear interpolation downsampling
      const ratio = currentSampleRate / this.targetSampleRate;
      const newLength = Math.floor(channelData.length / ratio);

      for (let i = 0; i < newLength; i++) {
        const srcIndex = i * ratio;
        const indexFloor = Math.floor(srcIndex);
        const indexCeil = Math.min(channelData.length - 1, Math.ceil(srcIndex));
        const fraction = srcIndex - indexFloor;

        const sample =
          channelData[indexFloor] * (1 - fraction) + channelData[indexCeil] * fraction;

        const s = Math.max(-1, Math.min(1, sample));
        const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
        this.buffer.push(Math.round(int16));

        if (this.buffer.length >= this.chunkSize) {
          const pcmChunk = new Int16Array(this.buffer.splice(0, this.chunkSize));
          this.port.postMessage(pcmChunk.buffer, [pcmChunk.buffer]);
        }
      }
    }

    return true;
  }
}

registerProcessor("gd-audio-processor", GDAudioProcessor);

