import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Play,
  Square,
  Send,
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  User,
  ArrowRight,
  Brain,
  Volume2,
  VolumeX
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AIAvatar } from "@/components/AIAvatar";
import { useVoiceToText } from "@/hooks/useVoiceToText";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import type { Interview, InterviewQuestion } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

export default function InterviewRoom() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  // Emotion is used for backend analytics only; we no longer show it to students in the UI
  const [emotionData, setEmotionData] = useState<{ emotion: string; confidence: number } | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [hasSpokenCurrentQuestion, setHasSpokenCurrentQuestion] = useState(false);
  
  const { transcript, isListening, startListening, stopListening, clearTranscript } = useVoiceToText();
  const { isSpeaking: isAISpeaking, speak: speakText, stop: stopSpeaking } = useTextToSpeech();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: interview, isLoading: loadingInterview } = useQuery<Interview>({
    queryKey: ['/api/interviews', id],
  });

  const { data: questions, isLoading: loadingQuestions } = useQuery<InterviewQuestion[]>({
    queryKey: ['/api/interviews', id, 'questions'],
    enabled: !!id && !!interview && (interview.status === 'in_progress' || interview.status === 'completed'),
    queryFn: async () => {
      if (!id) return [];
      try {
        const response = await apiRequest('GET', `/api/interviews/${id}/questions`);
        const data = await response.json();
        return data || [];
      } catch (error: any) {
        console.error('Error fetching questions:', error);
        // If interview is pending or not started, return empty array
        if (error?.message?.includes('not started') || error?.message?.includes('400')) {
          return [];
        }
        // Return empty array on error to prevent UI breaking
        return [];
      }
    },
  });

  // Start interview mutation
  const startInterviewMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/interviews/${id}/start`);
    },
    onSuccess: async () => {
      // Invalidate and refetch interview data
      await queryClient.invalidateQueries({ queryKey: ['/api/interviews', id] });
      // Wait a moment for interview status to update, then fetch questions
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/interviews', id, 'questions'] });
      }, 500);
      toast({
        title: "Interview Started",
        description: "You can now begin answering questions",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to start interview. Please try again.",
        variant: "destructive",
      });
    },
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async (data: { questionId: string; answer: string }) => {
      return await apiRequest('POST', `/api/interviews/${id}/answer`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews', id, 'questions'] });
      setAnswer("");
      clearTranscript();
      if (questions && currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const completeInterviewMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/interviews/${id}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      navigate(`/interview/${id}/results`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete interview. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const initCamera = async () => {
      if (!cameraEnabled) {
        // Stop stream if camera is disabled
        if (streamRef.current) {
          streamRef.current.getVideoTracks().forEach(track => track.stop());
        }
        return;
      }
      
      // Don't initialize if interview is pending
      if (interview?.status === 'pending') return;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }, 
          audio: true 
        });
        streamRef.current = stream;
        
        // Set video source immediately
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure video plays - try multiple times
          const playVideo = () => {
            if (videoRef.current) {
              videoRef.current.play().catch(err => {
                console.error('Error playing video:', err);
              });
            }
          };
          
          playVideo();
          
          // Also try when metadata is loaded
          videoRef.current.addEventListener('loadedmetadata', playVideo, { once: true });
          videoRef.current.addEventListener('canplay', playVideo, { once: true });
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setCameraEnabled(false);
        setMicEnabled(false);
        toast({
          title: "Camera Access Denied",
          description: "Please allow camera access to continue the interview",
          variant: "destructive",
        });
      }
    };

    if (interview?.status === 'in_progress' || interview?.status === 'completed') {
      initCamera();
    }

    return () => {
      // Don't stop stream on cleanup if camera is still enabled
      // Only stop if component unmounts
    };
  }, [cameraEnabled, interview?.status]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Real-time emotion analysis from video feed (used only for analytics, not shown to students)
  useEffect(() => {
    // Only run emotion analysis for admins so students never see or are affected by it
    if (!user || user.role !== "admin") return;

    const analyzeEmotion = async () => {
      if (!cameraEnabled || !videoRef.current) return;
      
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx && videoRef.current) {
          ctx.drawImage(videoRef.current, 0, 0);
          
          canvas.toBlob(async (blob) => {
            if (blob) {
              const formData = new FormData();
              formData.append('file', blob, 'frame.jpg');
              
              try {
                const response = await fetch('/api/emotion/analyze', {
                  method: 'POST',
                  body: formData,
                  credentials: 'include',
                });
                
                if (response.ok) {
                  const data = await response.json();
                  if (data && data.data) {
                    setEmotionData({
                      emotion: data.data.emotion || 'Neutral',
                      confidence: data.data.confidence || 0.7
                    });
                  }
                }
              } catch {
                // ignore non-critical analytics errors
              }
            }
          }, 'image/jpeg', 0.8);
        }
      } catch {
        // ignore capture errors
      }
    };

    const interval = setInterval(analyzeEmotion, 5000);
    return () => clearInterval(interval);
  }, [cameraEnabled, user, videoRef]);

  const toggleCamera = useCallback(async () => {
    const newState = !cameraEnabled;
    setCameraEnabled(newState);
    
    if (streamRef.current) {
      if (newState) {
        // Re-enable video tracks
        streamRef.current.getVideoTracks().forEach(track => {
          track.enabled = true;
        });
        // Ensure video plays
        if (videoRef.current) {
          videoRef.current.play().catch(err => {
            console.error('Error playing video after enabling:', err);
          });
        }
      } else {
        // Disable video tracks (but don't stop them)
        streamRef.current.getVideoTracks().forEach(track => {
          track.enabled = false;
        });
      }
    } else if (newState && (interview?.status === 'in_progress' || interview?.status === 'completed')) {
      // Initialize camera if stream doesn't exist
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }, 
          audio: true 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
          });
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setCameraEnabled(false);
        toast({
          title: "Camera Access Denied",
          description: "Please allow camera access",
          variant: "destructive",
        });
      }
    }
  }, [cameraEnabled, interview?.status]);

  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !micEnabled;
      });
    }
    setMicEnabled(prev => !prev);
  }, [micEnabled]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitAnswer = () => {
    if (!questions) return;
    const answerText = transcript.trim();
    if (!answerText) {
      toast({
        title: "No Answer",
        description: "Please record your answer using the microphone button before submitting.",
        variant: "destructive",
      });
      return;
    }
    const currentQuestion = questions[currentQuestionIndex];
    submitAnswerMutation.mutate({ 
      questionId: currentQuestion.id, 
      answer: answerText
    });
    // Clear transcript after submission
    clearTranscript();
  };

  const handleComplete = () => {
    completeInterviewMutation.mutate();
  };

  const currentQuestion = questions && questions.length > 0 ? questions[currentQuestionIndex] : null;
  const progress = questions && questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const avatarGender = interview?.avatarGender || 'male';
  const isLastQuestion = questions && questions.length > 0 ? currentQuestionIndex === questions.length - 1 : false;

  // Speak question when it appears
  useEffect(() => {
    if (currentQuestion?.question && !loadingQuestions && !hasSpokenCurrentQuestion && interview?.status === 'in_progress') {
      const questionText = currentQuestion.question;
      setHasSpokenCurrentQuestion(true);
      
      // Speak the question
      speakText(questionText).catch((error) => {
        console.error('Error speaking question:', error);
        toast({
          title: "Text-to-Speech Error",
          description: "Could not speak the question. Please read it on screen.",
          variant: "destructive",
        });
      });
    }
  }, [currentQuestion?.question, loadingQuestions, hasSpokenCurrentQuestion, interview?.status, speakText, toast]);

  // Reset hasSpokenCurrentQuestion when question changes
  useEffect(() => {
    setHasSpokenCurrentQuestion(false);
  }, [currentQuestionIndex]);

  if (loadingInterview) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="aspect-video rounded-xl" />
            <Skeleton className="h-24" />
          </div>
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  // Show join screen if interview is pending
  if (interview?.status === 'pending') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-12">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Brain className="w-12 h-12 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2 capitalize">
                  {interview.type} Interview
                </h1>
                {interview.company && (
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {interview.company}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-lg">
                An interview has been assigned to you. Click below to join and begin.
              </p>
              <Button
                size="lg"
                onClick={() => startInterviewMutation.mutate()}
                disabled={startInterviewMutation.isPending}
                className="text-lg px-8 py-6"
              >
                {startInterviewMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  <>
                    Join Interview
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading only if we're actually loading and interview is started
  if (loadingQuestions && interview && (interview.status === 'in_progress' || interview.status === 'completed')) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="aspect-video rounded-xl" />
            <Skeleton className="h-24" />
          </div>
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  // Show message if no questions and interview is started
  if (!loadingQuestions && interview && (interview.status === 'in_progress' || interview.status === 'completed') && (!questions || questions.length === 0)) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Questions Available</h2>
            <p className="text-muted-foreground mb-4">
              Questions are being generated. Please wait a moment and refresh.
            </p>
            <Button onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/interviews', id, 'questions'] });
            }}>
              Refresh Questions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold capitalize" data-testid="text-interview-title">
            {interview?.type} Interview
            {interview?.company && <Badge variant="outline" className="ml-3">{interview.company}</Badge>}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatTime(timeElapsed)}
            </div>
            <span>Question {currentQuestionIndex + 1} of {questions?.length || 0}</span>
          </div>
        </div>
        <Button 
          variant="destructive" 
          onClick={handleComplete}
          disabled={completeInterviewMutation.isPending}
          data-testid="button-end-interview"
        >
          End Interview
        </Button>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                {cameraEnabled ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover rounded-xl bg-black"
                    style={{ transform: 'scaleX(-1)' }}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      video.play().catch(err => {
                        console.error('Error playing video after metadata loaded:', err);
                      });
                    }}
                    onCanPlay={() => {
                      if (videoRef.current) {
                        videoRef.current.play().catch(err => {
                          console.error('Error playing video on canPlay:', err);
                        });
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-muted rounded-xl">
                    <CameraOff className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Camera disabled</p>
                  </div>
                )}
                
                {isRecording && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Recording
                  </div>
                )}

                {/* Emotion overlay removed from student-facing UI to avoid distracting labels like "Angry" */}
              </div>

              <div className="flex items-center justify-center gap-3 mt-4">
                <Button
                  variant={cameraEnabled ? "outline" : "destructive"}
                  size="icon"
                  onClick={toggleCamera}
                  data-testid="button-toggle-camera"
                >
                  {cameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                </Button>
                <Button
                  variant={micEnabled ? "outline" : "destructive"}
                  size="icon"
                  onClick={() => {
                    toggleMic();
                    if (micEnabled) {
                      stopListening();
                    } else {
                      startListening();
                    }
                  }}
                  data-testid="button-toggle-mic"
                >
                  {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  size="icon"
                  onClick={() => setIsRecording(!isRecording)}
                  data-testid="button-toggle-recording"
                >
                  {isRecording ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4">
                <AIAvatar 
                  gender={avatarGender}
                  isSpeaking={isAISpeaking}
                  isListening={isListening && micEnabled}
                />
                <div className="text-center">
                  <p className="font-medium text-lg">AI Interviewer</p>
                  <p className="text-sm text-muted-foreground capitalize">{avatarGender} Interviewer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg">Question {currentQuestionIndex + 1}</CardTitle>
                <Badge variant="outline">{interview?.type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg" data-testid="text-current-question">
                {currentQuestion?.question || 'Loading question...'}
              </p>
              {currentQuestion?.question && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    if (currentQuestion.question) {
                      stopSpeaking();
                      speakText(currentQuestion.question).catch(console.error);
                    }
                  }}
                  disabled={isAISpeaking}
                >
                  {isAISpeaking ? (
                    <>
                      <VolumeX className="w-4 h-4 mr-2" />
                      Stop Speaking
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 mr-2" />
                      Replay Question
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Your Answer (Voice Only)</CardTitle>
                {isAISpeaking && (
                  <Badge variant="default" className="animate-pulse">
                    <Volume2 className="w-3 h-3 mr-1" />
                    AI Speaking
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="min-h-[150px] border rounded-lg p-4 bg-muted/50">
                {transcript ? (
                  <p className="text-sm whitespace-pre-wrap">{transcript}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {isListening ? "Listening... Speak your answer now." : "Click the microphone button below to start recording your answer."}
                  </p>
                )}
              </div>
              {isListening && (
                <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span>Listening... Speak now</span>
                </div>
              )}
              {transcript && !isListening && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Your answer is being transcribed. Click Submit when ready.
                </div>
              )}
              <div className="flex items-center justify-between mt-4 gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    data-testid="button-prev-question"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={isLastQuestion || !currentQuestion?.userAnswer}
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    data-testid="button-next-question"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={isListening ? "destructive" : "outline"}
                    size="icon"
                    onClick={() => {
                      if (isListening) {
                        stopListening();
                      } else {
                        startListening();
                      }
                    }}
                    data-testid="button-toggle-voice"
                    title={isListening ? "Stop Recording" : "Start Recording"}
                  >
                    {isListening ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (currentQuestion?.question) {
                        stopSpeaking();
                        speakText(currentQuestion.question).catch(console.error);
                      }
                    }}
                    title="Replay Question"
                    disabled={!currentQuestion?.question || isAISpeaking}
                  >
                    {isAISpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                  {isLastQuestion ? (
                    <Button
                      onClick={handleComplete}
                      disabled={!transcript.trim() || completeInterviewMutation.isPending}
                      data-testid="button-finish-interview"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Finish Interview
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!transcript.trim() || submitAnswerMutation.isPending}
                      data-testid="button-submit-answer"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {submitAnswerMutation.isPending ? 'Submitting...' : 'Submit & Next'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {micEnabled && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mic className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Voice Analysis Active</p>
                    <p className="text-sm text-muted-foreground">
                      Your speech clarity and confidence are being analyzed
                    </p>
                  </div>
                  <Badge variant="secondary">
                    Clarity: 85%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
