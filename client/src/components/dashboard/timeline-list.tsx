import * as React from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";

export interface TimelineItem {
    id: string;
    title: string;
    subtitle?: string;
    date: string;
    duration?: string;
    score?: number;
    status?: string;
    badge?: string;
    onClick?: () => void;
}

export interface TimelineListProps {
    items: TimelineItem[];
    className?: string;
}

const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

export function TimelineList({ items, className }: TimelineListProps) {
    return (
        <div className={cn("space-y-4", className)}>
            {items.map((item, index) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <GlassCard
                        variant="default"
                        hover
                        glow
                        className={cn(
                            "p-4 cursor-pointer group",
                            item.onClick && "hover:border-indigo-500/50"
                        )}
                        onClick={item.onClick}
                    >
                        <div className="flex items-center justify-between gap-4">
                            {/* Left: Icon and content */}
                            <div className="flex items-center gap-4 flex-1">
                                {/* Timeline dot */}
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                                    </div>
                                    {index < items.length - 1 && (
                                        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-indigo-500/50 to-transparent" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium capitalize truncate">{item.title}</span>
                                        {item.badge && (
                                            <Badge variant="outline" className="px-2 py-0.5 text-xs">
                                                {item.badge}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            <span>{item.date}</span>
                                        </div>
                                        {item.duration && (
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{item.duration}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Status and score */}
                            <div className="flex items-center gap-3">
                                {item.status && (
                                    <Badge className={cn("px-2 py-0.5 text-xs", statusColors[item.status] || "")}>
                                        {item.status.replace('_', ' ')}
                                    </Badge>
                                )}
                                {item.score !== undefined && item.score !== null && (
                                    <span className="font-semibold text-lg min-w-[3rem] text-right">
                                        {Math.round(item.score)}%
                                    </span>
                                )}
                                {item.onClick && (
                                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
                                )}
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            ))}
        </div>
    );
}
