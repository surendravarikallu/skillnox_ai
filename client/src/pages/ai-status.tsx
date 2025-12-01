import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface AIStatus {
  connected: boolean;
  python_service?: {
    status: string;
    llm_status: string;
    service: string;
    version: string;
  };
  message: string;
  error?: string;
}

export default function AIStatusPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render if not admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('GET', '/api/ai/health');
      const data = await response.json();
      console.log('Health check response:', data);
      // Ensure we set the status even if response structure is different
      if (data && typeof data === 'object') {
        setStatus(data);
      } else {
        setStatus({
          connected: false,
          message: "Invalid response from health check",
          error: "Response format unexpected"
        });
      }
    } catch (error: any) {
      console.error('Health check error:', error);
      setStatus({
        connected: false,
        message: "Cannot connect to Python AI service",
        error: error.message || "Unknown error"
      });
    } finally {
      setLoading(false);
    }
  };

  const testQuestionGeneration = async () => {
    setTesting(true);
    try {
      // First, get list of students to use one for testing
      const studentsResponse = await apiRequest('GET', '/api/admin/students');
      const students = await studentsResponse.json();
      
      if (!students || students.length === 0) {
        alert("❌ No students found. Please create a student account first.");
        setTesting(false);
        return;
      }
      
      // Use the first student for testing
      const testStudentId = students[0].id;
      
      // Create a test interview
      const response = await apiRequest('POST', '/api/interviews', {
        type: 'technical',
        company: null,
        studentId: testStudentId
      });
      
      const interviewData = await response.json();
      
      // Get the questions for this interview
      if (interviewData && interviewData.id) {
        const questionsResponse = await apiRequest('GET', `/api/interviews/${interviewData.id}/questions`);
        const questions = await questionsResponse.json();
        
        if (questions && questions.length > 0) {
          const questionTexts = questions.map((q: any) => q.question).join('\n\n');
          alert(`✅ Success! Generated ${questions.length} questions using AI model.\n\nQuestions:\n${questionTexts.substring(0, 500)}${questionTexts.length > 500 ? '...' : ''}`);
        } else {
          alert("⚠️ Interview created but no questions were generated. Check if Python AI service is working.");
        }
      } else {
        alert("⚠️ Interview created but couldn't retrieve questions");
      }
    } catch (error: any) {
      console.error('Test question generation error:', error);
      const errorMessage = error.message || "Failed to generate questions";
      alert(`❌ Error: ${errorMessage}\n\nMake sure:\n1. Python AI service is running\n2. At least one student exists\n3. You have admin permissions`);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI Model Status</h1>
        <Button onClick={checkStatus} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Checking AI service status...</span>
            </div>
          </CardContent>
        </Card>
      ) : status ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Python AI Service Connection
                {status.connected ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    Disconnected
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Status Message:</p>
                <p className="font-medium">{status.message}</p>
              </div>

              {status.python_service && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Service Status:</span>
                    <Badge variant={status.python_service.status === 'healthy' ? 'default' : 'destructive'}>
                      {status.python_service.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">LLM Model Status:</span>
                    <Badge variant={status.python_service.llm_status === 'loaded' ? 'default' : 'destructive'}>
                      {status.python_service.llm_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Service:</span>
                    <span className="text-sm font-medium">{status.python_service.service}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Version:</span>
                    <span className="text-sm font-medium">{status.python_service.version}</span>
                  </div>
                </div>
              )}

              {status.error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium text-destructive mb-1">Error:</p>
                  <p className="text-sm text-destructive/80">{status.error}</p>
                </div>
              )}

              {!status.connected && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm font-medium mb-2">⚠️ Python AI Service Not Running</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    To start the Python AI service, run:
                  </p>
                  <code className="block p-2 bg-background rounded text-xs mb-2">
                    cd python-ai && python services/api_service.py
                  </code>
                  <p className="text-xs text-muted-foreground">
                    The service should start on http://localhost:8000
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {status.connected && (
            <Card>
              <CardHeader>
                <CardTitle>Test Question Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Test if the AI model can generate interview questions correctly.
                </p>
                <Button 
                  onClick={testQuestionGeneration} 
                  disabled={testing}
                  className="w-full"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Test Question Generation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Connection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Python Service URL:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  http://localhost:8000
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Node.js Backend:</span>
                <Badge variant="outline">Running</Badge>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Unable to check status. Please try again.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

