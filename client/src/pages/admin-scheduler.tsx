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

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Campaign Scheduler</h1>
        <p className="text-muted-foreground text-sm">
          Schedule placement mock campaigns for specific branches and automate student enrollments.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Scheduler Form Card */}
        <Card className="md:col-span-1 rounded-[1.5rem] border border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              New Campaign
            </CardTitle>
            <CardDescription>Setup details for the automated drive</CardDescription>
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

        {/* Scheduled Campaigns List */}
        <Card className="md:col-span-2 rounded-[1.5rem] border border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Scheduled Drives
            </CardTitle>
            <CardDescription>View upcoming and completed automated interview drives</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading campaigns...</div>
            ) : !campaigns?.length ? (
              <div className="text-sm text-muted-foreground py-8 text-center italic">
                No campaigns scheduled yet. Create one on the left panel.
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
