import { Button } from "@/components/ui/button";
import { AnimatedButton } from "@/components/ui/animated-button";
import { Card, CardContent } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/glass-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
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
  CheckCircle2
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Resume Analysis",
    description: "AI-powered resume parsing with skill extraction and scoring to match job requirements"
  },
  {
    icon: Brain,
    title: "Smart Interviews",
    description: "Technical, HR, and behavioral interviews with AI-generated questions tailored to your profile"
  },
  {
    icon: Camera,
    title: "Emotion Detection",
    description: "Real-time emotion analysis during interviews to improve your confidence and presence"
  },
  {
    icon: Mic,
    title: "Voice Analysis",
    description: "Analyze speech clarity, confidence, and pacing to enhance communication skills"
  },
  {
    icon: Users,
    title: "Group Discussion",
    description: "Practice GD rounds with AI evaluation of leadership, logic, and vocabulary"
  },
  {
    icon: Target,
    title: "Placement Prediction",
    description: "Get placement probability predictions for 30, 60, and 90 days based on performance"
  }
];

const companies = ["TCS", "Infosys", "Wipro", "Accenture", "Cognizant", "Capgemini", "Amazon"];

const stats = [
  { value: "95%", label: "Accuracy Rate" },
  { value: "10K+", label: "Students Trained" },
  { value: "50+", label: "Companies Covered" },
  { value: "4.9", label: "User Rating" }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background relative">
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold" data-testid="text-logo">Skillnox AI</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                onClick={() => window.location.href = '/login'}
                data-testid="button-login-nav"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4 relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4" />
            Skillnox AI · Campus hiring preparation suite
          </motion.div>


          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
            data-testid="text-hero-title"
          >
            Turn Students Into
            <br />
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">Industry‑Ready Hires</span>
          </motion.h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Skillnox AI is your institute’s virtual placement lab: AI‑driven technical & HR interviews,
            resume intelligence, and actionable analytics so every student can walk into real interviews with confidence.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              onClick={() => window.location.href = '/login'}
              className="text-base"
              data-testid="button-get-started"
            >
              Launch Skillnox AI
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base"
              data-testid="button-learn-more"
              onClick={() => {
                const el = document.getElementById("capabilities-section");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              View capabilities
            </Button>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="capabilities-section" className="py-20 px-4 bg-muted/30 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4" data-testid="text-features-title">One Platform For End‑To‑End Interview Readiness</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive AI tools to help you prepare for every aspect of the interview process
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GlassCard variant="solid" className="h-full p-6 hover:scale-[1.02] transition-transform duration-300">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" data-testid={`text-feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-companies-title">Aligned With Real Company Patterns</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Company-specific interview patterns from leading tech and consulting firms
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {companies.map((company) => (
              <div
                key={company}
                className="px-6 py-3 bg-card border border-card-border rounded-lg font-medium text-sm"
                data-testid={`text-company-${company.toLowerCase()}`}
              >
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6" data-testid="text-how-it-works-title">How Skillnox AI Fits Into Your Training</h2>
              <div className="space-y-6">
                {[
                  { step: "1", title: "Onboard Your Students", desc: "Bulk import student rosters with roll numbers and branches in a few clicks." },
                  { step: "2", title: "Configure Rounds & Contests", desc: "Create technical, HR, behavioral and company‑style contests by branch or batch." },
                  { step: "3", title: "Students Practice With AI", desc: "Real‑time feedback on answers, emotions, and voice — as many mock rounds as they need." },
                  { step: "4", title: "Review Analytics & Gaps", desc: "View aggregate skill gaps, scores and placement readiness to fine‑tune training." }
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-muted-foreground text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="p-6">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="w-16 h-16 text-primary/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">Interactive Demo Coming Soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-primary text-primary-foreground overflow-hidden">
            <CardContent className="p-8 md:p-12">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-4" data-testid="text-cta-title">Ready to Ace Your Interview?</h2>
                  <p className="text-primary-foreground/80 mb-6">
                    Join thousands of students who have improved their interview skills with our AI-powered platform.
                  </p>
                  <div className="space-y-3">
                    {[
                      "Unlimited mock interviews",
                      "Real-time AI feedback",
                      "Personality insights",
                      "Placement probability tracking"
                    ].map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-center lg:text-right">
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => window.location.href = '/login'}
                    className="text-base"
                    data-testid="button-cta-start"
                  >
                    Start Free Today
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="mt-8 border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold">Skillnox AI</span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-3 text-xs md:text-sm text-muted-foreground">
              <span>© {new Date().getFullYear()} Skillnox AI. All rights reserved.</span>
              <span className="hidden md:inline-block">•</span>
              <span>Interview & placement readiness platform for campuses.</span>
            </div>
          </div>
        </div>
      </footer>
    </div >
  );
}
