import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
  Lightbulb
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

  const { data: interview, isLoading: loadingInterview } = useQuery<Interview>({
    queryKey: ['/api/interviews', id],
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
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
          <Button variant="outline" data-testid="button-download">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
          <Button variant="outline" data-testid="button-share">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

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
                    {question.score !== null && (
                      <Badge 
                        variant={question.score >= 70 ? "default" : "secondary"}
                        className={question.score >= 70 ? "bg-green-500" : ""}
                      >
                        {Math.round(question.score)}%
                      </Badge>
                    )}
                  </div>
                  
                  {question.userAnswer && (
                    <div className="bg-muted/50 p-3 rounded-lg mb-3">
                      <p className="text-sm text-muted-foreground mb-1">Your Answer:</p>
                      <p className="text-sm">{question.userAnswer}</p>
                    </div>
                  )}

                  {question.feedback && (
                    <div className="flex items-start gap-2 text-sm">
                      <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                      <p className="text-muted-foreground">{question.feedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center gap-4">
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
  );
}
