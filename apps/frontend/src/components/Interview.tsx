import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Bot, Loader2, PhoneOff, User, Send, Volume2, MessageSquareText, Mic, MicOff, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { VoiceOrb } from "./VoiceOrb";
import { toast } from "sonner";
import {
  fetchDeepgramKey,
  initiateInterviewSession,
  sendUserSpeechAndGetResponse,
  correctTranscript,
  type VoiceResponse,
} from "../services/interviewService";

type Status = "connecting" | "live" | "ending";

interface ChatTurn {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
  audioBase64?: string | null; // stored so replay uses Deepgram audio, not browser TTS
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
  // True while the AI correction pass is running (brief, before submit)
  const [isCorrectingTranscript, setIsCorrectingTranscript] = useState(false);
  const [chatLogs, setChatLogs] = useState<ChatTurn[]>([]);
  const [isMicActive, setIsMicActive] = useState(true);

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
  // Ref for the manual-type textarea — used for auto-grow
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  function startNativeSpeechRecognition() {
    if (hasDeepgramRef.current) return; // Never run native STT if Deepgram is active
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Do NOT stop or restart if already running cleanly
    if (recognitionRef.current) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        // Ignore any transcript while AI is speaking to avoid picking up AI audio
        if (isAiSpeakingRef.current) return;

        let newFinalText = "";
        let interimText = "";

        // IMPORTANT: start from event.resultIndex, NOT 0.
        // event.results is a live list of ALL results; looping from 0 re-processes old finals.
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            newFinalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }

        if (newFinalText.trim()) {
          setTextInput((prev) => {
            const base = prev.trim();
            return base ? `${base} ${newFinalText.trim()}` : newFinalText.trim();
          });
          setInterimTranscript("");
        }
        // Always update interim (even if empty, to clear stale ghost text)
        setInterimTranscript(interimText);
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        // Do NOT restart if AI is speaking or mic was turned off
        if (isListeningRef.current && !isAiSpeakingRef.current) {
          setTimeout(() => {
            if (isListeningRef.current && !isAiSpeakingRef.current) {
              startNativeSpeechRecognition();
            }
          }, 300);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === "not-allowed") {
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

        // Capture candidate microphone
        try {
          const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (cancelled) {
            ms.getTracks().forEach((t) => t.stop());
            return;
          }
          userStreamRef.current = ms;
          userMeterGetter = createLevelMeter(audioCtx, ms);
        } catch (micErr) {
          console.warn("Microphone access permission notice:", micErr);
        }

        // Fetch Deepgram Key for live STT WebSocket
        let hasDeepgramSTT = false;
        try {
          const { key } = await fetchDeepgramKey();
          if (key && userStreamRef.current) {
            // no_delay=true → emit interim results immediately; utterance_end_ms=1000 tightens silence detection
            const socket = new WebSocket("wss://api.deepgram.com/v1/listen?punctuate=true&interim_results=true&no_delay=true&utterance_end_ms=1000", [
              "token",
              key,
            ]);
            socketRef.current = socket;

            socket.onopen = () => {
              hasDeepgramSTT = true;
              hasDeepgramRef.current = true;
              const mediaRecorder = new MediaRecorder(userStreamRef.current!, { mimeType: "audio/webm" });
              recorderRef.current = mediaRecorder;
              // 80ms chunks → audio reaches Deepgram ~4x faster than the old 300ms
              mediaRecorder.start(80);
              mediaRecorder.addEventListener("dataavailable", (event) => {
                if (socket.readyState === WebSocket.OPEN && event.data.size > 0) {
                  socket.send(event.data);
                }
              });
            };

            socket.onmessage = (message) => {
              try {
                // Ignore any transcript while AI is speaking to avoid picking up AI audio
                if (isAiSpeakingRef.current) return;
                const received = JSON.parse(message.data);
                const transcript = received.channel?.alternatives[0]?.transcript;
                if (!transcript) return;

                const isFinal = received.is_final === true;

                if (isFinal) {
                  // Commit final words into textInput and clear the live interim caption
                  if (transcript.trim()) {
                    setTextInput((prev) => {
                      const base = prev.trim();
                      return base ? `${base} ${transcript.trim()}` : transcript.trim();
                    });
                  }
                  setInterimTranscript("");
                } else {
                  // Show live interim words as ghost caption text
                  setInterimTranscript(transcript);
                }
              } catch (e) {}
            };
          }
        } catch (dgErr) {
          console.warn("Deepgram STT WebSocket fallback");
        }

        // Start Native Web Speech Recognition fallback if Deepgram key is not configured
        if (!hasDeepgramSTT) {
          startNativeSpeechRecognition();
        }

        // Initiate AI Voice Session
        const initData = await initiateInterviewSession(interviewId);
        if (cancelled) return;

        setStatus("live");
        if (initData.aiMessage) {
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
        toast.error("Failed to initialize voice session.");
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
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
      toast.info("Microphone paused.");
    } else {
      isListeningRef.current = true;
      setIsMicActive(true);
      startNativeSpeechRecognition();
      toast.success("Microphone listening active.");
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
    // Stop native recognition while AI speaks so it doesn't transcribe AI audio
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }

  function resumeRecognitionAfterAiSpeech() {
    isAiSpeakingRef.current = false;
    // Restart native recognition after AI finishes speaking (only if mic is active)
    if (isListeningRef.current) {
      setTimeout(() => {
        if (!isAiSpeakingRef.current && isListeningRef.current) {
          startNativeSpeechRecognition();
        }
      }, 400);
    }
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

      utterance.onend = utterance.onerror = () => {
        stopAllAudio();
        resumeRecognitionAfterAiSpeech();
      };

      window.speechSynthesis.speak(utterance);
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

      audioCtxRef.current.decodeAudioData(bytes.buffer, (buffer) => {
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
      });
    } catch (e) {
      console.error("Audio playback error:", e);
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

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fullText = [textInput, interimTranscript].filter(Boolean).join(" ").trim();
    if (!fullText || isProcessingResponse || isCorrectingTranscript) return;

    // Run AI correction then submit
    setIsCorrectingTranscript(true);
    correctTranscript(fullText).then((corrected) => {
      setIsCorrectingTranscript(false);
      // Show corrected text in the box briefly before sending
      if (corrected !== fullText) {
        setTextInput(corrected);
        toast.success(`Auto-corrected: "${fullText}" → "${corrected}"`, { duration: 3000 });
      }
      handleUserSpeechFinal(corrected);
    });
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
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
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
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-border/40 bg-card/20 backdrop-blur shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium">
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

      </header>

      {/* Stage */}
      <div className="flex flex-1 flex-col items-center px-4 py-5 overflow-y-auto min-h-0">
        {status === "connecting" ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-violet-500" />
            <p className="text-sm font-medium">Setting up your voice interview &amp; microphone…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full max-w-2xl gap-5">

            {/* Visual Voice Orbs */}
            <div className="flex w-full items-center justify-center gap-20 sm:gap-32">
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
                        isCorrectingTranscript
                          ? "Correcting transcript…"
                          : isProcessingResponse
                          ? "AI is thinking…"
                          : isMicActive
                          ? "Speak or type your answer…"
                          : "Type your answer… (Enter to send)"
                      }
                      disabled={isProcessingResponse || isCorrectingTranscript}
                      rows={1}
                      className={
                        "w-full resize-none overflow-hidden min-h-9 px-3 py-2 rounded-lg border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 disabled:opacity-70 disabled:cursor-not-allowed leading-relaxed pr-7 transition-all duration-200 bg-transparent " +
                        (isCorrectingTranscript
                          ? "border-violet-500/50 ring-2 ring-violet-500/20 bg-violet-950/10"
                          : isMicActive && !isProcessingResponse
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
                    disabled={isProcessingResponse || isCorrectingTranscript || (!textInput.trim() && !interimTranscript.trim())}
                    title={isCorrectingTranscript ? "Correcting…" : "Send answer"}
                    className="shrink-0 flex items-center justify-center size-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-35 disabled:cursor-not-allowed text-white transition-all duration-200 shadow-lg shadow-violet-900/30 mt-0.5"
                  >
                    {isProcessingResponse || isCorrectingTranscript
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
