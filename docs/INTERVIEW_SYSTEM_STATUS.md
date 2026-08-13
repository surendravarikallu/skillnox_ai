# Skilnox AI System Capability & Module Status

## System Feature Matrix

The table below outlines the current status of all core modules and services in Skilnox AI.

| Module / Feature | Status | Technology Stack | Notes & Capabilities |
| :--- | :---: | :--- | :--- |
| **Role-Based Authentication** | ✅ Production | Passport.js, JWT, bcryptjs | Admin & Student roles, secure cookie storage |
| **Admin Control Panel** | ✅ Production | React, Drizzle ORM, Express | Admin-only slot assignment, student roster management |
| **Company Interview Drills** | ✅ Production | Express, Rule Engine, Local LLM | Patterns for TCS, Infosys, Wipro, Accenture, Amazon |
| **AI Question Generation** | ✅ Production | Qwen2.5-7B / TinyLlama / Fallback Bank | Context-aware dynamic question generation |
| **Resume Parser & ATS Match** | ✅ Production | spaCy, PyMuPDF, pdfjs-dist | Skill extraction, ATS match score, skill gap identification |
| **Speech-to-Text (STT)** | ✅ Production | Groq Cloud Whisper / Faster-Whisper | Dual-path transcription with 3-key failover |
| **Text-to-Speech (TTS)** | ✅ Production | Edge-TTS / Python TTS | Real-time audio voice synthesis for AI avatar |
| **Answer Evaluation Engine** | ✅ Production | Sentence-Transformers, Node Queue | Evaluates clarity, technical depth, and relevance |
| **Placement Probability Predictor**| ✅ Production | Scikit-Learn ML Model | Predicts 30/60/90 day placement odds |
| **Emotion Analysis** | ⚠️ Experimental | OpenCV, PyTorch | Real-time facial sentiment analysis during video feed |
| **Voice Tone Analysis** | ⚠️ Experimental | Librosa, PyTorch | Audio pitch and speech rate confidence scoring |
| **3D Avatar & WebRTC Sync** | 🚧 Roadmap | WebRTC, Canvas / Three.js | Real-time lipsync and dynamic avatar expression |

---

## Architecture Components

1. **Frontend Web Client (`client/`)**: Built with React 18, Vite, TailwindCSS, Radix UI primitives, Framer Motion animations, and TanStack React Query.
2. **Application Server (`server/`)**: Express.js server running TypeScript with Drizzle ORM PostgreSQL integration, background evaluation queues, and email notifications.
3. **AI Microservice (`python-ai/`)**: FastAPI server powering local LLM inference, spaCy NLP pipelines, PyTorch computer vision models, and Scikit-learn placement classifiers.
4. **Shared Definitions (`shared/`)**: TypeScript schemas, Zod validation models, and Drizzle table definitions shared across client and server.

---

## Known Issues & Operating Parameters

- **CPU LLM Latency**: When running Qwen2.5-7B on CPU without GPU acceleration, initial response generation may take up to 5-10 seconds. Heuristic fallbacks kick in automatically if requests exceed the timeout window.
- **Microphone Browser Permissions**: STT functionality requires standard HTTPS or `localhost` context for browser MediaRecorder permissions.
