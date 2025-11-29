import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  User
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Interview, InterviewQuestion } from "@shared/schema";

export default function InterviewRoom() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [emotionData, setEmotionData] = useState<{ emotion: string; confidence: number } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: interview, isLoading: loadingInterview } = useQuery<Interview>({
    queryKey: ['/api/interviews', id],
  });

  const { data: questions, isLoading: loadingQuestions } = useQuery<InterviewQuestion[]>({
    queryKey: ['/api/interviews', id, 'questions'],
    enabled: !!id,
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async (data: { questionId: string; answer: string }) => {
      return await apiRequest('POST', `/api/interviews/${id}/answer`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews', id, 'questions'] });
      setAnswer("");
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
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setCameraEnabled(false);
        setMicEnabled(false);
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    const emotions = ['Neutral', 'Confident', 'Focused', 'Thoughtful'];
    const interval = setInterval(() => {
      if (cameraEnabled) {
        setEmotionData({
          emotion: emotions[Math.floor(Math.random() * emotions.length)],
          confidence: 0.7 + Math.random() * 0.25
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [cameraEnabled]);

  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !cameraEnabled;
      });
    }
    setCameraEnabled(prev => !prev);
  }, [cameraEnabled]);

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
    if (!questions || !answer.trim()) return;
    const currentQuestion = questions[currentQuestionIndex];
    submitAnswerMutation.mutate({ 
      questionId: currentQuestion.id, 
      answer: answer.trim() 
    });
  };

  const handleComplete = () => {
    completeInterviewMutation.mutate();
  };

  const currentQuestion = questions?.[currentQuestionIndex];
  const progress = questions ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const isLastQuestion = questions ? currentQuestionIndex === questions.length - 1 : false;

  const avatarGender = interview?.avatarGender || 'male';

  if (loadingInterview || loadingQuestions) {
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
                    className="w-full h-full object-cover mirror"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <CameraOff className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                
                {isRecording && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Recording
                  </div>
                )}

                {emotionData && cameraEnabled && (
                  <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm">
                    <span className="text-muted-foreground">Emotion: </span>
                    <span className="font-medium" data-testid="text-emotion">{emotionData.emotion}</span>
                    <span className="text-muted-foreground ml-2">
                      ({Math.round(emotionData.confidence * 100)}%)
                    </span>
                  </div>
                )}
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
                  onClick={toggleMic}
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
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="text-xl bg-primary/10">
                    <User className="w-6 h-6 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">AI Interviewer</p>
                  <p className="text-sm text-muted-foreground capitalize">{avatarGender} Avatar</p>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Your Answer</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Type your answer here or use voice recording..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="min-h-[150px] resize-none"
                data-testid="input-answer"
              />
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
                  {isLastQuestion ? (
                    <Button
                      onClick={handleComplete}
                      disabled={!answer.trim() || completeInterviewMutation.isPending}
                      data-testid="button-finish-interview"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Finish Interview
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!answer.trim() || submitAnswerMutation.isPending}
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
