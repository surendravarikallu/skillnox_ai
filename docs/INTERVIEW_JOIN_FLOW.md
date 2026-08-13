# Interview Join & Execution Workflow

## Overview

The interview execution lifecycle in Skilnox AI follows a strict state transition model to enforce security, timing compliance, and smooth user experience during live AI-driven assessments.

---

## State Transition Lifecycle

```
 ┌──────────┐    Admin Activates /    ┌─────────────┐    Student Submits    ┌───────────┐
 │ PENDING  │ ──────────────────────> │ IN_PROGRESS │ ────────────────────> │ COMPLETED │
 └──────────┘    Student Clicks Join  └─────────────┘    Final Answer       └───────────┘
      │                                      │                                    ▲
      │                                      │ Student Abandons /                 │
      └──────────────────────────────────────┴────────────────────────────────────┘
                                         Auto-Evaluation Engine
```

---

## Step-by-Step Join Sequence

### Step 1: Admin Creation (`status: 'pending'`)
- An admin assigns an interview slot to a candidate via `POST /api/interviews`.
- The interview record is stored in PostgreSQL with status `pending`.
- Questions remain unexposed to prevent front-loading or cheating.

### Step 2: Student Dashboard Visibility
- The student logs in and sees their scheduled interview under **Upcoming Interviews**.
- The **Join Interview** button becomes active when the slot window opens.

### Step 3: Activation (`status: 'in_progress'`)
- When the student clicks **Join Interview**, the client sends a `PATCH /api/interviews/:id/start` or `POST /api/interviews/:id/join` request.
- The backend performs security checks:
  1. Validates that `req.user.id` matches the assigned `studentId` (or user is admin).
  2. Updates status from `pending` to `in_progress`.
  3. Dynamically generates or pulls the question set using the AI service / company question bank.
  4. Returns question details to the client.

### Step 4: Live Interactive Interview Session
- **Webcam & Audio Setup**: Client requests browser permissions for video feed and microphone.
- **Audio Capture & STT**: Candidate responses are transcribed via Groq Whisper Cloud (0.15s ultra-fast) or Python Faster-Whisper.
- **AI Voice Synthesizer (TTS)**: The AI interviewer speaks questions aloud using TTS.
- **Real-Time Analysis**: Visual facial sentiment (emotion) and audio tone (voice confidence) are analyzed per response.

### Step 5: Answer Evaluation & Completion (`status: 'completed'`)
- Upon answering all questions or clicking **Submit Interview**:
  1. Backend pushes answers to `evaluationQueue`.
  2. Multi-metric evaluation produces overall score, technical score, communication score, and placement probability.
  3. Status updates to `completed`.
  4. Email notification with summary results is dispatched to student and admin.

---

## Security & Integrity Rules

- **Question Guarding**: Questions are never sent in API payloads while status is `pending`.
- **Session Locking**: Re-joining an `in_progress` interview resumes existing timer states without regenerating questions.
- **Access Authorization**: Attempting to view questions for another student's interview triggers `403 Forbidden`.
