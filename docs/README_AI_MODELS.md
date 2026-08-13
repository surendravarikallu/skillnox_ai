# AI Models & Machine Learning Architecture Guide

## Overview

Skilnox AI integrates a multi-model Machine Learning engine residing in the `python-ai/` directory. The service exposes FastAPI REST endpoints consumed by the main Node.js backend.

---

## Machine Learning Pipeline Architecture

```
                                  ┌───────────────────────────┐
                                  │      Input Payloads       │
                                  └─────────────┬─────────────┘
                                                │
          ┌──────────────────────┬──────────────┼──────────────┬──────────────────────┐
          │                      │              │              │                      │
          ▼                      ▼              ▼              ▼                      ▼
  ┌──────────────┐       ┌──────────────┐ ┌───────────┐ ┌──────────────┐      ┌──────────────┐
  │ NVIDIA NIM   │       │ Resume Parser│ │ Answer    │ │ Vision &     │      │ Placement    │
  │ LLM API      │       │ (spaCy/LLM)  │ │ Evaluator │ │ Audio APIs   │      │ Predictor    │
  │ (Llama-3.1)  │       │              │ │ (LLM/NIM) │ │ (NVIDIA/Groq)│      │ (Scikit)     │
  └──────┬───────┘       └──────────────┘ └───────────┘ └──────┬───────┘      └──────────────┘
         │                                                     │
         ▼ (Fallback)                                          ▼ (Fallback)
  ┌──────────────┐                                      ┌──────────────┐
  │ Local Ollama │                                      │ HSEmotion /  │
  │ (Qwen Model) │                                      │ Whisper Local│
  └──────────────┘                                      └──────────────┘
```

---

## Models Breakdown

### 1. Dynamic Question Generator & Evaluator (LLM)
- **Primary Engine**: **NVIDIA NIM Cloud API** (`meta/llama-3.1-8b-instruct`) via high-speed OpenAI-compatible REST completions endpoint (`https://integrate.api.nvidia.com/v1/chat/completions`).
- **Multi-Key & Rate-Limit Resilience**: Supports multi-key pools (`NVIDIA_API_KEYS`), automatic retry logic with backoff for HTTP 429 rate limiting, and multi-socket async concurrency.
- **Local Fallback**: Local Ollama server (`qwen3.5:9b` / `skillnox-qwen`) if NVIDIA API key is not supplied or cloud API is unreachable.
- **Purpose**: Generates company-specific technical, behavioral, and HR questions along with instant answer evaluation, score breakdown, and ideal response suggestions.

### 2. Resume Parser & ATS Match Engine
- **Engine**: Combined ATS + Technical Depth Evaluator powered by NVIDIA NIM / Ollama Jinja prompt templates.
- **Libraries**: `spaCy`, `PyMuPDF`, `pdf-parse`, Jinja2 prompt rendering engine.
- **Purpose**: Extracts structured contact details, skills, experience, and education, scoring resume relevance against Job Description (JD) keywords and technical depth.

### 3. Facial Emotion & Composure Analysis
- **Primary Engine**: **NVIDIA Vision API** (`meta/llama-3.2-11b-vision-instruct`). Analyzes base64-encoded webcam frames to extract emotion, composure, eye contact, and confidence metrics.
- **Local Fallback**: Pretrained `HSEmotionRecognizer` (ResNet model `enet_b0_8_best_afew`) + OpenCV Haar Cascade face detection.

### 4. Audio & Speech-to-Text (STT) Analysis
- **Primary STT**: **Groq Cloud Whisper API** (`whisper-large-v3-turbo`) with 3-key rotation for sub-second (~0.15s) speech transcription.
- **Secondary STT / Local Fallback**: NVIDIA Cloud STT / Local `Faster-Whisper` (`large-v3-turbo` with `int8` quantization).
- **Acoustic Analysis**: `Librosa` feature extractor analyzing pitch variation (Hz), pause frequency, speaking pace (syllables/min), and filler word ratio.

### 5. Placement Probability Predictor
- **Algorithm**: `RandomForestClassifier` / `GradientBoostingClassifier`
- **Inputs**: Resume Score, JD Match Score, Technical Interview Score, HR Score, GD Score, Emotion Score, Voice Score.
- **Output**: Estimated probability of securing a job offer within 30, 60, and 90 days.

---

## Local Model Download & Setup

To download and set up all local model weights:

### Automatic Download Helper

- **Windows**:
  ```bash
  python-ai\install_llm.bat
  ```

- **Linux / macOS**:
  ```bash
  chmod +x python-ai/install_llm.sh
  ./python-ai/install_llm.sh
  ```

### Training & Retraining Models

To retrain the evaluation and placement predictor models with updated datasets:

```bash
cd python-ai
python train_all_models.py
```

This updates model binary files saved in `python-ai/models/`:
- `placement_model.pkl`
- `resume_parser_model.bin`
- `answer_evaluator.pt`
