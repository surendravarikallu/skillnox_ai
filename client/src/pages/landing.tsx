import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Brain,
  FileText,
  Users,
  BarChart3,
  Mic,
  Camera,
  Target,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  GraduationCap,
  Briefcase,
  ChevronRight,
  Building2,
  LineChart,
  Eye,
  Mail,
  Calendar,
  Lock,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Award,
  BookOpen,
  HelpCircle,
  Cpu,
  Layers,
  ChevronDown
} from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { Marquee } from "@/components/ui/marquee";
import { Skillnox360Orbit } from "@/components/skillnox-360-orbit";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// 3D Flipping Recruiter Logo Pairs (Partner Companies Hiring from Campus)
const flipLogos = [
  { front: "TCS", back: "Persistent", sub: "Enterprise Tech" },
  { front: "Infosys", back: "Capgemini", sub: "Digital Services" },
  { front: "Wipro", back: "HCLTech", sub: "Cloud & AI" },
  { front: "Cognizant", back: "LTI Mindtree", sub: "Consulting" },
  { front: "Accenture", back: "Tech Mahindra", sub: "Global Systems" },
  { front: "Amazon", back: "Microsoft", sub: "Product & Cloud" },
];

// Target recruiters for campus marquee
const recruiters = [
  "TCS", "Infosys", "Wipro", "Cognizant", "HCLTech", "Persistent", "Accenture", "Tech Mahindra", "Capgemini", "LTI Mindtree", "Amazon", "Microsoft"
];

// Metrics comparison for college campus placement drives
const impactMetrics = [
  {
    label: "Faculty Interview Hours",
    manual: "15+ hrs/batch",
    withAi: "4.5 hrs saved",
    highlight: "70% Reduction",
    desc: "Autonomous conversational first-round screening eliminates faculty exhaustion during high-volume placement drives."
  },
  {
    label: "Drive to Certified Shortlist",
    manual: "20+ days",
    withAi: "24 hours",
    highlight: "20x Faster",
    desc: "Instant Bloom's taxonomy rubric scoring and verifiable transcripts compress evaluation turnaround from weeks to hours."
  },
  {
    label: "Student Drive Attendance",
    manual: "62% turn-out",
    withAi: "96% completion",
    highlight: "+34% Gain",
    desc: "Flexible, 24/7 on-demand mock and official interview windows eliminate scheduling conflicts and no-shows."
  },
  {
    label: "Interview Integrity & Proxy Rate",
    manual: "16% unverified",
    withAi: "0% proxy rate",
    highlight: "100% Verified",
    desc: "Real-time gaze centering, multi-modal face presence, and tab-switch telemetry guarantee fair evaluation for deserving students."
  }
];

// Authentic Campus Placement Stories & Faculty Testimonials
const campusStories = [
  {
    quote: "Evaluating 650+ final-year engineering students for campus drives used to paralyze our department for two weeks. Skillnox AI's Socratic dialogue and verbatim evidence quotes give our placement committee total confidence in every shortlist.",
    author: "Dr. K. Suresh Babu",
    role: "Dean of Training & Placement",
    org: "Engineering Campus Placement Cell",
    badge: "Faculty Leadership"
  },
  {
    quote: "MasterMind doesn't just ask MCQ questions—it challenges students to defend architectural decisions in Operating Systems and Database Indexing. It highlights exact knowledge gaps before students face external company panels.",
    author: "Prof. Ananya Sen",
    role: "Head of Department, Computer Science",
    org: "School of Computing & Engineering",
    badge: "Academic Review"
  },
  {
    quote: "The spoken interview felt remarkably natural. When I hesitated while explaining dynamic dispatch, the AI gave me a Socratic hint instead of cutting me off. Practicing with Skillnox gave me the exact confidence I needed to clear my campus drive.",
    author: "Rahul Verma",
    role: "B.Tech CSE (Final Year)",
    org: "Placed at Tier-1 Technology Firm",
    badge: "Student Success"
  },
  {
    quote: "Skillnox Proctor eliminated all doubts regarding candidate authenticity and tab switching during virtual hiring rounds. The real-time gaze telemetry and audit log ensure absolute integrity for our hiring pipeline.",
    author: "Priya Nambiar",
    role: "Student Placement Coordinator",
    org: "Campus Recruitment Cell",
    badge: "Placement Committee"
  },
];

// College Placement Specific FAQs
const faqs = [
  {
    question: "What is Skillnox AI and how is it built for our college?",
    answer: "Skillnox AI is an agentic AI interview and verification platform designed specifically for College Training & Placement (T&P) Cells, faculty evaluators, and engineering students. It unifies resume matching, two-way Socratic spoken interviews, real-time anti-proxy proctoring, and personalized fundamental drills into one automated placement readiness pipeline."
  },
  {
    question: "How does the two-way Socratic voice interview work without buttons?",
    answer: "Skillnox MasterMind uses ultra-low latency Groq LPU inference (~50ms) and intelligent Voice Activity Detection (VAD). You speak your technical answer naturally into your microphone. When you finish speaking, the AI evaluates your response against Bloom's Cognitive Taxonomy, extracts verbatim spoken evidence quotes, and autonomously decides whether to Probe deeper, offer a Socratic Hint, or Advance to the next technical topic."
  },
  {
    question: "How does Skillnox Proctor catch proxy candidates and tab switching?",
    answer: "Skillnox Proctor continuously monitors face presence, gaze centering, camera brightness, and window focus (tab-switching telemetry). Any attempt to switch tabs or look away from the test viewport triggers real-time amber HUD alerts and logs a timestamped infraction in the college placement audit report."
  },
  {
    question: "Does Skillnox AI evaluate facial emotions or personality?",
    answer: "No. Skillnox AI strictly complies with US EEOC standards, the EU AI Act, and Indian data protection guidelines. We completely reject pseudo-scientific facial emotion recognition or voice sentiment scoring. All candidate scores are 100% grounded in technical accuracy, problem-solving depth, and verbal articulation."
  },
  {
    question: "Can students practice mock interviews before official company drives?",
    answer: "Yes. Students can take unlimited practice technical and HR mock interviews. Skillnox Tutor analyzes past mistakes, identifies weak concepts (such as DBMS Indexing or OOP Polymorphism), and generates targeted drills to get students placement-ready."
  },
  {
    question: "What hardware setup is required for students?",
    answer: "Students only need a standard laptop or desktop with a working webcam, microphone, and a modern browser (Google Chrome, Microsoft Edge, or Firefox). No software installation or browser extension is required."
  }
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [activeStory, setActiveStory] = useState(0);

  // Dedicated Blueprint Section Scroll Controller (for Desktop Zoom-Out Assembly)
  const blueprintSectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: blueprintSectionRef,
    offset: ["start start", "end end"],
  });

  // Header above matrix: fades in as scroll enters
  const headerOpacity = useTransform(scrollYProgress, [0.05, 0.22], [0, 1]);

  // Central announcement card: starts large (scale 1.0), shrinks down to 0.18 between 0.12 and 0.62
  const centerScale = useTransform(scrollYProgress, [0.12, 0.62], [1, 0.18]);
  const centerTextOpacity = useTransform(scrollYProgress, [0.12, 0.35], [1, 0]);
  const centerLogoScale = useTransform(scrollYProgress, [0.28, 0.62], [0.7, 2.4]);
  const centerLogoOpacity = useTransform(scrollYProgress, [0.25, 0.45], [0, 1]);
  const centerCardOpacity = useTransform(scrollYProgress, [0, 0.42, 0.58], [1, 1, 0]);
  const centerPointerEvents = useTransform(scrollYProgress, (v) => (v < 0.42 ? "auto" : "none"));

  // Surrounding agent tiles: expand outward from center (scale 0.75 -> 1, opacity 0 -> 1)
  const topRowY = useTransform(scrollYProgress, [0.18, 0.62], [120, 0]);
  const topRowScale = useTransform(scrollYProgress, [0.18, 0.62], [0.75, 1]);
  const topRowOpacity = useTransform(scrollYProgress, [0.18, 0.50], [0, 1]);

  const bottomRowY = useTransform(scrollYProgress, [0.18, 0.62], [-120, 0]);
  const bottomRowScale = useTransform(scrollYProgress, [0.18, 0.62], [0.75, 1]);
  const bottomRowOpacity = useTransform(scrollYProgress, [0.18, 0.50], [0, 1]);

  const leftColX = useTransform(scrollYProgress, [0.18, 0.62], [110, 0]);
  const rightColX = useTransform(scrollYProgress, [0.18, 0.62], [-110, 0]);

  const handleCtaClick = () => {
    setLocation(isAuthenticated ? "/dashboard" : "/login");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {/* Top Announcement Strip */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-950 to-indigo-950 text-indigo-100 px-4 py-2 text-center text-xs font-semibold tracking-wide border-b border-indigo-900/60 shadow-sm">
        <span className="opacity-90">
          Skillnox AI is built for College Campus Placements — automated Socratic technical mock interviews, Bloom's scoring, and anti-proxy proctoring.
        </span>{" "}
        <a href="#agents-stack" className="underline decoration-cyan-400 underline-offset-4 font-bold text-cyan-300 hover:text-white transition-colors ml-1">
          Explore the 6 Agents →
        </a>
      </div>

      {/* Modern High-Tech Header / Navbar */}
      <header className="sticky top-0 z-50 bg-[#F8FAFC]/90 dark:bg-[#090D16]/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/25 transition-transform group-hover:scale-105">
              S
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Skillnox
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600 dark:text-cyan-400">
                AI
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-semibold tracking-wide text-slate-600 dark:text-slate-300">
            <a href="#agents-stack" className="hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-1">
              Agents Stack <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </a>
            <a href="#socratic-deepdive" className="hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors">
              Socratic Engine
            </a>
            <a href="#metrics" className="hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors">
              Campus Impact
            </a>
            <a href="#proctor" className="hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors">
              Anti-Proxy Proctor
            </a>
            <a href="#stories" className="hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors">
              Campus Stories
            </a>
            <a href="#faq" className="hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={handleCtaClick}
            >
              {isAuthenticated ? "Dashboard" : "Student Login"}
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold rounded-full px-5 h-9 shadow-md shadow-indigo-500/20 transition-all hover:shadow-indigo-500/35"
              onClick={handleCtaClick}
            >
              {isAuthenticated ? "Launch Portal" : "Start Mock Interview"}
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          SECTION 1: HERO SECTION (High-Impact Campus Placement Portal)
          ========================================================================= */}
      <section className="relative min-h-[85vh] flex flex-col justify-center items-center px-4 py-16 sm:py-20 tech-radial-bg overflow-hidden border-b border-slate-200 dark:border-slate-800/80">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-20"
          style={{
            backgroundImage: "radial-gradient(#4F46E5 0.75px, transparent 0.75px)",
            backgroundSize: "28px 28px"
          }}
        />

        <div className="w-full max-w-5xl mx-auto text-center space-y-6 z-10">
          {/* Campus Placements Tech Pill */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-indigo-200 dark:border-indigo-900/60 bg-white/90 dark:bg-slate-900/90 py-1.5 px-4 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 dark:text-cyan-400">
              BUILT FOR COLLEGE CAMPUS PLACEMENT DRIVES • GROQ LPU INFERENCE
            </span>
          </div>

          {/* Main Display Headline */}
          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.08] max-w-4xl mx-auto">
            The AI interview platform that prepares and verifies every student.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Skillnox AI conducts autonomous two-way Socratic technical mock interviews, grades against Bloom's Cognitive Taxonomy, and enforces real-time anti-proxy proctoring before campus hiring drives.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-8 h-12 text-sm font-bold shadow-lg shadow-indigo-600/25 transition-transform hover:-translate-y-0.5"
              onClick={handleCtaClick}
            >
              Start Student Mock Interview
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <a
              href="#agents-stack"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-7 h-12 text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Explore the 6 Agents ↓
            </a>
          </div>

          {/* Recruiter 3D Flipping Logo Grid */}
          <div className="pt-6 w-full max-w-4xl mx-auto">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-3">
              Partner companies hiring engineering graduates from campus
            </p>

            <div className="logo-grid" aria-label="Campus Recruiters">
              {flipLogos.map((item, index) => (
                <div
                  key={index}
                  className="logo-cell"
                  style={{ "--i": index } as React.CSSProperties}
                >
                  <div className="logo-card">
                    {/* Front Face */}
                    <div className="logo-face bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                      <div className="flex flex-col items-center">
                        <span className="font-heading text-base sm:text-lg font-bold tracking-tight text-slate-800 dark:text-slate-200">
                          {item.front}
                        </span>
                        <span className="text-[9px] font-mono text-indigo-600 dark:text-cyan-400 opacity-80">
                          Campus Partner
                        </span>
                      </div>
                    </div>

                    {/* Back Face (Rotated 180deg) */}
                    <div className="logo-face logo-back bg-indigo-50/80 dark:bg-slate-800/90 border border-indigo-200 dark:border-indigo-900/60 rounded-xl shadow-sm">
                      <div className="flex flex-col items-center">
                        <span className="font-heading text-base sm:text-lg font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                          {item.back}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                          {item.sub}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll Cue Indicator */}
          <div className="pt-4 flex items-center justify-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 animate-bounce">
            <span>Scroll to unveil the 6-Agent Blueprint</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: SIGNATURE PINNED BLUEPRINT MATRIX (BerriBot-Style Zoom-Out Assembly)
          ========================================================================= */}
      <section
        id="agents-stack"
        ref={blueprintSectionRef}
        className="relative h-[320vh] bg-[#F8FAFC] dark:bg-[#070A11] border-b border-slate-200 dark:border-slate-800/80"
      >
        {/* Sticky 100vh Viewport */}
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-hidden flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 blueprint-grid-canvas">
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute inset-0 pointer-events-none tech-radial-bg opacity-70" />

          {/* Desktop Pinned Zoom-Out Assembly (hidden on mobile) */}
          <div className="hidden lg:flex flex-col items-center justify-center w-full max-w-7xl relative z-10 py-2">
            {/* Header: Fades in as user scrolls into the section */}
            <motion.div
              style={{ opacity: headerOpacity }}
              className="text-center max-w-2xl mx-auto mb-4 space-y-1.5 shrink-0"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 text-[11px] font-mono font-bold uppercase tracking-wider border border-indigo-500/20">
                Autonomous Agent Stack • Closed-Loop Placement Pipeline
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Six specialized agents. One autonomous placement loop.
              </h2>
            </motion.div>

            {/* Matrix Container holding the 7 Blueprint Tiles + Central Morphing Card */}
            <div className="relative w-full max-w-7xl">
              {/* ================= ROW 1 (Top Cards: Tutor, MasterMind, Proctor, Connect) ================= */}
              <motion.div
                style={{
                  y: topRowY,
                  scale: topRowScale,
                  opacity: topRowOpacity,
                }}
                className="grid grid-cols-12 gap-3 mb-3"
              >
                {/* 1. Skillnox Tutor (Col 2, Light Surface) */}
                <motion.div
                  style={{ x: leftColX }}
                  className="col-span-2 rounded-2xl bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white p-4 flex flex-col justify-between shadow-md border border-slate-200 dark:border-slate-800 hover:-translate-y-1 transition-transform h-[255px]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Upskill · Mentor
                      </span>
                      <span className="text-xs opacity-60">↗</span>
                    </div>
                    <h4 className="font-heading text-lg font-bold">Skillnox Tutor</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Personalized AI drills on weak technical topics before campus drives.
                    </p>
                  </div>

                  <div className="my-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[11px]">Curriculum Drill</span>
                      </div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-mi-swing" />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      DBMS Indexing & OOP Concepts
                    </p>
                    <div className="text-[9px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                      ★ Personalized Mentorship
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Actionable feedback drill
                  </span>
                </motion.div>

                {/* 2. Skillnox MasterMind (Col 5, Wide Premium Obsidian Surface) */}
                <div className="col-span-5 rounded-2xl bg-slate-950/95 text-white p-5 flex flex-col justify-between relative overflow-hidden group shadow-2xl border border-indigo-500/40 h-[255px]">
                  <BorderBeam size={220} duration={8} delay={4} colorFrom="#818CF8" colorTo="#3B82F6" />
                  <div className="relative z-10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">
                        Socratic Spoken Interview
                      </span>
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white group-hover:scale-110 transition-transform">
                        ↗
                      </span>
                    </div>
                    <div>
                      <h3 className="font-heading text-xl font-bold tracking-tight text-white">
                        Skillnox MasterMind
                      </h3>
                      <p className="text-xs text-slate-300 leading-snug max-w-md">
                        Autonomous two-way spoken technical interviews powered by Groq LPU inference. Evaluates Bloom's Cognitive Taxonomy.
                      </p>
                    </div>
                  </div>

                  {/* Equalizer Waveform & Prompt Visual */}
                  <div className="my-1.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-cyan-400 flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Groq LPU Active • 0.04s TTFT
                      </span>
                      <span className="text-indigo-400 font-bold">Decision: PROBE</span>
                    </div>
                    <p className="text-[11px] text-slate-200 italic line-clamp-1">
                      "Can you elaborate on how runtime dispatch works internally in the JVM vtable?"
                    </p>
                    <div className="flex items-end gap-1.5 h-5 pt-0.5">
                      {[
                        { delay: "0s" },
                        { delay: "0.2s" },
                        { delay: "0.4s" },
                        { delay: "0.15s" },
                        { delay: "0.35s" },
                        { delay: "0.05s" },
                        { delay: "0.25s" },
                        { delay: "0.45s" },
                        { delay: "0.1s" },
                        { delay: "0.3s" },
                      ].map((bar, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-indigo-500 to-cyan-400 rounded-full animate-mi-voice"
                          style={{ height: "100%", animationDelay: bar.delay }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>Bloom's Taxonomy Rubrics</span>
                    <span>Verbatim Spoken Evidence</span>
                  </div>
                </div>

                {/* 3. Skillnox Proctor (Col 3, Light Surface) */}
                <div className="col-span-3 rounded-2xl bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white p-4 flex flex-col justify-between shadow-md border border-slate-200 dark:border-slate-800 hover:-translate-y-1 transition-transform h-[255px]">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Verify · Anti-Cheat
                      </span>
                      <span className="text-xs opacity-60">↗</span>
                    </div>
                    <h4 className="font-heading text-lg font-bold">Skillnox Proctor</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      The student answering is the student verified. Gaze telemetry & proxy lock.
                    </p>
                  </div>

                  {/* Eye Pupil & Recording Dot */}
                  <div className="my-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-indigo-600 dark:text-cyan-400 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" /> Integrity Monitor
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-mi-rec" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">100%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center py-1">
                      <div className="w-12 h-6 rounded-full border border-indigo-500/40 dark:border-cyan-400/40 flex items-center justify-center relative overflow-hidden bg-white/50 dark:bg-black/40">
                        <div className="w-3.5 h-3.5 rounded-full bg-indigo-600 dark:bg-cyan-400 animate-mi-look" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Face Centered</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Tab Focused</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Real-time HUD warnings
                  </span>
                </div>

                {/* 4. Skillnox Connect (Col 2, Deep Slate Obsidian Surface) */}
                <motion.div
                  style={{ x: rightColX }}
                  className="col-span-2 rounded-2xl bg-slate-900/95 text-white p-4 flex flex-col justify-between shadow-md border border-slate-800 hover:-translate-y-1 transition-transform h-[255px]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                        Email Outreach
                      </span>
                      <span className="text-xs opacity-60">↗</span>
                    </div>
                    <h4 className="font-heading text-lg font-bold">Connect</h4>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Automated candidate email campaigns, test links, and round reminders.
                    </p>
                  </div>

                  <div className="my-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Email Dispatch</span>
                      </div>
                      <div className="w-3.5 h-3.5 rounded-full border border-cyan-400 animate-mi-wave" />
                    </div>
                    <p className="text-[10px] text-slate-300 line-clamp-1">
                      Unique interview tokens delivered.
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-mono">
                      <CheckCircle2 className="w-3 h-3" /> 100% Calendar Sync
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">
                    Email-only compliance
                  </span>
                </motion.div>
              </motion.div>

              {/* ================= ROW 2 (Bottom Cards: Search & Match, 360 Loop, Campus Talent) ================= */}
              <motion.div
                style={{
                  y: bottomRowY,
                  scale: bottomRowScale,
                  opacity: bottomRowOpacity,
                }}
                className="grid grid-cols-12 gap-3"
              >
                {/* 5. Search & Match (Col 4, Light Surface) */}
                <motion.div
                  style={{ x: leftColX }}
                  className="col-span-4 rounded-2xl bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white p-5 flex flex-col justify-between shadow-md border border-slate-200 dark:border-slate-800 hover:-translate-y-1 transition-transform h-[255px]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-cyan-400">
                        Source · Rank
                      </span>
                      <span className="text-xs opacity-60">↗</span>
                    </div>
                    <h4 className="font-heading text-lg font-bold">Search & Match</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Upload batch student resumes against company JDs. Rank eligible percentiles with explainable skills.
                    </p>
                  </div>

                  {/* Scanning Magnifier Icon */}
                  <div className="my-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 relative overflow-hidden">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span>Candidate Match</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono">94% Fit</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 dark:bg-cyan-400 h-full w-[94%]" />
                    </div>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border text-indigo-600 dark:text-cyan-400 font-mono">
                        PostgreSQL
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border text-indigo-600 dark:text-cyan-400 font-mono">
                        System Design
                      </span>
                    </div>

                    <div className="absolute -bottom-1 -right-1 pointer-events-none animate-mi-scan">
                      <div className="w-6 h-6 rounded-full border-2 border-indigo-600 dark:border-cyan-400 bg-indigo-500/20 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-cyan-400" />
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Zero-bias JD extraction
                  </span>
                </motion.div>

                {/* 6. Skillnox 360 Loop (Col 5, Wide Premium Obsidian Surface) */}
                <div className="col-span-5 rounded-2xl bg-slate-950/95 text-white p-4 flex flex-col justify-between relative overflow-hidden group shadow-2xl border border-cyan-500/40 min-h-[255px]">
                  <BorderBeam size={220} duration={8} colorFrom="#38BDF8" colorTo="#4F46E5" />
                  <div className="relative z-10 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                        The Whole Loop
                      </span>
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white group-hover:scale-110 transition-transform">
                        ↗
                      </span>
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold tracking-tight text-white">
                        Skillnox 360 Loop
                      </h3>
                      <p className="text-[11px] text-slate-300 leading-snug max-w-sm">
                        Every placement stage unified into one continuous closed loop.
                      </p>
                    </div>
                  </div>

                  {/* High-Tech Perspective 360 Loop Animation */}
                  <div className="my-0.5 w-full">
                    <Skillnox360Orbit />
                  </div>

                  <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-cyan-400 font-semibold">
                    <span>Campus Placement Command</span>
                    <span>Zero Tool Fragmentation</span>
                  </div>
                </div>

                {/* 7. Campus Talent / Placed (Col 3, Light Surface) */}
                <motion.div
                  style={{ x: rightColX }}
                  className="col-span-3 rounded-2xl bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white p-5 flex flex-col justify-between shadow-md border border-slate-200 dark:border-slate-800 hover:-translate-y-1 transition-transform h-[255px]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-cyan-400">
                        Placed Graduates
                      </span>
                      <span className="text-xs opacity-60">↗</span>
                    </div>
                    <h4 className="font-heading text-lg font-bold">Campus Talent</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Verified readiness credentials and faculty endorsement for hiring partners.
                    </p>
                  </div>

                  <div className="my-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold">Drive-Ready Certified</div>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400">Verified by Placement Cell</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono text-indigo-600 dark:text-cyan-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                      <span>Tier-1 Shortlist</span>
                      <span>100% Verifiable</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Faculty-certified portfolios
                  </span>
                </motion.div>
              </motion.div>

              {/* ================= CENTRAL TRANSFORMING CARD (The Signature BerriBot Zoom Morph) ================= */}
              <motion.div
                style={{
                  scale: centerScale,
                  opacity: centerCardOpacity,
                  x: "-50%",
                  y: "-50%",
                  pointerEvents: centerPointerEvents as any,
                }}
                className="absolute top-1/2 left-1/2 z-30 w-full max-w-lg rounded-3xl bg-slate-950 text-white border border-indigo-500/50 shadow-2xl backdrop-blur-2xl p-7 flex flex-col justify-between overflow-hidden"
              >
                <BorderBeam size={260} duration={8} colorFrom="#38BDF8" colorTo="#4F46E5" />

                {/* Text Content that fades out as the card shrinks */}
                <motion.div style={{ opacity: centerTextOpacity }} className="space-y-3 relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    THE WHOLE CAMPUS STACK
                  </div>
                  <h3 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                    Every step of the campus placement drive, handled.
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Search & Match, Connect, MasterMind, Proctor, Tutor, and Talent unified into one autonomous placement readiness loop.
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-cyan-400">
                    <span>Scroll to expand the 6 specialized agents</span>
                    <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                  </div>
                </motion.div>

                {/* Center Emblem that fades in and fills the shrunk tile */}
                <motion.div
                  style={{ scale: centerLogoScale, opacity: centerLogoOpacity }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 flex items-center justify-center text-white font-black text-2xl shadow-xl border border-white/20">
                    S
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Mobile Fluid Bento Grid (Fallback for mobile/tablet screens) */}
          <div className="lg:hidden w-full max-w-xl mx-auto py-8 space-y-4 overflow-y-auto max-h-[85vh] relative z-10">
            <div className="text-center space-y-1 mb-4">
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 dark:text-cyan-400">
                Autonomous Agent Stack
              </span>
              <h3 className="font-heading text-xl font-bold">Six specialized agents. One loop.</h3>
            </div>

            {/* Mobile Stack: MasterMind */}
            <div className="rounded-2xl bg-slate-950 text-white p-5 space-y-3 border border-indigo-500/40 shadow-lg">
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-400">MasterMind</span>
              <h4 className="font-heading text-lg font-bold">Socratic Spoken Interview</h4>
              <p className="text-xs text-slate-300">
                Autonomous two-way spoken technical interviews powered by Groq LPU inference. Evaluates Bloom's Cognitive Taxonomy.
              </p>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-cyan-400 font-mono">
                Groq LPU Active • 0.04s TTFT
              </div>
            </div>

            {/* Mobile Stack: Skillnox 360 */}
            <div className="rounded-2xl bg-slate-950 text-white p-5 space-y-3 border border-cyan-500/40 shadow-lg">
              <span className="text-[10px] font-mono font-bold uppercase text-cyan-400">Skillnox 360</span>
              <h4 className="font-heading text-lg font-bold">The Whole Placement Loop</h4>
              <p className="text-xs text-slate-300">
                Match resumes against company JDs, schedule student slots, and conduct spoken interviews in one automated flow.
              </p>
              <div className="pt-1">
                <Skillnox360Orbit />
              </div>
            </div>

            {/* Mobile Stack: Proctor */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 space-y-3 border border-slate-200 dark:border-slate-800 shadow-md">
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">Proctor</span>
              <h4 className="font-heading text-lg font-bold">Verify & Anti-Cheat</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Continuous gaze tracking, tab-switch telemetry, and anti-proxy verification for drive integrity.
              </p>
            </div>

            {/* Mobile Stack: Search & Match */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 space-y-3 border border-slate-200 dark:border-slate-800 shadow-md">
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 dark:text-cyan-400">Search & Match</span>
              <h4 className="font-heading text-lg font-bold">Source & Rank</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Batch resume parsing against company JDs with explainable fit scores.
              </p>
            </div>

            {/* Mobile Stack: Connect & Tutor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-1 border border-slate-800">
                <span className="text-[9px] font-mono text-cyan-400 uppercase font-bold">Connect</span>
                <h5 className="font-bold text-sm">Outreach</h5>
                <p className="text-[10px] text-slate-400">Email campaigns & test links.</p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 space-y-1 border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] font-mono text-amber-500 uppercase font-bold">Tutor</span>
                <h5 className="font-bold text-sm">Upskill</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Personalized drills on weak topics.</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Socratic Engine Showcase Section */}
      <section id="socratic-deepdive" className="py-24 px-4 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-cyan-400 text-xs font-mono font-bold">
                <Cpu className="w-3.5 h-3.5" /> GROQ LPU CONVERSATIONAL REASONING
              </div>
              <h2 className="font-heading text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                How MasterMind runs the two-way Socratic interview.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Most AI interviewers are mechanical button-pushers that evaluate keywords. Skillnox MasterMind conducts dynamic spoken technical examinations that probe architectural depth and evaluate cognitive reasoning under Bloom's Taxonomy.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                    01
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Adaptive Dynamic Follow-ups</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      If a student gives a surface-level textbook definition, the AI asks how they would apply it in a real production database or multi-threaded service.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                    02
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Bloom's Cognitive Taxonomy Scoring</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Grading spans 6 cognitive levels: Remembering, Understanding, Applying, Analyzing, Evaluating, and Creating. No superficial scores.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                    03
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Verbatim Evidence Transcripts</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Every rubric evaluation quotes the exact spoken words from the student's audio recording, ensuring transparent faculty verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Dialogue Terminal Preview */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl bg-slate-950 border border-slate-800 p-6 shadow-2xl space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE SOCRATIC CONVERSATION
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Live equalizer wave */}
                    <div className="flex items-center gap-1">
                      {[8, 16, 22, 14, 20, 10].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 rounded-full bg-cyan-400 animate-hud-equalizer"
                          style={{ height: `${h}px`, animationDelay: `${i * 120}ms` }}
                        />
                      ))}
                    </div>
                    <span className="text-cyan-400 font-bold ml-1">GROQ 78ms</span>
                  </div>
                </div>

                {/* AI Question */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 relative">
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      SKILLNOX MASTERMIND
                    </span>
                    <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[9px] font-mono">
                      BLOOM: ANALYZE
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    &ldquo;You explained B-Trees well. Suppose a query uses &apos;WHERE age = 22 AND city = Bangalore&apos;. How does a compound index (city, age) affect B-Tree node lookups versus (age, city)?&rdquo;
                  </p>
                </div>

                {/* Student Spoken Answer */}
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-900/40 space-y-2 ml-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-indigo-300">
                    <span className="flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      STUDENT VERBAL RESPONSE
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">VAD 1.2s</span>
                  </div>
                  <p className="text-xs text-indigo-100 leading-relaxed italic font-sans">
                    &ldquo;Because of the leftmost prefix rule in composite B-Trees, the engine will filter on the first column first. Since both columns are equality comparisons, either index works, but high-cardinality first reduces sub-branch traversal.&rdquo;
                  </p>
                </div>

                {/* Autonomous Decision */}
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>COGNITIVE DEPTH: 9.2/10 (ANALYZING)</span>
                  </div>
                  <span className="text-cyan-400 font-bold">DECISION: ADVANCE</span>
                </div>

                <BorderBeam size={280} duration={10} colorFrom="#6366F1" colorTo="#06B6D4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Campus Placement Metrics: Real Drive Impact */}
      <section id="metrics" className="py-24 px-4 bg-white dark:bg-[#070B12] border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="max-w-3xl space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-600 dark:text-cyan-400">
              Campus Placement Results
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Measurable impact on engineering placement drives.
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Evaluating hundreds of students across multiple engineering branches manually creates weeks of placement fatigue. Skillnox AI automates first-round screening so faculties and recruiters meet verified finalists.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {impactMetrics.map((m, i) => (
              <div
                key={i}
                className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-6 hover:border-indigo-500/50 transition-colors shadow-sm"
              >
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {m.label}
                  </span>
                  <div className="pt-2">
                    <div className="text-xs line-through text-slate-400 font-mono">
                      Manual: {m.manual}
                    </div>
                    <div className="text-3xl font-heading font-black text-indigo-600 dark:text-cyan-400 mt-0.5">
                      {m.withAi}
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold">
                    {m.highlight}
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                    {m.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Proctor & Trust Section */}
      <section id="proctor" className="py-24 px-4 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              Anti-Proxy Proctoring Architecture
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Uncompromised integrity for virtual campus drives.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Every mock and official interview is monitored by multi-modal vision telemetry. Real-time algorithms track face presence, gaze centering, tab switches, and audio anomalies to prevent unfair proxy assistance.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Biometric Anti-Proxy</span>
                </div>
                <p className="text-xs text-slate-400">
                  Validates student identity continuously throughout all interview turns.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Real-Time Tab Detection</span>
                </div>
                <p className="text-xs text-slate-400">
                  Immediate telemetry flags browser blur, window minimize, or dual monitor use.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                  <Award className="w-3.5 h-3.5" />
                  <span>Verbatim Audit Evidence</span>
                </div>
                <p className="text-xs text-slate-400">
                  Every score is grounded in timestamped spoken transcript quotes.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Zero Emotion AI Bias</span>
                </div>
                <p className="text-xs text-slate-400">
                  100% compliant with merit evaluation. No facial expression emotion scoring.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Proctor HUD Preview */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>PROCTOR HUD TELEMETRY</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="my-6 aspect-video rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center relative p-6 text-center space-y-4">
                <div className="w-20 h-20 rounded-full border-2 border-emerald-400/50 flex items-center justify-center animate-pulse bg-emerald-500/5">
                  <Eye className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    Gaze Focus: 99.8% Centered • No Alt-Tab Detected
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Single student face locked • Ambient lighting verified
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 w-full max-w-sm pt-2">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                    Infractions: 0
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                    Integrity: 100%
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                    Mic: Clear
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Tamper-proof encrypted session</span>
                <span className="text-emerald-400 font-semibold">Verified Safe</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Campus Stories & Faculty Testimonials (Vertical Tab Switcher) */}
      <section id="stories" className="py-24 px-4 bg-white dark:bg-[#070B12] border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-600 dark:text-cyan-400">
              Campus Testimonials
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Trusted by placement heads, faculty, and students.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
            {/* Vertical Tab Selector */}
            <div className="lg:col-span-4 space-y-2">
              {campusStories.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStory(idx)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all border flex items-center justify-between",
                    activeStory === idx
                      ? "bg-indigo-50 dark:bg-slate-900 border-indigo-500/50 shadow-md text-indigo-900 dark:text-white"
                      : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  )}
                >
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-cyan-400">
                      0{idx + 1} • {item.badge}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {item.author}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {item.role}
                    </div>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 transition-transform", activeStory === idx ? "text-indigo-600 dark:text-cyan-400 translate-x-1" : "opacity-40")} />
                </button>
              ))}
            </div>

            {/* Active Quotation Display */}
            <div className="lg:col-span-8">
              <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
                <BorderBeam size={280} duration={10} colorFrom="#4F46E5" colorTo="#38BDF8" />
                <div className="text-5xl font-serif text-indigo-400/40 select-none">“</div>
                <p className="text-lg sm:text-2xl font-heading font-medium leading-relaxed text-slate-100">
                  {campusStories[activeStory].quote}
                </p>

                <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-heading text-lg font-bold text-white">
                      {campusStories[activeStory].author}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {campusStories[activeStory].role} — {campusStories[activeStory].org}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full w-9 h-9 p-0 border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                      onClick={() => setActiveStory((prev) => (prev > 0 ? prev - 1 : campusStories.length - 1))}
                    >
                      ←
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full w-9 h-9 p-0 border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                      onClick={() => setActiveStory((prev) => (prev < campusStories.length - 1 ? prev + 1 : 0))}
                    >
                      →
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* College Placement FAQ Section */}
      <section id="faq" className="py-24 px-4 bg-slate-50 dark:bg-[#090D16] border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-600 dark:text-cyan-400">
              Frequently Asked Questions
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Everything faculty and students need to know.
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 px-6 py-2 shadow-sm"
              >
                <AccordionTrigger className="text-left font-heading text-base font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-cyan-400">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-2 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final Call to Action Strip */}
      <section className="py-20 px-4 bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 text-white border-t border-indigo-900/50 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
            Empower Your Campus Placement Cell
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-black tracking-tight">
            Ready to standardize first-round placement interviews?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Give every engineering student the confidence of an objective, AI-driven Socratic mock interview before recruiter drives begin.
          </p>
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-8 h-13 text-sm font-bold shadow-xl shadow-indigo-600/30"
              onClick={handleCtaClick}
            >
              Start Student Mock Interview
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-slate-700 bg-slate-800 text-white hover:bg-slate-700 px-7 h-13 text-sm font-bold"
              onClick={handleCtaClick}
            >
              T&P Faculty Login
            </Button>
          </div>
        </div>
      </section>

      {/* Modern High-Tech Footer */}
      <footer className="py-12 px-4 bg-slate-950 text-slate-400 border-t border-slate-800 text-xs font-medium">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
              S
            </div>
            <span className="font-heading font-bold text-slate-200 text-sm">
              Skillnox AI
            </span>
            <span className="text-slate-600">|</span>
            <span>Campus Placement Readiness Platform</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400 text-xs">
            <a href="#agents-stack" className="hover:text-white transition-colors">Agents</a>
            <a href="#socratic-deepdive" className="hover:text-white transition-colors">Socratic AI</a>
            <a href="#proctor" className="hover:text-white transition-colors">Proctor HUD</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>

          <div className="text-slate-500 font-mono text-[11px]">
            © {new Date().getFullYear()} Skillnox AI. Built for College Campus Drives.
          </div>
        </div>
      </footer>
    </div>
  );
}
