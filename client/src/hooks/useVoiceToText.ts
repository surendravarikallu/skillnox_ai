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
  getRecordedAudio: () => Promise<Blob | null>;
  setExternalStream: (stream: MediaStream | null) => void;
}

export function useVoiceToText(): UseVoiceToTextReturn {
  const [transcript, setTranscriptState] = useState("");
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const externalStreamRef = useRef<MediaStream | null>(null);
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
    "css": "CSS",
    // Common misheard roll number patterns (Indian college IDs)
    "23 jk": "23JK",
    "twenty three jk": "23JK",
    "23 j k": "23JK",
    "24 jk": "24JK",
    "twenty four jk": "24JK",
    "1a": "1A",
    "one a": "1A",
    "05 h4": "05H4",
    "05 i7": "05I7",
    "05 h 4": "05H4",
    "05 i 7": "05I7",
    "zero five": "05",
    "o five": "05",
    // Common tech terms said with Indian accent
    "my sequel": "MySQL",
    "no js": "Node.js",
    "express js": "Express.js",
    "next js": "Next.js",
    "react js": "React.js",
    "angular js": "AngularJS",
    "mongo db": "MongoDB",
    "no sequel": "NoSQL",
    "github": "GitHub",
    "gitlab": "GitLab",
    "vs code": "VS Code",
    "c++": "C++",
    "c sharp": "C#"
  };

  /**
   * Normalize roll numbers spoken as separate characters back into
   * a contiguous alphanumeric string. Handles patterns like:
   *   "23 JK 1A 05 H4" → "23JK1A05H4"
   *   "twenty three JK one A zero five I seven" → "23JK1A05I7"
   */
  const normalizeRollNumbers = (text: string): string => {
    // Pattern: sequences of 2-digit numbers and 1-2 char alpha groups that look like roll numbers
    // Match "23 JK 1A 05 H4" style fragmented roll numbers
    return text.replace(
      /\b(2[34])\s*([Jj][Kk])\s*(1\s*[Aa])\s*(0\s*[0-9])\s*([A-Za-z]\s*[0-9A-Za-z]?)\b/g,
      (_, yr, jk, oneA, twoDigit, tail) => {
        return (yr + jk + oneA + twoDigit + tail).replace(/\s+/g, '').toUpperCase();
      }
    );
  };

  const cleanupTranscript = (text: string) => {
    let cleaned = text;
    // 1. Apply term map substitutions
    Object.entries(TECH_TERM_MAP).forEach(([misheard, correct]) => {
      const regex = new RegExp(`\\b${misheard}\\b`, 'gi');
      cleaned = cleaned.replace(regex, correct);
    });
    // 2. Normalize fragmented roll numbers
    cleaned = normalizeRollNumbers(cleaned);
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

    // Clean up existing instance (do NOT call .abort() on ended instances as it deadlocks Chrome IPC)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onstart = null;
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
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

      let currentFinal = "";
      let currentInterim = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;
        if (result.isFinal) {
          currentFinal += transcriptText + " ";
        } else {
          currentInterim += transcriptText + " ";
        }
      }

      const combined = (finalTranscriptRef.current + " " + currentFinal + " " + currentInterim).replace(/\s+/g, ' ').trim();
      const fullTranscript = cleanupTranscript(combined);
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
        // Paused for AI speech – don't restart until resumeListening is called
        // Keep isListening FALSE so watchdog doesn't interfere
        setIsListening(false);
        return;
      }

      if (autoRestartRef.current) {
        consecutiveEmptyRestartsRef.current++;
        noSpeechRestartRef.current = false;

        // CRITICAL: Keep isListening=true during fast-restart so:
        //  1. UI doesn't flicker the "Start Listening" button
        //  2. Watchdog doesn't fire a duplicate restart racing with this one
        // We only set it false if we're truly stopping.
        // setIsListening stays true – will be confirmed by onstart of new instance

        setConnectionState("reconnecting");
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (autoRestartRef.current && !pausedRef.current) {
            createAndStartRecognition();
          } else {
            // We were stopped while waiting – now truly set listening to false
            setIsListening(false);
            setConnectionState("disconnected");
          }
        }, 50); // 50ms instant restart – Chrome needs a micro-tick between stop & start
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

  const startMediaRecorder = useCallback(async () => {
    try {
      // If already recording, don't restart or clear chunks
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        return;
      }
      // If recorder exists but is paused, just resume it (preserving chunks)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
        mediaRecorderRef.current.resume();
        console.log("[VoiceToText] MediaRecorder resumed (chunks preserved)");
        return;
      }
      // Fresh recording session — clear any stale chunks
      audioChunksRef.current = [];

      // Priority 1: Reuse audio tracks from shared camera/mic stream
      if (externalStreamRef.current) {
        const extAudioTracks = externalStreamRef.current.getAudioTracks();
        if (extAudioTracks.length > 0 && extAudioTracks.every(t => t.readyState === 'live')) {
          mediaStreamRef.current = new MediaStream(extAudioTracks);
          console.log("[VoiceToText] Using shared camera microphone stream");
        }
      }

      // Priority 2: Validate existing stream
      if (mediaStreamRef.current) {
        const tracks = mediaStreamRef.current.getAudioTracks();
        if (tracks.length === 0 || tracks.some(t => t.readyState === 'ended')) {
          console.log("[VoiceToText] Audio stream track ended, acquiring new stream");
          mediaStreamRef.current = null;
        }
      }

      // Priority 3: Acquire dedicated audio stream if no shared stream
      if (!mediaStreamRef.current) {
        console.log("[VoiceToText] Acquiring dedicated getUserMedia({ audio: true }) stream");
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      let options: MediaRecorderOptions = { audioBitsPerSecond: 32000 };
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4';
        }
      }
      const recorder = new MediaRecorder(mediaStreamRef.current, options);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.start(500); // 500ms chunks
      mediaRecorderRef.current = recorder;
      console.log("[VoiceToText] MediaRecorder started fresh with 32kbps Opus compression");
    } catch (e) {
      console.warn("[VoiceToText] Could not start MediaRecorder:", e);
    }
  }, []);

  const stopMediaRecorder = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          const recorder = mediaRecorderRef.current;
          // Wait for the 'stop' event which fires AFTER final 'dataavailable'
          recorder.addEventListener('stop', () => resolve(), { once: true });
          recorder.stop();
          // Safety timeout in case 'stop' event doesn't fire
          setTimeout(resolve, 500);
        } catch (e) {
          resolve();
        }
      } else {
        resolve();
      }
    });
  }, []);

  const getRecordedAudio = useCallback(async (): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current;

    // Nothing to extract if recorder is not active
    if (!recorder || recorder.state === "inactive") {
      console.warn("[VoiceToText] getRecordedAudio: no active recorder, returning null");
      return null;
    }

    const mimeType = recorder.mimeType || "audio/webm";

    // STOP the recorder cleanly — this guarantees Chrome fires the final
    // 'dataavailable' event with ALL remaining buffered audio, followed by 'stop'.
    // This is the ONLY reliable way to flush all audio data.
    await new Promise<void>((resolve) => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };

      recorder.addEventListener('stop', done, { once: true });

      try {
        recorder.stop();
      } catch (e) {
        console.warn("[VoiceToText] getRecordedAudio: recorder.stop() error:", e);
        done();
        return;
      }

      // Safety timeout — if 'stop' event never fires (Chrome glitch), resolve anyway
      setTimeout(done, 300);
    });

    // At this point, all ondataavailable events have fired and chunks are complete
    const chunks = audioChunksRef.current;
    console.log(`[VoiceToText] getRecordedAudio: ${chunks.length} chunks collected`);

    if (chunks.length === 0) {
      // No audio data — immediately start fresh recorder for next question
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      startMediaRecorder();
      return null;
    }

    const blob = new Blob(chunks, { type: mimeType });
    console.log(`[VoiceToText] getRecordedAudio: blob created (${blob.size} bytes, ${mimeType})`);

    // Clear chunks and null out old recorder reference
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;

    // Immediately start a fresh MediaRecorder for the NEXT question
    await startMediaRecorder();

    return blob;
  }, [startMediaRecorder]);

  const startListening = useCallback(() => {
    setError(null);
    pausedRef.current = false;
    autoRestartRef.current = true;
    consecutiveEmptyRestartsRef.current = 0;
    restartDelayRef.current = 300;
    setConnectionState("connecting");
    startMediaRecorder();
    createAndStartRecognition();
  }, [createAndStartRecognition, startMediaRecorder]);

  const stopListening = useCallback(() => {
    autoRestartRef.current = false;
    pausedRef.current = false;
    clearRestartTimer();
    stopMediaRecorder();
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
  }, [stopMediaRecorder]);

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
    startMediaRecorder();
    createAndStartRecognition();
  }, [createAndStartRecognition, startMediaRecorder]);

  const clearTranscript = useCallback(() => {
    setTranscriptState("");
    finalTranscriptRef.current = "";
    lastProcessedIndexRef.current = 0;
    // NOTE: Audio chunks and MediaRecorder are managed by getRecordedAudio()
    // which does a proper stop-flush-restart cycle. Do NOT clear chunks here
    // to avoid race conditions with the recorder's ondataavailable events.
  }, []);

  const hardResetTranscript = useCallback(() => {
    // Fully stop and clear everything
    autoRestartRef.current = false;
    pausedRef.current = false;
    clearRestartTimer();
    if (recognitionRef.current) {
      try {
        // Detach all handlers FIRST, then stop (not abort – avoids Chrome IPC deadlock)
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.stop();
      } catch (e) {
        // ignore – instance may already be stopped
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

  // 3-Second Active Watchdog Heartbeat for Chrome Auto-Recovery
  // Only fires if isListening is false AND autoRestart is true AND we're not paused.
  // Since onend now keeps isListening=true during fast-restart, this only fires
  // when Chrome truly dropped the connection silently (no onend fired at all).
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (watchdogRef.current) clearInterval(watchdogRef.current);
    watchdogRef.current = setInterval(() => {
      if (autoRestartRef.current && !pausedRef.current && !isListening && !restartTimerRef.current) {
        console.log("[VoiceToText Watchdog] Mic connection lost silently. Auto-reviving...");
        try {
          createAndStartRecognition();
        } catch (e) {
          // ignore
        }
      }
    }, 3000);

    return () => {
      if (watchdogRef.current) clearInterval(watchdogRef.current);
    };
  }, [isListening, createAndStartRecognition]);

  // Overall hook unmount cleanup
  useEffect(() => {
    return () => {
      autoRestartRef.current = false;
      pausedRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onstart = null;
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
        mediaRecorderRef.current = null;
      }
    };
  }, []);

  const setExternalStream = useCallback((stream: MediaStream | null) => {
    externalStreamRef.current = stream;
    console.log(`[VoiceToText] External stream ${stream ? 'SET' : 'CLEARED'} (${stream?.getAudioTracks().length || 0} audio tracks)`);
  }, []);

  return {
    transcript,
    isListening,
    isSupported: true,
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
    getRecordedAudio,
    setExternalStream,
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
