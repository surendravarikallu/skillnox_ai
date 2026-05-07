@echo off
REM Start Python AI Service for Windows

echo Starting Python AI Service...
echo Make sure you have trained the models first with: python train_all_models.py
echo.

cd /d "%~dp0"
set OLLAMA_FINETUNED_MODEL=skillnox-qwen:9b
python services\api_service.py
pause

