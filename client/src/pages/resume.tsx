import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  Sparkles,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  Loader2,
  BrainCircuit,
  Cpu,
  Eye,
  Download,
  Copy,
  ExternalLink
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { BorderBeam } from "@/components/ui/border-beam";
import { motion, AnimatePresence } from "framer-motion";
import type { Resume, JobDescription } from "@shared/schema";
import { cn } from "@/lib/utils";

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
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resume'] });
      toast({ title: "Intelligence Synced", description: "Your resume has been analyzed by our AI models." });
    },
    onError: (error: Error) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    },
  });

  const [viewResumeModalOpen, setViewResumeModalOpen] = useState(false);
  const [analyzingStepIndex, setAnalyzingStepIndex] = useState(0);

  const analyzingSteps = [
    "Parsing Document Structure & Content Streams...",
    "Extracting Technical Competencies & Career Highlights...",
    "Evaluating ATS Compliance & Format Alignment...",
    "Generating Performance Index & Talent Analytics Report..."
  ];

  useEffect(() => {
    let interval: any;
    if (uploadResumeMutation.isPending) {
      setAnalyzingStepIndex(0);
      interval = setInterval(() => {
        setAnalyzingStepIndex(prev => (prev + 1) % analyzingSteps.length);
      }, 1200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploadResumeMutation.isPending]);

  const addJdMutation = useMutation({
    mutationFn: async (data: { title: string; company: string; description: string }) => {
      return await apiRequest('POST', '/api/job-descriptions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-descriptions'] });
      setShowJdForm(false);
      setJdTitle(""); setJdCompany(""); setJdDescription("");
      toast({ title: "Opportunity Indexed", description: "Job matching analysis complete." });
    },
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Payload Overflow", description: "Limit file size to 5MB for analysis.", variant: "destructive" });
        return;
      }
      uploadResumeMutation.mutate(file);
    }
  }, [uploadResumeMutation, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.docx'))) {
      uploadResumeMutation.mutate(file);
    }
  }, [uploadResumeMutation]);

  const hasResume = !!resume && !!resume.id;
  const parsedData = hasResume ? (resume.parsedData as any) : null;
  const skills = hasResume ? (resume.skills || []) : [];
  const experience = (hasResume ? (resume.experience as any[]) : []) || [];
  const education = (hasResume ? (resume.education as any[]) : []) || [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 pb-12">
      {/* Header Section */}
      <section>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
          <Sparkles className="w-3 h-3" />
          AI Portfolio Intelligence
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-2">Resume Architecture</h1>
        <p className="text-muted-foreground text-lg">Align your professional identity with global industry standards.</p>
      </section>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: Resume Details */}
        <div className="lg:col-span-7 space-y-8">
          <Card className="rounded-[2.5rem] glass-card overflow-hidden relative">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary" />
                  Primary Repository
                </CardTitle>
                {hasResume && <Badge className="bg-emerald-500/20 text-emerald-500 border-0 uppercase font-black tracking-widest text-[10px]">Active</Badge>}
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {uploadResumeMutation.isPending ? (
                <div className="p-10 text-center space-y-6 relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-2xl">
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <FileText className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <div className="space-y-3 max-w-md mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-bold uppercase tracking-wider">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Document Processing Active
                    </div>
                    <h3 className="text-xl font-bold tracking-tight">Analyzing Resume Document</h3>
                    <p className="text-xs font-semibold text-muted-foreground min-h-[1.5rem] transition-all duration-300">
                      {analyzingSteps[analyzingStepIndex]}
                    </p>
                    <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden p-0.5 border border-border shadow-inner">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, ((analyzingStepIndex + 1) / analyzingSteps.length) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground opacity-70">Please wait while your document is being processed...</p>
                  </div>
                </div>
              ) : loadingResume ? (
                <div className="space-y-6"><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-6 w-1/2" /></div>
              ) : hasResume ? (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-muted/50 border border-border group hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-7 h-7 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-base truncate">{resume.fileName}</p>
                        <p className="text-xs text-muted-foreground">Uploaded: {new Date(resume.createdAt!).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setViewResumeModalOpen(true)}
                        className="rounded-xl flex-1 sm:flex-none gap-2 font-semibold text-xs border-primary/30 hover:bg-primary/10 hover:text-primary"
                      >
                        <Eye className="w-4 h-4 text-primary" />
                        View Resume
                      </Button>

                      {resume.fileUrl && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          asChild
                          className="rounded-xl flex-1 sm:flex-none gap-2 font-semibold text-xs"
                        >
                          <a href={resume.fileUrl} target="_blank" rel="noopener noreferrer" download>
                            <Download className="w-4 h-4" />
                            Download PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-3xl bg-muted/50 border border-border space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Upload Revision</Label>
                      <div 
                        className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                        onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                      >
                        <input type="file" accept=".pdf,.docx" onChange={handleFileChange} className="hidden" id="resume-re-upload" />
                        <label htmlFor="resume-re-upload" className="cursor-pointer space-y-2">
                          <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Select New Payload</p>
                        </label>
                      </div>
                    </div>
                    
                    <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col justify-center text-center space-y-2 relative overflow-hidden">
                       <Zap className="absolute top-2 right-2 w-12 h-12 text-primary/10" />
                       <p className="text-sm font-bold text-primary uppercase tracking-[0.2em]">ATS Optimization</p>
                       <span className="text-4xl font-black tracking-tighter text-foreground">{Math.round(resume.overallScore || 0)}%</span>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-60">AI Global Index</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-border rounded-[2rem] p-16 text-center hover:border-primary transition-all group relative overflow-hidden"
                  onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                >
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <input type="file" accept=".pdf,.docx" onChange={handleFileChange} className="hidden" id="resume-initial-upload" />
                  <label htmlFor="resume-initial-upload" className="cursor-pointer relative z-10 block space-y-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Upload className="w-10 h-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black tracking-tight">Deploy Resume</h3>
                      <p className="text-muted-foreground max-w-xs mx-auto">Drop your professional blueprints here (PDF/DOCX) for instantaneous AI decomposition.</p>
                    </div>
                  </label>
                  <BorderBeam size={200} />
                </div>
              )}
            </CardContent>
            <BorderBeam size={400} duration={15} />
          </Card>

          {/* HackerRank ATS Report Card */}
          {hasResume && parsedData?.hiringAgentEvaluation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="rounded-[2.5rem] glass-card overflow-hidden relative p-8 space-y-8 border-primary/20">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                        HackerRank ATS Score breakdown
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-black opacity-60">Objective Candidate Scoring</p>
                    </div>
                    <Badge className="bg-primary/10 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-wider px-3 py-1">ATS Standard v1.2</Badge>
                  </div>

                  {/* Category Progress Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      {
                        name: "Open Source",
                        key: "open_source",
                        data: parsedData.hiringAgentEvaluation.scores?.open_source,
                        color: "from-blue-500 to-indigo-500",
                        icon: Code
                      },
                      {
                        name: "Self Projects",
                        key: "self_projects",
                        data: parsedData.hiringAgentEvaluation.scores?.self_projects,
                        color: "from-purple-500 to-pink-500",
                        icon: Target
                      },
                      {
                        name: "Production Experience",
                        key: "production",
                        data: parsedData.hiringAgentEvaluation.scores?.production,
                        color: "from-emerald-500 to-teal-500",
                        icon: Briefcase
                      },
                      {
                        name: "Technical Skills",
                        key: "technical_skills",
                        data: parsedData.hiringAgentEvaluation.scores?.technical_skills,
                        color: "from-amber-500 to-yellow-500",
                        icon: GraduationCap
                      }
                    ].map((cat) => {
                      if (!cat.data) return null;
                      const pct = Math.round((cat.data.score / cat.data.max) * 100);
                      const Icon = cat.icon;
                      return (
                        <div key={cat.key} className="p-5 rounded-3xl bg-muted/30 border border-border/40 hover:border-primary/20 transition-all flex flex-col justify-between space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center">
                                <Icon className="w-4 h-4 text-primary" />
                              </div>
                              <span className="font-bold text-sm text-foreground/90">{cat.name}</span>
                            </div>
                            <span className="text-xs font-black tracking-widest text-primary bg-primary/5 px-2.5 py-1 rounded-lg">
                              {cat.data.score}/{cat.data.max}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={cn("h-full rounded-full bg-gradient-to-r", cat.color)}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                              <span>Min Base: 0</span>
                              <span>Max: {cat.data.max}</span>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground/80 leading-relaxed italic bg-muted/20 p-3 rounded-2xl border border-border/20">
                            &ldquo;{cat.data.evidence}&rdquo;
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bonus & Deductions Card Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Bonus Card */}
                    <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 space-y-3 relative overflow-hidden group">
                      <div className="absolute top-2 right-2 w-10 h-10 text-emerald-500/10 transition-transform group-hover:scale-110">
                        <CheckCircle className="w-full h-full" />
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <span className="font-black uppercase tracking-wider text-[11px] text-emerald-600 dark:text-emerald-400">Bonus Signals</span>
                      </div>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        +{parsedData.hiringAgentEvaluation.bonus_points?.total || 0} Points
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {parsedData.hiringAgentEvaluation.bonus_points?.breakdown || "No bonus points applied."}
                      </p>
                    </div>

                    {/* Deductions Card */}
                    <div className="p-5 rounded-3xl bg-rose-500/5 border border-rose-500/20 space-y-3 relative overflow-hidden group">
                      <div className="absolute top-2 right-2 w-10 h-10 text-rose-500/10 transition-transform group-hover:scale-110">
                        <AlertCircle className="w-full h-full" />
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                        <span className="font-black uppercase tracking-wider text-[11px] text-rose-600 dark:text-rose-400">Deduction Signal</span>
                      </div>
                      <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                        -{parsedData.hiringAgentEvaluation.deductions?.total || 0} Points
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {parsedData.hiringAgentEvaluation.deductions?.reasons || "No deductions applied."}
                      </p>
                    </div>
                  </div>
                </div>
                <BorderBeam size={600} duration={20} />
              </Card>
            </motion.div>
          )}

          {/* Detailed Decomposition */}
          <div className="grid md:grid-cols-2 gap-8">
             <Card className="rounded-[2rem] glass-card p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <Code className="w-5 h-5 text-primary" />
                  <h3 className="font-black uppercase tracking-widest text-xs">Vectorized Skills</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.length > 0 ? skills.map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                      <Badge variant="secondary" className="rounded-lg bg-muted border-border px-3 py-1 text-xs hover:bg-primary/20 transition-colors">{s}</Badge>
                    </motion.div>
                  )) : <p className="text-xs text-muted-foreground italic">No skills indexed.</p>}
                </div>
             </Card>

             <Card className="rounded-[2rem] glass-card p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-primary" />
                  <h3 className="font-black uppercase tracking-widest text-xs">Experience Log</h3>
                </div>
                <div className="space-y-4">
                  {experience.length > 0 ? experience.map((exp, i) => (
                    <div key={i} className="border-l border-primary/30 pl-4 py-1">
                      <p className="font-bold text-sm">{exp.title || exp.role}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{exp.company}</p>
                    </div>
                  )) : <p className="text-xs text-muted-foreground italic">No experience data.</p>}
                </div>
             </Card>
          </div>
        </div>

        {/* Right: Job Intelligence */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="rounded-[2.5rem] glass-card p-8">
            <CardHeader className="p-0 mb-8 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <Target className="w-6 h-6 text-primary" />
                  Job Alignment
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-black opacity-60">Target Analysis</p>
              </div>
              <Button size="icon" variant="outline" className="rounded-xl border-border bg-muted/50" onClick={() => setShowJdForm(!showJdForm)}>
                {showJdForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </Button>
            </CardHeader>

            <CardContent className="p-0 space-y-6">
              <AnimatePresence>
                {showJdForm && (
                  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 p-6 rounded-3xl bg-muted/50 border border-border mb-6">
                    <div className="space-y-4">
                      <Input value={jdTitle} onChange={(e) => setJdTitle(e.target.value)} placeholder="Position Title" className="h-12 bg-transparent border-border rounded-xl" />
                      <Input value={jdCompany} onChange={(e) => setJdCompany(e.target.value)} placeholder="Organization" className="h-12 bg-transparent border-border rounded-xl" />
                      <Textarea value={jdDescription} onChange={(e) => setJdDescription(e.target.value)} placeholder="Payload (Job Description)..." className="min-h-[150px] bg-transparent border-border rounded-xl resize-none" />
                      <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs" onClick={() => { if(!jdTitle.trim() || !jdDescription.trim()) return; addJdMutation.mutate({ title: jdTitle, company: jdCompany, description: jdDescription }); }}>
                        Analyze Delta
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {loadingJds ? <Skeleton className="h-60 w-full rounded-3xl" /> : (
                <div className="space-y-4">
                  {jobDescriptions?.map((jd) => (
                    <Card key={jd.id} className="rounded-3xl border-border bg-muted/50 hover:bg-muted transition-colors p-6 group">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{jd.title}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{jd.company || 'Unknown Org'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-primary">{Math.round(jd.matchScore || 0)}%</span>
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Match</p>
                        </div>
                      </div>
                      
                      {jd.skillGaps && jd.skillGaps.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {jd.skillGaps.slice(0, 3).map((gap, i) => (
                            <Badge key={i} variant="outline" className="border-orange-500/30 bg-orange-500/5 text-orange-500 text-[9px] uppercase font-black px-2 py-0.5">{gap}</Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                  {(!jobDescriptions || jobDescriptions.length === 0) && (
                    <div className="py-12 text-center opacity-40 space-y-4">
                      <Target className="w-12 h-12 mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No target benchmarks defined.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Intelligence Stream */}
          {hasResume && parsedData?.suggestions && (
            <Card className="rounded-[2.5rem] glass-card bg-gradient-to-br from-card/90 to-primary/5 p-8 space-y-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="font-black uppercase tracking-widest text-xs">Optimization Directives</h3>
              </div>
              <div className="space-y-4">
                {parsedData.suggestions.slice(0, 4).map((s: string, i: number) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-all">
                      <TrendingUp className="w-3 h-3" />
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Interactive Resume View Dialog */}
      <Dialog open={viewResumeModalOpen} onOpenChange={setViewResumeModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-[2rem] p-8">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs font-bold px-3 py-1 border-primary/30 text-primary">
                Active Document Record
              </Badge>
              {resume?.fileUrl && (
                <Button variant="ghost" size="sm" asChild className="gap-2 text-xs font-bold text-primary">
                  <a href={resume.fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Original PDF
                  </a>
                </Button>
              )}
            </div>
            <DialogTitle className="text-2xl font-bold">{resume?.fileName || "Uploaded Resume"}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Extracted content and parsed skills for {user?.firstName || "Candidate"} ({user?.rollNumber || ""})
            </DialogDescription>
          </DialogHeader>

          {resume && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-muted/40 border border-border text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ATS Alignment Score</p>
                  <p className="text-2xl font-black text-primary">{Math.round(resume.overallScore || 0)}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Extracted Skills</p>
                  <p className="text-2xl font-black text-emerald-500">{skills.length}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Work History</p>
                  <p className="text-2xl font-black">{experience.length}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Education</p>
                  <p className="text-2xl font-black">{education.length}</p>
                </div>
              </div>

              {/* Skills List */}
              {skills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    Extracted Technical Skills ({skills.length})
                  </h4>
                  <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-muted/30 border border-border">
                    {skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="px-3 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary border-0">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Parsed Raw Document Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Extracted Resume Text Content
                  </h4>
                  {parsedData?.raw && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        navigator.clipboard.writeText(parsedData.raw);
                        toast({ title: "Copied!", description: "Resume text copied to clipboard." });
                      }}
                      className="h-8 text-xs font-semibold gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Raw Text
                    </Button>
                  )}
                </div>
                <div className="p-5 rounded-2xl bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed max-h-[350px] overflow-y-auto whitespace-pre-wrap border border-slate-800 shadow-inner">
                  {parsedData?.raw || "No raw text extracted."}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
