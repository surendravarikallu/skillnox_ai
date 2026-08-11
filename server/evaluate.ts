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

// ─── Main evaluation function ─────────────────────────

/**
 * Evaluate a student's answer using the Python AI service,
 * with a heuristic fallback if the service is unavailable.
 */
export async function evaluateAnswer(answer: string, question?: string): Promise<{ score: number; feedback: string }> {
  const trimmed = (answer || '').trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  // Immediately score empty / missing answers as 0
  const lower = trimmed.toLowerCase();
  if (!trimmed || lower.includes("no answer recorded") || lower.includes("silence detected")) {
    return {
      score: 0,
      feedback: "No response was recorded for this question."
    };
  }

  // Try Python AI service first
  let aiSucceeded = false;
  let score = 0;
  let feedback = "Attempted response.";

  try {
    const truncatedAnswerForAI = trimmed.length > 8000 ? trimmed.slice(0, 8000) : trimmed;
    const truncatedQuestionForAI = question && question.length > 1000 ? question.slice(0, 1000) : question;

    const aiResult = await withTimeout(
      pythonAI.evaluateAnswer(truncatedAnswerForAI, truncatedQuestionForAI),
      EVALUATION_TIMEOUT_MS,
      null,
      "Answer evaluation"
    );

    if (aiResult && aiResult.score !== undefined) {
      score = aiResult.score;
      feedback = aiResult.feedback || feedback;
      aiSucceeded = true;
    }
  } catch (e) {
    console.error("Error calling Python AI evaluateAnswer, using heuristic fallback:", e);
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
  return { score, feedback: feedback.trim() || "Good attempt." };
}
