import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "gradient" | "solid";
    glow?: boolean;
    hover?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, variant = "default", glow = false, hover = true, children, ...props }, ref) => {
        const variantStyles = {
            default: "bg-white/10 backdrop-blur-xl border border-white/20",
            gradient: "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20",
            solid: "bg-card border border-card-border backdrop-blur-sm",
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-2xl transition-all duration-300 ease-out",
                    variantStyles[variant],
                    hover && "hover:scale-[1.02] hover:shadow-lg",
                    glow && "hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
