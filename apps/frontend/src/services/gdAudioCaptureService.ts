import api from "./api";

export interface GDTranscriptionCredentials {
  configured: boolean;
  proxyUrl: string;
  token: string;
  model: string;
  language: string;
  provider: "deepgram" | "murf" | "native";
  sampleRate: number;
  encoding: string;
}

export interface GDNormalizedTranscriptEvent {
  type: "gd:transcription:interim" | "gd:transcription:final";
  sessionId: string;
  participantId: string;
  participantName: string;
  username: string;
  segmentId: string;
  sequenceNumber: number;
  text: string;
  isFinal: boolean;
  startTime?: number;
  endTime?: number;
  confidence: number;
  provider: string;
  timestamp: string;
}

export async function fetchGDTranscriptionCredentials(): Promise<GDTranscriptionCredentials> {
  try {
    const res = await api.get<GDTranscriptionCredentials>("/api/v1/gd/transcription/credentials");
    return res.data;
  } catch {
    return {
      configured: false,
      proxyUrl: "/api/v1/gd/transcription/stream",
      token: "",
      model: "nova-3",
      language: "en-IN",
      provider: "native",
      sampleRate: 16000,
      encoding: "linear16",
    };
  }
}

export type GDTranscriptionStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "reconnecting"
  | "paused"
  | "error";

export interface GDAudioCaptureOptions {
  sessionId: string;
  participantId: string;
  participantName: string;
  username: string;
  language?: string;
  model?: string;
  onInterim?: (event: GDNormalizedTranscriptEvent) => void;
  onFinal?: (event: GDNormalizedTranscriptEvent) => void;
  onStatusChange?: (status: GDTranscriptionStatus, detail?: string) => void;
  onError?: (err: Error) => void;
}

/**
 * Resilient Participant-Isolated Real-Time Audio Capture & Streaming Engine for PrepX GD.
 * Uses browser MediaStream + AudioContext + AudioWorklet (with ScriptProcessor fallback)
 * to stream signed 16-bit 16kHz PCM frames to Deepgram Nova-3.
 */
export class GDAudioCaptureSession {
  private options: GDAudioCaptureOptions;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
  private socket: WebSocket | null = null;
  private isDestroyed: boolean = false;
  private isPaused: boolean = false;
  private status: GDTranscriptionStatus = "idle";
  private reconnectAttempts: number = 0;
  private credentials: GDTranscriptionCredentials | null = null;
  private localStream: MediaStream | null = null;

  constructor(options: GDAudioCaptureOptions) {
    this.options = options;
  }

  private setStatus(s: GDTranscriptionStatus, detail?: string) {
    this.status = s;
    this.options.onStatusChange?.(s, detail);
  }

  public getStatus(): GDTranscriptionStatus {
    return this.status;
  }

  /**
   * Initializes audio processing and opens isolated real-time transcription WebSocket.
   */
  public async start(mediaStream: MediaStream): Promise<void> {
    if (this.isDestroyed) return;
    this.localStream = mediaStream;
    this.isPaused = false;
    this.setStatus("connecting", "Initializing speech recognition engine...");

    // 1. Fetch credentials
    this.credentials = await fetchGDTranscriptionCredentials();

    // 2. Open WebSocket
    await this.connectWebSocket();

    // 3. Initialize Audio Processing pipeline
    await this.initAudioProcessing(mediaStream);
  }

  private async connectWebSocket(): Promise<void> {
    if (this.isDestroyed) return;

    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
    const wsProtocol = backendUrl.startsWith("https") ? "wss:" : "ws:";
    const wsHost = backendUrl.replace(/^https?:\/\//i, "");

    const proxyPath = this.credentials?.proxyUrl || "/api/v1/gd/transcription/stream";
    const token = this.credentials?.token || "";
    const lang = this.options.language || this.credentials?.language || "en-IN";
    const model = this.options.model || this.credentials?.model || "nova-3";

    const wsUrl = `${wsProtocol}//${wsHost}${proxyPath}?token=${encodeURIComponent(
      token
    )}&sessionId=${encodeURIComponent(this.options.sessionId)}&participantId=${encodeURIComponent(
      this.options.participantId
    )}&username=${encodeURIComponent(this.options.username)}&participantName=${encodeURIComponent(
      this.options.participantName
    )}&language=${encodeURIComponent(lang)}&model=${encodeURIComponent(model)}`;

    const socket = new WebSocket(wsUrl);
    this.socket = socket;
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      if (this.isDestroyed) return;
      this.reconnectAttempts = 0;
      this.setStatus("listening", "Listening to your contributions");
    };

    socket.onmessage = (event) => {
      try {
        if (typeof event.data !== "string") return;
        const data = JSON.parse(event.data);

        if (data.type === "gd:transcription:connected") {
          this.setStatus("listening", data.message || "Connected to Deepgram Nova-3");
        } else if (data.type === "gd:transcription:interim") {
          this.options.onInterim?.(data);
        } else if (data.type === "gd:transcription:final") {
          this.options.onFinal?.(data);
        } else if (data.type === "gd:transcription:reconnecting") {
          this.setStatus("reconnecting", data.message || "Reconnecting to speech engine...");
        } else if (data.type === "gd:transcription:error") {
          this.setStatus("error", data.message || "Speech recognition error");
          this.options.onError?.(new Error(data.message));
        }
      } catch {}
    };

    socket.onerror = () => {
      if (this.isDestroyed) return;
      this.setStatus("reconnecting", "Speech connection interrupted, attempting recovery...");
    };

    socket.onclose = () => {
      if (this.isDestroyed || this.isPaused) return;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.isDestroyed || this.isPaused) return;
    this.reconnectAttempts++;
    if (this.reconnectAttempts > 5) {
      this.setStatus("error", "Speech engine connection lost. Please verify network.");
      return;
    }

    const delay = Math.min(4000, 500 * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 200);
    this.setStatus("reconnecting", `Reconnecting in ${(delay / 1000).toFixed(1)}s...`);

    setTimeout(() => {
      if (!this.isDestroyed && !this.isPaused) {
        this.connectWebSocket().catch(() => {});
      }
    }, delay);
  }

  private async initAudioProcessing(mediaStream: MediaStream): Promise<void> {
    if (this.isDestroyed) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ latencyHint: "interactive" });
      this.audioContext = audioCtx;

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(mediaStream);
      this.sourceNode = source;

      // Try AudioWorklet first
      let workletLoaded = false;
      if (audioCtx.audioWorklet) {
        try {
          await audioCtx.audioWorklet.addModule("/worklets/gd-audio-processor.js");
          const worklet = new AudioWorkletNode(audioCtx, "gd-audio-processor");
          this.workletNode = worklet;

          worklet.port.onmessage = (e) => {
            if (this.isPaused || this.isDestroyed) return;
            const buffer = e.data as ArrayBuffer;
            if (this.socket && this.socket.readyState === WebSocket.OPEN && buffer.byteLength > 0) {
              this.socket.send(buffer);
            }
          };

          source.connect(worklet);
          workletLoaded = true;
        } catch (workletErr) {
          console.warn("[GDAudioCapture] AudioWorklet failed, using ScriptProcessor fallback:", workletErr);
        }
      }

      // ScriptProcessor fallback for 100% browser compatibility
      if (!workletLoaded) {
        this.initScriptProcessorFallback(audioCtx, source);
      }
    } catch (err: any) {
      console.error("[GDAudioCapture] Audio initialization failed:", err);
      this.setStatus("error", err.message);
      this.options.onError?.(err);
    }
  }

  private initScriptProcessorFallback(audioCtx: AudioContext, source: MediaStreamAudioSourceNode) {
    const bufferSize = 4096;
    const scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
    this.scriptProcessorNode = scriptNode;

    const targetSampleRate = 16000;
    const chunkSize = 2048;
    const pcmBuffer: number[] = [];

    scriptNode.onaudioprocess = (e) => {
      if (this.isPaused || this.isDestroyed) return;
      const channelData = e.inputBuffer.getChannelData(0);
      const currentRate = audioCtx.sampleRate;

      const ratio = currentRate / targetSampleRate;
      const newLength = Math.floor(channelData.length / ratio);

      for (let i = 0; i < newLength; i++) {
        const srcIndex = i * ratio;
        const indexFloor = Math.floor(srcIndex);
        const indexCeil = Math.min(channelData.length - 1, Math.ceil(srcIndex));
        const fraction = srcIndex - indexFloor;
        const sample = channelData[indexFloor] * (1 - fraction) + channelData[indexCeil] * fraction;

        const s = Math.max(-1, Math.min(1, sample));
        const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
        pcmBuffer.push(Math.round(int16));

        if (pcmBuffer.length >= chunkSize) {
          const chunk = new Int16Array(pcmBuffer.splice(0, chunkSize));
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(chunk.buffer);
          }
        }
      }
    };

    source.connect(scriptNode);
    // Silent output destination to keep Chrome ScriptProcessor running
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;
    scriptNode.connect(silentGain);
    silentGain.connect(audioCtx.destination);
  }

  public pause(): void {
    this.isPaused = true;
    this.setStatus("paused", "Microphone muted");
    if (this.workletNode) {
      try {
        this.workletNode.port.postMessage({ command: "pause" });
      } catch {}
    }
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: "gd:transcription:stop" }));
      } catch {}
    }
  }

  public resume(): void {
    this.isPaused = false;
    this.setStatus("listening", "Listening to your contributions");
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
    if (this.workletNode) {
      try {
        this.workletNode.port.postMessage({ command: "resume" });
      } catch {}
    }
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: "gd:transcription:start" }));
      } catch {}
    } else if (this.localStream) {
      this.connectWebSocket().catch(() => {});
    }
  }

  public stop(): void {
    this.pause();
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: "Finalize" }));
      } catch {}
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.isPaused = true;

    if (this.workletNode) {
      try {
        this.workletNode.disconnect();
      } catch {}
      this.workletNode = null;
    }

    if (this.scriptProcessorNode) {
      try {
        this.scriptProcessorNode.disconnect();
      } catch {}
      this.scriptProcessorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.socket) {
      try {
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: "Finalize" }));
        }
        this.socket.close();
      } catch {}
      this.socket = null;
    }

    this.setStatus("idle");
  }
}

