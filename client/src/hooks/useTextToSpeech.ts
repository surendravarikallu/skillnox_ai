import { useState, useRef, useCallback, useEffect } from "react";

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(async (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Text-to-speech not supported in this browser'));
        return;
      }

      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to use a more natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') ||
        voice.name.includes('Natural') ||
        (voice.lang.startsWith('en') && voice.localService === false)
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
        resolve();
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        utteranceRef.current = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setIsSpeaking(false);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setIsSpeaking(true);
  }, []);

  // Load voices when component mounts
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Chrome needs voices to be loaded
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  return {
    isSpeaking,
    speak,
    stop,
    pause,
    resume,
  };
}

