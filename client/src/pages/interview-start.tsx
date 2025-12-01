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
    duration: '30-45 min'
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
    duration: '20-30 min'
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
    duration: '15-25 min'
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
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

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

  const startInterviewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudentId) {
        throw new Error('Please select a student');
      }
      const response = await apiRequest('POST', '/api/interviews', {
        studentId: selectedStudentId,
        type: selectedType,
        company: selectedType === 'company' ? selectedCompany : undefined,
      });
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
      toast({
        title: "Success",
        description: "Interview created successfully for student",
      });
      navigate('/admin/students');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start interview. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    if (typeId === 'company') {
      setStep(2);
    }
  };

  const handleStartInterview = () => {
    if (!selectedType) return;
    if (selectedType === 'company' && !selectedCompany) return;
    startInterviewMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Create Interview for Student</h1>
        <p className="text-muted-foreground">
          Select a student and interview type to create an interview
        </p>
      </div>

      {/* Student Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Student</CardTitle>
          <CardDescription>Choose which student this interview is for</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStudents ? (
            <div className="text-center py-4">Loading students...</div>
          ) : (
            <Select value={selectedStudentId || undefined} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students?.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.firstName} {student.lastName} ({student.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {step > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <span className="text-sm font-medium">Interview Type</span>
        </div>
        {selectedType === 'company' && (
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
        <div className="grid md:grid-cols-2 gap-4">
          {interviewTypes.map((type) => (
            <Card 
              key={type.id}
              className={`cursor-pointer hover-elevate transition-all ${
                selectedType === type.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleTypeSelect(type.id)}
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
                      <Badge variant="outline" size="sm">{type.duration}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card 
            className={`cursor-pointer hover-elevate transition-all ${
              selectedType === 'company' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleTypeSelect('company')}
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
                    <Badge variant="outline" size="sm">Varies</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Practice interviews for TCS, Infosys, Wipro, Amazon & more
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && selectedType === 'company' && (
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
                className={`cursor-pointer hover-elevate transition-all ${
                  selectedCompany === company.id ? 'ring-2 ring-primary' : ''
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
                      <Badge variant="secondary" size="sm" className="mt-2">{company.pattern}</Badge>
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

      {selectedType && (selectedType !== 'company' || selectedCompany) && (
        <div className="flex justify-center pt-4">
          <Button 
            size="lg"
            onClick={handleStartInterview}
            disabled={startInterviewMutation.isPending || !selectedStudentId}
            data-testid="button-start-interview"
          >
            {startInterviewMutation.isPending ? (
              'Creating...'
            ) : (
              <>
                Create Interview for Student
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
