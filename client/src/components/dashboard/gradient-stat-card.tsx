import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface GradientStatCardProps {
    title: string;
    value: number | null;
    icon: React.ElementType;
    trend?: number;
    gradientFrom?: string;
    gradientTo?: string;
    className?: string;
}

// Color map for gradient colors
const colorMap: Record<string, string> = {
    "indigo-500": "#6366f1",
    "blue-600": "#2563eb",
    "green-500": "#22c55e",
    "emerald-600": "#059669",
    "purple-500": "#a855f7",
    "pink-600": "#db2777",
    "cyan-400": "#22d3ee",
    "blue-500": "#3b82f6",
};

export function GradientStatCard({
    title,
    value,
    icon: Icon,
    trend,
    gradientFrom = "indigo-500",
    gradientTo = "purple-500",
    className,
}: GradientStatCardProps) {
    const fromColor = colorMap[gradientFrom] || "#6366f1";
    const toColor = colorMap[gradientTo] || "#a855f7";

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.2 }}
            className={cn("relative overflow-hidden rounded-2xl h-full min-h-[140px]", className)}
        >
            {/* Gradient background */}
            <div
                className="absolute inset-0 opacity-15"
                style={{
                    background: `linear-gradient(135deg, ${fromColor} 0%, ${toColor} 100%)`
                }}
            />

            {/* Glassmorphic overlay */}
            <div
                className="relative glass-card border-2 p-6 h-full"
                style={{
                    borderColor: fromColor + '40',
                }}
            >
                <div className="flex items-start justify-between gap-4">
                    {/* Icon */}
                    <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                        style={{
                            background: `linear-gradient(135deg, ${fromColor} 0%, ${toColor} 100%)`
                        }}
                    >
                        <Icon className="w-7 h-7 text-white" />
                    </div>

                    {/* Value and trend */}
                    <div className="text-right flex-1">
                        <p className="text-sm text-muted-foreground mb-1 font-semibold">{title}</p>
                        <motion.p
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="text-3xl font-bold bg-clip-text text-transparent"
                            style={{
                                backgroundImage: `linear-gradient(135deg, ${fromColor} 0%, ${toColor} 100%)`
                            }}
                        >
                            {value !== null ? `${Math.round(value)}%` : '--'}
                        </motion.p>

                        {trend !== undefined && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className={cn(
                                    "flex items-center justify-end gap-1 text-xs mt-1 font-medium",
                                    trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                )}
                            >
                                <svg
                                    className={cn("w-3 h-3", trend < 0 && "rotate-180")}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                <span>{Math.abs(trend)}% from last</span>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* Glow effect on hover */}
            <div
                className="absolute inset-0 opacity-0 hover:opacity-20 transition-opacity duration-300 pointer-events-none rounded-2xl"
                style={{
                    background: `linear-gradient(135deg, ${fromColor} 0%, ${toColor} 100%)`
                }}
            />
        </motion.div>
    );
}
