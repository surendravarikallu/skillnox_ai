import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Brain,
  Users,
  Briefcase,
  MessageSquare,
  FolderKanban,
  ArrowRight,
  Check,
  Building2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { COMPANIES } from "@shared/schema";
import type { User } from "@shared/schema";

const interviewTypes = [
  {
    id: 'technical',
    title: 'Technical Interview',
    description: 'Data structures, algorithms, coding problems, and system design questions',
    icon: Brain,
    color: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300',
    duration: '10-15 min'
  },
  {
    id: 'hr',
    title: 'HR Interview',
    description: 'Behavioral questions, culture fit, salary expectations, and career goals',
    icon: Users,
    color: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300',
    duration: '5-10 min'
  },
  {
    id: 'behavioral',
    title: 'Behavioral Interview',
    description: 'STAR method questions about past experiences and situational responses',
    icon: MessageSquare,
    color: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300',
    duration: '5-10 min'
  },
  {
    id: 'gd',
    title: 'Group Discussion',
    description: 'Practice GD rounds with AI-generated topics and real-time evaluation',
    icon: Users,
    color: 'bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300',
    duration: '5-10 min'
  },
  {
    id: 'project',
    title: 'Project Explanation',
    description: 'Explain your projects, architecture decisions, and technical challenges',
    icon: FolderKanban,
    color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300',
    duration: '5-10 min'
  },
  {
    id: 'communication',
    title: 'Communication Skills',
    description: 'Verbal communication, clarity, tone, accent, pace, and articulation assessment',
    icon: MessageSquare,
    color: 'bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-300',
    duration: '5-10 min'
  }
];

const companyData = [
  { id: 'TCS', name: 'TCS', description: 'Tata Consultancy Services', pattern: 'MCQ + Technical + HR' },
  { id: 'Infosys', name: 'Infosys', description: 'Infosys Limited', pattern: 'Aptitude + Coding + HR' },
  { id: 'Wipro', name: 'Wipro', description: 'Wipro Limited', pattern: 'Technical + Coding + HR' },
  { id: 'Accenture', name: 'Accenture', description: 'Accenture PLC', pattern: 'Cognitive + Technical + HR' },
  { id: 'Cognizant', name: 'Cognizant', description: 'Cognizant Technology', pattern: 'Aptitude + Technical + HR' },
  { id: 'Capgemini', name: 'Capgemini', description: 'Capgemini SE', pattern: 'English + Technical + HR' },
  { id: 'Amazon', name: 'Amazon', description: 'Amazon (Basic)', pattern: 'Leadership + Coding + System Design' }
];

export default function InterviewStart() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [targetMode, setTargetMode] = useState<"single" | "branch" | "all" | "custom">("single");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [customSearch, setCustomSearch] = useState<string>("");

  // Redirect if not admin
  if (user && user.role !== 'admin') {
    navigate('/');
    return null;
  }

  // Fetch students for admin to select
  const { data: students, isLoading: loadingStudents } = useQuery<User[]>({
    queryKey: ['/api/admin/students'],
    enabled: user?.role === 'admin',
  });

  const branchOptions = Array.from(
    new Set((students || []).map((s) => s.department).filter(Boolean))
  ) as string[];

  const startInterviewMutation = useMutation({
    mutationFn: async ({ studentIds }: { studentIds: string[] }) => {
      if (!studentIds || studentIds.length === 0) {
        throw new Error('Please select at least one student');
      }
      if (selectedTypes.length === 0) {
        throw new Error('Please select at least one interview type');
      }
      const payloads = studentIds.map((studentId) =>
        apiRequest('POST', '/api/interviews', {
          studentId,
          types: selectedTypes,
          difficulty: selectedDifficulty,
          // Keep backward compatibility - use first type as primary
          type: selectedTypes[0],
          company: selectedTypes.includes('company') ? selectedCompany : undefined,
        })
      );
      const responses = await Promise.all(payloads);
      const data = await Promise.all(responses.map((r) => r.json()));
      return data;
    },
    onSuccess: (data: any[]) => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
      toast({
        title: "Success",
        description:
          data.length === 1
            ? `Interview created successfully with ${data[0]?.questions?.length || 10} questions`
            : `Created interviews for ${data.length} students.`,
      });
      navigate('/admin/students');
    },
    onError: (error: any) => {
      console.error('Interview creation error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create interview. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeId)) {
        // Remove type
        const newTypes = prev.filter(t => t !== typeId);
        // If company was removed, clear company selection
        if (typeId === 'company') {
          setSelectedCompany(null);
          setStep(1);
        }
        return newTypes;
      } else {
        // Add type
        const newTypes = [...prev, typeId];
        // If company is selected, move to company selection step
        if (typeId === 'company') {
          setStep(2);
        }
        return newTypes;
      }
    });
  };

  const handleStartInterview = () => {
    if (selectedTypes.length === 0) return;
    if (selectedTypes.includes('company') && !selectedCompany) return;
    if (!students || students.length === 0) {
      toast({
        title: "No students",
        description: "Please import students before creating interviews.",
        variant: "destructive",
      });
      return;
    }

    let targetIds: string[] = [];
    if (targetMode === "all") {
      targetIds = students.map((s) => s.id);
    } else if (targetMode === "branch") {
      if (!selectedBranch) {
        toast({
          title: "Select branch",
          description: "Choose a branch to target.",
          variant: "destructive",
        });
        return;
      }
      targetIds = students.filter((s) => s.department === selectedBranch).map((s) => s.id);
    } else if (targetMode === "custom") {
      targetIds = selectedStudentIds;
    } else {
      if (!selectedStudentId) {
        toast({
          title: "Select student",
          description: "Choose a student for this interview.",
          variant: "destructive",
        });
        return;
      }
      targetIds = [selectedStudentId];
    }

    if (targetIds.length === 0) {
      toast({
        title: "No students selected",
        description: "Please choose at least one student.",
        variant: "destructive",
      });
      return;
    }

    startInterviewMutation.mutate({ studentIds: targetIds });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Create Interviews</h1>
        <p className="text-muted-foreground">
          Target all students, a branch, or specific students with AI-powered interviews.
        </p>
      </div>

      {/* Target Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Target Students</CardTitle>
          <CardDescription>Choose who should receive this interview configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "single", label: "Single student" },
              { id: "branch", label: "By branch" },
              { id: "all", label: "All students" },
              { id: "custom", label: "Select students" },
            ].map((mode) => (
              <Button
                key={mode.id}
                type="button"
                variant={targetMode === mode.id ? "default" : "outline"}
                size="sm"
                onClick={() => setTargetMode(mode.id as typeof targetMode)}
              >
                {mode.label}
              </Button>
            ))}
          </div>

          {loadingStudents ? (
            <div className="text-sm text-muted-foreground">Loading students...</div>
          ) : (
            <>
              {targetMode === "single" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Student</p>
                  <Select value={selectedStudentId || undefined} onValueChange={setSelectedStudentId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students?.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.firstName} {student.lastName} ({student.rollNumber || student.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {targetMode === "branch" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Branch</p>
                  <Select value={selectedBranch || undefined} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchOptions.map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBranch && (
                    <p className="text-xs text-muted-foreground">
                      {
                        students?.filter((s) => s.department === selectedBranch).length || 0
                      }{" "}
                      student(s) in this branch.
                    </p>
                  )}
                </div>
              )}

              {targetMode === "all" && (
                <p className="text-xs text-muted-foreground">
                  This will create interviews for all{" "}
                  <span className="font-semibold">{students?.length || 0}</span> students.
                </p>
              )}

              {targetMode === "custom" && (
                <div className="space-y-2 border rounded-md p-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold">Select students</p>
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-[11px] w-40 bg-background"
                      placeholder="Search name / roll / branch"
                      value={customSearch}
                      onChange={(e) => setCustomSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-56 overflow-auto pr-1 space-y-1">
                    {students
                      ?.filter((student) => {
                        if (!customSearch.trim()) return true;
                        const q = customSearch.toLowerCase();
                        const fullName = `${student.firstName || ""} ${student.lastName || ""}`.toLowerCase();
                        return (
                          fullName.includes(q) ||
                          student.rollNumber?.toLowerCase().includes(q) ||
                          student.department?.toLowerCase().includes(q) ||
                          student.email?.toLowerCase().includes(q)
                        );
                      })
                      .map((student) => {
                        const id = student.id;
                        const checked = selectedStudentIds.includes(id);
                        return (
                          <label
                            key={id}
                            className="flex items-center gap-2 text-xs py-1 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="h-3 w-3"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedStudentIds((prev) =>
                                  e.target.checked
                                    ? [...prev, id]
                                    : prev.filter((sid) => sid !== id)
                                );
                              }}
                            />
                            <span>
                              {student.firstName} {student.lastName}{" "}
                              <span className="text-muted-foreground">
                                ({student.rollNumber || student.department || "Student"})
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    {!students?.length && (
                      <p className="text-[11px] text-muted-foreground py-2">
                        No students available. Import students first.
                      </p>
                    )}
                  </div>
                  {selectedStudentIds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selected {selectedStudentIds.length} student
                      {selectedStudentIds.length === 1 ? "" : "s"}.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {step > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <span className="text-sm font-medium">Interview Types & Difficulty</span>
        </div>
        {selectedTypes.includes('company') && (
          <>
            <div className="w-12 h-px bg-border" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                2
              </div>
              <span className="text-sm font-medium">Company</span>
            </div>
          </>
        )}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          {/* Difficulty Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Difficulty Level</CardTitle>
              <CardDescription>Choose the difficulty level for the interview questions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {(['easy', 'medium', 'hard'] as const).map((level) => (
                  <Card
                    key={level}
                    className={`cursor-pointer hover-elevate transition-all ${selectedDifficulty === level ? 'ring-2 ring-primary' : ''
                      }`}
                    onClick={() => setSelectedDifficulty(level)}
                  >
                    <CardContent className="p-4 text-center">
                      <h3 className="font-semibold capitalize">{level}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {level === 'easy' && 'Beginner-friendly questions'}
                        {level === 'medium' && 'Moderate complexity questions'}
                        {level === 'hard' && 'Advanced and challenging questions'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Interview Types Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Interview Types</CardTitle>
              <CardDescription>You can select multiple types. 10 questions will be generated across selected types.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {interviewTypes.map((type) => (
                  <Card
                    key={type.id}
                    className={`cursor-pointer hover-elevate transition-all ${selectedTypes.includes(type.id) ? 'ring-2 ring-primary' : ''
                      }`}
                    onClick={() => handleTypeToggle(type.id)}
                    data-testid={`card-type-${type.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${type.color}`}>
                          <type.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold">{type.title}</h3>
                            <div className="flex items-center gap-2">
                              {selectedTypes.includes(type.id) && (
                                <Check className="w-5 h-5 text-primary" />
                              )}
                              <Badge variant="outline" className="text-xs px-2 py-0.5">
                                {type.duration}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Card
                  className={`cursor-pointer hover-elevate transition-all ${selectedTypes.includes('company') ? 'ring-2 ring-primary' : ''
                    }`}
                  onClick={() => handleTypeToggle('company')}
                  data-testid="card-type-company"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 flex items-center justify-center">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold">Company Simulator</h3>
                          <div className="flex items-center gap-2">
                            {selectedTypes.includes('company') && (
                              <Check className="w-5 h-5 text-primary" />
                            )}
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              5-10 min
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Practice interviews for TCS, Infosys, Wipro, Amazon & more
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && selectedTypes.includes('company') && (
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => { setStep(1); setSelectedCompany(null); }}
            className="mb-4"
            data-testid="button-back"
          >
            Back to interview types
          </Button>

          <div className="grid md:grid-cols-2 gap-4">
            {companyData.map((company) => (
              <Card
                key={company.id}
                className={`cursor-pointer hover-elevate transition-all ${selectedCompany === company.id ? 'ring-2 ring-primary' : ''
                  }`}
                onClick={() => setSelectedCompany(company.id)}
                data-testid={`card-company-${company.id.toLowerCase()}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{company.name}</h3>
                      <p className="text-xs text-muted-foreground">{company.description}</p>
                      <Badge variant="secondary" className="mt-2 text-[11px] px-2 py-0.5">
                        {company.pattern}
                      </Badge>
                    </div>
                    {selectedCompany === company.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedTypes.length > 0 && (!selectedTypes.includes('company') || selectedCompany) && (
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={handleStartInterview}
            disabled={startInterviewMutation.isPending || !selectedStudentId || selectedTypes.length === 0}
            data-testid="button-start-interview"
          >
            {startInterviewMutation.isPending ? (
              'Creating...'
            ) : (
              <>
                Create Interview ({selectedTypes.length} type{selectedTypes.length > 1 ? 's' : ''}, {selectedDifficulty}) - 10 Questions
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
