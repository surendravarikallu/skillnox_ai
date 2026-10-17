import { WebSocketServer, WebSocket } from "ws";
import type { Server as HTTPServer } from "http";
import { parse } from "url";
import { db } from "./db";
import { interviews, proctoringLogs, interviewQuestions, users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import * as pythonAI from "./pythonAI";
import jwt from "jsonwebtoken";

interface ClientSession {
  ws: WebSocket;
  interviewId: string;
  userId: string;
  skillGraph: Record<string, any>;
  conversationHistory: Array<{ interviewer: string; candidate: string }>;
  evidenceQuotes: Array<{ topic: string; quote: string; score: number }>;
  currentTopic: string;
  consecutiveViolations: number;
}

const activeSessions = new Map<string, ClientSession>();

export function setupInterviewWebSocket(server: HTTPServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const { pathname, query } = parse(request.url || "", true);

    if (pathname === "/ws/interview") {
      const interviewId = query.interviewId as string;
      const token = query.token as string;

      if (!interviewId) {
        socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
        socket.destroy();
        return;
      }

      let userId = "anonymous";
      if (token) {
        try {
          const secret = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-2024";
          const decoded = jwt.verify(token, secret) as any;
          if (decoded) {
            userId = decoded.id || decoded.userId || "anonymous";
          }
        } catch (err) {
          console.warn("[WS Auth] Token verification failed, proceeding with session checks:", err);
        }
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request, { interviewId, userId });
      });
    }
  });

  wss.on("connection", async (ws: WebSocket, _request: any, context: { interviewId: string; userId: string }) => {
    const { interviewId, userId } = context;
    console.log(`[WebSocket] 🟢 Client connected to interview session: ${interviewId}`);

    // Fetch existing interview data to restore memory/state
    let existingInterview: any = null;
    try {
      const [record] = await db.select().from(interviews).where(eq(interviews.id, interviewId)).limit(1);
      existingInterview = record;
    } catch (dbErr) {
      console.error("[WebSocket] Error fetching interview record:", dbErr);
    }

    const session: ClientSession = {
      ws,
      interviewId,
      userId: existingInterview?.userId || userId,
      skillGraph: existingInterview?.skillGraph || {
        "Core Technical Concepts": { status: "UNTESTED", score: 0 },
        "Problem Solving & Architecture": { status: "UNTESTED", score: 0 },
        "Project Experience": { status: "UNTESTED", score: 0 },
        "Communication & Articulation": { status: "UNTESTED", score: 0 }
      },
      conversationHistory: [],
      evidenceQuotes: existingInterview?.evidenceQuotes || [],
      currentTopic: "Core Technical Concepts",
      consecutiveViolations: 0,
    };

    activeSessions.set(interviewId, session);

    // Send connection established confirmation
    ws.send(JSON.stringify({
      type: "SESSION_READY",
      interviewId,
      integrityScore: existingInterview?.integrityScore ?? 100,
      currentTopic: session.currentTopic,
    }));

    ws.on("message", async (data: Buffer | string) => {
      try {
        const payload = JSON.parse(data.toString());

        switch (payload.type) {
          case "HEARTBEAT":
            ws.send(JSON.stringify({ type: "PONG" }));
            break;

          case "PROCTOR_INCIDENT": {
            const { eventType, timestampSeconds, durationSeconds, severity, metadata } = payload;
            console.log(`[WebSocket Proctor] ⚠️ ${eventType} detected at ${timestampSeconds}s (severity: ${severity})`);

            let deduction = 2;
            if (severity === "medium") deduction = 5;
            if (severity === "high") deduction = 15;

            session.consecutiveViolations += 1;

            // 1. Log incident into proctoringLogs table and update integrity score in DB
            try {
              await db.insert(proctoringLogs).values({
                interviewId,
                eventType: eventType || "GAZE_OFF_SCREEN",
                timestampSeconds: Math.round(timestampSeconds || 0),
                durationSeconds: durationSeconds ? parseFloat(durationSeconds) : null,
                severity: severity || "low",
                metadata: metadata || null,
              });

              // Deduct from interview integrity_score in DB
              await db.execute(sql`
                UPDATE interviews 
                SET integrity_score = GREATEST(0, COALESCE(integrity_score, 100) - ${deduction})
                WHERE id = ${interviewId}
              `);
            } catch (pErr) {
              console.warn("[WebSocket Proctor] DB logging warning:", pErr);
            }

            // 2. Always send warning back to candidate HUD
            try {
              ws.send(JSON.stringify({
                type: "PROCTOR_WARNING",
                message: eventType === "GAZE_OFF_SCREEN" 
                  ? "Please keep your focus on the screen." 
                  : eventType === "MULTIPLE_FACES"
                  ? "Multiple people detected in camera view."
                  : eventType === "TAB_SWITCH"
                  ? "Tab switch detected! Please stay in the interview window."
                  : eventType === "CAMERA_OCCLUDED"
                  ? "Camera feed occluded. Ensure your face is clearly visible."
                  : "Please maintain test integrity.",
                severity,
                violationsCount: session.consecutiveViolations,
              }));
            } catch (wsErr) {
              console.warn("[WebSocket Proctor] Error sending warning:", wsErr);
            }
            break;
          }

          case "CANDIDATE_UTTERANCE": {
            const { transcript, timeElapsedSeconds, totalDurationSeconds } = payload;
            const candidateAnswer = (transcript || "").trim();

            if (!candidateAnswer) {
              ws.send(JSON.stringify({
                type: "AI_ERROR",
                message: "No speech detected in turn."
              }));
              return;
            }

            console.log(`[WebSocket Agent] 🎙️ Processing turn for ${interviewId} (length: ${candidateAnswer.length} chars)`);

            // Inform client the AI is thinking / reasoning
            ws.send(JSON.stringify({ type: "AI_THINKING" }));

            // 1. Execute agentic turn via Python AI
            const turnResponse = await pythonAI.agentInterviewTurn({
              interview_id: interviewId,
              candidate_answer: candidateAnswer,
              current_topic: session.currentTopic,
              interview_type: existingInterview?.type || "technical",
              time_elapsed_seconds: timeElapsedSeconds || 0,
              total_duration_seconds: totalDurationSeconds || 1200,
              skill_graph: session.skillGraph,
              conversation_history: session.conversationHistory,
            });

            if (!turnResponse) {
              ws.send(JSON.stringify({
                type: "AI_RESPONSE",
                spokenQuestion: "Thank you for explaining. Let's move to the next topic: can you discuss your experience with databases?",
                decision: "ADVANCE",
                score: 70,
                nextTopic: "Database Architecture",
                isComplete: false,
              }));
              return;
            }

            // 2. Update session memory
            session.conversationHistory.push({
              interviewer: session.currentTopic,
              candidate: candidateAnswer,
            });

            if (turnResponse.evidence_quote) {
              session.evidenceQuotes.push({
                topic: session.currentTopic,
                quote: turnResponse.evidence_quote,
                score: turnResponse.score,
              });
            }

            // Update skill graph node
            session.skillGraph[session.currentTopic] = {
              status: turnResponse.decision === "ADVANCE" ? "VERIFIED_STRONG" : "NEEDS_WORK",
              score: turnResponse.score,
              lastTestedAt: timeElapsedSeconds || 0,
            };

            if (turnResponse.next_topic && turnResponse.next_topic !== session.currentTopic) {
              session.currentTopic = turnResponse.next_topic;
            }

            // 3. Save progress asynchronously to PostgreSQL
            try {
              // Save question record
              await db.insert(interviewQuestions).values({
                interviewId,
                question: turnResponse.spoken_question,
                userAnswer: candidateAnswer,
                score: turnResponse.score,
                feedback: turnResponse.reasoning,
                orderIndex: session.conversationHistory.length,
              });

              // Update interview aggregate record
              await db.update(interviews)
                .set({
                  skillGraph: session.skillGraph,
                  evidenceQuotes: session.evidenceQuotes,
                  updatedAt: new Date(),
                })
                .where(eq(interviews.id, interviewId));
            } catch (dbSaveErr) {
              console.warn("[WebSocket DB Save Warning]:", dbSaveErr);
            }

            // 4. Send AI response back to candidate browser
            ws.send(JSON.stringify({
              type: "AI_RESPONSE",
              spokenQuestion: turnResponse.spoken_question,
              decision: turnResponse.decision,
              score: turnResponse.score,
              evidenceQuote: turnResponse.evidence_quote,
              nextTopic: session.currentTopic,
              isComplete: turnResponse.is_complete,
            }));
            break;
          }

          default:
            console.log(`[WebSocket] Unknown packet type: ${payload.type}`);
        }
      } catch (msgErr) {
        console.error("[WebSocket] Message parsing error:", msgErr);
      }
    });

    ws.on("close", () => {
      console.log(`[WebSocket] 🔴 Client disconnected from interview: ${interviewId}`);
      activeSessions.delete(interviewId);
    });

    ws.on("error", (err) => {
      console.error(`[WebSocket Error] on session ${interviewId}:`, err);
    });
  });

  console.log("✅ Interview WebSocket Gateway initialized on /ws/interview");
  return wss;
}
