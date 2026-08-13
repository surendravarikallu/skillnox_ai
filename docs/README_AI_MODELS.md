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
  │ Local LLM    │       │ Resume Parser│ │ Answer    │ │ Emotion      │      │ Placement    │
  │ Generator    │       │ (spaCy/NLP)  │ │ Evaluator │ │ & Voice      │      │ Predictor    │
  │ Qwen2.5 /    │       │              │ │ (Embeds)  │ │ (CV/Librosa) │      │ (Scikit)     │
  │ TinyLlama    │       └──────────────┘ └───────────┘ └──────────────┘      └──────────────┘
  └──────────────┘
```

---

## Models Breakdown

### 1. Dynamic Question Generator (LLM)
- **Primary Model**: `Qwen/Qwen2.5-7B-Instruct` or `TinyLlama/TinyLlama-1.1B-Chat-v1.0`
- **Location**: Downloaded locally to `python-ai/models/` or loaded via HuggingFace Transformers pipeline.
- **Fine-Tuning**: Custom QLoRA fine-tuning pipeline available under `python-ai/training/` (Google Colab optimized).
- **Purpose**: Generates company-specific, round-aware technical, behavioral, and HR questions based on target job description skills.

### 2. Resume Parser & ATS Match Engine
- **Libraries**: `spaCy` (`en_core_web_sm`), `pdfjs-dist`, `PyMuPDF` / `pdf-parse`
- **Purpose**: Extract structured contact info, technical skills array, education history, and experience timeline from uploaded PDF/Word resumes.
- **Matching Metric**: TF-IDF cosine similarity & semantic embedding distance against required Job Description (JD) skills.

### 3. Answer Evaluation Engine
- **Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Purpose**: Computes semantic embedding similarity between candidate responses and reference model answers. Generates granular feedback on relevance, technical accuracy, and completeness.

### 4. Facial Emotion Analysis (Experimental)
- **Framework**: `PyTorch` + `OpenCV` + `FER`
- **Purpose**: Processes webcam frames during live interview sessions to quantify facial expressions (confidence, neutrality, nervousness, smile index).

### 5. Audio & Voice Tone Analysis (Experimental)
- **Framework**: `Librosa`, `Faster-Whisper`
- **Purpose**: Analyzes speech acoustics (pitch variation, speech rate in words-per-minute, pause frequency, jitter) to calculate voice confidence scores.

### 6. Placement Probability Predictor
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
