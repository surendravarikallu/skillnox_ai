import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Mail,
  Brain,
  ShieldCheck,
  GraduationCap,
  Award,
  Zap,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface StageInfo {
  id: string;
  name: string;
  badge: string;
  color: string;
  glowColor: string;
  textColor: string;
  desc: string;
  x: number;
  y: number;
  labelAlign: "top" | "bottom" | "left" | "right";
}

const STAGES: StageInfo[] = [
  {
    id: "match",
    name: "Search & Match",
    badge: "1. SOURCE",
    color: "#06B6D4", // Cyan
    glowColor: "rgba(6, 182, 212, 0.4)",
    textColor: "text-cyan-400",
    desc: "AI ranks batch resumes against company JDs with skill fit percentages",
    x: 320,
    y: 65,
    labelAlign: "right"
  },
  {
    id: "connect",
    name: "Connect",
    badge: "2. SCHEDULE",
    color: "#3B82F6", // Blue
    glowColor: "rgba(59, 130, 246, 0.4)",
    textColor: "text-blue-400",
    desc: "Auto-allots consecutive-day slots, calendar invites & reminder tokens",
    x: 250,
    y: 106,
    labelAlign: "bottom"
  },
  {
    id: "mastermind",
    name: "MasterMind",
    badge: "3. INTERVIEW",
    color: "#6366F1", // Indigo
    glowColor: "rgba(99, 102, 241, 0.45)",
    textColor: "text-indigo-400",
    desc: "Autonomous two-way Socratic voice interview powered by Groq sub-80ms engine",
    x: 110,
    y: 106,
    labelAlign: "bottom"
  },
  {
    id: "proctor",
    name: "Proctor",
    badge: "4. VERIFY",
    color: "#EC4899", // Pink
    glowColor: "rgba(236, 72, 153, 0.45)",
    textColor: "text-pink-400",
    desc: "Gaze tracking, tab-switch telemetry & anti-proxy verification for 100% integrity",
    x: 40,
    y: 65,
    labelAlign: "left"
  },
  {
    id: "tutor",
    name: "Tutor",
    badge: "5. UPSKILL",
    color: "#F59E0B", // Amber
    glowColor: "rgba(245, 158, 11, 0.45)",
    textColor: "text-amber-400",
    desc: "Bloom's taxonomy gap drills and personalized mentorship on weak topics",
    x: 110,
    y: 24,
    labelAlign: "top"
  },
  {
    id: "talent",
    name: "Talent",
    badge: "6. PLACED",
    color: "#10B981", // Emerald
    glowColor: "rgba(16, 185, 129, 0.45)",
    textColor: "text-emerald-400",
    desc: "Verified placement credential & faculty-certified portfolio for hiring drives",
    x: 250,
    y: 24,
    labelAlign: "top"
  }
];

export function Skillnox360Orbit({ className }: { className?: string }) {
  const [activeStage, setActiveStage] = useState(0);

  // Smooth rotation cycle through all 6 stages
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % STAGES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const cur = STAGES[activeStage];

  return (
    <div className={cn("w-full flex flex-col items-center justify-between relative", className)}>
      {/* 360 Loop Interactive SVG Canvas */}
      <div className="w-full relative flex items-center justify-center">
        <svg
          viewBox="0 0 360 130"
          className="w-full max-w-[360px] h-[105px] overflow-visible select-none"
        >
          <defs>
            <linearGradient id="orbitGlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.8" />
              <stop offset="35%" stopColor="#6366F1" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#EC4899" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
            </linearGradient>

            <filter id="neonBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Path for Orbit Motion */}
            <path
              id="orbitTrackPath"
              d="M 40,65 a 140,41 0 1,0 280,0 a 140,41 0 1,0 -280,0"
              fill="none"
            />
          </defs>

          {/* Background Ambient Orbit Shadow */}
          <ellipse
            cx="180"
            cy="65"
            rx="140"
            ry="41"
            fill="none"
            stroke="#1E293B"
            strokeWidth="3"
            opacity="0.5"
          />

          {/* Glowing Animated Dash Track */}
          <ellipse
            cx="180"
            cy="65"
            rx="140"
            ry="41"
            fill="none"
            stroke="url(#orbitGlowGradient)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            className="animate-bt-orbit"
            filter="url(#neonBlur)"
            opacity="0.85"
          />

          {/* Smooth Orbiting Comet Particle that glides across the 360 loop */}
          <g>
            <circle r="4" fill="#FFFFFF" filter="url(#neonBlur)">
              <animateMotion
                dur="16.8s"
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href="#orbitTrackPath" />
              </animateMotion>
            </circle>
            <circle r="8" fill="rgba(6, 182, 212, 0.4)" filter="url(#neonBlur)">
              <animateMotion
                dur="16.8s"
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href="#orbitTrackPath" />
              </animateMotion>
            </circle>
          </g>

          {/* Central AI Hub Core */}
          <g transform="translate(180, 65)">
            {/* Outer Concentric Pulse Halo */}
            <circle
              r="24"
              fill="none"
              stroke="#4F46E5"
              strokeWidth="1"
              strokeDasharray="2 3"
              className="animate-spin"
              style={{ animationDuration: "24s", transformOrigin: "0px 0px" }}
              opacity="0.6"
            />
            {/* Inner Core */}
            <circle
              r="17"
              fill="#0F172A"
              stroke="#6366F1"
              strokeWidth="2"
              filter="url(#neonBlur)"
            />
            <circle
              r="12"
              fill="url(#orbitGlowGradient)"
              opacity="0.25"
            />
            {/* 360 Loop Core Label */}
            <text
              textAnchor="middle"
              y="3"
              fill="#FFFFFF"
              fontSize="8"
              fontWeight="900"
              fontFamily="sans-serif"
              letterSpacing="0.05em"
            >
              360°
            </text>
          </g>

          {/* 6 Stage Stations - Positioned exactly on the ellipse with upright labels */}
          {STAGES.map((st, idx) => {
            const isActive = activeStage === idx;
            return (
              <g
                key={st.id}
                className="cursor-pointer transition-all duration-300"
                onClick={() => setActiveStage(idx)}
              >
                {/* Active Outer Pulse Ring */}
                {isActive && (
                  <circle
                    cx={st.x}
                    cy={st.y}
                    r="12"
                    fill="none"
                    stroke={st.color}
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    opacity="0.9"
                    className="animate-spin"
                    style={{ animationDuration: "6s", transformOrigin: `${st.x}px ${st.y}px` }}
                  />
                )}

                {/* Satellite Node Base */}
                <circle
                  cx={st.x}
                  cy={st.y}
                  r={isActive ? "7.5" : "5"}
                  fill="#0B1120"
                  stroke={st.color}
                  strokeWidth={isActive ? "2" : "1.2"}
                  filter={isActive ? "url(#neonBlur)" : undefined}
                />

                {/* Node Center Light */}
                <circle
                  cx={st.x}
                  cy={st.y}
                  r={isActive ? "3.5" : "2"}
                  fill={isActive ? "#FFFFFF" : st.color}
                />

                {/* Upright Text Label (Positioned clearly without overlap or flipping) */}
                <text
                  x={st.x}
                  y={st.y > 65 ? st.y + 13 : st.y - 8}
                  textAnchor="middle"
                  fill={isActive ? "#FFFFFF" : "#94A3B8"}
                  fontSize={isActive ? "8.5" : "7.5"}
                  fontWeight={isActive ? "800" : "600"}
                  fontFamily="sans-serif"
                  letterSpacing="0.02em"
                  className="transition-all duration-200"
                >
                  {st.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dynamic Active Stage Ticker (Synced with 360 loop progression) */}
      <div className="w-full mt-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={cur.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span
                className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                style={{ backgroundColor: cur.color }}
              />
              <span className={cn("font-mono font-bold text-[10px] tracking-wider shrink-0 uppercase", cur.textColor)}>
                {cur.badge}
              </span>
              <span className="text-[11px] text-slate-300 truncate font-sans">
                {cur.desc}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <span className="text-[9px] font-mono text-slate-500 font-bold">
                {activeStage + 1}/6
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
