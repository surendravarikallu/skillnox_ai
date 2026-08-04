import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ShieldCheck, RefreshCw, CheckCircle2, Lock } from "lucide-react";
import { motion } from "framer-motion";

interface WaitingRoomProps {
  onSlotStartAllowed: () => void;
}

export function WaitingRoom({ onSlotStartAllowed }: WaitingRoomProps) {
  // Poll /api/slots/my-slot every 10 seconds (10000ms)
  const { data: slotInfo, isLoading, refetch } = useQuery<{
    slotDate: string | null;
    slotStartTime: string | null;
    slotEndTime: string | null;
    isSlotActive: boolean;
    inWaitingRoom: boolean;
    secondsUntilStart: number;
    lockReason: string | null;
  }>({
    queryKey: ["/api/slots/my-slot"],
    refetchInterval: 10000, // Auto-check every 10 seconds
  });

  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (slotInfo?.secondsUntilStart !== undefined) {
      setCountdown(slotInfo.secondsUntilStart);
    }
    if (slotInfo?.isSlotActive) {
      onSlotStartAllowed();
    }
  }, [slotInfo, onSlotStartAllowed]);

  // Local 1-second countdown ticker
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refetch(); // Trigger immediate check when countdown reaches 0
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown, refetch]);

  const formatCountdown = (secs: number) => {
    if (secs <= 0) return "00:00:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm">Checking interview slot status...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[500px] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <Card className="border-primary/20 shadow-2xl bg-gradient-to-b from-background to-accent/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 animate-pulse" />
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/30">
              <Clock className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Skillnox AI Interview Waiting Room
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your session will automatically start when the interviewer opens your slot window.
            </p>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            {/* Live Countdown Display */}
            <div className="bg-card border border-border/60 rounded-xl p-6 shadow-inner">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                Interview Starts In
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold text-primary font-mono tracking-wider">
                {formatCountdown(countdown)}
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Auto-checking slot status every 10 seconds</span>
              </div>
            </div>

            {/* Slot Metadata Badge */}
            <div className="grid grid-cols-2 gap-4 text-left text-sm bg-muted/40 p-4 rounded-lg border border-border/40">
              <div>
                <span className="text-xs text-muted-foreground block">Assigned Slot Date</span>
                <span className="font-semibold text-foreground">{slotInfo?.slotDate || "Today"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Slot Time Window</span>
                <span className="font-semibold text-foreground">
                  {slotInfo?.slotStartTime || "09:00"} – {slotInfo?.slotEndTime || "17:00"}
                </span>
              </div>
            </div>

            {/* Lock Reason / Status Message */}
            {slotInfo?.lockReason && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 text-left">
                <Lock className="h-4 w-4 shrink-0" />
                <span>{slotInfo.lockReason}</span>
              </div>
            )}

            <div className="pt-2 flex justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Check Status Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
