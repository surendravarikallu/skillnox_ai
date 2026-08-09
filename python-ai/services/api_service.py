"""
FastAPI service for AI inference
Communicates with Node.js backend
Uses Ollama for LLM inference (fast C++ backend)
Optimized for high concurrency with async/await and semaphores
"""

import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
import sys
from pathlib import Path
import io
import base64
import json

sys.path.append(str(Path(__file__).parent.parent))

from inference.inference_service import InferenceService
from models.llm_models import get_llm

from dotenv import load_dotenv

# Load .env file from project root
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Initialize LLM via Ollama
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3:8b")
FINETUNED_MODEL = os.environ.get("OLLAMA_FINETUNED_MODEL", "")

model_to_use = FINETUNED_MODEL if FINETUNED_MODEL else OLLAMA_MODEL
print(f"Initializing AI LLM Engine (Model/NVIDIA NIM Cloud: {model_to_use})")
llm = get_llm(model_name=model_to_use)


# Lifespan context manager (replaces deprecated @app.on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    print("[WARMUP] Warming up AI LLM Engine...")
    try:
        _ = await llm.generate_question_async("technical", "Python", "easy")
        print("[OK] AI LLM Engine ready")
    except Exception as e:
        print(f"[WARN] Warm-up warning: {e}")
    yield
    # ── Shutdown ──
    print("[SHUTDOWN] Closing LLM client...")
    try:
        await llm.close()
    except Exception as e:
        print(f"[WARN] Shutdown warning: {e}")
    print("[OK] Cleanup complete")


app = FastAPI(title="AI Interview System API", lifespan=lifespan)

@app.get("/")
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "llm_status": "loaded",
        "service": "Skillnox Python AI Service",
        "version": "2.0.0"
    }


# API key authentication for internal service-to-service calls
AI_SERVICE_API_KEY = os.environ.get("AI_SERVICE_API_KEY", "")

@app.middleware("http")
async def check_api_key(request: Request, call_next):
    # Skip auth for health/docs endpoints, or if no key is configured
    if not AI_SERVICE_API_KEY or request.url.path in ["/", "/health", "/docs", "/openapi.json"]:
        return await call_next(request)
    key = request.headers.get("X-API-Key", "")
    if key != AI_SERVICE_API_KEY:
        return JSONResponse(status_code=401, content={"detail": "Invalid or missing API key"})
    return await call_next(request)


# CORS middleware — restrict to known origins
ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5050,http://localhost:5000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize inference service (NLP, Vision, Audio models — non-LLM)
inference_service = InferenceService(device='cpu')


# Request/Response models
class ResumeParseRequest(BaseModel):
    resume_text: str


class JDExtractRequest(BaseModel):
    jd_text: str


class AnswerEvaluateRequest(BaseModel):
    answer: str
    question: Optional[str] = None


class PersonalityRequest(BaseModel):
    responses: List[str]


class PlacementPredictRequest(BaseModel):
    resume_score: float
    jd_score: float
    technical_score: float
    hr_score: float
    gd_score: float
    emotion_score: float
    voice_score: float
    personality_introvert_extrovert: float = 0
    personality_thinker_feeler: float = 0
    personality_logical_creative: float = 0


class SkillGapRequest(BaseModel):
    resume_text: str
    jd_text: str


class ResumeAnalyzeRequest(BaseModel):
    resume_text: str
    jd_text: Optional[str] = None


class QuestionGenerateRequest(BaseModel):
    question_type: str
    context: Optional[str] = None
    company: Optional[str] = None
    difficulty: Optional[str] = 'medium'
    round_type: Optional[str] = None
    include_trending: Optional[bool] = True


class FollowUpQuestionRequest(BaseModel):
    previous_question: str
    answer: str
    interview_type: str
    conversation_history: Optional[List[Dict[str, str]]] = None


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en-US-AriaNeural"  # edge-tts voice name


class InterviewFeedbackRequest(BaseModel):
    student_name: str
    interview_types: List[str]
    difficulty: str = "medium"
    overall_score: float
    technical_score: float
    communication_score: float
    emotion_score: float
    voice_score: float
    questions_and_answers: Optional[List[Dict[str, str]]] = None  # [{question, answer, score}]

@app.get("/")
def root():
    return {"message": "AI Interview System API (Async/Ollama)", "status": "running"}


@app.get("/health")
async def health():
    """Health check endpoint"""
    nvidia_key = os.environ.get("NVIDIA_API_KEY")
    nvidia_model = os.environ.get("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")

    if nvidia_key:
        return {
            "status": "healthy",
            "llm_status": "loaded",
            "llm_backend": "nvidia_nim",
            "model": nvidia_model,
            "concurrency_limit": 50
        }

    try:
        import httpx
        base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{base_url}/api/tags", timeout=5)
            llm_status = "loaded" if resp.status_code == 200 else "error"
    except Exception as e:
        llm_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "llm_status": llm_status,
        "llm_backend": "ollama",
        "model": model_to_use,
        "concurrency_limit": 50
    }


@app.post("/api/resume/parse")
async def parse_resume(request: ResumeParseRequest):
    """Parse resume and extract information using structured LLM parser"""
    try:
        result = await llm.parse_resume_structured(request.resume_text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/resume/score")
async def score_resume(request: ResumeParseRequest):
    """Score resume quality"""
    try:
        result = await asyncio.to_thread(inference_service.score_resume, request.resume_text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/jd/extract")
async def extract_jd_skills(request: JDExtractRequest):
    """Extract required skills from job description"""
    try:
        result = await asyncio.to_thread(inference_service.extract_jd_skills, request.jd_text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/answer/evaluate")
async def evaluate_answer(request: AnswerEvaluateRequest):
    """Evaluate interview answer (Async & Throttled)"""
    try:
        if request.question:
            # Use the new async method which is protected by a semaphore
            result = await llm.evaluate_answer_async(request.question, request.answer)
            return {"success": True, "data": result}
        else:
            # Fallback for missing question
            result = await llm.evaluate_answer_async("General interview question", request.answer)
            return {"success": True, "data": result}
    except Exception as e:
        print(f"Error in evaluate_answer API: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/answer/evaluate-communication")
async def evaluate_communication(request: AnswerEvaluateRequest):
    """Evaluate communication aspects (Async)"""
    try:
        result = await llm.evaluate_communication_async(request.answer, request.question)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/personality/analyze")
async def analyze_personality(request: PersonalityRequest):
    """Analyze personality from responses (Async)"""
    try:
        result = await llm.analyze_personality_async(request.responses)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/emotion/analyze")
async def analyze_emotion(file: UploadFile = File(...)):
    """Analyze emotion from image"""
    try:
        image_data = await file.read()
        result = await asyncio.to_thread(inference_service.analyze_emotion, image_data)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/voice/analyze")
async def analyze_voice(
    file: UploadFile = File(...),
    transcript: Optional[str] = Form(None)
):
    """Analyze voice from audio"""
    try:
        import librosa
        import tempfile
        import os as _os

        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            audio_data = await file.read()
            tmp_file.write(audio_data)
            tmp_file_path = tmp_file.name

        try:
            # librosa.load is slow/CPU intensive, run in threadpool
            audio_array, sr = await asyncio.to_thread(librosa.load, tmp_file_path, sr=22050)
            result = await asyncio.to_thread(inference_service.analyze_voice, audio_array, transcript=transcript)
            return {"success": True, "data": result}
        finally:
            if _os.path.exists(tmp_file_path):
                _os.unlink(tmp_file_path)
    except Exception as e:
        return {"success": True, "data": {"overall_voice_score": 50.0, "error": str(e)}}


@app.post("/api/placement/predict")
async def predict_placement(request: PlacementPredictRequest):
    """Predict placement probability"""
    try:
        features = {
            'resume_score': request.resume_score,
            'jd_score': request.jd_score,
            'technical_score': request.technical_score,
            'hr_score': request.hr_score,
            'gd_score': request.gd_score,
            'emotion_score': request.emotion_score,
            'voice_score': request.voice_score,
            'personality_introvert_extrovert': request.personality_introvert_extrovert,
            'personality_thinker_feeler': request.personality_thinker_feeler,
            'personality_logical_creative': request.personality_logical_creative
        }
        result = await asyncio.to_thread(inference_service.predict_placement, features)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/skill-gap/analyze")
async def analyze_skill_gap(request: SkillGapRequest):
    """Analyze skill gap between resume and JD"""
    try:
        result = await asyncio.to_thread(inference_service.analyze_skill_gap, request.resume_text, request.jd_text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/generate-question")
async def generate_question(request: QuestionGenerateRequest):
    """Generate interview question using Ollama LLM (Async)"""
    try:
        difficulty = request.difficulty or 'medium'
        include_trending = request.include_trending if request.include_trending is not None else True
        if request.company:
            question = await llm.generate_company_question_async(
                request.company,
                difficulty,
                round_type=request.round_type,
                include_trending=include_trending
            )
        else:
            question = await llm.generate_question_async(
                request.question_type,
                request.context,
                difficulty,
                include_trending=include_trending
            )

        return {"success": True, "question": question}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/generate-followup")
async def generate_followup_question(request: FollowUpQuestionRequest):
    """Generate follow-up question (Async)"""
    try:
        prompt = f"Generate a follow-up for: {request.previous_question}\nAnswer: {request.answer}"
        followup = await llm.generate_async(prompt, max_length=100)
        return {"success": True, "question": followup.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/generate-gd-topic")
async def generate_gd_topic():
    """Generate GD topic (Async)"""
    try:
        topic = await llm.generate_gd_topic_async()
        return {"success": True, "topic": topic}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/analyze-resume")
async def analyze_resume(request: ResumeAnalyzeRequest):
    """Analyze resume (Async)"""
    try:
        result = await llm.analyze_resume_async(request.resume_text, request.jd_text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
def get_nvidia_keys() -> List[str]:
    keys_str = os.environ.get("NVIDIA_API_KEYS", "")
    if keys_str:
        keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        if keys:
            return keys
    single_key = os.environ.get("NVIDIA_API_KEY", "").strip()
    return [single_key] if single_key else []


# ---------------------------------------------------------------------------
# TTS — Text-to-Speech (High-Speed Neural Indian Voice)
# ---------------------------------------------------------------------------

@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech audio. Returns MP3 audio bytes.
    Uses high-quality Neural Indian English Voice (en-IN-NeerjaNeural) with smooth natural pacing.
    """
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    # Limit text length to prevent abuse
    if len(text) > 2000:
        text = text[:2000]

    try:
        import edge_tts
        # Indian English Female voice (Neerja) with natural smooth flow
        voice = request.voice if request.voice and "Neerja" in request.voice else "en-IN-NeerjaNeural"
        communicate = edge_tts.Communicate(text, voice, rate="+0%")

        audio_bytes = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_bytes += chunk["data"]

        if len(audio_bytes) > 0:
            print(f"[TTS] Generated audio via {voice} ({len(audio_bytes)} bytes)")
            from fastapi.responses import Response
            return Response(
                content=audio_bytes,
                media_type="audio/mp3",
                headers={"Content-Disposition": "inline; filename=speech.mp3"}
            )
        else:
            raise HTTPException(status_code=500, detail="edge-tts produced empty audio")
    except Exception as e:
        print(f"[TTS] edge-tts error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


# ---------------------------------------------------------------------------
# STT — Speech-to-Text / Transcribe (Groq Cloud Whisper → Faster-Whisper fallback)
# ---------------------------------------------------------------------------

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio file to text.
    Uses Groq Cloud Whisper-large-v3 API (0.15s ultra-fast LPU inference) first.
    Falls back to local Faster-Whisper.
    Accepts any audio format (WebM, WAV, MP3, OGG).
    """
    try:
        audio_data = await file.read()
        if len(audio_data) < 100:
            return {"success": True, "text": ""}

        print(f"[STT] Transcribe request received: {len(audio_data)} bytes, type: {file.content_type}")

        groq_key = os.environ.get("GROQ_API_KEY")

        # --- Attempt 1: Groq Cloud Whisper API (Ultra-Fast ~0.15s LPU Inference) ---
        if groq_key:
            try:
                import httpx
                url = "https://api.groq.com/openai/v1/audio/transcriptions"
                headers = {"Authorization": f"Bearer {groq_key}"}
                filename = file.filename or "recording.webm"
                files = {"file": (filename, audio_data, file.content_type or "audio/webm")}
                data = {"model": "whisper-large-v3", "language": "en"}
                
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(url, headers=headers, files=files, data=data)
                    if resp.status_code == 200:
                        result = resp.json()
                        text = result.get("text", "").strip()
                        if text:
                            print(f"[STT Groq Cloud Whisper] Transcribed text ({len(text)} chars): '{text[:60]}...'")
                            return {"success": True, "text": text}
                    print(f"[STT] Groq Cloud API status {resp.status_code}: {resp.text[:100]}")
            except Exception as e:
                print(f"[STT] Groq Cloud STT error: {e}, falling back to local Whisper...")

        # --- Attempt 2: Local Faster-Whisper CPU Fallback ---
        import tempfile
        import os as _os
        import librosa

        suffix = ".webm"
        if file.content_type and "wav" in file.content_type:
            suffix = ".wav"
        elif file.content_type and "mp3" in file.content_type:
            suffix = ".mp3"
        elif file.content_type and "ogg" in file.content_type:
            suffix = ".ogg"

        tmp_file_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(audio_data)
                tmp_file_path = tmp.name

            # Load audio at 16kHz for Whisper
            y, sr = await asyncio.to_thread(librosa.load, tmp_file_path, sr=16000, mono=True)

            if len(y) < 1600:  # Less than 0.1 seconds
                return {"success": True, "text": ""}

            from models.audio_models import AudioTranscriber
            transcriber = AudioTranscriber()
            text = await asyncio.to_thread(transcriber.transcribe, y)
            print(f"[STT Local Whisper] Transcribed text ({len(text)} chars): '{text[:60]}...'")
            return {"success": True, "text": text.strip()}
        finally:
            if tmp_file_path and _os.path.exists(tmp_file_path):
                try:
                    _os.unlink(tmp_file_path)
                except Exception:
                    pass
    except Exception as e:
        print(f"[STT] Transcribe error: {e}")
        return {"success": True, "text": ""}

@app.post("/api/llm/generate-feedback")
async def generate_feedback(request: InterviewFeedbackRequest):
    """Generate AI-powered personalized interview feedback and improvement suggestions."""
    try:
        # Build Q&A context for the LLM
        qa_context = ""
        if request.questions_and_answers:
            qa_lines = []
            for i, qa in enumerate(request.questions_and_answers[:10], 1):  # Limit to 10 to fit context
                qa_lines.append(f"Q{i}: {qa.get('question', 'N/A')}")
                qa_lines.append(f"A{i}: {qa.get('answer', 'No answer')}")
                if qa.get('score'):
                    qa_lines.append(f"Score: {qa['score']}")
            qa_context = "\n".join(qa_lines)

        system_prompt = (
            "You are an expert placement interview coach providing constructive, specific feedback. "
            "Based on the candidate's scores and Q&A performance, generate:\n"
            "1. A 2-3 sentence personalized FEEDBACK SUMMARY about their overall performance.\n"
            "2. Exactly 3-5 specific, actionable IMPROVEMENT suggestions.\n\n"
            "IMPORTANT: Be encouraging but honest. Reference specific skill areas from their scores.\n"
            "Output ONLY valid JSON in this exact format:\n"
            '{"feedback": "Your summary here...", "improvements": ["suggestion 1", "suggestion 2", "suggestion 3"]}\n'
            "Do NOT include any text outside the JSON."
        )

        user_prompt = (
            f"Candidate: {request.student_name}\n"
            f"Interview Types: {', '.join(request.interview_types)}\n"
            f"Difficulty: {request.difficulty}\n"
            f"Scores:\n"
            f"  Overall: {request.overall_score:.0f}%\n"
            f"  Technical: {request.technical_score:.0f}%\n"
            f"  Communication: {request.communication_score:.0f}%\n"
            f"  Confidence/Emotion: {request.emotion_score:.0f}%\n"
            f"  Voice Clarity: {request.voice_score:.0f}%\n"
        )
        if qa_context:
            user_prompt += f"\nQuestions & Answers:\n{qa_context}\n"

        user_prompt += "\nGenerate the JSON feedback now."

        result = await llm.generate_async(user_prompt, max_length=400, temperature=0.6, system_prompt=system_prompt)

        # Parse the JSON from LLM response
        import json as _json
        try:
            # Try to extract JSON from the response
            json_str = result.strip()
            # Handle case where LLM wraps in markdown code block
            if "```" in json_str:
                json_str = json_str.split("```")[1]
                if json_str.startswith("json"):
                    json_str = json_str[4:]
                json_str = json_str.strip()
            parsed = _json.loads(json_str)
            return {
                "feedback": parsed.get("feedback", "Great effort in your interview session."),
                "improvements": parsed.get("improvements", ["Continue practicing regularly."])
            }
        except _json.JSONDecodeError:
            # Fallback: use the raw text as feedback
            return {
                "feedback": result.strip()[:300] if result else "Your interview performance has been evaluated.",
                "improvements": ["Continue practicing with mock interviews to build confidence."]
            }

    except Exception as e:
        print(f"[Feedback Generation Error]: {e}")
        return {
            "feedback": "Your interview performance has been evaluated by our AI assessment engine.",
            "improvements": ["Continue practicing with mock interviews to improve your skills."]
        }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PYTHON_AI_PORT", "8060"))
    uvicorn.run(app, host="0.0.0.0", port=port, limit_concurrency=500, backlog=2048)
