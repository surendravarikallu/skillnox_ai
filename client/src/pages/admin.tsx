import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GradientStatCard } from "@/components/dashboard/gradient-stat-card";
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
  TrendingUp,
  Download,
  Search,
  BarChart3,
  Eye,
  FileText,
  Activity,
  Pause,
  Play,
  ArrowUpRight,
  ShieldAlert,
  Zap
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
    a.download = `skillnox-ai-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-12">
      {/* Admin Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
            <Activity className="w-3 h-3" />
            System Command Center
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Admin Intelligence</h1>
          <p className="text-muted-foreground text-lg">
            Real-time monitoring of campus performance and AI readiness.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant={interviewsPaused ? "default" : "destructive"}
            size="lg"
            className="rounded-2xl h-14 px-6 font-bold shadow-lg"
            onClick={() => toggleInterviewsMutation.mutate()}
            disabled={toggleInterviewsMutation.isPending || loadingSettings}
          >
            {interviewsPaused ? (
              <><Play className="w-4 h-4 mr-2 fill-current" /> Resume Interviews</>
            ) : (
              <><Pause className="w-4 h-4 mr-2 fill-current" /> Emergency Pause</>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="rounded-2xl h-14 px-6 border-border bg-muted/50 font-bold hover:bg-muted"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loadingStats ? (
          [...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (
          <>
            <GradientStatCard
              title="Total Students"
              value={stats?.totalStudents || 0}
              icon={Users}
              gradientFrom="blue-500"
              gradientTo="cyan-400"
            />
            <GradientStatCard
              title="Interviews"
              value={stats?.totalInterviews || 0}
              icon={Brain}
              gradientFrom="indigo-500"
              gradientTo="purple-600"
            />
            <GradientStatCard
              title="Avg Technical"
              value={stats?.avgTechnicalScore || 0}
              icon={Zap}
              gradientFrom="orange-500"
              gradientTo="red-600"
            />
            <GradientStatCard
              title="Avg HR"
              value={stats?.avgHrScore || 0}
              icon={Users}
              gradientFrom="emerald-500"
              gradientTo="teal-600"
            />
            <GradientStatCard
              title="Avg GD"
              value={stats?.avgGdScore || 0}
              icon={Activity}
              gradientFrom="pink-500"
              gradientTo="rose-600"
            />
            <GradientStatCard
              title="Placement Index"
              value={stats?.avgPlacementProb || 0}
              icon={Target}
              gradientFrom="cyan-500"
              gradientTo="blue-600"
            />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Performance Table Bento */}
        <Card className="lg:col-span-2 rounded-[2rem] glass-card overflow-hidden relative">
          <CardHeader className="p-8 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <CardTitle className="text-2xl font-black tracking-tight">Student Ranking</CardTitle>
                <p className="text-sm text-muted-foreground">High-performance candidate tracking</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by name, email, or dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-background border-border rounded-2xl focus:ring-primary/20"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingStudents ? (
              <div className="p-8 space-y-6">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50 border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-8 py-6 font-bold uppercase tracking-widest text-[10px]">Candidate</TableHead>
                      <TableHead className="font-bold uppercase tracking-widest text-[10px]">Department</TableHead>
                      <TableHead className="font-bold uppercase tracking-widest text-[10px] text-center">Interviews</TableHead>
                      <TableHead className="font-bold uppercase tracking-widest text-[10px] text-right pr-8">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student, idx) => (
                      <TableRow key={student.id} className="border-border hover:bg-muted/50 transition-colors group">
                        <TableCell className="pl-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Avatar className="w-10 h-10 border border-border">
                                <AvatarImage src={student.profileImageUrl || undefined} />
                                <AvatarFallback className="font-bold">{student.firstName?.[0] || 'S'}</AvatarFallback>
                              </Avatar>
                              {idx < 3 && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-background">
                                  <span className="text-[8px] font-black text-black">{idx + 1}</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm group-hover:text-primary transition-colors">
                                {`${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-lg border-border bg-muted/50 font-medium">
                            {student.department || 'General'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-black">{student.interviewCount || 0}</span>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary hover:text-white transition-all">
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
          <BorderBeam size={200} duration={8} />
        </Card>

        {/* Intelligence Bento Column */}
        <div className="space-y-8">
          {/* Skill Gaps Card */}
          <Card className="rounded-[2rem] glass-card p-8">
            <CardHeader className="p-0 mb-8">
              <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-orange-500" />
                Critical Skill Gaps
              </CardTitle>
              <p className="text-xs text-muted-foreground">Areas requiring immediate training</p>
            </CardHeader>
            <CardContent className="p-0">
              {loadingSkillGaps ? (
                <div className="space-y-6">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
                </div>
              ) : (
                <div className="space-y-6">
                  {skillGaps?.slice(0, 5).map((gap, idx) => (
                    <div key={gap.skill} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{gap.skill}</span>
                        <span className="text-xs font-black text-orange-500">{gap.count} Hits</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-orange-500 to-red-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${(gap.count / (skillGaps[0]?.count || 1)) * 100}%` }}
                          transition={{ duration: 1, delay: idx * 0.1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Status Card */}
          <Card className="rounded-[2rem] glass-card bg-gradient-to-br from-card/90 to-emerald-500/5 p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity className="w-16 h-16 text-emerald-500" />
            </div>
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-black tracking-tight">Platform Health</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Core AI Services</span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 border-0">STABLE</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Database Sync</span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 border-0">ACTIVE</Badge>
              </div>
              <div className="pt-4">
                <Button className="w-full rounded-xl bg-muted hover:bg-accent text-foreground border-border font-bold">
                  View Detailed Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
