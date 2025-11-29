import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowUpRight
} from "lucide-react";
import type { PlacementProbability, Interview } from "@shared/schema";

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
    <Card className={isHighlighted ? 'border-primary ring-2 ring-primary/20' : ''}>
      <CardContent className="p-6 text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="55"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-muted"
            />
            <circle
              cx="64"
              cy="64"
              r="55"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="text-primary"
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" data-testid={`text-prob-${days}`}>{displayValue}%</span>
          </div>
        </div>
        <h3 className="font-semibold text-lg">{days} Days</h3>
        <p className="text-sm text-muted-foreground">
          {displayValue >= 70 ? 'High chance' : displayValue >= 40 ? 'Moderate chance' : 'Keep practicing'}
        </p>
      </CardContent>
    </Card>
  );
}

export default function PlacementPage() {
  const { data: placement, isLoading: loadingPlacement } = useQuery<PlacementProbability>({
    queryKey: ["/api/placement-probability"],
  });

  const { data: interviews, isLoading: loadingInterviews } = useQuery<Interview[]>({
    queryKey: ["/api/interviews"],
  });

  const completedInterviews = interviews?.filter(i => i.status === 'completed') || [];
  
  const factors = (placement?.factors as any) || {};
  const recommendations = placement?.recommendations || [];

  if (loadingPlacement || loadingInterviews) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!placement) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Placement Prediction Yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Complete interviews and upload your resume to get personalized placement predictions based on your performance.
          </p>
        </div>
      </div>
    );
  }

  const highestProb = Math.max(
    placement.probability30Days || 0,
    placement.probability60Days || 0,
    placement.probability90Days || 0
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Placement Probability</h1>
        <p className="text-muted-foreground mt-1">
          AI-predicted chances of placement based on your performance metrics
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <ProbabilityCard 
          days={30} 
          probability={placement.probability30Days} 
          isHighlighted={placement.probability30Days === highestProb}
        />
        <ProbabilityCard 
          days={60} 
          probability={placement.probability60Days}
          isHighlighted={placement.probability60Days === highestProb}
        />
        <ProbabilityCard 
          days={90} 
          probability={placement.probability90Days}
          isHighlighted={placement.probability90Days === highestProb}
        />
      </div>

      {placement.confidence !== null && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold">Prediction Confidence</h3>
                <p className="text-sm text-muted-foreground">
                  Based on {completedInterviews.length} completed interviews
                </p>
              </div>
              <Badge variant={placement.confidence >= 70 ? "default" : "secondary"}>
                {Math.round(placement.confidence)}% Confidence
              </Badge>
            </div>
            <Progress value={placement.confidence} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Complete more interviews to improve prediction accuracy
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Contributing Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Technical Skills</span>
                  <span className="text-sm font-medium">{Math.round(factors.technical || 0)}%</span>
                </div>
                <Progress value={factors.technical || 0} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Communication</span>
                  <span className="text-sm font-medium">{Math.round(factors.communication || 0)}%</span>
                </div>
                <Progress value={factors.communication || 0} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Resume Quality</span>
                  <span className="text-sm font-medium">{Math.round(factors.resume || 0)}%</span>
                </div>
                <Progress value={factors.resume || 0} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Interview Confidence</span>
                  <span className="text-sm font-medium">{Math.round(factors.confidence || 0)}%</span>
                </div>
                <Progress value={factors.confidence || 0} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Market Alignment</span>
                  <span className="text-sm font-medium">{Math.round(factors.market || 0)}%</span>
                </div>
                <Progress value={factors.market || 0} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recommendations.length > 0 ? (
                recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <ArrowUpRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))
              ) : (
                <>
                  <li className="flex items-start gap-3">
                    <ArrowUpRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Complete more mock interviews to improve confidence</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowUpRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Focus on technical interview practice for coding roles</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowUpRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Update your resume with recent projects and skills</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowUpRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Practice company-specific interview patterns</span>
                  </li>
                </>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Interview History Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold" data-testid="text-total-interviews">{interviews?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Interviews</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{completedInterviews.length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">
                {completedInterviews.length > 0 
                  ? Math.round(completedInterviews.reduce((acc, i) => acc + (i.overallScore || 0), 0) / completedInterviews.length)
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Avg Score</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {Math.round(placement.probability90Days || 0)}%
              </p>
              <p className="text-sm text-muted-foreground">Best Prediction</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
