import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { ProgressRing } from "@/components/ui/progress-ring";

export interface FloatingAIPanelProps {
    isListening?: boolean;
    isSpeaking?: boolean;
    transcript?: string;
    confidence?: number;
    className?: string;
}

export function FloatingAIPanel({
    isListening = false,
    isSpeaking = false,
    transcript = "",
    confidence,
    className,
}: FloatingAIPanelProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll transcript to bottom
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript]);

    return (
        <GlassCard variant="gradient" className={cn("overflow-hidden", className)}>
            <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Live Feedback</h3>

                    {/* Status indicator */}
                    <div className="flex items-center gap-2">
                        <AnimatePresence mode="wait">
                            {isSpeaking ? (
                                <motion.div
                                    key="speaking"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center gap-2 text-indigo-400"
                                >
                                    <Volume2 className="w-4 h-4" />
                                    <span className="text-sm">AI Speaking</span>
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="w-2 h-2 rounded-full bg-indigo-400"
                                    />
                                </motion.div>
                            ) : isListening ? (
                                <motion.div
                                    key="listening"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center gap-2 text-green-400"
                                >
                                    <Mic className="w-4 h-4" />
                                    <span className="text-sm">Listening</span>
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="w-2 h-2 rounded-full bg-green-400"
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center gap-2 text-muted-foreground"
                                >
                                    <MicOff className="w-4 h-4" />
                                    <span className="text-sm">Ready</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Confidence meter */}
                {confidence !== undefined && (
                    <div className="flex flex-col items-center py-4">
                        <ProgressRing value={confidence} size={100} strokeWidth={6} />
                        <p className="text-sm text-muted-foreground mt-2">Confidence Level</p>
                    </div>
                )}

                {/* Live transcript */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Live Transcript</h4>
                    <div
                        ref={scrollRef}
                        className="bg-black/20 rounded-lg p-4 h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                    >
                        {transcript ? (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm text-foreground/80 whitespace-pre-wrap"
                            >
                                {transcript}
                            </motion.p>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">
                                Your speech will appear here...
                            </p>
                        )}
                    </div>
                </div>

                {/* Waveform visualization for AI speaking */}
                {isSpeaking && (
                    <div className="flex items-center justify-center gap-1 h-12">
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="w-1 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-full"
                                animate={{
                                    height: ["20%", "100%", "20%"],
                                }}
                                transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    delay: i * 0.05,
                                    ease: "easeInOut",
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </GlassCard>
    );
}
