# AI Model Connection Guide

This guide explains how to verify that the AI model is working correctly and connected to the website.

## Quick Status Check

### Option 1: Via Website (Recommended)
1. Start both servers:
   ```bash
   # Terminal 1: Start Node.js backend
   npm run dev
   
   # Terminal 2: Start Python AI service
   cd python-ai
   python services/api_service.py
   ```

2. Open the website and navigate to: **http://localhost:5000/ai-status**
   - This page shows real-time connection status
   - Displays Python service health
   - Shows LLM model loading status
   - Allows testing question generation

### Option 2: Via Command Line

#### Test Python Service Directly
```bash
cd python-ai
python test_connection.py
```

#### Test from Node.js Backend
```bash
npm run test:python
```

## What to Check

### ✅ Model is Working Correctly If:

1. **Python Service is Running**
   - Service responds at `http://localhost:8000/health`
   - Returns `{"status": "healthy", "llm_status": "loaded"}`

2. **LLM Model Loads Successfully**
   - Check Python service logs for: `"✓ LLM loaded successfully!"`
   - Health endpoint shows `llm_status: "loaded"`

3. **Question Generation Works**
   - Can generate questions via `/api/llm/generate-question`
   - Questions are relevant and properly formatted

4. **Node.js Can Connect**
   - `/api/ai/health` endpoint returns connection status
   - No connection errors in Node.js logs

### ❌ Common Issues and Fixes

#### Issue: Python Service Not Running
**Symptoms:**
- `/api/ai/health` returns `connected: false`
- Error: "Cannot connect to Python service"

**Fix:**
```bash
cd python-ai
python services/api_service.py
```

#### Issue: LLM Model Not Loading
**Symptoms:**
- Python service starts but `llm_status: "error"`
- Logs show model loading errors

**Fix:**
1. Check if model is downloaded:
   ```bash
   cd python-ai
   python -c "from transformers import AutoModelForCausalLM; AutoModelForCausalLM.from_pretrained('Qwen/Qwen2.5-0.5B-Instruct')"
   ```
2. Ensure sufficient RAM (model needs ~2GB)
3. Check Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

#### Issue: Connection Timeout
**Symptoms:**
- Health check times out
- Questions take too long to generate

**Fix:**
1. Ensure Python service is on port 8000
2. Check firewall settings
3. Verify `PYTHON_AI_SERVICE_URL` environment variable

## Testing the Connection

### 1. Health Check Endpoint
```bash
curl http://localhost:8000/health
```
Expected response:
```json
{
  "status": "healthy",
  "llm_status": "loaded",
  "service": "AI Interview System API",
  "version": "1.0.0"
}
```

### 2. Question Generation Test
```bash
curl -X POST http://localhost:8000/api/llm/generate-question \
  -H "Content-Type: application/json" \
  -d '{"question_type": "technical"}'
```

### 3. From Node.js Backend
```bash
curl http://localhost:5000/api/ai/health
```

## Monitoring

### Check Python Service Logs
When starting the Python service, you should see:
```
Loading local LLM: Qwen/Qwen2.5-0.5B-Instruct
This may take a few minutes on first run...
✓ LLM loaded successfully!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Check Node.js Backend Logs
When creating an interview, you should see:
```
Python AI service is available, generating LLM questions
```

## Troubleshooting Checklist

- [ ] Python service is running on port 8000
- [ ] Node.js backend is running on port 5000
- [ ] LLM model is loaded (check `/health` endpoint)
- [ ] No firewall blocking localhost connections
- [ ] Python dependencies are installed
- [ ] Sufficient RAM available (~2GB for model)
- [ ] Internet connection (for first-time model download)

## Next Steps

Once connection is verified:
1. Create a test interview to verify question generation
2. Check that questions are being spoken by AI avatar
3. Verify voice-to-text is working for answers
4. Test answer evaluation

For more details, visit: **http://localhost:5000/ai-status**

