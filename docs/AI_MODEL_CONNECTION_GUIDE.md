# AI Model Connection Guide

## Architecture Overview

Skilnox AI combines a fast **Node.js/Express** application server with a high-performance **Python FastAPI** AI microservice.

```
┌─────────────────────────┐               ┌─────────────────────────┐
│     Client (React)      │               │     Node.js Server      │
│  http://localhost:5000  │ ────────────> │  http://localhost:5000  │
└─────────────────────────┘               └───────────┬─────────────┘
                                                      │
                                                      │ HTTP / REST
                                                      │ (Failover Enabled)
                                                      ▼
                                          ┌─────────────────────────┐
                                          │    Python AI Service    │
                                          │  http://localhost:8000  │
                                          │   (FastAPI + PyTorch)   │
                                          └─────────────────────────┘
```

---

## Connection & Health Verification

### 1. Verification via Web Dashboard

Navigate to `http://localhost:5000/ai-status` in your browser. The page queries the `/api/ai/health` backend route, which checks the Python microservice status and reports:
- Connection Status (`connected` / `degraded` / `disconnected`)
- Loaded ML Models (LLM, Resume Parser, Evaluator, Voice/Emotion Models)
- Latency (ms)
- Active STT/TTS Providers (Groq Cloud / Local Faster-Whisper / Edge-TTS)

### 2. Verification via Command Line

#### Direct Python Service Health Check
```bash
# Test raw Python service health
curl http://localhost:8000/health

# Run automated Python diagnostic script
cd python-ai
python test_connection.py
```

#### Node.js Connection Test
```bash
# Run Node.js integration health check
npm run test:python
```

---

## Configuration & Environment Variables

The connection between Node.js and Python is configured in your `.env` file:

```env
# Python AI Service URL (Default: http://localhost:8000)
PYTHON_AI_SERVICE_URL=http://localhost:8000

# Optional API Key for securing microservice endpoints
AI_SERVICE_API_KEY=your_optional_secret_key
```

---

## Resilient Fallback Mechanics

Skilnox AI implements graceful degradation:

1. **LLM Question Generation Fallback**: If the local LLM or Python API times out (>60s) or fails, Node backend automatically loads questions from the pre-populated `COMPANY_QUESTION_BANK` in `server/company-questions.ts`.
2. **STT Failover**: Primary Speech-to-Text uses Groq Cloud Whisper API (3-key failover). If Groq is unavailable, it fails over to the Python microservice Faster-Whisper engine.
3. **Evaluation Fallback**: If answer evaluation fails on the AI service, Node uses rule-based semantic metrics (keyword relevance, length, structure) to ensure the user never gets an unhandled error.

---

## Troubleshooting Checklist

| Symptom | Cause | Resolution |
| :--- | :--- | :--- |
| `/api/ai/health` returns `disconnected` | Python service not running | Start Python service: `cd python-ai && python services/api_service.py` |
| `ECONNREFUSED 127.0.0.1:8000` | Port mismatch | Verify `PYTHON_AI_SERVICE_URL` in `.env` matches the Python service port |
| `401 Unauthorized` | API Key mismatch | Ensure `AI_SERVICE_API_KEY` matches in both `.env` and Python config |
| Long response times (>10s) | First-time LLM model download | Wait for model weights download to complete in `python-ai/models/` |
