import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Bot, Loader2, PhoneOff, User, Send, Volume2, MessageSquareText, Mic, MicOff, X, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { VoiceOrb } from "./VoiceOrb";
import { toast } from "react-toastify";
import {
  fetchDeepgramKey,
  initiateInterviewSession,
  sendUserSpeechAndGetResponse,
  verifyTurnSpeechApi,
  type VoiceResponse,
  type STTCredentialsResponse,
} from "../services/interviewService";
import { getErrorMessage } from "../lib/utils";
import { BACKEND_URL } from "../lib/config";

type Status = "connecting" | "live" | "ending";

interface ChatTurn {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
  audioBase64?: string | null; // stored so replay uses Murf / high-fidelity AI audio, not browser TTS
}

/**
 * Detects the best supported audio MIME type for MediaRecorder.
 * Prefers Opus in WebM, with graceful fallbacks for Safari/iOS WebKit.
 */
function getOptimalAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return "";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "";
}

/**
 * Merges a newly finalized transcript segment into the accumulated text,
 * eliminating repeated phrases and stutter at word boundaries.
 */
function mergeTranscriptDeduplicated(baseText: string, newSegment: string): { merged: string; overlapFound: boolean } {
  const base = baseText.trim();
  const incoming = newSegment.trim();
  if (!base) return { merged: incoming, overlapFound: false };
  if (!incoming) return { merged: base, overlapFound: false };

  const baseWords = base.split(/\s+/);
  const incomingWords = incoming.split(/\s+/);

  // Check overlap of up to 8 words
  const maxOverlap = Math.min(baseWords.length, incomingWords.length, 8);
  for (let k = maxOverlap; k >= 1; k--) {
    const baseSuffix = baseWords.slice(-k).join(" ").toLowerCase().replace(/[^a-z0-9]/g, "");
    const incomingPrefix = incomingWords.slice(0, k).join(" ").toLowerCase().replace(/[^a-z0-9]/g, "");

    if (baseSuffix === incomingPrefix && baseSuffix.length > 0) {
      const remainingIncoming = incomingWords.slice(k).join(" ");
      return {
        merged: remainingIncoming ? `${base} ${remainingIncoming}` : base,
        overlapFound: true,
      };
    }
  }

  return {
    merged: `${base} ${incoming}`,
    overlapFound: false,
  };
}

function createLevelMeter(ctx: AudioContext, stream: MediaStream) {
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.8;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);

  return () => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i]! - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(1, rms * 3.2);
  };
}

export function Interview() {
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>("connecting");
  const [aiLevel, setAiLevel] = useState(0);
  const [userLevel, setUserLevel] = useState(0);
  const [currentAiText, setCurrentAiText] = useState("");
  const [textInput, setTextInput] = useState("");
  // Live interim transcript shown while student is still speaking (not yet committed)
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  const [chatLogs, setChatLogs] = useState<ChatTurn[]>([]);
  const [isMicActive, setIsMicActive] = useState(true);
  const [sttStatus, setSttStatus] = useState<"connecting" | "listening" | "processing" | "reconnecting" | "error" | "paused">("connecting");
  const [micError, setMicError] = useState<string | null>(null);

  // Refs for single-instance audio control
  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const userStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const hasDeepgramRef = useRef<boolean>(false);
  const isListeningRef = useRef(true);
  const isAiSpeakingRef = useRef(false);
  const orbIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  // Ref for live caption div — used to auto-scroll to the newest text on the right
  const captionDivRef = useRef<HTMLDivElement | null>(null);
  const initiatedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const turnAudioChunksRef = useRef<BlobPart[]>([]);
  const sttVerificationEnabledRef = useRef<boolean>(true);
  const sttRetryCountRef = useRef<number>(0);

  async function retryMicrophone() {
    setMicError(null);
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      userStreamRef.current = ms;
      setIsMicActive(true);
      isListeningRef.current = true;
      setSttStatus("listening");
      toast.success("Microphone active.");
      if (!hasDeepgramRef.current) {
        startNativeSpeechRecognition();
      }
    } catch (err: any) {
      console.warn("Retry microphone error:", err);
      setMicError("Microphone access permission was denied. Please allow microphone in your browser settings.");
      setSttStatus("error");
      toast.error("Microphone permission denied.");
    }
  }

  // Measurable dev-mode STT diagnostics
  const diagnosticsRef = useRef({
    engine: "none" as "murf" | "deepgram" | "native" | "none",
    model: "nova-2",
    language: "en-IN",
    mimeType: "",
    chunksSent: 0,
    chunksDropped: 0,
    timeToFirstInterimMs: null as number | null,
    timeToFirstFinalMs: null as number | null,
    interimSegmentsCount: 0,
    finalSegmentsCount: 0,
    duplicatesPrevented: 0,
    startTime: 0,
  });

  // Auto-scroll chat dialogue box to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatLogs, currentAiText]);

  // Auto-scroll live caption div to the right so newest text is always visible
  useEffect(() => {
    if (captionDivRef.current) {
      captionDivRef.current.scrollLeft = captionDivRef.current.scrollWidth;
    }
  }, [textInput, interimTranscript]);

  // Auto-grow textarea: reset to auto first so it can shrink, then expand to content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [textInput]);

  // Pre-load Web Speech voices on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Silent user gesture listener to unlock Web Audio API ONLY (does NOT restart recognition on click)
  useEffect(() => {
    const silentUnlock = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    };
    window.addEventListener("click", silentUnlock, { passive: true });
    window.addEventListener("keydown", silentUnlock, { passive: true });
    window.addEventListener("touchstart", silentUnlock, { passive: true });
    return () => {
      window.removeEventListener("click", silentUnlock);
      window.removeEventListener("keydown", silentUnlock);
      window.removeEventListener("touchstart", silentUnlock);
    };
  }, []);

  function startTurnMediaRecorder() {
    if (!userStreamRef.current || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    if (recorderRef.current && recorderRef.current.state === "recording") return;

    try {
      const selectedMime = getOptimalAudioMimeType();
      diagnosticsRef.current.mimeType = selectedMime;

      const mediaRecorder = new MediaRecorder(
        userStreamRef.current,
        selectedMime ? { mimeType: selectedMime } : undefined
      );
      recorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        // Drop outgoing chunks if AI is speaking or mic is muted to prevent speaker echo bleed
        if (isAiSpeakingRef.current || !isListeningRef.current) {
          diagnosticsRef.current.chunksDropped++;
          return;
        }
        if (event.data && event.data.size > 0) {
          // Buffer for turn-level acoustic verification
          turnAudioChunksRef.current.push(event.data);
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            diagnosticsRef.current.chunksSent++;
            socketRef.current.send(event.data);
          }
        }
      };

      mediaRecorder.start(200);
      diagnosticsRef.current.startTime = Date.now();
    } catch (recErr) {
      console.warn("MediaRecorder start notice, using native speech recognition:", recErr);
      startNativeSpeechRecognition();
    }
  }

  function stopTurnMediaRecorder() {
    if (recorderRef.current) {
      try {
        if (recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch {}
      recorderRef.current = null;
    }
  }

  function startNativeSpeechRecognition() {
    if (hasDeepgramRef.current) return; // Strict mutual exclusion: never run simultaneously with Deepgram
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (import.meta.env.DEV) console.info("[STT] Native Speech Recognition is unsupported in this browser.");
      return;
    }

    // Do NOT stop or restart if already running cleanly
    if (recognitionRef.current) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // Prioritize Indian English

      diagnosticsRef.current.engine = "native";
      diagnosticsRef.current.language = "en-IN";
      if (!diagnosticsRef.current.startTime) diagnosticsRef.current.startTime = Date.now();

      recognition.onresult = (event: any) => {
        // Ignore any transcript while AI is speaking to avoid picking up AI audio
        if (isAiSpeakingRef.current) return;

        let newFinalText = "";
        let interimText = "";

        // Start from event.resultIndex to avoid re-processing old finals
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            newFinalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }

        if (newFinalText.trim()) {
          diagnosticsRef.current.finalSegmentsCount++;
          if (diagnosticsRef.current.timeToFirstFinalMs === null) {
            diagnosticsRef.current.timeToFirstFinalMs = Date.now() - diagnosticsRef.current.startTime;
          }

          setTextInput((prev) => {
            const { merged, overlapFound } = mergeTranscriptDeduplicated(prev, newFinalText);
            if (overlapFound) diagnosticsRef.current.duplicatesPrevented++;
            return merged;
          });
          setInterimTranscript("");
        }

        if (interimText) {
          diagnosticsRef.current.interimSegmentsCount++;
          if (diagnosticsRef.current.timeToFirstInterimMs === null) {
            diagnosticsRef.current.timeToFirstInterimMs = Date.now() - diagnosticsRef.current.startTime;
          }
        }
        // Always update interim to display ghost preview or clear
        setInterimTranscript(interimText);
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        // Do NOT restart if AI is speaking or mic was turned off or Deepgram took over
        if (isListeningRef.current && !isAiSpeakingRef.current && !hasDeepgramRef.current) {
          setTimeout(() => {
            if (isListeningRef.current && !isAiSpeakingRef.current && !hasDeepgramRef.current) {
              startNativeSpeechRecognition();
            }
          }, 300);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === "language-not-supported") {
          recognition.lang = "en-US";
        } else if (e.error === "not-allowed") {
          toast.error("Please click Allow Microphone in your browser address bar.");
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (srErr) {
      console.warn("Native Speech Recognition start notice:", srErr);
    }
  }

  useEffect(() => {
    if (!interviewId || initiatedRef.current) return;
    initiatedRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        let userMeterGetter: (() => number) | null = null;

        // 1. Capture candidate microphone with acoustic echo cancellation, noise suppression, and mono 16kHz
        try {
          const ms = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              sampleRate: 16000,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          if (cancelled) {
            ms.getTracks().forEach((t) => t.stop());
            return;
          }
          userStreamRef.current = ms;
          userMeterGetter = createLevelMeter(audioCtx, ms);
        } catch (micErr: any) {
          console.warn("Microphone access permission notice:", micErr);
          setMicError("Microphone permission was denied or device not found. Please click 'Retry Microphone' to enable speech.");
          setSttStatus("error");
        }

        // 2. Fetch authenticated STT streaming credentials & connect WebSocket proxy
        let hasDeepgramSTT = false;
        try {
          const creds = await fetchDeepgramKey();
          if (creds.configured && userStreamRef.current) {
            sttVerificationEnabledRef.current = creds.sttVerificationEnabled !== false;
            let wsBase = BACKEND_URL;
            if (!wsBase.startsWith("http")) wsBase = window.location.origin;
            const wsProtocol = wsBase.startsWith("https") ? "wss:" : "ws:";
            const wsHost = wsBase.replace(/^https?:\/\//i, "");

            let socket: WebSocket;
            if (creds.proxyUrl) {
              const wsUrl = `${wsProtocol}//${wsHost}${creds.proxyUrl}?token=${encodeURIComponent(
                creds.token || ""
              )}&model=${encodeURIComponent(creds.recommendedModel || "nova-3")}&language=${encodeURIComponent(
                creds.defaultLanguage || "en-IN"
              )}&interviewId=${encodeURIComponent(interviewId)}`;
              socket = new WebSocket(wsUrl);
            } else if (creds.key) {
              const legacyUrl =
                "wss://api.deepgram.com/v1/listen?model=nova-3&language=en-IN&smart_format=true&punctuate=true&interim_results=true&no_delay=true&endpointing=350&utterance_end_ms=1000&filler_words=true";
              socket = new WebSocket(legacyUrl, ["token", creds.key]);
            } else {
              throw new Error("STT configuration unavailable");
            }

            socketRef.current = socket;

            socket.onopen = () => {
              hasDeepgramSTT = true;
              hasDeepgramRef.current = true;
              setSttStatus("listening");
              diagnosticsRef.current.engine = creds.provider === "murf" ? "murf" : "deepgram";
              diagnosticsRef.current.model = creds.recommendedModel || (creds.provider === "murf" ? "murf-stt" : "nova-3");
              diagnosticsRef.current.language = creds.defaultLanguage || "en-IN";
              diagnosticsRef.current.startTime = Date.now();

              // Start streaming candidate audio only if it is already candidate's speaking turn
              if (isListeningRef.current && !isAiSpeakingRef.current) {
                startTurnMediaRecorder();
              }

              if (import.meta.env.DEV) {
                console.info("🎙️ [STT Streaming Gateway Online]", {
                  engine: creds.provider === "murf" ? "Murf AI Real-time Streaming" : "Deepgram Nova-3 Streaming",
                  model: creds.recommendedModel || (creds.provider === "murf" ? "murf-stt" : "nova-3"),
                  locale: creds.defaultLanguage || "en-IN",
                  chunkInterval: "200ms",
                });
              }
            };

            socket.onmessage = (message) => {
              try {
                // Ignore any transcript while AI is speaking
                if (isAiSpeakingRef.current) return;
                const received = JSON.parse(message.data);
                if (received.type === "ready") {
                  setSttStatus("listening");
                  if (isListeningRef.current && !isAiSpeakingRef.current) {
                    startTurnMediaRecorder();
                  }
                  return;
                }
                if (received.type === "status") {
                  if (received.status) setSttStatus(received.status);
                  return;
                }
                if (received.type === "error") {
                  setSttStatus("error");
                  return;
                }

                const transcript = received.transcript || received.channel?.alternatives?.[0]?.transcript;
                if (!transcript) return;

                const isFinal = received.is_final === true || received.type === "final" || received.type === "Final";

                if (isFinal) {
                  diagnosticsRef.current.finalSegmentsCount++;
                  if (diagnosticsRef.current.timeToFirstFinalMs === null) {
                    diagnosticsRef.current.timeToFirstFinalMs = Date.now() - diagnosticsRef.current.startTime;
                  }

                  if (transcript.trim()) {
                    setTextInput((prev) => {
                      const { merged, overlapFound } = mergeTranscriptDeduplicated(prev, transcript);
                      if (overlapFound) diagnosticsRef.current.duplicatesPrevented++;
                      return merged;
                    });
                  }
                  setInterimTranscript("");
                } else {
                  diagnosticsRef.current.interimSegmentsCount++;
                  if (diagnosticsRef.current.timeToFirstInterimMs === null) {
                    diagnosticsRef.current.timeToFirstInterimMs = Date.now() - diagnosticsRef.current.startTime;
                  }
                  // Show live interim words as temporary preview
                  setInterimTranscript(transcript);
                }
              } catch (e) {}
            };

            const handleSocketDisconnect = () => {
              if (cancelled) return;
              hasDeepgramRef.current = false;
              if (isListeningRef.current && !isAiSpeakingRef.current) {
                startNativeSpeechRecognition();
                setSttStatus("listening");
              }
            };

            socket.onerror = handleSocketDisconnect;
            socket.onclose = handleSocketDisconnect;
          }
        } catch (dgErr) {
          console.warn("STT WebSocket fallback to browser engine:", dgErr);
          setSttStatus("listening");
        }

        // 3. Fallback to native browser Web Speech Recognition if Deepgram stream was not established
        if (!hasDeepgramSTT) {
          startNativeSpeechRecognition();
        }

        // 4. Initiate AI Voice Session
        const initData = await initiateInterviewSession(interviewId);
        if (cancelled) return;

        setStatus("live");
        if (initData.history && initData.history.length > 0) {
          setChatLogs(initData.history);
          if (initData.aiMessage) {
            setCurrentAiText(initData.aiMessage);
            playAudioOrSpeakText(initData.aiMessage, initData.audioBase64);
          }
        } else if (initData.aiMessage) {
          setCurrentAiText(initData.aiMessage);
          addChatTurn("ai", initData.aiMessage);
          playAudioOrSpeakText(initData.aiMessage, initData.audioBase64);
        }

        // Animation loop for volume meters
        const tick = () => {
          if (userMeterGetter) setUserLevel(userMeterGetter());
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err: any) {
        console.error("Interview initialization error:", err);
        toast.error(getErrorMessage(err, "Couldn't start voice session. Please try again."));
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [interviewId]);

  function toggleMicrophone() {
    if (isMicActive) {
      isListeningRef.current = false;
      setIsMicActive(false);
      setSttStatus("paused");
      stopTurnMediaRecorder();
      // Mute audio track so MediaRecorder receives silence
      if (userStreamRef.current) {
        userStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
      toast.info("Microphone muted.");
    } else {
      isListeningRef.current = true;
      setIsMicActive(true);
      setSttStatus("listening");
      if (userStreamRef.current) {
        userStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }
      if (hasDeepgramRef.current && !isAiSpeakingRef.current) {
        startTurnMediaRecorder();
      } else if (!hasDeepgramRef.current) {
        startNativeSpeechRecognition();
      }
      toast.success("Microphone active.");
    }
  }

  function addChatTurn(sender: "ai" | "user", text: string, audioBase64?: string | null) {
    const newTurn: ChatTurn = {
      id: Math.random().toString(36).slice(2),
      sender,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      audioBase64: audioBase64 ?? null,
    };
    setChatLogs((prev) => [...prev, newTurn]);
  }

  function stopAllAudio() {
    if (orbIntervalRef.current) {
      clearInterval(orbIntervalRef.current);
      orbIntervalRef.current = null;
    }
    if (activeAudioSourceRef.current) {
      try {
        activeAudioSourceRef.current.stop();
      } catch {}
      activeAudioSourceRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setAiLevel(0);
  }

  function pauseRecognitionForAiSpeech() {
    isAiSpeakingRef.current = true;
    setSttStatus("processing");
    stopTurnMediaRecorder();
    // Mute candidate mic audio tracks so laptop speaker playback cannot bleed into STT buffer
    if (userStreamRef.current) {
      userStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }
    // Stop native recognition while AI speaks so it doesn't transcribe AI audio
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }

  function resumeRecognitionAfterAiSpeech() {
    // 350ms acoustic decay ensures speaker room resonance has completely faded before unmuting mic
    setTimeout(() => {
      isAiSpeakingRef.current = false;
      if (isListeningRef.current) {
        setSttStatus("listening");
      }
      if (isListeningRef.current && userStreamRef.current) {
        userStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }
      // Start STT stream for candidate's speaking turn (starts fresh MediaRecorder with valid WebM header)
      if (isListeningRef.current && hasDeepgramRef.current) {
        startTurnMediaRecorder();
      } else if (isListeningRef.current) {
        startNativeSpeechRecognition();
      }
    }, 350);
  }

  function playAudioOrSpeakText(text: string, base64Data?: string | null) {
    stopAllAudio();
    pauseRecognitionForAiSpeech();

    if (base64Data && base64Data.trim()) {
      playAudioBase64(base64Data);
      return;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      // Slightly slower than default → more natural, conversational pacing
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      // Priority: Network Neural > Network Natural > Network Google > Any Network > Local Microsoft > Any Local
      const preferred = [
        (v: SpeechSynthesisVoice) => v.lang === "en-US" && !v.localService && v.name.includes("Neural"),
        (v: SpeechSynthesisVoice) => v.lang === "en-US" && !v.localService && v.name.includes("Natural"),
        (v: SpeechSynthesisVoice) => v.lang === "en-US" && !v.localService && v.name.includes("Google"),
        (v: SpeechSynthesisVoice) => v.lang === "en-US" && !v.localService,
        (v: SpeechSynthesisVoice) => !v.localService && v.lang.startsWith("en"),
        (v: SpeechSynthesisVoice) => v.lang === "en-US" && v.name.includes("Microsoft"),
        (v: SpeechSynthesisVoice) => v.lang === "en-US",
        (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
      ];
      for (const fn of preferred) {
        const found = voices.find(fn);
        if (found) { utterance.voice = found; break; }
      }

      utterance.onstart = () => {
        if (orbIntervalRef.current) clearInterval(orbIntervalRef.current);
        orbIntervalRef.current = setInterval(() => {
          setAiLevel(0.2 + Math.random() * 0.4);
        }, 120);
      };

      // Workaround for Chromium 15s pause bug: keep pings alive and set watchdog
      const words = text.split(/\s+/).length;
      const expectedDurationMs = Math.max((words / 2.0) * 1000 + 4000, 6000);

      let finished = false;
      let watchdogTimer: any = null;
      let resumeInterval: any = null;

      const finishAiSpeech = () => {
        if (finished) return;
        finished = true;
        if (watchdogTimer) { clearTimeout(watchdogTimer); watchdogTimer = null; }
        if (resumeInterval) { clearInterval(resumeInterval); resumeInterval = null; }
        stopAllAudio();
        resumeRecognitionAfterAiSpeech();
      };

      resumeInterval = setInterval(() => {
        if (typeof window !== "undefined" && window.speechSynthesis?.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 4000);

      watchdogTimer = setTimeout(() => {
        finishAiSpeech();
      }, expectedDurationMs);

      utterance.onend = () => finishAiSpeech();
      utterance.onerror = () => finishAiSpeech();

      window.speechSynthesis.speak(utterance);
    } else {
      // If no speech synthesis support, immediately resume candidate turn
      resumeRecognitionAfterAiSpeech();
    }
  }

  function playAudioBase64(base64Data: string) {
    try {
      if (!audioCtxRef.current) return;
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }

      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      audioCtxRef.current.decodeAudioData(
        bytes.buffer,
        (buffer) => {
          if (activeAudioSourceRef.current) {
            try {
              activeAudioSourceRef.current.stop();
            } catch {}
          }

          const source = audioCtxRef.current!.createBufferSource();
          source.buffer = buffer;

          const aiAnalyser = audioCtxRef.current!.createAnalyser();
          aiAnalyser.fftSize = 256;
          source.connect(aiAnalyser);
          aiAnalyser.connect(audioCtxRef.current!.destination);

          const dataArray = new Uint8Array(aiAnalyser.frequencyBinCount);
          const updateAiOrb = () => {
            if (activeAudioSourceRef.current === source) {
              aiAnalyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]!;
              const avg = sum / dataArray.length / 255;
              setAiLevel(avg);
              requestAnimationFrame(updateAiOrb);
            } else {
              setAiLevel(0);
            }
          };

          source.onended = () => {
            resumeRecognitionAfterAiSpeech();
          };

          activeAudioSourceRef.current = source;
          source.start(0);
          updateAiOrb();
        },
        (decodeErr) => {
          console.warn("Audio buffer decode notice, resuming candidate turn:", decodeErr);
          resumeRecognitionAfterAiSpeech();
        }
      );
    } catch (e) {
      console.error("Audio playback error:", e);
      resumeRecognitionAfterAiSpeech();
    }
  }

  async function handleUserSpeechFinal(speechText: string) {
    if (isProcessingResponse || !interviewId || !speechText.trim()) return;

    const trimmedUserMsg = speechText.trim();
    stopAllAudio();
    addChatTurn("user", trimmedUserMsg);
    setIsProcessingResponse(true);
    setTextInput("");
    setInterimTranscript("");

    try {
      const data: VoiceResponse = await sendUserSpeechAndGetResponse(interviewId, trimmedUserMsg);
      if (data.aiMessage) {
        setCurrentAiText(data.aiMessage);
        // Store audioBase64 in the chat log so replay uses the same Deepgram clip
        addChatTurn("ai", data.aiMessage, data.audioBase64);
        playAudioOrSpeakText(data.aiMessage, data.audioBase64);
      }
    } catch (err) {
      console.error("Error processing candidate response:", err);
      toast.error("Failed to process speech response.");
    } finally {
      setIsProcessingResponse(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isProcessingResponse) return;

    // Signal finalize to STT socket to flush pending audio buffers
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ type: "Finalize" }));
      } catch {}
    }

    // Deduplicate any pending interim transcript with textInput to prevent stutter/repetitions
    let fullText = textInput.trim();
    const pendingInterim = interimTranscript.trim();

    if (pendingInterim) {
      const { merged } = mergeTranscriptDeduplicated(fullText, pendingInterim);
      fullText = merged;
    }

    if (!fullText) return;

    // Retain turn audio chunks for second-pass acoustic verification
    const chunks = [...turnAudioChunksRef.current];
    turnAudioChunksRef.current = [];

    let candidateUtterance = fullText;

    if (
      sttVerificationEnabledRef.current &&
      chunks.length > 0 &&
      interviewId &&
      candidateUtterance
    ) {
      try {
        const turnBlob = new Blob(chunks, {
          type: diagnosticsRef.current.mimeType || "audio/webm",
        });
        if (turnBlob.size > 2000) {
          const verResult = await verifyTurnSpeechApi(interviewId, turnBlob, candidateUtterance);
          if (verResult?.verifiedTranscript && verResult.verifiedTranscript.trim()) {
            candidateUtterance = verResult.verifiedTranscript.trim();
          }
        }
      } catch (verErr) {
        // Fallback: keep live streaming candidate utterance directly
      }
    }

    handleUserSpeechFinal(candidateUtterance);
  }

  function clearTextInput() {
    setTextInput("");
    setInterimTranscript("");
  }

  function replayAiVoice(log: ChatTurn) {
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    // Use the stored Deepgram audio so replay sounds identical to the original
    playAudioOrSpeakText(log.text, log.audioBase64);
  }

  function cleanup() {
    isListeningRef.current = false;
    stopAllAudio();
    stopTurnMediaRecorder();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    socketRef.current?.close();
    userStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
  }

  function endInterview() {
    setStatus("ending");
    cleanup();
    navigate(`/result/${interviewId}`);
  }

  const aiSpeaking = aiLevel > 0.05;
  const userSpeaking = userLevel > 0.05 && !aiSpeaking;

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border/40 bg-card/20 backdrop-blur shrink-0">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
          <span className="relative flex size-2.5">
            <span
              className={
                status === "live"
                  ? "absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                  : "hidden"
              }
            />
            <span
              className={
                "relative inline-flex size-2.5 rounded-full " +
                (status === "live" ? "bg-emerald-400" : "bg-amber-400")
              }
            />
          </span>
          {status === "connecting" ? "Connecting Voice Session…" : status === "ending" ? "Wrapping up…" : "Live Voice Interview"}
        </div>

        {/* Live Transcription Status Pill */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
              sttStatus === "listening"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : sttStatus === "reconnecting"
                ? "bg-sky-500/10 text-sky-400 border-sky-500/30 animate-pulse"
                : sttStatus === "processing"
                ? "bg-violet-500/10 text-violet-400 border-violet-500/30"
                : sttStatus === "paused"
                ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                sttStatus === "listening"
                  ? "bg-emerald-400 animate-ping"
                  : sttStatus === "processing"
                  ? "bg-violet-400 animate-pulse"
                  : "bg-amber-400"
              }`}
            />
            {sttStatus === "listening"
              ? "Live Transcription Active"
              : sttStatus === "processing"
              ? "Evaluating Response..."
              : sttStatus === "reconnecting"
              ? "Reconnecting STT..."
              : sttStatus === "paused"
              ? "Mic Paused"
              : "STT Standby"}
          </span>
        </div>
      </header>

      {/* Stage */}
      <div className="flex flex-1 flex-col items-center px-3 sm:px-4 py-4 sm:py-5 overflow-y-auto min-h-0">
        {status === "connecting" ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-violet-500" />
            <p className="text-xs sm:text-sm font-medium text-center">Setting up your voice interview &amp; microphone…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full max-w-2xl gap-4 sm:gap-5">

            {/* Visual Voice Orbs */}
            <div className="flex w-full items-center justify-center gap-4 sm:gap-16 md:gap-32 py-2">
              <VoiceOrb
                level={aiLevel}
                speaking={aiSpeaking}
                label="AI Interviewer"
                sublabel={aiSpeaking ? "Speaking" : isProcessingResponse ? "Thinking..." : "Listening"}
                icon={Bot}
                accent="violet"
              />
              <VoiceOrb
                level={userLevel}
                speaking={userSpeaking}
                label="You"
                sublabel={userSpeaking ? "Speaking" : isMicActive ? "Mic Active" : "Mic Muted"}
                icon={User}
                accent="emerald"
              />
            </div>

            {/* Microphone Permission Warning Banner */}
            {micError && (
              <div className="w-full p-3 rounded-xl border border-red-500/40 bg-red-950/40 text-xs text-red-200 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 text-red-400 shrink-0" />
                  <span>{micError}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryMicrophone}
                  className="h-7 text-xs border-red-500/50 hover:bg-red-500/20 text-red-100 rounded-lg px-2.5 shrink-0"
                >
                  <RefreshCw className="size-3 mr-1" />
                  Retry Mic
                </Button>
              </div>
            )}

            {/* Conversation + Input — unified card */}
            <div className="w-full rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-2xl overflow-hidden">

              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/20">
                <span className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                  <MessageSquareText className="size-3.5 text-violet-400" />
                  Live Dialogue
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {chatLogs.length} messages
                </span>
              </div>

              {/* Chat messages */}
              <div
                ref={chatScrollRef}
                className="max-h-60 min-h-36 overflow-y-auto p-4 space-y-3"
                style={{ scrollbarWidth: "thin" }}
              >
                {chatLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8 italic">
                    Waiting for the first question…
                  </p>
                ) : (
                  chatLogs.map((log) => (
                    <div
                      key={log.id}
                      className={
                        "flex flex-col max-w-[84%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm space-y-1 " +
                        (log.sender === "ai"
                          ? "mr-auto bg-violet-950/60 border border-violet-500/20 text-violet-100 rounded-tl-sm"
                          : "ml-auto bg-emerald-950/60 border border-emerald-500/20 text-emerald-100 rounded-tr-sm")
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-[10px] opacity-60 flex items-center gap-1 uppercase tracking-wider">
                          {log.sender === "ai" ? (
                            <><Bot className="size-3 text-violet-400" /> AI Interviewer</>
                          ) : (
                            <><User className="size-3 text-emerald-400" /> You</>
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] opacity-40">{log.time}</span>
                          {log.sender === "ai" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => replayAiVoice(log)}
                              className="size-5 hover:bg-violet-500/20 rounded-full"
                              title="Replay Voice"
                            >
                              <Volume2 className="size-3 text-violet-400" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="leading-relaxed">{log.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* ── Input Bar ── */}
              <div className="border-t border-border/40 bg-background/40 px-3 py-3">
                <form onSubmit={handleManualSubmit} className="flex items-start gap-2">

                  {/* Mic toggle */}
                  <button
                    type="button"
                    onClick={toggleMicrophone}
                    title={isMicActive ? "Pause Microphone" : "Start Microphone"}
                    className={
                      "shrink-0 flex items-center justify-center size-9 rounded-xl transition-all duration-200 mt-0.5 " +
                      (isMicActive
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40"
                        : "bg-muted/60 hover:bg-muted text-muted-foreground border border-border/60")
                    }
                  >
                    {isMicActive ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                  </button>

                  {/* Editable input — always a textarea */}
                  <div className="relative flex-1 min-w-0">
                    <textarea
                      ref={textareaRef}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleManualSubmit(e as any);
                        }
                      }}
                      placeholder={
                        isProcessingResponse
                          ? "AI is thinking…"
                          : isMicActive
                          ? "Speak or type your answer…"
                          : "Type your answer… (Enter to send)"
                      }
                      disabled={isProcessingResponse}
                      rows={1}
                      className={
                        "w-full resize-none overflow-hidden min-h-9 px-3 py-2 rounded-lg border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 disabled:opacity-70 disabled:cursor-not-allowed leading-relaxed pr-7 transition-all duration-200 bg-transparent " +
                        (isMicActive && !isProcessingResponse
                          ? "border-emerald-500/40 focus:ring-emerald-500/20 focus:border-emerald-500/60 bg-emerald-950/10"
                          : "border-border/50 focus:ring-violet-500/30 focus:border-violet-500/40")
                      }
                    />

                    {/* Live interim ghost text shown below textarea when mic is active */}
                    {isMicActive && interimTranscript && (
                      <div className="mt-1 px-3 text-xs text-emerald-400/60 italic flex items-center gap-1.5 leading-relaxed">
                        <span className="flex gap-px shrink-0">
                          {[0, 0.1, 0.2].map((d, i) => (
                            <span
                              key={i}
                              className="inline-block w-0.5 h-2 rounded-full bg-emerald-400/60"
                              style={{ animation: `bounce 0.7s ease-in-out ${d}s infinite alternate` }}
                            />
                          ))}
                        </span>
                        <span className="truncate">{interimTranscript}</span>
                      </div>
                    )}

                    {/* Clear button */}
                    {(textInput || interimTranscript) && (
                      <button
                        type="button"
                        onClick={clearTextInput}
                        title="Clear"
                        className="absolute right-2 top-2 text-muted-foreground/50 hover:text-foreground transition-colors"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  {/* Send */}
                  <button
                    type="submit"
                    disabled={isProcessingResponse || (!textInput.trim() && !interimTranscript.trim())}
                    title="Send answer"
                    className="shrink-0 flex items-center justify-center size-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-35 disabled:cursor-not-allowed text-white transition-all duration-200 shadow-lg shadow-violet-900/30 mt-0.5"
                  >
                    {isProcessingResponse
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Send className="size-4" />}
                  </button>
                </form>
              </div>



            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-center px-6 py-3 border-t border-border/40 bg-card/20 shrink-0">
        <Button
          variant="destructive"
          size="default"
          onClick={endInterview}
          disabled={status === "ending"}
          className="gap-2 rounded-full px-6 text-xs font-semibold shadow-md"
        >
          {status === "ending" ? <Loader2 className="size-4 animate-spin" /> : <PhoneOff className="size-4" />}
          End &amp; Get Evaluation
        </Button>
      </footer>
    </main>
  );
}
