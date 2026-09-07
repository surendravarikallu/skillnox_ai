/**
 * In-memory accumulator for real-time interview metrics:
 * Facial Emotion & Composure, Communication Quality, and Voice Dynamics.
 */

export interface SessionMetrics {
  emotionScores: number[];
  confidenceScores: number[];
  communicationScores: number[];
  voiceScores: number[];
}

const metricsStore = new Map<string, SessionMetrics>();

export function getOrCreateSessionMetrics(interviewId: string): SessionMetrics {
  let m = metricsStore.get(interviewId);
  if (!m) {
    m = {
      emotionScores: [],
      confidenceScores: [],
      communicationScores: [],
      voiceScores: [],
    };
    metricsStore.set(interviewId, m);
  }
  return m;
}

export function recordEmotionScore(interviewId: string, score: number, confidence?: number) {
  if (typeof score !== 'number' || isNaN(score)) return;
  const m = getOrCreateSessionMetrics(interviewId);
  m.emotionScores.push(Math.max(0, Math.min(100, Math.round(score))));
  if (typeof confidence === 'number' && !isNaN(confidence)) {
    m.confidenceScores.push(Math.max(0, Math.min(100, Math.round(confidence))));
  }
}

export function recordCommunicationScore(interviewId: string, score: number) {
  if (typeof score !== 'number' || isNaN(score)) return;
  const m = getOrCreateSessionMetrics(interviewId);
  m.communicationScores.push(Math.max(0, Math.min(100, Math.round(score))));
}

export function recordVoiceScore(interviewId: string, score: number) {
  if (typeof score !== 'number' || isNaN(score)) return;
  const m = getOrCreateSessionMetrics(interviewId);
  m.voiceScores.push(Math.max(0, Math.min(100, Math.round(score))));
}

export function getSessionMetrics(interviewId: string): SessionMetrics | undefined {
  return metricsStore.get(interviewId);
}

export function clearSessionMetrics(interviewId: string) {
  metricsStore.delete(interviewId);
}
