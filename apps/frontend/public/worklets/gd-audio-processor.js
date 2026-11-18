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
    this.resamplePosition = 0;

    this.port.onmessage = (event) => {
      if (event.data && event.data.command === "pause") {
        this.flushBuffer();
        this.isPaused = true;
        this.port.postMessage({ command: "flushed" });
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

    const ratio = currentSampleRate / this.targetSampleRate;
    let position = this.resamplePosition;
    for (; position < channelData.length; position += ratio) {
      const indexFloor = Math.floor(position);
      const indexCeil = Math.min(channelData.length - 1, indexFloor + 1);
      const fraction = position - indexFloor;
      const sample = channelData[indexFloor] * (1 - fraction) + channelData[indexCeil] * fraction;
      const clipped = Math.max(-1, Math.min(1, sample));
      this.buffer.push(Math.round(clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff));

      if (this.buffer.length >= this.chunkSize) this.flushBuffer(this.chunkSize);
    }
    this.resamplePosition = position - channelData.length;

    return true;
  }

  flushBuffer(sampleCount = this.buffer.length) {
    if (sampleCount <= 0) return;
    const pcmChunk = new Int16Array(this.buffer.splice(0, sampleCount));
    this.port.postMessage(pcmChunk.buffer, [pcmChunk.buffer]);
  }
}

registerProcessor("gd-audio-processor", GDAudioProcessor);

