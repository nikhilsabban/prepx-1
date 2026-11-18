import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { gdSessionService } from "./gdSessionService";

dotenv.config();

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const DEEPGRAM_MODEL = process.env.DEEPGRAM_MODEL || "nova-3";
const DEEPGRAM_LANGUAGE = process.env.DEEPGRAM_LANGUAGE || "en-IN";

interface GDStreamClient extends WebSocket {
  isAlive?: boolean;
  sessionId?: string;
  participantId?: string;
  participantName?: string;
  username?: string;
  language?: string;
  model?: string;
  upstream?: WebSocket | null;
  queuedAudio?: Buffer[];
  sequence?: number;
  keepAlive?: ReturnType<typeof setInterval> | null;
}

/** WebM/Opus MediaRecorder stream proxy used only by Group Discussion. */
export function initGDTranscriptionGateway(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    const { pathname, searchParams } = new URL(request.url || "", `http://${request.headers.host}`);
    if (pathname !== "/api/v1/gd/transcription/stream" && pathname !== "/ws/gd-transcription") return;

    let decoded: any;
    try {
      const token = searchParams.get("token") || request.headers.authorization?.replace(/^Bearer\s+/i, "");
      if (!token) throw new Error("Missing transcription ticket");
      decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.purpose !== "gd_transcription") throw new Error("Invalid transcription ticket");
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const sessionId = searchParams.get("sessionId") || searchParams.get("roomId") || "";
    const userId = String(decoded.userId || decoded.id || decoded._id || decoded.sub || "");
    const requestedParticipantId = searchParams.get("participantId") || "";
    const session = await gdSessionService.getSessionById(sessionId).catch(() => null);
    const participant = session?.participants.find((item) =>
      item.userId?.toString() === userId || item.id === userId
    );

    if (
      !session ||
      session.status !== "in_progress" ||
      !participant ||
      participant.isAi ||
      (requestedParticipantId && requestedParticipantId !== participant.id)
    ) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      const client = ws as GDStreamClient;
      client.sessionId = sessionId;
      client.participantId = participant.id;
      client.participantName = participant.name || participant.username || "Participant";
      client.username = participant.username || "";
      client.language = searchParams.get("language") || DEEPGRAM_LANGUAGE;
      client.model = searchParams.get("model") || DEEPGRAM_MODEL;
      client.sequence = 0;
      client.queuedAudio = [];
      client.upstream = null;
      client.keepAlive = null;
      wss.emit("connection", client);
    });
  });

  wss.on("connection", (client: GDStreamClient) => {
    client.isAlive = true;
    let ended = false;

    const closeUpstream = () => {
      if (client.keepAlive) clearInterval(client.keepAlive);
      client.keepAlive = null;
      const upstream = client.upstream;
      client.upstream = null;
      if (upstream) {
        try { upstream.close(); } catch {}
      }
    };

    client.on("pong", () => { client.isAlive = true; });
    client.on("close", () => {
      ended = true;
      closeUpstream();
      client.queuedAudio = [];
    });
    client.on("error", () => {
      ended = true;
      closeUpstream();
    });

    if (!DEEPGRAM_API_KEY.trim()) {
      client.send(JSON.stringify({ type: "error", message: "Deepgram speech recognition is not configured." }));
      client.close(1011, "STT not configured");
      return;
    }

    client.on("message", (data, isBinary) => {
      if (isBinary) {
        const audio = Buffer.from(data as any);
        if (client.upstream?.readyState === WebSocket.OPEN) {
          client.upstream.send(audio);
        } else if (client.queuedAudio && client.queuedAudio.length < 250) {
          client.queuedAudio.push(audio);
        }
        return;
      }

      try {
        const message = JSON.parse(data.toString());
        if (message.type === "ping" || message.type === "keepalive") {
          if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          if (client.upstream?.readyState === WebSocket.OPEN) {
            client.upstream.send(JSON.stringify({ type: "KeepAlive" }));
          }
        } else if (message.type === "Finalize" || message.type === "finalize") {
          if (client.upstream?.readyState === WebSocket.OPEN) {
            client.upstream.send(JSON.stringify({ type: "Finalize" }));
          }
        }
      } catch {
        // Ignore malformed control packets.
      }
    });

    const connectDeepgram = async () => {
      try {
        const session = await gdSessionService.getSessionById(client.sessionId || "");
        const topicText = `${session?.topic?.question || ""} ${session?.topic?.originalTitle || ""} ${session?.topic?.category || ""} ${session?.topic?.description || ""}`;
        const keyterms = Array.from(new Set(topicText.replace(/[^a-zA-Z0-9\s-]/g, " ").split(/\s+/)))
          .filter((word) => word.length >= 3 && !["and", "the", "for", "with", "this", "that", "from"].includes(word.toLowerCase()))
          .slice(0, 30);

        const url = new URL("wss://api.deepgram.com/v1/listen");
        url.searchParams.set("model", client.model || DEEPGRAM_MODEL);
        url.searchParams.set("language", client.language || DEEPGRAM_LANGUAGE);
        url.searchParams.set("smart_format", "true");
        url.searchParams.set("punctuate", "true");
        url.searchParams.set("interim_results", "true");
        url.searchParams.set("no_delay", "true");
        url.searchParams.set("endpointing", "350");
        url.searchParams.set("utterance_end_ms", "1000");
        url.searchParams.set("filler_words", "true");
        for (const keyterm of keyterms) url.searchParams.append("keyterm", keyterm);

        const upstream = new WebSocket(url.toString(), {
          headers: { Authorization: `Token ${DEEPGRAM_API_KEY.trim()}` },
        });
        client.upstream = upstream;

        upstream.on("open", () => {
          if (ended) return upstream.close();
          client.keepAlive = setInterval(() => {
            if (upstream.readyState === WebSocket.OPEN) {
              try { upstream.send(JSON.stringify({ type: "KeepAlive" })); } catch {}
            }
          }, 3500);
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "ready",
              status: "listening",
              provider: "deepgram",
              model: client.model || DEEPGRAM_MODEL,
              language: client.language || DEEPGRAM_LANGUAGE,
              participantId: client.participantId,
              message: "Deepgram streaming is ready.",
            }));
          }
          for (const audio of client.queuedAudio || []) {
            if (upstream.readyState === WebSocket.OPEN) upstream.send(audio);
          }
          client.queuedAudio = [];
        });

        upstream.on("message", (data) => {
          if (client.readyState !== WebSocket.OPEN) return;
          try {
            const parsed = JSON.parse(data.toString());
            const alternative = parsed.channel?.alternatives?.[0];
            const transcript = String(alternative?.transcript || parsed.transcript || "").trim();
            if (!transcript) return;
            const isFinal = parsed.is_final === true || parsed.speech_final === true;
            client.sequence = (client.sequence || 0) + 1;
            client.send(JSON.stringify({
              type: isFinal ? "final" : "partial",
              transcript,
              is_final: isFinal,
              speech_final: parsed.speech_final === true,
              confidence: Number(alternative?.confidence) || 0,
              start: parsed.start,
              duration: parsed.duration,
              sequenceNumber: client.sequence,
              segmentId: `gd-${client.sessionId}-${client.participantId}-${client.sequence}-${Date.now().toString(36)}`,
              participantId: client.participantId,
              participantName: client.participantName,
              username: client.username,
              provider: "deepgram",
              channel: { alternatives: [{ transcript, confidence: Number(alternative?.confidence) || 0 }] },
            }));
          } catch {
            // Ignore non-JSON provider messages.
          }
        });

        upstream.on("error", (error) => {
          if (ended || client.readyState !== WebSocket.OPEN) return;
          console.warn("[GD STT] Deepgram stream error:", error.message);
          client.send(JSON.stringify({ type: "error", message: "Deepgram speech recognition disconnected." }));
          client.close(1011, "STT upstream error");
        });
        upstream.on("close", () => {
          if (ended || client.readyState !== WebSocket.OPEN) return;
          client.send(JSON.stringify({ type: "error", message: "Deepgram speech recognition closed." }));
          client.close(1011, "STT upstream closed");
        });
      } catch (error: any) {
        console.error("[GD STT] Could not start streaming connection:", error?.message || error);
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "error", message: "Could not start Deepgram speech recognition." }));
          client.close(1011, "STT setup failed");
        }
      }
    };

    void connectDeepgram();
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      const client = socket as GDStreamClient;
      if (!client.isAlive) {
        closeClient(client);
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 15000);
  wss.on("close", () => clearInterval(heartbeat));
  return wss;
}

function closeClient(client: GDStreamClient) {
  if (client.keepAlive) clearInterval(client.keepAlive);
  try { client.upstream?.close(); } catch {}
  client.terminate();
}
