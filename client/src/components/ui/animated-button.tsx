import * as React from "react";
import { motion } from "framer-motion";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const animatedButtonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                "primary-glow": "bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 text-white hover:shadow-[0_0_20px_rgba(99,102,241,0.6)] hover:scale-105",
                "secondary-glass": "bg-white/10 backdrop-blur-xl border border-white/20 text-foreground hover:bg-white/20 hover:scale-105",
                "destructive-pulse": "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105 animate-pulse",
                default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105",
                outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:scale-105",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-lg px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface AnimatedButtonProps
    extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'>,
    VariantProps<typeof animatedButtonVariants> {
    asChild?: boolean;
    loading?: boolean;
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
    ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
        if (asChild) {
            return (
                <Slot
                    className={cn(animatedButtonVariants({ variant, size, className }))}
                    ref={ref}
                    {...props}
                >
                    {loading && <Loader2 className="animate-spin" />}
                    {children}
                </Slot>
            );
        }

        return (
            <motion.button
                className={cn(animatedButtonVariants({ variant, size, className }))}
                ref={ref}
                disabled={disabled || loading}
                whileHover={{ scale: disabled ? 1 : 1.05 }}
                whileTap={{ scale: disabled ? 1 : 0.95 }}
                {...props}
            >
                {loading && <Loader2 className="animate-spin" />}
                {children}
            </motion.button>
        );
    }
);

AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton, animatedButtonVariants };
