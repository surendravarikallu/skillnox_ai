import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Brain,
  Heart,
  Lightbulb,
  Calendar,
  Sparkles
} from "lucide-react";
import type { PersonalityAssessment } from "@shared/schema";

interface TraitSliderProps {
  leftLabel: string;
  rightLabel: string;
  value: number | null;
  leftIcon: React.ElementType;
  rightIcon: React.ElementType;
}

function TraitSlider({ leftLabel, rightLabel, value, leftIcon: LeftIcon, rightIcon: RightIcon }: TraitSliderProps) {
  const normalizedValue = value !== null ? (value + 1) * 50 : 50;
  const isLeft = normalizedValue < 50;
  const strength = Math.abs(normalizedValue - 50);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 ${!isLeft ? 'text-muted-foreground' : ''}`}>
          <LeftIcon className="w-5 h-5" />
          <span className="font-medium">{leftLabel}</span>
        </div>
        <div className={`flex items-center gap-2 ${isLeft ? 'text-muted-foreground' : ''}`}>
          <span className="font-medium">{rightLabel}</span>
          <RightIcon className="w-5 h-5" />
        </div>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="w-1/2 h-full relative">
            {normalizedValue < 50 && (
              <div 
                className="absolute right-0 h-full bg-primary rounded-l-full"
                style={{ width: `${(50 - normalizedValue) * 2}%` }}
              />
            )}
          </div>
          <div className="w-px bg-border" />
          <div className="w-1/2 h-full relative">
            {normalizedValue > 50 && (
              <div 
                className="absolute left-0 h-full bg-primary rounded-r-full"
                style={{ width: `${(normalizedValue - 50) * 2}%` }}
              />
            )}
          </div>
        </div>
        <div 
          className="absolute top-1/2 w-4 h-4 bg-primary rounded-full border-2 border-background -translate-y-1/2 -translate-x-1/2 transition-all"
          style={{ left: `${normalizedValue}%` }}
        />
      </div>
      <div className="text-center">
        <Badge variant="secondary">
          {strength > 25 ? 'Strong' : strength > 10 ? 'Moderate' : 'Balanced'} {isLeft ? leftLabel : rightLabel}
        </Badge>
      </div>
    </div>
  );
}

export default function PersonalityPage() {
  const { data: personality, isLoading } = useQuery<PersonalityAssessment>({
    queryKey: ["/api/personality"],
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!personality) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Personality Assessment Yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Complete more interviews to get your personality profile. Our AI analyzes your responses to understand your personality traits.
          </p>
        </div>
      </div>
    );
  }

  const dominantTraits = personality.dominantTraits || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Personality Profile</h1>
        <p className="text-muted-foreground mt-1">
          Based on your interview responses and communication patterns
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <h2 className="text-xl font-semibold mb-2">Your Personality Summary</h2>
              <p className="text-muted-foreground" data-testid="text-personality-summary">
                {personality.summary || 'Your personality profile shows a unique blend of traits that make you well-suited for various roles. Continue interviewing to refine this assessment.'}
              </p>
              {dominantTraits.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {dominantTraits.map((trait, index) => (
                    <Badge key={index} variant="default" data-testid={`badge-trait-${index}`}>
                      {trait}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Social Orientation</CardTitle>
          </CardHeader>
          <CardContent>
            <TraitSlider
              leftLabel="Introvert"
              rightLabel="Extrovert"
              value={personality.introvertExtrovert}
              leftIcon={User}
              rightIcon={User}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Decision Making</CardTitle>
          </CardHeader>
          <CardContent>
            <TraitSlider
              leftLabel="Thinker"
              rightLabel="Feeler"
              value={personality.thinkerFeeler}
              leftIcon={Brain}
              rightIcon={Heart}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Problem Solving</CardTitle>
          </CardHeader>
          <CardContent>
            <TraitSlider
              leftLabel="Logical"
              rightLabel="Creative"
              value={personality.logicalCreative}
              leftIcon={Brain}
              rightIcon={Lightbulb}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Work Style</CardTitle>
          </CardHeader>
          <CardContent>
            <TraitSlider
              leftLabel="Planner"
              rightLabel="Spontaneous"
              value={personality.plannerSpontaneous}
              leftIcon={Calendar}
              rightIcon={Sparkles}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Career Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3">Strengths</h3>
              <ul className="space-y-2">
                {(personality.introvertExtrovert || 0) > 0 && (
                  <li className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Strong interpersonal and collaboration skills
                  </li>
                )}
                {(personality.introvertExtrovert || 0) <= 0 && (
                  <li className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Deep focus and analytical thinking
                  </li>
                )}
                {(personality.thinkerFeeler || 0) < 0 && (
                  <li className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Objective decision-making abilities
                  </li>
                )}
                {(personality.thinkerFeeler || 0) >= 0 && (
                  <li className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Strong empathy and emotional intelligence
                  </li>
                )}
                {(personality.logicalCreative || 0) > 0 && (
                  <li className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Creative problem-solving approach
                  </li>
                )}
                {(personality.logicalCreative || 0) <= 0 && (
                  <li className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Systematic and methodical approach
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-3">Recommended Roles</h3>
              <div className="flex flex-wrap gap-2">
                {(personality.logicalCreative || 0) <= 0 && (
                  <>
                    <Badge variant="outline">Software Developer</Badge>
                    <Badge variant="outline">Data Analyst</Badge>
                    <Badge variant="outline">System Architect</Badge>
                  </>
                )}
                {(personality.logicalCreative || 0) > 0 && (
                  <>
                    <Badge variant="outline">UX Designer</Badge>
                    <Badge variant="outline">Product Manager</Badge>
                    <Badge variant="outline">Content Strategist</Badge>
                  </>
                )}
                {(personality.introvertExtrovert || 0) > 0 && (
                  <>
                    <Badge variant="outline">Team Lead</Badge>
                    <Badge variant="outline">Sales Engineer</Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
