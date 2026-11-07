import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { User } from "../../models/User";
import {
  gdSessionService,
  registerGDRoomBroadcaster,
  registerGDUserBroadcaster,
  DEFAULT_SUGGESTED_DURATION_SEC,
} from "./gdSessionService";

interface GDClient extends WebSocket {
  isAlive?: boolean;
  sessionId?: string;
  participantId?: string;
  participantName?: string;
  username?: string;
  role?: string;
  authenticatedUserId?: string;
}

export function initGDWebSocketServer(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Map of sessionId -> Set of active client WebSockets
  const sessionRooms = new Map<string, Set<GDClient>>();

  // Map of username -> Set of active client WebSockets for real-time personal notifications
  const userSockets = new Map<string, Set<GDClient>>();

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

  function sendToUser(username: string, payload: any) {
    const clean = username.toLowerCase().trim();
    const sockets = userSockets.get(clean);
    if (!sockets) return;
    const message = JSON.stringify(payload);
    for (const client of sockets) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  // Register real-time room broadcaster for instant cross-service events (e.g. invites)
  registerGDRoomBroadcaster((sessionId, payload) => {
    broadcastToEveryoneInRoom(sessionId, payload);
  });

  // Register real-time user broadcaster for direct instant delivery (<50ms)
  registerGDUserBroadcaster((username, payload) => {
    sendToUser(username, payload);
  });

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
   * Enforces the authoritative turn deadline and sends synchronized state to every client.
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
        const turnStartedAt = new Date(session.currentTurn.startedAt).getTime();
        const turnDurationSeconds = session.currentTurn.suggestedDurationSeconds || DEFAULT_SUGGESTED_DURATION_SEC;
        const elapsedSeconds = Math.max(0, Math.floor((now - turnStartedAt) / 1000));
        const turnId = `${session.currentTurn.participantId}:${session.currentTurn.round}:${turnStartedAt}`;

        if (elapsedSeconds >= turnDurationSeconds) {
          const updatedSession = await gdSessionService.handleTurnTimeout(sessionId, turnId);
          broadcastToEveryoneInRoom(sessionId, {
            type: "turn_changed",
            payload: {
              currentTurn: updatedSession?.currentTurn,
              round: updatedSession?.round,
              participants: updatedSession?.participants,
              turnHistory: updatedSession?.turnHistory.slice(-1)[0],
              reason: "time_expired",
            },
          });
          return;
        }

        // Warn all clients 15 seconds before the hard deadline.
        if (elapsedSeconds >= turnDurationSeconds - 15 && !session.currentTurn.warningEmitted) {
          session.currentTurn.warningEmitted = true;
          await session.save();

          broadcastToEveryoneInRoom(sessionId, {
            type: "turn_silence_warning",
            payload: {
              participantId: session.currentTurn.participantId,
              username: session.currentTurn.username,
              secondsRemaining: Math.max(0, turnDurationSeconds - elapsedSeconds),
              message: `15 seconds remain in @${session.currentTurn.username}'s speaking turn.`,
            },
          });
        }
      } catch (err) {
        console.error(`[GD WebSocket] Silence checker error for session ${sessionId}:`, err);
      }
    }, 1000);

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
    const { pathname, searchParams } = new URL(request.url || "", `http://${request.headers.host}`);

    if (pathname === "/api/v1/gd/ws" || pathname === "/ws/gd") {
      let decoded: any;
      try {
        const token = searchParams.get("token");
        if (!token) throw new Error("Missing token");
        decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
      } catch {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const authenticatedUserId = String(decoded.userId || decoded.id || decoded._id || decoded.sub || "");
      if (!authenticatedUserId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        const client = ws as GDClient;
        client.authenticatedUserId = authenticatedUserId;
        wss.emit("connection", client, request);
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

        // Register active user connection for direct real-time invitation pushes
        if (type === "register_user") {
          const user = await User.findById(ws.authenticatedUserId).select("username").lean();
          const cleanUser = (user?.username || "").toLowerCase().trim();
          if (cleanUser) {
            ws.username = cleanUser;
            if (!userSockets.has(cleanUser)) {
              userSockets.set(cleanUser, new Set());
            }
            userSockets.get(cleanUser)!.add(ws);
            ws.send(JSON.stringify({ type: "user_registered", payload: { username: cleanUser } }));
          }
          return;
        }

        if (!sessionId) return;
        if (type !== "join_room" && (!ws.sessionId || ws.sessionId !== sessionId)) {
          ws.send(JSON.stringify({ type: "gd:error", message: "Join this room before sending discussion events." }));
          return;
        }

        switch (type) {
          // -----------------------------------------------------------------
          // 1. Room Connection & Setup
          // -----------------------------------------------------------------
          case "join_room": {
            const session = await gdSessionService.getSessionById(sessionId);
            const cleanUser = (ws.username || payload?.username || "").toLowerCase().trim();
            const participant = session?.participants.find(
              (candidate) =>
                candidate.userId?.toString() === ws.authenticatedUserId ||
                candidate.id === ws.authenticatedUserId ||
                (candidate.username && cleanUser && candidate.username.toLowerCase() === cleanUser) ||
                (payload?.participantId && (candidate.id === payload.participantId || candidate.userId?.toString() === payload.participantId))
            );
            if (!session || !participant) {
              ws.send(JSON.stringify({ type: "gd:error", message: "Authenticated user is not a participant in this room." }));
              ws.close(1008, "Room membership required");
              break;
            }

            ws.sessionId = sessionId;
            ws.participantId = participant.id;
            ws.participantName = participant.name || participant.username || "Participant";
            ws.username = (participant.username || "").toLowerCase().trim();
            ws.role = participant.role;

            if (!sessionRooms.has(sessionId)) {
              sessionRooms.set(sessionId, new Set());
            }
            sessionRooms.get(sessionId)!.add(ws);

            ensureSilenceChecker(sessionId);

            // Fetch latest authoritative room state from database
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

          case "gd:transcript":
          case "transcript_segment": {
            const rawEvent = type === "gd:transcript" ? message : payload;
            const textToSave = rawEvent?.text?.trim() || payload?.text?.trim();
            const isFinal = rawEvent?.isFinal !== false;

            if (textToSave) {
              const roomState = await gdSessionService.getSessionById(sessionId);
              if (
                roomState?.status === "in_progress" &&
                roomState.currentTurn?.participantId !== ws.participantId
              ) {
                ws.send(JSON.stringify({ type: "transcript_rejected", message: "Only the active speaker can submit discussion audio text." }));
                break;
              }
              if (isFinal) {
                const currentSess = roomState;
                // Authenticated participant identity from WebSocket connection
                const senderPartId = ws.participantId || rawEvent.participantId || rawEvent.speakerId || payload?.participantId;
                const senderPartName = ws.participantName || rawEvent.participantName || payload?.participantName || "Candidate";
                const isTurnSpeaker = currentSess?.currentTurn?.participantId === senderPartId;
                const isInterruption = !isTurnSpeaker && currentSess?.status === "in_progress";
                const segDuration = rawEvent.durationSeconds || payload?.durationSeconds || Math.max(2, Math.round(textToSave.split(/\s+/).length / 2.5));

                const updatedSession = await gdSessionService.addTranscriptSegment(
                  sessionId,
                  {
                    id: rawEvent.id || payload?.id || payload?.segmentId,
                    roomId: sessionId,
                    participantId: senderPartId || "candidate",
                    participantName: senderPartName,
                    speakerId: senderPartId || "candidate",
                    username: ws.username || rawEvent.username || payload?.username,
                    text: textToSave,
                    durationSeconds: segDuration,
                    isInterruption: rawEvent.isInterruption ?? payload?.isInterruption ?? isInterruption,
                    language: rawEvent.language || payload?.language || "en",
                    confidence: rawEvent.confidence || payload?.confidence || 1.0,
                    sequenceNumber: rawEvent.sequenceNumber || payload?.sequenceNumber,
                    startTime: rawEvent.startTime,
                    endTime: rawEvent.endTime,
                    turnId: currentSess?.currentTurn ? `${currentSess.currentTurn.participantId}-${currentSess.currentTurn.round}` : undefined,
                  }
                );

                const lastSeg = updatedSession?.transcript.slice(-1)[0];

                // Broadcast standard gd:transcript event to everyone in the room
                broadcastToEveryoneInRoom(sessionId, {
                  type: "gd:transcript",
                  roomId: sessionId,
                  participantId: senderPartId,
                  participantName: senderPartName,
                  speakerId: senderPartId,
                  text: textToSave,
                  isFinal: true,
                  startTime: rawEvent.startTime ?? 0,
                  endTime: rawEvent.endTime ?? segDuration,
                  timestamp: Date.now(),
                  durationSeconds: segDuration,
                });

                // Backward-compatible event
                broadcastToEveryoneInRoom(sessionId, {
                  type: "new_transcript_segment",
                  payload: {
                    segment: lastSeg,
                    participants: updatedSession?.participants,
                    currentTurn: updatedSession?.currentTurn,
                  },
                });
              } else {
                // Interim broadcast from participant
                const senderPartId = ws.participantId || rawEvent.participantId || rawEvent.speakerId;
                const senderPartName = ws.participantName || rawEvent.participantName || "Candidate";

                broadcastToEveryoneInRoom(sessionId, {
                  type: "gd:transcript",
                  roomId: sessionId,
                  participantId: senderPartId,
                  participantName: senderPartName,
                  speakerId: senderPartId,
                  text: textToSave,
                  isFinal: false,
                  startTime: rawEvent.startTime ?? 0,
                  endTime: rawEvent.endTime,
                  timestamp: Date.now(),
                });

                broadcastToRoom(
                  sessionId,
                  {
                    type: "participant_interim_transcript",
                    payload: {
                      participantId: senderPartId,
                      username: ws.username,
                      participantName: senderPartName,
                      text: textToSave,
                    },
                  },
                  ws
                );
              }
            }
            break;
          }

          case "interim_transcript": {
            if (payload?.text !== undefined) {
              const roomState = await gdSessionService.getSessionById(sessionId);
              if (
                roomState?.status === "in_progress" &&
                roomState.currentTurn?.participantId !== ws.participantId
              ) {
                ws.send(JSON.stringify({ type: "transcript_rejected", message: "Only the active speaker can submit discussion audio text." }));
                break;
              }
              const senderPartId = ws.participantId || payload.participantId;
              const senderPartName = ws.participantName || payload.participantName || "Candidate";

              // Emit standard gd:transcript interim event
              broadcastToEveryoneInRoom(sessionId, {
                type: "gd:transcript",
                roomId: sessionId,
                participantId: senderPartId,
                participantName: senderPartName,
                speakerId: senderPartId,
                text: payload.text,
                isFinal: false,
                startTime: 0,
                timestamp: Date.now(),
              });

              broadcastToRoom(
                sessionId,
                {
                  type: "participant_interim_transcript",
                  payload: {
                    participantId: senderPartId,
                    username: ws.username,
                    participantName: senderPartName,
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
            try {
              const callerId = ws.participantId || payload?.participantId || ws.authenticatedUserId || "";
              const updated = await gdSessionService.finishTurn(
                sessionId,
                callerId,
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
                  turnHistory: updated?.turnHistory?.slice(-1)[0],
                },
              });
            } catch (err: any) {
              console.warn(`[GD WebSocket] finish_turn error:`, err.message);
              try {
                ws.send(JSON.stringify({ type: "turn_error", message: err.message }));
              } catch {}
            }
            break;
          }

          case "pass_turn": {
            try {
              const callerId = ws.participantId || payload?.participantId || ws.authenticatedUserId || "";
              const updated = await gdSessionService.passTurn(sessionId, callerId);

              broadcastToEveryoneInRoom(sessionId, {
                type: "turn_changed",
                payload: {
                  reason: "student_passed",
                  previousSpeaker: ws.username,
                  currentTurn: updated?.currentTurn,
                  round: updated?.round,
                  participants: updated?.participants,
                  turnHistory: updated?.turnHistory?.slice(-1)[0],
                },
              });
            } catch (err: any) {
              console.warn(`[GD WebSocket] pass_turn error:`, err.message);
              try {
                ws.send(JSON.stringify({ type: "turn_error", message: err.message }));
              } catch {}
            }
            break;
          }

          case "skip_turn": {
            try {
              const callerId = payload?.participantId || ws.participantId || ws.authenticatedUserId || "";
              const updated = await gdSessionService.skipTurnByAdmin(sessionId, callerId);

              broadcastToEveryoneInRoom(sessionId, {
                type: "turn_changed",
                payload: {
                  reason: "admin_skipped",
                  currentTurn: updated?.currentTurn,
                  round: updated?.round,
                  participants: updated?.participants,
                  turnHistory: updated?.turnHistory?.slice(-1)[0],
                },
              });
            } catch (err: any) {
              console.warn(`[GD WebSocket] skip_turn error:`, err.message);
              try {
                ws.send(JSON.stringify({ type: "turn_error", message: err.message }));
              } catch {}
            }
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
      // Clean up user-level socket registration
      if (ws.username && userSockets.has(ws.username)) {
        userSockets.get(ws.username)!.delete(ws);
        if (userSockets.get(ws.username)!.size === 0) {
          userSockets.delete(ws.username);
        }
      }

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
