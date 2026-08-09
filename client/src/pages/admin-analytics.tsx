import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  BarChart3,
  TrendingUp,
  Users,
  Brain,
  Target,
  Award,
  Activity,
  Zap,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle,
  Clock,
  XCircle,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BranchPerf {
  branch: string;
  students: number;
  interviews: number;
  avgTechnical: number;
  avgCommunication: number;
  avgOverall: number;
}

interface TypeBreakdown {
  type: string;
  total: number;
  completed: number;
  avgScore: number;
}

interface SkillGap {
  skill: string;
  count: number;
}

interface TopPerformer {
  name: string;
  dept: string;
  avgScore: number;
  count: number;
}

interface AnalyticsData {
  today: { total: number; completed: number; inProgress: number; avgDuration: number };
  daily: any[];
  branchPerformance: BranchPerf[];
  interviewTypeBreakdown: TypeBreakdown[];
  scoreDistribution: { excellent: number; good: number; average: number; poor: number };
  skillGaps: SkillGap[];
  statusSummary: { total: number; completed: number; inProgress: number; pending: number; cancelled: number };
  topPerformers: TopPerformer[];
  totalStudents: number;
  totalInterviews: number;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  technical: { bg: "bg-blue-500/10", text: "text-blue-500", icon: "from-blue-500 to-indigo-600" },
  hr: { bg: "bg-emerald-500/10", text: "text-emerald-500", icon: "from-emerald-500 to-teal-600" },
  behavioral: { bg: "bg-purple-500/10", text: "text-purple-500", icon: "from-purple-500 to-pink-600" },
  company: { bg: "bg-orange-500/10", text: "text-orange-500", icon: "from-orange-500 to-red-600" },
  gd: { bg: "bg-pink-500/10", text: "text-pink-500", icon: "from-pink-500 to-rose-600" },
  project: { bg: "bg-amber-500/10", text: "text-amber-500", icon: "from-amber-500 to-yellow-600" },
  communication: { bg: "bg-cyan-500/10", text: "text-cyan-500", icon: "from-cyan-500 to-sky-600" },
};

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="font-black">{value}%</span>
      </div>
      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "circOut" }}
        />
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics/detailed"],
  });

  if (isLoading) {
    return (
      <div className="max-w-[1600px] mx-auto space-y-8 pb-12">
        <Skeleton className="h-16 w-96" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  const sd = data?.scoreDistribution || { excellent: 0, good: 0, average: 0, poor: 0 };
  const totalScored = sd.excellent + sd.good + sd.average + sd.poor;

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
          <BarChart3 className="w-3 h-3" />
          Deep Intelligence
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-2">Campus Analytics</h1>
        <p className="text-muted-foreground text-lg">
          Comprehensive performance metrics, skill gaps, and placement readiness across all departments.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl glass-card overflow-hidden relative group">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-black">{data?.totalStudents || 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Total Students</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl glass-card overflow-hidden relative group">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Brain className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-black">{data?.totalInterviews || 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Total Interviews</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl glass-card overflow-hidden relative group">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-black">{data?.statusSummary?.completed || 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl glass-card overflow-hidden relative group">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-black">{data?.today?.total || 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Today's Sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Branch Performance + Score Distribution */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Branch-Wise Performance Matrix */}
        <Card className="lg:col-span-2 rounded-[2rem] glass-card overflow-hidden relative">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
              <Layers className="w-6 h-6 text-primary" />
              Branch-Wise Performance Matrix
            </CardTitle>
            <p className="text-sm text-muted-foreground">Department-level metrics across all interview sessions</p>
          </CardHeader>
          <CardContent className="p-8 pt-2">
            {!data?.branchPerformance?.length ? (
              <div className="text-center py-12 text-muted-foreground">No department data available yet.</div>
            ) : (
              <div className="space-y-5">
                {data.branchPerformance.map((bp, idx) => (
                  <motion.div
                    key={bp.branch}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="p-5 rounded-2xl bg-muted/30 border border-border/60 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <span className="text-sm font-black text-primary">{bp.branch.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-bold text-sm">{bp.branch}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {bp.students} students · {bp.interviews} interviews
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={bp.avgOverall >= 70 ? "default" : bp.avgOverall >= 50 ? "secondary" : "destructive"}
                        className="font-black px-3 py-1"
                      >
                        {bp.avgOverall}% Avg
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <ScoreBar label="Technical" value={bp.avgTechnical} max={100} color="bg-gradient-to-r from-blue-500 to-indigo-600" />
                      <ScoreBar label="Communication" value={bp.avgCommunication} max={100} color="bg-gradient-to-r from-emerald-500 to-teal-600" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
          <BorderBeam size={200} duration={10} />
        </Card>

        {/* Score Distribution + Today's Activity */}
        <div className="space-y-8">
          {/* Score Distribution */}
          <Card className="rounded-[2rem] glass-card p-8">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Score Distribution
              </CardTitle>
              <p className="text-xs text-muted-foreground">Performance tier breakdown across all completed sessions</p>
            </CardHeader>
            <CardContent className="p-0 space-y-5">
              {[
                { label: "Excellent (80-100%)", count: sd.excellent, color: "bg-gradient-to-r from-emerald-500 to-green-600", textColor: "text-emerald-500" },
                { label: "Good (60-79%)", count: sd.good, color: "bg-gradient-to-r from-blue-500 to-indigo-600", textColor: "text-blue-500" },
                { label: "Average (40-59%)", count: sd.average, color: "bg-gradient-to-r from-amber-500 to-orange-600", textColor: "text-amber-500" },
                { label: "Needs Work (<40%)", count: sd.poor, color: "bg-gradient-to-r from-red-500 to-rose-600", textColor: "text-red-500" },
              ].map((tier, idx) => (
                <motion.div
                  key={tier.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">{tier.label}</span>
                    <span className={cn("text-sm font-black", tier.textColor)}>
                      {tier.count} <span className="text-muted-foreground font-normal text-[10px]">({totalScored > 0 ? Math.round((tier.count / totalScored) * 100) : 0}%)</span>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", tier.color)}
                      initial={{ width: 0 }}
                      animate={{ width: `${totalScored > 0 ? (tier.count / totalScored) * 100 : 0}%` }}
                      transition={{ duration: 1.2, delay: idx * 0.15, ease: "circOut" }}
                    />
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Today's Activity */}
          <Card className="rounded-[2rem] glass-card bg-gradient-to-br from-card/90 to-emerald-500/5 p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity className="w-16 h-16 text-emerald-500" />
            </div>
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-black tracking-tight">Today's Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {[
                { label: "Sessions Started", value: data?.today?.total || 0, icon: Zap, color: "text-blue-500" },
                { label: "Completed", value: data?.today?.completed || 0, icon: CheckCircle, color: "text-emerald-500" },
                { label: "In Progress", value: data?.today?.inProgress || 0, icon: Clock, color: "text-amber-500" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/60">
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("w-4 h-4", item.color)} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-lg font-black">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interview Type Breakdown + Skill Gaps + Top Performers */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Interview Type Breakdown */}
        <Card className="rounded-[2rem] glass-card overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Interview Types
            </CardTitle>
            <p className="text-xs text-muted-foreground">Performance by interview category</p>
          </CardHeader>
          <CardContent className="p-8 pt-2 space-y-4">
            {!data?.interviewTypeBreakdown?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No interview data yet.</div>
            ) : (
              data.interviewTypeBreakdown.map((tb, idx) => {
                const colors = TYPE_COLORS[tb.type] || TYPE_COLORS.technical;
                return (
                  <motion.div
                    key={tb.type}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.08 }}
                    className={cn("p-4 rounded-2xl border border-border/60 space-y-3", colors.bg)}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-sm font-bold capitalize", colors.text)}>{tb.type}</span>
                      <Badge variant="outline" className="text-[10px] font-black">{tb.total} total</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{tb.completed} completed</span>
                      <span className="font-black text-foreground">{tb.avgScore}% avg</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full bg-gradient-to-r", colors.icon)}
                        initial={{ width: 0 }}
                        animate={{ width: `${tb.avgScore}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                      />
                    </div>
                  </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Skill Gaps */}
        <Card className="rounded-[2rem] glass-card overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
              Critical Skill Gaps
            </CardTitle>
            <p className="text-xs text-muted-foreground">Areas requiring immediate training focus</p>
          </CardHeader>
          <CardContent className="p-8 pt-2 space-y-5">
            {!data?.skillGaps?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No skill gap data available.</div>
            ) : (
              data.skillGaps.map((gap, idx) => (
                <motion.div
                  key={gap.skill}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{gap.skill}</span>
                    <span className="text-xs font-black text-orange-500">{gap.count} hits</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(gap.count / (data.skillGaps[0]?.count || 1)) * 100}%` }}
                      transition={{ duration: 1, delay: idx * 0.08 }}
                    />
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="rounded-[2rem] glass-card overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Top Performers
            </CardTitle>
            <p className="text-xs text-muted-foreground">Highest scoring candidates across all sessions</p>
          </CardHeader>
          <CardContent className="p-8 pt-2 space-y-3">
            {!data?.topPerformers?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No completed interviews yet.</div>
            ) : (
              data.topPerformers.map((tp, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/60 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <span className="text-xs font-black text-primary">{tp.name.charAt(0).toUpperCase()}</span>
                      </div>
                      {idx < 3 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-background">
                          <span className="text-[7px] font-black text-black">{idx + 1}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold group-hover:text-primary transition-colors">{tp.name}</p>
                      <p className="text-[10px] text-muted-foreground">{tp.dept || 'General'} · {tp.count} interviews</p>
                    </div>
                  </div>
                  <Badge
                    variant={tp.avgScore >= 80 ? "default" : tp.avgScore >= 60 ? "secondary" : "destructive"}
                    className="font-black px-2.5 py-1"
                  >
                    {tp.avgScore}%
                  </Badge>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Interview Status Summary */}
      <Card className="rounded-[2rem] glass-card overflow-hidden relative">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Interview Pipeline Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Completed", value: data?.statusSummary?.completed || 0, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              { label: "In Progress", value: data?.statusSummary?.inProgress || 0, icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Pending", value: data?.statusSummary?.pending || 0, icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10" },
              { label: "Cancelled", value: data?.statusSummary?.cancelled || 0, icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
            ].map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn("p-6 rounded-2xl border border-border/60 text-center", item.bg)}
              >
                <item.icon className={cn("w-8 h-8 mx-auto mb-3", item.color)} />
                <p className="text-3xl font-black">{item.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
        <BorderBeam size={300} duration={12} />
      </Card>
    </div>
  );
}
