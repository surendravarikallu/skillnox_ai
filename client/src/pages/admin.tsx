import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BorderBeam } from "@/components/ui/border-beam";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Users,
  Brain,
  Target,
  Download,
  Search,
  Eye,
  Activity,
  Pause,
  Play,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { cn } from "@/lib/utils";

interface AdminStats {
  totalStudents: number;
  totalInterviews: number;
  avgTechnicalScore: number;
  avgHrScore: number;
  avgGdScore: number;
  avgPlacementProb: number;
}

interface SkillGap {
  skill: string;
  count: number;
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loadingStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: students, isLoading: loadingStudents } = useQuery<User[]>({
    queryKey: ["/api/admin/students"],
  });

  const { data: skillGaps, isLoading: loadingSkillGaps } = useQuery<SkillGap[]>({
    queryKey: ["/api/admin/skill-gaps"],
  });

  const { data: settings, isLoading: loadingSettings } = useQuery<Array<{ key: string; value: string }>>({
    queryKey: ["/api/admin/settings"],
  });

  const interviewsPaused = settings?.find(s => s.key === 'interviews_paused')?.value === 'true';

  const toggleInterviewsMutation = useMutation({
    mutationFn: async () => {
      const newValue = interviewsPaused ? 'false' : 'true';
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          key: 'interviews_paused',
          value: newValue,
        }),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: interviewsPaused ? "Interviews resumed" : "Interviews paused",
        description: interviewsPaused
          ? "Students can now access interviews"
          : "All interviews are now paused",
      });
    },
  });

  const filteredStudents =
    students
      ?.filter((student) => {
        const query = searchQuery.toLowerCase();
        const fullName = `${student.firstName || ""} ${student.lastName || ""}`.toLowerCase();
        return (
          fullName.includes(query) ||
          student.email?.toLowerCase().includes(query) ||
          student.department?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => (b.interviewCount || 0) - (a.interviewCount || 0)) || [];

  const handleExport = () => {
    const data = filteredStudents.map(s => ({
      name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'N/A',
      email: s.email || 'N/A',
      department: s.department || 'N/A',
      interviews: s.interviewCount || 0,
    }));

    const csv = [
      ['Name', 'Email', 'Department', 'Interviews'],
      ...data.map(row => [row.name, row.email, row.department, row.interviews])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillnox-ai-placement-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12">
      {/* Admin Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-3">
            <Activity className="w-3 h-3" />
            T&P Placement Cell Command Center
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-black tracking-tight mb-2 text-foreground">
            Campus Drive Intelligence
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Real-time telemetry of engineering cohort mock interviews, Bloom's taxonomy depth scores, and recruiter drive readiness.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant={interviewsPaused ? "default" : "destructive"}
            size="sm"
            className="rounded-xl h-11 px-5 font-bold text-xs shadow-lg"
            onClick={() => toggleInterviewsMutation.mutate()}
            disabled={toggleInterviewsMutation.isPending || loadingSettings}
          >
            {interviewsPaused ? (
              <><Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Resume Drive Interviews</>
            ) : (
              <><Pause className="w-3.5 h-3.5 mr-1.5 fill-current" /> Emergency Pause</>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl h-11 px-5 border-border/80 bg-background/60 font-mono font-bold text-xs hover:bg-accent"
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Campus Placement Telemetry Summary Banner */}
      <Card className="rounded-2xl border border-border/80 bg-slate-950 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Drive Automated Screening Active
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs font-mono text-slate-400">70%+ Faculty Evaluation Hours Saved</span>
              </div>
              <p className="font-heading font-bold text-sm text-foreground mt-0.5">
                All mock interview sessions run against Groq LPU sub-80ms engine with anti-proxy gaze & window verification.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-right">
              <span className="text-xs font-mono text-slate-400">ENGINE LATENCY</span>
              <p className="font-mono text-sm font-bold text-cyan-400">78ms (Groq LPU)</p>
            </div>
            <div className="h-8 w-[1px] bg-slate-800 hidden sm:block" />
            <div className="text-right">
              <span className="text-xs font-mono text-slate-400">STUDENTS AUDITED</span>
              <p className="font-mono text-sm font-bold text-emerald-400">{stats?.totalStudents || 0} Registered</p>
            </div>
          </div>
        </div>
        <BorderBeam size={280} duration={14} colorFrom="#6366F1" colorTo="#06B6D4" />
      </Card>

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loadingStats ? (
          [...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          [
            { title: "Total Students", value: stats?.totalStudents || 0, isPercent: false, icon: Users, color: "text-blue-400", border: "border-blue-500/20" },
            { title: "Interviews Run", value: stats?.totalInterviews || 0, isPercent: false, icon: Brain, color: "text-indigo-400", border: "border-indigo-500/20" },
            { title: "Avg Technical", value: stats?.avgTechnicalScore || 0, isPercent: true, icon: Zap, color: "text-cyan-400", border: "border-cyan-500/20" },
            { title: "Avg HR Poise", value: stats?.avgHrScore || 0, isPercent: true, icon: Users, color: "text-emerald-400", border: "border-emerald-500/20" },
            { title: "Avg GD Dynamics", value: stats?.avgGdScore || 0, isPercent: true, icon: Activity, color: "text-pink-400", border: "border-pink-500/20" },
            { title: "Placement Index", value: stats?.avgPlacementProb || 0, isPercent: true, icon: Target, color: "text-amber-400", border: "border-amber-500/20" },
          ].map((item) => (
            <Card key={item.title} className={cn("rounded-2xl border bg-card/80 backdrop-blur-xl p-4 shadow-md", item.border)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">{item.title}</p>
                  <p className="font-heading text-2xl font-black mt-1 text-foreground">
                    {item.isPercent ? `${Math.round(item.value)}%` : item.value}
                  </p>
                </div>
                <div className={cn("w-8 h-8 rounded-xl bg-background/60 border border-border/80 flex items-center justify-center shrink-0", item.color)}>
                  <item.icon className="w-4 h-4" />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Performance Table Bento */}
        <Card className="lg:col-span-2 rounded-[2rem] border border-border/80 bg-card/80 backdrop-blur-xl overflow-hidden shadow-2xl relative">
          <CardHeader className="p-6 md:p-8 pb-4 border-b border-border/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-heading text-xl font-bold tracking-tight">Candidate Performance Leaderboard</CardTitle>
                <p className="text-xs text-muted-foreground">High-performance candidate tracking for recruiter shortlisting</p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filter name, email, dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 bg-background/60 border-border/80 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingStudents ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40 border-border/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6 py-4 font-mono font-bold uppercase tracking-wider text-[10px]">Candidate</TableHead>
                      <TableHead className="font-mono font-bold uppercase tracking-wider text-[10px]">Department</TableHead>
                      <TableHead className="font-mono font-bold uppercase tracking-wider text-[10px] text-center">Interviews</TableHead>
                      <TableHead className="font-mono font-bold uppercase tracking-wider text-[10px] text-right pr-6">Audit Report</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student, idx) => (
                      <TableRow key={student.id} className="border-border/60 hover:bg-muted/30 transition-colors group">
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="w-9 h-9 border border-border/80">
                                <AvatarImage src={student.profileImageUrl || undefined} />
                                <AvatarFallback className="font-bold text-xs bg-indigo-500/10 text-indigo-400">
                                  {student.firstName?.[0] || 'S'}
                                </AvatarFallback>
                              </Avatar>
                              {idx < 3 && (
                                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-background">
                                  <span className="text-[7px] font-black text-black">{idx + 1}</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-xs group-hover:text-cyan-400 transition-colors">
                                {`${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Candidate'}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[180px]">{student.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-lg border-border/80 bg-background/50 font-mono text-[10px]">
                            {student.department || 'General'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-xs font-bold">{student.interviewCount || 0}</span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button onClick={() => setLocation('/admin/students')} variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-indigo-600 hover:text-white transition-all" title="View Student Audits">
                            <ArrowUpRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Intelligence Bento Column */}
        <div className="space-y-6">
          {/* Skill Gaps Card */}
          <Card className="rounded-[2rem] border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-xl space-y-5">
            <CardHeader className="p-0">
              <CardTitle className="font-heading text-base font-bold tracking-tight flex items-center gap-2 text-amber-400">
                <ShieldAlert className="w-4 h-4" />
                Campus Curriculum Skill Gaps
              </CardTitle>
              <p className="text-xs text-muted-foreground">Topics where students struggle in Socratic drills</p>
            </CardHeader>
            <CardContent className="p-0">
              {loadingSkillGaps ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full rounded-xl" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {skillGaps?.slice(0, 5).map((gap, idx) => (
                    <div key={gap.skill} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold">{gap.skill}</span>
                        <span className="font-mono text-amber-400 font-bold">{gap.count} flags</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${(gap.count / (skillGaps[0]?.count || 1)) * 100}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Telemetry Health Card */}
          <Card className="rounded-[2rem] border border-border/80 bg-slate-950 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-heading text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                AI Inference Stack
              </h4>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 font-mono text-[9px]">ONLINE</Badge>
            </div>
            
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Groq LPU (Audio + LLM)</span>
                <span className="text-cyan-400 font-bold">Sub-80ms</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Anti-Proxy Proctor Engine</span>
                <span className="text-emerald-400 font-bold">Active</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Bloom's Rubric Generator</span>
                <span className="text-indigo-400 font-bold">Synchronized</span>
              </div>
            </div>

            <Button 
              size="sm" 
              onClick={() => setLocation('/ai-status')} 
              className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-mono text-xs font-bold h-9"
            >
              Telemetry Logs & Health →
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
