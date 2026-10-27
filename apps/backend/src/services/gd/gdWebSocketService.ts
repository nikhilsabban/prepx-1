import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { gdSessionService, DEFAULT_SILENCE_WARNING_SEC, DEFAULT_SILENCE_TIMEOUT_SEC } from "./gdSessionService";

interface GDClient extends WebSocket {
  isAlive?: boolean;
  sessionId?: string;
  participantId?: string;
  participantName?: string;
  username?: string;
  role?: string;
}

export function initGDWebSocketServer(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Map of sessionId -> Set of active client WebSockets
  const sessionRooms = new Map<string, Set<GDClient>>();

  // Active room silence checker intervals: sessionId -> NodeJS.Timeout
  const silenceCheckers = new Map<string, NodeJS.Timeout>();

  function broadcastToRoom(sessionId: string, payload: any, sender?: GDClient) {
    const room = sessionRooms.get(sessionId);
    if (!room) return;

    const message = JSON.stringify(payload);
    for (const client of room) {
      if (client.readyState === WebSocket.OPEN && client !== sender) {
        client.send(message);
      }
    }
  }

  function broadcastToEveryoneInRoom(sessionId: string, payload: any) {
    const room = sessionRooms.get(sessionId);
    if (!room) return;

    const message = JSON.stringify(payload);
    for (const client of room) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  function sendToSpecificClient(sessionId: string, targetParticipantId: string, payload: any) {
    const room = sessionRooms.get(sessionId);
    if (!room) return;

    const message = JSON.stringify(payload);
    for (const client of room) {
      if (client.readyState === WebSocket.OPEN && client.participantId === targetParticipantId) {
        client.send(message);
        break;
      }
    }
  }

  /**
   * Starts a background silence monitor interval for a live GD session.
   * Checks every 3 seconds whether the current speaker has been silent for 90s (warning) or 120s (auto-pass).
   */
  function ensureSilenceChecker(sessionId: string) {
    if (silenceCheckers.has(sessionId)) return;

    const interval = setInterval(async () => {
      try {
        const session = await gdSessionService.getSessionById(sessionId);
        if (!session || session.status !== "in_progress" || !session.currentTurn) {
          return;
        }

        const now = Date.now();
        const lastSpoke = new Date(session.currentTurn.lastSpokeAt || session.currentTurn.startedAt).getTime();
        const inactiveSeconds = Math.round((now - lastSpoke) / 1000);

        // Warning at 90s of inactivity
        if (inactiveSeconds >= DEFAULT_SILENCE_WARNING_SEC && !session.currentTurn.warningEmitted) {
          session.currentTurn.warningEmitted = true;
          await session.save();

          broadcastToEveryoneInRoom(sessionId, {
            type: "turn_silence_warning",
            payload: {
              participantId: session.currentTurn.participantId,
              username: session.currentTurn.username,
              secondsInactive: inactiveSeconds,
              secondsRemaining: Math.max(0, DEFAULT_SILENCE_TIMEOUT_SEC - inactiveSeconds),
              message: `Turn warning: No speech detected from @${session.currentTurn.username} for ${inactiveSeconds}s. Turn will be passed in ${DEFAULT_SILENCE_TIMEOUT_SEC - inactiveSeconds}s.`,
            },
          });
        }

        // Auto pass at 120s of silence
        if (inactiveSeconds >= DEFAULT_SILENCE_TIMEOUT_SEC) {
          console.log(`[GD WebSocket] Silence timeout reached (120s) for speaker @${session.currentTurn.username} in room ${sessionId}. Auto-passing turn.`);
          const updatedSession = await gdSessionService.handleSilenceTimeout(sessionId);

          broadcastToEveryoneInRoom(sessionId, {
            type: "turn_silence_timeout",
            payload: {
              previousSpeaker: session.currentTurn.username,
              currentTurn: updatedSession?.currentTurn,
              round: updatedSession?.round,
              participants: updatedSession?.participants,
              turnHistory: updatedSession?.turnHistory.slice(-1)[0],
            },
          });
        }
      } catch (err) {
        console.error(`[GD WebSocket] Silence checker error for session ${sessionId}:`, err);
      }
    }, 3000);

    silenceCheckers.set(sessionId, interval);
  }

  function stopSilenceChecker(sessionId: string) {
    const interval = silenceCheckers.get(sessionId);
    if (interval) {
      clearInterval(interval);
      silenceCheckers.delete(sessionId);
    }
  }

  // Handle HTTP upgrade for /api/v1/gd/ws
  server.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url || "", `http://${request.headers.host}`);

    if (pathname === "/api/v1/gd/ws" || pathname === "/ws/gd") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: GDClient) => {
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (data: Buffer | string) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, sessionId, payload } = message;

        if (!sessionId) return;

        switch (type) {
          // -----------------------------------------------------------------
          // 1. Room Connection & Setup
          // -----------------------------------------------------------------
          case "join_room": {
            ws.sessionId = sessionId;
            ws.participantId = payload?.participantId;
            ws.participantName = payload?.participantName || payload?.name || "Participant";
            ws.username = (payload?.username || "").toLowerCase().trim();
            ws.role = payload?.role || "student";

            if (!sessionRooms.has(sessionId)) {
              sessionRooms.set(sessionId, new Set());
            }
            sessionRooms.get(sessionId)!.add(ws);

            ensureSilenceChecker(sessionId);

            // Fetch latest authoritative room state from database
            const session = await gdSessionService.getSessionById(sessionId);

            // Send full room state ack back to newly joined client
            ws.send(
              JSON.stringify({
                type: "joined_room_ack",
                payload: {
                  sessionId,
                  status: session?.status || "preparing",
                  expectedLanguage: session?.expectedLanguage || "English",
                  topic: session?.topic,
                  adminId: session?.adminId,
                  adminUsername: session?.adminUsername,
                  participants: session?.participants || [],
                  currentTurn: session?.currentTurn,
                  round: session?.round || 1,
                  transcript: session?.transcript || [],
                },
              })
            );

            // Notify all other peers in the room
            broadcastToRoom(
              sessionId,
              {
                type: "participant_joined",
                payload: {
                  participantId: ws.participantId,
                  participantName: ws.participantName,
                  username: ws.username,
                  role: ws.role,
                  isAudioMuted: payload?.isAudioMuted || false,
                  isVideoMuted: payload?.isVideoMuted || false,
                  participants: session?.participants,
                },
              },
              ws
            );
            break;
          }

          // -----------------------------------------------------------------
          // 2. WebRTC Peer-to-Peer Mesh Signaling
          // -----------------------------------------------------------------
          case "webrtc_offer": {
            if (payload?.toParticipantId) {
              sendToSpecificClient(sessionId, payload.toParticipantId, {
                type: "webrtc_offer",
                payload: {
                  fromParticipantId: ws.participantId,
                  fromUsername: ws.username,
                  offer: payload.offer,
                },
              });
            }
            break;
          }

          case "webrtc_answer": {
            if (payload?.toParticipantId) {
              sendToSpecificClient(sessionId, payload.toParticipantId, {
                type: "webrtc_answer",
                payload: {
                  fromParticipantId: ws.participantId,
                  fromUsername: ws.username,
                  answer: payload.answer,
                },
              });
            }
            break;
          }

          case "webrtc_ice_candidate": {
            if (payload?.toParticipantId) {
              sendToSpecificClient(sessionId, payload.toParticipantId, {
                type: "webrtc_ice_candidate",
                payload: {
                  fromParticipantId: ws.participantId,
                  fromUsername: ws.username,
                  candidate: payload.candidate,
                },
              });
            }
            break;
          }

          case "media_state_change": {
            broadcastToRoom(
              sessionId,
              {
                type: "media_state_change",
                payload: {
                  participantId: ws.participantId,
                  isAudioMuted: payload?.isAudioMuted,
                  isVideoMuted: payload?.isVideoMuted,
                },
              },
              ws
            );
            break;
          }

          // -----------------------------------------------------------------
          // 3. Speaking Activity & Transcription Attribution
          // -----------------------------------------------------------------
          case "speech_activity": {
            // Emitted by client voice-activity-detector (speaking started or stopped)
            broadcastToRoom(
              sessionId,
              {
                type: payload?.isSpeaking ? "participant_started_speaking" : "participant_stopped_speaking",
                payload: {
                  participantId: ws.participantId,
                  username: ws.username,
                },
              },
              ws
            );

            // Reset inactivity on speaking activity
            if (payload?.isSpeaking) {
              const session = await gdSessionService.getSessionById(sessionId);
              if (session?.currentTurn && session.currentTurn.participantId === ws.participantId) {
                session.currentTurn.lastSpokeAt = new Date();
                session.currentTurn.warningEmitted = false;
                await session.save();
              }
            }
            break;
          }

          case "transcript_segment": {
            if (payload?.text && payload.text.trim()) {
              const updatedSession = await gdSessionService.addTranscriptSegment(
                sessionId,
                {
                  participantId: payload.participantId || ws.participantId || "candidate",
                  participantName: payload.participantName || ws.participantName || "Candidate",
                  username: payload.username || ws.username,
                  text: payload.text,
                  durationSeconds: payload.durationSeconds || 4,
                  isInterruption: payload.isInterruption || false,
                  language: payload.language || "en",
                  confidence: payload.confidence || 1.0,
                }
              );

              const lastSeg = updatedSession?.transcript.slice(-1)[0];

              broadcastToEveryoneInRoom(sessionId, {
                type: "new_transcript_segment",
                payload: {
                  segment: lastSeg,
                  participants: updatedSession?.participants,
                  currentTurn: updatedSession?.currentTurn,
                },
              });
            }
            break;
          }

          case "interim_transcript": {
            if (payload?.text !== undefined) {
              broadcastToRoom(
                sessionId,
                {
                  type: "participant_interim_transcript",
                  payload: {
                    participantId: ws.participantId,
                    username: ws.username,
                    participantName: ws.participantName,
                    text: payload.text,
                  },
                },
                ws
              );
            }
            break;
          }

          // -----------------------------------------------------------------
          // 4. Fair Turn Management Controls
          // -----------------------------------------------------------------
          case "start_discussion": {
            const started = await gdSessionService.startDiscussion(sessionId, ws.participantId || "");
            broadcastToEveryoneInRoom(sessionId, {
              type: "discussion_started",
              payload: {
                status: started.status,
                startedAt: started.startedAt,
                currentTurn: started.currentTurn,
                round: started.round,
                participants: started.participants,
              },
            });
            break;
          }

          case "finish_turn": {
            const updated = await gdSessionService.finishTurn(
              sessionId,
              ws.participantId || "",
              payload?.wordsSpoken || 0
            );

            broadcastToEveryoneInRoom(sessionId, {
              type: "turn_changed",
              payload: {
                reason: "student_finished",
                previousSpeaker: ws.username,
                currentTurn: updated?.currentTurn,
                round: updated?.round,
                participants: updated?.participants,
                turnHistory: updated?.turnHistory.slice(-1)[0],
              },
            });
            break;
          }

          case "pass_turn": {
            const updated = await gdSessionService.passTurn(sessionId, ws.participantId || "");

            broadcastToEveryoneInRoom(sessionId, {
              type: "turn_changed",
              payload: {
                reason: "student_passed",
                previousSpeaker: ws.username,
                currentTurn: updated?.currentTurn,
                round: updated?.round,
                participants: updated?.participants,
                turnHistory: updated?.turnHistory.slice(-1)[0],
              },
            });
            break;
          }

          case "skip_turn": {
            const updated = await gdSessionService.skipTurnByAdmin(sessionId, ws.participantId || "");

            broadcastToEveryoneInRoom(sessionId, {
              type: "turn_changed",
              payload: {
                reason: "admin_skipped",
                currentTurn: updated?.currentTurn,
                round: updated?.round,
                participants: updated?.participants,
                turnHistory: updated?.turnHistory.slice(-1)[0],
              },
            });
            break;
          }

          // -----------------------------------------------------------------
          // 5. Admin Moderation & Session Conclusion
          // -----------------------------------------------------------------
          case "end_session": {
            stopSilenceChecker(sessionId);

            broadcastToEveryoneInRoom(sessionId, {
              type: "evaluating_session",
              payload: { message: "Discussion concluded by moderator. Generating placement evaluations..." },
            });

            const completedSession = await gdSessionService.endSession(sessionId, ws.participantId);

            broadcastToEveryoneInRoom(sessionId, {
              type: "session_ended",
              payload: {
                sessionId,
                status: "completed",
                evaluations: completedSession?.evaluations,
                evaluation: completedSession?.evaluation,
                metrics: completedSession?.metrics,
                participants: completedSession?.participants,
              },
            });
            break;
          }

          default:
            break;
        }
      } catch (err: any) {
        console.error("[GD WebSocket] Message handling error:", err?.message || err);
      }
    });

    ws.on("close", async () => {
      if (ws.sessionId) {
        const sessionId = ws.sessionId;
        const participantId = ws.participantId;

        if (sessionRooms.has(sessionId)) {
          sessionRooms.get(sessionId)!.delete(ws);
          if (sessionRooms.get(sessionId)!.size === 0) {
            sessionRooms.delete(sessionId);
            stopSilenceChecker(sessionId);
          }
        }

        if (participantId) {
          try {
            const updatedSession = await gdSessionService.handleParticipantDisconnect(sessionId, participantId);
            broadcastToRoom(sessionId, {
              type: "participant_left",
              payload: {
                participantId,
                username: ws.username,
                currentTurn: updatedSession?.currentTurn,
                participants: updatedSession?.participants,
              },
            });
          } catch (e) {
            console.error("[GD WebSocket] Disconnect handling error:", e);
          }
        }
      }
    });
  });

  // Heartbeat keep-alive check every 30 seconds
  const heartbeatInterval = setInterval(() => {
    for (const client of wss.clients) {
      const gdClient = client as GDClient;
      if (!gdClient.isAlive) {
        gdClient.terminate();
      } else {
        gdClient.isAlive = false;
        gdClient.ping();
      }
    }
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  console.log("⚡ GD Real-time WebRTC & Turn WebSocket Gateway attached at /api/v1/gd/ws");
  return wss;
}
