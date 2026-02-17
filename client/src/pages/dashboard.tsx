import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientStatCard } from "@/components/dashboard/gradient-stat-card";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { TimelineList, type TimelineItem } from "@/components/dashboard/timeline-list";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  Brain,
  FileText,
  Users,
  Briefcase,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  ArrowRight,
  Play,
  Plus,
  ChevronRight,
  Sparkles
} from "lucide-react";
import type { Interview, Resume, PlacementProbability, PersonalityAssessment } from "@shared/schema";

// ScoreCard component removed and replaced with GradientStatCard

// InterviewCard component removed and replaced with TimelineList

export default function Dashboard() {
  const { user } = useAuth();

  const { data: interviews, isLoading: loadingInterviews } = useQuery<Interview[]>({
    queryKey: ["/api/interviews"],
  });

  const { data: resume, isLoading: loadingResume } = useQuery<Resume>({
    queryKey: ["/api/resume"],
  });

  const { data: placement, isLoading: loadingPlacement } = useQuery<PlacementProbability>({
    queryKey: ["/api/placement-probability"],
  });

  const { data: personality, isLoading: loadingPersonality } = useQuery<PersonalityAssessment>({
    queryKey: ["/api/personality"],
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
            <AvatarFallback className="text-xl">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-welcome">
              Welcome back, {user?.firstName || 'Student'}!
            </h1>
            <p className="text-muted-foreground">
              {completedInterviews.length} interviews completed
            </p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/resume">
            <Button variant="outline" data-testid="button-upload-resume">
              <FileText className="w-4 h-4 mr-2" />
              {resume ? 'View Resume' : 'Upload Resume'}
            </Button>
          </Link>
          {user?.role === 'admin' && (
            <Link href="/interview/start">
              <Button data-testid="button-start-interview">
                <Play className="w-4 h-4 mr-2" />
                Create Interview for Student
              </Button>
            </Link>
          )}
        </div>
      </div>

      <DashboardGrid columns={4} stagger>
        <GradientStatCard
          title="Technical Score"
          value={avgTechnical}
          icon={Brain}
          gradientFrom="indigo-500"
          gradientTo="blue-600"
        />
        <GradientStatCard
          title="Communication"
          value={avgHr}
          icon={Users}
          gradientFrom="green-500"
          gradientTo="emerald-600"
        />
        <GradientStatCard
          title="Emotion Score"
          value={avgEmotion}
          icon={Sparkles}
          gradientFrom="purple-500"
          gradientTo="pink-600"
        />
        <GradientStatCard
          title="Voice Score"
          value={avgVoice}
          icon={Target}
          gradientFrom="cyan-400"
          gradientTo="blue-500"
        />
      </DashboardGrid>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-lg">Recent Interviews</CardTitle>
            <Link href="/interviews">
              <Button variant="ghost" size="sm" data-testid="button-view-all-interviews">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingInterviews ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : recentInterviews.length > 0 ? (
              <TimelineList
                items={recentInterviews.map(interview => ({
                  id: interview.id!.toString(),
                  title: `${interview.type} Interview`,
                  badge: interview.company || undefined,
                  date: new Date(interview.createdAt!).toLocaleDateString(),
                  duration: interview.duration ? `${Math.round(interview.duration / 60)} min` : undefined,
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
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">No interviews yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {user?.role === 'admin'
                    ? 'Create an interview for a student to get started'
                    : 'Wait for an admin to assign you an interview'}
                </p>
                {user?.role === 'admin' && (
                  <Link href="/interview/start">
                    <Button data-testid="button-start-first-interview">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Interview for Student
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Placement Probability</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPlacement ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i}>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : placement ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center">
                    <ProgressRing
                      value={placement.probability30Days || 0}
                      size={80}
                      strokeWidth={6}
                    />
                    <span className="text-sm text-muted-foreground mt-2" data-testid="text-prob-30">30 Days</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <ProgressRing
                      value={placement.probability60Days || 0}
                      size={80}
                      strokeWidth={6}
                    />
                    <span className="text-sm text-muted-foreground mt-2" data-testid="text-prob-60">60 Days</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <ProgressRing
                      value={placement.probability90Days || 0}
                      size={80}
                      strokeWidth={6}
                    />
                    <span className="text-sm text-muted-foreground mt-2" data-testid="text-prob-90">90 Days</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Complete interviews to see predictions
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Resume Status</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingResume ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : resume ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-600 dark:text-green-300" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{resume.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {new Date(resume.createdAt!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {resume.overallScore !== null && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Resume Score</span>
                      <span className="font-bold text-lg" data-testid="text-resume-score">
                        {Math.round(resume.overallScore)}%
                      </span>
                    </div>
                  )}
                  <Link href="/resume">
                    <Button variant="outline" className="w-full" data-testid="button-view-resume">
                      View Details
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload your resume for AI analysis
                  </p>
                  <Link href="/resume">
                    <Button variant="outline" className="w-full" data-testid="button-upload-resume-card">
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Resume
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {user?.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/interview/start?type=technical" className="block">
            <Card className="hover-elevate cursor-pointer h-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <h3 className="font-semibold">Technical Interview</h3>
                  <p className="text-sm text-muted-foreground">Create for student</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/interview/start?type=hr" className="block">
            <Card className="hover-elevate cursor-pointer h-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <h3 className="font-semibold">HR Interview</h3>
                  <p className="text-sm text-muted-foreground">Create for student</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/interview/start?type=company" className="block">
            <Card className="hover-elevate cursor-pointer h-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-orange-600 dark:text-orange-300" />
                </div>
                <div>
                  <h3 className="font-semibold">Company Simulator</h3>
                  <p className="text-sm text-muted-foreground">Create for student</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
