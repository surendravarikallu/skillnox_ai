import { useState, useRef, useCallback } from "react";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

interface UseVoiceToTextReturn {
  transcript: string;
  isListening: boolean;
  connectionState: ConnectionState;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
  hardResetTranscript: () => void;
  error: string | null;
}

export function useVoiceToText(): UseVoiceToTextReturn {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastProcessedIndexRef = useRef<number>(0);
  const finalTranscriptRef = useRef<string>("");
  const autoRestartRef = useRef(false);

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    // If already connected/connecting, don't restart
    if (connectionState === "connected" || connectionState === "connecting") return;

    setConnectionState("connecting");

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    if ("maxAlternatives" in recognition) {
      (recognition as SpeechRecognition & { maxAlternatives?: number }).maxAlternatives = 3;
    }

    autoRestartRef.current = true;

    recognition.onstart = () => {
      setIsListening(true);
      setConnectionState("connected");
      setError(null);
    };

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

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;
        if (result.isFinal) {
          // Basic auto-capitalization and punctuation for final results
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
      setTranscript(fullTranscript);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      if (event.error !== 'aborted') {
        console.warn(`Speech recognition error: ${event.error}`);
        if (event.error === 'network') {
          setConnectionState("reconnecting");
        }
      }
    };

    recognition.onend = () => {
      // If we want to stay alive (autoRestart), we need to restart.
      // Best practice: Create a NEW instance to avoid memory/buffer issues with long sessions.
      if (autoRestartRef.current) {
        setConnectionState("reconnecting");
        // Small delay to prevent CPU thrashing if it fails instantly
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart recognition:", e);
            // If restart fails, we must give up or user has to click mic again
            setIsListening(false);
            setConnectionState("disconnected");
          }
        }, 100);
      } else {
        setIsListening(false);
        setConnectionState("disconnected");
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error("Failed to start recognition:", e);
      setError("Failed to start microphone");
      setConnectionState("disconnected");
    }
  }, [connectionState]);

  const stopListening = useCallback(() => {
    autoRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setConnectionState("disconnected");
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    finalTranscriptRef.current = "";
    lastProcessedIndexRef.current = 0;
  }, []);

  const hardResetTranscript = useCallback(() => {
    console.log("performing hard reset of transcript...");
    // 1. Stop current recognition and prevent auto-restart
    autoRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort(); // abort is faster than stop()
      } catch (e) {
        console.error("Error aborting recognition:", e);
      }
      recognitionRef.current = null;
    }

    // 2. Clear all state and refs
    setTranscript("");
    finalTranscriptRef.current = "";
    lastProcessedIndexRef.current = 0;
    setIsListening(false);
    setConnectionState("disconnected");

    // 3. The caller (InterviewRoom) can decide to call startListening() again if needed
    // or we can wait a tick and restart if it was active.
  }, []);

  return {
    transcript,
    isListening,
    connectionState,
    startListening,
    stopListening,
    clearTranscript,
    hardResetTranscript,
    error,
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


