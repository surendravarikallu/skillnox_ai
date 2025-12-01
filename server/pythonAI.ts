/**
 * Python AI Service Client
 * Communicates with FastAPI service running on port 8000
 */

const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000';

function sanitizeGeneratedQuestion(question?: string | null): string | null {
  if (!question) return null;
  
  let cleaned = question
    .replace(/^(sure|certainly|absolutely)[,!.\s-]*/i, '')
    .replace(/^(here('?s| is)\b.*?:)/i, '')
    .replace(/^(additionally|also)[,!.\s-]*/i, '')
    .replace(/good luck!?$/i, '')
    .replace(/note:.*$/i, '')
    .trim();

  // Break into sentences (simple heuristic) and pick the first question-like one
  const parts = cleaned
    .split(/(?<=[?.!])\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  const primary = parts.find(part => part.endsWith('?')) ?? parts[0];
  return (primary ?? '').trim() || null;
}

async function callPythonService(endpoint: string, method: 'GET' | 'POST', body?: any, file?: { data: Buffer; filename: string; contentType: string }): Promise<any> {
  const url = `${PYTHON_AI_SERVICE_URL}${endpoint}`;
  
  try {
    let options: RequestInit = {
      method,
      headers: {},
    };

    if (file) {
      // For file uploads - use FormData (available in Node.js 18+)
      // @ts-ignore - FormData is available in Node.js 18+
      const formData = new FormData();
      // @ts-ignore
      const blob = new Blob([file.data], { type: file.contentType });
      formData.append('file', blob, file.filename);
      
      if (body && body.transcript) {
        formData.append('transcript', body.transcript);
      }
      
      options.body = formData;
      // Don't set Content-Type header - let fetch set it with boundary
    } else if (body) {
      options.headers = {
        'Content-Type': 'application/json',
      };
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Python AI service error: ${response.status} - ${errorText}`);
      console.error(`Failed endpoint: ${url}`);
      // Return default values on error
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error calling Python AI service: ${error}`);
    console.error(`Failed endpoint: ${url}`);
    // Log more details about the error
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
    // Return null to indicate error, caller should handle fallback
    return null;
  }
}

export async function parseResume(resumeText: string) {
  const result = await callPythonService('/api/resume/parse', 'POST', { resume_text: resumeText });
  return result?.data || null;
}

export async function scoreResume(resumeText: string) {
  const result = await callPythonService('/api/resume/score', 'POST', { resume_text: resumeText });
  return result?.data || null;
}

export async function analyzeResumeWithAI(resumeText: string, jdText?: string) {
  try {
    const result = await callPythonService('/api/llm/analyze-resume', 'POST', { 
      resume_text: resumeText,
      jd_text: jdText || undefined
    });
    return result?.data || null;
  } catch (error) {
    console.error('Error calling analyzeResumeWithAI:', error);
    return null;
  }
}

export async function extractJDSkills(jdText: string) {
  const result = await callPythonService('/api/jd/extract', 'POST', { jd_text: jdText });
  return result?.data || null;
}

export async function evaluateAnswer(answer: string, question?: string) {
  const result = await callPythonService('/api/answer/evaluate', 'POST', { answer, question });
  return result?.data || null;
}

export async function analyzePersonality(responses: string[]) {
  const result = await callPythonService('/api/personality/analyze', 'POST', { responses });
  return result?.data || null;
}

export async function analyzeEmotion(imageData: Buffer) {
  const result = await callPythonService('/api/emotion/analyze', 'POST', undefined, {
    data: imageData,
    filename: 'frame.jpg',
    contentType: 'image/jpeg'
  });
  return result?.data || null;
}

export async function analyzeVoice(audioData: Buffer, transcript?: string) {
  const result = await callPythonService('/api/voice/analyze', 'POST', { transcript }, {
    data: audioData,
    filename: 'audio.wav',
    contentType: 'audio/wav'
  });
  return result?.data || null;
}

export async function predictPlacement(features: {
  resumeScore: number;
  jdScore: number;
  technicalScore: number;
  hrScore: number;
  gdScore: number;
  emotionScore: number;
  voiceScore: number;
  personalityIntrovertExtrovert?: number;
  personalityThinkerFeeler?: number;
  personalityLogicalCreative?: number;
}) {
  const result = await callPythonService('/api/placement/predict', 'POST', {
    resume_score: features.resumeScore,
    jd_score: features.jdScore,
    technical_score: features.technicalScore,
    hr_score: features.hrScore,
    gd_score: features.gdScore,
    emotion_score: features.emotionScore,
    voice_score: features.voiceScore,
    personality_introvert_extrovert: features.personalityIntrovertExtrovert || 0,
    personality_thinker_feeler: features.personalityThinkerFeeler || 0,
    personality_logical_creative: features.personalityLogicalCreative || 0,
  });
  return result?.data || null;
}

export async function analyzeSkillGap(resumeText: string, jdText: string) {
  const result = await callPythonService('/api/skill-gap/analyze', 'POST', {
    resume_text: resumeText,
    jd_text: jdText
  });
  return result?.data || null;
}

export async function generateQuestion(questionType: string, company?: string, context?: string) {
  const result = await callPythonService('/api/llm/generate-question', 'POST', {
    question_type: questionType,
    company: company,
    context: context
  });
  return sanitizeGeneratedQuestion(result?.question);
}

export async function generateGDTopic() {
  const result = await callPythonService('/api/llm/generate-gd-topic', 'POST', {});
  return result?.topic || null;
}

export async function generateFollowUpQuestion(
  previousQuestion: string,
  answer: string,
  interviewType: string,
  conversationHistory?: Array<{ role: string; content: string }>
) {
  const result = await callPythonService('/api/llm/generate-followup', 'POST', {
    previous_question: previousQuestion,
    answer: answer,
    interview_type: interviewType,
    conversation_history: conversationHistory || []
  });
  return sanitizeGeneratedQuestion(result?.question);
}

