import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Brain,
  LayoutDashboard,
  FileText,
  Users,
  Target,
  User,
  LogOut,
  Settings,
  BarChart3,
  Briefcase,
  MessageSquare,
  Activity,
  Calendar
} from "lucide-react";

const studentNavItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Interviews", path: "/interviews", icon: Brain },
  { title: "Resume & JD", path: "/resume", icon: FileText },
  { title: "Personality", path: "/personality", icon: User },
  { title: "Placement", path: "/placement", icon: Target },
];

const adminNavItems = [
  { title: "Overview", path: "/admin", icon: LayoutDashboard },
  { title: "Students", path: "/admin/students", icon: Users },
  { title: "Scheduler", path: "/admin/scheduler", icon: Calendar },
  { title: "Assign Interview", path: "/admin/assign", icon: Brain },
  { title: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { title: "AI Status", path: "/ai-status", icon: Activity },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNavItems : studentNavItems;
  const isPathActive = (itemPath: string) => {
    if (itemPath === '/') return location === '/';
    return location === itemPath || location.startsWith(itemPath + '/');
  };

  const getBreadcrumbLabel = (loc: string) => {
    if (loc === '/') return 'Dashboard';
    const parts = loc.split('/').filter(Boolean);
    if (parts.length === 0) return 'Dashboard';
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' ')).join(' / ');
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <Sidebar collapsible="icon" className="border-r border-border bg-sidebar transition-all duration-300">
          <SidebarHeader className="h-16 flex items-center justify-center px-4 group-data-[collapsible=icon]:px-0 border-b border-transparent">
            <Link href="/" className="flex items-center justify-center gap-3 cursor-pointer group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-all shrink-0">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-lg font-bold tracking-tight leading-none text-foreground whitespace-nowrap">Skillnox</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">AI</span>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-2">
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 group-data-[collapsible=icon]:hidden">
                {isAdmin ? 'Admin Console' : 'Student Hub'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const active = isPathActive(item.path);
                    return (
                      <SidebarMenuItem key={item.path} className="mb-1">
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          className={cn(
                            "h-11 px-3.5 rounded-xl transition-all duration-300 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                            active 
                              ? "bg-primary/10 text-primary border border-primary/20" 
                              : "hover:bg-accent text-muted-foreground hover:text-foreground"
                          )}
                          data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <Link href={item.path} className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
                            <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-primary fill-primary/20" : "")} />
                            <span className="font-medium group-data-[collapsible=icon]:hidden">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {!isAdmin && (
              <SidebarGroup className="mt-4">
                <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 group-data-[collapsible=icon]:hidden">Rapid Actions</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className="h-11 px-3.5 rounded-xl hover:bg-primary/5 group group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" data-testid="nav-start-interview">
                        <Link href="/interview/start" className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
                          <Brain className="w-4 h-4 text-primary group-hover:scale-110 transition-transform shrink-0" />
                          <span className="font-medium group-data-[collapsible=icon]:hidden">Live Interview</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className="h-11 px-3.5 rounded-xl hover:bg-orange-500/5 group group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" data-testid="nav-company-sim">
                        <Link href="/interview/start?type=company" className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
                          <Briefcase className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform shrink-0" />
                          <span className="font-medium group-data-[collapsible=icon]:hidden">Company Sim</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-border group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2.5 px-2.5 rounded-2xl hover:bg-accent transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" data-testid="button-user-menu">
                  <Avatar className="w-8 h-8 border border-border shadow-sm shrink-0">
                    <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left overflow-hidden group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-bold truncate max-w-[120px]">
                      {user?.firstName || user?.email?.split('@')[0] || 'User'}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider opacity-60">
                      {user?.role}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-border bg-popover backdrop-blur-lg">
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem 
                  onClick={async () => {
                    try {
                      await fetch("/api/auth/logout", {
                        method: "POST",
                        credentials: "include",
                      });
                    } catch (error) {
                      console.error("Logout error:", error);
                    }
                    queryClient.clear();
                    localStorage.removeItem("token");
                    window.location.href = "/login";
                  }}
                  className="text-destructive cursor-pointer rounded-xl"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col flex-1 overflow-hidden relative min-h-screen transition-all duration-300">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-0 dark:opacity-100" />
          
          <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-background/95 backdrop-blur-sm shrink-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-accent rounded-lg" data-testid="button-sidebar-toggle" />
              <div className="h-4 w-[1px] bg-border hidden md:block" />
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Current View /</span>
                <span className="text-xs font-black text-foreground uppercase tracking-widest">{getBreadcrumbLabel(location)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {isAdmin && (
                <Link href="/">
                  <Button variant="outline" size="sm" className="rounded-full border-border hover:bg-accent text-xs font-bold uppercase tracking-wider" data-testid="button-switch-student">
                    Switch to Student View
                  </Button>
                </Link>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
              className="p-8"
            >
              {children}
            </motion.div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
