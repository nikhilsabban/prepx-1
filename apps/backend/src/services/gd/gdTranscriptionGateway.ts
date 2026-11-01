import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { gdSessionService, broadcastToGDRoom } from "./gdSessionService";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
if (!process.env.DEEPGRAM_API_KEY) {
  dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
}

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "";
const MURF_API_KEY = process.env.MURF_API_KEY || "";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const DEEPGRAM_MODEL = process.env.DEEPGRAM_MODEL || "nova-3";
const DEEPGRAM_LANGUAGE = process.env.DEEPGRAM_LANGUAGE || "en-IN";

interface GDTranscriptionClient extends WebSocket {
  isAlive?: boolean;
  sessionId?: string;
  participantId?: string;
  participantName?: string;
  username?: string;
  language?: string;
  model?: string;
  upstreamSocket?: WebSocket | null;
  audioQueue?: Buffer[];
  sequenceCounter?: number;
  isActive?: boolean;
  reconnectAttempts?: number;
  lastActiveAt?: number;
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
  provider: "deepgram" | "murf" | "fallback";
  timestamp: string;
}

/**
 * Distributed, Participant-Isolated Real-Time STT Transcription Gateway for PrepX Group Discussions.
 * Mounts on `/api/v1/gd/transcription/stream` and `/ws/gd-transcription`.
 * Accepts 16kHz signed 16-bit little-endian PCM audio frames from each participant's AudioWorklet.
 */
export function initGDTranscriptionGateway(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Map of `${sessionId}:${participantId}` -> active GDTranscriptionClient
  const activeStreams = new Map<string, GDTranscriptionClient>();

  server.on("upgrade", (request, socket, head) => {
    const { pathname, searchParams } = new URL(request.url || "", `http://${request.headers.host}`);

    if (pathname === "/api/v1/gd/transcription/stream" || pathname === "/ws/gd-transcription") {
      let token = searchParams.get("token");
      if (!token && request.headers.authorization) {
        token = request.headers.authorization.replace(/^Bearer\s+/i, "");
      }

      const protocols = request.headers["sec-websocket-protocol"]
        ?.split(",")
        .map((p) => p.trim());
      if (!token && protocols && protocols.length >= 2 && protocols[0] === "access_token") {
        token = protocols[1];
      }

      let authedUserId = "";
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          authedUserId = decoded.id || decoded.userId || decoded._id || decoded.sub || "";
        } catch {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
      }

      const sessionId = searchParams.get("sessionId") || searchParams.get("roomId") || "";
      const participantId = searchParams.get("participantId") || authedUserId || "";
      const username = searchParams.get("username") || "";
      const participantName = searchParams.get("participantName") || username || "Participant";
      const language = searchParams.get("language") || DEEPGRAM_LANGUAGE;
      const model = searchParams.get("model") || DEEPGRAM_MODEL;

      wss.handleUpgrade(request, socket, head, (ws) => {
        const client = ws as GDTranscriptionClient;
        client.sessionId = sessionId;
        client.participantId = participantId;
        client.participantName = participantName;
        client.username = username.toLowerCase().trim();
        client.language = language;
        client.model = model;
        client.sequenceCounter = 0;
        client.isActive = true;
        client.reconnectAttempts = 0;
        client.lastActiveAt = Date.now();

        wss.emit("connection", client, request);
      });
    }
  });

  wss.on("connection", async (client: GDTranscriptionClient) => {
    client.isAlive = true;
    client.audioQueue = [];

    const streamKey = `${client.sessionId}:${client.participantId}`;
    // Replace any stale client for this participant
    const existing = activeStreams.get(streamKey);
    if (existing && existing !== client && existing.readyState === WebSocket.OPEN) {
      try {
        existing.close(1000, "Replaced by newer participant stream connection");
      } catch {}
    }
    activeStreams.set(streamKey, client);

    client.on("pong", () => {
      client.isAlive = true;
      client.lastActiveAt = Date.now();
    });

    // Check upstream credentials
    const hasDeepgram = !!DEEPGRAM_API_KEY.trim();
    const hasMurf = !!MURF_API_KEY.trim();

    if (!hasDeepgram && !hasMurf) {
      console.error("[GD Transcription Gateway] Neither DEEPGRAM_API_KEY nor MURF_API_KEY is configured.");
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "gd:transcription:error",
            message: "Speech recognition service is not configured on server.",
          })
        );
        client.close(1011, "STT server configuration missing");
      }
      return;
    }

    // Connect upstream to STT provider
    await setupUpstream(client);

    // Handle incoming client audio frames and control messages
    client.on("message", (data: WebSocket.RawData, isBinary: boolean) => {
      client.lastActiveAt = Date.now();

      if (isBinary) {
        if (!client.isActive) return;
        const chunk = Buffer.from(data as any);
        const upstream = client.upstreamSocket;

        if (upstream && upstream.readyState === WebSocket.OPEN) {
          upstream.send(chunk);
        } else {
          // Buffer audio frames while handshake is pending (up to 250 frames ~30s of 128ms PCM frames)
          if (client.audioQueue && client.audioQueue.length < 250) {
            client.audioQueue.push(chunk);
          }
        }
      } else {
        try {
          const str = data.toString();
          const parsed = JSON.parse(str);
          const type = parsed.type;

          if (type === "ping") {
            client.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          } else if (type === "gd:transcription:start" || type === "start") {
            client.isActive = true;
            client.send(JSON.stringify({ type: "gd:transcription:resumed", participantId: client.participantId }));
          } else if (type === "gd:transcription:stop" || type === "stop" || type === "Finalize") {
            client.isActive = false;
            if (client.upstreamSocket && client.upstreamSocket.readyState === WebSocket.OPEN) {
              client.upstreamSocket.send(JSON.stringify({ type: "Finalize" }));
            }
          }
        } catch {
          // Ignore malformed text packets
        }
      }
    });

    client.on("close", () => {
      activeStreams.delete(streamKey);
      client.audioQueue = [];
      teardownUpstream(client);
    });

    client.on("error", (err: Error) => {
      console.warn(`[GD Transcription Gateway] Client socket error for ${streamKey}:`, err.message);
      teardownUpstream(client);
    });
  });

  // Background heartbeat to detect hung TCP connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as GDTranscriptionClient;
      if (client.isAlive === false) {
        teardownUpstream(client);
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 15000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  /**
   * Initializes isolated upstream STT WebSocket (Deepgram Nova-3 Linear16).
   */
  async function setupUpstream(client: GDTranscriptionClient) {
    teardownUpstream(client);

    try {
      // 1. Fetch GD Session topic for dynamic technical & Indian context keyterm prompting
      let topicKeyterms: string[] = [];
      if (client.sessionId) {
        try {
          const session = await gdSessionService.getSessionById(client.sessionId);
          if (session?.topic) {
            const rawText = `${session.topic.question} ${session.topic.originalTitle || ""} ${session.topic.category || ""} ${session.topic.description || ""}`;
            topicKeyterms = Array.from(
              new Set(
                rawText
                  .replace(/[^a-zA-Z0-9\s-]/g, " ")
                  .split(/\s+/)
                  .filter((w) => w.length >= 3 && !["and", "the", "for", "with", "this", "that", "from"].includes(w.toLowerCase()))
              )
            ).slice(0, 30);
          }
        } catch {}
      }

      // 2. Build Deepgram URL with explicit linear16 16kHz PCM configuration
      const dgModel = DEEPGRAM_MODEL || client.model || "nova-3";
      const dgLang = DEEPGRAM_LANGUAGE || client.language || "en-IN";

      const urlObj = new URL("wss://api.deepgram.com/v1/listen");
      urlObj.searchParams.set("model", dgModel);
      urlObj.searchParams.set("language", dgLang);
      urlObj.searchParams.set("encoding", "linear16");
      urlObj.searchParams.set("sample_rate", "16000");
      urlObj.searchParams.set("channels", "1");
      urlObj.searchParams.set("smart_format", "true");
      urlObj.searchParams.set("punctuate", "true");
      urlObj.searchParams.set("interim_results", "true");
      urlObj.searchParams.set("no_delay", "true");
      urlObj.searchParams.set("endpointing", "300"); // 300ms pause indicates natural phrase boundary
      urlObj.searchParams.set("utterance_end_ms", "1000");
      urlObj.searchParams.set("filler_words", "true");

      for (const kt of topicKeyterms) {
        if (kt.trim()) {
          urlObj.searchParams.append("keyterm", kt.trim());
        }
      }

      const upstreamSocket = new WebSocket(urlObj.toString(), {
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY.trim()}`,
        },
      });

      client.upstreamSocket = upstreamSocket;

      upstreamSocket.on("open", () => {
        client.reconnectAttempts = 0;
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "gd:transcription:connected",
              status: "listening",
              provider: "deepgram",
              model: dgModel,
              language: dgLang,
              participantId: client.participantId,
              sessionId: client.sessionId,
              message: "Deepgram Nova-3 PCM stream established.",
            })
          );
        }

        // Flush buffered audio frames
        if (client.audioQueue && client.audioQueue.length > 0) {
          for (const frame of client.audioQueue) {
            if (upstreamSocket.readyState === WebSocket.OPEN) {
              upstreamSocket.send(frame);
            }
          }
          client.audioQueue = [];
        }
      });

      upstreamSocket.on("message", async (data: WebSocket.Data) => {
        try {
          const raw = data.toString();
          const parsed = JSON.parse(raw);

          const alt = parsed.channel?.alternatives?.[0];
          const transcriptText = (alt?.transcript || parsed.transcript || parsed.text || "").trim();

          if (!transcriptText) return;

          const isFinal = parsed.is_final === true || parsed.speech_final === true;
          const confidence = alt?.confidence ?? (isFinal ? 0.98 : 0.85);

          client.sequenceCounter = (client.sequenceCounter || 0) + 1;
          const segmentId = `seg-${client.sessionId}-${client.participantId}-${client.sequenceCounter}-${Date.now().toString(36)}`;

          const normalizedEvent: GDNormalizedTranscriptEvent = {
            type: isFinal ? "gd:transcription:final" : "gd:transcription:interim",
            sessionId: client.sessionId || "",
            participantId: client.participantId || "candidate",
            participantName: client.participantName || "Candidate",
            username: client.username || "candidate",
            segmentId,
            sequenceNumber: client.sequenceCounter,
            text: transcriptText,
            isFinal,
            startTime: parsed.start,
            endTime: parsed.start !== undefined && parsed.duration !== undefined ? parsed.start + parsed.duration : undefined,
            confidence,
            provider: "deepgram",
            timestamp: new Date().toISOString(),
          };

          // Send back to speaking client
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(normalizedEvent));
          }

          if (isFinal) {
            // 1. Atomically persist final segment to MongoDB
            let savedSession = null;
            if (client.sessionId) {
              savedSession = await gdSessionService.addTranscriptSegment(client.sessionId, {
                segmentId,
                participantId: client.participantId || "candidate",
                participantName: client.participantName || "Candidate",
                username: client.username,
                text: transcriptText,
                durationSeconds: parsed.duration ? Math.max(1, Math.round(parsed.duration)) : Math.max(1, Math.round(transcriptText.split(/\s+/).length / 2.5)),
                isInterruption: false,
                confidence,
                sequenceNumber: client.sequenceCounter,
                startTime: parsed.start,
                endTime: parsed.start !== undefined && parsed.duration !== undefined ? parsed.start + parsed.duration : undefined,
              });
            }

            // 2. Broadcast finalized segment to all participants in the GD room
            const payload = {
              segment: savedSession?.transcript.slice(-1)[0] || {
                id: segmentId,
                participantId: client.participantId,
                participantName: client.participantName,
                username: client.username,
                text: transcriptText,
                durationSeconds: parsed.duration || 3,
                confidence,
                timestamp: new Date(),
              },
              participants: savedSession?.participants,
              currentTurn: savedSession?.currentTurn,
            };

            // Modern normalized event
            broadcastToGDRoom(client.sessionId || "", {
              type: "gd:transcription:final",
              payload: normalizedEvent,
            });

            // Backward-compatible event for existing GDRoomPage listeners
            broadcastToGDRoom(client.sessionId || "", {
              type: "new_transcript_segment",
              payload,
            });
          } else {
            // Interim broadcast: show live preview to everyone in room without DB write
            broadcastToGDRoom(client.sessionId || "", {
              type: "gd:transcription:interim",
              payload: normalizedEvent,
            });

            // Backward-compatible interim event
            broadcastToGDRoom(client.sessionId || "", {
              type: "participant_interim_transcript",
              payload: {
                participantId: client.participantId,
                username: client.username,
                participantName: client.participantName,
                text: transcriptText,
              },
            });
          }
        } catch (err: any) {
          console.warn("[GD Transcription Gateway] Error processing transcript packet:", err.message);
        }
      });

      upstreamSocket.on("error", (err: Error) => {
        console.warn(`[GD Transcription Gateway] Deepgram upstream error for participant ${client.participantId}:`, err.message);
        handleUpstreamReconnect(client);
      });

      upstreamSocket.on("close", () => {
        if (client.readyState === WebSocket.OPEN && client.isActive) {
          handleUpstreamReconnect(client);
        }
      });
    } catch (err: any) {
      console.error("[GD Transcription Gateway] Upstream initialization failed:", err.message);
      handleUpstreamReconnect(client);
    }
  }

  function handleUpstreamReconnect(client: GDTranscriptionClient) {
    teardownUpstream(client);
    if (client.readyState !== WebSocket.OPEN) return;

    client.reconnectAttempts = (client.reconnectAttempts || 0) + 1;
    if (client.reconnectAttempts > 5) {
      client.send(
        JSON.stringify({
          type: "gd:transcription:error",
          message: "Unable to maintain speech recognition connection. Please check your network.",
        })
      );
      return;
    }

    // Exponential backoff with jitter (500ms, 1000ms, 2000ms...)
    const delay = Math.min(5000, 500 * Math.pow(2, client.reconnectAttempts - 1) + Math.random() * 300);
    client.send(
      JSON.stringify({
        type: "gd:transcription:reconnecting",
        attempt: client.reconnectAttempts,
        message: "Reconnecting speech recognition engine...",
      })
    );

    setTimeout(() => {
      if (client.readyState === WebSocket.OPEN) {
        setupUpstream(client);
      }
    }, delay);
  }

  function teardownUpstream(client: GDTranscriptionClient) {
    const upstream = client.upstreamSocket;
    if (upstream) {
      try {
        if (upstream.readyState === WebSocket.OPEN) {
          upstream.send(JSON.stringify({ type: "CloseStream" }));
        }
        upstream.close();
      } catch {}
      client.upstreamSocket = null;
    }
  }

  return wss;
}
