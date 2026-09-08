/**
 * Shared evaluation utilities for answer scoring.
 * Both routes.ts and evaluation-queue.ts import from here
 * to ensure consistent scoring behavior.
 */

import * as pythonAI from "./pythonAI";

// ─── Constants ────────────────────────────────────────
export const EVALUATION_TIMEOUT_MS = 60000;

// ─── Helpers ──────────────────────────────────────────

/**
 * Race a promise against a timeout. Resolves with the fallback value
 * if the promise takes longer than `ms` milliseconds.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label?: string): Promise<T> {
  return await new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        if (label) {
          console.warn(`${label} timed out after ${ms}ms`);
        }
        resolve(fallback);
      }
    }, ms);

    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch((error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          if (label) {
            console.error(`${label} failed:`, error);
          }
          resolve(fallback);
        }
      });
  });
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "in", "on", "at", "to", "for", "of", "is", "are", "am", 
  "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "you", "your", "why", 
  "what", "how", "who", "when", "where", "which", "this", "that", "i", "me", "my", "tell", "explain", "describe",
  "could", "would", "should", "can", "please", "about"
]);

function extractKeywords(text: string): string[] {
  return (text || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Checks if the student answer is mostly reading or repeating the question text back.
 */
export function isQuestionEcho(answer: string, question?: string): boolean {
  if (!question || !answer) return false;
  
  const qTokens = extractKeywords(question);
  const aTokens = extractKeywords(answer);
  
  if (qTokens.length < 3 || aTokens.length < 2) return false;

  const qTokenSet = new Set(qTokens);
  const matchingTokensInAnswer = aTokens.filter(t => qTokenSet.has(t));
  const echoRatio = matchingTokensInAnswer.length / aTokens.length;
  const nonQuestionTokens = aTokens.filter(t => !qTokenSet.has(t));

  // If >= 70% of candidate's tokens are directly from the question text
  // AND they added fewer than 5 non-question technical tokens
  if (echoRatio >= 0.65 && nonQuestionTokens.length < 5) {
    return true;
  }
  
  if (echoRatio >= 0.85) {
    return true;
  }

  return false;
}

/**
 * Checks if the student answer consists solely or mostly of evasion phrases ("I don't know", etc.)
 */
export function isEvasionOnly(answer: string): boolean {
  if (!answer) return true;
  const lower = answer.toLowerCase().trim();

  const EVASION_PHRASES = [
    "i don't know", "i do not know", "don't know", "dont know", "no idea",
    "sorry i don't", "sorry i dont", "i am sorry", "i'm sorry", "not sure",
    "i don't understand", "i do not understand", "no clear answer", "i have no idea",
    "i don't have any idea", "i am not aware", "etc etc", "i don't remember",
    "i do not remember", "i'm not sure", "i am not sure", "huh", "sorry i don't know",
    "sorry i do not know", "i dont know about this", "no idea about this"
  ];

  const SHORT_FILLER_PHRASES = [
    "thank you", "thanks", "okay", "ok", "yeah", "yes", "hello", "hi", "testing",
    "okay thank you", "thank you so much", "that's it", "thats it", "nothing",
    "no", "none", "i'm going to go", "im going to go", "okay okay", "okay okay okay",
    "okay thank you.", "thank you."
  ];

  for (const phrase of [...EVASION_PHRASES, ...SHORT_FILLER_PHRASES]) {
    if (lower === phrase || lower === `${phrase}.` || lower === `${phrase}?` || lower === `${phrase}!`) {
      return true;
    }
  }

  const tokens = extractKeywords(answer);
  if (tokens.length < 10) {
    for (const phrase of EVASION_PHRASES) {
      if (lower.includes(phrase)) {
        return true;
      }
    }
  }

  return false;
}

// ─── Main evaluation function ─────────────────────────

/**
 * Evaluate a student's answer using the Python AI service,
 * with a heuristic fallback if the service is unavailable.
 */
export interface AnswerEvaluationResult {
  score: number;
  feedback: string;
  communicationScore?: number;
}

/**
 * Evaluate a student's answer using the Python AI service (NVIDIA NIM),
 * evaluating both Technical Accuracy and Communication Quality.
 */
export async function evaluateAnswer(answer: string, question?: string): Promise<AnswerEvaluationResult> {
  const trimmed = (answer || '').trim();
  const lower = trimmed.toLowerCase();

  // 1. Guardrail: Immediately score empty / missing / missing audio answers as 0
  if (!trimmed || lower.includes("no answer recorded") || lower.includes("silence detected")) {
    return {
      score: 0,
      feedback: "No response was recorded for this question.",
      communicationScore: 0
    };
  }

  // 2. Guardrail: Detect Evasion ("I don't know", "Sorry", etc.)
  if (isEvasionOnly(trimmed)) {
    return {
      score: 0,
      feedback: "Candidate stated they do not know or are unsure of the answer.",
      communicationScore: 0
    };
  }

  // 3. Guardrail: Detect Question Echoing (reading question text back)
  if (question && isQuestionEcho(trimmed, question)) {
    return {
      score: 0,
      feedback: "No answer provided. Candidate repeated or read back the question text instead of providing an explanation.",
      communicationScore: 0
    };
  }

  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  // Try Python AI service (Technical + Communication in parallel via NVIDIA NIM)
  let aiSucceeded = false;
  let score = 0;
  let feedback = "Attempted response.";
  let communicationScore: number | undefined;

  try {
    const truncatedAnswerForAI = trimmed.length > 8000 ? trimmed.slice(0, 8000) : trimmed;
    const truncatedQuestionForAI = question && question.length > 1000 ? question.slice(0, 1000) : question;

    const [evalRes, commRes] = await Promise.allSettled([
      withTimeout(
        pythonAI.evaluateAnswer(truncatedAnswerForAI, truncatedQuestionForAI),
        EVALUATION_TIMEOUT_MS,
        null,
        "Answer evaluation"
      ),
      withTimeout(
        pythonAI.evaluateCommunication(truncatedAnswerForAI, truncatedQuestionForAI),
        EVALUATION_TIMEOUT_MS,
        null,
        "Communication evaluation"
      )
    ]);

    if (evalRes.status === 'fulfilled' && evalRes.value && evalRes.value.score !== undefined) {
      score = evalRes.value.score;
      feedback = evalRes.value.feedback || feedback;
      aiSucceeded = true;
    }

    if (commRes.status === 'fulfilled' && commRes.value) {
      const commOverall = commRes.value.overall ?? commRes.value.score;
      if (typeof commOverall === 'number') {
        communicationScore = Math.max(0, Math.min(100, Math.round(commOverall)));
      }
    }
  } catch (e) {
    console.error("Error calling Python AI evaluateAnswer/Communication:", e);
  }

  // Only apply heuristic scoring if AI service failed
  if (!aiSucceeded) {
    if (!trimmed) {
      score = 0;
      feedback = "No answer detected. Please respond to the question.";
    } else if (wordCount < 5) {
      score = 15;
      feedback = "Answer is too short. Please provide more detail with concrete points and examples.";
    } else if (wordCount < 15) {
      score = 30;
      feedback = "Answer is brief. Try to elaborate with specific reasons and examples.";
    } else if (wordCount > 50) {
      score = 70;
      feedback = "Detailed response. Good work!";
    } else if (wordCount > 20) {
      score = 60;
      feedback = "Good answer. Could add more detail.";
    }

    // Add relevance check in fallback only
    if (question) {
      const stopwords = new Set(["the", "a", "an", "and", "or", "but", "if", "in", "on", "at", "to", "for", "of", "is", "are", "am", "you", "your", "why", "what", "how", "who", "when", "where", "i", "me", "my"]);
      const qTokens = question.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(t => t && !stopwords.has(t));
      const aSet = new Set(trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean));
      const relevance = qTokens.reduce((acc, t) => acc + (aSet.has(t) ? 1 : 0), 0);
      if (relevance === 0) {
        score = Math.min(score, 35);
        feedback += " Your answer doesn't clearly address the question.";
      }
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (communicationScore === undefined) {
    communicationScore = Math.max(0, Math.min(100, Math.round(score * 0.95)));
  }

  return {
    score,
    feedback: feedback.trim() || "Good attempt.",
    communicationScore
  };
}
