import { useState, useRef, useCallback, useEffect } from "react";

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  primeAudio: () => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Load voices eagerly on mount
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      voicesRef.current = voices;
      if (voices.length > 0) {
        const englishVoices = voices
          .filter(v => v.lang.startsWith('en'))
          .map(v => `${v.name} (${v.lang}) [local:${v.localService}]`)
          .join(', ');
        console.log(`[TTS] ${voices.length} voices loaded. English voices:`, englishVoices);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    let v = voicesRef.current;
    if (v.length === 0) {
      v = window.speechSynthesis.getVoices();
      voicesRef.current = v;
    }
    if (v.length === 0) return null;

    // Filter out "Online" synthetic Edge voices if running in Chrome/other browsers as they fail silently
    const isEdge = /Edg\//.test(navigator.userAgent);
    const usableVoices = isEdge
      ? v
      : v.filter(x => !x.name.includes("Online (Natural)") && !x.name.includes("Online"));

    const candidateList = usableVoices.length > 0 ? usableVoices : v;

    const pick =
      // 1st: Indian English (en-IN) local/native voices
      candidateList.find(x => (x.lang === "en-IN" || x.lang === "en_IN") && /priya|neerja|ravi|heera/i.test(x.name)) ||
      // 2nd: Any en-IN voice
      candidateList.find(x => x.lang === "en-IN" || x.lang === "en_IN") ||
      // 3rd: Standard clear female/male English voices (Zira, David, Mark, Aria, Google US)
      candidateList.find(x => x.lang.startsWith("en") && /zira|david|mark|aria|guy|google/i.test(x.name)) ||
      // 4th: Any English voice
      candidateList.find(x => x.lang.startsWith("en")) ||
      // Fallback: First voice in list
      candidateList[0] || null;

    if (pick) console.log(`[TTS] Selected voice: "${pick.name}" (${pick.lang}, local: ${pick.localService})`);
    return pick;
  }, []);

  const cleanup = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    setIsSpeaking(false);
    utteranceRef.current = null;
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
  }, []);

  // Unlock browser audio autoplay restrictions on user gesture
  const primeAudio = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.resume();
      const dummy = new SpeechSynthesisUtterance("");
      dummy.volume = 0;
      window.speechSynthesis.speak(dummy);
      console.log("[TTS] Audio primed on user interaction");
    } catch (e) {
      console.warn("[TTS] Could not prime audio:", e);
    }
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    console.log(`[TTS] speak() requested for text (${text.length} chars): "${text.substring(0, 60)}..."`);

    if (!('speechSynthesis' in window)) {
      console.error("[TTS] Error: speechSynthesis API not available in browser");
      return Promise.resolve();
    }

    // Cancel existing speech & ensure synthesis is not paused
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch (e) {
      console.warn("[TTS] Pre-speech cancel/resume warning:", e);
    }
    cleanup();

    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;

      // Chrome Workaround: brief 60ms timeout after cancel() before calling speak()
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.82; // Clear, easy-to-understand pace
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          const voice = pickVoice();
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
          } else {
            utterance.lang = 'en-US';
          }

          let hasStarted = false;

          utterance.onstart = () => {
            hasStarted = true;
            console.log("[TTS] ▶ Speech STARTED successfully");
            setIsSpeaking(true);
          };

          utterance.onend = () => {
            console.log("[TTS] ■ Speech ENDED normally");
            cleanup();
          };

          utterance.onerror = (event: any) => {
            console.warn(`[TTS] Speech event onerror: ${event.error}`);
            if (event.error !== 'canceled' && event.error !== 'interrupted') {
              cleanup();
            }
          };

          utteranceRef.current = utterance;

          // Safety net: if speech doesn't complete within 35 seconds, resolve cleanly
          safetyTimerRef.current = setTimeout(() => {
            console.warn("[TTS] ⏰ Speech safety timeout triggered (35s)");
            try { window.speechSynthesis.cancel(); } catch (e) {}
            cleanup();
          }, 35000);

          // Force resume and speak
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
          console.log(`[TTS] speechSynthesis.speak() invoked. speaking=${window.speechSynthesis.speaking}, pending=${window.speechSynthesis.pending}`);

          // Fallback check after 800ms: if onstart never fired and speaking is false, retry without custom voice
          setTimeout(() => {
            if (!hasStarted && !window.speechSynthesis.speaking && utteranceRef.current === utterance) {
              console.warn("[TTS] Speech didn't start with selected voice. Retrying with default system voice...");
              try {
                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();
                const fallbackUtterance = new SpeechSynthesisUtterance(text);
                fallbackUtterance.rate = 0.82;
                fallbackUtterance.lang = 'en-US';
                fallbackUtterance.onstart = () => setIsSpeaking(true);
                fallbackUtterance.onend = () => cleanup();
                fallbackUtterance.onerror = () => cleanup();
                utteranceRef.current = fallbackUtterance;
                window.speechSynthesis.speak(fallbackUtterance);
              } catch (retryErr) {
                console.error("[TTS] Fallback speak error:", retryErr);
                cleanup();
              }
            }
          }, 800);

        } catch (err) {
          console.error("[TTS] Exception during speak execution:", err);
          cleanup();
        }
      }, 60);
    });
  }, [pickVoice, cleanup]);

  const stop = useCallback(() => {
    console.log("[TTS] stop() called");
    try { window.speechSynthesis.cancel(); } catch (e) {}
    cleanup();
  }, [cleanup]);

  const pause = useCallback(() => {
    try { window.speechSynthesis.pause(); } catch (e) {}
    setIsSpeaking(false);
  }, []);

  const resume = useCallback(() => {
    try { window.speechSynthesis.resume(); } catch (e) {}
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
