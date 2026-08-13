# AI Microservice Connection Troubleshooting & Fix Guide

## Problem Statement

When launching Skilnox AI, the Node.js Express server may report that the Python AI Microservice is `disconnected` or returning status code `500` / `ECONNREFUSED`.

---

## Root Causes & Optimizations

1. **Service Startup Order**: Express was initialized before FastAPI finished loading PyTorch and LLM models.
2. **Port Mismatch**: `PYTHON_AI_SERVICE_URL` pointed to `http://localhost:8060` or `http://localhost:6000` while FastAPI was bound to `http://localhost:8000`.
3. **Heavy Initialization Locks**: The `/health` endpoint previously executed dummy model inference on every health check, causing HTTP request timeouts under high load.

---

## Implemented Fixes

### 1. Ultra-Fast Python Health Endpoint
The Python microservice `/health` endpoint was optimized to verify in-memory model availability rather than triggering cold LLM text generation.

### 2. Multi-Level Health Probing
Node.js client `server/pythonAI.ts` now probes the fast root (`GET /`) endpoint first, falling back to `/health` only if necessary.

### 3. Connection Timeout Extension
Fetch timeout for Python AI requests was updated to `60000ms` (60 seconds) to accommodate CPU-only inference workloads on local devices.

---

## Step-by-Step Resolution

### Step 1: Verify Python Dependencies & Virtual Environment

```bash
cd python-ai

# Verify virtual environment (if using venv)
# Windows:
.\venv\Scripts\activate

# Install missing requirements
pip install -r requirements.txt
```

### Step 2: Start Python Service Separately

```bash
cd python-ai
python services/api_service.py
```
*Expected Output:*
```
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### Step 3: Validate Direct Service Endpoints

Open a new terminal or browser tab:

```bash
# Check Python Service Root Status
curl http://localhost:8000/

# Check Detailed Health Endpoint
curl http://localhost:8000/health
```

### Step 4: Verify `.env` Configuration

Ensure your root `.env` file specifies the exact URL:
```env
PYTHON_AI_SERVICE_URL=http://localhost:8000
```

### Step 5: Test Node.js Bridge

```bash
# From project root
npm run check
curl http://localhost:5000/api/ai/health
```
You should receive:
```json
{
  "status": "connected",
  "serviceUrl": "http://localhost:8000",
  "timestamp": "2026-08-13T10:00:00.000Z"
}
```
