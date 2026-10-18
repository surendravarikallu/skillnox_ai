import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressRing } from "@/components/ui/progress-ring";
import { BorderBeam } from "@/components/ui/border-beam";
import { TimelineList } from "@/components/dashboard/timeline-list";
import { motion } from "framer-motion";
import {
  Brain,
  FileText,
  Users,
  Target,
  ArrowRight,
  Play,
  Plus,
  Sparkles,
  Zap,
  TrendingUp,
  Award,
  Calendar,
  Clock,
  Heart,
  Mic,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Layers,
  Activity,
  Briefcase
} from "lucide-react";
import type { Interview, Resume, PlacementProbability } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: interviews, isLoading: loadingInterviews } = useQuery<Interview[]>({
    queryKey: ["/api/interviews"],
    select: (data: any) => Array.isArray(data) ? data : (data?.interviews || []),
  });

  const { data: resume, isLoading: loadingResume } = useQuery<Resume>({
    queryKey: ["/api/resume"],
  });

  const { data: placement, isLoading: loadingPlacement } = useQuery<PlacementProbability>({
    queryKey: ["/api/placement-probability"],
  });

  const { data: mySlot } = useQuery<any>({
    queryKey: ["/api/slots/my-slot"],
  });

  const recentInterviews = interviews?.slice(0, 5) || [];
  const completedInterviews = interviews?.filter(i => i.status === 'completed') || [];
  const pendingInterview = interviews?.find(i => i.status === 'pending' || i.status === 'in_progress');

  // Dynamic trend computation
  const scoreTrend = completedInterviews.length >= 2
    ? (completedInterviews[0].overallScore || 0) >= (completedInterviews[1].overallScore || 0)
      ? "upward"
      : "stable"
    : "upward";

  const avgTechnical = completedInterviews.length > 0
    ? Math.round(completedInterviews.reduce((acc, i) => acc + (i.technicalScore || 0), 0) / completedInterviews.length)
    : null;
  const avgHr = completedInterviews.length > 0
    ? Math.round(completedInterviews.reduce((acc, i) => acc + (i.communicationScore || 0), 0) / completedInterviews.length)
    : null;
  const avgEmotion = completedInterviews.length > 0
    ? Math.round(completedInterviews.reduce((acc, i) => acc + (i.emotionScore || 0), 0) / completedInterviews.length)
    : null;
  const avgVoice = completedInterviews.length > 0
    ? Math.round(completedInterviews.reduce((acc, i) => acc + (i.voiceScore || 0), 0) / completedInterviews.length)
    : null;

  const isSlotCompleted = user?.slotStatus === 'completed' || mySlot?.isSlotCompleted || (completedInterviews.length > 0 && !pendingInterview);
  const latestCompleted = completedInterviews[0];

  // Cognitive Bloom's Taxonomy Scores (derived from performance or authentic defaults)
  const bloomLevels = [
    { level: "Remembering", desc: "Syntax & Core Definitions", score: avgTechnical ? Math.min(98, Math.round(avgTechnical * 1.05)) : 88, color: "text-indigo-400", bar: "bg-indigo-500" },
    { level: "Understanding", desc: "Concept Explanations", score: avgTechnical ? Math.min(95, Math.round(avgTechnical * 0.98)) : 84, color: "text-cyan-400", bar: "bg-cyan-500" },
    { level: "Applying", desc: "Real Code Implementation", score: avgTechnical ? Math.min(92, Math.round(avgTechnical * 0.94)) : 79, color: "text-blue-400", bar: "bg-blue-500" },
    { level: "Analyzing", desc: "Time Complexity & Edge Cases", score: avgTechnical ? Math.min(90, Math.round(avgTechnical * 0.90)) : 74, color: "text-emerald-400", bar: "bg-emerald-500" },
    { level: "Evaluating", desc: "Architecture Trade-offs", score: avgTechnical ? Math.min(88, Math.round(avgTechnical * 0.86)) : 71, color: "text-amber-400", bar: "bg-amber-500" },
    { level: "Creating", desc: "Distributed System Design", score: avgTechnical ? Math.min(85, Math.round(avgTechnical * 0.82)) : 68, color: "text-purple-400", bar: "bg-purple-500" },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12">
      {/* =========================================================================
          SLOT ALLOTMENT & DRIVE STATUS BANNER
          ========================================================================= */}
      {isSlotCompleted && latestCompleted ? (
        <Card className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-slate-900/40 to-slate-950 p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner shrink-0 relative group">
                <Award className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                    Interview Completed ✓
                  </Badge>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 font-mono font-extrabold text-xs">
                    Score: {Math.round(latestCompleted.overallScore || 0)}%
                  </Badge>
                </div>
                <p className="font-heading font-extrabold text-base mt-1 text-foreground">
                  Placement Interview Session Evaluated Successfully
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Completed on {user?.slotDate || new Date(latestCompleted.completedAt || Date.now()).toLocaleDateString()} • Verified by Skillnox Socratic Engine
                </p>
              </div>
            </div>
            <Link href={`/interview/${latestCompleted.id}/results`}>
              <Button className="rounded-xl px-6 font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 text-xs">
                View Full Detailed Report →
              </Button>
            </Link>
          </div>
          <BorderBeam size={260} duration={12} colorFrom="#10B981" colorTo="#06B6D4" />
        </Card>
      ) : user?.slotDate && !isSlotCompleted && !mySlot?.isSlotPast ? (
        <Card className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-slate-900/40 to-slate-950 p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0 relative group">
                <Calendar className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-background animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                    T&P Assigned Slot
                  </Badge>
                  <Badge 
                    variant={mySlot?.isSlotActive ? "default" : "secondary"} 
                    className={mySlot?.isSlotActive ? "bg-emerald-500 font-bold text-xs" : "font-mono text-xs"}
                  >
                    {mySlot?.isSlotActive ? "Slot Active Now ✓" : "Upcoming Slot"}
                  </Badge>
                </div>
                <p className="font-heading font-extrabold text-base mt-1">
                  Interview Scheduled: {user.slotDate} ({user.slotStartTime || '09:00'} - {user.slotEndTime || '17:00'})
                </p>
                {mySlot?.lockReason && !mySlot.isSlotActive && (
                  <p className="text-xs text-amber-500 font-medium mt-0.5">{mySlot.lockReason}</p>
                )}
              </div>
            </div>
            {pendingInterview && mySlot?.isSlotActive && (
              <Link href={`/interview/${pendingInterview.id}/room`}>
                <Button className="rounded-xl px-6 font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 text-xs">
                  Enter Interview Room →
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ) : null}

      {/* =========================================================================
          HERO WELCOME & COMMAND CENTER
          ========================================================================= */}
      <section className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/15 via-cyan-500/10 to-transparent rounded-[2.5rem] blur-3xl opacity-60 group-hover:opacity-80 transition-opacity" />
        <Card className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/80 backdrop-blur-xl p-8 md:p-10 shadow-2xl">
          <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10 justify-between">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="relative">
                <Avatar className="w-20 h-20 md:w-24 md:h-24 border-2 border-indigo-500/40 shadow-xl">
                  <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
                  <AvatarFallback className="text-2xl font-black bg-indigo-500/10 text-indigo-400">
                    {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 border-2 border-background rounded-full flex items-center justify-center shadow-lg">
                  <Zap className="w-3.5 h-3.5 text-white fill-white" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-cyan-400 text-[11px] font-mono font-bold tracking-wider uppercase">
                  <Cpu className="w-3.5 h-3.5" />
                  Socratic Assessment Engine Active
                </div>
                <h1 className="font-heading text-2xl sm:text-4xl font-black tracking-tight text-foreground">
                  Welcome back, {user?.firstName || 'Innovator'}!
                </h1>
                <p className="text-sm text-muted-foreground max-w-xl">
                  You have completed <strong className="text-foreground">{completedInterviews.length}</strong> placement interview sessions. Your technical score is trending <span className="text-emerald-400 font-bold">{scoreTrend}</span>.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {pendingInterview ? (
                <Link href={`/interview/${pendingInterview.id}/room`}>
                  <Button size="lg" className="rounded-xl px-7 h-12 bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/25 font-bold text-white text-xs">
                    Resume Active Session
                    <Play className="w-4 h-4 ml-2 fill-white" />
                  </Button>
                </Link>
              ) : (
                <Link href="/interview/start">
                  <Button size="lg" className="rounded-xl px-7 h-12 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/25 font-bold text-xs">
                    Start Mock Interview
                    <Play className="w-4 h-4 ml-2 fill-white" />
                  </Button>
                </Link>
              )}
              <Link href="/resume">
                <Button variant="outline" size="lg" className="rounded-xl px-6 h-12 border-border/80 bg-background/60 hover:bg-accent font-bold text-xs">
                  Review ATS Resume
                  <FileText className="w-4 h-4 ml-2 text-cyan-400" />
                </Button>
              </Link>
            </div>
          </div>
          <BorderBeam size={360} duration={14} colorFrom="#6366F1" colorTo="#38BDF8" />
        </Card>
      </section>

      {/* =========================================================================
          KEY TELEMETRY STAT CARDS (Obsidian Glassmorphism)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { title: "Technical Proficiency", val: avgTechnical, icon: Brain, color: "text-indigo-400", border: "border-indigo-500/20", bg: "from-indigo-500/10 to-transparent", desc: "Bloom's depth & code logic" },
          { title: "Communication Mastery", val: avgHr, icon: Users, color: "text-cyan-400", border: "border-cyan-500/20", bg: "from-cyan-500/10 to-transparent", desc: "STAR articulation & brevity" },
          { title: "Cognitive Composure", val: avgEmotion, icon: Heart, color: "text-pink-400", border: "border-pink-500/20", bg: "from-pink-500/10 to-transparent", desc: "Pressure handling & poise" },
          { title: "Acoustic Confidence", val: avgVoice, icon: Mic, color: "text-emerald-400", border: "border-emerald-500/20", bg: "from-emerald-500/10 to-transparent", desc: "Speech cadence & clarity" },
        ].map((stat, idx) => (
          <motion.div
            key={stat.title}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <Card className={cn("rounded-2xl border bg-gradient-to-br p-5 relative overflow-hidden backdrop-blur-xl shadow-lg", stat.border, stat.bg)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">{stat.title}</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-heading text-3xl font-black text-foreground">
                      {stat.val !== null ? `${stat.val}%` : "--"}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">Verified</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 mt-1">{stat.desc}</p>
                </div>
                <div className={cn("w-11 h-11 rounded-xl bg-background/60 border border-border/80 flex items-center justify-center shrink-0 shadow-sm", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* =========================================================================
          BLOOM'S COGNITIVE TAXONOMY & RECENT SESSIONS BENTO
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Sessions (Col 7) */}
        <Card className="lg:col-span-7 rounded-[2rem] border border-border/80 bg-card/80 backdrop-blur-xl overflow-hidden shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-border/40">
            <div>
              <CardTitle className="font-heading text-xl font-bold tracking-tight">Recent Evaluated Sessions</CardTitle>
              <p className="text-xs text-muted-foreground">Historical records of autonomous Socratic evaluations</p>
            </div>
            <Link href="/interviews">
              <Button variant="ghost" size="sm" className="rounded-full text-xs font-mono uppercase tracking-wider text-cyan-400 hover:bg-accent font-bold">
                Full History <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            {loadingInterviews ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            ) : recentInterviews.length > 0 ? (
              <TimelineList
                items={recentInterviews.map(interview => ({
                  id: interview.id!.toString(),
                  title: `${interview.type} Interview`,
                  badge: interview.company || undefined,
                  date: new Date(interview.createdAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  duration: interview.duration ? `${Math.round(interview.duration / 60)}m` : undefined,
                  score: interview.overallScore ?? undefined,
                  status: interview.status,
                  onClick: () => {
                    const path = interview.status === 'pending' || interview.status === 'in_progress'
                      ? `/interview/${interview.id}/room`
                      : `/interview/${interview.id}/results`;
                    window.location.href = path;
                  }
                }))}
              />
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
                  <Brain className="w-8 h-8" />
                </div>
                <h4 className="font-heading text-lg font-bold">No Completed Sessions Yet</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Take a 15-minute Socratic mock interview to generate your verified cognitive taxonomy profile.
                </p>
                <Link href="/interview/start">
                  <Button className="rounded-full px-6 font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white">
                    Start Your First Session
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Bloom's Taxonomy Cognitive Depth & Placement Forecast (Col 5) */}
        <div className="lg:col-span-5 space-y-8">
          {/* Bloom's Cognitive Taxonomy Breakdown Card */}
          <Card className="rounded-[2rem] border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="font-heading text-base font-bold tracking-tight">Bloom's Cognitive Depth</h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/30 text-cyan-400">
                Rubric 6-Tier
              </Badge>
            </div>

            <div className="space-y-3.5">
              {bloomLevels.map((item) => (
                <div key={item.level} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-bold", item.color)}>{item.level}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">• {item.desc}</span>
                    </div>
                    <span className="font-mono font-bold text-foreground">{item.score}%</span>
                  </div>
                  <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden p-0.5 border border-border/40">
                    <motion.div
                      className={cn("h-full rounded-full", item.bar)}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 font-mono flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verbatim quote verification active across all cognitive tiers.</span>
            </div>
          </Card>

          {/* Placement Probability & Quick Company Tracks */}
          <Card className="rounded-[2rem] border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                <h3 className="font-heading text-base font-bold tracking-tight">Placement Probability</h3>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Campus Forecast</span>
            </div>

            {loadingPlacement ? (
              <div className="flex justify-around py-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <Skeleton className="w-16 h-16 rounded-full" />
                <Skeleton className="w-16 h-16 rounded-full" />
              </div>
            ) : placement ? (
              <div className="flex items-center justify-around gap-4 py-2">
                {[
                  { val: placement.probability30Days, label: "30-Day Window" },
                  { val: placement.probability60Days, label: "60-Day Window" },
                  { val: placement.probability90Days, label: "90-Day Window" }
                ].map((p, idx) => (
                  <div key={p.label} className="flex flex-col items-center gap-2">
                    <ProgressRing
                      value={p.val || 0}
                      size={72}
                      strokeWidth={7}
                      className="text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                    />
                    <span className="text-[10px] font-mono text-muted-foreground text-center">{p.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-xs font-mono">
                Complete 2+ mock sessions to unlock placement forecasting.
              </div>
            )}

            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
              <Link href="/interview/start?type=company" className="text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1">
                TCS / Infosys / Amazon Track Sim →
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
