import { evaluateAnswer } from "./evaluate";
import { storage } from "./storage";

interface EvaluationTask {
  questionId: string;
  answer: string;
  questionText: string;
  retryCount: number;
  priority: number; // Higher is more urgent
}

// ─── Constants ────────────────────────────────────────
const MAX_QUEUE_SIZE = 2000;
const MAX_RETRIES = 3;
const CONCURRENT_LIMIT = 100;
const STATUS_LOG_INTERVAL_MS = 10000;
const RETRY_BACKOFF_MS = 5000;

class EvaluationQueue {
  private queue: EvaluationTask[] = [];
  private processing = false;
  private maxQueueSize = MAX_QUEUE_SIZE;
  private maxRetries = MAX_RETRIES;
  private concurrentLimit = CONCURRENT_LIMIT;
  private activeCount = 0;
  private statusInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Periodically log queue status
    this.statusInterval = setInterval(() => {
      if (this.queue.length > 0 || this.activeCount > 0) {
        console.log(`[EvaluationQueue] Pending: ${this.queue.length}, Active: ${this.activeCount}`);
      }
    }, STATUS_LOG_INTERVAL_MS);
  }

  /**
   * Add a new evaluation task to the queue
   */
  public async add(questionId: string, answer: string, questionText: string, priority = 1): Promise<boolean> {
    if (this.queue.length >= this.maxQueueSize) {
      console.warn(`[EvaluationQueue] Load shedding: Queue full (${this.maxQueueSize}). Rejecting evaluation for ${questionId}`);
      
      // Fallback: update storage with a generic feedback immediately
      await this.applyFallback(questionId, answer);
      return false;
    }

    this.queue.push({
      questionId,
      answer,
      questionText,
      retryCount: 0,
      priority
    });

    // Sort by priority (higher first)
    this.queue.sort((a, b) => b.priority - a.priority);

    this.process();
    return true;
  }

  private async process() {
    if (this.activeCount >= this.concurrentLimit || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    const task = this.queue.shift()!;

    try {
      console.log(`[EvaluationQueue] Processing evaluation for question ${task.questionId}`);
      
      const evaluation = await evaluateAnswer(task.answer, task.questionText);
      
      if (evaluation) {
        await storage.updateInterviewQuestion(task.questionId, {
          score: evaluation.score || 50,
          feedback: evaluation.feedback || "Good attempt.",
        });
        console.log(`[EvaluationQueue] Successfully evaluated question ${task.questionId}`);
      } else {
        throw new Error("Empty evaluation result");
      }
    } catch (error) {
      console.error(`[EvaluationQueue] Error evaluating question ${task.questionId}:`, error);
      
      if (task.retryCount < this.maxRetries) {
        task.retryCount++;
        console.log(`[EvaluationQueue] Retrying task ${task.questionId} (Attempt ${task.retryCount}/${this.maxRetries})`);
        
        // Add back to queue with exponential backoff delay
        setTimeout(() => {
          this.queue.push(task);
          this.process();
        }, RETRY_BACKOFF_MS * task.retryCount);
      } else {
        console.error(`[EvaluationQueue] Max retries reached for ${task.questionId}. Applying fallback.`);
        await this.applyFallback(task.questionId, task.answer);
      }
    } finally {
      this.activeCount--;
      // Trigger next task
      this.process();
    }
  }

  private async applyFallback(questionId: string, answer: string) {
    const wordCount = answer.trim().split(/\s+/).length;
    let score = 50;
    let feedback = "Try to elaborate more with examples.";

    if (wordCount > 50) {
      score = 70;
      feedback = "Detailed response. (AI Evaluation busy, using heuristic)";
    } else if (wordCount > 20) {
      score = 60;
      feedback = "Good answer. (AI Evaluation busy, using heuristic)";
    }

    try {
      await storage.updateInterviewQuestion(questionId, {
        score,
        feedback,
      });
    } catch (err) {
      console.error(`[EvaluationQueue] Failed to apply fallback for ${questionId}:`, err);
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Clean up resources on shutdown
   */
  public shutdown() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
    if (this.queue.length > 0) {
      console.warn(`[EvaluationQueue] Shutting down with ${this.queue.length} pending tasks`);
    }
  }
}

export const evaluationQueue = new EvaluationQueue();
