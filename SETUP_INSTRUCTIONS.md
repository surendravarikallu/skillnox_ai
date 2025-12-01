# Setup Instructions for Interview System

## 🚀 Quick Start

### 1. Start Python AI Service

The Python AI service must be running for the interview features to work:

```bash
cd python-ai
python services/api_service.py
```

**Expected Output**:
```
INFO:     Started server process
INFO:     Waiting for application startup.
Using fine-tuned LLM model  # or "Using base LLM model"
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2. Start Node.js Backend

In a separate terminal:

```bash
npm run dev
```

**Expected Output**:
```
serving on port 5000
```

### 3. Access the Application

Open your browser to: `http://localhost:5000`

## ✅ Verification Checklist

### Python Service
- [ ] Service running on port 8000
- [ ] Fine-tuned model loaded (check console for "Using fine-tuned LLM model")
- [ ] Health check: `curl http://localhost:8000/health`

### Node.js Backend
- [ ] Server running on port 5000
- [ ] Database connected
- [ ] Auth system working (can register/login)

### Frontend
- [ ] Can access login page
- [ ] Can create account
- [ ] Can start interview
- [ ] AI avatar visible
- [ ] Voice input working (browser permission)

## 🔧 Troubleshooting

### Python Service Not Starting
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Install missing dependencies
cd python-ai
pip install -r requirements.txt
```

### Fine-Tuned Model Not Loading
```bash
# Check if model exists
ls python-ai/models/finetuned_llm/

# Should see: adapter_config.json, adapter_model.safetensors
```

### Voice Input Not Working
- Check browser permissions (Chrome/Edge recommended)
- Ensure HTTPS or localhost (required for microphone access)
- Check browser console for errors

### Interview Not Starting
- Verify Python service is running
- Check browser console for API errors
- Verify database connection

## 📊 System Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Browser   │─────▶│  Node.js     │─────▶│   Python    │
│  (Frontend) │◀─────│  (Backend)   │◀─────│  AI Service │
└─────────────┘      └──────────────┘      └─────────────┘
     Port 5000           Port 5000            Port 8000
```

## 🎯 Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| User Authentication | ✅ | JWT-based |
| Interview Creation | ✅ | AI-generated questions |
| AI Avatar | ✅ | Animated, responsive |
| Voice Input | ✅ | Speech-to-text |
| Answer Evaluation | ✅ | AI-powered scoring |
| Emotion Analysis | ⚠️ | Needs optimization |
| Follow-up Questions | ⚠️ | Endpoint ready, needs integration |
| Real-time Voice Analysis | ⚠️ | Endpoint ready, needs streaming |

## 🔄 Next Steps

1. **Start both services** (Python + Node.js)
2. **Test interview flow**:
   - Create account
   - Start interview
   - Answer questions
   - Check results
3. **Verify AI features**:
   - Questions are AI-generated
   - Answers are evaluated
   - Avatar responds to interaction

## 📝 Environment Variables

Create `.env` file in root:

```env
# Database
DATABASE_URL=your_postgres_url

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Python AI Service
PYTHON_AI_SERVICE_URL=http://localhost:8000

# Server
PORT=5000
NODE_ENV=development
```

## 🎉 You're Ready!

Once both services are running, the interview system is fully functional with:
- ✅ AI-generated questions
- ✅ Animated AI interviewer avatar
- ✅ Voice input support
- ✅ Real-time evaluation
- ✅ Fine-tuned LLM for better results

