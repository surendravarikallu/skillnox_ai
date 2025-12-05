import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Users,
  Upload,
  Search,
  Download,
  Pencil,
  Trash2,
} from "lucide-react";
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
import type { User } from "@shared/schema";

export default function AdminStudentsPage() {
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground">
            View and manage student accounts for Skillnox AI.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === "view" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("view")}
        >
          View Students
        </Button>
        <Button
          variant={activeTab === "import" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("import")}
        >
          Import Students
        </Button>
      </div>

      {activeTab === "view" && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-4 h-4" />
                Student Directory
              </CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or branch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingStudents ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : groupedStudents.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {branchOptions.map((branch) => (
                    <Button
                      key={branch}
                      type="button"
                      variant={selectedBranch === branch ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedBranch(branch)}
                    >
                      {branch}
                    </Button>
                  ))}
                </div>
                {(selectedBranch === "All"
                  ? groupedStudents
                  : groupedStudents.filter((g) => g.branch === selectedBranch)
                ).map(({ branch, students: branchStudents }) => (
                  <div key={branch} className="border border-border rounded-lg">
                    <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{branch}</p>
                        <p className="text-xs text-muted-foreground">
                          {branchStudents.length} student{branchStudents.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Roll</TableHead>
                            <TableHead>Year</TableHead>
                            <TableHead className="text-right">Interviews</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {branchStudents.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={student.profileImageUrl || undefined} className="object-cover" />
                                    <AvatarFallback>
                                      {student.firstName?.[0] || student.email?.[0]?.toUpperCase() || "S"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {`${student.firstName || ""} ${student.lastName || ""}`.trim() || "Unknown"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{student.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {student.rollNumber || "-"}
                              </TableCell>
                              <TableCell>{student.year ? `Year ${student.year}` : "-"}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{student.interviewCount || 0}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(student)}
                                    title="Edit student"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
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
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No matching students found" : "No students imported yet."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "import" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Students From CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use the template below to prepare your student list. Columns: <strong>Name</strong>, <strong>Roll Number</strong>, <strong>Branch</strong>, <strong>Password (optional)</strong>.
              If Password is blank we will default to the roll number.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold">Upload filled template</p>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>

            <Button
              onClick={handleImport}
              disabled={!importFile || isImporting}
              className="w-full"
            >
              {isImporting ? "Importing..." : "Import Students"}
            </Button>
          </CardContent>
        </Card>
      )}

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


