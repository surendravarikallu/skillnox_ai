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

function lazyWithRetry<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch((error) => {
      const key = "skillnox_chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      sessionStorage.removeItem(key);
      throw error;
    })
  );
}

// Code splitting: Lazy load heavy routes
const InterviewStart = lazyWithRetry(() => import("@/pages/interview-start"));
const InterviewRoom = lazyWithRetry(() => import("@/pages/interview-room"));
const InterviewResults = lazyWithRetry(() => import("@/pages/interview-results"));
const Interviews = lazyWithRetry(() => import("@/pages/interviews"));
const ResumePage = lazyWithRetry(() => import("@/pages/resume"));
const PersonalityPage = lazyWithRetry(() => import("@/pages/personality"));
const PlacementPage = lazyWithRetry(() => import("@/pages/placement"));
const AdminPage = lazyWithRetry(() => import("@/pages/admin"));
const AdminStudentsPage = lazyWithRetry(() => import("@/pages/admin-students"));
const AdminAssignPage = lazyWithRetry(() => import("@/pages/admin-assign"));
const AIStatusPage = lazyWithRetry(() => import("@/pages/ai-status"));
const Settings = lazyWithRetry(() => import("@/pages/settings"));
const AdminScheduler = lazyWithRetry(() => import("@/pages/admin-scheduler"));
const AdminAnalyticsPage = lazyWithRetry(() => import("@/pages/admin-analytics"));
const SharedReport = lazyWithRetry(() => import("@/pages/shared-report"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function RoleBasedDashboard() {
  const { user } = useAuth();
  if (user?.role === "admin") {
    return <AdminPage />;
  }
  return <Dashboard />;
}

function AuthenticatedRoutes() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={RoleBasedDashboard} />
          <Route path="/dashboard" component={RoleBasedDashboard} />
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
          <Route path="/admin/assign" component={AdminAssignPage} />
          <Route path="/admin/scheduler" component={AdminScheduler} />
          <Route path="/admin/analytics" component={AdminAnalyticsPage} />
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
          <Route path="/landing" component={Landing} />
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/shared/report/:shareToken" component={SharedReport} />
        </>
      ) : (
        <>
          <Route path="/landing" component={Landing} />
          <Route path="/shared/report/:shareToken" component={SharedReport} />
          <Route path="/*?" component={AuthenticatedRoutes} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="skillnox-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
