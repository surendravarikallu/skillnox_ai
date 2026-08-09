import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Brain,
  Users,
  Mic,
  Camera,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Download,
  Share2,
  Lightbulb,
  Zap
} from "lucide-react";
import type { Interview, InterviewQuestion } from "@shared/schema";

function ScoreCircle({ score, label, color }: { score: number | null; label: string; color: string }) {
  const displayScore = score !== null ? Math.round(score) : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="56"
            cy="56"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          <circle
            cx="56"
            cy="56"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={color}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{displayScore}%</span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground mt-2">{label}</span>
    </div>
  );
}

export default function InterviewResults() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const shareMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/interviews/${id}/share`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews', id] });
      toast({
        title: data.isShared ? "Report Shared" : "Report Set to Private",
        description: data.message || "Updated your share settings successfully.",
      });
    },
  });

  const { data: interview, isLoading: loadingInterview } = useQuery<Interview>({
    queryKey: ['/api/interviews', id],
    // Poll every 3s while scores are still 0 (last answer being evaluated)
    refetchInterval: (query) => {
      const data = query.state.data as Interview | undefined;
      if (!data) return false;
      if (data.status === 'completed' && (data.overallScore === null || data.overallScore === 0)) {
        return 3000; // Keep polling every 3s
      }
      return false; // Stop polling once scores are populated
    },
  });

  const { data: questions, isLoading: loadingQuestions } = useQuery<InterviewQuestion[]>({
    queryKey: ['/api/interviews', id, 'questions'],
    enabled: !!id,
  });

  if (loadingInterview || loadingQuestions) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Interview Not Found</h2>
        <p className="text-muted-foreground mb-6">The interview you're looking for doesn't exist.</p>
        <Link href="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const improvements = interview.improvements || [];
  const answeredQuestions = questions?.filter(q => q.userAnswer) || [];
  const averageQuestionScore = answeredQuestions.length > 0
    ? answeredQuestions.reduce((acc, q) => acc + (q.score || 0), 0) / answeredQuestions.length
    : 0;

  const handleDownloadPDF = async () => {
    // @ts-ignore - html2pdf.js types might be missing
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('report-content');
    if (!element) return;
    
    const opt = {
      margin:       [0.5, 0.5] as [number, number],
      filename:     `${interview?.company || interview?.type || 'interview'}_report.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap" data-html2canvas-ignore="true">
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold capitalize" data-testid="text-results-title">
            {interview.type} Interview Results
          </h1>
          {interview.company && (
            <Badge variant="outline" className="mt-2">{interview.company}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF} data-testid="button-download">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
          <Button 
            variant="outline" 
            data-testid="button-share"
            onClick={() => shareMutation.mutate()}
            disabled={shareMutation.isPending}
          >
            <Share2 className="w-4 h-4 mr-2" />
            {shareMutation.isPending ? "Sharing..." : "Share"}
          </Button>
        </div>
      </div>

      {/* Portfolio Sharing Center */}
      <Card className="border border-primary/20 bg-primary/5 p-6 rounded-2xl" data-html2canvas-ignore="true">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Recruiter Sharing Portfolio
            </h3>
            <p className="text-xs text-muted-foreground max-w-lg">
              Enable public portfolio access to generate a verified recruiter link. This lets potential employers view your score cards, communication analytics, and completed interview transcripts (student personal emails and video/voice logs are masked for privacy).
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              variant={(interview as any).isShared ? "destructive" : "default"}
              onClick={() => shareMutation.mutate()}
              disabled={shareMutation.isPending}
              className="rounded-xl font-bold"
            >
              {shareMutation.isPending ? "Updating..." : (interview as any).isShared ? "Revoke Access" : "Make Report Public"}
            </Button>
          </div>
        </div>

        {(interview as any).isShared && (interview as any).shareToken && (
          <div className="mt-4 p-3 bg-card border rounded-xl flex items-center gap-3 flex-wrap">
            <div className="flex-1 text-xs font-mono select-all truncate">
              {window.location.origin}/shared/report/{(interview as any).shareToken}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/shared/report/${(interview as any).shareToken}`);
                toast({ title: "Copied!", description: "Recruiter share link copied to clipboard." });
              }}
              className="rounded-lg h-8 text-[11px]"
            >
              Copy Link
            </Button>
          </div>
        )}
      </Card>

      <div id="report-content" className="space-y-8">

      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-8">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div>
              <p className="text-muted-foreground mb-1">Overall Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary" data-testid="text-overall-score">
                  {Math.round(interview.overallScore || 0)}%
                </span>
                <Badge 
                  variant={(interview.overallScore || 0) >= 70 ? "default" : "secondary"}
                  className={(interview.overallScore || 0) >= 70 ? "bg-green-500" : ""}
                >
                  {(interview.overallScore || 0) >= 80 ? 'Excellent' : 
                   (interview.overallScore || 0) >= 70 ? 'Good' : 
                   (interview.overallScore || 0) >= 50 ? 'Average' : 'Needs Improvement'}
                </Badge>
              </div>
            </div>
            <div className="flex gap-6 flex-wrap">
              <ScoreCircle 
                score={interview.technicalScore} 
                label="Technical" 
                color="text-blue-500" 
              />
              <ScoreCircle 
                score={interview.communicationScore} 
                label="Communication" 
                color="text-green-500" 
              />
              <ScoreCircle 
                score={interview.emotionScore} 
                label="Emotion" 
                color="text-purple-500" 
              />
              <ScoreCircle 
                score={interview.voiceScore} 
                label="Voice" 
                color="text-orange-500" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Round-by-Round Results for Full Simulation */}
      {(interview as any).simulationMode === 'full' && (interview as any).roundResults && Array.isArray((interview as any).roundResults) && (
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Round-by-Round Simulation Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative border-l border-border pl-6 space-y-6">
              {(interview.roundResults as any[]).map((result, idx) => (
                <div key={idx} className="relative">
                  <span className={`absolute -left-[32px] top-1 w-4.5 h-4.5 rounded-full border-2 border-background flex items-center justify-center ${
                    result.passed ? 'bg-emerald-500 text-white' : 'bg-destructive text-white'
                  }`}>
                    {result.passed ? "✓" : "✗"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm">{result.name}</h4>
                      <Badge variant={result.passed ? "default" : "destructive"} className={result.passed ? "bg-emerald-500 hover:bg-emerald-500/90 text-[10px] py-0 px-2 font-bold" : "text-[10px] py-0 px-2 font-bold"}>
                        {result.passed ? "Passed" : "Terminated"}
                      </Badge>
                      <span className="text-xs font-semibold text-muted-foreground ml-auto">{Math.round(result.score)}% Score</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{result.feedback}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {(interview.technicalScore || 0) >= 70 && (
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Strong technical knowledge and problem-solving skills</span>
                </li>
              )}
              {(interview.communicationScore || 0) >= 70 && (
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Excellent communication and articulation</span>
                </li>
              )}
              {(interview.emotionScore || 0) >= 70 && (
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Confident body language and positive expressions</span>
                </li>
              )}
              {(interview.voiceScore || 0) >= 70 && (
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Clear voice modulation and appropriate pacing</span>
                </li>
              )}
              {(interview.overallScore || 0) < 70 && (
                <li className="text-muted-foreground text-sm">
                  Continue practicing to identify your strengths
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {improvements.length > 0 ? (
                improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    <span>{improvement}</span>
                  </li>
                ))
              ) : (
                <>
                  {(interview.technicalScore || 0) < 70 && (
                    <li className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                      <span>Strengthen technical concepts and coding skills</span>
                    </li>
                  )}
                  {(interview.communicationScore || 0) < 70 && (
                    <li className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                      <span>Practice structured responses using STAR method</span>
                    </li>
                  )}
                  {(interview.voiceScore || 0) < 70 && (
                    <li className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                      <span>Work on voice clarity and speaking pace</span>
                    </li>
                  )}
                </>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {questions && questions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Question-by-Question Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div 
                  key={question.id} 
                  className="p-4 border border-border rounded-lg"
                  data-testid={`card-question-${index + 1}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <Badge variant="outline" className="mb-2 px-2 py-0.5 text-xs">
                        Question {index + 1}
                      </Badge>
                      <p className="font-medium">{question.question}</p>
                    </div>
                    {question.score !== null ? (
                      <Badge 
                        variant={question.score >= 70 ? "default" : "secondary"}
                        className={question.score >= 70 ? "bg-green-500" : ""}
                      >
                        {Math.round(question.score)}%
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="animate-pulse flex items-center gap-1.5">
                        <Brain className="w-3 h-3" />
                        Analyzing...
                      </Badge>
                    )}
                  </div>
                  
                  {question.userAnswer && (
                    <div className="bg-muted/50 p-3 rounded-lg mb-3">
                      <p className="text-sm text-muted-foreground mb-1">Your Answer:</p>
                      <p className="text-sm">{question.userAnswer}</p>
                    </div>
                  )}

                  {question.feedback ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-muted-foreground">{question.feedback.split('\n\nHow to answer:')[0]}</p>
                      </div>
                      {question.feedback.includes('\n\nHow to answer:') && (
                        <div className="bg-primary/5 border border-primary/10 p-3 rounded-lg ml-6">
                          <p className="text-xs font-semibold text-primary mb-1">💡 How to answer:</p>
                          <p className="text-sm text-muted-foreground">{question.feedback.split('\n\nHow to answer:')[1]?.trim()}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground italic bg-muted/20 p-3 rounded-lg">
                      <Zap className="w-4 h-4 animate-pulse text-primary" />
                      Our AI is currently analyzing your response for deep insights. This usually takes a few moments...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center gap-4" data-html2canvas-ignore="true">
        <Link href="/interview/start">
          <Button size="lg" data-testid="button-start-another">
            Practice Another Interview
          </Button>
        </Link>
        <Link href="/reports">
          <Button size="lg" variant="outline" data-testid="button-view-reports">
            View All Reports
          </Button>
        </Link>
      </div>
      </div>
    </div>
  );
}
