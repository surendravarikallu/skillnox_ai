import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Brain,
  ShieldAlert,
  Search,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import type { User } from "@shared/schema";
import { COMPANIES } from "@shared/schema";

export default function AdminAssignPage() {
  const [assigningStudentId, setAssigningStudentId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState<{
    types: string[];
    difficulty: "easy" | "medium" | "hard";
    company: string;
  }>({
    types: ["technical"],
    difficulty: "medium",
    company: "TCS",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: students, isLoading: loadingStudents } = useQuery<User[]>({
    queryKey: ["/api/admin/students"],
  });

  const assignInterviewMutation = useMutation({
    mutationFn: async (data: typeof assignForm & { studentId: string }) => {
      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to assign interview");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Interview assigned successfully",
      });
      setAssigningStudentId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssignInterview = () => {
    if (!assigningStudentId) return;
    assignInterviewMutation.mutate({
      ...assignForm,
      studentId: assigningStudentId,
    });
  };

  const selectedStudent = students?.find(s => s.id === assigningStudentId);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-2">
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Assign Interview
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Configure custom interview workflows tailored to individual student needs and target placement goals.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
          <div className="px-4 py-2 text-center border-r border-border/50">
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Students</p>
            <p className="text-2xl font-black leading-none">{students?.length || 0}</p>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Interview Types</p>
            <p className="text-2xl font-black leading-none">7</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <Card className="rounded-[2rem] glass-card border-border/50 overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <Brain className="w-7 h-7 text-primary" />
                Interview Configuration
              </CardTitle>
              <p className="text-muted-foreground text-sm">Select focus areas and difficulty for the custom AI simulation.</p>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">1. Target Student</Label>
                  <Select
                    value={assigningStudentId || ""}
                    onValueChange={setAssigningStudentId}
                  >
                    <SelectTrigger className="h-14 rounded-2xl border-border/50 bg-muted/20 text-base">
                      <SelectValue placeholder="Select a student to assign interview" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80 rounded-2xl">
                      {students?.map((student) => (
                        <SelectItem key={student.id} value={student.id} className="rounded-xl py-3">
                          <div className="flex flex-col">
                            <span className="font-bold">{`${student.firstName || ""} ${student.lastName || ""}`}</span>
                            <span className="text-[10px] text-muted-foreground">{student.rollNumber} • {student.department}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">2. Difficulty Level</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {["easy", "medium", "hard"].map((level) => (
                          <Button
                            key={level}
                            type="button"
                            variant={assignForm.difficulty === level ? "default" : "outline"}
                            className={cn(
                              "rounded-xl h-12 capitalize font-bold transition-all border-border/50",
                              assignForm.difficulty === level ? "shadow-lg shadow-primary/20 scale-105" : "bg-muted/10 hover:bg-muted/20"
                            )}
                            onClick={() => setAssignForm(prev => ({ ...prev, difficulty: level as any }))}
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {assignForm.types.includes("company") && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">3. Target Company</Label>
                        <Select
                          value={assignForm.company}
                          onValueChange={(value) => setAssignForm(prev => ({ ...prev, company: value }))}
                        >
                          <SelectTrigger className="h-14 rounded-2xl border-border/50 bg-muted/20">
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {COMPANIES.map((company) => (
                              <SelectItem key={company} value={company} className="rounded-xl">
                                {company}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">4. Focus Areas</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {["technical", "hr", "behavioral", "project", "gd", "communication", "company"].map((type) => (
                        <div 
                          key={type} 
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer",
                            assignForm.types.includes(type) 
                              ? "bg-primary/5 border-primary/20 shadow-sm" 
                              : "bg-muted/5 border-transparent hover:bg-muted/20 hover:border-border/50"
                          )}
                          onClick={() => {
                            const checked = !assignForm.types.includes(type);
                            if (checked) {
                              setAssignForm(prev => ({ ...prev, types: [...prev.types, type] }));
                            } else if (assignForm.types.length > 1) {
                              setAssignForm(prev => ({ ...prev, types: prev.types.filter(t => t !== type) }));
                            }
                          }}
                        >
                          <Checkbox
                            id={`page-type-${type}`}
                            checked={assignForm.types.includes(type)}
                            className="rounded-md h-4 w-4"
                            onCheckedChange={() => {}} // Handled by div click
                          />
                          <Label 
                            htmlFor={`page-type-${type}`} 
                            className="text-xs font-bold capitalize cursor-pointer flex-1"
                          >
                            {type}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 px-5 py-3 rounded-2xl border border-border/50">
                  <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0" />
                  <p className="leading-tight">
                    Generating <span className="font-bold text-foreground">10 dynamic questions</span> across your selected focus areas.
                  </p>
                </div>
                <Button 
                  size="lg"
                  className="rounded-2xl h-16 px-10 font-black text-lg shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
                  onClick={handleAssignInterview} 
                  disabled={assignInterviewMutation.isPending || !assigningStudentId || assignForm.types.length === 0}
                >
                  {assignInterviewMutation.isPending ? "Configuring AI..." : "Launch Assignment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-[2rem] glass-card border-border/50 overflow-hidden sticky top-8">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black">Student Profile</CardTitle>
              <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Selection Details</p>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-6">
              {selectedStudent ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2 border-primary/20 ring-4 ring-primary/5">
                      <AvatarImage src={selectedStudent.profileImageUrl || undefined} />
                      <AvatarFallback className="text-xl font-black">{selectedStudent.firstName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-black text-lg leading-tight">{`${selectedStudent.firstName} ${selectedStudent.lastName}`}</h3>
                      <p className="text-muted-foreground text-sm">{selectedStudent.rollNumber}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Department</span>
                      <span className="font-black">{selectedStudent.department || "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Year of Study</span>
                      <span className="font-black">Year {selectedStudent.year || "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Interviews Completed</span>
                      <Badge variant="secondary" className="font-black rounded-lg">{selectedStudent.interviewCount || 0}</Badge>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                    <p className="text-[10px] uppercase font-black tracking-widest text-primary mb-2">System Readiness</p>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000" 
                        style={{ width: `${Math.min((selectedStudent.interviewCount || 0) * 20, 100)}%` }} 
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Targeting <span className="font-bold text-foreground">5 interviews</span> for optimal placement readiness.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto border-2 border-dashed border-border/50">
                    <Search className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    No student selected.<br />Choose one from the dropdown to view details.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
