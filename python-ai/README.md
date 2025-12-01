# Python AI Module

This module contains all AI models for the Interview System, trained locally without external APIs.

## Structure

```
python-ai/
├── models/          # Model definitions
├── training/       # Training scripts
├── inference/      # Inference services
├── services/       # FastAPI microservice
├── utils/          # Utilities and data generation
└── datasets/       # Training datasets (generated)
```

## Setup

1. Install dependencies:
```bash
cd python-ai
pip install -r requirements.txt
```

2. Train all models:
```bash
python train_all_models.py
```

Or train individually:
```bash
python training/train_nlp_models.py
python training/train_emotion_model.py
python training/train_voice_model.py
python training/train_placement_model.py
```

3. Start the FastAPI service:
```bash
python services/api_service.py
```

The service will run on `http://localhost:8000`

## Models

### NLP Models
- **ResumeParser**: Extracts skills, experience, education from resumes
- **JDExtractor**: Extracts required skills from job descriptions
- **AnswerEvaluator**: Evaluates interview answers (technical/HR/behavioral)
- **PersonalityModel**: Detects personality traits from responses
- **ProjectEvaluator**: Evaluates project explanations
- **GD_Analyzer**: Analyzes group discussion performance

### Vision Models
- **EmotionCNN**: Detects emotions from facial expressions (FER2013-style)
  - 7 emotions: Angry, Disgust, Fear, Happy, Sad, Surprise, Neutral
  - Also outputs: confidence, eye contact, nervousness scores

### Audio Models
- **VoiceAnalyzer**: Analyzes voice characteristics
  - Metrics: fluency, grammar, tone, pace, filler words, clarity

### ML Models
- **PlacementPredictor**: Predicts placement probability (30/60/90 days)
- **SkillGapAnalyzer**: Analyzes skill gaps between resume and JD
- **ResumeScorer**: Scores resume quality

## API Endpoints

The FastAPI service provides the following endpoints:

- `POST /api/resume/parse` - Parse resume
- `POST /api/resume/score` - Score resume
- `POST /api/jd/extract` - Extract JD skills
- `POST /api/answer/evaluate` - Evaluate answer
- `POST /api/personality/analyze` - Analyze personality
- `POST /api/emotion/analyze` - Analyze emotion from image
- `POST /api/voice/analyze` - Analyze voice from audio
- `POST /api/placement/predict` - Predict placement probability
- `POST /api/skill-gap/analyze` - Analyze skill gap

## Environment Variables

- `PYTHON_AI_SERVICE_URL`: URL of Python AI service (default: http://localhost:8000)
- `DEVICE`: Device to use for inference ('cpu' or 'cuda')

## Notes

- Models are saved in `models/saved/` after training
- Synthetic data is generated for training (in production, use real datasets)
- All models work without external APIs - everything runs locally
- The service gracefully falls back to simple heuristics if models aren't loaded

