# AI Models Setup Guide

This project now includes complete AI models trained locally without external APIs.

## Quick Start

### 1. Install Python Dependencies

```bash
cd python-ai
pip install -r requirements.txt
```

### 2. Train All Models

```bash
python train_all_models.py
```

This will train:
- NLP models (resume parser, answer evaluator, personality model)
- Emotion detection CNN
- Voice analysis model
- Placement probability predictor

Training may take 10-30 minutes depending on your hardware.

### 3. Start Python AI Service

```bash
# Linux/Mac
./start_service.sh

# Windows
start_service.bat

# Or directly
python services/api_service.py
```

The service will run on `http://localhost:8000`

### 4. Start Node.js Backend

The Node.js backend is already configured to communicate with the Python service. Just start it as usual:

```bash
npm run dev
```

## Model Architecture

### NLP Models
- **ResumeParser**: LSTM-based model for extracting skills, experience, education
- **AnswerEvaluator**: LSTM with attention for evaluating interview answers
- **PersonalityModel**: LSTM for detecting personality traits from responses
- **JDExtractor**: Extracts required skills from job descriptions

### Vision Models
- **EmotionCNN**: CNN trained on FER2013-style data
  - Detects 7 emotions: Angry, Disgust, Fear, Happy, Sad, Surprise, Neutral
  - Outputs confidence, eye contact, nervousness scores

### Audio Models
- **VoiceAnalyzer**: Neural network analyzing:
  - Fluency, Grammar, Tone, Pace, Filler words, Clarity
  - Uses librosa for feature extraction (MFCC, chroma, mel spectrogram)

### ML Models
- **PlacementPredictor**: Predicts placement probability for 30/60/90 days
  - Uses features: resume score, JD score, technical score, HR score, GD score, emotion, voice, personality

## API Integration

The Node.js backend automatically calls the Python service. If the service is unavailable, it falls back to simple heuristics.

### Environment Variables

Set `PYTHON_AI_SERVICE_URL` if the service runs on a different port:
```bash
export PYTHON_AI_SERVICE_URL=http://localhost:8000
```

## Model Files

Trained models are saved in `python-ai/models/saved/`:
- `resume_parser.pth`
- `answer_evaluator.pth`
- `personality_model.pth`
- `emotion_cnn.pth`
- `voice_analyzer.pth`
- `placement_predictor.pth`

## Troubleshooting

1. **Models not loading**: Make sure you've trained the models first
2. **Service not starting**: Check if port 8000 is available
3. **Import errors**: Make sure all Python dependencies are installed
4. **CUDA errors**: Models default to CPU; set `device='cuda'` if you have GPU

## Production Notes

- In production, replace synthetic data with real datasets
- Fine-tune models on domain-specific data
- Consider using larger models for better accuracy
- Add model versioning and A/B testing

## Next Steps

1. Train models on real interview data
2. Fine-tune on company-specific patterns
3. Add more sophisticated NLP models (BERT, GPT-style)
4. Improve emotion detection with real FER2013 dataset
5. Enhance voice analysis with more features

