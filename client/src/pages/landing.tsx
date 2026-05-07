import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
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
  LineChart
} from "lucide-react";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Marquee } from "@/components/ui/marquee";
import { BorderBeam } from "@/components/ui/border-beam";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const features = [
  {
    name: "Automated Resume Parsing",
    description: "Upload your resume to instantly extract skills and get matched with relevant interview scenarios.",
    href: "/login",
    cta: "Scan Resume",
    className: "col-span-3 lg:col-span-1",
    Icon: FileText,
    background: <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />,
  },
  {
    name: "Generative AI Interviews",
    description: "Experience hyper-realistic technical and HR interviews with AI agents configured to college placement standards.",
    href: "/login",
    cta: "Start Mock",
    className: "col-span-3 lg:col-span-2",
    Icon: Brain,
    background: <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />,
  },
  {
    name: "Behavioral & Tone Analysis",
    description: "Real-time feedback on your speaking pace, confidence, and non-verbal cues during the interview.",
    href: "/login",
    cta: "Analyze Performance",
    className: "col-span-3 lg:col-span-2",
    Icon: Mic,
    background: <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />,
  },
  {
    name: "Placement Predictor",
    description: "Track your progress and predict your placement probability across top-tier companies.",
    href: "/login",
    cta: "View Dashboard",
    className: "col-span-3 lg:col-span-1",
    Icon: Target,
    background: <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />,
  },
];

const companies = [
  "TCS", "Infosys", "Wipro", "Cognizant", "Accenture", "IBM", "Tech Mahindra", "Capgemini", "Amazon", "Microsoft"
];

const stats = [
  { value: "100%", label: "Placement Focus", icon: Target },
  { value: "24/7", label: "AI Availability", icon: Zap },
  { value: "0 Bias", label: "Objective Scoring", icon: ShieldCheck },
  { value: "Real-time", label: "Skill Analytics", icon: BarChart3 }
];

const howItWorks = [
  {
    title: "1. Upload Resume",
    description: "The AI parses your academic projects and technical skills to customize your interview.",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    title: "2. Take Mock Interview",
    description: "Engage in a live audio/video interview with an AI recruiter tailored to your target role.",
    icon: Mic,
    color: "text-purple-500",
    bg: "bg-purple-500/10"
  },
  {
    title: "3. Review Feedback",
    description: "Get instant, detailed reports on your technical accuracy and communication skills.",
    icon: LineChart,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10"
  },
  {
    title: "4. Get Placed",
    description: "Share your high scores with the T&P Cell and confidently face real recruiters.",
    icon: Briefcase,
    color: "text-orange-500",
    bg: "bg-orange-500/10"
  }
];

const faqs = [
  {
    question: "Who can access my interview results?",
    answer: "Your individual mock interview recordings and scores are private to you. However, aggregated performance data and top scores are shared with the Training & Placement (T&P) Cell to help align recruitment drives."
  },
  {
    question: "Is the AI interview like a real technical round?",
    answer: "Yes! The AI agent dynamically adjusts its questions based on your resume and your answers. If you mention React.js, expect deep-dive questions on hooks, state management, and virtual DOM."
  },
  {
    question: "Can I take multiple mock interviews?",
    answer: "Absolutely. You are encouraged to take unlimited practice interviews. The AI tracks your progress over time and highlights areas where you are improving."
  },
  {
    question: "What hardware do I need?",
    answer: "You only need a modern web browser, a working microphone, and a webcam. The entire application runs smoothly on standard student laptops."
  }
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const handleCtaClick = () => {
    setLocation(isAuthenticated ? "/dashboard" : "/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary relative overflow-hidden">
      {/* Premium Background */}
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(800px_circle_at_center,white,transparent)]",
        )}
      />

      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-xl border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Skillnox <span className="text-primary font-black">AI</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Button
                variant="ghost"
                className="hidden md:flex hover:bg-accent"
                onClick={handleCtaClick}
              >
                {isAuthenticated ? "Dashboard" : "Student Login"}
              </Button>
              <Button
                className="rounded-full px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                onClick={handleCtaClick}
              >
                {isAuthenticated ? "Launch App" : "Access Portal"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-8 backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>Exclusive Placement Readiness Platform</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[1.1]"
          >
            Master Your Interviews.
            <br />
            <span className="text-gradient">Secure Your Future.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed"
          >
            The official AI-powered placement laboratory. Practice technical, HR, and behavioral interviews 
            with real-time generative feedback designed to prepare you for top-tier campus recruitment.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              size="lg"
              onClick={handleCtaClick}
              className="rounded-full px-10 py-7 text-lg font-bold bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/40 relative group overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Mock Interview
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-10 py-7 text-lg font-semibold border-border hover:bg-accent"
              onClick={() => {
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Learn More
            </Button>
          </motion.div>

          {/* Hero Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-20 relative max-w-5xl mx-auto p-2 rounded-[2.5rem] glass-card overflow-hidden"
          >
            <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 via-background to-primary/5 rounded-[2rem] flex flex-col items-center justify-center border border-border relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(to_bottom,white,transparent)] dark:bg-grid-white/5 bg-grid-black/5" />
              <div className="text-center p-8 relative z-10">
                <Brain className="w-20 h-20 text-primary/40 mx-auto mb-6 animate-pulse" />
                <h3 className="text-2xl font-bold mb-2">Live Interview Simulation</h3>
                <p className="text-muted-foreground">Audio, Video, and Real-time Code Evaluation</p>
              </div>
            </div>
            <BorderBeam size={400} duration={12} delay={0} />
          </motion.div>
        </div>
      </section>

      {/* Target Recruiters Marquee */}
      <section className="py-16 border-y border-border bg-muted/30">
        <div className="text-center mb-8">
          <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">Targeting Top Recruiters</p>
        </div>
        <Marquee pauseOnHover className="[--duration:30s]">
          {companies.map((company) => (
            <div key={company} className="flex items-center gap-3 px-12 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
              <Building2 className="w-6 h-6 text-primary" />
              <span className="text-3xl font-black tracking-tighter uppercase">{company}</span>
            </div>
          ))}
        </Marquee>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-32 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">Your Path to Placement</h2>
            <p className="text-lg text-muted-foreground">Follow a structured journey to perfect your interview skills.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0" />
            
            {howItWorks.map((step, index) => (
              <motion.div 
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative z-10 glass-card p-8 rounded-3xl flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300"
              >
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", step.bg, step.color)}>
                  <step.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-32 px-4 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">
              Comprehensive <span className="text-primary">Preparation Tools</span>.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to transform your academic knowledge into industry-ready confidence.
            </p>
          </div>

          <BentoGrid>
            {features.map((feature) => (
              <BentoCard key={feature.name} {...feature} />
            ))}
          </BentoGrid>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl glass-card text-center relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <stat.icon className="w-10 h-10 text-primary mx-auto mb-4 relative z-10 group-hover:scale-110 transition-transform" />
                <div className="text-5xl font-black tracking-tighter mb-2 relative z-10">{stat.value}</div>
                <div className="text-sm font-semibold text-muted-foreground uppercase tracking-widest relative z-10">{stat.label}</div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <BorderBeam size={150} duration={8} delay={0} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 px-4 bg-muted/30 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tighter mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about the placement portal.</p>
          </div>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="glass-card px-6 rounded-2xl border-none">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline hover:text-primary transition-colors py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-6 text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4">
        <div className="max-w-5xl mx-auto rounded-[3rem] glass-card bg-gradient-to-br from-card via-card to-primary/10 p-12 md:p-24 text-center relative overflow-hidden shadow-2xl shadow-primary/20">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tighter mb-8 leading-tight">
              Ready to ace your <br /> next interview?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
              Join your peers who are already using the platform to secure top-tier placements.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="rounded-full px-12 py-8 text-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl"
                onClick={handleCtaClick}
              >
                Login to Portal
              </Button>
            </div>
          </div>
          <BorderBeam size={600} duration={15} delay={0} />
        </div>
      </section>

      <footer className="py-12 border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl">Skillnox AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Training & Placement Cell. Built for student excellence.
          </p>
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">T&P Guidelines</a>
            <a href="#" className="hover:text-primary transition-colors">Support Helpdesk</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
