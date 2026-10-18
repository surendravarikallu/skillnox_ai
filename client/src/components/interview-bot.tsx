import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Brain, Cpu, Volume2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type BotAgentState = "idle" | "listening" | "speaking" | "thinking";

interface InterviewBotProps {
  state: BotAgentState;
  candidateTranscript?: string;
  currentTopic?: string;
  bloomDecision?: "PROBE" | "HINT" | "ADVANCE" | "CONCLUSION";
  audioLevel?: number; // 0 to 100
  className?: string;
}

export function InterviewBot({
  state,
  candidateTranscript = "",
  currentTopic = "Core Engineering Principles",
  bloomDecision = "PROBE",
  audioLevel = 0,
  className,
}: InterviewBotProps) {
  // Blinking cycle
  const [isBlinking, setIsBlinking] = useState(false);
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 3800);
    return () => clearInterval(blinkInterval);
  }, []);

  // Micro-nodding rhythm while candidate speaks
  const [nodOffset, setNodOffset] = useState(0);
  useEffect(() => {
    if (state !== "listening") {
      setNodOffset(0);
      return;
    }
    const nodInterval = setInterval(() => {
      setNodOffset((prev) => (prev === 0 ? 3 : 0));
    }, 950);
    return () => clearInterval(nodInterval);
  }, [state]);

  // Extract real-time recognized concepts from candidate transcript
  const detectedKeywords = useMemo(() => {
    if (!candidateTranscript) return [];
    const techLexicon = [
      "react", "node", "typescript", "javascript", "python", "sql", "postgresql",
      "database", "indexing", "b-tree", "vtable", "dispatch", "polymorphism",
      "inheritance", "abstraction", "complexity", "o(1)", "o(n)", "o(log n)",
      "cache", "redis", "latency", "throughput", "concurrency", "thread",
      "rest", "api", "architecture", "microservice", "docker", "kubernetes",
      "normalization", "join", "foreign key", "primary key", "star schema",
      "star method", "leadership", "optimization", "scalability", "pipeline"
    ];

    const lower = candidateTranscript.toLowerCase();
    const found = techLexicon.filter(term => lower.includes(term));
    return found.slice(-3); // show last 3 detected keywords
  }, [candidateTranscript]);

  const spokenWordsCount = useMemo(() => {
    return candidateTranscript.trim().split(/\s+/).filter(Boolean).length;
  }, [candidateTranscript]);

  return (
    <div className={cn("relative flex flex-col items-center justify-center select-none", className)}>
      {/* Outer Acoustic Aura (reactive concentric rings) */}
      <div className="relative w-72 h-72 flex items-center justify-center">
        {/* Ring 1 - Outer Halo */}
        <motion.div
          animate={{
            scale: state === "listening" ? [1, 1.14 + (audioLevel / 250), 1] :
                   state === "speaking" ? [1, 1.18, 1] : [1, 1.05, 1],
            opacity: state === "listening" ? [0.15, 0.35, 0.15] :
                     state === "speaking" ? [0.25, 0.5, 0.25] : [0.08, 0.15, 0.08],
          }}
          transition={{ duration: state === "listening" ? 1.4 : state === "speaking" ? 1.1 : 3, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "absolute inset-0 rounded-full border",
            state === "listening" ? "border-cyan-400/30 bg-cyan-500/5 shadow-[0_0_40px_rgba(6,182,212,0.15)]" :
            state === "speaking" ? "border-indigo-500/40 bg-indigo-500/10 shadow-[0_0_50px_rgba(79,70,229,0.25)]" :
            state === "thinking" ? "border-amber-400/40 bg-amber-500/5 shadow-[0_0_40px_rgba(245,158,11,0.2)]" :
            "border-slate-700/30 bg-slate-800/5"
          )}
        />

        {/* Ring 2 - Middle Waveform Halo */}
        <motion.div
          animate={{
            scale: state === "listening" ? [0.92, 1.05, 0.92] :
                   state === "speaking" ? [0.88, 1.08, 0.88] : [0.95, 1, 0.95],
            opacity: state === "listening" ? [0.25, 0.55, 0.25] :
                     state === "speaking" ? [0.4, 0.7, 0.4] : [0.15, 0.25, 0.15],
          }}
          transition={{ duration: state === "listening" ? 1.2 : 0.9, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "absolute inset-6 rounded-full border-2",
            state === "listening" ? "border-cyan-400/40" :
            state === "speaking" ? "border-indigo-400/50" :
            state === "thinking" ? "border-amber-400/40" :
            "border-slate-700/20"
          )}
        />

        {/* Hover Shadow & Ground Thruster Rings */}
        <div className="absolute -bottom-2 w-32 h-6 flex flex-col items-center justify-center">
          <motion.div
            animate={{
              scaleX: state === "speaking" ? [1, 1.25, 1] : [1, 1.1, 1],
              opacity: state === "speaking" ? [0.4, 0.7, 0.4] : [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "w-24 h-3 rounded-full blur-md",
              state === "listening" ? "bg-cyan-500/30" :
              state === "speaking" ? "bg-indigo-500/40" : "bg-cyan-500/20"
            )}
          />
          <div className="w-16 h-1 border border-cyan-400/30 rounded-full" />
        </div>

        {/* The Animated Floating Robot Body ("Skillnox MasterMind") */}
        <motion.div
          animate={{
            y: [-6 + nodOffset, 4 + nodOffset, -6 + nodOffset],
            rotate: state === "listening" ? [-1.5, 1.5, -1.5] : [0, 0, 0],
          }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 flex flex-col items-center"
        >
          {/* Head & Antenna */}
          <div className="relative">
            {/* Top Antenna Bulb */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <motion.div
                animate={{
                  boxShadow: state === "listening" ? ["0 0 4px #06B6D4", "0 0 12px #06B6D4", "0 0 4px #06B6D4"] :
                             state === "speaking" ? ["0 0 6px #6366F1", "0 0 16px #6366F1", "0 0 6px #6366F1"] :
                             ["0 0 2px #475569", "0 0 6px #475569", "0 0 2px #475569"]
                }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className={cn(
                  "w-3 h-3 rounded-full border transition-colors",
                  state === "listening" ? "bg-cyan-300 border-cyan-100" :
                  state === "speaking" ? "bg-indigo-300 border-indigo-100" :
                  state === "thinking" ? "bg-amber-300 border-amber-100" :
                  "bg-slate-500 border-slate-400"
                )}
              />
              <div className="w-0.5 h-3 bg-slate-600" />
            </div>

            {/* Main Robot Head */}
            <div className="w-28 h-24 rounded-[2rem] bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-slate-700/80 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center p-3">
              {/* Glass Reflection Highlight */}
              <div className="absolute -top-6 -left-6 w-20 h-16 bg-white/10 rounded-full blur-sm transform -rotate-45 pointer-events-none" />

              {/* Visor / Face Screen */}
              <div className="w-full h-full rounded-[1.3rem] bg-slate-950/90 border border-slate-800/90 relative flex items-center justify-around px-3 shadow-inner">
                {/* Left Eye */}
                <div className="relative w-6 h-6 flex items-center justify-center">
                  {isBlinking ? (
                    <div className="w-5 h-1 bg-cyan-300 rounded-full" />
                  ) : state === "listening" ? (
                    // Attentive listening crescent eye (smiling / nodding)
                    <div className="w-5 h-3 border-b-3 border-cyan-300 rounded-b-full shadow-[0_0_8px_#06B6D4]" />
                  ) : state === "thinking" ? (
                    // Synaptic scanning sweep
                    <motion.div
                      animate={{ scale: [0.8, 1.15, 0.8] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_10px_#F59E0B]"
                    />
                  ) : (
                    // Focused circular eye with cyan pupil
                    <div className="w-5 h-5 rounded-full bg-cyan-400 shadow-[0_0_12px_#06B6D4] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>

                {/* Subtle Nose Sensor Dot */}
                <div className={cn(
                  "w-1 h-1 rounded-full",
                  state === "listening" ? "bg-cyan-400/80 animate-ping" : "bg-slate-700"
                )} />

                {/* Right Eye */}
                <div className="relative w-6 h-6 flex items-center justify-center">
                  {isBlinking ? (
                    <div className="w-5 h-1 bg-cyan-300 rounded-full" />
                  ) : state === "listening" ? (
                    <div className="w-5 h-3 border-b-3 border-cyan-300 rounded-b-full shadow-[0_0_8px_#06B6D4]" />
                  ) : state === "thinking" ? (
                    <motion.div
                      animate={{ scale: [0.8, 1.15, 0.8] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                      className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_10px_#F59E0B]"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-cyan-400 shadow-[0_0_12px_#06B6D4] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>

                {/* Mouth / Audio Wave Visualizer (active when bot speaks) */}
                {state === "speaking" && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
                    {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [2, 3 + h * 2, 2] }}
                        transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.06 }}
                        className="w-0.5 bg-indigo-300 rounded-full shadow-[0_0_4px_#6366F1]"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Ear Pods */}
              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-slate-700 rounded-l-md border border-slate-600" />
              <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-slate-700 rounded-r-md border border-slate-600" />
            </div>
          </div>

          {/* Neck Joint */}
          <div className="w-8 h-2 bg-slate-800 rounded-full my-0.5 border border-slate-700" />

          {/* Torso / Chassis */}
          <div className="w-20 h-16 rounded-[1.4rem] bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-slate-700/80 shadow-xl relative flex flex-col items-center justify-center p-2">
            {/* Chest Emblem: Skillnox Neon Core */}
            <motion.div
              animate={{
                boxShadow: state === "listening" ? ["0 0 4px #06B6D4", "0 0 14px #06B6D4", "0 0 4px #06B6D4"] :
                           state === "speaking" ? ["0 0 6px #6366F1", "0 0 18px #6366F1", "0 0 6px #6366F1"] :
                           ["0 0 2px #475569", "0 0 6px #475569", "0 0 2px #475569"]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={cn(
                "w-7 h-7 rounded-xl flex items-center justify-center border transition-all",
                state === "listening" ? "bg-cyan-500/20 border-cyan-400 text-cyan-300" :
                state === "speaking" ? "bg-indigo-500/30 border-indigo-400 text-indigo-200" :
                state === "thinking" ? "bg-amber-500/20 border-amber-400 text-amber-300" :
                "bg-slate-800 border-slate-600 text-slate-400"
              )}
            >
              <Brain className="w-4 h-4" />
            </motion.div>

            {/* Arm Joint Pods */}
            <div className="absolute -left-2 top-3 w-2 h-7 bg-slate-800 rounded-l-lg border border-slate-700" />
            <div className="absolute -right-2 top-3 w-2 h-7 bg-slate-800 rounded-r-lg border border-slate-700" />
          </div>

          {/* Hover Plasma Thruster Cone */}
          <div className="relative flex flex-col items-center -mt-1">
            <motion.div
              animate={{
                scaleY: state === "speaking" ? [1, 1.4, 1] :
                        state === "listening" ? [1, 1.25, 1] : [0.9, 1.1, 0.9],
                opacity: state === "speaking" ? [0.8, 1, 0.8] : [0.6, 0.9, 0.6],
              }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
              className={cn(
                "w-5 h-7 rounded-b-full blur-[1px]",
                state === "listening" ? "bg-gradient-to-b from-cyan-400 via-cyan-500 to-transparent shadow-[0_0_12px_#06B6D4]" :
                state === "speaking" ? "bg-gradient-to-b from-indigo-400 via-indigo-600 to-transparent shadow-[0_0_16px_#6366F1]" :
                "bg-gradient-to-b from-cyan-400 via-cyan-600 to-transparent shadow-[0_0_8px_#06B6D4]"
              )}
            />
          </div>
        </motion.div>
      </div>

      {/* Dynamic State Subtitle Badge (Exactly matching BerriBot's state text) */}
      <div className="mt-2 text-center">
        <AnimatePresence mode="wait">
          {state === "listening" ? (
            <motion.div
              key="listening"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Listening In...</span>
            </motion.div>
          ) : state === "speaking" ? (
            <motion.div
              key="speaking"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(99,102,241,0.2)]"
            >
              <Volume2 className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
              <span>Skillnox Speaking...</span>
            </motion.div>
          ) : state === "thinking" ? (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-widest"
            >
              <Cpu className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Analyzing Bloom's Depth...</span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs font-mono font-semibold uppercase tracking-wider"
            >
              <span>Ready for Dialogue</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Real-Time Live Reaction Chips (Only while student is speaking answers) */}
      <div className="min-h-[2.5rem] mt-3 flex flex-wrap items-center justify-center gap-2 max-w-sm px-2">
        <AnimatePresence>
          {state === "listening" && spokenWordsCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300 backdrop-blur-md"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Attentive to Cadence ({spokenWordsCount} words)</span>
            </motion.div>
          )}

          {state === "listening" && detectedKeywords.map((kw, idx) => (
            <motion.div
              key={`${kw}-${idx}`}
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/50 text-[10px] font-mono font-bold text-indigo-300 backdrop-blur-md shadow-sm"
            >
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              <span>Key Concept: {kw}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
