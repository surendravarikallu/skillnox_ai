"""
Test script to validate FastAPI endpoints consuming Ollama LLM
Run this script to test all the major NLP endpoints using TestClient.
"""

import sys
import os
from pathlib import Path
from fastapi.testclient import TestClient

# Add python-ai root to path
sys.path.append(str(Path(__file__).parent))

# Import the FastAPI app
try:
    from services.api_service import app
except ImportError as e:
    print(f"Failed to import API service. Make sure you are running from python-ai directory. Error: {e}")
    sys.exit(1)

client = TestClient(app)

print("[START] Starting FastAPI Endpoint Validation Tests")
print("=" * 60)

# 1. Test Health Endpoint
print("\n[1] Testing /health")
response = client.get("/health")
assert response.status_code == 200, "Health check failed"
data = response.json()
print(f"  Status: {data['status']}")
print(f"  LLM Backend: {data['llm_backend']}")
print(f"  Model Loaded: {data['model']}")
if "error" in data['llm_status']:
    print(f"  [ERROR] OLLAMA ERROR: {data['llm_status']}")
    print("  Make sure Ollama is running (`ollama serve`)")
    sys.exit(1)
print("  [OK] Health OK")

# 2. Test Question Generation
print("\n[2] Testing /api/llm/generate-question")
q_payload = {
    "question_type": "technical",
    "context": "Python backend development",
    "difficulty": "medium"
}
response = client.post("/api/llm/generate-question", json=q_payload)
assert response.status_code == 200, f"Generate Question failed: {response.text}"
data = response.json()
print(f"  Generated Question: {data['question']}")
print("  [OK] Generate Question OK")

# 3. Test Answer Evaluation
print("\n[3] Testing /api/answer/evaluate")
eval_payload = {
    "question": data['question'],
    "answer": "I would use FastAPI because it is extremely fast, asynchronous, and comes with automatic OpenAPI documentation."
}
response = client.post("/api/answer/evaluate", json=eval_payload)
assert response.status_code == 200, f"Answer evaluate failed: {response.text}"
eval_data = response.json()['data']
print(f"  Score: {eval_data.get('score')}/100")
print(f"  Feedback: {eval_data.get('feedback')}")
print("  [OK] Answer Evaluation OK")

# 4. Test Personality Analysis
print("\n[4] Testing /api/personality/analyze")
pers_payload = {
    "responses": [
        "I love working in teams and talking to people.",
        "I prefer to analyze data methodically before making decisions.",
        "I adapt quickly when requirements change."
    ]
}
response = client.post("/api/personality/analyze", json=pers_payload)
assert response.status_code == 200, f"Personality analysis failed: {response.text}"
pers_data = response.json()['data']
print(f"  Traits Detected: {', '.join(pers_data.get('dominant_traits', []))}")
print(f"  Introvert/Extrovert Score: {pers_data.get('introvert_extrovert')}")
print(f"  Thinker/Feeler Score: {pers_data.get('thinker_feeler')}")
print("  [OK] Personality Analysis OK")

# 5. Test Resume Parsing
print("\n[5] Testing /api/resume/parse")
resume_payload = {
    "resume_text": "Experienced software engineer with 5 years in Python, React, and AWS. Graduated from MIT."
}
response = client.post("/api/resume/parse", json=resume_payload)
assert response.status_code == 200, f"Resume parsing failed: {response.text}"
resume_data = response.json()['data']
print(f"  Extracted Skills: {', '.join(resume_data.get('skills', []))}")
print(f"  Has Experience: {resume_data.get('has_experience')}")
print(f"  Has Education: {resume_data.get('has_education')}")
print("  [OK] Resume Parsing OK")

print("\n" + "=" * 60)
print("[SUCCESS] All API Endpoint tests passed successfully!")
print("=" * 60)
