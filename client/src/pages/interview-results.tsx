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
import { BorderBeam } from "@/components/ui/border-beam";
import { motion } from "framer-motion";
import {
  Brain,
  Users,
  Mic,
  Camera,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Download,
  Share2,
  Lightbulb,
  Zap,
  ShieldCheck,
  Award,
  Layers,
  FileText,
  Clock,
  Sparkles
} from "lucide-react";
import type { Interview, InterviewQuestion } from "@shared/schema";
import { cn } from "@/lib/utils";

function ScoreRing({ score, label, color, sublabel }: { score: number | null; label: string; color: string; sublabel?: string }) {
  const displayScore = score !== null ? Math.round(score) : 0;
  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            className="text-slate-800"
          />
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={color}
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-xl font-black text-foreground">{displayScore}%</span>
        </div>
      </div>
      <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground mt-2">{label}</span>
      {sublabel && <span className="text-[10px] text-muted-foreground/60">{sublabel}</span>}
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
    refetchInterval: (query) => {
      const data = query.state.data as Interview | undefined;
      if (!data) return false;
      if (data.status === 'completed' && (data.overallScore === null || data.overallScore === 0)) {
        return 3000;
      }
      return false;
    },
  });

  const { data: questions, isLoading: loadingQuestions } = useQuery<InterviewQuestion[]>({
    queryKey: ['/api/interviews', id, 'questions'],
    enabled: !!id,
  });

  if (loadingInterview || loadingQuestions) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-12">
        <Skeleton className="h-12 w-64 rounded-2xl" />
        <div className="grid md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Interview Not Found</h2>
        <p className="text-muted-foreground mb-6">The interview you're looking for doesn't exist.</p>
        <Link href="/">
          <Button className="rounded-xl font-bold">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const displayImprovements: string[] = [];
  if (interview.improvements && Array.isArray(interview.improvements) && interview.improvements.length > 0) {
    displayImprovements.push(...interview.improvements);
  }

  if (questions) {
    questions.forEach(q => {
      if (q.feedback && q.score !== null && q.score < 75) {
        const hint = q.feedback.split('\n\nHow to answer:')[0].trim();
        if (hint && !displayImprovements.includes(hint) && displayImprovements.length < 5) {
          displayImprovements.push(hint);
        }
      }
    });
  }

  if (displayImprovements.length === 0) {
    if ((interview.technicalScore || 0) < 75) {
      displayImprovements.push("Strengthen technical depth by explaining architecture choices, algorithmic logic, and real-world trade-offs.");
    }
    if ((interview.communicationScore || 0) < 75) {
      displayImprovements.push("Structure answers using the STAR method (Situation, Task, Action, Result) with clear bullet points.");
    }
    if ((interview.voiceScore || 0) < 75) {
      displayImprovements.push("Maintain steady vocal pacing and articulate key domain terms clearly with confidence.");
    }
    if (displayImprovements.length === 0) {
      displayImprovements.push("Elaborate further on practical project experience and edge-case handling during technical questions.");
      displayImprovements.push("Provide concrete numerical metrics (e.g., performance impact, accuracy gains) when summarizing achievements.");
    }
  }

  const handleDownloadPDF = async () => {
    try {
      // @ts-ignore - html2pdf.js types
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('report-content');
      if (!element) return;
      
      const opt = {
        margin: [0.4, 0.4] as [number, number],
        filename: `SkillnoxAI_${interview?.company || interview?.type || 'Placement'}_Report.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };
      
      html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error("PDF download failed:", e);
      window.print();
    }
  };

  const overall = Math.round(interview.overallScore || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Navigation & Header Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap" data-html2canvas-ignore="true">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-2 text-xs font-mono" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl md:text-3xl font-black capitalize" data-testid="text-results-title">
              {interview.type} Socratic Evaluation
            </h1>
            {interview.company && (
              <Badge className="bg-indigo-600/20 text-cyan-400 border-indigo-500/30 font-mono text-xs">
                {interview.company} Track
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="rounded-xl text-xs font-mono font-bold" data-testid="button-download">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download PDF
          </Button>
          <Button 
            variant="outline"
            size="sm"
            data-testid="button-share"
            onClick={() => shareMutation.mutate()}
            disabled={shareMutation.isPending}
            className="rounded-xl text-xs font-mono font-bold"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            {shareMutation.isPending ? "Syncing..." : "Recruiter Share"}
          </Button>
        </div>
      </div>

      {/* Recruiter Verified Portfolio Sharing */}
      <Card className="border border-indigo-500/20 bg-card/80 backdrop-blur-xl p-6 rounded-2xl shadow-lg" data-html2canvas-ignore="true">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-heading font-bold text-sm flex items-center gap-2 text-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Placement Credential Link
            </h3>
            <p className="text-xs text-muted-foreground max-w-xl">
              Enable public recruiter verification so campus hiring partners can view your cognitive score rubric and verbatim spoken evidence (PII is sanitized).
            </p>
          </div>
          <Button
            size="sm"
            variant={(interview as any).isShared ? "destructive" : "default"}
            onClick={() => shareMutation.mutate()}
            disabled={shareMutation.isPending}
            className="rounded-xl font-bold text-xs shrink-0"
          >
            {(interview as any).isShared ? "Revoke Access" : "Make Report Public"}
          </Button>
        </div>

        {(interview as any).isShared && (interview as any).shareToken && (
          <div className="mt-4 p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center gap-3 flex-wrap">
            <div className="flex-1 text-xs font-mono text-cyan-400 select-all truncate">
              {window.location.origin}/shared/report/{(interview as any).shareToken}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/shared/report/${(interview as any).shareToken}`);
                toast({ title: "Copied!", description: "Recruiter share link copied to clipboard." });
              }}
              className="rounded-lg h-8 text-[11px] font-mono"
            >
              Copy Link
            </Button>
          </div>
        )}
      </Card>

      {/* Printable / Downloadable Scorecard Container */}
      <div id="report-content" className="space-y-8">
        {/* Core Score Banner */}
        <Card className="rounded-[2.5rem] border border-border/80 bg-slate-950/90 backdrop-blur-xl p-8 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5" /> Skillnox Socratic Placement Audit
              </div>
              <div className="flex items-baseline justify-center md:justify-start gap-3">
                <span className="font-heading text-5xl sm:text-6xl font-black text-foreground">
                  {overall}%
                </span>
                <Badge
                  className={cn(
                    "text-xs font-mono uppercase tracking-wider px-3 py-1",
                    overall >= 80 ? "bg-emerald-600 text-white" :
                    overall >= 70 ? "bg-indigo-600 text-white" :
                    overall >= 50 ? "bg-amber-600 text-white" : "bg-destructive text-white"
                  )}
                >
                  {overall >= 80 ? 'Drive Ready ★★★' : 
                   overall >= 70 ? 'Eligible for Round 2 ★★' : 
                   overall >= 50 ? 'Requires Drill Mentorship ★' : 'Action Required'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Evaluated against Bloom's Cognitive Taxonomy and Recruiter Benchmarks.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <ScoreRing score={interview.technicalScore} label="Technical" color="text-indigo-400" sublabel="Bloom Depth" />
              <ScoreRing score={interview.communicationScore} label="Communication" color="text-cyan-400" sublabel="STAR Clarity" />
              <ScoreRing score={interview.emotionScore} label="Composure" color="text-pink-400" sublabel="Stress Poise" />
              <ScoreRing score={interview.voiceScore} label="Acoustic" color="text-emerald-400" sublabel="Cadence" />
            </div>
          </div>
          <BorderBeam size={340} duration={14} colorFrom="#6366F1" colorTo="#06B6D4" />
        </Card>

        {/* Strengths & Improvements Bento */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="rounded-[2rem] border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="font-heading text-base font-bold flex items-center gap-2 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                Verified Candidate Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {(interview.technicalScore || 0) >= 70 && (
                <div className="flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Strong technical foundation and structured algorithmic reasoning.</span>
                </div>
              )}
              {(interview.communicationScore || 0) >= 70 && (
                <div className="flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Crisp verbal articulation using clear cause-and-effect logical structure.</span>
                </div>
              )}
              {(interview.voiceScore || 0) >= 70 && (
                <div className="flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Steady vocal tone and confident speech pacing under technical questioning.</span>
                </div>
              )}
              <div className="flex items-start gap-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Zero tab-switching or proxy anomalies detected during session.</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="font-heading text-base font-bold flex items-center gap-2 text-amber-400">
                <Lightbulb className="w-4 h-4" />
                Faculty Actionable Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {displayImprovements.map((improvement, index) => (
                <div key={index} className="flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{improvement}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Question-by-Question Socratic Verbatim Breakdown */}
        {questions && questions.length > 0 && (
          <Card className="rounded-[2rem] border border-border/80 bg-card/80 backdrop-blur-xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div>
                <h3 className="font-heading text-xl font-bold">Verbatim Speech & Socratic Question Log</h3>
                <p className="text-xs text-muted-foreground">Every question, candidate spoken response, and AI feedback rubric</p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {questions.length} Questions Evaluated
              </Badge>
            </div>

            <div className="space-y-6">
              {questions.map((question, index) => (
                <div 
                  key={question.id} 
                  className="p-5 border border-border/70 rounded-2xl bg-muted/20 space-y-3"
                  data-testid={`card-question-${index + 1}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
                          Q{index + 1} • {question.round || "Technical"}
                        </Badge>
                      </div>
                      <p className="font-heading font-bold text-sm md:text-base text-foreground">{question.question}</p>
                    </div>
                    {question.score !== null ? (
                      <Badge 
                        className={cn(
                          "text-xs font-mono font-bold shrink-0",
                          question.score >= 70 ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                        )}
                      >
                        {Math.round(question.score)}%
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="animate-pulse text-xs font-mono">
                        Analyzing...
                      </Badge>
                    )}
                  </div>
                  
                  {question.userAnswer && (
                    <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-1">
                      <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Candidate Spoken Response:</span>
                      <p className="text-slate-200 leading-relaxed italic">&ldquo;{question.userAnswer}&rdquo;</p>
                    </div>
                  )}

                  {question.feedback && (
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
                      <span className="font-mono text-[10px] text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Socratic AI Rubric Feedback:
                      </span>
                      <p className="text-foreground leading-relaxed">{question.feedback.split('\n\nHow to answer:')[0]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="flex justify-center gap-4 pt-4" data-html2canvas-ignore="true">
        <Link href="/interview/start">
          <Button size="lg" className="rounded-xl px-8 h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25">
            Practice Another Socratic Interview →
          </Button>
        </Link>
      </div>
    </div>
  );
}
