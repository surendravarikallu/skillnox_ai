import { useState, useRef, useCallback, useEffect } from "react";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";
export type MicTestResult = "untested" | "testing" | "pass" | "fail";

interface UseVoiceToTextReturn {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  connectionState: ConnectionState;
  startListening: () => void;
  stopListening: () => void;
  pauseListening: () => void;
  resumeListening: () => void;
  clearTranscript: () => void;
  hardResetTranscript: () => void;
  setTranscript: (text: string) => void;
  error: string | null;
  micTestResult: MicTestResult;
  testMicrophone: () => Promise<boolean>;
}

export function useVoiceToText(): UseVoiceToTextReturn {
  const [transcript, setTranscriptState] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [micTestResult, setMicTestResult] = useState<MicTestResult>("untested");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastProcessedIndexRef = useRef<number>(0);
  const finalTranscriptRef = useRef<string>("");
  const autoRestartRef = useRef(false);
  const pausedRef = useRef(false);
  const restartDelayRef = useRef(300);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks how many consecutive restarts have fired without any speech result in between.
  // This prevents an infinite restart loop when the mic is connected but silent.
  const consecutiveEmptyRestartsRef = useRef(0);
  const MAX_EMPTY_RESTARTS = 60; // after 60 silent restarts (~3+ min), still keep going but back off
  const noSpeechRestartRef = useRef(false); // Flag for fast restart on no-speech

  const TECH_TERM_MAP: Record<string, string> = {
    "re act": "React",
    "knowed": "Node",
    "node jess": "Node.js",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "pay thon": "Python",
    "sequel": "SQL",
    "post grass": "PostgreSQL",
    "mongodeebee": "MongoDB",
    "express jess": "Express.js",
    "skill knocks": "Skillnox",
    "get hub": "GitHub",
    "get lab": "GitLab",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "aws": "AWS",
    "azure": "Azure",
    "api": "API",
    "rest api": "REST API",
    "json": "JSON",
    "html": "HTML",
    "css": "CSS"
  };

  const cleanupTranscript = (text: string) => {
    let cleaned = text;
    Object.entries(TECH_TERM_MAP).forEach(([misheard, correct]) => {
      const regex = new RegExp(`\\b${misheard}\\b`, 'gi');
      cleaned = cleaned.replace(regex, correct);
    });
    return cleaned;
  };

  const clearRestartTimer = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const createAndStartRecognition = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Speech recognition not supported in this browser. Please use Google Chrome.");
      setConnectionState("disconnected");
      setIsListening(false);
      return;
    }

    // Clean up existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    if ("maxAlternatives" in recognition) {
      (recognition as any).maxAlternatives = 1;
    }

    recognition.onstart = () => {
      setIsListening(true);
      setConnectionState("connected");
      setError(null);
      // Reset backoff on successful start
      restartDelayRef.current = 300;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Got actual speech data – reset the empty-restart counter
      consecutiveEmptyRestartsRef.current = 0;
      restartDelayRef.current = 300;

      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;
        if (result.isFinal) {
          let processed = transcriptText.trim();
          if (processed.length > 0) {
            processed = processed.charAt(0).toUpperCase() + processed.slice(1);
            if (!/[.!?]$/.test(processed)) processed += ".";
            finalTranscriptRef.current += processed + " ";
          }
        } else {
          interimTranscript += transcriptText;
        }
      }
      const cleanFinal = finalTranscriptRef.current.replace(/\s+/g, ' ').trim();
      const rawFull = (cleanFinal + " " + interimTranscript).trim();
      const fullTranscript = cleanupTranscript(rawFull);
      setTranscriptState(fullTranscript);
    };

    recognition.onerror = (event: any) => {
      const errType = event.error;
      console.warn(`[VoiceToText] Speech recognition error: ${errType}`);

      if (errType === 'not-allowed' || errType === 'service-not-allowed') {
        // Fatal: user denied mic permission
        autoRestartRef.current = false;
        pausedRef.current = false;
        setError("Microphone access denied. Please click the camera/microphone icon in your browser address bar and allow mic access, then click 'Start Listening'.");
        setConnectionState("disconnected");
        setIsListening(false);
      } else if (errType === 'audio-capture') {
        // Fatal: no mic hardware
        autoRestartRef.current = false;
        pausedRef.current = false;
        setError("No microphone detected. Please connect a microphone and click 'Start Listening'.");
        setConnectionState("disconnected");
        setIsListening(false);
      } else if (errType === 'network') {
        // Transient: network issue, will auto-restart via onend
        setError("Speech recognition network issue. Reconnecting...");
        setConnectionState("reconnecting");
      } else if (errType === 'no-speech') {
        // Chrome fires this after ~5-10s of silence. NOT an error – restart FAST.
        // Use a minimal delay (100ms) instead of exponential backoff so mic recovers quickly.
        noSpeechRestartRef.current = true;
        console.log("[VoiceToText] no-speech detected, will fast-restart in 100ms");
      } else if (errType === 'aborted') {
        // We called .abort() ourselves, ignore
      } else {
        setError(`Mic error: ${errType}. Reconnecting...`);
      }
    };

    recognition.onend = () => {
      console.log(`[VoiceToText] recognition ended. autoRestart=${autoRestartRef.current}, paused=${pausedRef.current}`);

      if (pausedRef.current) {
        // Paused for AI speech – keep state as "connected" so UI doesn't flicker
        // but don't restart until resumeListening is called
        setIsListening(false);
        return;
      }

      if (autoRestartRef.current) {
        consecutiveEmptyRestartsRef.current++;

        // If this was a no-speech restart, use minimal 100ms delay for instant recovery
        let delay: number;
        if (noSpeechRestartRef.current) {
          delay = 100;
          noSpeechRestartRef.current = false;
        } else {
          // Exponential backoff: 300ms → 600ms → 1200ms → cap at 1500ms (was 3000ms)
          delay = Math.min(restartDelayRef.current, 1500);
          restartDelayRef.current = Math.min(delay * 2, 1500);
        }

        // Even after many empty restarts, keep trying (the student may start speaking later)
        // but use the max backoff delay
        if (consecutiveEmptyRestartsRef.current > MAX_EMPTY_RESTARTS) {
          restartDelayRef.current = 1500;
        }

        setConnectionState("reconnecting");
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (autoRestartRef.current && !pausedRef.current) {
            createAndStartRecognition();
          }
        }, delay);
      } else {
        setIsListening(false);
        setConnectionState("disconnected");
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e: any) {
      // "Failed to execute 'start' on SpeechRecognition: recognition has already started"
      if (e?.message?.includes('already started')) {
        console.warn("[VoiceToText] Recognition already running, ignoring duplicate start");
        return;
      }
      console.error("[VoiceToText] Failed to start recognition:", e);
      setError("Failed to start microphone. Please refresh the page and try again.");
      setConnectionState("disconnected");
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    pausedRef.current = false;
    autoRestartRef.current = true;
    consecutiveEmptyRestartsRef.current = 0;
    restartDelayRef.current = 300;
    setConnectionState("connecting");
    createAndStartRecognition();
  }, [createAndStartRecognition]);

  const stopListening = useCallback(() => {
    autoRestartRef.current = false;
    pausedRef.current = false;
    clearRestartTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null; // prevent auto-restart from firing
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setConnectionState("disconnected");
  }, []);

  /**
   * Temporarily pause speech recognition (e.g. while AI is speaking).
   * Does NOT clear autoRestartRef – call resumeListening() to restart.
   */
  const pauseListening = useCallback(() => {
    pausedRef.current = true;
    clearRestartTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
  }, []);

  /**
   * Resume speech recognition after a pause.
   */
  const resumeListening = useCallback(() => {
    pausedRef.current = false;
    autoRestartRef.current = true;
    consecutiveEmptyRestartsRef.current = 0;
    restartDelayRef.current = 300;
    setConnectionState("connecting");
    createAndStartRecognition();
  }, [createAndStartRecognition]);

  const clearTranscript = useCallback(() => {
    setTranscriptState("");
    finalTranscriptRef.current = "";
    lastProcessedIndexRef.current = 0;
  }, []);

  const hardResetTranscript = useCallback(() => {
    // Fully stop and clear everything
    autoRestartRef.current = false;
    pausedRef.current = false;
    clearRestartTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {
        console.error("Error aborting recognition:", e);
      }
      recognitionRef.current = null;
    }

    setTranscriptState("");
    finalTranscriptRef.current = "";
    lastProcessedIndexRef.current = 0;
    consecutiveEmptyRestartsRef.current = 0;
    restartDelayRef.current = 300;
    setIsListening(false);
    setConnectionState("disconnected");
    noSpeechRestartRef.current = false;
  }, []);

  const isSupported = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const setManualTranscript = useCallback((text: string) => {
    setTranscriptState(text);
    finalTranscriptRef.current = text;
  }, []);

  /**
   * Test microphone hardware by checking actual audio signal levels.
   * Returns true if real audio is detected (not just silence).
   * Uses AudioContext + AnalyserNode to measure volume over 3 seconds.
   */
  const testMicrophone = useCallback(async (): Promise<boolean> => {
    setMicTestResult("testing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let maxLevel = 0;
      const testDuration = 3000; // 3 seconds
      const checkInterval = 100; // check every 100ms
      let elapsed = 0;

      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
          if (avg > maxLevel) maxLevel = avg;
          elapsed += checkInterval;
          if (elapsed >= testDuration) {
            clearInterval(interval);
            resolve();
          }
        }, checkInterval);
      });

      // Cleanup
      stream.getTracks().forEach(track => track.stop());
      await audioContext.close();

      // A maxLevel > 5 means real audio was captured (not just electrical noise)
      const passed = maxLevel > 5;
      setMicTestResult(passed ? "pass" : "fail");
      if (!passed) {
        setError("Microphone detected but no audio captured. Please check your microphone is not muted and try speaking louder.");
      } else {
        setError(null);
      }
      console.log(`[VoiceToText] Mic test: maxLevel=${maxLevel.toFixed(1)}, result=${passed ? 'PASS' : 'FAIL'}`);
      return passed;
    } catch (e: any) {
      console.error("[VoiceToText] Mic test failed:", e);
      setMicTestResult("fail");
      if (e?.name === 'NotAllowedError') {
        setError("Microphone access denied. Please allow microphone permission in your browser settings.");
      } else if (e?.name === 'NotFoundError') {
        setError("No microphone detected. Please connect a microphone device.");
      } else {
        setError(`Microphone test failed: ${e?.message || 'Unknown error'}`);
      }
      return false;
    }
  }, []);

  // Auto-restart mic when page becomes visible again (tab switch back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoRestartRef.current && !pausedRef.current) {
        console.log("[VoiceToText] Tab became visible, restarting recognition");
        consecutiveEmptyRestartsRef.current = 0;
        restartDelayRef.current = 300;
        createAndStartRecognition();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [createAndStartRecognition]);

  return {
    transcript,
    isListening,
    isSupported,
    connectionState,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    clearTranscript,
    hardResetTranscript,
    setTranscript: setManualTranscript,
    error,
    micTestResult,
    testMicrophone,
  };
}

// Type definitions for Speech Recognition API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}
