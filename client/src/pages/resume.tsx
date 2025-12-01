import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Target,
  Briefcase,
  GraduationCap,
  Code,
  TrendingUp,
  Plus,
  X,
  Sparkles
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Resume, JobDescription } from "@shared/schema";

export default function ResumePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showJdForm, setShowJdForm] = useState(false);
  const [jdTitle, setJdTitle] = useState("");
  const [jdCompany, setJdCompany] = useState("");
  const [jdDescription, setJdDescription] = useState("");

  const { data: resume, isLoading: loadingResume } = useQuery<Resume>({
    queryKey: ["/api/resume"],
  });

  const { data: jobDescriptions, isLoading: loadingJds } = useQuery<JobDescription[]>({
    queryKey: ["/api/job-descriptions"],
  });

  const uploadResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      const response = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resume'] });
      toast({
        title: "Success",
        description: "Resume uploaded and analyzed successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addJdMutation = useMutation({
    mutationFn: async (data: { title: string; company: string; description: string }) => {
      return await apiRequest('POST', '/api/job-descriptions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-descriptions'] });
      setShowJdForm(false);
      setJdTitle("");
      setJdCompany("");
      setJdDescription("");
      toast({
        title: "Success",
        description: "Job description added and analyzed!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add job description.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      uploadResumeMutation.mutate(file);
    }
  }, [uploadResumeMutation, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.type.includes('document'))) {
      uploadResumeMutation.mutate(file);
    }
  }, [uploadResumeMutation]);

  const handleAddJd = () => {
    if (!jdTitle.trim() || !jdDescription.trim()) {
      toast({
        title: "Missing fields",
        description: "Please provide a title and description",
        variant: "destructive",
      });
      return;
    }
    addJdMutation.mutate({
      title: jdTitle,
      company: jdCompany,
      description: jdDescription,
    });
  };

  // Treat resumes with null id (backend "empty" object) as no resume
  const hasResume = !!resume && !!resume.id;
  const parsedData = hasResume ? (resume.parsedData as any) : null;
  const skills = hasResume ? (resume.skills || []) : [];
  const experience = (hasResume ? (resume.experience as any[]) : []) || [];
  const education = (hasResume ? (resume.education as any[]) : []) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Resume & Job Matching</h1>
        <p className="text-muted-foreground mt-1">
          Upload your resume and job descriptions for AI-powered analysis
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Your Resume
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingResume ? (
                <div className="space-y-4">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : hasResume ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="font-medium">{resume.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        Uploaded {new Date(resume.createdAt!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Only show score to admins, not students */}
                  {resume.overallScore !== null && user?.role === 'admin' && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Resume Score</span>
                        <span className="text-2xl font-bold text-primary" data-testid="text-resume-score">
                          {Math.round(resume.overallScore)}%
                        </span>
                      </div>
                      <Progress value={resume.overallScore} className="h-2" />
                    </div>
                  )}

                  <div>
                    <Label className="block mb-2">Update Resume</Label>
                    <div 
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                        id="resume-upload-update"
                        disabled={uploadResumeMutation.isPending}
                      />
                      <label htmlFor="resume-upload-update" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {uploadResumeMutation.isPending ? 'Uploading...' : 'Drop new resume or click to upload'}
                        </p>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="resume-upload"
                    disabled={uploadResumeMutation.isPending}
                    data-testid="input-resume-upload"
                  />
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="font-medium mb-1">
                      {uploadResumeMutation.isPending ? 'Analyzing...' : 'Upload Your Resume'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Drag & drop or click to select (PDF, DOC, DOCX)
                    </p>
                  </label>
                </div>
              )}
            </CardContent>
          </Card>

          {hasResume && skills.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Extracted Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" data-testid={`badge-skill-${index}`}>
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {hasResume && experience && experience.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {experience.map((exp, index) => (
                    <div key={index} className="border-l-2 border-primary pl-4">
                      <p className="font-medium">{exp.title || exp.role}</p>
                      <p className="text-sm text-muted-foreground">{exp.company}</p>
                      {exp.duration && (
                        <p className="text-xs text-muted-foreground">{exp.duration}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {hasResume && education && education.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {education.map((edu, index) => (
                    <div key={index} className="border-l-2 border-primary pl-4">
                      <p className="font-medium">{edu.degree}</p>
                      <p className="text-sm text-muted-foreground">{edu.institution}</p>
                      {edu.year && (
                        <p className="text-xs text-muted-foreground">{edu.year}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Job Descriptions
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowJdForm(!showJdForm)}
                  data-testid="button-add-jd"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add JD
                </Button>
              </div>
              <CardDescription>
                Add job descriptions to match against your resume
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showJdForm && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg mb-4">
                  <div>
                    <Label>Job Title *</Label>
                    <Input
                      value={jdTitle}
                      onChange={(e) => setJdTitle(e.target.value)}
                      placeholder="e.g., Software Engineer"
                      data-testid="input-jd-title"
                    />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={jdCompany}
                      onChange={(e) => setJdCompany(e.target.value)}
                      placeholder="e.g., Google"
                      data-testid="input-jd-company"
                    />
                  </div>
                  <div>
                    <Label>Job Description *</Label>
                    <Textarea
                      value={jdDescription}
                      onChange={(e) => setJdDescription(e.target.value)}
                      placeholder="Paste the full job description here..."
                      className="min-h-[120px]"
                      data-testid="input-jd-description"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAddJd}
                      disabled={addJdMutation.isPending}
                      data-testid="button-save-jd"
                    >
                      {addJdMutation.isPending ? 'Analyzing...' : 'Analyze & Save'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowJdForm(false)}
                      data-testid="button-cancel-jd"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {loadingJds ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : jobDescriptions && jobDescriptions.length > 0 ? (
                <div className="space-y-4">
                  {jobDescriptions.map((jd) => (
                    <div 
                      key={jd.id} 
                      className="p-4 border border-border rounded-lg"
                      data-testid={`card-jd-${jd.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{jd.title}</p>
                          {jd.company && (
                            <p className="text-sm text-muted-foreground">{jd.company}</p>
                          )}
                        </div>
                        {jd.matchScore !== null && (
                          <Badge 
                            variant={jd.matchScore >= 70 ? "default" : "secondary"}
                            className={jd.matchScore >= 70 ? "bg-green-500" : ""}
                          >
                            {Math.round(jd.matchScore)}% Match
                          </Badge>
                        )}
                      </div>
                      
                      {jd.skillGaps && jd.skillGaps.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Skill Gaps:</p>
                          <div className="flex flex-wrap gap-1">
                            {jd.skillGaps.slice(0, 5).map((gap, index) => (
                              <Badge key={index} variant="outline" size="sm" className="text-orange-600 border-orange-300">
                                {gap}
                              </Badge>
                            ))}
                            {jd.skillGaps.length > 5 && (
                              <Badge variant="outline" size="sm">
                                +{jd.skillGaps.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No job descriptions yet. Add one to see how well your resume matches.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Recommendations from Resume Analysis */}
          {hasResume && parsedData && parsedData.suggestions && Array.isArray(parsedData.suggestions) && parsedData.suggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI Resume Recommendations
                </CardTitle>
                <CardDescription>
                  Personalized suggestions to improve your resume for overall job market
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {parsedData.suggestions.map((suggestion: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{suggestion}</span>
                    </li>
                  ))}
                </ul>
                {parsedData.strengths && parsedData.strengths.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Your Strengths:</p>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.strengths.map((strength: string, index: number) => (
                        <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* JD-Based Recommendations */}
          {hasResume && jobDescriptions && jobDescriptions.length > 0 && jobDescriptions.map((jd) => {
            const jdData = jd.parsedData as any;
            if (!jdData || !jdData.suggestions || jdData.suggestions.length === 0) return null;
            
            return (
              <Card key={jd.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    AI Recommendations for {jd.title}
                    {jd.company && <span className="text-sm font-normal text-muted-foreground">at {jd.company}</span>}
                  </CardTitle>
                  <CardDescription>
                    Personalized suggestions based on this job description
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {jdData.suggestions.map((suggestion: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                  {jdData.strengths && jdData.strengths.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Your Strengths for this Role:</p>
                      <div className="flex flex-wrap gap-2">
                        {jdData.strengths.map((strength: string, index: number) => (
                          <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
