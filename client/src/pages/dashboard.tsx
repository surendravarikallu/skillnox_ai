import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { GradientStatCard } from "@/components/dashboard/gradient-stat-card";
import { TimelineList } from "@/components/dashboard/timeline-list";
import { ProgressRing } from "@/components/ui/progress-ring";
import { BorderBeam } from "@/components/ui/border-beam";
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
  Award
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

  const recentInterviews = interviews?.slice(0, 5) || [];
  const completedInterviews = interviews?.filter(i => i.status === 'completed') || [];

  const avgTechnical = completedInterviews.length > 0
    ? completedInterviews.reduce((acc, i) => acc + (i.technicalScore || 0), 0) / completedInterviews.length
    : null;
  const avgHr = completedInterviews.length > 0
    ? completedInterviews.reduce((acc, i) => acc + (i.communicationScore || 0), 0) / completedInterviews.length
    : null;
  const avgEmotion = completedInterviews.length > 0
    ? completedInterviews.reduce((acc, i) => acc + (i.emotionScore || 0), 0) / completedInterviews.length
    : null;
  const avgVoice = completedInterviews.length > 0
    ? completedInterviews.reduce((acc, i) => acc + (i.voiceScore || 0), 0) / completedInterviews.length
    : null;

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-12">
      {/* Hero Welcome Section */}
      <section className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/10 to-transparent rounded-[2rem] blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
        <Card className="relative overflow-hidden rounded-[2rem] glass-card p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="relative">
              <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-primary/20 shadow-xl">
                <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
                <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary">
                  {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 border-4 border-background rounded-full flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
            </div>
            
            <div className="text-center md:text-left flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                <Sparkles className="w-3 h-3" />
                AI Analysis Active
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
                Welcome back, {user?.firstName || 'Innovator'}!
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                You&apos;ve completed <span className="text-foreground font-bold">{completedInterviews.length}</span> interview sessions. 
                Your current technical score is trending <span className="text-emerald-500 font-bold">upwards</span>.
              </p>
            </div>

            <div className="flex flex-col gap-3 shrink-0">
              <Link href="/interview/start">
                <Button size="lg" className="rounded-2xl px-8 h-14 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 font-bold group">
                  Start Live Session
                  <Play className="w-4 h-4 ml-2 fill-white group-hover:scale-125 transition-transform" />
                </Button>
              </Link>
              <Link href="/resume">
                <Button variant="outline" size="lg" className="rounded-2xl px-8 h-14 border-border hover:bg-accent font-bold">
                  Review Resume
                  <FileText className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
          <BorderBeam size={350} duration={15} />
        </Card>
      </section>

      {/* Core Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <GradientStatCard
          title="Technical Proficiency"
          value={avgTechnical}
          icon={Brain}
          gradientFrom="indigo-500"
          gradientTo="blue-600"
          className="shadow-xl"
        />
        <GradientStatCard
          title="Communication Mastery"
          value={avgHr}
          icon={Users}
          gradientFrom="emerald-500"
          gradientTo="teal-600"
          className="shadow-xl"
        />
        <GradientStatCard
          title="Emotional Quotient"
          value={avgEmotion}
          icon={Award}
          gradientFrom="purple-500"
          gradientTo="pink-600"
          className="shadow-xl"
        />
        <GradientStatCard
          title="Voice Confidence"
          value={avgVoice}
          icon={Target}
          gradientFrom="cyan-400"
          gradientTo="blue-500"
          className="shadow-xl"
        />
      </div>

      {/* Detailed Insights Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Card */}
        <Card className="lg:col-span-2 rounded-[2rem] glass-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">Recent Sessions</CardTitle>
              <p className="text-sm text-muted-foreground">Your history of AI evaluations</p>
            </div>
            <Link href="/interviews">
              <Button variant="ghost" size="sm" className="rounded-full hover:bg-accent text-xs font-bold uppercase tracking-widest">
                View History <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            {loadingInterviews ? (
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
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
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                  <Brain className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Sessions Yet</h3>
                <p className="text-muted-foreground mb-8">Ready to test your skills with our AI agents?</p>
                <Link href="/interview/start">
                  <Button className="rounded-full px-8 font-bold">Start Your First Session</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Predictive Analytics & Resume Bento Column */}
        <div className="space-y-8">
          {/* Placement Probability Card */}
          <Card className="rounded-[2rem] glass-card bg-gradient-to-br from-card/90 to-primary/5 p-8 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-24 h-24" />
            </div>
            <CardHeader className="p-0 mb-8">
              <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Placement Probability
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPlacement ? (
                <div className="flex justify-around py-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <Skeleton className="w-16 h-16 rounded-full" />
                </div>
              ) : placement ? (
                <div className="flex items-center justify-between gap-4">
                  {[
                    { val: placement.probability30Days, label: "30D" },
                    { val: placement.probability60Days, label: "60D" },
                    { val: placement.probability90Days, label: "90D" }
                  ].map((p, idx) => (
                    <motion.div 
                      key={p.label} 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <ProgressRing
                        value={p.val || 0}
                        size={80}
                        strokeWidth={8}
                        className="text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.4)]"
                      />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{p.label}</span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 opacity-60">
                  <p className="text-sm">Complete 3+ sessions for predictive insights.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resume Analysis Card */}
          <Card className="rounded-[2rem] glass-card p-1 overflow-hidden">
            <div className="p-7">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Resume Portfolio
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingResume ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ) : resume ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{resume.fileName}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Master Resume</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-primary">{Math.round(resume.overallScore || 0)}%</span>
                      </div>
                    </div>
                    <Link href="/resume">
                      <Button className="w-full rounded-xl h-12 font-bold bg-muted hover:bg-accent text-foreground border border-border">
                        Optimize Content
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-dashed border-border">
                      <Plus className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">No resume found on file.</p>
                    <Link href="/resume">
                      <Button className="w-full rounded-xl h-12 font-bold">Upload & Score</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </div>
            <div className="h-1.5 w-full bg-primary/20">
              <motion.div 
                className="h-full bg-primary" 
                initial={{ width: 0 }}
                animate={{ width: `${resume?.overallScore || 0}%` }}
                transition={{ duration: 1.5, ease: "circOut" }}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
