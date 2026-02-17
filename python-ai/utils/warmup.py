"""
Python AI Service Warm-up and Optimization
"""

from fastapi import FastAPI
from contextlib import asynccontextmanager
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from models.llm_models import get_llm


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for the FastAPI app
    Runs warm-up tasks on startup
    """
    print("🚀 Starting Python AI Service...")
    
    # Warm-up LLM model on startup
    print("🔥 Warming up LLM model...")
    try:
        llm = get_llm(model_name="models/finetuned_llm", use_lightweight=False)
        
        # Generate a dummy question to warm up the model
        _ = llm.generate_question("technical", "Python", "easy")
        print("✅ LLM model warmed up successfully")
    except Exception as e:
        print(f"⚠️  LLM warm-up failed (will work on first request): {e}")
    
    yield  # Server runs here
    
    # Cleanup on shutdown
    print("👋 Shutting down Python AI Service...")


# This startup event can be triggered by api_service.py
def warm_up_models():
    """Standalone function to warm up models"""
    try:
        llm = get_llm(model_name="models/finetuned_llm", use_lightweight=False)
        llm.generate_question("technical", "Python", "easy")
        print("✅ Models warmed up")
        return True
    except Exception as e:
        print(f"⚠️  Warm-up failed: {e}")
        return False
