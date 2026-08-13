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

The connection between Node.js and Python, as well as cloud API providers, is configured in your `.env` file:

```env
# Python AI Service URL (Default: http://localhost:8000)
PYTHON_AI_SERVICE_URL=http://localhost:8000

# NVIDIA NIM Cloud API Key (Primary LLM & Vision Engine)
NVIDIA_API_KEY=nvapi-your_nvidia_api_key
# NVIDIA_API_KEYS=nvapi-key1,nvapi-key2  # Multi-key rotation
NVIDIA_MODEL=meta/llama-3.1-8b-instruct

# Groq Cloud Speech-to-Text Keys
GROQ_API_KEYS=gsk_key1,gsk_key2
GROQ_STT_MODEL=whisper-large-v3-turbo

# Local Ollama Fallback Engine
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:9b
```

---

## Resilient Fallback Mechanics

Skilnox AI implements multi-tier graceful degradation:

1. **NVIDIA NIM LLM Cloud API → Local Ollama Fallback**: If `NVIDIA_API_KEY` is present, all question generation, answer evaluations, and resume analyses use NVIDIA NIM (`meta/llama-3.1-8b-instruct`). If the NVIDIA API key is missing or fails, requests fail over to the local Ollama LLM (`qwen3.5:9b`).
2. **NVIDIA Vision API → HSEmotion Fallback**: Webcam frame emotion analysis uses NVIDIA Vision (`meta/llama-3.2-11b-vision-instruct`). If unavailable, it falls back to local PyTorch `HSEmotionRecognizer`.
3. **Groq Cloud STT → Local Whisper Fallback**: Speech-to-Text uses Groq Cloud Whisper API (3-key failover for ~0.15s responses). If Groq is unavailable, it fails over to local `Faster-Whisper`.
4. **Question Bank Fallback**: If LLM services time out (>60s) or fail, Node backend loads fallback questions from `COMPANY_QUESTION_BANK` in `server/company-questions.ts`.

---

## Troubleshooting Checklist

| Symptom | Cause | Resolution |
| :--- | :--- | :--- |
| `/api/ai/health` returns `disconnected` | Python service not running | Start Python service: `cd python-ai && python services/api_service.py` |
| `ECONNREFUSED 127.0.0.1:8000` | Port mismatch | Verify `PYTHON_AI_SERVICE_URL` in `.env` matches the Python service port |
| `401 Unauthorized` | API Key mismatch | Ensure `AI_SERVICE_API_KEY` matches in both `.env` and Python config |
| Long response times (>10s) | First-time LLM model download | Wait for model weights download to complete in `python-ai/models/` |
