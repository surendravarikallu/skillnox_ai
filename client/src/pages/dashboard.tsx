import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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

interface ScoreCardProps {
  title: string;
  score: number | null;
  icon: React.ElementType;
  trend?: number;
  color: string;
}

function ScoreCard({ title, score, icon: Icon, trend, color }: ScoreCardProps) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold" data-testid={`text-score-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {score !== null ? `${Math.round(score)}%` : '--'}
            </p>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
                {Math.abs(trend)}% from last
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InterviewCard({ interview }: { interview: Interview }) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'technical': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'hr': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'behavioral': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'company': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'gd': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      case 'project': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover-elevate" data-testid={`card-interview-${interview.id}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize">{interview.type} Interview</span>
            {interview.company && (
              <Badge variant="outline" className="px-2 py-0.5 text-xs">
                {interview.company}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {new Date(interview.createdAt!).toLocaleDateString()}
            {interview.duration && (
              <>
                <Clock className="w-3 h-3 ml-2" />
                {Math.round(interview.duration / 60)} min
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge className={`${getStatusColor(interview.status)} px-2 py-0.5 text-xs`}>
          {interview.status.replace('_', ' ')}
        </Badge>
        {interview.overallScore !== null && (
          <span className="font-semibold text-lg" data-testid={`text-interview-score-${interview.id}`}>
            {Math.round(interview.overallScore)}%
          </span>
        )}
        {interview.status === 'pending' || interview.status === 'in_progress' ? (
          <Link href={`/interview/${interview.id}/room`}>
            <Button variant="ghost" size="icon" data-testid={`button-view-interview-${interview.id}`}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
        ) : (
          <Link href={`/interview/${interview.id}/results`}>
            <Button variant="ghost" size="icon" data-testid={`button-view-interview-${interview.id}`}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ScoreCard
          title="Technical Score"
          score={avgTechnical}
          icon={Brain}
          color="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
        />
        <ScoreCard
          title="Communication"
          score={avgHr}
          icon={Users}
          color="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300"
        />
        <ScoreCard
          title="Emotion Score"
          score={avgEmotion}
          icon={Sparkles}
          color="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300"
        />
        <ScoreCard
          title="Voice Score"
          score={avgVoice}
          icon={Target}
          color="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300"
        />
      </div>

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
              <div className="space-y-4">
                {recentInterviews.map(interview => (
                  <InterviewCard key={interview.id} interview={interview} />
                ))}
              </div>
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
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">30 Days</span>
                      <span className="font-semibold" data-testid="text-prob-30">{Math.round(placement.probability30Days || 0)}%</span>
                    </div>
                    <Progress value={placement.probability30Days || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">60 Days</span>
                      <span className="font-semibold" data-testid="text-prob-60">{Math.round(placement.probability60Days || 0)}%</span>
                    </div>
                    <Progress value={placement.probability60Days || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">90 Days</span>
                      <span className="font-semibold" data-testid="text-prob-90">{Math.round(placement.probability90Days || 0)}%</span>
                    </div>
                    <Progress value={placement.probability90Days || 0} className="h-2" />
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
