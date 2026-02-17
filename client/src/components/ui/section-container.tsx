import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SectionContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    subtitle?: string;
    gradient?: boolean;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const maxWidthClasses = {
    sm: "max-w-2xl",
    md: "max-w-4xl",
    lg: "max-w-5xl",
    xl: "max-w-6xl",
    "2xl": "max-w-7xl",
    full: "max-w-full",
};

export function SectionContainer({
    title,
    subtitle,
    gradient = false,
    maxWidth = "xl",
    className,
    children,
    ...props
}: SectionContainerProps) {
    return (
        <section
            className={cn(
                "relative w-full py-8",
                gradient && "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
                className
            )}
            {...props}
        >
            <div className={cn("mx-auto px-4 sm:px-6 lg:px-8", maxWidthClasses[maxWidth])}>
                {(title || subtitle) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-8"
                    >
                        {title && (
                            <h2 className="text-3xl font-bold mb-2 relative inline-block">
                                {title}
                                <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full"></span>
                            </h2>
                        )}
                        {subtitle && (
                            <p className="text-muted-foreground mt-3">{subtitle}</p>
                        )}
                    </motion.div>
                )}
                {children}
            </div>
        </section>
    );
}
