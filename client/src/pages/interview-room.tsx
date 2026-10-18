import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { WaitingRoom } from "@/components/WaitingRoom";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  FileText,
  AlertTriangle,
  Send,
  Eye,
  CheckCircle2,
  Info
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NeonPulse } from "@/components/NeonPulse";
import { useVoiceToText } from "@/hooks/useVoiceToText";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { BorderBeam } from "@/components/ui/border-beam";
import { InterviewBot } from "@/components/interview-bot";
import { motion, AnimatePresence } from "framer-motion";
import type { Interview, InterviewQuestion } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const ENHANCED_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

interface DialogueTurn {
  role: 'interviewer' | 'candidate';
  text: string;
  topic?: string;
  decision?: string;
  score?: number;
  timestamp: string;
}

export default function InterviewRoom() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [slotAllowed, setSlotAllowed] = useState(false);
  const [micTested, setMicTested] = useState(false);
  const [isAnalyzingReport, setIsAnalyzingReport] = useState(false);
  const [reportStepIndex, setReportStepIndex] = useState(0);

  // Two-way Agentic State
  type BloomDecision = "PROBE" | "HINT" | "ADVANCE" | "CONCLUSION";
  const [agentState, setAgentState] = useState<'idle' | 'speaking' | 'listening' | 'thinking'>('idle');
  const [currentTopic, setCurrentTopic] = useState<string>("Core Technical Architecture");
  const [bloomDecision, setBloomDecision] = useState<BloomDecision>("ADVANCE");
  const [currentQuestionText, setCurrentQuestionText] = useState<string>("");
  const [integrityScore, setIntegrityScore] = useState<number>(100);
  const [activeWarning, setActiveWarning] = useState<{ message: string; severity: string } | null>(null);
  const [dialogueHistory, setDialogueHistory] = useState<DialogueTurn[]>([]);
  const [turnCount, setTurnCount] = useState<number>(0);

  const reportSteps = [
    "Processing Real-Time Audio Transcripts & Socratic Dialogue...",
    "Evaluating Bloom's Taxonomy Cognitive Mastery & Architecture Answers...",
    "Correlating Code Reasoning, Verbatim Quotes & Technical Integrity...",
    "Calculating Domain Mastery Graphs & Candidate Performance Index...",
    "Generating Comprehensive Autonomous Assessment & Feedback Report..."
  ];

  // Slot check for gate
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

  const {
    transcript,
    isListening,
    connectionState,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    clearTranscript,
    error: speechError,
    micTestResult,
    testMicrophone,
    getRecordedAudio,
    setExternalStream
  } = useVoiceToText();

  const { isSpeaking: isAISpeaking, speak: speakText, stop: stopSpeaking, primeAudio } = useTextToSpeech();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const turnPendingRef = useRef<boolean>(false);
  const maxDurationReachedRef = useRef(false);

  const { data: interview, isLoading: loadingInterview } = useQuery<Interview>({
    queryKey: ['/api/interviews', id],
  });

  const { data: initialQuestions, isLoading: loadingQuestions } = useQuery<InterviewQuestion[]>({
    queryKey: ['/api/interviews', id, 'questions'],
    enabled: !!id && (!interview || interview.status !== 'pending'),
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/interviews/${id}/questions`);
      return await response.json();
    },
  });

  // Active Question resolution (prioritizing live AI spoken question, falling back to initialQuestions[turnCount], then interview.questions)
  const activeQuestion = useMemo(() => {
    if (currentQuestionText && currentQuestionText.trim().length > 0) {
      return currentQuestionText.trim();
    }
    if (initialQuestions && initialQuestions.length > 0) {
      const qIndex = Math.min(turnCount, initialQuestions.length - 1);
      return initialQuestions[qIndex]?.question || initialQuestions[0]?.question || "";
    }
    if (interview?.questions && Array.isArray(interview.questions) && interview.questions.length > 0) {
      const qIndex = Math.min(turnCount, interview.questions.length - 1);
      const q = interview.questions[qIndex];
      return typeof q === 'string' ? q : (q?.question || q?.text || "");
    }
    return "";
  }, [currentQuestionText, initialQuestions, interview?.questions, turnCount]);

  const totalQuestions = useMemo(() => {
    if (initialQuestions && initialQuestions.length > 0) return initialQuestions.length;
    if (interview?.questions && Array.isArray(interview.questions) && interview.questions.length > 0) return interview.questions.length;
    return 15;
  }, [initialQuestions, interview?.questions]);

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

  const completeInterviewMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/interviews/${id}/complete`, {});
    },
    onSuccess: () => {
      navigate(`/interview/${id}/results`);
    },
  });

  // Proctor Alert Helper
  const showProctorAlert = useCallback((message: string, severity: string) => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    setActiveWarning({ message, severity });
    warningTimerRef.current = setTimeout(() => {
      setActiveWarning(null);
    }, 4500);
  }, []);

  // Finalize Report Screen Transition
  const handleComplete = useCallback(async () => {
    setIsAnalyzingReport(true);
    setReportStepIndex(0);

    stopListening();
    stopSpeaking();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const interval = setInterval(() => {
      setReportStepIndex(prev => {
        if (prev < reportSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 1400);

    try {
      await completeInterviewMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ['/api/interviews', id] });
      await queryClient.invalidateQueries({ queryKey: ['/api/interviews', id, 'questions'] });

      await new Promise(r => setTimeout(r, 2800));
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
  }, [completeInterviewMutation, id, navigate, reportSteps.length, stopListening, stopSpeaking, toast]);

  // Handle incoming AI response
  const handleAIResponse = useCallback(async (data: {
    spokenQuestion: string;
    decision?: string;
    nextTopic?: string;
    isComplete?: boolean;
    score?: number;
  }) => {
    turnPendingRef.current = false;
    setAgentState('speaking');
    setCurrentQuestionText(data.spokenQuestion);
    if (data.decision) {
      const valid: BloomDecision = ["PROBE", "HINT", "ADVANCE", "CONCLUSION"].includes(data.decision as any)
        ? (data.decision as BloomDecision)
        : "ADVANCE";
      setBloomDecision(valid);
    }
    if (data.nextTopic) setCurrentTopic(data.nextTopic);
    setTurnCount(prev => prev + 1);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setDialogueHistory(prev => [
      ...prev,
      {
        role: 'interviewer',
        text: data.spokenQuestion,
        topic: data.nextTopic || currentTopic,
        decision: data.decision || 'ADVANCE',
        timestamp: now,
      }
    ]);

    try {
      await speakText(data.spokenQuestion);
    } catch (err) {
      console.error("[TTS Spoken Question Error]:", err);
    } finally {
      clearTranscript();
      if (data.isComplete) {
        handleComplete();
      } else {
        setTimeout(() => {
          clearTranscript();
          resumeListening();
          setAgentState('listening');
        }, 350);
      }
    }
  }, [currentTopic, speakText, clearTranscript, handleComplete, resumeListening]);

  // Autonomous Turn Execution (Hands-free VAD or Manual Trigger)
  const triggerAgentTurn = useCallback(async (spokenAnswer: string) => {
    if (turnPendingRef.current || !spokenAnswer.trim()) return;
    turnPendingRef.current = true;
    setAgentState('thinking');
    pauseListening();

    const candidateAnswer = spokenAnswer.trim();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setDialogueHistory(prev => [
      ...prev,
      {
        role: 'candidate',
        text: candidateAnswer,
        timestamp: now,
      }
    ]);

    // Send over WebSocket if available
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "CANDIDATE_UTTERANCE",
        transcript: candidateAnswer,
        timeElapsedSeconds: timeElapsed,
        totalDurationSeconds: 1200,
      }));
    } else {
      // Graceful REST Fallback
      try {
        const res = await apiRequest('POST', '/api/agent/interview-turn', {
          interview_id: id,
          candidate_answer: candidateAnswer,
          current_topic: currentTopic,
          interview_type: interview?.type || "technical",
          time_elapsed_seconds: timeElapsed,
          total_duration_seconds: 1200,
        });
        const turnData = await res.json();
        handleAIResponse({
          spokenQuestion: turnData.spoken_question,
          decision: turnData.decision,
          nextTopic: turnData.next_topic,
          isComplete: turnData.is_complete,
          score: turnData.score,
        });
      } catch (err) {
        console.error("[Agent Turn Fallback Error]:", err);
        setAgentState('listening');
        turnPendingRef.current = false;
        resumeListening();
      }
    }
  }, [currentTopic, handleAIResponse, id, interview?.type, pauseListening, resumeListening, timeElapsed]);

  // Hands-free Voice Activity Detection (VAD) Silence Timer (850ms pause auto-turn)
  useEffect(() => {
    if (agentState !== 'listening' || isAISpeaking || isAnalyzingReport) return;

    const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 3 && !turnPendingRef.current) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        triggerAgentTurn(transcript.trim());
      }, 900);
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [transcript, agentState, isAISpeaking, isAnalyzingReport, triggerAgentTurn]);

  // WebSocket Connection Lifecycle
  useEffect(() => {
    if (interview?.status !== 'in_progress') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem("token") || "";
    const wsUrl = `${protocol}//${window.location.host}/ws/interview?interviewId=${id}&token=${token}`;

    console.log(`[WebSocket] Connecting to interview gateway: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WebSocket] ✅ Connected to Interview Agentic Gateway");
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        switch (payload.type) {
          case "SESSION_READY": {
            if (payload.integrityScore !== undefined) setIntegrityScore(payload.integrityScore);
            if (payload.currentTopic) setCurrentTopic(payload.currentTopic);
            break;
          }

          case "AI_THINKING": {
            setAgentState('thinking');
            break;
          }

          case "AI_RESPONSE": {
            handleAIResponse(payload);
            break;
          }

          case "PROCTOR_WARNING": {
            const deduction = payload.severity === "high" ? 15 : payload.severity === "medium" ? 5 : 2;
            setIntegrityScore(prev => Math.max(0, prev - deduction));
            showProctorAlert(payload.message, payload.severity);
            break;
          }

          case "PONG":
            break;

          default:
            console.log(`[WebSocket] Received packet: ${payload.type}`);
        }
      } catch (err) {
        console.error("[WebSocket Message Parse Error]:", err);
      }
    };

    ws.onerror = (err) => {
      console.warn("[WebSocket] Error occurred, REST fallback ready:", err);
    };

    ws.onclose = () => {
      console.log("[WebSocket] Connection closed");
    };

    // Heartbeat ping every 15 seconds
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "HEARTBEAT" }));
      }
    }, 15000);

    return () => {
      clearInterval(heartbeat);
      ws.close();
      wsRef.current = null;
    };
  }, [handleAIResponse, id, interview?.status, showProctorAlert]);

  // Initial Question Trigger & Question Text Synchronization
  const initialTriggerRef = useRef(false);
  useEffect(() => {
    if (!initialQuestions || initialQuestions.length === 0) return;

    const firstQ = initialQuestions[0]?.question || "";
    if (!firstQ) return;

    // Always ensure currentQuestionText is initialized so candidate sees the question immediately
    if (!currentQuestionText) {
      setCurrentQuestionText(firstQ);
      setDialogueHistory(prev => {
        if (prev.length === 0) {
          const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return [{
            role: 'interviewer',
            text: firstQ,
            topic: currentTopic || "Core Technical Concepts",
            decision: "PROBE",
            timestamp: now,
          }];
        }
        return prev;
      });
    }

    // Only auto-speak TTS if interview is actively in_progress and not yet triggered
    if (interview?.status === 'in_progress' && !initialTriggerRef.current) {
      initialTriggerRef.current = true;
      setAgentState('speaking');

      speakText(firstQ).then(() => {
        clearTranscript();
        resumeListening();
        setAgentState('listening');
      }).catch(() => {
        clearTranscript();
        resumeListening();
        setAgentState('listening');
      });
    }
  }, [clearTranscript, currentQuestionText, currentTopic, initialQuestions, interview?.status, resumeListening, speakText]);

  // Fallback sync: if activeQuestion exists and currentQuestionText is empty, sync it
  useEffect(() => {
    if (!currentQuestionText && activeQuestion) {
      setCurrentQuestionText(activeQuestion);
    }
  }, [activeQuestion, currentQuestionText]);

  // Live Proctoring Tab Switch Detection
  useEffect(() => {
    if (interview?.status !== 'in_progress') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "PROCTOR_INCIDENT",
            eventType: "TAB_SWITCH",
            timestampSeconds: timeElapsed,
            severity: "medium",
            metadata: { reason: "window_hidden" }
          }));
        }
        showProctorAlert("⚠️ Tab switch detected! Please remain focused on the interview window.", "medium");
      }
    };

    const handleBlur = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "PROCTOR_INCIDENT",
          eventType: "TAB_SWITCH",
          timestampSeconds: timeElapsed,
          severity: "low",
          metadata: { reason: "window_blur" }
        }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [interview?.status, showProctorAlert, timeElapsed]);

  // Live Camera Edge Centering Check (Every 4 seconds)
  useEffect(() => {
    if (interview?.status !== 'in_progress' || !cameraEnabled) return;

    const proctorInterval = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        if (video.videoWidth > 0) {
          const canvas = canvasRef.current;
          canvas.width = 160;
          canvas.height = 120;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, 160, 120);
            const frame = ctx.getImageData(0, 0, 160, 120);
            let totalBrightness = 0;
            for (let i = 0; i < frame.data.length; i += 16) {
              totalBrightness += (frame.data[i] + frame.data[i + 1] + frame.data[i + 2]) / 3;
            }
            const avgBrightness = totalBrightness / (frame.data.length / 16);

            // Brightness < 5 indicates camera is covered, blocked, or pitch black
            if (avgBrightness < 5) {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: "PROCTOR_INCIDENT",
                  eventType: "CAMERA_OCCLUDED",
                  timestampSeconds: timeElapsed,
                  durationSeconds: 4,
                  severity: "medium",
                }));
              }
              showProctorAlert("⚠️ Camera blocked or too dark. Please ensure your face is well-lit.", "medium");
            }
          }
        }
      }
    }, 4000);

    return () => clearInterval(proctorInterval);
  }, [cameraEnabled, interview?.status, showProctorAlert, timeElapsed]);

  // Session Duration Timer (20 min cap)
  useEffect(() => {
    if (interview?.status !== 'in_progress') return;

    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => {
        const nextTime = prev + 1;
        if (nextTime >= 1200 && !maxDurationReachedRef.current) {
          maxDurationReachedRef.current = true;
          toast({
            title: "Maximum Session Duration Reached (20 min)",
            description: "Session completed. Autonomous evaluation finalizing...",
          });
          handleComplete();
        }
        return nextTime;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [handleComplete, interview?.status, toast]);

  // Auto-scroll conversation stream
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [dialogueHistory, transcript]);

  // Camera & Mic stream initialization
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
        if (videoRef.current) videoRef.current.srcObject = stream;
        setExternalStream(stream);
      } catch (error) {
        console.warn("Camera+audio stream fallback:", error);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: true
          });
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setExternalStream(stream);
        } catch (stdError) {
          setCameraEnabled(false);
        }
      }
    };

    if (interview?.status === 'in_progress' || interview?.status === 'completed') initCamera();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop()); };
  }, [cameraEnabled, interview?.status, setExternalStream]);

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

  // ==========================================
  // RENDER: Loading or Waiting Gate
  // ==========================================
  if (loadingInterview) return <div className="flex items-center justify-center h-[80vh]"><Zap className="w-12 h-12 text-primary animate-pulse" /></div>;

  if (interview?.status === 'pending') {
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
              <Badge className="bg-primary/10 text-primary border-primary/20 mb-4 px-4 py-1 font-black uppercase tracking-widest">Two-Way Conversational Session</Badge>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 capitalize">{interview.type} Interview</h1>
              <p className="text-xl text-muted-foreground max-w-lg mx-auto">
                Skillnox Agentic AI conducts continuous, natural technical dialogue using Groq LPU inference. No manual buttons required.
              </p>
            </div>

            {/* Mic Check Panel */}
            <div className="bg-card/50 border border-border rounded-2xl p-6 max-w-md mx-auto space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                <Mic className="w-4 h-4" />
                Acoustic Microphone Verification
              </div>
              <p className="text-sm text-muted-foreground">
                Speak for 3 seconds into your microphone or earphones to confirm voice clarity.
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
                  {micTestResult === 'untested' && <><Mic className="w-4 h-4 mr-2" /> Verify Voice Clarity</>}
                  {micTestResult === 'testing' && <><Activity className="w-4 h-4 mr-2 animate-pulse" /> Listening... Speak Now</>}
                  {micTestResult === 'pass' && <><ShieldCheck className="w-4 h-4 mr-2" /> Acoustic Channel Verified ✓</>}
                  {micTestResult === 'fail' && <><MicOff className="w-4 h-4 mr-2" /> Test Failed — Retry</>}
                </Button>
              </div>
              {micTestResult === 'fail' && (
                <div className="text-center pt-1">
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs text-primary underline"
                    onClick={() => setMicTested(true)}
                  >
                    Bypass & Continue with Web Speech Recognition →
                  </Button>
                </div>
              )}
              {speechError && (
                <p className="text-xs text-destructive font-medium">⚠️ {speechError}</p>
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
              {startInterviewMutation.isPending ? "Connecting to Agent..." : !micTested ? "Verify Microphone First" : "Begin Live Conversational Session"}
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
          </div>
          <BorderBeam size={400} duration={12} />
        </Card>
      </div>
    );
  }

  // ==========================================
  // RENDER: Finalizing Report Screen
  // ==========================================
  if (isAnalyzingReport) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5 opacity-80" />

        <Card className="max-w-xl w-full rounded-[2.5rem] glass-card p-10 text-center space-y-8 relative z-10 border-primary/20 shadow-2xl overflow-hidden">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin [animation-duration:1.5s]" />
            <FileText className="w-9 h-9 text-primary animate-pulse" />
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              Agentic Assessment Engine Active
            </div>

            <h2 className="text-2xl font-bold tracking-tight">Synthesizing Socratic Performance</h2>

            <p className="text-xs font-semibold text-muted-foreground min-h-[2rem] transition-all duration-300 px-4">
              {reportSteps[reportStepIndex]}
            </p>

            <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden p-0.5 border border-border shadow-inner max-w-md mx-auto">
              <div
                className="bg-primary h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, ((reportStepIndex + 1) / reportSteps.length) * 100)}%` }}
              />
            </div>

            <p className="text-[11px] text-muted-foreground font-medium pt-1">
              Extracting Bloom's taxonomy rubric scores and verbatim transcript evidence...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // ==========================================
  // RENDER: Two-Way Conversational Room
  // ==========================================
  const candidateSpokenWords = transcript.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-[1600px] mx-auto space-y-3.5 h-full flex flex-col pb-2">
      {/* Top Header HUD */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-3 px-3 py-1.5 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
            <BrainCircuit className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-black tracking-tight capitalize">
                {interview?.company ? `${interview.company} Technical Placement` : `${interview?.type} Interview`}
              </h1>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10 font-bold text-[10px] tracking-widest uppercase">
                Groq 2-Way Live
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[11px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1 text-amber-500 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {Math.floor(timeElapsed / 60)}:{String(timeElapsed % 60).padStart(2, '0')} / 20:00
              </span>
              <span className="w-1 h-1 bg-border rounded-full" />
              <span>Turn #{turnCount + 1}</span>
            </div>
          </div>
        </div>

        {/* Live Proctoring Status Badge & Floating Alerts */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all",
            integrityScore >= 90 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" :
            integrityScore >= 70 ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
            "bg-destructive/10 border-destructive/30 text-destructive"
          )}>
            <ShieldCheck className="w-4 h-4" />
            <span>Proctor Integrity: {integrityScore}%</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl border border-destructive/20 text-destructive font-bold uppercase text-[10px] tracking-wider hover:bg-destructive/10 h-8 px-3"
            onClick={handleComplete}
          >
            Conclude Session
          </Button>
        </div>
      </header>

      {/* 50/50 Socratic Interview Stage (Left: AI MasterMind Bot | Right: Candidate Webcam & Proctoring) */}
      <div className="grid lg:grid-cols-12 gap-4 flex-1 px-2 md:px-4 items-stretch">
        {/* Left Column (6/12): AI Interviewer Bot ("Skillnox MasterMind") */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <Card className="rounded-[2rem] border border-indigo-500/30 bg-card/90 backdrop-blur-xl p-4 md:p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden flex-1 min-h-[480px]">
            {/* Top Info Bar inside Bot Card */}
            <div className="flex items-center justify-between gap-3 relative z-10 border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider px-3 py-0.5">
                  Question #{turnCount + 1} / {totalQuestions}
                </Badge>
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="truncate max-w-[200px]">{currentTopic}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-500/15 text-cyan-400 border-indigo-500/30 text-[10px] font-mono font-bold uppercase tracking-wider py-0.5">
                  {bloomDecision === 'PROBE' ? '🔬 Probing Depth' :
                   bloomDecision === 'HINT' ? '💡 Socratic Hint' :
                   bloomDecision === 'ADVANCE' ? '🚀 Topic Mastery' : '🏁 Wrap-up'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground hover:bg-accent"
                  onClick={() => { stopSpeaking(); speakText(activeQuestion || currentQuestionText); }}
                  title="Replay spoken question"
                >
                  {isAISpeaking ? <VolumeX className="w-3.5 h-3.5 mr-1 text-cyan-400 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5 mr-1" />}
                  {isAISpeaking ? "Mute" : "Replay"}
                </Button>
              </div>
            </div>

            {/* Socratic Question Prompt Card (Placed prominently at the top so question is instantly visible) */}
            <div className="relative z-10 pt-2.5 pb-1">
              <div className="rounded-2xl bg-slate-950/85 border border-indigo-500/30 p-3.5 md:p-4 shadow-inner backdrop-blur-md relative overflow-hidden group">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-cyan-400">
                      Socratic Question Prompt
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ({turnCount + 1} / {totalQuestions})
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 rounded-lg text-[10px] font-mono font-bold text-muted-foreground hover:text-cyan-400 hover:bg-indigo-500/10 transition-colors"
                    onClick={() => {
                      stopSpeaking();
                      speakText(activeQuestion || currentQuestionText);
                    }}
                    title="Replay spoken question"
                  >
                    {isAISpeaking ? (
                      <>
                        <VolumeX className="w-3 h-3 mr-1 text-cyan-400 animate-pulse" />
                        <span className="text-cyan-400">Speaking...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3 mr-1" />
                        <span>Replay Audio</span>
                      </>
                    )}
                  </Button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.p
                    key={activeQuestion}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="font-sans text-sm md:text-base font-semibold leading-relaxed text-slate-100 text-left selection:bg-indigo-500 selection:text-white"
                  >
                    {activeQuestion || "Preparing next technical evaluation question..."}
                  </motion.p>
                </AnimatePresence>

                {/* Subtle bottom state indicator */}
                <div className="mt-2.5 pt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border/20">
                  <span className="flex items-center gap-1.5">
                    {agentState === 'speaking' ? (
                      <span className="text-cyan-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        Interviewer Speaking
                      </span>
                    ) : agentState === 'listening' ? (
                      <span className="text-emerald-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Listening for your response...
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-spin" />
                        Analyzing technical response...
                      </span>
                    )}
                  </span>
                  <span className="text-slate-500">Autonomous Socratic Evaluation</span>
                </div>
              </div>
            </div>

            {/* Center / Bottom: The Animated Interactive Robot Bot */}
            <div className="my-auto py-1 flex flex-col items-center justify-center relative z-10 scale-[0.74] lg:scale-[0.80] origin-center -my-6">
              <InterviewBot
                state={agentState}
                candidateTranscript={transcript}
                currentTopic={currentTopic}
                bloomDecision={bloomDecision}
              />
            </div>

            <BorderBeam size={350} duration={14} colorFrom="#6366F1" colorTo="#06B6D4" />
          </Card>
        </div>

        {/* Right Column (6/12): Candidate Webcam & Live Proctoring HUD */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <Card className={cn(
            "rounded-[2rem] bg-slate-950 overflow-hidden relative group shadow-2xl flex flex-col justify-between transition-all duration-500",
            activeWarning
              ? "border-2 border-amber-500 shadow-[0_0_35px_rgba(245,158,11,0.35)]"
              : cameraEnabled
              ? "border-2 border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
              : "border border-border/80",
            "min-h-[250px] lg:min-h-[275px] h-[250px] lg:h-[275px]"
          )}>
            <div className="absolute inset-0 z-0 bg-slate-950">
              <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden="true" />
              {cameraEnabled ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1] transition-transform duration-700 opacity-90 group-hover:opacity-100"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md">
                  <CameraOff className="w-10 h-10 text-slate-700 animate-pulse" />
                  <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mt-3">Camera Standby</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/60 pointer-events-none" />
            </div>

            {/* Top Status inside Webcam (Gaze Tracking & Audio Equalizer) */}
            <div className="relative z-10 p-4 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>GAZE TRACKING: ACTIVE</span>
                <span className="text-slate-500">|</span>
                <span>FOV: 84°</span>
              </div>

              {/* Mic Volume Level Waveform Icon */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800">
                <Mic className={cn("w-3.5 h-3.5", micEnabled ? "text-cyan-400" : "text-destructive")} />
                <div className="flex items-center gap-0.5 ml-1">
                  {[1, 2, 3, 4, 3, 2].map((h, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-0.5 rounded-full bg-slate-700 transition-all",
                        agentState === 'listening' && candidateSpokenWords > 0 && "bg-cyan-400 animate-bounce"
                      )}
                      style={{ height: `${h * 2.5}px`, animationDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Live Proctoring Subtitle Warning Pill (Exactly like BerriBot's bottom black subtitle) */}
            <div className="relative z-10 p-3 flex flex-col items-center justify-center pointer-events-none">
              <div className={cn(
                "px-3.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-2 backdrop-blur-md border shadow-xl transition-all duration-300",
                activeWarning
                  ? "bg-amber-950/90 border-amber-500 text-amber-300 animate-bounce"
                  : "bg-slate-950/80 border-slate-800 text-slate-300"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  activeWarning ? "bg-amber-400 animate-ping" : "bg-emerald-400"
                )} />
                <span>
                  {activeWarning
                    ? activeWarning.message
                    : "Please maintain eye contact • Proctor active"}
                </span>
              </div>
            </div>

            {/* Camera / Mic Controls inside Webcam */}
            <div className="relative z-20 pb-3 flex items-center justify-center gap-2.5">
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "w-8 h-8 rounded-xl transition-all duration-300",
                  cameraEnabled ? "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10" : "bg-destructive/30 text-destructive border border-destructive/40"
                )}
                onClick={toggleCamera}
                title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {cameraEnabled ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "w-8 h-8 rounded-xl transition-all duration-300",
                  micEnabled ? "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10" : "bg-destructive/30 text-destructive border border-destructive/40"
                )}
                onClick={toggleMic}
                title={micEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                {micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </Card>

          {/* Real-time Candidate Speech & Transcription Box */}
          <Card className="rounded-[1.75rem] border border-border/80 bg-card/90 backdrop-blur-xl p-3.5 md:p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
              <div className="flex items-center gap-2 text-cyan-400">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Live Spoken Response</span>
              </div>
              {candidateSpokenWords > 0 && (
                <span className="text-[11px] text-cyan-400 font-mono font-bold">
                  {candidateSpokenWords} words captured
                </span>
              )}
            </div>

            <div className="min-h-[3.25rem] max-h-[5.5rem] overflow-y-auto p-2.5 rounded-xl bg-background/60 border border-border/60 text-xs md:text-sm font-medium leading-relaxed">
              {transcript.trim() ? (
                <p className="text-foreground">{transcript}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic font-mono">
                  {agentState === 'listening'
                    ? "🎙️ Speak clearly into your mic. When you stop speaking for 0.9s, your response will be submitted automatically."
                    : agentState === 'thinking'
                    ? "⏳ Groq LPU evaluating Bloom's depth & technical accuracy..."
                    : "Interviewer is speaking..."}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 pt-0.5">
              <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hands-free VAD Active (0.9s auto-turn)</span>
              </div>

              <Button
                size="sm"
                className="rounded-xl h-8 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95"
                onClick={() => {
                  if (transcript.trim()) {
                    triggerAgentTurn(transcript.trim());
                  }
                }}
                disabled={agentState !== 'listening' || candidateSpokenWords < 2 || turnPendingRef.current}
              >
                <span>Done Speaking</span>
                <Send className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

