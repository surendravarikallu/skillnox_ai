@echo off
echo ========================================
echo Installing Qwen2.5-0.5B-Instruct LLM
echo ========================================
echo.

echo Step 1: Installing Python dependencies...
pip install torch transformers accelerate sentencepiece tiktoken --quiet

echo.
echo Step 2: Downloading model (this may take a few minutes)...
python setup_llm.py

echo.
echo Setup complete!
pause

