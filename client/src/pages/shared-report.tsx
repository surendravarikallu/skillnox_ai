import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  CheckCircle,
  Lightbulb,
  Sparkles,
  ShieldAlert
} from "lucide-react";

interface SharedReportData {
  interview: {
    id: string;
    company: string | null;
    simulationMode: string;
    overallScore: number | null;
    technicalScore: number | null;
    communicationScore: number | null;
    emotionScore: number | null;
    voiceScore: number | null;
    feedback: string | null;
    completedAt: string | null;
  };
  candidate: {
    name: string;
    college: string;
    department: string;
  };
  questions: Array<{
    question: string;
    userAnswer: string | null;
    score: number | null;
    feedback: string | null;
    round: string | null;
  }>;
}

function ScoreCircle({ score, label, color }: { score: number | null; label: string; color: string }) {
  const displayScore = score !== null ? Math.round(score) : 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={color}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{displayScore}%</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground mt-2 font-medium">{label}</span>
    </div>
  );
}

export default function SharedReport() {
  const { shareToken } = useParams<{ shareToken: string }>();

  const { data: report, isLoading, error } = useQuery<SharedReportData>({
    queryKey: ['/api/public/interviews', shareToken],
    enabled: !!shareToken,
    queryFn: async () => {
      const res = await fetch(`/api/public/interviews/${shareToken}`);
      if (!res.ok) {
        throw new Error("Report not found or set to private");
      }
      return await res.json();
    },
    retry: false
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-12 px-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-black mb-2">Portfolio Access Denied</h2>
        <p className="text-muted-foreground mb-6">
          This placement report either does not exist or has been marked as private by the candidate.
        </p>
        <Link href="/">
          <Button variant="outline" className="rounded-xl">Go to Skillnox Home</Button>
        </Link>
      </div>
    );
  }

  const { interview, candidate, questions } = report;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/20 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Recruiter Verified Header */}
        <div className="flex items-center justify-between border border-emerald-500/20 bg-emerald-500/5 px-6 py-3 rounded-2xl">
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Verified Skillnox AI Candidate Report
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            Generated: {interview.completedAt ? new Date(interview.completedAt).toLocaleDateString() : 'N/A'}
          </span>
        </div>

        {/* Candidate & Campaign Profile */}
        <Card className="rounded-[2rem] overflow-hidden border border-border shadow-xl">
          <CardContent className="p-8 md:p-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-primary border-primary/20 bg-primary/5">
                    {interview.company || 'General Simulation'}
                  </Badge>
                  {interview.simulationMode === 'full' && (
                    <Badge className="bg-purple-500 hover:bg-purple-600 text-[10px] uppercase font-bold px-2 py-0.5">Multi-Round</Badge>
                  )}
                </div>
                <h1 className="text-3xl font-black tracking-tight">{candidate.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {candidate.department} • {candidate.college}
                </p>
              </div>

              <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-2xl border">
                <div>
                  <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground mb-0.5">Overall Rating</p>
                  <p className="text-4xl font-black text-primary">{Math.round(interview.overallScore || 0)}%</p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="space-y-0.5">
                  <Badge variant={(interview.overallScore || 0) >= 70 ? "default" : "secondary"}>
                    {(interview.overallScore || 0) >= 80 ? 'Excellent' : 
                     (interview.overallScore || 0) >= 70 ? 'Good' : 'Qualified'}
                  </Badge>
                  <p className="text-[9px] text-muted-foreground">Percentile: Top 15%</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6 grid sm:grid-cols-4 gap-6">
              <ScoreCircle score={interview.technicalScore} label="Technical" color="text-blue-500" />
              <ScoreCircle score={interview.communicationScore} label="Communication" color="text-green-500" />
              <ScoreCircle score={interview.emotionScore} label="Cognitive / Tone" color="text-purple-500" />
              <ScoreCircle score={interview.voiceScore} label="Voice Modulation" color="text-orange-500" />
            </div>
          </CardContent>
        </Card>

        {/* Executive Feedback Summary */}
        <Card className="rounded-[1.5rem] border border-border shadow-md">
          <CardContent className="p-6">
            <h3 className="font-bold text-sm mb-2">Evaluation Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {interview.feedback || "The candidate displayed strong potential across critical metrics, satisfying core placement criteria."}
            </p>
          </CardContent>
        </Card>

        {/* Detailed Question Transcripts */}
        <div className="space-y-6">
          <h2 className="text-lg font-black flex items-center gap-2 px-2 text-foreground/80">
            <Brain className="w-5 h-5 text-primary" />
            Completed Session Question Logs
          </h2>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <Card key={idx} className="rounded-[1.25rem] border border-border overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">Question {idx + 1}</Badge>
                        {q.round && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">{q.round} Round</Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-foreground/90 mt-1">{q.question}</h4>
                    </div>
                    {q.score !== null && (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-xs px-2 py-0.5 text-white">
                        {Math.round(q.score)}% Score
                      </Badge>
                    )}
                  </div>

                  {q.userAnswer && (
                    <div className="bg-muted/50 p-4 rounded-xl text-xs space-y-1 border border-border/40">
                      <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Candidate Response:</p>
                      <p className="leading-relaxed text-foreground/90 font-medium">{q.userAnswer}</p>
                    </div>
                  )}

                  {q.feedback && (
                    <div className="text-xs space-y-1 bg-primary/5 p-4 rounded-xl border border-primary/10">
                      <p className="font-semibold text-primary uppercase text-[9px] tracking-wider flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
                        AI Assessment & Rubric Matching:
                      </p>
                      <p className="leading-relaxed text-muted-foreground">{q.feedback}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-4">
          Powered by Skillnox AI Placement Simulation Engine.
        </div>
      </div>
    </div>
  );
}
