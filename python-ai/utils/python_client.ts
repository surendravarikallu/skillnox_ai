/**
 * TypeScript client for Python AI service
 * This file is for reference - actual implementation should be in Node.js
 */

// This would be used in Node.js/TypeScript to call Python service
export const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000';

export interface PythonAIClient {
  parseResume(resumeText: string): Promise<any>;
  scoreResume(resumeText: string): Promise<any>;
  extractJDSkills(jdText: string): Promise<any>;
  evaluateAnswer(answer: string, question?: string): Promise<any>;
  analyzePersonality(responses: string[]): Promise<any>;
  analyzeEmotion(imageData: Buffer): Promise<any>;
  analyzeVoice(audioData: Buffer, transcript?: string): Promise<any>;
  predictPlacement(features: any): Promise<any>;
  analyzeSkillGap(resumeText: string, jdText: string): Promise<any>;
}

