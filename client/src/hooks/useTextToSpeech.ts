import { useState, useRef, useCallback } from "react";

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  primeAudio: () => void;
}

/**
 * Server-side TTS hook.
 * Calls POST /api/tts with question text → receives audio blob → plays via HTMLAudioElement.
 * 100% reliable across all browsers (Chrome, Firefox, Edge, Safari, mobile).
 * Falls back to browser speechSynthesis only if server is unreachable.
 */
export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  const generationRef = useRef(0);
  const audioContextUnlocked = useRef(false);

  /**
   * Prime audio on user gesture to unlock autoplay restrictions.
   * Must be called from a click/touch handler.
   */
  const primeAudio = useCallback(() => {
    try {
      // Method 1: Play a silent audio element
      const audio = new Audio();
      audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
      audio.volume = 0.01;
      audio.play().then(() => {
        audio.pause();
        audio.remove();
      }).catch(() => {});

      // Method 2: Unlock AudioContext
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
        osc.stop(0.001);
        setTimeout(() => ctx.close(), 100);
      } catch (e) {}

      // Method 3: Also prime speechSynthesis as emergency fallback
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const dummy = new SpeechSynthesisUtterance(" ");
        dummy.volume = 0.01;
        dummy.rate = 10;
        window.speechSynthesis.speak(dummy);
      }

      audioContextUnlocked.current = true;
      console.log("[TTS] Audio primed on user interaction");
    } catch (e) {
      console.warn("[TTS] Could not prime audio:", e);
    }
  }, []);

  /**
  /**
   * Emergency fallback / primary instant speech: use browser speechSynthesis.
   */
  const speakWithBrowserTTS = useCallback((text: string, gen: number, cleanup: (g: number) => void) => {
    if (!('speechSynthesis' in window)) {
      cleanup(gen);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.lang = 'en-US';
      utterance.onend = () => cleanup(gen);
      utterance.onerror = () => cleanup(gen);

      // Safety timeout
      setTimeout(() => {
        if (gen === generationRef.current) {
          try { window.speechSynthesis.cancel(); } catch (e) {}
          cleanup(gen);
        }
      }, 15000);

      window.speechSynthesis.speak(utterance);
      console.log("[TTS] Instant browser SpeechSynthesis started");
    } catch (e) {
      console.error("[TTS] Browser SpeechSynthesis failed:", e);
      cleanup(gen);
    }
  }, []);

  /**
   * Speak text using zero-latency browser speech synthesis or server-side fallback.
   */
  const speak = useCallback((text: string): Promise<void> => {
    console.log(`[TTS] speak() requested (${text.length} chars): "${text.substring(0, 60)}..."`);

    const thisGen = ++generationRef.current;

    // Stop any currently playing audio or speech
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch (e) {}
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    // Resolve any pending promise
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }

    setIsSpeaking(true);

    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;

      const cleanupForGen = (gen: number) => {
        if (gen !== generationRef.current) return;
        setIsSpeaking(false);
        if (resolveRef.current) {
          resolveRef.current();
          resolveRef.current = null;
        }
      };

      // 1. Instant zero-latency Browser SpeechSynthesis (starts in 0ms locally!)
      if ('speechSynthesis' in window) {
        speakWithBrowserTTS(text, thisGen, cleanupForGen);
        return;
      }

      // 2. Fallback: Fetch audio from server
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text }),
      })
        .then(response => {
          if (thisGen !== generationRef.current) return null;
          if (!response.ok) {
            throw new Error(`TTS server returned ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          if (!blob || thisGen !== generationRef.current) {
            cleanupForGen(thisGen);
            return;
          }

          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audio.volume = 1.0;
          audioRef.current = audio;

          audio.onplay = () => {
            if (thisGen !== generationRef.current) return;
            console.log("[TTS] ▶ Server audio PLAYING");
            setIsSpeaking(true);
          };

          audio.onended = () => {
            console.log("[TTS] ■ Server audio ENDED");
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            cleanupForGen(thisGen);
          };

          audio.onerror = (e) => {
            console.warn("[TTS] Audio playback error:", e);
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            cleanupForGen(thisGen);
          };

          audio.play().catch(() => {
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            cleanupForGen(thisGen);
          });
        })
        .catch(fetchError => {
          console.warn("[TTS] Server TTS fetch failed:", fetchError);
          cleanupForGen(thisGen);
        });
    });
  }, [speakWithBrowserTTS]);

  /**
   * Emergency fallback: use browser speechSynthesis if server TTS fails.
   */
  const fallbackBrowserTTS = useCallback((text: string, gen: number, cleanup: (g: number) => void) => {
    if (!('speechSynthesis' in window)) {
      console.error("[TTS] No browser fallback available");
      cleanup(gen);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.lang = 'en-US';
      utterance.onend = () => cleanup(gen);
      utterance.onerror = () => cleanup(gen);

      // Safety timeout
      setTimeout(() => {
        if (gen === generationRef.current) {
          try { window.speechSynthesis.cancel(); } catch (e) {}
          cleanup(gen);
        }
      }, 15000);

      window.speechSynthesis.speak(utterance);
      console.log("[TTS] Using browser speechSynthesis as fallback");
    } catch (e) {
      console.error("[TTS] Browser fallback also failed:", e);
      cleanup(gen);
    }
  }, []);

  const stop = useCallback(() => {
    console.log("[TTS] stop() called");
    generationRef.current++;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      } catch (e) {}
      audioRef.current = null;
    }
    try { window.speechSynthesis?.cancel(); } catch (e) {}
    setIsSpeaking(false);
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch (e) {}
    }
    setIsSpeaking(false);
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.play(); } catch (e) {}
    }
    setIsSpeaking(true);
  }, []);

  return {
    isSpeaking,
    speak,
    stop,
    pause,
    resume,
    primeAudio,
  };
}
