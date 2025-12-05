import { useState, useRef, useCallback } from "react";

interface UseVoiceToTextReturn {
  transcript: string;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
  error: string | null;
}

export function useVoiceToText(): UseVoiceToTextReturn {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
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

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    // Use an English variant that better matches common Indian accents for higher accuracy
    // (e.g. "am I audible" instead of mishearing as "am I abdul").
    recognition.lang = "en-IN";
    if ("maxAlternatives" in recognition) {
      (recognition as SpeechRecognition & { maxAlternatives?: number }).maxAlternatives = 1;
    }

    autoRestartRef.current = true;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      // Reset index for the new SpeechRecognition session but keep
      // the existing finalTranscriptRef so previous speech isn't lost
      // when the mic is stopped and started again for the same answer.
      lastProcessedIndexRef.current = 0;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let newFinalTranscript = "";

      // Process only new results (starting from last processed index)
      for (let i = Math.max(event.resultIndex, lastProcessedIndexRef.current); i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;
        
        if (result.isFinal) {
          // Only add final results that we haven't processed yet
          if (i >= lastProcessedIndexRef.current) {
            newFinalTranscript += transcriptText + " ";
            lastProcessedIndexRef.current = i + 1;
          }
        } else {
          // Interim results - replace, don't append
          interimTranscript = transcriptText;
        }
      }

      // Update final transcript only with new final results
      if (newFinalTranscript) {
        finalTranscriptRef.current += newFinalTranscript;
      }

      // Combine final transcript with current interim result
      setTranscript(finalTranscriptRef.current + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (autoRestartRef.current) {
        try {
          recognition.start();
        } catch (restartError) {
          console.warn("Speech recognition restart failed:", restartError);
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      autoRestartRef.current = false;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    finalTranscriptRef.current = "";
    lastProcessedIndexRef.current = 0;
  }, []);

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    clearTranscript,
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


