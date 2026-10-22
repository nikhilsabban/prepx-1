import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Play,
  SkipForward,
  CheckCircle2,
  Clock,
  Users,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Shield,
  Search,
  X,
  Plus,
  Radio,
  ExternalLink,
  ChevronRight,
  Send,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  fetchGDSession,
  joinGDRoom,
  startDiscussion,
  finishTurn,
  passTurn,
  skipTurn,
  submitTranscriptSegment,
  endGDSession,
  inviteParticipant,
  searchUsersByUsername,
  type IGDSession,
  type IGDParticipant,
  type IGDTranscriptSegment,
  type IGDCurrentTurn,
} from "../../services/gdService";
import { toast } from "react-toastify";
import { getErrorMessage } from "../../lib/utils";
import { BACKEND_URL } from "../../lib/config";

// Public STUN server configuration for WebRTC peer-to-peer mesh
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function GDRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<IGDSession | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<IGDParticipant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [activeTab, setActiveTab] = useState<"transcript" | "participants">("transcript");

  // Media streams & Controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [speakingPeers, setSpeakingPeers] = useState<Record<string, boolean>>({});

  // Silence alert & timers
  const [silenceWarning, setSilenceWarning] = useState<string | null>(null);
  const [turnElapsedSeconds, setTurnElapsedSeconds] = useState(0);

  // Moderator Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [manualText, setManualText] = useState("");
  const [isSendingText, setIsSendingText] = useState(false);
  const [liveTranscriptPreview, setLiveTranscriptPreview] = useState("");

  // Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  // Stale-closure protection refs for real-time WebRTC and speech recognition
  const currentParticipantRef = useRef<IGDParticipant | null>(null);
  const sessionRef = useRef<IGDSession | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isMicOnRef = useRef<boolean>(true);
  const isVideoOnRef = useRef<boolean>(true);
  const isSpeechActiveRef = useRef<boolean>(false);
  const speechRestartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs synchronized with React state
  useEffect(() => {
    currentParticipantRef.current = currentParticipant;
  }, [currentParticipant]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);

  useEffect(() => {
    isVideoOnRef.current = isVideoOn;
  }, [isVideoOn]);

  // Reactive effect to bind local camera stream to the video element whenever DOM mounts or stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream && isVideoOn) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((e) => {
        console.warn("Local video play warning:", e);
      });
    }
  }, [localStream, isVideoOn]);

  // Current logged in user ID and role
  const isAdmin = session && currentParticipant ? session.adminId === currentParticipant.id || session.adminUsername === currentParticipant.username : false;
  const isMyTurn = session?.currentTurn && currentParticipant ? session.currentTurn.participantId === currentParticipant.id : false;

  // 1. Initialize Room & Join via backend
  useEffect(() => {
    if (!sessionId) return;
    initializeRoom();
    return () => {
      cleanupResources();
    };
  }, [sessionId]);

  async function initializeRoom() {
    try {
      // Join room in backend (enforces accepted invitation and 5 student cap)
      const joinRes = await joinGDRoom(sessionId!);
      setSession(joinRes.session);
      setCurrentParticipant(joinRes.participant);
      currentParticipantRef.current = joinRes.participant;
      sessionRef.current = joinRes.session;

      // Initialize local media (Camera & Mic) with resilient fallback
      await initLocalMedia();

      // Connect WebSocket for WebRTC signaling and real-time state
      initWebSocket(joinRes.participant, joinRes.session);
    } catch (err: any) {
      console.error("Failed to join GD room:", err);
      toast.error(getErrorMessage(err, "Unable to join the group discussion room. Please try again."));
      navigate("/group-discussion");
    } finally {
      setLoading(false);
    }
  }

  // 2. Resilient Camera & Mic MediaStream initialization
  async function initLocalMedia() {
    let stream: MediaStream | null = null;
    let hasAudio = false;
    let hasVideo = false;

    // First attempt: Request both audio and video with ideal parameters
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
      });
      hasAudio = stream.getAudioTracks().length > 0;
      hasVideo = stream.getVideoTracks().length > 0;
    } catch (errCombined: any) {
      console.warn("Combined getUserMedia failed, attempting separate device fallback...", errCombined);

      const tracks: MediaStreamTrack[] = [];

      // Attempt video fallback independently
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const vTrack = vStream.getVideoTracks()[0];
        if (vTrack) {
          tracks.push(vTrack);
          hasVideo = true;
        }
      } catch (e) {
        console.warn("Video-only fallback failed:", e);
      }

      // Attempt audio fallback independently
      try {
        const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const aTrack = aStream.getAudioTracks()[0];
        if (aTrack) {
          tracks.push(aTrack);
          hasAudio = true;
        }
      } catch (e) {
        console.warn("Audio-only fallback failed:", e);
      }

      if (tracks.length > 0) {
        stream = new MediaStream(tracks);
      }
    }

    if (stream) {
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoOn(hasVideo);
      setIsMicOn(hasAudio);
      isVideoOnRef.current = hasVideo;
      isMicOnRef.current = hasAudio;
      setMediaError(null);

      // Attach stream to local video preview
      if (localVideoRef.current && hasVideo) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      // Start local voice activity detection (VAD) and speech recognition
      if (hasAudio) {
        startVoiceActivityDetection(stream);
        startSpeechRecognition();
      }

      if (!hasVideo && hasAudio) {
        toast.info("Microphone connected (Camera is unavailable or disabled)");
      } else if (hasVideo && !hasAudio) {
        toast.warn("Camera connected (Microphone is unavailable or disabled)");
      } else {
        toast.success("Camera and microphone connected successfully!");
      }
    } else {
      setMediaError("Camera or microphone permission was denied. Click 'Retry Permissions' or allow access in your browser address bar.");
      setIsVideoOn(false);
      setIsMicOn(false);
      isVideoOnRef.current = false;
      isMicOnRef.current = false;
    }
  }

  // 3. Audio Activity Detection (VAD) via Web Audio API
  function startVoiceActivityDetection(stream: MediaStream) {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]!;
        }
        const average = sum / dataArray.length;
        const isSpeakingNow = average > 18 && isMicOnRef.current;

        if (isSpeakingNow !== wasSpeaking) {
          wasSpeaking = isSpeakingNow;
          const participant = currentParticipantRef.current;
          // Notify WebSocket of speaking activity
          if (wsRef.current?.readyState === WebSocket.OPEN && participant) {
            wsRef.current.send(
              JSON.stringify({
                type: "speech_activity",
                sessionId,
                payload: { isSpeaking: isSpeakingNow },
              })
            );
          }
          if (participant) {
            setSpeakingPeers((prev) => ({ ...prev, [participant.id]: isSpeakingNow }));
          }
        }
        requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn("VAD setup error:", e);
    }
  }

  // Resilient transcript dispatcher: sends via WebSocket if connected, otherwise submits via REST API and updates local state optimistically
  async function dispatchTranscriptSegment(text: string, durationSeconds?: number) {
    const textToSubmit = text.trim();
    if (!textToSubmit || !sessionId) return;

    const participant = currentParticipantRef.current || currentParticipant;
    if (!participant) return;

    const calculatedDuration = durationSeconds || Math.max(2, Math.round(textToSubmit.split(/\s+/).filter(Boolean).length / 2.5));
    const language = sessionRef.current?.expectedLanguage || "en";

    const payload = {
      participantId: participant.id,
      participantName: participant.name,
      username: participant.username,
      text: textToSubmit,
      durationSeconds: calculatedDuration,
      language,
    };

    let sentViaWs = false;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            type: "transcript_segment",
            sessionId,
            payload,
          })
        );
        sentViaWs = true;
      } catch (wsErr) {
        console.warn("WebSocket send transcript segment error, falling back to REST:", wsErr);
      }
    }

    // If WebSocket is not open or sending threw an error, fall back to REST endpoint immediately
    if (!sentViaWs) {
      try {
        const res = await submitTranscriptSegment(sessionId, payload);
        if (res?.lastSegment) {
          setSession((prev) => {
            if (!prev) return prev;
            const exists = prev.transcript.some(
              (s) => s.id === res.lastSegment.id || (s.text === res.lastSegment.text && Math.abs(new Date(s.timestamp || "").getTime() - new Date(res.lastSegment.timestamp || "").getTime()) < 3000)
            );
            if (exists) return prev;
            return {
              ...prev,
              transcript: [...prev.transcript, res.lastSegment],
              participants: res.participants || prev.participants,
            };
          });
        }
      } catch (err: any) {
        console.warn("Failed to record transcript segment via REST:", err);
      }
    }
  }

  // 4. Speech Recognition (Web Speech API) for real-time attributed transcript
  function startSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser. Use manual contribution input.");
      return;
    }

    try {
      if (speechRestartTimeoutRef.current) {
        clearTimeout(speechRestartTimeoutRef.current);
        speechRestartTimeoutRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const expectedLang = (sessionRef.current?.expectedLanguage || "").toLowerCase();
      recognition.lang = expectedLang.includes("hindi") ? "hi-IN" : "en-US";

      recognition.onstart = () => {
        isSpeechActiveRef.current = true;
      };

      let accumulatedFinalText = "";
      let latestInterimText = "";
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const flushTranscript = () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }

        const candidateText = (accumulatedFinalText.trim() || latestInterimText.trim());
        if (candidateText.length >= 2) {
          accumulatedFinalText = "";
          latestInterimText = "";
          setLiveTranscriptPreview("");
          dispatchTranscriptSegment(candidateText);
        } else {
          setLiveTranscriptPreview("");
        }
      };

      recognition.onresult = (event: any) => {
        if (!isMicOnRef.current) return;

        let newFinalChunk = "";
        let newInterimChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (!item || !item[0]) continue;
          const transcriptStr = item[0].transcript || "";
          if (item.isFinal) {
            newFinalChunk += " " + transcriptStr;
          } else {
            newInterimChunk += " " + transcriptStr;
          }
        }

        if (newFinalChunk.trim()) {
          accumulatedFinalText += " " + newFinalChunk.trim();
        }
        if (newInterimChunk.trim()) {
          latestInterimText = newInterimChunk.trim();
          setLiveTranscriptPreview(latestInterimText);
        }

        if (debounceTimer) clearTimeout(debounceTimer);

        // If user finished a substantive phrase or sentence, flush quickly
        if (accumulatedFinalText.trim().length >= 8) {
          flushTranscript();
        } else {
          // Pause debounce: if user speaks and pauses, commit candidate text
          debounceTimer = setTimeout(flushTranscript, 1200);
        }
      };

      let hasFatalPermissionError = false;

      recognition.onerror = (err: any) => {
        if (err.error === "no-speech" || err.error === "aborted") {
          return;
        }

        if (err.error === "network") {
          console.warn("Speech recognition network notice (Cloud speech recognition unavailable). Manual input is active.");
          return;
        }

        if (err.error === "not-allowed" || err.error === "service-not-allowed") {
          hasFatalPermissionError = true;
          console.warn("Speech recognition microphone permission denied by browser.");
          return;
        }

        console.warn("Speech recognition notice:", err.error);
      };

      recognition.onend = () => {
        isSpeechActiveRef.current = false;
        flushTranscript();

        if (hasFatalPermissionError || !isMicOnRef.current) return;

        // Clean cross-browser restart with 600ms backoff
        if (speechRestartTimeoutRef.current) {
          clearTimeout(speechRestartTimeoutRef.current);
        }
        speechRestartTimeoutRef.current = setTimeout(() => {
          if (isMicOnRef.current && !isSpeechActiveRef.current) {
            startSpeechRecognition();
          }
        }, 600);
      };

      try {
        recognition.start();
      } catch (startErr) {
        console.warn("Speech recognition start warning:", startErr);
      }

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("Speech recognition initialization error:", e);
    }
  }

  // 5. WebSocket Connection & WebRTC Signaling
  function initWebSocket(participant: IGDParticipant, currentSession: IGDSession) {
    let wsUrl: string;
    if (BACKEND_URL && BACKEND_URL.startsWith("http")) {
      const parsed = new URL(BACKEND_URL);
      const wsProtocol = parsed.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${wsProtocol}//${parsed.host}/api/v1/gd/ws`;
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host.includes("localhost") ? "localhost:3003" : window.location.host;
      wsUrl = `${protocol}//${host}/api/v1/gd/ws`;
    }

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onerror = (e) => {
      console.warn("GD WebSocket notice. HTTP fallback polling is active:", e);
    };

    socket.onclose = () => {
      console.warn("GD WebSocket closed. HTTP fallback polling is active.");
    };

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "join_room",
          sessionId,
          payload: {
            participantId: participant.id,
            participantName: participant.name,
            username: participant.username,
            role: participant.role,
            isAudioMuted: !isMicOn,
            isVideoMuted: !isVideoOn,
          },
        })
      );
    };

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        switch (type) {
          case "joined_room_ack": {
            setSession((prev) => (prev ? { ...prev, ...payload } : prev));
            // Connect to existing peers via WebRTC offers
            if (payload?.participants) {
              for (const p of payload.participants) {
                if (p.id !== participant.id && p.isOnline) {
                  createPeerConnection(p.id, true);
                }
              }
            }
            break;
          }

          case "participant_joined": {
            toast.info(`@${payload.username || payload.participantName} joined the room`);
            setSession((prev) => {
              if (!prev) return prev;
              const exists = prev.participants.some((p) => p.id === payload.participantId);
              return {
                ...prev,
                participants: exists ? prev.participants : [...prev.participants, payload],
              };
            });
            // The joining participant receives offers, or existing peer creates offer
            createPeerConnection(payload.participantId, true);
            break;
          }

          case "webrtc_offer": {
            await handleWebRTCOffer(payload.fromParticipantId, payload.offer);
            break;
          }

          case "webrtc_answer": {
            await handleWebRTCAnswer(payload.fromParticipantId, payload.answer);
            break;
          }

          case "webrtc_ice_candidate": {
            await handleWebRTCIceCandidate(payload.fromParticipantId, payload.candidate);
            break;
          }

          case "media_state_change": {
            setSession((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                participants: prev.participants.map((p) =>
                  p.id === payload.participantId
                    ? { ...p, isAudioMuted: payload.isAudioMuted, isVideoMuted: payload.isVideoMuted }
                    : p
                ),
              };
            });
            break;
          }

          case "participant_started_speaking": {
            setSpeakingPeers((prev) => ({ ...prev, [payload.participantId]: true }));
            break;
          }

          case "participant_stopped_speaking": {
            setSpeakingPeers((prev) => ({ ...prev, [payload.participantId]: false }));
            break;
          }

          case "new_transcript_segment": {
            setSession((prev) => {
              if (!prev || !payload.segment) return prev;
              const exists = prev.transcript.some(
                (s) => s.id === payload.segment.id || (s.text === payload.segment.text && Math.abs(new Date(s.timestamp || "").getTime() - new Date(payload.segment.timestamp || "").getTime()) < 3000)
              );
              return {
                ...prev,
                transcript: exists ? prev.transcript : [...prev.transcript, payload.segment],
                participants: payload.participants || prev.participants,
                currentTurn: payload.currentTurn || prev.currentTurn,
              };
            });
            setSilenceWarning(null);
            break;
          }

          case "discussion_started": {
            toast.success("Group discussion has officially begun!");
            setSession((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                status: "in_progress",
                currentTurn: payload.currentTurn,
                round: payload.round,
                participants: payload.participants,
              };
            });
            break;
          }

          case "turn_changed": {
            setSilenceWarning(null);
            setTurnElapsedSeconds(0);
            toast.info(`Next Turn: @${payload.currentTurn?.username || "Participant"} (Round ${payload.round})`);
            setSession((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                currentTurn: payload.currentTurn,
                round: payload.round,
                participants: payload.participants || prev.participants,
              };
            });
            break;
          }

          case "turn_silence_warning": {
            setSilenceWarning(payload.message);
            toast.warn(payload.message);
            break;
          }

          case "turn_silence_timeout": {
            setSilenceWarning(null);
            toast.error(`Turn timed out due to silence. Passed to next student.`);
            setSession((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                currentTurn: payload.currentTurn,
                round: payload.round,
                participants: payload.participants || prev.participants,
              };
            });
            break;
          }

          case "participant_left": {
            setSession((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                participants: prev.participants.map((p) =>
                  p.id === payload.participantId ? { ...p, isOnline: false } : p
                ),
                currentTurn: payload.currentTurn || prev.currentTurn,
              };
            });
            closePeerConnection(payload.participantId);
            break;
          }

          case "evaluating_session": {
            toast.info(payload.message || "Generating placement evaluations...");
            break;
          }

          case "session_ended": {
            toast.success("Discussion concluded! Navigating to Results & Leaderboard...");
            navigate(`/group-discussion/result/${sessionId}`);
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    };
  }

  // 6. WebRTC Peer Connection Management
  function createPeerConnection(peerId: string, isInitiator: boolean): RTCPeerConnection {
    if (peerConnectionsRef.current[peerId]) {
      return peerConnectionsRef.current[peerId]!;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current[peerId] = pc;

    // Add local tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "webrtc_ice_candidate",
            sessionId,
            payload: {
              toParticipantId: peerId,
              candidate: event.candidate,
            },
          })
        );
      }
    };

    // Remote track received
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
      }
    };

    // Negotiation if initiator
    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: "webrtc_offer",
                sessionId,
                payload: {
                  toParticipantId: peerId,
                  offer,
                },
              })
            );
          }
        } catch (e) {
          console.warn("Offer error:", e);
        }
      };
    }

    return pc;
  }

  async function handleWebRTCOffer(fromPeerId: string, offer: RTCSessionDescriptionInit) {
    const pc = createPeerConnection(fromPeerId, false);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "webrtc_answer",
          sessionId,
          payload: {
            toParticipantId: fromPeerId,
            answer,
          },
        })
      );
    }
  }

  async function handleWebRTCAnswer(fromPeerId: string, answer: RTCSessionDescriptionInit) {
    const pc = peerConnectionsRef.current[fromPeerId];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async function handleWebRTCIceCandidate(fromPeerId: string, candidate: RTCIceCandidateInit) {
    const pc = peerConnectionsRef.current[fromPeerId];
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("Add ICE candidate error:", e);
      }
    }
  }

  function closePeerConnection(peerId: string) {
    const pc = peerConnectionsRef.current[peerId];
    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[peerId];
    }
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }

  // Turn timer updater
  useEffect(() => {
    if (session?.status !== "in_progress" || !session.currentTurn) return;

    const interval = setInterval(() => {
      setTurnElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.status, session?.currentTurn?.participantId]);

  // Auto-scroll transcript container
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [session?.transcript]);

  // Resilient fallback sync: polls session state if WebSocket is closed or in serverless environments
  useEffect(() => {
    if (!sessionId || isEnding) return;

    const interval = setInterval(async () => {
      const isWsOpen = wsRef.current?.readyState === WebSocket.OPEN;
      if (!isWsOpen) {
        try {
          const freshSession = await fetchGDSession(sessionId);
          if (freshSession) {
            setSession((prev) => {
              if (!prev) return freshSession;
              const hasNewTranscript = (freshSession.transcript?.length || 0) !== (prev.transcript?.length || 0);
              const hasTurnChange = freshSession.currentTurn?.participantId !== prev.currentTurn?.participantId;
              const hasStatusChange = freshSession.status !== prev.status;

              if (hasNewTranscript || hasTurnChange || hasStatusChange) {
                return {
                  ...prev,
                  ...freshSession,
                  transcript: freshSession.transcript || prev.transcript,
                };
              }
              return prev;
            });

            if (freshSession.status === "completed") {
              navigate(`/group-discussion/result/${sessionId}`);
            }
          }
        } catch (e) {
          // ignore transient poll errors
        }
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [sessionId, isEnding, navigate]);

  // Cleanup on unmount
  function cleanupResources() {
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    if (speechRestartTimeoutRef.current) {
      clearTimeout(speechRestartTimeoutRef.current);
      speechRestartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
    }
    const stream = localStreamRef.current || localStream;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
  }

  // Toggle Camera with dynamic auto-request
  async function toggleCamera() {
    let stream = localStreamRef.current || localStream;
    let videoTrack = stream?.getVideoTracks()[0];

    if (!videoTrack) {
      // Camera track doesn't exist yet, actively request video permission
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = vStream.getVideoTracks()[0];
        if (newTrack) {
          if (!stream) {
            stream = new MediaStream([newTrack]);
          } else {
            stream.addTrack(newTrack);
          }
          localStreamRef.current = stream;
          setLocalStream(stream);
          setIsVideoOn(true);
          isVideoOnRef.current = true;
          setMediaError(null);

          // Update WebRTC peer senders
          Object.values(peerConnectionsRef.current).forEach((pc) => {
            const senders = pc.getSenders();
            const sender = senders.find((s) => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(newTrack).catch(() => {});
            } else {
              pc.addTrack(newTrack, stream!);
            }
          });

          toast.success("Camera enabled successfully!");
        }
      } catch (err: any) {
        console.warn("Camera request error:", err);
        toast.error("Could not access camera. Please check your browser site permissions.");
        return;
      }
    } else {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOn(videoTrack.enabled);
      isVideoOnRef.current = videoTrack.enabled;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "media_state_change",
          sessionId,
          payload: { isVideoMuted: !isVideoOnRef.current },
        })
      );
    }
  }

  // Toggle Microphone with dynamic auto-request
  async function toggleMicrophone() {
    let stream = localStreamRef.current || localStream;
    let audioTrack = stream?.getAudioTracks()[0];

    if (!audioTrack) {
      // Microphone track doesn't exist yet, actively request audio permission
      try {
        const aStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        const newTrack = aStream.getAudioTracks()[0];
        if (newTrack) {
          if (!stream) {
            stream = new MediaStream([newTrack]);
          } else {
            stream.addTrack(newTrack);
          }
          localStreamRef.current = stream;
          setLocalStream(stream);
          setIsMicOn(true);
          isMicOnRef.current = true;
          setMediaError(null);

          // Re-initialize VAD and Speech Recognition
          startVoiceActivityDetection(stream);
          startSpeechRecognition();

          // Update WebRTC peer senders
          Object.values(peerConnectionsRef.current).forEach((pc) => {
            const senders = pc.getSenders();
            const sender = senders.find((s) => s.track?.kind === "audio");
            if (sender) {
              sender.replaceTrack(newTrack).catch(() => {});
            } else {
              pc.addTrack(newTrack, stream!);
            }
          });

          toast.success("Microphone enabled successfully!");
        }
      } catch (err: any) {
        console.warn("Microphone request error:", err);
        toast.error("Could not access microphone. Please check your browser site permissions.");
        return;
      }
    } else {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
      isMicOnRef.current = audioTrack.enabled;

      // Resume AudioContext & restart speech recognition if unmuting
      if (audioTrack.enabled) {
        if (audioContextRef.current?.state === "suspended") {
          audioContextRef.current.resume().catch(() => {});
        }
        startSpeechRecognition();
      }
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "media_state_change",
          sessionId,
          payload: { isAudioMuted: !isMicOnRef.current },
        })
      );
    }
  }

  // Send manual text contribution (for mic issues or quiet environments)
  async function handleSendManualContribution(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const text = manualText.trim();
    if (!text || !sessionId || isSendingText) return;

    const participant = currentParticipantRef.current || currentParticipant;
    if (!participant) return;

    setIsSendingText(true);
    try {
      await dispatchTranscriptSegment(text);
      setManualText("");
      toast.success("Contribution recorded in discussion transcript!");
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Unable to record your contribution right now. Please try again."));
    } finally {
      setIsSendingText(false);
    }
  }

  // Finish Turn Handler
  async function handleFinishTurn() {
    if (!sessionId || !isMyTurn) return;
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "finish_turn",
            sessionId,
            payload: { wordsSpoken: 0 },
          })
        );
      } else {
        await finishTurn(sessionId);
      }
      toast.success("Turn finished! Handing floor to next participant...");
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Unable to complete your turn right now. Please try again."));
    }
  }

  // Pass Turn Handler
  async function handlePassTurn() {
    if (!sessionId || !isMyTurn) return;
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "pass_turn",
            sessionId,
          })
        );
      } else {
        await passTurn(sessionId);
      }
      toast.info("Turn voluntarily passed to next eligible participant");
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Unable to pass turn right now. Please try again."));
    }
  }

  // Admin Skip Turn
  async function handleAdminSkipTurn() {
    if (!sessionId || !isAdmin) return;
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "skip_turn",
            sessionId,
          })
        );
      } else {
        await skipTurn(sessionId);
      }
      toast.info("Turn skipped by Moderator");
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Unable to skip turn. Please try again."));
    }
  }

  // Admin Start Discussion
  async function handleStartDiscussion() {
    if (!sessionId || !isAdmin) return;
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "start_discussion",
            sessionId,
          })
        );
      } else {
        await startDiscussion(sessionId);
      }
    } catch (err: any) {
      toast.error("Failed to start discussion");
    }
  }

  // Admin End Session
  async function handleEndSession() {
    if (!sessionId || isEnding) return;
    setIsEnding(true);

    try {
      toast.info("Concluding discussion and generating placement evaluations...");
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "end_session",
            sessionId,
          })
        );
      } else {
        await endGDSession(sessionId);
        navigate(`/group-discussion/result/${sessionId}`);
      }
    } catch (err: any) {
      console.error("End session error:", err);
      toast.error("Failed to end session");
      setIsEnding(false);
    }
  }

  // Invite student search
  async function handleSearchInviteUsers(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const existing = session?.participants.map((p) => p.username || "").filter(Boolean) || [];
      const results = await searchUsersByUsername(query.trim(), existing);
      setSearchResults(results);
    } catch (e) {
      setSearchResults([]);
    }
  }

  async function handleSendInvite(targetUsername: string) {
    if (!sessionId) return;
    try {
      await inviteParticipant(sessionId, targetUsername);
      toast.success(`Invitation sent to @${targetUsername}`);
      setShowInviteModal(false);
      setSearchQuery("");
      setSearchResults([]);
      // Refresh session
      const updated = await fetchGDSession(sessionId);
      setSession(updated);
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Unable to send invitation right now. Please try again."));
    }
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center space-y-4 text-white">
        <RefreshCw className="size-10 text-indigo-500 animate-spin" />
        <p className="text-zinc-400 font-medium text-sm">Entering live discussion room...</p>
      </div>
    );
  }

  const currentSpeaker = session.currentTurn;
  const currentSpeakerParticipant = session.participants.find((p) => p.id === currentSpeaker?.participantId);
  const studentParticipants = session.participants.filter((p) => !p.isHost && p.role !== "admin");

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      {/* Top Header Bar */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md px-4 sm:px-8 py-3 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Discussion Topic & Language Banner */}
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {session.topic.category}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-800 text-zinc-300">
                Language: {session.expectedLanguage}
              </span>
              {session.status === "in_progress" ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE DISCUSSION (ROUND {session.round})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  PREPARING ROOM
                </span>
              )}
            </div>

            <h1 className="text-sm sm:text-base font-bold text-white line-clamp-1">
              "{session.topic.question}"
            </h1>
          </div>

          {/* AI Tutor Listening Status & Moderator Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
              <Sparkles className="size-3.5 text-indigo-400 animate-spin" />
              AI Tutor Listening & Attributing
            </div>

            {isAdmin && session.status === "preparing" && (
              <Button
                onClick={handleStartDiscussion}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Play className="size-3.5" />
                Start Discussion
              </Button>
            )}

            {isAdmin && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="size-3.5" />
                Invite ({studentParticipants.length}/5)
              </button>
            )}

            {isAdmin && (
              <Button
                onClick={handleEndSession}
                disabled={isEnding}
                className="px-4 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs shadow-md shadow-red-600/20 flex items-center gap-1.5"
              >
                <PhoneOff className="size-3.5" />
                {isEnding ? "Evaluating..." : "End Discussion"}
              </Button>
            )}
          </div>
        </div>

        {/* Silence Warning Banner (90s alert) */}
        {silenceWarning && (
          <div className="max-w-7xl mx-auto mt-2 p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center justify-between text-xs text-amber-300 animate-pulse">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4" />
              <span>{silenceWarning}</span>
            </div>
            {isMyTurn && (
              <span className="font-bold underline cursor-pointer" onClick={() => setIsMicOn(true)}>
                Start speaking to keep your turn!
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Room Viewport */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Video Grid (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Active Turn Header Indicator */}
          {session.status === "in_progress" && currentSpeaker && (
            <div className="p-3 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-950 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-emerald-400 animate-ping" />
                <div>
                  <div className="text-xs text-zinc-400">Current Assigned Speaker:</div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    @{currentSpeaker.username} ({currentSpeakerParticipant?.name || currentSpeaker.name})
                    {isMyTurn && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-500 text-white">
                        YOUR TURN
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="text-zinc-400 flex items-center gap-1">
                  <Clock className="size-3.5" />
                  Speaking: {turnElapsedSeconds}s / 90s suggested
                </div>
                {isAdmin && (
                  <button
                    onClick={handleAdminSkipTurn}
                    className="px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-[11px] flex items-center gap-1"
                  >
                    <SkipForward className="size-3" />
                    Skip Turn
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Video Grid Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
            {/* Local User Tile */}
            <div
              className={`relative rounded-2xl overflow-hidden border aspect-video bg-zinc-900 flex items-center justify-center transition-all duration-300 ${
                speakingPeers[currentParticipant?.id || ""] || isMyTurn
                  ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
                  : "border-zinc-800"
              }`}
            >
              {/* Real-time speech transcription badge */}
              {liveTranscriptPreview && (
                <div className="absolute top-2 left-2 max-w-[85%] px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-indigo-500/50 text-[11px] text-indigo-300 font-medium truncate animate-pulse pointer-events-none z-10 flex items-center gap-1.5 shadow-lg">
                  <span className="size-1.5 rounded-full bg-indigo-400 animate-ping shrink-0" />
                  <span className="truncate">🎙️ "{liveTranscriptPreview}"</span>
                </div>
              )}
              {isVideoOn ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="size-16 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-md">
                    {currentParticipant?.username?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="text-xs text-zinc-400">Camera Off</span>
                </div>
              )}

              {/* Tag & Audio Badges */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] pointer-events-none">
                <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white font-bold flex items-center gap-1.5">
                  @{currentParticipant?.username || "You"} {isAdmin ? "(Moderator)" : "(You)"}
                </span>
                <span
                  className={`p-1 rounded-full ${
                    isMicOn ? "bg-emerald-500/80 text-white" : "bg-red-500/80 text-white"
                  }`}
                >
                  {isMicOn ? <Mic className="size-3" /> : <MicOff className="size-3" />}
                </span>
              </div>
            </div>

            {/* Remote Peers Video Tiles */}
            {session.participants
              .filter((p) => p.id !== currentParticipant?.id)
              .map((p) => {
                const stream = remoteStreams[p.id];
                const isSpeaking = speakingPeers[p.id];
                const isPeerTurn = session.currentTurn?.participantId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`relative rounded-2xl overflow-hidden border aspect-video bg-zinc-900 flex items-center justify-center transition-all duration-300 ${
                      isSpeaking || isPeerTurn
                        ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
                        : "border-zinc-800"
                    }`}
                  >
                    {/* Always play remote audio even when camera is off */}
                    {stream && (
                      <audio
                        autoPlay
                        playsInline
                        ref={(el) => {
                          if (el && el.srcObject !== stream) {
                            el.srcObject = stream;
                          }
                        }}
                      />
                    )}

                    {stream && !p.isVideoMuted ? (
                      <video
                        autoPlay
                        playsInline
                        ref={(el) => {
                          if (el && el.srcObject !== stream) {
                            el.srcObject = stream;
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="size-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center font-bold text-xl text-white shadow-md">
                          {p.username?.[0]?.toUpperCase() || p.name[0]?.toUpperCase() || "P"}
                        </div>
                        <span className="text-xs text-zinc-400">
                          {p.isOnline ? "Camera Off" : "Disconnected"}
                        </span>
                      </div>
                    )}

                    {/* Tag & Badges */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] pointer-events-none">
                      <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white font-bold flex items-center gap-1.5">
                        @{p.username || p.name} {p.isHost && "(Moderator)"}
                        {isPeerTurn && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-black text-[9px] font-black">
                            SPEAKING
                          </span>
                        )}
                      </span>
                      <span
                        className={`p-1 rounded-full ${
                          !p.isAudioMuted ? "bg-emerald-500/80 text-white" : "bg-red-500/80 text-white"
                        }`}
                      >
                        {!p.isAudioMuted ? <Mic className="size-3" /> : <MicOff className="size-3" />}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Media Permission Warning Banner with Retry Action */}
          {mediaError && (
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-300 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                <span>{mediaError}</span>
              </div>
              <Button
                onClick={() => initLocalMedia()}
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-3.5 py-1.5 h-auto rounded-lg shadow-sm"
              >
                Retry Permissions
              </Button>
            </div>
          )}

          {/* Bottom Live Controls Bar (Google Meet Style) */}
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-950/90 flex flex-wrap items-center justify-between gap-4">
            {/* Camera & Mic toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMicrophone}
                className={`p-3 rounded-full font-bold transition cursor-pointer ${
                  isMicOn
                    ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                    : "bg-red-600 hover:bg-red-500 text-white animate-pulse"
                }`}
                title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
              >
                {isMicOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
              </button>

              <button
                onClick={toggleCamera}
                className={`p-3 rounded-full font-bold transition cursor-pointer ${
                  isVideoOn
                    ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                    : "bg-red-600 hover:bg-red-500 text-white"
                }`}
                title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
              >
                {isVideoOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
              </button>
            </div>

            {/* Turn Action Controls (Finish / Pass Turn) */}
            {isMyTurn && (
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                <Button
                  onClick={handleFinishTurn}
                  className="flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="size-4" />
                  Finish My Turn
                </Button>

                <Button
                  onClick={handlePassTurn}
                  variant="outline"
                  className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <SkipForward className="size-4" />
                  Pass Turn
                </Button>
              </div>
            )}

            {/* Discussion Room Status */}
            <div className="text-xs text-zinc-400">
              Capacity: {studentParticipants.length}/5 students • Round {session.round}
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Transcript & Participants (4 cols) */}
        <div className="lg:col-span-4 flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/70 h-[420px] lg:h-[680px] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                activeTab === "transcript"
                  ? "border-indigo-500 text-white bg-zinc-900/40"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              Attributed Transcript ({session.transcript.length})
            </button>
            <button
              onClick={() => setActiveTab("participants")}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                activeTab === "participants"
                  ? "border-indigo-500 text-white bg-zinc-900/40"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              Participants ({session.participants.length})
            </button>
          </div>

          {/* Transcript Feed View */}
          {activeTab === "transcript" && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Real-time speech transcription banner */}
              {liveTranscriptPreview && (
                <div className="mx-4 mt-3 p-2.5 rounded-xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-indigo-500/15 border border-indigo-500/40 text-indigo-200 text-xs flex items-center gap-2.5 animate-pulse shadow-sm shrink-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                  </span>
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                    <span className="font-bold text-indigo-300 shrink-0">Transcribing:</span>
                    <span className="italic truncate text-zinc-100 font-medium">"{liveTranscriptPreview}"</span>
                  </div>
                </div>
              )}

              <div
                ref={transcriptScrollRef}
                className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 text-xs"
              >
                {session.transcript.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-2.5 text-zinc-500 p-6">
                    <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-indigo-400">
                      <MessageSquare className="size-6" />
                    </div>
                    <p className="font-semibold text-zinc-300 text-xs">Live Attributed Transcript Active</p>
                    <p className="text-[11px] text-zinc-400 max-w-xs leading-relaxed">
                      Speak into your microphone or type a message below. Your spoken contributions will be transcribed and attributed to your profile in real time.
                    </p>
                  </div>
                ) : (
                  session.transcript.map((seg, idx) => {
                    const isUser = seg.participantId === currentParticipant?.id;
                    return (
                      <div
                        key={seg.id || idx}
                        className={`p-3.5 rounded-xl space-y-1 ${
                          isUser
                            ? "bg-indigo-950/30 border border-indigo-500/30 ml-4"
                            : "bg-zinc-900/70 border border-zinc-800/80 mr-4"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className={isUser ? "text-indigo-400" : "text-emerald-400"}>
                            @{seg.username || seg.participantName} {isUser && "(You)"}
                          </strong>
                          <span className="text-[10px] text-zinc-500">{seg.durationSeconds}s</span>
                        </div>
                        <p className="text-zinc-200 leading-relaxed">{seg.text}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Live Contribution Text Input Bar (Keyboard speech fallback) */}
              <form
                onSubmit={handleSendManualContribution}
                className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Speak into microphone or type contribution..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <Button
                  type="submit"
                  disabled={!manualText.trim() || isSendingText}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3 py-2 h-auto text-xs flex items-center gap-1 font-bold"
                >
                  <Send className="size-3.5" />
                  <span>Send</span>
                </Button>
              </form>
            </div>
          )}

          {/* Participants & Turn Stats View */}
          {activeTab === "participants" && (
            <div className="flex-1 p-4 space-y-3 overflow-y-auto text-xs">
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Moderator
                </span>
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-indigo-400" />
                    <span className="font-bold text-white">@{session.adminUsername}</span>
                  </div>
                  <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                    Moderator
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Students ({studentParticipants.length}/5)
                </span>
                {studentParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">@{p.username || p.name}</span>
                      <span className="text-[10px] text-zinc-500">
                        {p.isOnline ? "Connected" : "Offline"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Speaking: {p.speakingTimeSeconds}s ({p.percentSpeakingTime || 0}%)</span>
                      <span>Turns: {p.turnsCompleted || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Moderator Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="size-4 text-indigo-400" />
              Invite Student by Username
            </h3>
            <p className="text-xs text-zinc-400">
              Capacity: {studentParticipants.length} of 5 students currently in room.
            </p>

            <div className="relative">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                <Search className="size-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInviteUsers(e.target.value)}
                  placeholder="Search username..."
                  className="bg-transparent text-xs text-white placeholder-zinc-500 outline-none flex-1"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="mt-2 bg-zinc-900 border border-zinc-800 rounded-xl max-h-48 overflow-y-auto p-1 text-xs">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleSendInvite(u.username)}
                      className="p-2.5 rounded-lg hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-white block">@{u.username}</span>
                        <span className="text-zinc-500 text-[11px]">{u.fullName}</span>
                      </div>
                      <span className="text-indigo-400 font-bold">Invite</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GDRoomPage;
