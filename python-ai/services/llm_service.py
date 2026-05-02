"""
LLM Service for generating questions and evaluating answers
Uses Ollama backend for fast local inference
"""

import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from models.llm_models import get_llm

app = FastAPI(title="LLM Service for Interview System")

# Initialize LLM via Ollama
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3.5:9b")
FINETUNED_MODEL = os.environ.get("OLLAMA_FINETUNED_MODEL", "")

model_to_use = FINETUNED_MODEL if FINETUNED_MODEL else OLLAMA_MODEL
print(f"Initializing LLM with model: {model_to_use}")
llm = get_llm(model_name=model_to_use)


class QuestionRequest(BaseModel):
    question_type: str  # technical, hr, behavioral, project, company
    context: Optional[str] = None
    company: Optional[str] = None


class AnswerEvaluateRequest(BaseModel):
    question: str
    answer: str


class ResumeAnalyzeRequest(BaseModel):
    resume_text: str
    jd_text: Optional[str] = None


@app.get("/")
def root():
    return {"message": "LLM Service for Interview System (Ollama)", "status": "running"}


@app.post("/api/llm/generate-question")
def generate_question(request: QuestionRequest):
    """Generate interview question using LLM"""
    try:
        if request.company:
            question = llm.generate_company_question(request.company)
        else:
            question = llm.generate_question(request.question_type, request.context)

        return {
            "success": True,
            "question": question,
            "type": request.question_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/evaluate-answer")
def evaluate_answer(request: AnswerEvaluateRequest):
    """Evaluate answer using LLM"""
    try:
        result = llm.evaluate_answer(request.question, request.answer)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/generate-gd-topic")
def generate_gd_topic():
    """Generate group discussion topic"""
    try:
        topic = llm.generate_gd_topic()
        return {
            "success": True,
            "topic": topic
        }
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
    uvicorn.run(app, host="0.0.0.0", port=8001)
