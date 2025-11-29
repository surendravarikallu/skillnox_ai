import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold" data-testid="text-logo">InterviewAI</span>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login-nav"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Interview Preparation
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
            Ace Your Next Interview
            <br />
            <span className="text-primary">With AI Coaching</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Practice mock interviews, get real-time feedback on your resume, emotions, and voice. 
            Prepare for top companies with AI-powered interview simulations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              className="text-base"
              data-testid="button-get-started"
            >
              Start Practicing Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-base" data-testid="button-learn-more">
              See How It Works
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-features-title">Everything You Need to Succeed</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive AI tools to help you prepare for every aspect of the interview process
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" data-testid={`text-feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-companies-title">Practice for Top Companies</h2>
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
              <h2 className="text-3xl font-bold mb-6" data-testid="text-how-it-works-title">How It Works</h2>
              <div className="space-y-6">
                {[
                  { step: "1", title: "Upload Your Resume", desc: "AI analyzes your skills, experience, and education" },
                  { step: "2", title: "Choose Interview Type", desc: "Technical, HR, Behavioral, or company-specific rounds" },
                  { step: "3", title: "Practice with AI", desc: "Get real-time feedback on answers, emotions, and voice" },
                  { step: "4", title: "Review & Improve", desc: "Track progress and get personalized improvement tips" }
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
                    onClick={() => window.location.href = '/api/login'}
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

      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold">InterviewAI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Empowering students to achieve their career goals
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
