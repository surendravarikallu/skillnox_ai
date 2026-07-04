import { useState, useEffect, useRef, useCallback } from "react";
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
  ChevronRight
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
  sampleRate: 44100,
  channelCount: 1,
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

  const [showRoundSummary, setShowRoundSummary] = useState(false);

  const { transcript, isListening, connectionState, startListening, stopListening, clearTranscript, hardResetTranscript } = useVoiceToText();
  const { isSpeaking: isAISpeaking, speak: speakText, stop: stopSpeaking } = useTextToSpeech();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      hardResetTranscript();
      
      if (questions && currentQuestionIndex < questions.length - 1) {
        setIsTransitioning(true);
        setCurrentQuestionIndex(prev => prev + 1);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 800);
      } else if (isLastQuestion) {
        if (interview?.simulationMode === 'full') {
          setShowRoundSummary(true);
        } else {
          handleComplete();
        }
      }
    },
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: ENHANCED_AUDIO_CONSTRAINTS
        });
        streamRef.current = stream;
        setStreamVersion(prev => prev + 1);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        console.error("Camera error:", error);
        setCameraEnabled(false);
        setMicEnabled(false);
      }
    };

    if (interview?.status === 'in_progress' || interview?.status === 'completed') initCamera();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop()); };
  }, [cameraEnabled, interview?.status]);

  useEffect(() => {
    timerRef.current = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

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

  const handleSubmitAnswer = () => {
    if (!questions) return;
    const answerText = transcript.trim();
    if (!answerText) {
      toast({ title: "Silence Detected", description: "Please speak your answer clearly before submitting.", variant: "destructive" });
      return;
    }
    submitAnswerMutation.mutate({ questionId: questions[currentQuestionIndex].id, answer: answerText });
    clearTranscript();
  };

  const handleComplete = () => completeInterviewMutation.mutate();

  const currentQuestion = questions?.[currentQuestionIndex];
  const progress = questions ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const isLastQuestion = questions ? currentQuestionIndex === questions.length - 1 : false;

  useEffect(() => {
    if (currentQuestion?.question && !loadingQuestions && !hasSpokenCurrentQuestion && interview?.status === 'in_progress') {
      setHasSpokenCurrentQuestion(true);
      
      // Stop listening while AI speaks
      stopListening(); 
      
      speakText(currentQuestion.question)
        .then(() => {
          if (micEnabled) {
            startListening();
          }
        })
        .catch(err => {
          console.error("Speech error:", err);
          if (micEnabled) startListening();
        });
    }
  }, [currentQuestion?.question, loadingQuestions, hasSpokenCurrentQuestion, interview?.status, speakText, startListening, stopListening, micEnabled]);

  useEffect(() => { setHasSpokenCurrentQuestion(false); }, [currentQuestionIndex]);

  if (loadingInterview) return <div className="flex items-center justify-center h-[80vh]"><Zap className="w-12 h-12 text-primary animate-pulse" /></div>;

  if (interview?.status === 'pending') {
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
            <Button 
              size="lg" 
              className="rounded-2xl px-12 h-16 text-lg font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30" 
              onClick={() => {
                startInterviewMutation.mutate();
                if (micEnabled) {
                  setTimeout(() => startListening(), 2000);
                }
              }} 
              disabled={startInterviewMutation.isPending}
            >
              {startInterviewMutation.isPending ? "Initializing..." : "Begin Session"}
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
          </div>
          <BorderBeam size={400} duration={12} />
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
              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {Math.floor(timeElapsed / 60)}:{String(timeElapsed % 60).padStart(2, '0')}</span>
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

          <Card className="flex-1 rounded-[2rem] glass-card overflow-hidden flex flex-col relative group">
            <div className="p-8 pb-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3 text-emerald-500">
                <MessageSquare className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Audio Transcript</span>
              </div>
              {connectionState === "reconnecting" && <Badge variant="destructive" className="animate-pulse">Reconnecting...</Badge>}
            </div>
            
            <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto space-y-6 font-medium text-lg leading-relaxed text-foreground/80 scrollbar-hide">
              {transcript ? (
                <div className="relative">
                  {transcript}
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline-block w-2 h-5 ml-1 bg-primary align-middle" />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                    <Mic className="w-8 h-8" />
                  </div>
                  <p className="text-sm italic">Begin speaking to populate the transcript...</p>
                </div>
              )}
            </div>

            <div className="p-8 pt-4 bg-gradient-to-t from-card/90 to-transparent">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  Local AI Processing Active
                </div>
                <Button 
                  size="lg" 
                  className={cn(
                    "rounded-2xl h-14 px-10 font-black shadow-xl transition-all",
                    !transcript.trim() ? "bg-muted text-muted-foreground/50 cursor-not-allowed" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                  )}
                  onClick={handleSubmitAnswer}
                  disabled={submitAnswerMutation.isPending || isTransitioning || !transcript.trim()}
                >
                  {submitAnswerMutation.isPending ? "Validating..." : isLastQuestion ? "Finalize Interview" : "Proceed to Next"}
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
