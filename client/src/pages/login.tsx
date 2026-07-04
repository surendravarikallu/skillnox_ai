import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Brain, ArrowLeft, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { BorderBeam } from "@/components/ui/border-beam";

export default function Login() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Authentication failed");
      if (data.token) localStorage.setItem("token", data.token);

      toast({ title: "Welcome back!", description: "Access granted to Skillnox Intelligence." });
      window.location.href = "/";
    } catch (error: any) {
      toast({ title: "Access Denied", description: error.message || "Invalid credentials provided.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden p-6">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(99,102,241,0.05)_0%,_transparent_50%)]" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />

      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => (window.location.href = "/")}
        className="absolute top-8 left-8 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group z-20"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </motion.button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="rounded-[2.5rem] glass-card overflow-hidden border-border relative">
          <CardHeader className="space-y-6 pt-12 pb-8 text-center">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner relative group">
                <Brain className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-black tracking-tight">Welcome Back</CardTitle>
              <CardDescription className="text-sm font-medium">Sign in to your Skillnox account</CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="px-10 pb-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="identifier" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email or Roll Number</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="Enter your email"
                    required
                    className="h-14 bg-muted/30 border-border rounded-2xl focus:ring-primary focus:border-primary px-6 font-medium"
                    value={formData.identifier}
                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" dangerouslySetInnerHTML={{ __html: 'Password' }} className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    className="h-14 bg-muted/30 border-border rounded-2xl focus:ring-primary focus:border-primary px-6 font-medium"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : "Sign In"}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-border flex items-center justify-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-semibold">Secure Login</span>
              </div>
              <div className="w-1 h-1 bg-border rounded-full" />
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-semibold">Fast Access</span>
              </div>
            </div>
          </CardContent>
          <BorderBeam size={300} duration={12} />
        </Card>
      </motion.div>

      <div className="mt-12 flex flex-col items-center gap-2 text-muted-foreground">
        <p className="text-sm font-semibold">Skillnox AI Platform</p>
        <p className="text-xs">© 2026 Skillnox. All rights reserved.</p>
      </div>
    </div>
  );
}
