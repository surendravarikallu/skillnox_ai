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
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    rollNumber: "",
    branch: "",
    year: "",
    password: "",
  });
  const [studentToDelete, setStudentToDelete] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: students, isLoading: loadingStudents } = useQuery<User[]>({
    queryKey: ["/api/admin/students"],
  });

  const filteredStudents =
    students
      ?.filter((student) => {
        const query = searchQuery.toLowerCase();
        const fullName = `${student.firstName || ""} ${student.lastName || ""}`.toLowerCase();
        return (
          fullName.includes(query) ||
          student.email?.toLowerCase().includes(query) ||
          student.department?.toLowerCase().includes(query) ||
          student.rollNumber?.toLowerCase().includes(query)
        );
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
        const rollA = (a.rollNumber || "").toLowerCase();
        const rollB = (b.rollNumber || "").toLowerCase();
        if (rollA && rollB && rollA !== rollB) {
          return rollA.localeCompare(rollB);
        }
        const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim();
        const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim();
        return nameA.localeCompare(nameB);
      }),
    }));

  const branchOptions = ["All", ...groupedStudents.map((g) => g.branch)];

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
      rollNumber: student.rollNumber || "",
      branch: student.department || "",
      year: student.year ? String(student.year) : "",
      password: "",
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
        rollNumber: editForm.rollNumber.trim(),
        department: editForm.branch.trim(),
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="rounded-[2rem] glass-card border-primary/10 bg-primary/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Directory</p>
              <p className="text-xl font-black">All Enrolled</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] glass-card border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Action</p>
              <p className="text-xl font-black">Bulk Import CSV</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] glass-card border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <Brain className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Workflow</p>
              <p className="text-xl font-black">Assign Readiness</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-auto">
          <TabsTrigger value="view" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 mr-2" />
            View Students
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
                placeholder="Filter students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 bg-background border-border rounded-2xl focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Label className="text-sm font-semibold">Branch:</Label>
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

          <Card className="rounded-[2rem] glass-card overflow-hidden border-border/50">
            <CardContent className="p-0">
              {loadingStudents ? (
                <div className="p-8 space-y-6">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                  ))}
                </div>
              ) : groupedStudents.length > 0 ? (
                <>
                  {groupedStudents
                    .filter((g) => selectedBranch === "All" || g.branch === selectedBranch)
                    .map(({ branch, students: branchStudents }) => (
                      <div key={branch} className="border-b border-border/50 last:border-0">
                        <div className="bg-muted/30 px-8 py-4 flex items-center justify-between">
                          <h3 className="font-black text-sm uppercase tracking-widest text-primary">
                            {branch}
                          </h3>
                          <Badge variant="secondary" className="rounded-lg font-bold">
                            {branchStudents.length} Students
                          </Badge>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent border-border/50">
                                <TableHead className="pl-8 py-4 font-bold uppercase tracking-widest text-[10px]">Student</TableHead>
                                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Roll</TableHead>
                                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Year</TableHead>
                                <TableHead className="text-right font-bold uppercase tracking-widest text-[10px]">Interviews</TableHead>
                                <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {branchStudents.map((student) => (
                                <TableRow key={student.id} className="hover:bg-muted/50 transition-colors border-border/50">
                                  <TableCell className="pl-8 py-4">
                                    <div className="flex items-center gap-3">
                                      <Avatar className="w-9 h-9 border border-border">
                                        <AvatarImage src={student.profileImageUrl || undefined} className="object-cover" />
                                        <AvatarFallback className="font-bold">
                                          {student.firstName?.[0] || student.email?.[0]?.toUpperCase() || "S"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="font-bold text-sm">
                                          {`${student.firstName || ""} ${student.lastName || ""}`.trim() || "Unknown"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{student.email}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {student.rollNumber || "-"}
                                  </TableCell>
                                  <TableCell className="text-sm font-medium">{student.year ? `Year ${student.year}` : "-"}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="outline" className="font-bold bg-muted/50">{student.interviewCount || 0}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right pr-8">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                        onClick={() => openEditDialog(student)}
                                        title="Edit student"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                        onClick={() => setLocation("/admin/assign")}
                                        title="Assign Interview"
                                      >
                                        <Brain className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                                        onClick={() => setStudentToDelete(student)}
                                        title="Delete student"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                </>
              ) : (
                <div className="text-center py-20">
                  <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium text-lg">
                    {searchQuery ? "No matching students found" : "No students imported yet."}
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab("import")} className="mt-4 rounded-xl">
                    Import Students Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>First Name</Label>
              <Input
                value={editForm.firstName}
                onChange={(e) => handleEditFormChange("firstName", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Last Name</Label>
              <Input
                value={editForm.lastName}
                onChange={(e) => handleEditFormChange("lastName", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Roll Number</Label>
              <Input
                value={editForm.rollNumber}
                onChange={(e) => handleEditFormChange("rollNumber", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Input
                value={editForm.branch}
                onChange={(e) => handleEditFormChange("branch", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Year</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={editForm.year}
                onChange={(e) => handleEditFormChange("year", e.target.value)}
              />
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
    </div>
  );
}
