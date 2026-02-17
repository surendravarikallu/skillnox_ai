/**
 * Python AI Service Client
 * Communicates with FastAPI service running on port 8000
 */

const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000';

function sanitizeGeneratedQuestion(question?: string | null): string | null {
  if (!question) return null;

  // Remove common prefixes and filler text - more aggressive cleaning
  let cleaned = question
    // Remove opening phrases (case insensitive, with variations)
    .replace(/^(sure|certainly|absolutely|okay|yes|well|alright)[,!.\s-]*/gi, '')
    .replace(/^(here('?s| is|'re)\b.*?:)/gi, '')
    .replace(/^(additionally|also|furthermore|moreover|plus|and)[,!.\s-]*/gi, '')
    // Remove interviewer context notes (more patterns)
    .replace(/the interviewer is looking for[^.]*\./gi, '')
    .replace(/interviewer.*?looking for[^.]*\./gi, '')
    .replace(/looking for experience with[^.]*\./gi, '')
    .replace(/looking for[^.]*\./gi, '')
    // Remove "technical interview question" type prefixes
    .replace(/^(here's|here is)\s+(a|an|the)\s+(technical|hr|behavioral|interview)\s+question[:\s]*/gi, '')
    .replace(/^(this is|this's)\s+(a|an|the)\s+(technical|hr|behavioral|interview)\s+question[:\s]*/gi, '')
    // Remove closing phrases
    .replace(/good luck!?.*$/gi, '')
    .replace(/note:.*$/gi, '')
    .replace(/this.*?question.*?$/gi, '')
    .replace(/finally[,.]\s*/gi, '')
    .replace(/also[,.]\s*/gi, '')
    // Remove multiple spaces and clean up
    .replace(/\s+/g, ' ')
    .trim();

  // If the cleaned text is empty or too short, return null
  if (cleaned.length < 10) return null;

  // Break into sentences and find the actual question
  const sentences = cleaned
    .split(/(?<=[?.!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.match(/^(also|finally|additionally|plus|and)[,.\s]/i)); // Filter out very short fragments and filler starts

  if (sentences.length === 0) return null;

  // Prioritize sentences ending with '?'
  const questionSentence = sentences.find(s => s.endsWith('?') && s.length > 15);
  if (questionSentence) {
    // If question has multiple parts, try to extract just the main question
    const questionParts = questionSentence.split(/\.\s+(?=[A-Z])/); // Split on sentence boundaries
    const mainQuestion = questionParts.find(p => p.includes('?') && p.length > 15) || questionParts[0];
    return mainQuestion.trim();
  }

  // If no question mark, take the first substantial sentence that looks like a question
  const firstSubstantial = sentences.find(s =>
    s.length > 20 &&
    (s.toLowerCase().includes('how') ||
      s.toLowerCase().includes('what') ||
      s.toLowerCase().includes('why') ||
      s.toLowerCase().includes('explain') ||
      s.toLowerCase().includes('describe') ||
      s.toLowerCase().includes('write') ||
      s.toLowerCase().includes('implement'))
  );

  if (firstSubstantial) {
    return firstSubstantial.trim();
  }

  // Fallback: return first sentence if it's substantial
  return sentences[0]?.trim() || null;
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

    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

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

export async function evaluateCommunication(answer: string, question?: string) {
  const result = await callPythonService('/api/answer/evaluate-communication', 'POST', { answer, question });
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

export async function generateQuestion(questionType: string, company?: string, context?: string, difficulty?: 'easy' | 'medium' | 'hard') {
  const result = await callPythonService('/api/llm/generate-question', 'POST', {
    question_type: questionType,
    company: company,
    context: context,
    difficulty: difficulty || 'medium'
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

