"""
FastAPI service for AI inference
Communicates with Node.js backend
Uses Ollama for LLM inference (fast C++ backend)
"""

import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
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

app = FastAPI(title="AI Interview System API")

# Initialize LLM via Ollama (fast startup, no heavy model loading)
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3.5:9b")
FINETUNED_MODEL = os.environ.get("OLLAMA_FINETUNED_MODEL", "")

model_to_use = FINETUNED_MODEL if FINETUNED_MODEL else OLLAMA_MODEL
print(f"Initializing Ollama LLM: {model_to_use}")
llm = get_llm(model_name=model_to_use)


# Warm-up on startup to reduce first request latency
@app.on_event("startup")
async def startup_event():
    """Warm up Ollama model on startup"""
    print("🔥 Warming up Ollama LLM model...")
    try:
        # Generate a dummy question to ensure model is loaded in Ollama's memory
        _ = llm.generate_question("technical", "Python", "easy")
        print("✅ Ollama LLM model ready")
    except Exception as e:
        print(f"⚠️  Warm-up warning: {e}")


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    difficulty: Optional[str] = 'medium'  # easy, medium, hard


class FollowUpQuestionRequest(BaseModel):
    previous_question: str
    answer: str
    interview_type: str
    conversation_history: Optional[List[Dict[str, str]]] = None


@app.get("/")
def root():
    return {"message": "AI Interview System API (Ollama)", "status": "running"}


@app.get("/health")
def health():
    """Health check endpoint"""
    try:
        # Quick check: verify Ollama connection
        import requests
        base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        resp = requests.get(f"{base_url}/api/tags", timeout=5)
        llm_status = "loaded" if resp.status_code == 200 else "error"
    except Exception as e:
        llm_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "llm_status": llm_status,
        "llm_backend": "ollama",
        "model": model_to_use,
        "service": "AI Interview System API",
        "version": "2.0.0"
    }


@app.post("/api/resume/parse")
def parse_resume(request: ResumeParseRequest):
    """Parse resume and extract information"""
    try:
        result = inference_service.parse_resume(request.resume_text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/resume/score")
def score_resume(request: ResumeParseRequest):
    """Score resume quality"""
    try:
        result = inference_service.score_resume(request.resume_text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/jd/extract")
def extract_jd_skills(request: JDExtractRequest):
    """Extract required skills from job description"""
    try:
        result = inference_service.extract_jd_skills(request.jd_text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/answer/evaluate")
def evaluate_answer(request: AnswerEvaluateRequest):
    """Evaluate interview answer"""
    try:
        # Use Ollama LLM for evaluation
        if request.question:
            result = llm.evaluate_answer(request.question, request.answer)
            return {"success": True, "data": result}
        else:
            result = inference_service.evaluate_answer(request.answer, request.question)
            return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/answer/evaluate-communication")
def evaluate_communication(request: AnswerEvaluateRequest):
    """Evaluate communication-specific aspects of answer"""
    try:
        result = llm.evaluate_communication(request.answer, request.question)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/personality/analyze")
def analyze_personality(request: PersonalityRequest):
    """Analyze personality from responses"""
    try:
        result = inference_service.analyze_personality(request.responses)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/emotion/analyze")
async def analyze_emotion(file: UploadFile = File(...)):
    """Analyze emotion from image"""
    try:
        image_data = await file.read()
        result = inference_service.analyze_emotion(image_data)
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

        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            audio_data = await file.read()
            tmp_file.write(audio_data)
            tmp_file_path = tmp_file.name

        try:
            # Load audio with librosa
            audio_array, sr = librosa.load(tmp_file_path, sr=22050)

            result = inference_service.analyze_voice(audio_array, transcript=transcript)
            return {"success": True, "data": result}
        finally:
            # Clean up temp file
            if _os.path.exists(tmp_file_path):
                _os.unlink(tmp_file_path)
    except Exception as e:
        # Return default values on error
        return {
            "success": True,
            "data": {
                "fluency": 50.0,
                "grammar": 50.0,
                "tone": 50.0,
                "pace": 50.0,
                "filler_words": 50.0,
                "clarity": 50.0,
                "overall_voice_score": 50.0,
                "error": str(e)
            }
        }


@app.post("/api/placement/predict")
def predict_placement(request: PlacementPredictRequest):
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
        result = inference_service.predict_placement(features)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/skill-gap/analyze")
def analyze_skill_gap(request: SkillGapRequest):
    """Analyze skill gap between resume and JD"""
    try:
        result = inference_service.analyze_skill_gap(request.resume_text, request.jd_text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/generate-question")
def generate_question(request: QuestionGenerateRequest):
    """Generate interview question using Ollama LLM"""
    try:
        difficulty = request.difficulty or 'medium'
        print(f"Generating question: type={request.question_type}, difficulty={difficulty}, company={request.company}")

        if request.company:
            question = llm.generate_company_question(request.company, difficulty)
        else:
            question = llm.generate_question(request.question_type, request.context, difficulty)

        if not question or question.strip() == "":
            print("Warning: Generated empty question, using fallback")
            question = f"Tell me about your experience with {request.question_type}."

        return {"success": True, "question": question}
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Error generating question: {error_detail}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/generate-followup")
def generate_followup_question(request: FollowUpQuestionRequest):
    """Generate follow-up question based on previous answer"""
    try:
        # Build context from conversation history
        context = f"Previous question: {request.previous_question}\nAnswer: {request.answer}"

        if request.conversation_history:
            context += "\n\nConversation history:\n"
            for msg in request.conversation_history[-3:]:  # Last 3 exchanges
                context += f"{msg.get('role', 'user')}: {msg.get('content', '')}\n"

        # Generate follow-up question
        prompt = f"""Based on this interview answer, generate a relevant follow-up question for a {request.interview_type} interview.
        
Previous Question: {request.previous_question}
Answer: {request.answer}

Generate a follow-up question that:
1. Probes deeper into the answer
2. Tests understanding
3. Is relevant to {request.interview_type} interview context

Follow-up question:"""

        followup = llm.generate(prompt, max_length=100)
        return {"success": True, "question": followup.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/generate-gd-topic")
def generate_gd_topic():
    """Generate group discussion topic using LLM"""
    try:
        topic = llm.generate_gd_topic()
        return {"success": True, "topic": topic}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/analyze-resume")
def analyze_resume(request: ResumeAnalyzeRequest):
    """Analyze resume using LLM - general evaluation or JD-based"""
    try:
        result = llm.analyze_resume(request.resume_text, request.jd_text)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
