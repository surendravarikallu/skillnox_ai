import { useState, useEffect, useRef, useCallback } from "react";
import { WaitingRoom } from "@/components/WaitingRoom";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Play,
  Clock,
  ArrowRight,
  Brain,
  Volume2,
  VolumeX,
  Zap,
  Activity,
  Terminal,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  BrainCircuit,
  Loader2,
  Sparkles,
  FileText
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NeonPulse } from "@/components/NeonPulse";
import { useVoiceToText } from "@/hooks/useVoiceToText";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { BorderBeam } from "@/components/ui/border-beam";
import { motion, AnimatePresence } from "framer-motion";
import type { Interview, InterviewQuestion } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const ENHANCED_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export default function InterviewRoom() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [hasSpokenCurrentQuestion, setHasSpokenCurrentQuestion] = useState(false);
  const [streamVersion, setStreamVersion] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slotAllowed, setSlotAllowed] = useState(false);

  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [micTested, setMicTested] = useState(false);
  const [isAnalyzingReport, setIsAnalyzingReport] = useState(false);
  const [reportStepIndex, setReportStepIndex] = useState(0);

  const reportSteps = [
    "Processing Audio Transcripts & Candidate Responses...",
    "Evaluating Technical Accuracy & Problem-Solving Approach...",
    "Assessing Communication Clarity & Structured Responses...",
    "Calculating Domain Scores & Candidate Performance Index...",
    "Generating Comprehensive Assessment & Feedback Report..."
  ];

  // Check student slot status for WaitingRoom gate
  const { data: slotInfo } = useQuery<{
    isSlotActive: boolean;
    inWaitingRoom: boolean;
    secondsUntilStart: number;
    lockReason: string | null;
  }>({
    queryKey: ['/api/slots/my-slot'],
    refetchInterval: 10000,
    enabled: !!user && user.role !== 'admin',
  });

  const { transcript, isListening, connectionState, startListening, stopListening, pauseListening, clearTranscript, hardResetTranscript, setTranscript, error: speechError, micTestResult, testMicrophone, getRecordedAudio } = useVoiceToText();
  const { isSpeaking: isAISpeaking, speak: speakText, stop: stopSpeaking, primeAudio } = useTextToSpeech();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingAnswerPromisesRef = useRef<Promise<any>[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const { data: interview, isLoading: loadingInterview } = useQuery<Interview>({
    queryKey: ['/api/interviews', id],
  });

  const { data: questions, isLoading: loadingQuestions } = useQuery<InterviewQuestion[]>({
    queryKey: ['/api/interviews', id, 'questions'],
    enabled: !!id && !!interview && (interview.status === 'in_progress' || interview.status === 'completed'),
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/interviews/${id}/questions`);
      return await response.json();
    },
  });

  const startInterviewMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/interviews/${id}/start`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/interviews', id] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/interviews', id, 'questions'] });
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Access Restricted",
        description: error?.message || "Your interview slot has not started yet. Please wait in the waiting room.",
        variant: "destructive",
      });
      setSlotAllowed(false);
    }
  });

  const nextRoundMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/interviews/${id}/next-round`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/interviews', id, 'questions'] });
      
      if (data.completed || !data.passed) {
        navigate(`/interview/${id}/results`);
      } else if (data.advanced) {
        setShowRoundSummary(false);
        setCurrentQuestionIndex(0);
        setTimeElapsed(0);
        toast({
          title: "Next Round Started",
          description: data.message || "Moved to the next round.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Advancement Failed",
        description: error?.message || "Please wait a moment for the AI to complete scoring.",
        variant: "destructive"
      });
    }
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async (data: { questionId: string; answer: string }) => {
      const response = await apiRequest('POST', `/api/interviews/${id}/answer`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews', id, 'questions'] });
    },
    onError: (error: any) => {
      console.warn("Background answer save error:", error);
    }
  });

  const completeInterviewMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/interviews/${id}/complete`, {});
    },
    onSuccess: () => {
      navigate(`/interview/${id}/results`);
    },
  });

  useEffect(() => {
    const initCamera = async () => {
      if (!cameraEnabled) {
        if (streamRef.current) streamRef.current.getVideoTracks().forEach(track => track.stop());
        return;
      }
      if (interview?.status === 'pending') return;

      try {
        // Try video + audio first
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: ENHANCED_AUDIO_CONSTRAINTS
        });
        streamRef.current = stream;
        setStreamVersion(prev => prev + 1);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        console.warn("Camera+audio getUserMedia failed, trying video-only:", error);
        // CRITICAL: Do NOT disable mic when camera fails!
        // Try video-only as fallback
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false
          });
          streamRef.current = stream;
          setStreamVersion(prev => prev + 1);
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (videoError) {
          console.warn("Video-only also failed, disabling camera only:", videoError);
          setCameraEnabled(false);
          // NEVER set micEnabled(false) here — mic works independently via SpeechRecognition
        }
      }
    };

    if (interview?.status === 'in_progress' || interview?.status === 'completed') initCamera();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop()); };
  }, [cameraEnabled, interview?.status]);

  const maxDurationReachedRef = useRef(false);

  useEffect(() => {
    if (interview?.status !== 'in_progress') return;

    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => {
        const nextTime = prev + 1;
        if (nextTime >= 1200 && !maxDurationReachedRef.current) { // 20 minutes = 1200 seconds
          maxDurationReachedRef.current = true;
          toast({
            title: "Maximum Session Duration Reached (20 min)",
            description: "Your session timer has reached 20 minutes. Auto-submitting interview for final evaluation...",
            variant: "destructive"
          });
          handleComplete();
        }
        return nextTime;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [interview?.status]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const toggleCamera = useCallback(() => {
    setCameraEnabled(prev => !prev);
  }, []);

  const toggleMic = useCallback(() => {
    const nextState = !micEnabled;
    setMicEnabled(nextState);
    if (nextState) {
      startListening();
    } else {
      stopListening();
    }
  }, [micEnabled, startListening, stopListening]);

  const handleComplete = async () => {
    setIsAnalyzingReport(true);
    setReportStepIndex(0);

    stopListening();
    stopSpeaking();

    const interval = setInterval(() => {
      setReportStepIndex(prev => {
        if (prev < reportSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 1400);

    try {
      if (pendingAnswerPromisesRef.current.length > 0) {
        await Promise.all(pendingAnswerPromisesRef.current);
      }

      await completeInterviewMutation.mutateAsync();

      await queryClient.invalidateQueries({ queryKey: ['/api/interviews', id] });
      await queryClient.invalidateQueries({ queryKey: ['/api/interviews', id, 'questions'] });

      // Hold analyzing screen for a clean visual transition
      await new Promise(r => setTimeout(r, 3000));

      clearInterval(interval);
      navigate(`/interview/${id}/results`);
    } catch (e) {
      console.error("[InterviewRoom] Error finalizing report:", e);
      clearInterval(interval);
      setIsAnalyzingReport(false);
      toast({
        title: "Evaluation Issue",
        description: "Failed to generate report. Please refresh and retry.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitAnswer = async () => {
    if (!questions) return;
    const qId = questions[currentQuestionIndex].id;
    const fallbackText = transcript.trim();
    const isLast = currentQuestionIndex === questions.length - 1;

    // 1. Instantly extract candidate's recorded audio blob (~20ms)
    const audioBlob = await getRecordedAudio();

    // 2. INSTANT ZERO-LATENCY UI SWITCH TO NEXT QUESTION
    clearTranscript();
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }

    // 3. Process Groq Cloud Whisper AI STT and track promise
    const savePromise = (async () => {
      let groqTranscript = fallbackText;
      if (audioBlob && audioBlob.size > 500) {
        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': audioBlob.type || 'audio/webm' },
            body: audioBlob,
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            if (data.text && data.text.trim().length > 0) {
              groqTranscript = data.text.trim();
              console.log(`[InterviewRoom] ✅ Groq Cloud Whisper AI transcribed (${groqTranscript.length} chars): "${groqTranscript.substring(0, 60)}..."`);
            }
          }
        } catch (err) {
          console.warn("[InterviewRoom] Background Groq Whisper STT error:", err);
        }
      }

      // Save the official Groq Whisper AI transcription directly to database
      const finalSaveAnswer = groqTranscript || "(no answer recorded)";
      return await apiRequest('POST', `/api/interviews/${id}/answer`, { questionId: qId, answer: finalSaveAnswer });
    })();

    pendingAnswerPromisesRef.current.push(savePromise);

    if (isLast) {
      if (interview?.simulationMode === 'full') {
        setShowRoundSummary(true);
      } else {
        await handleComplete();
      }
    }
  };

  const currentQuestion = questions?.[currentQuestionIndex];
  const progress = questions ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const isLastQuestion = questions ? currentQuestionIndex === questions.length - 1 : false;

  const spokenQuestionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const qId = currentQuestion?.id;
    if (qId && !loadingQuestions && interview?.status === 'in_progress' && spokenQuestionIdRef.current !== qId) {
      spokenQuestionIdRef.current = qId;
      
      // Ensure mic is active & listening immediately on question change
      startListening();
      
      console.log(`[InterviewRoom] Auto-speaking question (${qId}): "${currentQuestion.question.substring(0, 50)}..."`);
      
      // Speak question text in background without locking/muting microphone
      speakText(currentQuestion.question).catch(err => {
        console.error("[InterviewRoom] Automatic question speech failed:", err);
      });
    }
  }, [currentQuestion?.id, currentQuestion?.question, loadingQuestions, interview?.status, speakText, startListening]);

  // MIC WATCHDOG: During an active interview, ensure mic is always running.
  // If the mic drops for any reason (Chrome glitch, TTS race, etc.) and the student
  // hasn't manually disabled it, auto-restart it every 5 seconds.
  useEffect(() => {
    if (interview?.status !== 'in_progress' || !micEnabled) return;

    const watchdog = setInterval(() => {
      if (micEnabled && !isListening && interview?.status === 'in_progress') {
        console.warn("[InterviewRoom] 🔧 Mic watchdog: mic not listening during active interview. Auto-restarting...");
        startListening();
      }
    }, 3000);

    return () => clearInterval(watchdog);
  }, [interview?.status, micEnabled, isListening, startListening]);

  // Ctrl+Enter keyboard shortcut to submit answer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && interview?.status === 'in_progress' && transcript.trim() && !submitAnswerMutation.isPending) {
        e.preventDefault();
        handleSubmitAnswer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interview?.status, transcript, submitAnswerMutation.isPending]);

  if (loadingInterview) return <div className="flex items-center justify-center h-[80vh]"><Zap className="w-12 h-12 text-primary animate-pulse" /></div>;

  if (interview?.status === 'pending') {
    // Show WaitingRoom if student's slot hasn't started yet (non-admin only)
    const isAdmin = user?.role === 'admin';
    const showWaitingRoom = !isAdmin && !slotAllowed && (
      !slotInfo || (!slotInfo.isSlotActive && (slotInfo.inWaitingRoom || (slotInfo.secondsUntilStart !== undefined && slotInfo.secondsUntilStart > 0)))
    );

    if (showWaitingRoom) {
      return (
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[70vh]">
          <WaitingRoom onSlotStartAllowed={() => setSlotAllowed(true)} />
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[70vh]">
        <Card className="relative overflow-hidden rounded-[2.5rem] glass-card p-12 text-center">
          <div className="relative z-10 space-y-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/20 rotate-3">
              <Brain className="w-12 h-12 text-white" />
            </div>
            <div>
              <Badge className="bg-primary/10 text-primary border-primary/20 mb-4 px-4 py-1 font-black uppercase tracking-widest">Awaiting Candidate</Badge>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 capitalize">{interview.type} Session</h1>
              <p className="text-xl text-muted-foreground max-w-lg mx-auto">Your AI interviewer is ready. Prepare your microphone and camera for a professional experience.</p>
            </div>

            {/* Mic Test Panel */}
            <div className="bg-card/50 border border-border rounded-2xl p-6 max-w-md mx-auto space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                <Mic className="w-4 h-4" />
                Microphone Check
              </div>
              <p className="text-sm text-muted-foreground">
                Speak into your microphone for 3 seconds to verify it's working before starting.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className={cn(
                    "rounded-xl font-bold",
                    micTestResult === 'testing' && "animate-pulse border-amber-500 text-amber-500",
                    micTestResult === 'pass' && "border-emerald-500 text-emerald-500 bg-emerald-500/10",
                    micTestResult === 'fail' && "border-destructive text-destructive bg-destructive/10",
                  )}
                  onClick={async () => {
                    const passed = await testMicrophone();
                    if (passed) setMicTested(true);
                  }}
                  disabled={micTestResult === 'testing'}
                >
                  {micTestResult === 'untested' && <><Mic className="w-4 h-4 mr-2" /> Test Microphone</>}
                  {micTestResult === 'testing' && <><Activity className="w-4 h-4 mr-2 animate-pulse" /> Listening... Speak Now</>}
                  {micTestResult === 'pass' && <><ShieldCheck className="w-4 h-4 mr-2" /> Microphone Working ✓</>}
                  {micTestResult === 'fail' && <><MicOff className="w-4 h-4 mr-2" /> Test Failed — Retry</>}
                </Button>
              </div>
              {speechError && (
                <p className="text-xs text-destructive font-medium">⚠️ {speechError}</p>
              )}
              {micTestResult === 'fail' && (
                <div className="text-xs text-amber-400 space-y-1 text-left bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <p className="font-bold">Troubleshooting:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Check if your microphone is muted or disconnected</li>
                    <li>Click the lock/camera icon in the address bar → Allow Microphone</li>
                    <li>Try using headphones with a built-in mic</li>
                    <li>Close other apps that may be using the microphone</li>
                  </ul>
                </div>
              )}
            </div>

            <Button 
              size="lg" 
              className={cn(
                "rounded-2xl px-12 h-16 text-lg font-black shadow-xl shadow-primary/30 transition-all",
                micTested ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              onClick={() => {
                primeAudio();
                startInterviewMutation.mutate();
              }} 
              disabled={startInterviewMutation.isPending || !micTested}
            >
              {startInterviewMutation.isPending ? "Initializing..." : !micTested ? "Test Microphone First" : "Begin Session"}
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
          </div>
          <BorderBeam size={400} duration={12} />
        </Card>
      </div>
    );
  }

  if (isAnalyzingReport) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        {/* Subtle Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5 opacity-80" />

        <Card className="max-w-xl w-full rounded-[2.5rem] glass-card p-10 text-center space-y-8 relative z-10 border-primary/20 shadow-2xl overflow-hidden">
          {/* Animated Spinner Radar */}
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin [animation-duration:1.5s]" />
            <FileText className="w-9 h-9 text-primary animate-pulse" />
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              Performance Evaluation Active
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight">Evaluating Candidate Responses</h2>
            
            <p className="text-xs font-semibold text-muted-foreground min-h-[2rem] transition-all duration-300 px-4">
              {reportSteps[reportStepIndex]}
            </p>

            {/* Clean Progress Bar */}
            <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden p-0.5 border border-border shadow-inner max-w-md mx-auto">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-700 ease-out" 
                style={{ width: `${Math.min(100, ((reportStepIndex + 1) / reportSteps.length) * 100)}%` }}
              />
            </div>

            <p className="text-[11px] text-muted-foreground font-medium pt-1">
              Please wait while your evaluation report is being generated...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Round summary evaluation calculations
  const activeRoundType = currentQuestion?.round;
  const roundName = (interview as any)?.activeRoundName || "Round";
  const roundPassingScore = (interview as any)?.activeRoundPassingScore || 50;

  const roundQuestions = questions?.filter(q => q.round === activeRoundType) || [];
  const scoredQuestions = roundQuestions.filter(q => q.score !== null && q.score !== undefined);
  const isEvaluatingRound = scoredQuestions.length < roundQuestions.length;

  const roundAvgScore = roundQuestions.length > 0
    ? roundQuestions.reduce((sum, q) => sum + (q.score || 0), 0) / roundQuestions.length
    : 0;

  const passedRound = roundAvgScore >= roundPassingScore;

  if (showRoundSummary) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[70vh]">
        <Card className="relative overflow-hidden rounded-[2.5rem] glass-card p-12 text-center w-full max-w-2xl border-primary/20 shadow-2xl">
          <div className="relative z-10 space-y-8">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 rotate-3">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <div>
              <Badge className="bg-primary/10 text-primary border-primary/20 mb-3 px-4 py-1 font-black uppercase tracking-widest">Round Completed</Badge>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">{roundName} Complete</h1>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">AI is evaluating your responses for this round. Please do not close the window.</p>
            </div>

            {isEvaluatingRound ? (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-center gap-3 text-primary font-bold animate-pulse text-sm">
                  <Activity className="w-5 h-5 animate-spin" />
                  Generating detailed AI placement evaluation...
                </div>
                <Progress value={Math.round((scoredQuestions.length / roundQuestions.length) * 100)} className="h-1.5 max-w-sm mx-auto" />
                <p className="text-xs text-muted-foreground">{scoredQuestions.length} of {roundQuestions.length} responses evaluated</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="max-w-xs mx-auto border border-border bg-card/50 p-6 rounded-2xl">
                  <p className="text-xs uppercase font-black tracking-widest text-muted-foreground mb-1">Your Round Score</p>
                  <p className={`text-5xl font-black ${passedRound ? 'text-emerald-500' : 'text-destructive'}`}>{roundAvgScore.toFixed(0)}%</p>
                  <p className="text-[10px] text-muted-foreground mt-2 uppercase font-semibold">
                    Required Passing Score: {roundPassingScore}%
                  </p>
                </div>

                {passedRound ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-sm max-w-md mx-auto">
                    <strong>Passed!</strong> You meet the qualification criteria to advance to the next round of this placement simulation.
                  </div>
                ) : (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl text-sm max-w-md mx-auto">
                    <strong>Placement Failed.</strong> You did not achieve the required passing score for this round. The interview will be terminated.
                  </div>
                )}

                <div className="flex gap-4 justify-center">
                  <Button
                    size="lg"
                    className={`rounded-2xl px-12 h-16 text-lg font-black shadow-xl ${passedRound ? 'bg-primary hover:bg-primary/90' : 'bg-destructive hover:bg-destructive/90'}`}
                    onClick={() => nextRoundMutation.mutate()}
                    disabled={nextRoundMutation.isPending}
                  >
                    {nextRoundMutation.isPending ? "Processing..." : passedRound ? "Proceed to Next Round" : "View Feedback & Exit"}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <BorderBeam size={400} duration={10} />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 h-full flex flex-col">
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center shadow-inner">
            <Activity className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
              {interview?.company ? `${interview.company} - ${roundName}` : `${interview?.type} Session`}
              <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 uppercase font-black text-[10px] tracking-widest">{interview?.company || 'Standard'}</Badge>
            </h1>
            <div className="flex items-center gap-4 mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              <span className="flex items-center gap-1.5 font-bold text-amber-500"><Clock className="w-3 h-3" /> {Math.floor(timeElapsed / 60)}:{String(timeElapsed % 60).padStart(2, '0')} / 20:00</span>
              <span className="w-1 h-1 bg-border rounded-full" />
              <span>Question {currentQuestionIndex + 1} / {questions?.length}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-md hidden lg:block">
          <div className="flex justify-between mb-2 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Progress</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border">
            <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
        </div>

        <Button variant="ghost" className="rounded-xl border border-border text-destructive font-black uppercase text-[10px] tracking-widest hover:bg-destructive/10" onClick={handleComplete}>
          Abort Session
        </Button>
      </header>

      <div className="grid lg:grid-cols-12 gap-8 flex-1">
        <div className="lg:col-span-5 space-y-8">
          <Card className="rounded-[2.5rem] glass-card overflow-hidden relative group h-[550px] shadow-2xl border-primary/10">
            <div className="absolute inset-0 z-0 bg-muted">
              {cameraEnabled ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover scale-x-[-1] transition-transform duration-700 group-hover:scale-105" 
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/80 backdrop-blur-md">
                  <CameraOff className="w-12 h-12 text-muted-foreground/20 animate-pulse" />
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40 mt-4">Camera Standby</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60" />
            </div>

            <div className="absolute inset-0 z-10 p-12 flex flex-col items-center justify-center text-center space-y-6">
              <NeonPulse 
                active={isAISpeaking || isListening} 
                color={isAISpeaking ? "#6366f1" : isListening ? "#10b981" : "#ffffff"} 
                size={isAISpeaking || isListening ? 260 : 180} 
                className="transition-all duration-500 drop-shadow-[0_0_30px_rgba(var(--primary),0.3)]"
              />
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
                  {isAISpeaking ? "AI Interviewer" : isListening ? "Listening..." : "Observer"}
                </h3>
                <p className="text-sm font-medium text-white/70 max-w-xs mx-auto leading-relaxed drop-shadow-sm">
                  {isAISpeaking ? "Analyzing your professional profile..." : isListening ? "Speak clearly into the microphone." : "Proceed with your response."}
                </p>
              </motion.div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
              <Button 
                size="icon" 
                variant="ghost" 
                className={cn(
                  "w-12 h-12 rounded-2xl transition-all duration-300",
                  cameraEnabled ? "bg-white/10 text-white hover:bg-white/20" : "bg-destructive/20 text-destructive"
                )}
                onClick={toggleCamera}
              >
                {cameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className={cn(
                  "w-12 h-12 rounded-2xl transition-all duration-300",
                  micEnabled ? "bg-white/10 text-white hover:bg-white/20" : "bg-destructive/20 text-destructive"
                )}
                onClick={toggleMic}
              >
                {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>
            </div>
            
            <BorderBeam size={600} duration={10} className="opacity-40" />
          </Card>

          <Card className="rounded-[2rem] glass-card p-6 border-border/50 bg-primary/5">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className={cn("w-3 h-3 rounded-full animate-pulse", isListening ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                   <span className="text-xs font-black uppercase tracking-widest">{isListening ? "Voice Active" : "Voice Standby"}</span>
                </div>
                <div className="flex gap-1.5">
                   {[1, 2, 3, 4, 5].map(i => (
                     <div key={i} className={cn("w-1 h-4 rounded-full bg-primary/30", isListening && "animate-bounce")} style={{ animationDelay: `${i * 100}ms` }} />
                   ))}
                </div>
             </div>
          </Card>
        </div>

        <div className="lg:col-span-7 flex flex-col space-y-6">
          <Card className="rounded-[2rem] glass-card overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <Terminal className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Query Entry</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.p 
                  key={currentQuestionIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-2xl md:text-3xl font-bold leading-tight"
                >
                  {currentQuestion?.question || "Initializing protocol..."}
                </motion.p>
              </AnimatePresence>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-accent" onClick={() => { stopSpeaking(); speakText(currentQuestion?.question || ""); }}>
                  {isAISpeaking ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                  {isAISpeaking ? "Mute" : "Replay Audio"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="flex-1 rounded-[2rem] glass-card overflow-hidden flex flex-col relative group border-primary/20 shadow-2xl">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3 text-emerald-500">
                <MessageSquare className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Audio Transcript & Response</span>
              </div>
              <div className="flex items-center gap-2">
                {isListening ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold flex items-center gap-1.5 px-3 py-1">
                    <Mic className="w-3.5 h-3.5 animate-pulse" />
                    Listening Active
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-1.5"
                    onClick={() => {
                      if (!micEnabled) setMicEnabled(true);
                      startListening();
                    }}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Start Listening
                  </Button>
                )}
                {connectionState === "reconnecting" && <Badge variant="destructive" className="animate-pulse">Reconnecting...</Badge>}
              </div>
            </div>

            {speechError && (
              <div className="px-6 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs font-bold flex items-center justify-between">
                <span>⚠️ {speechError}</span>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] uppercase font-black text-destructive hover:bg-destructive/20" onClick={() => startListening()}>
                  Retry Mic
                </Button>
              </div>
            )}
            
            <div className="flex-1 p-6 flex flex-col" ref={scrollRef}>
              <div
                className="w-full h-full min-h-[160px] bg-transparent font-medium text-lg leading-relaxed text-foreground overflow-y-auto whitespace-pre-wrap select-none pointer-events-none"
              >
                {transcript ? (
                  <div className="space-y-3">
                    <p>{transcript}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground font-bold">
                        {transcript.split(/\s+/).filter(Boolean).length} words captured
                      </span>
                      {isListening && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-bold animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Recording...
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="text-muted-foreground/60 italic block">
                      {isListening
                        ? "🎙️ Microphone Active — Speak your answer clearly. Your speech text will appear here in real-time."
                        : "Click 'Start Listening' above to begin recording your voice response."}
                    </span>
                    {isListening && (
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Recording Audio — Your voice will be transcribed by AI when you submit
                        </div>
                        <p className="text-xs text-muted-foreground">
                          💡 Even if text doesn't appear here live, your voice is being recorded and will be transcribed accurately by Groq Cloud Whisper AI on submit.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 pt-3 bg-gradient-to-t from-card/90 to-transparent border-t border-border/50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 font-bold">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    Strict Voice Speech Only Mode
                  </div>
                  {transcript.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] uppercase font-black text-muted-foreground hover:text-foreground"
                      onClick={clearTranscript}
                    >
                      Clear Voice Recording
                    </Button>
                  )}
                </div>
                <Button 
                  size="lg" 
                  className={cn(
                    "rounded-2xl h-14 px-10 font-black shadow-xl transition-all bg-primary hover:bg-primary/90 shadow-primary/20"
                  )}
                  onClick={handleSubmitAnswer}
                  disabled={submitAnswerMutation.isPending || isTransitioning}
                >
                  {submitAnswerMutation.isPending
                    ? "Saving Answer..."
                    : transcript.trim()
                    ? (isLastQuestion ? "Submit Answer & Finalize" : "Submit Voice Answer →")
                    : (isLastQuestion ? "Finalize Interview" : "Submit Recorded Voice →")}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
