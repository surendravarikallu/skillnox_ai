import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, SearchX } from "lucide-react";
import { motion } from "framer-motion";
import { BorderBeam } from "@/components/ui/border-beam";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-6">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(99,102,241,0.05)_0%,_transparent_50%)]" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg relative z-10"
      >
        <Card className="rounded-[2.5rem] glass-card overflow-hidden border-border relative">
          <CardContent className="p-12 text-center">
            <div className="flex items-center justify-center mb-8">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner relative group">
                <SearchX className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
              </div>
            </div>

            <div className="text-8xl font-black tracking-tighter text-primary/20 mb-2 select-none">
              404
            </div>

            <h1 className="text-2xl font-black tracking-tight mb-3" data-testid="text-not-found-title">
              Page Not Found
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              The page you're looking for doesn't exist or has been moved.
              Check the URL or head back to your dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.history.back()}
                className="rounded-2xl px-8 h-12 font-bold border-border hover:bg-accent"
                data-testid="button-go-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Link href="/">
                <Button
                  size="lg"
                  className="rounded-2xl px-8 h-12 font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                  data-testid="button-go-home"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
          <BorderBeam size={300} duration={12} />
        </Card>
      </motion.div>
    </div>
  );
}
