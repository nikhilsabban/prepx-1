import api from "./api";
import { BACKEND_URL } from "../lib/config";

export interface GDTranscriptionCredentials {
  configured: boolean;
  proxyUrl: string;
  token: string;
  key?: string;
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
      proxyUrl: "",
      token: "",
      model: "nova-3",
      language: "en-IN",
      provider: "native",
      sampleRate: 16000,
      encoding: "webm-opus",
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
 * GD's streaming capture mirrors the AI Interview flow: one MediaRecorder
 * session sends 200ms WebM/Opus chunks through an authenticated backend socket.
 */
export class GDAudioCaptureSession {
  private readonly options: GDAudioCaptureOptions;
  private socket: WebSocket | null = null;
  private recorder: MediaRecorder | null = null;
  private status: GDTranscriptionStatus = "idle";
  private isDestroyed = false;
  private isPaused = false;
  private sequence = 0;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private startTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(options: GDAudioCaptureOptions) {
    this.options = options;
  }

  private setStatus(status: GDTranscriptionStatus, detail?: string) {
    this.status = status;
    this.options.onStatusChange?.(status, detail);
  }

  public getStatus(): GDTranscriptionStatus {
    return this.status;
  }

  public async start(mediaStream: MediaStream): Promise<void> {
    if (this.isDestroyed) return;
    this.isPaused = false;
    this.setStatus("connecting", "Connecting to the speech recognition service...");

    const credentials = await fetchGDTranscriptionCredentials();
    if (this.isDestroyed) return;
    if (!credentials.configured || !credentials.token || !credentials.proxyUrl) {
      const error = new Error("Cloud speech recognition is not configured.");
      this.setStatus("error", error.message);
      this.options.onError?.(error);
      return;
    }

    const backendUrl = BACKEND_URL || window.location.origin;
    const wsHost = backendUrl.replace(/^https?:\/\//i, "");
    const isVercelHost = wsHost.includes(".vercel.app");
    let wsUrl: URL;
    let directDeepgram = false;
    let protocols: string[] | undefined;
    if (credentials.key) {
      directDeepgram = true;
      wsUrl = new URL("wss://api.deepgram.com/v1/listen");
      wsUrl.searchParams.set("model", this.options.model || credentials.model || "nova-3");
      wsUrl.searchParams.set("language", this.options.language || credentials.language || "en-IN");
      wsUrl.searchParams.set("smart_format", "true");
      wsUrl.searchParams.set("punctuate", "true");
      wsUrl.searchParams.set("interim_results", "true");
      wsUrl.searchParams.set("no_delay", "true");
      wsUrl.searchParams.set("endpointing", "350");
      wsUrl.searchParams.set("utterance_end_ms", "1000");
      wsUrl.searchParams.set("filler_words", "true");
      protocols = ["token", credentials.key];
    } else if (credentials.proxyUrl && !isVercelHost) {
      wsUrl = new URL(credentials.proxyUrl, backendUrl);
      wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
      wsUrl.searchParams.set("token", credentials.token);
      wsUrl.searchParams.set("sessionId", this.options.sessionId);
      wsUrl.searchParams.set("participantId", this.options.participantId);
      wsUrl.searchParams.set("participantName", this.options.participantName);
      wsUrl.searchParams.set("username", this.options.username);
      wsUrl.searchParams.set("language", this.options.language || credentials.language || "en-IN");
      wsUrl.searchParams.set("model", this.options.model || credentials.model || "nova-3");
    } else {
      const error = new Error("No supported cloud speech connection is available.");
      this.fail(error.message);
      return;
    }

    try {
      const socket = new WebSocket(wsUrl.toString(), protocols);
      socket.binaryType = "arraybuffer";
      this.socket = socket;

      this.startTimeout = setTimeout(() => {
        if (!this.isDestroyed && this.status === "connecting") {
          this.fail("Speech recognition did not connect in time.");
        }
      }, 12_000);

      socket.onopen = () => {
        if (this.isDestroyed) return;
        if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
        this.keepAliveTimer = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "KeepAlive" }));
          }
        }, 4_000);
        if (directDeepgram) {
          if (this.startTimeout) clearTimeout(this.startTimeout);
          this.startTimeout = null;
          this.setStatus("listening", "Listening to your contributions");
          this.startRecorder(mediaStream);
        }
      };

      socket.onmessage = (message) => {
        if (typeof message.data !== "string" || this.isDestroyed) return;
        let data: any;
        try {
          data = JSON.parse(message.data);
        } catch {
          return;
        }

        if (data.type === "ready" || data.type === "gd:transcription:connected" || data.type === "Metadata") {
          if (this.startTimeout) clearTimeout(this.startTimeout);
          this.startTimeout = null;
          this.setStatus("listening", data.message || "Listening to your contributions");
          this.startRecorder(mediaStream);
          return;
        }
        if (data.type === "status" || data.type === "gd:transcription:reconnecting") {
          this.setStatus("reconnecting", data.message || "Reconnecting to speech recognition...");
          return;
        }
        if (data.type === "error" || data.type === "gd:transcription:error") {
          this.fail(data.message || "Speech recognition failed.");
          return;
        }

        const text = String(data.transcript || data.text || data.channel?.alternatives?.[0]?.transcript || "").trim();
        if (!text) return;
        const isFinal = data.is_final === true || data.speech_final === true || data.type === "final" || data.type === "gd:transcription:final";
        const event: GDNormalizedTranscriptEvent = {
          type: isFinal ? "gd:transcription:final" : "gd:transcription:interim",
          sessionId: this.options.sessionId,
          participantId: this.options.participantId,
          participantName: this.options.participantName,
          username: this.options.username,
          segmentId: String(data.segmentId || `gd-${this.options.sessionId}-${this.options.participantId}-${Date.now().toString(36)}-${++this.sequence}`),
          sequenceNumber: Number(data.sequenceNumber) || this.sequence,
          text,
          isFinal,
          startTime: Number.isFinite(data.start) ? Number(data.start) : undefined,
          endTime: Number.isFinite(data.end) ? Number(data.end) : undefined,
          confidence: Number(data.confidence ?? data.channel?.alternatives?.[0]?.confidence) || 0,
          provider: String(data.provider || credentials.provider),
          timestamp: new Date().toISOString(),
        };
        if (isFinal) this.options.onFinal?.(event);
        else this.options.onInterim?.(event);
      };

      socket.onerror = () => {
        if (!this.isDestroyed) this.setStatus("reconnecting", "Speech connection interrupted.");
      };
      socket.onclose = () => {
        this.clearTimers();
        this.stopRecorder();
        if (!this.isDestroyed && !this.isPaused) this.fail("Speech connection closed.");
      };
    } catch (error: any) {
      this.fail(error?.message || "Could not start speech recognition.");
    }
  }

  private startRecorder(stream: MediaStream) {
    if (this.isDestroyed || this.isPaused || this.recorder) return;
    if (typeof MediaRecorder === "undefined") {
      this.fail("This browser does not support continuous audio recording.");
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      this.fail("No microphone audio track is available.");
      return;
    }
    // Group Discussion keeps camera and microphone in one WebRTC stream. STT must
    // record audio only, as the AI Interview recorder does, or the proxy receives video.
    const audioOnlyStream = new MediaStream(audioTracks);
    const supportedTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported?.(type));
    try {
      const recorder = new MediaRecorder(audioOnlyStream, mimeType ? { mimeType } : undefined);
      this.recorder = recorder;
      recorder.ondataavailable = (event) => {
        if (!event.data?.size || this.socket?.readyState !== WebSocket.OPEN) return;
        this.socket.send(event.data);
      };
      recorder.onpause = () => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: "Finalize" }));
        }
      };
      recorder.onerror = () => this.fail("Microphone recording failed.");
      recorder.start(200);
    } catch (error: any) {
      this.fail(error?.message || "Could not start microphone recording.");
    }
  }

  private fail(message: string) {
    if (this.isDestroyed || this.status === "error") return;
    const error = new Error(message);
    this.setStatus("error", message);
    this.options.onError?.(error);
    this.stopRecorder();
    this.clearTimers();
    try {
      this.socket?.close();
    } catch {}
    this.socket = null;
  }

  private stopRecorder() {
    if (!this.recorder) return;
    this.recorder.ondataavailable = null;
    this.recorder.onpause = null;
    this.recorder.onerror = null;
    try {
      if (this.recorder.state !== "inactive") this.recorder.stop();
    } catch {}
    this.recorder = null;
  }

  private clearTimers() {
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
    if (this.startTimeout) clearTimeout(this.startTimeout);
    this.keepAliveTimer = null;
    this.startTimeout = null;
  }

  public pause() {
    this.isPaused = true;
    if (this.recorder?.state === "recording") this.recorder.pause();
    this.setStatus("paused", "Microphone paused");
  }

  public resume() {
    if (this.isDestroyed) return;
    this.isPaused = false;
    if (this.recorder?.state === "paused") {
      this.recorder.resume();
      this.setStatus("listening", "Listening to your contributions");
    } else if (!this.recorder && this.socket?.readyState === WebSocket.OPEN) {
      this.setStatus("listening", "Listening to your contributions");
    }
  }

  public destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.isPaused = true;
    this.clearTimers();
    const socket = this.socket;
    const recorder = this.recorder;
    this.recorder = null;
    const closeSocket = () => {
      try {
        if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "Finalize" }));
        socket?.close();
      } catch {}
    };
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => setTimeout(closeSocket, 250);
      try { recorder.stop(); } catch { closeSocket(); }
    } else {
      closeSocket();
    }
    this.socket = null;
    this.setStatus("idle");
  }
}
