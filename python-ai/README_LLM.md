# Local LLM Integration

This project now includes a **local Large Language Model (LLM)** for generating interview questions, evaluating answers, and other intelligent tasks - **all running locally without external APIs**.

## Why Local LLM?

A local LLM enables:
- **Dynamic Question Generation**: Generate unique interview questions based on context
- **Intelligent Answer Evaluation**: Understand context and provide detailed feedback
- **GD Topic Generation**: Create interesting discussion topics
- **Company-Specific Questions**: Generate questions tailored to specific companies
- **Resume Analysis**: More sophisticated resume parsing and analysis

## Supported Models

The system supports multiple local LLM options:

### Recommended (Lightweight)
1. **TinyLlama-1.1B** (Default)
   - Size: ~2.3 GB
   - Fast inference
   - Good for most tasks
   - Model: `TinyLlama/TinyLlama-1.1B-Chat-v1.0`

2. **Phi-3-mini-4k** (Better Quality)
   - Size: ~7.5 GB
   - Better instruction following
   - Model: `microsoft/Phi-3-mini-4k-instruct`

3. **Phi-2** (Balanced)
   - Size: ~5 GB
   - Good balance of quality and speed
   - Model: `microsoft/phi-2`

### Advanced (Requires More RAM)
4. **Mistral-7B-Instruct**
   - Size: ~14 GB
   - Best quality
   - Requires 16GB+ RAM
   - Model: `mistralai/Mistral-7B-Instruct-v0.2`

## Setup

### Quick Setup (Recommended)

**Windows:**
```bash
cd python-ai
install_llm.bat
```

**Linux/Mac:**
```bash
cd python-ai
chmod +x install_llm.sh
./install_llm.sh
```

**Manual Setup:**

1. Install Python dependencies:
```bash
pip install torch transformers accelerate sentencepiece tiktoken bitsandbytes protobuf
```

2. Download the model:
```bash
cd python-ai
python setup_llm.py
```

### Model Information

- **Model**: Qwen/Qwen2.5-0.5B-Instruct
- **Size**: ~1GB (very memory efficient)
- **Memory Usage**: ~2-3GB RAM when loaded
- **Download**: Automatic on first use, or use `setup_llm.py` to pre-download
- **Location**: Cached in `~/.cache/huggingface/hub/` (or similar)

### 3. Use in Code

```python
from models.llm_models import get_llm

# Get LLM instance (downloads model on first use)
llm = get_llm(use_lightweight=True)

# Generate question
question = llm.generate_question("technical")
print(question)

# Evaluate answer
result = llm.evaluate_answer(question, "My answer...")
print(result)
```

## API Endpoints

The LLM is integrated into the main API service:

### Generate Question
```bash
POST /api/llm/generate-question
{
  "question_type": "technical",  # or "hr", "behavioral", "project", "company"
  "company": "TCS",  # optional
  "context": "Software Engineer role"  # optional
}
```

### Generate GD Topic
```bash
POST /api/llm/generate-gd-topic
```

### Evaluate Answer (Enhanced)
```bash
POST /api/answer/evaluate
{
  "answer": "My answer...",
  "question": "Question text..."
}
```

## Usage in Node.js

```typescript
import * as pythonAI from "./pythonAI";

// Generate dynamic question
const question = await pythonAI.generateQuestion("technical", "TCS");

// Generate GD topic
const topic = await pythonAI.generateGDTopic();
```

## Performance

### TinyLlama (Default)
- **First Load**: ~30 seconds (downloads model)
- **Subsequent Loads**: ~5 seconds
- **Generation Speed**: ~2-5 seconds per question
- **RAM Usage**: ~4-6 GB

### Phi-3-mini
- **First Load**: ~2 minutes (downloads model)
- **Subsequent Loads**: ~10 seconds
- **Generation Speed**: ~3-7 seconds per question
- **RAM Usage**: ~8-10 GB

## Fallback Behavior

If the LLM fails to load or generate:
- System falls back to rule-based question generation
- Pre-defined question pools are used
- System continues to function normally

## Customization

### Change Model

Edit `python-ai/models/llm_models.py`:

```python
# Use Phi-3 instead of TinyLlama
llm = get_llm(
    model_name="microsoft/Phi-3-mini-4k-instruct",
    use_lightweight=False
)
```

### Adjust Generation Parameters

```python
# In llm_models.py, modify generate() method:
outputs = self.generator(
    prompt,
    max_length=200,      # Longer responses
    temperature=0.8,     # More creative (0.7 = balanced)
    top_p=0.95          # More diverse
)
```

## Troubleshooting

### Out of Memory
- Use TinyLlama instead of larger models
- Reduce `max_length` parameter
- Close other applications

### Slow Generation
- Use CPU quantization (already enabled)
- Reduce `max_length`
- Use TinyLlama for fastest speed

### Model Download Issues
- Check internet connection
- Ensure sufficient disk space (~10 GB free)
- Models are cached in `~/.cache/huggingface/`

## Benefits Over External APIs

✅ **No API Keys Required**
✅ **No Rate Limits**
✅ **Complete Privacy** (data never leaves your machine)
✅ **No Internet Required** (after initial download)
✅ **Free to Use**
✅ **Customizable** (fine-tune on your data)

## Next Steps

1. **Fine-tune on Interview Data**: Train on real interview Q&A pairs
2. **Domain-Specific Models**: Create models for specific industries
3. **Multi-turn Conversations**: Enable follow-up questions
4. **Context-Aware Generation**: Use candidate profile for personalized questions

## Example Output

**Generated Technical Question:**
> "Explain the difference between a stack and a queue data structure. When would you choose one over the other in a real-world application?"

**Generated HR Question:**
> "Tell me about a time when you had to work under pressure to meet a deadline. How did you manage your time and what was the outcome?"

**GD Topic:**
> "Is artificial intelligence a threat to human jobs, or will it create more opportunities than it eliminates?"

The LLM makes the interview system much more intelligent and dynamic!

