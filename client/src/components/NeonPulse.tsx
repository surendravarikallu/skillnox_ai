import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NeonPulseProps {
  active?: boolean;
  color?: string;
  size?: number;
  className?: string;
}

export function NeonPulse({ 
  active = false, 
  color = "#6366f1", 
  size = 120,
  className 
}: NeonPulseProps) {
  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Outer Glows */}
      <motion.div
        animate={active ? { 
          scale: [1, 1.4, 1.2],
          opacity: [0.1, 0.3, 0.1]
        } : { scale: 1, opacity: 0.1 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full blur-3xl"
        style={{ backgroundColor: color }}
      />
      
      <motion.div
        animate={active ? { 
          scale: [1, 1.2, 1.1],
          opacity: [0.2, 0.4, 0.2]
        } : { scale: 1, opacity: 0.2 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        className="absolute inset-4 rounded-full blur-2xl"
        style={{ backgroundColor: color }}
      />

      {/* Main Core */}
      <motion.div
        animate={active ? {
          scale: [1, 1.05, 1],
          boxShadow: [
            `0 0 20px ${color}40`,
            `0 0 40px ${color}80`,
            `0 0 20px ${color}40`
          ]
        } : { scale: 1 }}
        transition={{ duration: 1, repeat: Infinity }}
        className="relative z-10 w-full h-full rounded-full border-2 border-border bg-card/40 backdrop-blur-md flex items-center justify-center overflow-hidden"
      >
        <div 
          className="absolute inset-0 opacity-20"
          style={{ 
            background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)` 
          }}
        />
        
        {/* Animated Rings */}
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            animate={active ? {
              rotate: 360,
              scale: [1, 1.1, 1],
            } : { rotate: 0 }}
            transition={{ 
              duration: 10 / i, 
              repeat: Infinity, 
              linear: true 
            }}
            className="absolute inset-0 border border-border rounded-full"
            style={{ margin: i * 8 }}
          />
        ))}

        <div className="relative z-20 flex flex-col items-center">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
        </div>
      </motion.div>
    </div>
  );
}
