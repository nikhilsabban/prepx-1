import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { getDynamicInterviewKeyterms } from "./sttKeytermsService";

dotenv.config();

const MURF_API_KEY = process.env.MURF_API_KEY || "";
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const DEEPGRAM_MODEL = process.env.DEEPGRAM_MODEL || "nova-3";
const DEEPGRAM_LANGUAGE = process.env.DEEPGRAM_LANGUAGE || "en-IN";

interface STTClient extends WebSocket {
  isAlive?: boolean;
  upstreamSocket?: WebSocket | null;
  provider?: "murf" | "deepgram";
  audioQueue?: Buffer[];
  userId?: string;
  interviewId?: string;
  participantId?: string;
  username?: string;
  requestedLang?: string;
  requestedModel?: string;
  keyterms?: string[];
}

/**
 * Initializes an authenticated, reliable WebSocket STT Streaming Gateway.
 * Prioritizes Murf AI Transcription Streaming, with fallback to Deepgram Nova.
 * Normalizes all streaming events into a unified, speaker-attributed transcript format.
 */
export function initSTTWebSocketServer(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const { pathname, searchParams } = new URL(request.url || "", `http://${request.headers.host}`);

    if (pathname === "/api/v1/interview/stt-stream" || pathname === "/ws/interview-stt") {
      // Authenticate via query param token or authorization header
      let token = searchParams.get("token");
      if (!token && request.headers.authorization) {
        token = request.headers.authorization.replace(/^Bearer\s+/i, "");
      }

      // Check sec-websocket-protocol for subprotocol auth token
      const protocols = request.headers["sec-websocket-protocol"]
        ?.split(",")
        .map((p) => p.trim());
      if (!token && protocols && protocols.length >= 2 && protocols[0] === "access_token") {
        token = protocols[1];
      }

      let userId = "";
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.id || decoded.userId || decoded._id || "";
        } catch {
          // If token was provided but invalid/expired, reject the upgrade
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
      }

      // Upgrade the connection
      wss.handleUpgrade(request, socket, head, (ws) => {
        const client = ws as STTClient;
        client.userId = userId;
        client.interviewId = searchParams.get("interviewId") || "";
        client.participantId = searchParams.get("participantId") || userId || "speaker";
        client.username = searchParams.get("username") || "";
        client.requestedLang = searchParams.get("language") || DEEPGRAM_LANGUAGE;
        client.requestedModel = searchParams.get("model") || DEEPGRAM_MODEL;
        wss.emit("connection", client, request);
      });
    }
  });

  wss.on("connection", (client: STTClient) => {
    client.isAlive = true;
    client.audioQueue = [];

    client.on("pong", () => {
      client.isAlive = true;
    });

    const hasMurf = !!MURF_API_KEY.trim();
    const hasDeepgram = !!DEEPGRAM_API_KEY.trim();

    if (!hasMurf && !hasDeepgram) {
      console.error("[STT Gateway] Neither MURF_API_KEY nor DEEPGRAM_API_KEY configured on backend server.");
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "error",
            status: "error",
            message: "STT voice service is not configured on server.",
          })
        );
        client.close(1011, "STT server configuration missing");
      }
      return;
    }

    // Register incoming message and lifecycle handlers synchronously immediately
    // to ensure NO audio chunks or WebM container headers are dropped during setup
    client.on("message", (data: WebSocket.RawData, isBinary: boolean) => {
      const upstream = client.upstreamSocket;

      if (isBinary) {
        const chunk = Buffer.from(data as any);
        if (upstream && upstream.readyState === WebSocket.OPEN) {
          upstream.send(chunk);
        } else {
          // Buffer audio frames while upstream connection is establishing (up to 250 chunks ~50s)
          if (client.audioQueue && client.audioQueue.length < 250) {
            client.audioQueue.push(chunk);
          }
        }
      } else {
        // Control message (e.g. ping, Finalize, or speech pause)
        try {
          const str = data.toString();
          const parsed = JSON.parse(str);

          if (parsed.type === "ping") {
            client.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          } else if (parsed.type === "Finalize" || parsed.type === "finalize") {
            if (upstream && upstream.readyState === WebSocket.OPEN) {
              upstream.send(JSON.stringify({ type: "Finalize" }));
            }
          } else if (upstream && upstream.readyState === WebSocket.OPEN) {
            upstream.send(str);
          }
        } catch {
          if (upstream && upstream.readyState === WebSocket.OPEN) {
            upstream.send(data.toString());
          }
        }
      }
    });

    client.on("close", () => {
      client.audioQueue = [];
      const upstream = client.upstreamSocket;
      if (upstream) {
        try {
          if (upstream.readyState === WebSocket.OPEN) {
            upstream.send(JSON.stringify({ type: client.provider === "murf" ? "Finalize" : "CloseStream" }));
          }
          upstream.close();
        } catch {}
        client.upstreamSocket = null;
      }
    });

    client.on("error", () => {
      const upstream = client.upstreamSocket;
      if (upstream) {
        try {
          upstream.close();
        } catch {}
      }
    });

    function connectUpstream(provider: "murf" | "deepgram") {
      client.provider = provider;
      let upstreamSocket: WebSocket | null = null;

      try {
        if (provider === "murf") {
          // Murf AI Streaming Speech-to-Text WebSocket
          const murfLang = (client.requestedLang || "en-IN").replace("-", "_"); // e.g. en_IN
          const murfUrl = `wss://in.api.murf.ai/v1/transcription/stream-input?api_key=${encodeURIComponent(
            MURF_API_KEY.trim()
          )}&language=${encodeURIComponent(murfLang)}&text_formatting=true`;

          upstreamSocket = new WebSocket(murfUrl, {
            headers: {
              "api-key": MURF_API_KEY.trim(),
            },
          });
        } else {
          // Deepgram Nova-3 streaming WebSocket with keyterm prompting
          const dgModel = DEEPGRAM_MODEL || client.requestedModel || "nova-3";
          const dgLang = DEEPGRAM_LANGUAGE || client.requestedLang || "en-IN";

          const urlObj = new URL("wss://api.deepgram.com/v1/listen");
          urlObj.searchParams.set("model", dgModel);
          urlObj.searchParams.set("language", dgLang);
          urlObj.searchParams.set("smart_format", "true");
          urlObj.searchParams.set("punctuate", "true");
          urlObj.searchParams.set("interim_results", "true");
          urlObj.searchParams.set("no_delay", "true");
          urlObj.searchParams.set("endpointing", "350"); // 350ms pause gives natural interview pacing
          urlObj.searchParams.set("utterance_end_ms", "1000");
          urlObj.searchParams.set("filler_words", "true"); // Preserve "um", "uh", "well" for interview coaching

          // Inject technical keyterms into Nova-3 streaming session
          if (Array.isArray(client.keyterms)) {
            for (const kt of client.keyterms) {
              if (kt && kt.trim()) {
                urlObj.searchParams.append("keyterm", kt.trim());
              }
            }
          }

          upstreamSocket = new WebSocket(urlObj.toString(), {
            headers: {
              Authorization: `Token ${DEEPGRAM_API_KEY.trim()}`,
            },
          });
        }

        client.upstreamSocket = upstreamSocket;
      } catch (err: any) {
        console.error(`[STT Gateway] Error initiating ${provider} connection:`, err.message);
        if (provider === "deepgram" && hasMurf) {
          console.warn("[STT Gateway] Deepgram initialization failed, attempting fallback to Murf...");
          connectUpstream("murf");
          return;
        } else if (provider === "murf" && hasDeepgram) {
          console.warn("[STT Gateway] Murf initialization failed, attempting fallback to Deepgram...");
          connectUpstream("deepgram");
          return;
        }

        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "error",
              status: "error",
              message: `Failed to connect to ${provider} upstream engine.`,
            })
          );
          client.close(1011, `${provider} connection failure`);
        }
        return;
      }

      // Upstream socket open
      upstreamSocket.on("open", () => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "ready",
              status: "listening",
              provider,
              model: provider === "murf" ? "murf-stt" : DEEPGRAM_MODEL,
              language: client.requestedLang,
              participantId: client.participantId,
              username: client.username,
              keytermsCount: client.keyterms?.length || 0,
              message: `${provider === "deepgram" ? "Deepgram Nova-3" : "Murf AI"} real-time speech stream established.`,
            })
          );
        }

        // Flush buffered audio frames accumulated during handshake
        if (client.audioQueue && client.audioQueue.length > 0) {
          for (const chunk of client.audioQueue) {
            if (upstreamSocket && upstreamSocket.readyState === WebSocket.OPEN) {
              upstreamSocket.send(chunk);
            }
          }
          client.audioQueue = [];
        }
      });

      // Upstream socket message
      upstreamSocket.on("message", (data: WebSocket.Data) => {
        if (client.readyState !== WebSocket.OPEN) return;

        try {
          const rawStr = data.toString();
          const parsed = JSON.parse(rawStr);

          let transcriptText = "";
          let isFinal = false;
          let speechFinal = false;
          let confidence = 0.95;
          let words: any[] = [];

          if (client.provider === "murf") {
            transcriptText =
              parsed.transcript ||
              parsed.text ||
              parsed.channel?.alternatives?.[0]?.transcript ||
              "";

            isFinal =
              parsed.type === "final" ||
              parsed.type === "Final" ||
              parsed.event === "EndOfTurn" ||
              parsed.is_final === true;

            speechFinal = isFinal;
            confidence = parsed.confidence ?? (isFinal ? 0.98 : 0.85);
          } else {
            // Deepgram payload normalization with word confidences & speech_final
            const alt = parsed.channel?.alternatives?.[0];
            transcriptText =
              alt?.transcript ||
              parsed.transcript ||
              parsed.text ||
              "";

            isFinal = parsed.is_final === true || parsed.type === "final";
            speechFinal = parsed.speech_final === true;
            confidence = alt?.confidence ?? (isFinal ? 0.98 : 0.85);
            words = alt?.words || [];
          }

          if (transcriptText && transcriptText.trim()) {
            const normalizedPayload = {
              type: isFinal ? "final" : "partial",
              transcript: transcriptText.trim(),
              is_final: isFinal,
              speech_final: speechFinal,
              confidence,
              words,
              start: parsed.start,
              duration: parsed.duration,
              participantId: client.participantId,
              username: client.username,
              timestamp: Date.now(),
              provider: client.provider,
              channel: {
                alternatives: [
                  {
                    transcript: transcriptText.trim(),
                    confidence,
                    words,
                  },
                ],
              },
            };

            client.send(JSON.stringify(normalizedPayload));
          }
        } catch {
          client.send(data.toString());
        }
      });

      // Upstream socket error
      upstreamSocket.on("error", (err: Error) => {
        console.error(`[STT Gateway] ${provider} socket error:`, err.message);

        // Failover between providers if available
        if (provider === "deepgram" && hasMurf && client.readyState === WebSocket.OPEN) {
          console.warn("[STT Gateway] Switching upstream from Deepgram to Murf AI fallback...");
          client.send(
            JSON.stringify({
              type: "status",
              status: "reconnecting",
              message: "Switching to secondary speech recognition engine...",
            })
          );
          try { upstreamSocket?.close(); } catch {}
          connectUpstream("murf");
          return;
        } else if (provider === "murf" && hasDeepgram && client.readyState === WebSocket.OPEN) {
          console.warn("[STT Gateway] Switching upstream from Murf to Deepgram fallback...");
          client.send(
            JSON.stringify({
              type: "status",
              status: "reconnecting",
              message: "Failing over to secondary speech recognition engine...",
            })
          );
          try { upstreamSocket?.close(); } catch {}
          connectUpstream("deepgram");
          return;
        }

        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "error",
              status: "error",
              message: `Upstream ${provider} STT stream error: ${err.message}`,
            })
          );
        }
      });

      // Upstream socket close
      upstreamSocket.on("close", (code, reason) => {
        if (client.readyState === WebSocket.OPEN) {
          client.close(code, reason.toString());
        }
      });
    }

    // Pre-fetch dynamic interview context keyterms and connect upstream
    (async () => {
      try {
        client.keyterms = await getDynamicInterviewKeyterms(client.interviewId);
      } catch {
        client.keyterms = [];
      }
      connectUpstream(hasDeepgram ? "deepgram" : (hasMurf ? "murf" : "deepgram"));
    })();
  });

  // Heartbeat keep-alive check every 30 seconds
  const heartbeatInterval = setInterval(() => {
    for (const client of wss.clients) {
      const sttClient = client as STTClient;
      if (!sttClient.isAlive) {
        if (sttClient.upstreamSocket) {
          try {
            sttClient.upstreamSocket.close();
          } catch {}
        }
        sttClient.terminate();
      } else {
        sttClient.isAlive = false;
        sttClient.ping();
      }
    }
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  console.log("⚡ STT Streaming Gateway attached at /api/v1/interview/stt-stream");
  return wss;
}
