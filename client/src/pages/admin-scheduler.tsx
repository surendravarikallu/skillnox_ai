import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  Calendar,
  Trash2,
  Plus,
  Briefcase,
  Users,
  Activity,
  CheckCircle,
  Clock,
  Zap,
  CheckCheck,
  X,
  AlertTriangle,
  Layers,
  Sparkles,
  Search
} from "lucide-react";
import type { ScheduledCampaign, User } from "@shared/schema";
import { COMPANIES } from "@shared/schema";

const INTERVIEW_TYPES = [
  { value: 'technical', label: 'Technical Interview' },
  { value: 'hr', label: 'HR / Behavioral Interview' },
  { value: 'behavioral', label: 'Behavioral & Leadership' },
  { value: 'company', label: 'Company-Specific Drive' },
  { value: 'gd', label: 'Group Discussion (GD)' },
  { value: 'project', label: 'System Design / Project' },
  { value: 'resume_based', label: 'Resume Based Interview' },
  { value: 'system_design', label: 'System Architecture' },
];

export default function AdminScheduler() {
  const { toast } = useToast();

  // Dynamic Slot Generator State
  const [targetType, setTargetType] = useState<'branch' | 'custom_students' | 'all'>('branch');
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedInterviewTypes, setSelectedInterviewTypes] = useState<string[]>(["technical"]);
  const [company, setCompany] = useState<string>("none");
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dailyStartTime, setDailyStartTime] = useState<string>("09:00");
  const [dailyEndTime, setDailyEndTime] = useState<string>("17:00");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(20);
  const [breakMinutes, setBreakMinutes] = useState<number>(5);

  // Queries
  const { data: students } = useQuery<User[]>({
    queryKey: ['/api/admin/students'],
  });

  const { data: draftData, isLoading: loadingDraft } = useQuery<{ proposal: any }>({
    queryKey: ['/api/admin/scheduler/draft-proposal'],
  });

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery<ScheduledCampaign[]>({
    queryKey: ['/api/admin/scheduler'],
  });

  const draftProposal = draftData?.proposal;

  const branchOptions = Array.from(
    new Set((students || []).map((s) => s.department).filter(Boolean))
  ) as string[];

  // Dynamic Slot Generator Mutation
  const generateSlotsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/scheduler/generate-dynamic-slots', {
        targetType,
        branch: selectedBranch,
        studentIds: selectedStudentIds,
        startDate,
        endDate,
        dailyStartTime,
        dailyEndTime,
        slotDurationMinutes,
        breakMinutes,
        interviewType: selectedInterviewTypes[0] || 'technical',
        types: selectedInterviewTypes,
        company: company === 'none' ? null : company,
        difficulty
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/scheduler/draft-proposal'] });
      toast({
        title: "Dynamic Slot Schedule Generated!",
        description: "Schedule draft created. Please review and click 'Approve & Commit' to publish slots.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Generation Failed",
        description: err.message || "Failed to generate slots.",
        variant: "destructive"
      });
    }
  });

  // Approve Draft Mutation
  const approveSlotsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/scheduler/approve-slots', {});
      return await response.json();
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/scheduler/draft-proposal'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
      toast({
        title: "Slots Approved & Committed!",
        description: res.message || "Student slots have been activated.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Approval Failed",
        description: err.message || "Failed to approve slots.",
        variant: "destructive"
      });
    }
  });

  // Reject Draft Mutation
  const rejectDraftMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/admin/scheduler/draft-proposal');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/scheduler/draft-proposal'] });
      toast({
        title: "Draft Proposal Cleared",
        description: "The unapproved schedule draft has been discarded.",
      });
    }
  });

  const toggleStudentSelect = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllBranchStudents = () => {
    const branchStudents = (students || []).filter(s => selectedBranch === 'all' || s.department === selectedBranch);
    setSelectedStudentIds(branchStudents.map(s => s.id));
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
            <Calendar className="w-3 h-3" />
            Dynamic Campaign Engine
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Dynamic Interview Scheduler</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Auto-generate consecutive-day slot schedules for entire branches with an explicit admin approval workflow.
          </p>
        </div>
      </div>

      {/* DRAFT PROPOSAL REVIEW CARD (IF ACTIVE DRAFT EXISTS) */}
      <AnimatePresence>
        {draftProposal && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
          >
            <Card className="rounded-[2rem] border-2 border-amber-500/50 bg-amber-500/5 shadow-2xl relative overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <Badge className="bg-amber-500 text-black font-black uppercase text-[10px] tracking-widest mb-2">
                      ⚠️ Pending Admin Approval
                    </Badge>
                    <CardTitle className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                      Proposed Dynamic Schedule Draft
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Target: <span className="font-bold text-foreground">{draftProposal.branch}</span> · {draftProposal.scheduledCount} Students Scheduled · {draftProposal.startDate} to {draftProposal.endDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => rejectDraftMutation.mutate()}
                      disabled={rejectDraftMutation.isPending}
                      className="rounded-xl font-bold text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Discard Draft
                    </Button>
                    <Button
                      onClick={() => approveSlotsMutation.mutate()}
                      disabled={approveSlotsMutation.isPending}
                      className="rounded-xl px-6 h-12 bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-600/20 text-white"
                    >
                      <CheckCheck className="w-5 h-5 mr-2" />
                      {approveSlotsMutation.isPending ? "Committing Slots..." : "Approve & Commit Slots"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-2 space-y-6">
                {/* Proposal Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-background/80 border border-border">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Total Target</span>
                    <span className="text-2xl font-black">{draftProposal.studentCount} Students</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Slots Assigned</span>
                    <span className="text-2xl font-black text-emerald-500">{draftProposal.scheduledCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Unassigned</span>
                    <span className="text-2xl font-black text-amber-500">{draftProposal.unassignedCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Daily Operating Window</span>
                    <span className="text-sm font-bold block mt-1">{draftProposal.dailyStartTime} - {draftProposal.dailyEndTime} ({draftProposal.slotDurationMinutes}m slots)</span>
                  </div>
                </div>

                {/* Proposed Slots Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" /> Proposed Student Slot Allotments Preview ({draftProposal.proposedSlots?.length || 0})
                  </h4>
                  <div className="max-h-72 overflow-y-auto rounded-2xl border border-border/80 bg-background/50 divide-y divide-border/60">
                    {draftProposal.proposedSlots?.map((slot: any, idx: number) => (
                      <div key={idx} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <span className="font-bold text-sm block">{slot.studentName}</span>
                            <span className="text-muted-foreground">{slot.department} · {slot.rollNumber} · {slot.email}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-primary/20 text-primary border-primary/30 font-bold mb-1">
                            📅 {slot.slotDate} | ⏰ {slot.slotStartTime} - {slot.slotEndTime}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block capitalize">{slot.interviewType} Round</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <BorderBeam size={250} duration={8} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: DYNAMIC SLOT GENERATOR FORM */}
        <Card className="lg:col-span-1 rounded-[2rem] glass-card overflow-hidden relative">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Generate Dynamic Slots
            </CardTitle>
            <CardDescription>Configure target group, consecutive date range, and daily time window</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-2 space-y-6">
            {/* Target Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block">1. Select Target Candidates</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={targetType === 'branch' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTargetType('branch')}
                  className="rounded-xl text-xs font-bold"
                >
                  By Branch
                </Button>
                <Button
                  type="button"
                  variant={targetType === 'custom_students' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTargetType('custom_students')}
                  className="rounded-xl text-xs font-bold"
                >
                  Custom List
                </Button>
                <Button
                  type="button"
                  variant={targetType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTargetType('all')}
                  className="rounded-xl text-xs font-bold"
                >
                  All Campus
                </Button>
              </div>
            </div>

            {/* Branch Dropdown (if Branch targeted) */}
            {targetType === 'branch' && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Select Department / Branch</label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="rounded-xl bg-background">
                    <SelectValue placeholder="Choose Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments ({students?.length || 0} students)</SelectItem>
                    {branchOptions.map(b => (
                      <SelectItem key={b} value={b}>
                        {b} ({(students || []).filter(s => s.department === b).length} students)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Student Selector (if Custom targeted) */}
            {targetType === 'custom_students' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Students ({selectedStudentIds.length} chosen)</label>
                  <Button type="button" variant="ghost" size="sm" onClick={selectAllBranchStudents} className="text-[10px] font-bold p-0 h-auto">
                    Select All
                  </Button>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, roll number, or branch..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9 rounded-xl bg-background text-xs h-9"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto p-3 rounded-xl bg-background border border-border space-y-2">
                  {(students || []).filter(s => {
                    if (!studentSearch.trim()) return true;
                    const q = studentSearch.toLowerCase();
                    return (
                      (s.firstName || '').toLowerCase().includes(q) ||
                      (s.lastName || '').toLowerCase().includes(q) ||
                      (s.rollNumber || '').toLowerCase().includes(q) ||
                      (s.department || '').toLowerCase().includes(q) ||
                      (s.email || '').toLowerCase().includes(q)
                    );
                  }).map(s => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        id={`st_${s.id}`}
                        checked={selectedStudentIds.includes(s.id)}
                        onCheckedChange={() => toggleStudentSelect(s.id)}
                      />
                      <label htmlFor={`st_${s.id}`} className="cursor-pointer truncate">
                        {s.firstName || s.email?.split('@')[0]} · {s.rollNumber || ''} ({s.department || 'Student'})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interview Types (Multi-Select) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">2. Interview Types ({selectedInterviewTypes.length} selected)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-xl bg-background border border-border">
                {INTERVIEW_TYPES.map(t => (
                  <div key={t.value} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      id={`type_${t.value}`}
                      checked={selectedInterviewTypes.includes(t.value)}
                      onCheckedChange={(checked) => {
                        setSelectedInterviewTypes(prev =>
                          checked
                            ? [...prev, t.value]
                            : prev.filter(v => v !== t.value)
                        );
                      }}
                    />
                    <label htmlFor={`type_${t.value}`} className="cursor-pointer text-xs font-medium truncate">
                      {t.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Company & Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Target Company</label>
                <Select value={company} onValueChange={setCompany}>
                  <SelectTrigger className="rounded-xl bg-background">
                    <SelectValue placeholder="Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Standard Pattern</SelectItem>
                    {COMPANIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Difficulty Level</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="rounded-xl bg-background">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Consecutive Date Range */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block">3. Consecutive Date Range</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-1">Start Date</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-xl bg-background text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-1">End Date</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-xl bg-background text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Daily Time Range */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block">4. Daily Operating Time Window</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-1">Daily Start Time</span>
                  <Input
                    type="time"
                    value={dailyStartTime}
                    onChange={(e) => setDailyStartTime(e.target.value)}
                    className="rounded-xl bg-background text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-1">Daily End Time</span>
                  <Input
                    type="time"
                    value={dailyEndTime}
                    onChange={(e) => setDailyEndTime(e.target.value)}
                    className="rounded-xl bg-background text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Slot Duration & Break */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Slot Duration</label>
                <Select value={String(slotDurationMinutes)} onValueChange={(v) => setSlotDurationMinutes(Number(v))}>
                  <SelectTrigger className="rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Minutes</SelectItem>
                    <SelectItem value="20">20 Minutes (Standard - 15 Qs)</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                    <SelectItem value="45">45 Minutes</SelectItem>
                    <SelectItem value="60">60 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Break Interval</label>
                <Select value={String(breakMinutes)} onValueChange={(v) => setBreakMinutes(Number(v))}>
                  <SelectTrigger className="rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Break</SelectItem>
                    <SelectItem value="5">5 Minutes</SelectItem>
                    <SelectItem value="10">10 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit Action */}
            <Button
              onClick={() => generateSlotsMutation.mutate()}
              disabled={generateSlotsMutation.isPending || !startDate || !endDate}
              className="w-full rounded-2xl h-14 font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-white"
            >
              <Zap className="w-4 h-4 mr-2" />
              {generateSlotsMutation.isPending ? "Generating Draft Schedule..." : "Generate Dynamic Slot Schedule"}
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: CURRENTLY ACTIVE SLOTS & CAMPAIGNS */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Student Slot Allotments */}
          <Card className="rounded-[2rem] glass-card overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <Users className="w-6 h-6 text-primary" />
                Active Student Slot Allotments
              </CardTitle>
              <CardDescription>Live database view of all currently assigned student slots</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-2">
              {!(students || []).filter((s: any) => s.slotDate).length ? (
                <div className="text-center py-12 text-muted-foreground italic bg-muted/20 rounded-2xl border border-dashed p-6">
                  No active student slots found in the database. Use the Dynamic Slot Generator on the left to create and approve new slots.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(students || []).filter((s: any) => s.slotDate).map((s: any) => (
                    <div key={s.id} className="p-4 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{s.firstName || s.email?.split('@')[0]} {s.lastName || ''}</span>
                          <Badge variant="outline" className="text-[10px] font-bold">{s.department || s.rollNumber || 'Student'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          📅 <span className="font-bold text-foreground">{s.slotDate}</span> | ⏰ {s.slotStartTime || '09:00'} - {s.slotEndTime || '17:00'}
                        </p>
                      </div>
                      <Badge className={s.slotStatus === "completed" ? "bg-emerald-500" : "bg-primary font-bold"}>
                        {s.slotStatus || "active"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Drive Campaigns */}
          <Card className="rounded-[2rem] glass-card overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-orange-500" />
                Placement Drive Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-2">
              {!campaigns?.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm italic border border-dashed rounded-2xl p-4">
                  No multi-student drive campaigns registered.
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c) => (
                    <div key={c.id} className="p-4 rounded-2xl border border-border/60 bg-card/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm">{c.title}</h4>
                          <Badge variant="outline" className="text-[10px]">{c.difficulty}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Target: {c.branch || 'All Branches'} · Scheduled: {new Date(c.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-500 border-0">{c.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
