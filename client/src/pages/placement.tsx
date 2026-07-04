import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  ArrowUpRight,
  Activity,
  Zap,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { BorderBeam } from "@/components/ui/border-beam";
import type { PlacementProbability, Interview } from "@shared/schema";
import { cn } from "@/lib/utils";

function ProbabilityCard({ 
  days, 
  probability, 
  isHighlighted 
}: { 
  days: number; 
  probability: number | null; 
  isHighlighted?: boolean;
}) {
  const displayValue = probability !== null ? Math.round(probability) : 0;
  const circumference = 2 * Math.PI * 55;
  const strokeDashoffset = circumference - (displayValue / 100) * circumference;

  return (
    <Card className={cn(
      "relative overflow-hidden rounded-[2.5rem] glass-card transition-all duration-500",
      isHighlighted ? "ring-2 ring-primary/40 scale-105 z-10" : "hover:bg-accent/50"
    )}>
      <CardContent className="p-8 text-center space-y-6">
        <div className="relative w-40 h-40 mx-auto">
          <svg className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_12px_rgba(var(--primary),0.3)]">
            <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted" />
            <motion.circle
              cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 2, ease: "circOut" }}
              strokeDasharray={circumference}
              className="text-primary"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black tracking-tighter" data-testid={`text-prob-${days}`}>{displayValue}%</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Chance</span>
          </div>
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight">{days} Days</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
            {displayValue >= 70 ? 'Optimal Readiness' : displayValue >= 40 ? 'Moderate Projection' : 'Development Phase'}
          </p>
        </div>
      </CardContent>
      {isHighlighted && <BorderBeam size={200} duration={8} />}
    </Card>
  );
}

export default function PlacementPage() {
  const { data: placement, isLoading: loadingPlacement } = useQuery<PlacementProbability>({
    queryKey: ["/api/placement-probability"],
  });

  const { data: interviews, isLoading: loadingInterviews } = useQuery<Interview[]>({
    queryKey: ["/api/interviews"],
    select: (data: any) => Array.isArray(data) ? data : (data?.interviews || []),
  });

  const completedInterviews = interviews?.filter(i => i.status === 'completed') || [];
  const factors = (placement?.factors as any) || {};
  const recommendations = placement?.recommendations || [];

  if (loadingPlacement || loadingInterviews) return <div className="flex items-center justify-center h-[60vh]"><Activity className="w-12 h-12 text-primary animate-pulse" /></div>;

  if (!placement) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-[70vh]">
        <Card className="rounded-[2.5rem] glass-card p-12 text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
            <Target className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight">Intelligence Deficit</h2>
            <p className="text-muted-foreground max-w-sm mx-auto font-medium">Complete at least 3 AI sessions to generate your predictive placement trajectory.</p>
          </div>
          <Button className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs">Start Session</Button>
          <BorderBeam />
        </Card>
      </div>
    );
  }

  const highestProb = Math.max(placement.probability30Days || 0, placement.probability60Days || 0, placement.probability90Days || 0);

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 pb-12">
      {/* Header Section */}
      <section>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
          <TrendingUp className="w-3 h-3" />
          AI Predictive Modeling
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-2">Placement Analytics</h1>
        <p className="text-muted-foreground text-lg">Statistical projections of your market readiness based on AI performance logs.</p>
      </section>

      {/* Main Probabilities */}
      <div className="grid md:grid-cols-3 gap-8 pt-4">
        <ProbabilityCard days={30} probability={placement.probability30Days} isHighlighted={placement.probability30Days === highestProb} />
        <ProbabilityCard days={60} probability={placement.probability60Days} isHighlighted={placement.probability60Days === highestProb} />
        <ProbabilityCard days={90} probability={placement.probability90Days} isHighlighted={placement.probability90Days === highestProb} />
      </div>

      {/* Analytics Bento Grid */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Factors Breakdown */}
        <Card className="lg:col-span-7 rounded-[2.5rem] glass-card p-10 overflow-hidden relative">
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <Zap className="w-6 h-6 text-primary" />
                  Readiness Factors
                </CardTitle>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1 opacity-60">Variable Impact Analysis</p>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20 font-black px-4 py-1.5 rounded-full">{Math.round(placement.confidence || 0)}% Confidence</Badge>
            </div>

            <div className="space-y-8">
              {[
                { label: "Technical Proficiency", val: factors.technical, color: "from-blue-500 to-cyan-400" },
                { label: "Communication Flow", val: factors.communication, color: "from-emerald-500 to-teal-400" },
                { label: "Resume Portfolio", val: factors.resume, color: "from-purple-500 to-pink-400" },
                { label: "Market Resonance", val: factors.market, color: "from-orange-500 to-red-400" }
              ].map((f, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{f.label}</span>
                    <span className="text-sm font-black">{Math.round(f.val || 0)}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-muted/50 rounded-full overflow-hidden border border-border">
                    <motion.div 
                      className={cn("h-full bg-gradient-to-r", f.color)}
                      initial={{ width: 0 }}
                      animate={{ width: `${f.val || 0}%` }}
                      transition={{ duration: 1.5, delay: i * 0.1, ease: "circOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <BorderBeam size={400} />
        </Card>

        {/* AI Recommendations */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="rounded-[2.5rem] glass-card bg-gradient-to-br from-card/90 to-primary/5 p-8 space-y-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Lightbulb className="w-20 h-20 text-yellow-500" />
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="font-black uppercase tracking-widest text-xs">Strategic Directives</h3>
            </div>
            <div className="space-y-4">
              {(recommendations.length > 0 ? recommendations : ["Complete more interviews", "Refine technical skills", "Update resume", "Practice specific rounds"]).map((rec, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex gap-4 p-4 rounded-2xl bg-muted/50 border border-border hover:border-primary/30 transition-all group">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{rec}</p>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Quick Stats Summary */}
          <Card className="rounded-[2.5rem] glass-card p-8">
            <div className="grid grid-cols-2 gap-6 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-black tracking-tighter">{completedInterviews.length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Sessions Logged</p>
              </div>
              <div className="space-y-1 border-l border-border">
                <p className="text-2xl font-black tracking-tighter text-emerald-500">
                  {completedInterviews.length > 0 
                    ? Math.round(completedInterviews.reduce((acc, i) => acc + (i.overallScore || 0), 0) / completedInterviews.length)
                    : 0}%
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Mean Rating</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
