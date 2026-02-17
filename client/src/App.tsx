import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";
import Layout from "@/components/layout";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

// Code splitting: Lazy load heavy routes
const InterviewStart = lazy(() => import("@/pages/interview-start"));
const InterviewRoom = lazy(() => import("@/pages/interview-room"));
const InterviewResults = lazy(() => import("@/pages/interview-results"));
const Interviews = lazy(() => import("@/pages/interviews"));
const ResumePage = lazy(() => import("@/pages/resume"));
const PersonalityPage = lazy(() => import("@/pages/personality"));
const PlacementPage = lazy(() => import("@/pages/placement"));
const AdminPage = lazy(() => import("@/pages/admin"));
const AdminStudentsPage = lazy(() => import("@/pages/admin-students"));
const AIStatusPage = lazy(() => import("@/pages/ai-status"));
const Settings = lazy(() => import("@/pages/settings"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function AuthenticatedRoutes() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/admin/students" component={AdminStudentsPage} />
          <Route path="/admin/analytics" component={AdminPage} />
          <Route path="/ai-status" component={AIStatusPage} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
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
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
        </>
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
      <ThemeProvider defaultTheme="system" storageKey="skillnox-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
