import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Upload,
  Rocket
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { User, Interview } from "@shared/schema";

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
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isCreatingContest, setIsCreatingContest] = useState(false);
  const [contestBranch, setContestBranch] = useState<string>("all");
  const [contestDifficulty, setContestDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [contestTypes, setContestTypes] = useState<string[]>(["technical"]);
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
      .sort((a, b) => {
        const depA = (a.department || "").toLowerCase();
        const depB = (b.department || "").toLowerCase();
        if (depA !== depB) return depA.localeCompare(depB);

        const nameA =
          `${a.firstName || ""} ${a.lastName || ""}`.trim() ||
          a.email?.toLowerCase() ||
          "";
        const nameB =
          `${b.firstName || ""} ${b.lastName || ""}`.trim() ||
          b.email?.toLowerCase() ||
          "";
        return nameA.localeCompare(nameB);
      }) || [];

  const uniqueBranches = Array.from(
    new Set((students || []).map(s => s.department).filter(Boolean))
  ) as string[];

  const handleExport = () => {
    const data = filteredStudents.map(s => ({
      name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'N/A',
      email: s.email || 'N/A',
      department: s.department || 'N/A',
      year: s.year || 'N/A',
      interviews: s.interviewCount || 0,
    }));
    
    const csv = [
      ['Name', 'Email', 'Department', 'Year', 'Interviews'],
      ...data.map(row => [row.name, row.email, row.department, row.year, row.interviews])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch("/api/admin/students/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to import students");
      }

      toast({
        title: "Students imported",
        description: `Created: ${data.created}, Updated: ${data.updated}, Skipped: ${data.skipped}`,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "Could not import students",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleToggleContestType = (type: string) => {
    setContestTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleCreateContest = async () => {
    if (!students || students.length === 0) return;
    if (contestTypes.length === 0) {
      toast({
        title: "Select at least one interview type",
        description: "Choose the types of rounds to include in the contest.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingContest(true);
    try {
      const targetStudents =
        contestBranch === "all"
          ? students
          : students.filter(s => s.department === contestBranch);

      const payloads = targetStudents.map((student) =>
        fetch("/api/interviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            studentId: student.id,
            types: contestTypes,
            difficulty: contestDifficulty,
            type: contestTypes[0],
          }),
        })
      );

      await Promise.all(payloads);

      toast({
        title: "Contest created",
        description: `Interviews created for ${targetStudents.length} students.`,
      });
    } catch (error: any) {
      toast({
        title: "Contest creation failed",
        description: error.message || "Could not create contest for students.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingContest(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of student performance and analytics
          </p>
        </div>
        <Button onClick={handleExport} data-testid="button-export">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {loadingStats ? (
          [...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-stat-students">
                      {stats?.totalStudents || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.totalInterviews || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Interviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.round(stats?.avgTechnicalScore || 0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Technical</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                    <Users className="w-5 h-5 text-orange-600 dark:text-orange-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.round(stats?.avgHrScore || 0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Avg HR</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                    <Users className="w-5 h-5 text-pink-600 dark:text-pink-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.round(stats?.avgGdScore || 0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Avg GD</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.round(stats?.avgPlacementProb || 0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Placement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg">Student Performance</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : filteredStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead className="text-right">Interviews</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={student.profileImageUrl || undefined} className="object-cover" />
                              <AvatarFallback>
                                {student.firstName?.[0] || student.email?.[0]?.toUpperCase() || 'S'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {`${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{student.department || '-'}</TableCell>
                        <TableCell>
                          {student.year ? `Year ${student.year}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{student.interviewCount || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No matching students found' : 'No students registered yet'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Skill Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSkillGaps ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : skillGaps && skillGaps.length > 0 ? (
              <div className="space-y-4">
                {skillGaps.slice(0, 10).map((gap, index) => (
                  <div key={gap.skill}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{gap.skill}</span>
                      <span className="text-sm font-medium">{gap.count} students</span>
                    </div>
                    <Progress 
                      value={(gap.count / (skillGaps[0]?.count || 1)) * 100} 
                      className="h-2" 
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No skill gap data available yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk import and contest creation have been moved to dedicated flows
          (Students & Create Interview). Keep analytics page focused on insights only. */}
    </div>
  );
}
