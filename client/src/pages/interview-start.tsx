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
  Building2,
  FileText,
  Network
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { BorderBeam } from "@/components/ui/border-beam";
import { COMPANIES } from "@shared/schema";
import type { User } from "@shared/schema";

const interviewTypes = [
  {
    id: 'technical',
    title: 'Technical Interview',
    description: 'Data structures, algorithms, coding problems, and system design questions',
    icon: Brain,
    color: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300',
    duration: '15-20 min'
  },
  {
    id: 'hr',
    title: 'HR Interview',
    description: 'Behavioral questions, culture fit, salary expectations, and career goals',
    icon: Users,
    color: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300',
    duration: '15-20 min'
  },
  {
    id: 'behavioral',
    title: 'Behavioral Interview',
    description: 'STAR method questions about past experiences and situational responses',
    icon: MessageSquare,
    color: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300',
    duration: '15-20 min'
  },
  {
    id: 'gd',
    title: 'Group Discussion',
    description: 'Practice GD rounds with AI-generated topics and real-time evaluation',
    icon: Users,
    color: 'bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300',
    duration: '15-20 min'
  },
  {
    id: 'project',
    title: 'Project Explanation',
    description: 'Explain your projects, architecture decisions, and technical challenges',
    icon: FolderKanban,
    color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300',
    duration: '15-20 min'
  },
  {
    id: 'communication',
    title: 'Communication Skills',
    description: 'Verbal communication, clarity, tone, accent, pace, and articulation assessment',
    icon: MessageSquare,
    color: 'bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-300',
    duration: '15-20 min'
  },
  {
    id: 'resume_based',
    title: 'Resume Based',
    description: 'AI generates personalized questions based on your uploaded resume skills and projects',
    icon: FileText,
    color: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300',
    duration: '15-20 min'
  },
  {
    id: 'system_design',
    title: 'System Architecture',
    description: 'Design scalable systems, APIs, databases, and architectures for millions of users',
    icon: Network,
    color: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300',
    duration: '15-20 min'
  }
];

const companyData = [
  // Indian IT Services
  { id: 'TCS', name: 'TCS', description: 'Tata Consultancy Services', pattern: 'Aptitude → Technical → HR', category: 'Indian IT Services' },
  { id: 'Infosys', name: 'Infosys', description: 'Infosys Limited', pattern: 'Aptitude → Technical + Coding → HR', category: 'Indian IT Services' },
  { id: 'Wipro', name: 'Wipro', description: 'Wipro Limited', pattern: 'Aptitude → Technical → HR', category: 'Indian IT Services' },
  { id: 'Accenture', name: 'Accenture', description: 'Accenture India', pattern: 'Cognitive → Technical → HR', category: 'Indian IT Services' },
  { id: 'Cognizant', name: 'Cognizant', description: 'Cognizant Technology', pattern: 'Aptitude → Technical → HR', category: 'Indian IT Services' },
  { id: 'Capgemini', name: 'Capgemini', description: 'Capgemini SE', pattern: 'Game-based → Technical → HR', category: 'Indian IT Services' },
  { id: 'HCL', name: 'HCL', description: 'HCL Technologies', pattern: 'Aptitude → Technical → HR', category: 'Indian IT Services' },
  { id: 'Tech Mahindra', name: 'Tech Mahindra', description: 'Tech Mahindra Limited', pattern: 'Aptitude → Technical → HR', category: 'Indian IT Services' },
  { id: 'L&T Infotech', name: 'L&T Infotech', description: 'LTIMindtree', pattern: 'Aptitude → Technical → HR', category: 'Indian IT Services' },
  { id: 'Mindtree', name: 'Mindtree', description: 'Mindtree (LTIMindtree)', pattern: 'Aptitude → Technical → HR', category: 'Indian IT Services' },
  { id: 'Zoho', name: 'Zoho', description: 'Zoho Corporation', pattern: 'Coding 1 → Coding 2 → Technical → HR', category: 'Indian IT Services' },
  
  // Global Tech
  { id: 'Google', name: 'Google', description: 'Google LLC', pattern: 'Coding 1 → Coding 2 → System Design → Googleyness', category: 'Global Tech' },
  { id: 'Microsoft', name: 'Microsoft', description: 'Microsoft Corporation', pattern: 'Online Assessment → Technical → Growth Mindset', category: 'Global Tech' },
  { id: 'Amazon', name: 'Amazon', description: 'Amazon.com Inc.', pattern: 'Coding → System Design → Leadership Principles', category: 'Global Tech' },
  { id: 'Meta', name: 'Meta', description: 'Meta Platforms Inc.', pattern: 'Coding 1 → System Design → Behavioral', category: 'Global Tech' },
  { id: 'IBM', name: 'IBM', description: 'IBM Corporation', pattern: 'Aptitude → Technical → HR', category: 'Global Tech' },
  
  // Indian Startups
  { id: 'Flipkart', name: 'Flipkart', description: 'Flipkart Internet', pattern: 'Online Coding → System Design → Cultural Fit', category: 'Indian Startups' },
  { id: 'Paytm', name: 'Paytm', description: 'Paytm Payments', pattern: 'Coding → Technical → HR', category: 'Indian Startups' },
  { id: 'Razorpay', name: 'Razorpay', description: 'Razorpay Software', pattern: 'Coding → System Design → Cultural Fit', category: 'Indian Startups' },
  { id: 'Freshworks', name: 'Freshworks', description: 'Freshworks Inc.', pattern: 'Coding → Technical + Design → HR', category: 'Indian Startups' },
  { id: 'CRED', name: 'CRED', description: 'Dreamplug Technologies', pattern: 'Coding → System Design → Craft & Culture', category: 'Indian Startups' },
  
  // BFSI
  { id: 'Goldman Sachs', name: 'Goldman Sachs', description: 'Goldman Sachs Group', pattern: 'HackerRank → Technical Deep Dive → Behavioral', category: 'BFSI' },
  { id: 'Deloitte', name: 'Deloitte', description: 'Deloitte Touche Tohmatsu', pattern: 'Aptitude → Technical → Case Study → HR', category: 'BFSI' },
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
  const [selectedMode, setSelectedMode] = useState<'full' | 'combined'>('combined');
  const [trendingEnabled, setTrendingEnabled] = useState<boolean>(true);

  // Fetch student's interviews if student
  const { data: studentInterviews, isLoading: loadingStudentInterviews } = useQuery<any[]>({
    queryKey: ['/api/interviews'],
    enabled: !!user && user.role === 'student',
    select: (data: any) => Array.isArray(data) ? data : (data?.interviews || []),
  });

  // Fetch student slot status
  const { data: slotInfo } = useQuery<{
    slotDate: string | null;
    slotStartTime: string | null;
    slotEndTime: string | null;
    isSlotActive: boolean;
    inWaitingRoom: boolean;
    lockReason: string | null;
  }>({
    queryKey: ['/api/slots/my-slot'],
    enabled: !!user && user.role === 'student',
  });

  // Auto-redirect student if active/pending interview exists
  const activeInterview = studentInterviews?.find(i => i.status === 'in_progress' || i.status === 'pending');

  if (user && user.role !== 'admin') {
    if (loadingStudentInterviews) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    if (activeInterview) {
      navigate(`/interview/${activeInterview.id}/room`);
      return null;
    }

    return (
      <div className="max-w-3xl mx-auto space-y-8 py-12 px-4">
        <Card className="rounded-[2.5rem] glass-card p-12 text-center relative overflow-hidden border-primary/20 shadow-2xl">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-primary/20 mb-6">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-4 px-4 py-1 font-black uppercase tracking-widest">
            Student Placement Portal
          </Badge>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Interview Schedule Status</h1>
          
          {slotInfo?.slotDate ? (
            <div className="bg-card/50 border border-border p-6 rounded-2xl max-w-md mx-auto space-y-3 mb-6">
              <div className="text-sm font-semibold text-muted-foreground">Assigned Placement Slot</div>
              <div className="text-2xl font-black text-primary">{slotInfo.slotDate}</div>
              <div className="text-sm font-bold text-foreground">{slotInfo.slotStartTime || "09:00"} - {slotInfo.slotEndTime || "17:00"}</div>
              {slotInfo.lockReason && (
                <div className="text-xs text-muted-foreground bg-accent/50 p-3 rounded-xl mt-2">
                  {slotInfo.lockReason}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              No placement interview is currently assigned to your account. Your administrator will assign your slot shortly.
            </p>
          )}

          <div className="flex justify-center gap-4">
            <Button size="lg" className="rounded-2xl px-8 font-bold" onClick={() => navigate('/interviews')}>
              View Past Interviews
            </Button>
          </div>
          <BorderBeam size={300} duration={10} />
        </Card>
      </div>
    );
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
          type: selectedTypes[0],
          company: selectedTypes.includes('company') ? selectedCompany : undefined,
          simulationMode: selectedMode,
          trendingEnabled: trendingEnabled,
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
          {/* Difficulty & Trending Selection */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Difficulty Level</CardTitle>
                <CardDescription>Choose the target complexity for the interview questions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((level) => (
                    <Card
                      key={level}
                      className={`cursor-pointer hover-elevate transition-all border ${selectedDifficulty === level ? 'border-primary ring-1 ring-primary' : 'border-border'
                        }`}
                      onClick={() => setSelectedDifficulty(level)}
                    >
                      <CardContent className="p-3 text-center">
                        <h4 className="font-semibold capitalize text-sm">{level}</h4>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {level === 'easy' && 'Foundational'}
                          {level === 'medium' && 'Intermediate'}
                          {level === 'hard' && 'Advanced'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trending Questions (2025-26)</CardTitle>
                <CardDescription>Inject modern technology topics into the interview session</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold">GenAI, RAG & Cloud-Native</p>
                  <p className="text-[10px] text-muted-foreground max-w-[280px]">
                    Includes Transformer architecture, vector DBs, Kubernetes service mesh, and modern system design.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={trendingEnabled ? "default" : "outline"}
                  onClick={() => setTrendingEnabled(prev => !prev)}
                  size="sm"
                  className="rounded-xl px-4"
                >
                  {trendingEnabled ? "Enabled" : "Disabled"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Interview Types Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Interview Types</CardTitle>
              <CardDescription>Select one or more interview types to distribute the session questions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {interviewTypes.map((type) => (
                  <Card
                    key={type.id}
                    className={`cursor-pointer hover-elevate transition-all ${selectedTypes.includes(type.id) ? 'ring-2 ring-primary border-primary' : ''
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
                  className={`cursor-pointer hover-elevate transition-all ${selectedTypes.includes('company') ? 'ring-2 ring-primary border-primary' : ''
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
                              15-45 min
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Practice interviews for TCS, Infosys, Zoho, Google, Amazon, Razorpay & more
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
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => { setStep(1); setSelectedCompany(null); }}
              className="rounded-xl border border-border"
              data-testid="button-back"
            >
              Back to interview types
            </Button>
          </div>

          {/* Simulation Mode Configuration */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Simulation Mode</CardTitle>
                <CardDescription>Choose how the company interview is conducted</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Card
                  className={`cursor-pointer p-4 text-center border transition-all ${selectedMode === 'combined' ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
                  onClick={() => setSelectedMode('combined')}
                >
                  <h4 className="font-semibold text-sm">Combined Session</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">Single round of 10 mixed questions</p>
                </Card>
                <Card
                  className={`cursor-pointer p-4 text-center border transition-all ${selectedMode === 'full' ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
                  onClick={() => setSelectedMode('full')}
                >
                  <h4 className="font-semibold text-sm">Full Multi-Round</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">Independent rounds with gating criteria</p>
                </Card>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trending Questions (2025-26)</CardTitle>
                <CardDescription>Inject new industry placement trends into this session</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between py-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold">Latest Campus Patterns</p>
                  <p className="text-[10px] text-muted-foreground max-w-[280px]">
                    Includes GenAI integration, cloud design, and high-frequency algorithms.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={trendingEnabled ? "default" : "outline"}
                  onClick={() => setTrendingEnabled(prev => !prev)}
                  size="sm"
                  className="rounded-xl px-4"
                >
                  {trendingEnabled ? "Enabled" : "Disabled"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Grouped Companies List */}
          <div className="space-y-8">
            {['Indian IT Services', 'Global Tech', 'Indian Startups', 'BFSI'].map((categoryName) => {
              const categoryCompanies = companyData.filter(c => c.category === categoryName);
              return (
                <div key={categoryName} className="space-y-4">
                  <h2 className="text-lg font-bold tracking-tight border-b pb-2 text-muted-foreground uppercase text-xs tracking-wider">{categoryName}</h2>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {categoryCompanies.map((company) => (
                      <Card
                        key={company.id}
                        className={`cursor-pointer hover-elevate transition-all border ${selectedCompany === company.id ? 'ring-2 ring-primary border-primary' : 'border-border'
                          }`}
                        onClick={() => setSelectedCompany(company.id)}
                        data-testid={`card-company-${company.id.toLowerCase()}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10 mt-0.5">
                              <Briefcase className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">{company.name}</h3>
                              <p className="text-[10px] text-muted-foreground truncate">{company.description}</p>
                              <div className="mt-2">
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 leading-none">
                                  {company.pattern}
                                </Badge>
                              </div>
                            </div>
                            {selectedCompany === company.id && (
                              <Check className="w-4 h-4 text-primary shrink-0 mt-1" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedTypes.length > 0 && (!selectedTypes.includes('company') || selectedCompany) && (
        <div className="flex justify-center pt-8">
          <Button
            size="lg"
            onClick={handleStartInterview}
            disabled={startInterviewMutation.isPending || !selectedStudentId || selectedTypes.length === 0}
            className="rounded-2xl px-12 h-16 text-lg font-black shadow-xl"
            data-testid="button-start-interview"
          >
            {startInterviewMutation.isPending ? (
              'Creating...'
            ) : (
              <>
                Create {selectedMode === 'full' && selectedTypes.includes('company') ? 'Multi-Round' : ''} Interview ({selectedDifficulty})
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
