import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Users,
  Upload,
  Search,
  Download,
  Pencil,
  Trash2,
  Brain,
  FileText,
  Mail,
  Eye,
  Send,
  ExternalLink,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  CheckCircle2,
  Clock,
  Radio,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "@shared/schema";

export default function AdminStudentsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"view" | "import">("view");
  const [selectedBranch, setSelectedBranch] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "completed" | "pending" | "not_scheduled">("all");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    rollNumber: "",
    branch: "",
    year: "",
    password: "",
    slotDate: "",
    slotStartTime: "",
    slotEndTime: "",
    slotStatus: "scheduled",
  });
  const [studentToDelete, setStudentToDelete] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  
  const [selectedStudentForReports, setSelectedStudentForReports] = useState<User | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const { data: studentReportsData, isLoading: loadingStudentReports } = useQuery<{ student: User; interviews: any[] }>({
    queryKey: ["/api/admin/students", selectedStudentForReports?.id, "interviews"],
    enabled: !!selectedStudentForReports?.id && isReportModalOpen,
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ interviewId, recipientEmail }: { interviewId: string; recipientEmail?: string }) => {
      const res = await fetch("/api/admin/send-report-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ interviewId, recipientEmail }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send email");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Email Report Sent 🚀",
        description: data.message || "Report delivered via Brevo (Kitaghire).",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Email Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: students, isLoading: loadingStudents } = useQuery<User[]>({
    queryKey: ["/api/admin/students"],
    refetchInterval: 5000, // Live poll every 5 seconds for real-time status updates
  });

  const toggleFolder = (branch: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [branch]: prev[branch] === false ? true : false,
    }));
  };

  // Live Statistics Counters across all students
  const totalCount = students?.length || 0;
  const inProgressCount = students?.filter((s: any) => s.activeInterviewStatus === "in_progress").length || 0;
  const completedCount = students?.filter((s: any) => s.activeInterviewStatus === "completed").length || 0;
  const pendingCount = students?.filter((s: any) => s.activeInterviewStatus === "pending").length || 0;

  const filteredStudents =
    students
      ?.filter((student: any) => {
        const query = searchQuery.toLowerCase();
        const fullName = `${student.firstName || ""} ${student.lastName || ""}`.toLowerCase();
        const matchesQuery =
          fullName.includes(query) ||
          student.email?.toLowerCase().includes(query) ||
          student.department?.toLowerCase().includes(query) ||
          student.rollNumber?.toLowerCase().includes(query);

        if (!matchesQuery) return false;

        if (statusFilter === "in_progress") return student.activeInterviewStatus === "in_progress";
        if (statusFilter === "completed") return student.activeInterviewStatus === "completed";
        if (statusFilter === "pending") return student.activeInterviewStatus === "pending";
        if (statusFilter === "not_scheduled") return student.activeInterviewStatus === "not_scheduled";
        return true;
      }) || [];

  const groupedStudents = Object.entries(
    filteredStudents.reduce<Record<string, User[]>>((acc, student) => {
      const branch = student.department || "Unassigned";
      if (!acc[branch]) {
        acc[branch] = [];
      }
      acc[branch].push(student);
      return acc;
    }, {})
  )
    .sort(([branchA], [branchB]) => branchA.localeCompare(branchB))
    .map(([branch, group]) => ({
      branch,
      students: group.sort((a, b) => {
        // Natural Ascending Order sorting by Roll Number (e.g. 23JK1A0401 < 23JK1A0402 < 23JK1A0410)
        const rollA = (a.rollNumber || "").toLowerCase();
        const rollB = (b.rollNumber || "").toLowerCase();
        if (rollA && rollB && rollA !== rollB) {
          return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
        }
        const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim();
        const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim();
        return nameA.localeCompare(nameB);
      }),
    }));

  const branchOptions = ["All", ...Array.from(new Set(students?.map((s) => s.department || "Unassigned") || []))];

  const handleDownloadTemplate = () => {
    const header = "Name,Roll Number,Branch,Password\n";
    const example = "John Doe,23MCA001,MCA,23MCA001\nJane Smith,23ECE015,ECE,Ece@2024\n";
    const blob = new Blob([header + example], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skillnox-students-template.csv";
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

  const openEditDialog = (student: User) => {
    setEditingStudentId(student.id);
    setEditForm({
      firstName: student.firstName || "",
      lastName: student.lastName || "",
      email: student.email || "",
      rollNumber: student.rollNumber || "",
      branch: student.department || "",
      year: student.year ? String(student.year) : "",
      password: "",
      slotDate: (student as any).slotDate || "",
      slotStartTime: (student as any).slotStartTime || "",
      slotEndTime: (student as any).slotEndTime || "",
      slotStatus: (student as any).slotStatus || "scheduled",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditFormChange = (field: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateStudent = async () => {
    if (!editingStudentId) return;
    try {
      const payload: Record<string, any> = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
        rollNumber: editForm.rollNumber.trim(),
        department: editForm.branch.trim(),
        slotDate: editForm.slotDate,
        slotStartTime: editForm.slotStartTime,
        slotEndTime: editForm.slotEndTime,
        slotStatus: editForm.slotStatus,
      };
      if (editForm.year) {
        payload.year = Number(editForm.year);
      }
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const response = await fetch(`/api/admin/students/${editingStudentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update student");
      }

      toast({
        title: "Student updated",
        description: "Changes saved successfully.",
      });
      setIsEditDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Could not update student.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      const response = await fetch(`/api/admin/students/${studentToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }
      if (!response.ok) {
        throw new Error(data.message || `Failed to delete student (status ${response.status})`);
      }
      toast({
        title: "Student deleted",
        description: `${studentToDelete.firstName || "Student"} removed.`,
      });
      setStudentToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message || "Could not delete student.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-2">
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Student Management
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Maintain your student directory, perform bulk imports, and monitor interview readiness across all departments.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
          <div className="px-4 py-2 text-center border-r border-border/50">
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Total Students</p>
            <p className="text-2xl font-black leading-none">{students?.length || 0}</p>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Departments</p>
            <p className="text-2xl font-black leading-none">{branchOptions.length - 1}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="rounded-[2rem] glass-card border-primary/10 bg-primary/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Enrolled</p>
              <p className="text-2xl font-black">{totalCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "rounded-[2rem] glass-card border-emerald-500/20 bg-emerald-500/5 cursor-pointer transition-all hover:scale-[1.02]",
            statusFilter === "in_progress" && "ring-2 ring-emerald-500"
          )}
          onClick={() => setStatusFilter(statusFilter === "in_progress" ? "all" : "in_progress")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center relative">
              <Radio className="w-6 h-6 text-emerald-500 animate-pulse" />
              {inProgressCount > 0 && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-500 font-bold flex items-center gap-1">
                Live Now
              </p>
              <p className="text-2xl font-black text-emerald-500">{inProgressCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "rounded-[2rem] glass-card border-blue-500/20 bg-blue-500/5 cursor-pointer transition-all hover:scale-[1.02]",
            statusFilter === "completed" && "ring-2 ring-blue-500"
          )}
          onClick={() => setStatusFilter(statusFilter === "completed" ? "all" : "completed")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-500 font-bold">Completed</p>
              <p className="text-2xl font-black text-blue-500">{completedCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "rounded-[2rem] glass-card border-amber-500/20 bg-amber-500/5 cursor-pointer transition-all hover:scale-[1.02]",
            statusFilter === "pending" && "ring-2 ring-amber-500"
          )}
          onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-500 font-bold">Not Attended / Pending</p>
              <p className="text-2xl font-black text-amber-500">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-auto">
          <TabsTrigger value="view" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 mr-2" />
            Branch Folders & Students
          </TabsTrigger>
          <TabsTrigger value="import" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="view">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search roll number, name, branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 bg-background border-border rounded-2xl focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl">
                <Button
                  size="sm"
                  variant={statusFilter === "all" ? "default" : "ghost"}
                  className="rounded-lg text-xs font-bold h-8"
                  onClick={() => setStatusFilter("all")}
                >
                  All ({totalCount})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "in_progress" ? "default" : "ghost"}
                  className="rounded-lg text-xs font-bold h-8 text-emerald-500"
                  onClick={() => setStatusFilter("in_progress")}
                >
                  🟢 Live ({inProgressCount})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "completed" ? "default" : "ghost"}
                  className="rounded-lg text-xs font-bold h-8 text-blue-500"
                  onClick={() => setStatusFilter("completed")}
                >
                  ✅ Completed ({completedCount})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "pending" ? "default" : "ghost"}
                  className="rounded-lg text-xs font-bold h-8 text-amber-500"
                  onClick={() => setStatusFilter("pending")}
                >
                  ⏸️ Pending ({pendingCount})
                </Button>
              </div>

              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[180px] h-11 rounded-xl">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  {branchOptions.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {loadingStudents ? (
              <div className="p-8 space-y-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            ) : groupedStudents.length > 0 ? (
              groupedStudents
                .filter((g) => selectedBranch === "All" || g.branch === selectedBranch)
                .map(({ branch, students: branchStudents }) => {
                  const isOpen = openFolders[branch] !== false; // Open by default
                  const branchLive = branchStudents.filter((s: any) => s.activeInterviewStatus === "in_progress").length;
                  const branchComp = branchStudents.filter((s: any) => s.activeInterviewStatus === "completed").length;
                  const branchPend = branchStudents.filter((s: any) => s.activeInterviewStatus === "pending").length;

                  return (
                    <Card key={branch} className="rounded-2xl glass-card border-border/50 overflow-hidden shadow-sm transition-all">
                      {/* Branch Folder Header */}
                      <div
                        className="bg-muted/40 hover:bg-muted/60 px-6 py-4 flex items-center justify-between cursor-pointer transition-colors select-none"
                        onClick={() => toggleFolder(branch)}
                      >
                        <div className="flex items-center gap-3">
                          {isOpen ? (
                            <FolderOpen className="w-6 h-6 text-primary" />
                          ) : (
                            <Folder className="w-6 h-6 text-primary/70" />
                          )}
                          <div>
                            <h3 className="font-black text-base tracking-wide text-foreground flex items-center gap-2">
                              {branch} Department Folder
                              <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 font-bold">
                                {branchStudents.length} Students
                              </Badge>
                            </h3>
                            <p className="text-xs text-muted-foreground font-medium">Sorted by Roll Number (Ascending)</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {branchLive > 0 && (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold gap-1 animate-pulse">
                              <Radio className="w-3 h-3" /> {branchLive} Live
                            </Badge>
                          )}
                          {branchComp > 0 && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 font-bold gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {branchComp} Done
                            </Badge>
                          )}
                          {branchPend > 0 && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 font-bold gap-1">
                              <Clock className="w-3 h-3" /> {branchPend} Pending
                            </Badge>
                          )}
                          {isOpen ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground ml-2" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground ml-2" />
                          )}
                        </div>
                      </div>

                      {/* Branch Students Table */}
                      {isOpen && (
                        <div className="overflow-x-auto border-t border-border/40">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent border-border/50 bg-muted/10">
                                <TableHead className="pl-6 py-3 font-bold uppercase tracking-widest text-[10px]">Roll Number</TableHead>
                                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Candidate Student</TableHead>
                                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Live Interview Status</TableHead>
                                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Assigned Slot</TableHead>
                                <TableHead className="text-right font-bold uppercase tracking-widest text-[10px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {branchStudents.map((student: any) => {
                                const status = student.activeInterviewStatus;
                                return (
                                  <TableRow key={student.id} className="hover:bg-muted/40 transition-colors border-border/40">
                                    <TableCell className="pl-6 py-3.5 font-mono font-bold text-xs text-primary">
                                      {student.rollNumber || "-"}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8 border border-border">
                                          <AvatarImage src={student.profileImageUrl || undefined} className="object-cover" />
                                          <AvatarFallback className="font-bold text-xs">
                                            {student.firstName?.[0] || student.email?.[0]?.toUpperCase() || "S"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="font-bold text-sm leading-tight">
                                            {`${student.firstName || ""} ${student.lastName || ""}`.trim() || "Unknown Student"}
                                          </p>
                                          <p className="text-xs text-muted-foreground font-mono">{student.email}</p>
                                        </div>
                                      </div>
                                    </TableCell>

                                    {/* Live Real-Time Interview Status Indicator */}
                                    <TableCell>
                                      {status === "in_progress" && (
                                        <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/40 font-bold px-3 py-1 animate-pulse flex items-center gap-1.5 w-fit">
                                          <Radio className="w-3.5 h-3.5" />
                                          Actively In Interview (Live)
                                        </Badge>
                                      )}
                                      {status === "completed" && (
                                        <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/40 font-bold px-3 py-1 flex items-center gap-1.5 w-fit">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          Completed ({student.latestInterviewScore !== null ? `${Math.round(student.latestInterviewScore)}%` : "Evaluated"})
                                        </Badge>
                                      )}
                                      {status === "pending" && (
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 font-bold px-3 py-1 flex items-center gap-1.5 w-fit">
                                          <Clock className="w-3.5 h-3.5" />
                                          Scheduled / Not Attended
                                        </Badge>
                                      )}
                                      {status === "not_scheduled" && (
                                        <Badge variant="secondary" className="font-medium text-xs px-3 py-1 text-muted-foreground w-fit">
                                          Not Scheduled
                                        </Badge>
                                      )}
                                    </TableCell>

                                    <TableCell className="text-xs text-muted-foreground font-medium">
                                      {student.slotStartTime && student.slotEndTime ? (
                                        <span className="font-bold text-foreground">{`${student.slotStartTime} - ${student.slotEndTime}`}</span>
                                      ) : (
                                        "No slot assigned"
                                      )}
                                    </TableCell>

                                    <TableCell className="text-right pr-6">
                                      <div className="flex justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                          onClick={() => openEditDialog(student)}
                                          title="Edit Student Info / Slot"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                          onClick={() => {
                                            setSelectedStudentForReports(student);
                                            setIsReportModalOpen(true);
                                          }}
                                          title="View Evaluation Reports"
                                        >
                                          <FileText className="w-4 h-4 text-indigo-500" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                          onClick={() => setLocation("/admin/assign")}
                                          title="Assign Interview Slot"
                                        >
                                          <Brain className="w-4 h-4 text-purple-500" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Card>
                  );
                })
            ) : (
              <Card className="p-12 text-center rounded-2xl glass-card">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-bold text-lg">No Students Found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search filter or branch select.</p>
              </Card>
            )}
          </div>
        </TabsContent>


        <TabsContent value="import">
          <Card className="rounded-[2rem] glass-card border-border/50 overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <Upload className="w-7 h-7 text-primary" />
                Import Students From CSV
              </CardTitle>
              <p className="text-muted-foreground">Batch upload students using our standard CSV template.</p>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                <p className="text-sm leading-relaxed mb-4">
                  Use the template below to prepare your student list. Required columns: <strong>Name</strong>, <strong>Roll Number</strong>, <strong>Branch</strong>, <strong>Password (optional)</strong>.
                  If Password is blank, we default to the roll number.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="rounded-xl border-primary/20 hover:bg-primary/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-end">
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Step 1: Upload filled template</Label>
                  <div className="relative group">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="h-14 rounded-2xl border-dashed border-2 border-border/50 bg-muted/10 group-hover:bg-muted/20 transition-all pt-3.5 pl-4"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleImport}
                  disabled={!importFile || isImporting}
                  size="lg"
                  className="h-14 rounded-2xl font-black text-lg"
                >
                  {isImporting ? "Importing Data..." : "Process Import"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" /> Edit Student Candidate Profile
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">First Name</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => handleEditFormChange("firstName", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Last Name</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => handleEditFormChange("lastName", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Email Address</Label>
              <Input
                type="email"
                placeholder="student@gmail.com"
                value={editForm.email}
                onChange={(e) => handleEditFormChange("email", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Roll Number</Label>
                <Input
                  value={editForm.rollNumber}
                  onChange={(e) => handleEditFormChange("rollNumber", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Branch / Dept</Label>
                <Input
                  value={editForm.branch}
                  onChange={(e) => handleEditFormChange("branch", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Year</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={editForm.year}
                  onChange={(e) => handleEditFormChange("year", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Reset Password (optional)</Label>
              <Input
                type="text"
                value={editForm.password}
                onChange={(e) => handleEditFormChange("password", e.target.value)}
                placeholder="Leave blank to keep existing password"
              />
            </div>

            <div className="grid gap-3 border-t border-border pt-4 mt-2">
              <Label className="font-bold text-primary flex items-center gap-2">
                <Brain className="w-4 h-4" /> Day & Slot Allotment
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Slot Date</Label>
                  <Input
                    type="date"
                    value={editForm.slotDate}
                    onChange={(e) => handleEditFormChange("slotDate", e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Slot Status</Label>
                  <Select value={editForm.slotStatus} onValueChange={(val) => handleEditFormChange("slotStatus", val)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Start Time (e.g. 09:30 AM)</Label>
                  <Input
                    type="text"
                    placeholder="09:30 AM"
                    value={editForm.slotStartTime}
                    onChange={(e) => handleEditFormChange("slotStartTime", e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">End Time (e.g. 10:30 AM)</Label>
                  <Input
                    type="text"
                    placeholder="10:30 AM"
                    value={editForm.slotEndTime}
                    onChange={(e) => handleEditFormChange("slotEndTime", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStudent}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently remove the student account and associated interview data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteStudent}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Student Interview Reports Dialog */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-6xl sm:max-w-6xl md:max-w-6xl w-[92vw] max-h-[90vh] overflow-y-auto p-6 md:p-8 rounded-2xl border-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              Interview Reports & Analysis — {selectedStudentForReports?.firstName} {selectedStudentForReports?.lastName}
            </DialogTitle>
          </DialogHeader>

          {loadingStudentReports ? (
            <div className="py-12 space-y-4">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : !studentReportsData?.interviews?.length ? (
            <div className="py-16 text-center text-muted-foreground space-y-4 bg-muted/20 rounded-2xl border border-dashed border-border my-4">
              <Brain className="w-14 h-14 mx-auto text-muted-foreground/50 animate-pulse" />
              <div>
                <p className="font-bold text-lg text-foreground">No interview reports found for this student.</p>
                <p className="text-sm text-muted-foreground mt-1">The student has not completed an interview session yet.</p>
              </div>
              <Button onClick={() => setLocation("/admin/assign")} variant="default" size="default" className="rounded-xl font-bold gap-2">
                <PlayCircle className="w-4 h-4" />
                Assign Interview Now
              </Button>
            </div>
          ) : (
            <div className="space-y-6 py-2">
              <div className="p-5 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base text-foreground">{studentReportsData.student?.firstName} {studentReportsData.student?.lastName}</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Roll Number: <span className="font-mono text-foreground font-bold">{studentReportsData.student?.rollNumber || "N/A"}</span> | Email: <span className="text-foreground">{studentReportsData.student?.email}</span> | Branch: <span className="font-bold text-primary">{studentReportsData.student?.department || "N/A"}</span>
                  </p>
                </div>
                <Badge variant="outline" className="font-bold bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1 rounded-full">
                  {studentReportsData.interviews.length} Total Sessions
                </Badge>
              </div>

              <div className="space-y-6">
                {studentReportsData.interviews.map((iv: any) => {
                  const overall = Math.round(iv.overallScore || 0);
                  const tech = Math.round(iv.technicalScore ?? overall);
                  const comm = Math.round(iv.communicationScore ?? overall);
                  const voice = Math.round(iv.voiceScore ?? overall);
                  const emotion = Math.round(iv.emotionScore ?? overall);

                  return (
                    <Card key={iv.id} className="rounded-2xl border border-border hover:border-primary/50 transition-colors p-6 space-y-5 bg-card">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <Badge variant="secondary" className="font-bold text-xs uppercase px-2.5 py-0.5">
                              {((iv.types as string[]) || [iv.type]).join(", ")}
                            </Badge>
                            <Badge variant="outline" className="text-xs font-semibold text-muted-foreground">
                              Difficulty: {iv.difficulty || "medium"}
                            </Badge>
                            <Badge variant={iv.status === 'completed' ? 'default' : 'outline'} className={cn("text-xs font-bold", iv.status === 'completed' && "bg-emerald-600 hover:bg-emerald-700")}>
                              {iv.status === 'completed' ? '✅ Completed' : iv.status === 'in_progress' ? '🟢 Live / Evaluating' : '⏸️ Pending'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            Interview ID: {iv.id} | Session Date: {new Date(iv.createdAt || Date.now()).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right bg-primary/5 px-4 py-2 rounded-xl border border-primary/20">
                            <span className="text-xs text-muted-foreground font-bold block uppercase tracking-wider">Overall Score</span>
                            <span className="text-2xl font-black text-primary">{overall}%</span>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl font-bold gap-1.5 text-xs h-9 px-3.5"
                              onClick={() => {
                                setIsReportModalOpen(false);
                                setLocation(`/interview/${iv.id}/results`);
                              }}
                            >
                              <Eye className="w-4 h-4 text-primary" />
                              View Full Report
                            </Button>

                            <Button
                              variant="default"
                              size="sm"
                              className="rounded-xl font-bold gap-1.5 text-xs h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                              disabled={sendEmailMutation.isPending}
                              onClick={() => sendEmailMutation.mutate({ interviewId: iv.id, recipientEmail: studentReportsData.student?.email })}
                            >
                              <Mail className="w-4 h-4" />
                              Email Report
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* 4-Dimension Metric Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                          <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">Technical</span>
                          <span className="text-xl font-black text-indigo-400 mt-0.5 block">{tech}%</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                          <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">Communication</span>
                          <span className="text-xl font-black text-blue-400 mt-0.5 block">{comm}%</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                          <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">Voice & Pacing</span>
                          <span className="text-xl font-black text-pink-400 mt-0.5 block">{voice}%</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                          <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">Facial & Emotion</span>
                          <span className="text-xl font-black text-emerald-400 mt-0.5 block">{emotion}%</span>
                        </div>
                      </div>

                      {iv.improvements && iv.improvements.length > 0 && (
                        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200/90 space-y-1.5">
                          <strong className="text-amber-400 font-bold block text-xs uppercase tracking-wider">Key Improvement Recommendations:</strong>
                          <ul className="list-disc pl-4 space-y-1 text-xs">
                            {iv.improvements.map((imp: string, i: number) => (
                              <li key={i}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Question-by-Question Analysis with Spoken Answers & How To Answer Guidance */}
                      {iv.questions && Array.isArray(iv.questions) && iv.questions.length > 0 && (
                        <div className="space-y-4 pt-3 border-t border-border/60">
                          <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-sm flex items-center gap-2 text-foreground">
                              <Brain className="w-4 h-4 text-indigo-400" />
                              Question-by-Question Evaluation ({iv.questions.length} Questions Asked)
                            </h4>
                          </div>

                          <div className="space-y-3.5">
                            {iv.questions.map((q: any, qIdx: number) => {
                              const qScore = q.score !== null && q.score !== undefined ? Math.round(q.score) : null;
                              const answerText = (q.userAnswer || "").trim();
                              const feedbackText = q.feedback || "";
                              const mainFeedback = feedbackText.split("\n\nHow to answer:")[0];
                              const howToAnswerGuide = feedbackText.includes("\n\nHow to answer:")
                                ? feedbackText.split("\n\nHow to answer:")[1]?.trim()
                                : null;

                              return (
                                <div key={q.id || qIdx} className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] font-extrabold px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                                          Q{qIdx + 1} • {q.type || "Technical"}
                                        </Badge>
                                        {q.category && (
                                          <Badge variant="secondary" className="text-[10px] font-bold text-muted-foreground">
                                            {q.category}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="font-bold text-sm text-foreground mt-1">{q.question || q.text}</p>
                                    </div>
                                    {qScore !== null ? (
                                      <Badge variant={qScore >= 70 ? "default" : qScore > 0 ? "secondary" : "destructive"} className="font-black text-xs px-2.5 py-1">
                                        {qScore}% Score
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs">
                                        Not Scored
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Student Spoken Answer */}
                                  <div className="p-3 rounded-lg bg-background/80 border border-border/60 text-xs">
                                    <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground block mb-1">
                                      🎙️ Student Spoken Answer:
                                    </span>
                                    {answerText && answerText !== "(no answer recorded)" && answerText !== "silence detected" ? (
                                      <p className="text-foreground leading-relaxed font-medium">{answerText}</p>
                                    ) : (
                                      <p className="text-amber-400 italic">No response recorded for this question (Mic silence / unanswered).</p>
                                    )}
                                  </div>

                                  {/* AI Feedback */}
                                  {mainFeedback && (
                                    <div className="text-xs text-muted-foreground space-y-1">
                                      <span className="font-bold text-indigo-400 block text-[11px]">AI Feedback:</span>
                                      <p className="leading-relaxed">{mainFeedback}</p>
                                    </div>
                                  )}

                                  {/* How to Answer Guidance */}
                                  {howToAnswerGuide ? (
                                    <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-800/30 text-xs space-y-1">
                                      <span className="font-bold text-indigo-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                        💡 How to Answer this Question (Recommended Response Structure):
                                      </span>
                                      <p className="text-indigo-100/90 leading-relaxed">{howToAnswerGuide}</p>
                                    </div>
                                  ) : (
                                    <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-800/30 text-xs space-y-1">
                                      <span className="font-bold text-indigo-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                        💡 How to Answer this Question:
                                      </span>
                                      <p className="text-indigo-100/90 leading-relaxed">
                                        Structure your response clearly using the STAR method (Situation, Task, Action, Result). State core technical concepts upfront, explain your implementation logic step-by-step, and conclude with real-world project impact.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
