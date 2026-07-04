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
print(f"Initializing Ollama LLM: {model_to_use}")
llm = get_llm(model_name=model_to_use)


# Lifespan context manager (replaces deprecated @app.on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    print("[WARMUP] Warming up Ollama LLM model...")
    try:
        _ = await llm.generate_question_async("technical", "Python", "easy")
        print("[OK] Ollama LLM model ready")
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


@app.get("/")
def root():
    return {"message": "AI Interview System API (Async/Ollama)", "status": "running"}


@app.get("/health")
async def health():
    """Health check endpoint"""
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
        "concurrency_limit": 2
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


if __name__ == "__main__":
    import uvicorn
    # Use multiple workers if CPU cores allow, but with semaphore we handle concurrency internally
    port = int(os.environ.get("PYTHON_AI_PORT", "8060"))
    uvicorn.run(app, host="0.0.0.0", port=port, workers=1)
