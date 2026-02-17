import { motion } from "framer-motion";

interface AnimatedBackgroundProps {
    variant?: "default" | "hero" | "subtle";
    className?: string;
}

export function AnimatedBackground({ variant = "default", className = "" }: AnimatedBackgroundProps) {
    const intensity = variant === "hero" ? "strong" : variant === "subtle" ? "minimal" : "medium";

    return (
        <div
            className={`fixed inset-0 overflow-hidden ${className}`}
            style={{ zIndex: -10 }}
        >
            {/* Clean gradient base - very subtle */}
            <div
                className="absolute inset-0"
                style={{
                    background: "linear-gradient(to bottom right, #fafafa, #f5f5f5, #ffffff)"
                }}
            />

            {/* Animated gradient orbs - subtle */}
            <motion.div
                className="absolute inset-0"
                style={{ opacity: 0.15 }}
                animate={{
                    background: [
                        "radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
                        "radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.15) 0%, transparent 50%)",
                        "radial-gradient(circle at 0% 100%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
                        "radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
                    ],
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Dot grid pattern */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `radial-gradient(circle, rgba(99, 102, 241, 0.08) 1px, transparent 1px)`,
                    backgroundSize: "40px 40px",
                    opacity: 0.5,
                }}
            />

            {/* Subtle gradient mesh overlay */}
            <div
                className="absolute inset-0"
                style={{
                    background: "radial-gradient(ellipse at top, rgba(99, 102, 241, 0.05), transparent 60%), radial-gradient(ellipse at bottom right, rgba(168, 85, 247, 0.05), transparent 60%)",
                }}
            />

            {/* Gentle floating shapes */}
            {intensity === "strong" && (
                <>
                    <motion.div
                        className="absolute w-96 h-96 rounded-full"
                        style={{
                            background: "radial-gradient(circle, rgba(99, 102, 241, 0.1), transparent 70%)",
                            filter: "blur(60px)",
                            top: "10%",
                            left: "10%",
                        }}
                        animate={{
                            x: [0, 30, 0],
                            y: [0, -20, 0],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                    <motion.div
                        className="absolute w-96 h-96 rounded-full"
                        style={{
                            background: "radial-gradient(circle, rgba(168, 85, 247, 0.1), transparent 70%)",
                            filter: "blur(60px)",
                            bottom: "10%",
                            right: "10%",
                        }}
                        animate={{
                            x: [0, -30, 0],
                            y: [0, 20, 0],
                            scale: [1, 1.15, 1],
                        }}
                        transition={{
                            duration: 25,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 2,
                        }}
                    />
                </>
            )}
        </div>
    );
}
