import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Calendar,
  Trash2,
  Plus,
  Briefcase,
  Users,
  Activity,
  CheckCircle,
  Clock
} from "lucide-react";
import type { ScheduledCampaign } from "@shared/schema";

const COMPANIES = [
  'TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant', 'Capgemini', 'HCL', 
  'Tech Mahindra', 'L&T Infotech', 'Mindtree', 'Zoho', 'Google', 'Microsoft', 
  'Amazon', 'Meta', 'IBM', 'Flipkart', 'Paytm', 'Razorpay', 'Freshworks', 
  'CRED', 'Goldman Sachs', 'Deloitte'
];

export default function AdminScheduler() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState<string>("none");
  const [difficulty, setDifficulty] = useState("medium");
  const [simulationMode, setSimulationMode] = useState("combined");
  const [branch, setBranch] = useState("all");
  const [scheduledAt, setScheduledAt] = useState("");

  const { data: campaigns, isLoading } = useQuery<ScheduledCampaign[]>({
    queryKey: ['/api/admin/scheduler'],
  });

  // Fetch student departments/branches to populate select
  const { data: students } = useQuery<any[]>({
    queryKey: ['/api/admin/students'],
  });

  const branchOptions = Array.from(
    new Set((students || []).map((s) => s.department).filter(Boolean))
  ) as string[];

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/scheduler', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/scheduler'] });
      toast({
        title: "Campaign Scheduled",
        description: "Your interview campaign has been successfully scheduled.",
      });
      // Reset form
      setTitle("");
      setCompany("none");
      setDifficulty("medium");
      setSimulationMode("combined");
      setBranch("all");
      setScheduledAt("");
    },
    onError: (err: any) => {
      toast({
        title: "Failed to schedule",
        description: err.message || "An error occurred.",
        variant: "destructive"
      });
    }
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/scheduler/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/scheduler'] });
      toast({
        title: "Campaign Cancelled",
        description: "The scheduled campaign has been deleted.",
      });
    }
  });

  const handleScheduleCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) {
      toast({
        title: "Missing fields",
        description: "Please fill in the campaign title and schedule time.",
        variant: "destructive"
      });
      return;
    }

    createCampaignMutation.mutate({
      title,
      company: company === "none" ? null : company,
      difficulty,
      simulationMode,
      branch: branch === "all" ? null : branch,
      scheduledAt: new Date(scheduledAt).toISOString(),
    });
  };

  // Student slot allotment state
  const [slotStudentId, setSlotStudentId] = useState<string>("");
  const [slotDate, setSlotDate] = useState<string>("");
  const [slotStartTime, setSlotStartTime] = useState<string>("09:30 AM");
  const [slotEndTime, setSlotEndTime] = useState<string>("10:30 AM");

  const allotSlotMutation = useMutation({
    mutationFn: async () => {
      if (!slotStudentId || !slotDate) {
        throw new Error("Please select a student and slot date");
      }
      const response = await apiRequest('PATCH', `/api/admin/students/${slotStudentId}`, {
        slotDate,
        slotStartTime,
        slotEndTime,
        slotStatus: 'scheduled',
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
      toast({
        title: "Slot Allotted Successfully",
        description: "The interview slot has been assigned to the student.",
      });
      setSlotStudentId("");
      setSlotDate("");
    },
    onError: (err: any) => {
      toast({
        title: "Failed to allot slot",
        description: err.message || "An error occurred.",
        variant: "destructive"
      });
    }
  });

  const handleAllotSlot = (e: React.FormEvent) => {
    e.preventDefault();
    allotSlotMutation.mutate();
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-2">
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Interview Scheduler & Slot Allotment
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Schedule automated placement drives and assign individual date/time slots to students.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column: Forms */}
        <div className="md:col-span-1 space-y-6">
          {/* Day & Slot Allotment Card */}
          <Card className="rounded-[1.5rem] border border-primary/20 bg-primary/5 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Calendar className="w-5 h-5" />
                Student Slot Allotment
              </CardTitle>
              <CardDescription>Assign specific day & time window to a student</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAllotSlot} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Student</label>
                  <Select value={slotStudentId} onValueChange={setSlotStudentId}>
                    <SelectTrigger className="rounded-xl bg-background">
                      <SelectValue placeholder="Choose Student" />
                    </SelectTrigger>
                    <SelectContent>
                      {(students || []).map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName || s.email?.split('@')[0]} {s.lastName || ''} ({s.rollNumber || s.department || 'Student'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Slot Date</label>
                  <Input
                    type="date"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    className="rounded-xl bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Time</label>
                    <Input
                      placeholder="09:30 AM"
                      value={slotStartTime}
                      onChange={(e) => setSlotStartTime(e.target.value)}
                      className="rounded-xl bg-background text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Time</label>
                    <Input
                      placeholder="10:30 AM"
                      value={slotEndTime}
                      onChange={(e) => setSlotEndTime(e.target.value)}
                      className="rounded-xl bg-background text-sm"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-xl font-bold mt-2"
                  disabled={allotSlotMutation.isPending}
                >
                  {allotSlotMutation.isPending ? "Allotting Slot..." : "Allot Slot to Student"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Scheduler Form Card */}
          <Card className="rounded-[1.5rem] border border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                New Drive Campaign
              </CardTitle>
              <CardDescription>Setup details for automated multi-student drives</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScheduleCampaign} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Campaign Title</label>
                  <Input
                    placeholder="e.g. CS Google Placement Drive"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Company</label>
                  <Select value={company} onValueChange={setCompany}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select Company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Standard Interview (No Company)</SelectItem>
                      {COMPANIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Difficulty</label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Simulation</label>
                    <Select value={simulationMode} onValueChange={setSimulationMode}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="combined">Combined</SelectItem>
                        <SelectItem value="full">Full Multi-Round</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Branch</label>
                  <Select value={branch} onValueChange={setBranch}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments / Students</SelectItem>
                      {branchOptions.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Launch Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-xl font-bold mt-4"
                  disabled={createCampaignMutation.isPending}
                >
                  {createCampaignMutation.isPending ? "Scheduling..." : "Schedule Campaign"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Scheduled Campaigns & Allotted Slots List */}
        <Card className="md:col-span-2 rounded-[1.5rem] border border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Scheduled Drives & Student Slots
            </CardTitle>
            <CardDescription>View upcoming automated interview drives and individual student slot allotments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Student Slots Summary */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Student Slot Allotments
              </h3>
              {!(students || []).filter((s: any) => s.slotDate).length ? (
                <div className="text-xs text-muted-foreground italic bg-muted/20 p-4 rounded-2xl border border-dashed text-center">
                  No individual student slots allotted yet. Use the allotment panel on the left or Student Management directory.
                </div>
              ) : (
                <div className="grid gap-3">
                  {(students || []).filter((s: any) => s.slotDate).map((s: any) => (
                    <div key={s.id} className="p-3.5 border rounded-2xl bg-card flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{s.firstName || s.email?.split('@')[0]} {s.lastName || ''}</span>
                          <Badge variant="outline" className="text-[10px]">{s.department || s.rollNumber || 'Student'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          📅 {s.slotDate} | ⏰ {s.slotStartTime || '09:00 AM'} - {s.slotEndTime || '10:00 AM'}
                        </p>
                      </div>
                      <Badge className={s.slotStatus === "completed" ? "bg-emerald-500" : "bg-primary"}>
                        {s.slotStatus || "scheduled"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-orange-500" /> Automated Drive Campaigns
              </h3>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading campaigns...</div>
              ) : !campaigns?.length ? (
                <div className="text-sm text-muted-foreground py-6 text-center italic border border-dashed rounded-2xl p-4">
                  No drive campaigns scheduled yet. Create one on the left panel.
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((c) => (
                    <div key={c.id} className="p-4 border rounded-2xl bg-card/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:bg-card">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm">{c.title}</h4>
                          <Badge variant={c.status === "completed" ? "default" : c.status === "active" ? "secondary" : "outline"} className={c.status === "completed" ? "bg-emerald-500 hover:bg-emerald-600 font-bold" : "font-bold"}>
                            {c.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">{c.difficulty} Difficulty</Badge>
                          {c.simulationMode === "full" && (
                            <Badge className="bg-purple-500 hover:bg-purple-600 text-[10px] uppercase font-bold py-0.5 px-2">Multi-Round</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> Company: {c.company || 'Standard'}</span>
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Target: {c.branch || 'All Branches'}</span>
                          <span className="flex items-center gap-1 col-span-2 mt-1"><Clock className="w-3.5 h-3.5 text-primary" /> Scheduled At: {new Date(c.scheduledAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {c.status === "pending" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteCampaignMutation.mutate(c.id)}
                          disabled={deleteCampaignMutation.isPending}
                          className="rounded-xl hover:bg-destructive/10 hover:text-destructive self-end sm:self-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
