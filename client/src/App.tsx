import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import InterviewStart from "@/pages/interview-start";
import InterviewRoom from "@/pages/interview-room";
import InterviewResults from "@/pages/interview-results";
import Interviews from "@/pages/interviews";
import ResumePage from "@/pages/resume";
import PersonalityPage from "@/pages/personality";
import PlacementPage from "@/pages/placement";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

function AuthenticatedRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/interviews" component={Interviews} />
        <Route path="/interview/start" component={InterviewStart} />
        <Route path="/interview/:id/room" component={InterviewRoom} />
        <Route path="/interview/:id/results" component={InterviewResults} />
        <Route path="/interview/:id" component={InterviewResults} />
        <Route path="/resume" component={ResumePage} />
        <Route path="/personality" component={PersonalityPage} />
        <Route path="/placement" component={PlacementPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/admin/students" component={AdminPage} />
        <Route path="/admin/analytics" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Route path="/*?" component={AuthenticatedRoutes} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
