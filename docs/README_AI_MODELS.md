## AI Models Setup Guide

Moved here from `README_AI_MODELS.md` at the project root.

Summary:
- Install Python deps in `python-ai` with `pip install -r requirements.txt`.
- Train all models via `python train_all_models.py` (resume parser, answer evaluator, personality, emotion, voice, placement).
- Start the AI service (`./start_service.sh` or `start_service.bat` or `python services/api_service.py`) on `http://localhost:8000`.
- Start Node backend with `npm run dev`; backend talks to Python service and falls back to heuristics if unavailable.


