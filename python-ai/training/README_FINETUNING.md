# LLM Fine-Tuning Guide

This guide explains how to fine-tune the Qwen2.5-0.5B-Instruct model for interview and resume analysis tasks.

## Overview

The fine-tuning process uses **LoRA (Low-Rank Adaptation)** which is memory-efficient and only trains ~1.75% of the model parameters.

## Training Data

The training dataset includes:
- **Interview Question Generation**: Technical, HR, behavioral, and company-specific questions
- **Answer Evaluation**: Scoring and feedback for interview answers
- **Resume Analysis**: Skills extraction, experience level, education, and quality scoring
- **Job Description Matching**: Skill matching and gap analysis

**Current dataset size**: 44 examples (can be expanded)

## Quick Start

### 1. Prepare Training Data

```bash
cd python-ai
python training/prepare_llm_data.py
```

This creates:
- `datasets/llm_training_data.json` - Standard format
- `datasets/llm_training_chat.json` - Chat format for training

### 2. Install Dependencies

```bash
pip install peft datasets transformers accelerate
```

### 3. Run Fine-Tuning

```bash
python training/finetune_llm.py
```

**Note**: Training on CPU is slow (~3 minutes per step). For faster training:
- Use GPU if available (automatically detected)
- Reduce epochs or batch size
- Use fewer training examples

### Training Configuration

Current settings (in `finetune_llm.py`):
- **Epochs**: 3
- **Batch size**: 2 (per device)
- **Gradient accumulation**: 4 (effective batch size = 8)
- **Learning rate**: 2e-4
- **LoRA rank**: 16
- **LoRA alpha**: 32

### 4. Use Fine-Tuned Model

After training completes, the model is saved to:
```
models/finetuned_llm/
```

To use it, update `models/llm_models.py`:

```python
def get_llm(model_name: str = "models/finetuned_llm", use_lightweight: bool = False):
    # Use fine-tuned model
    _llm_instance = LocalLLM(model_name=model_name)
```

Or update `services/llm_service.py`:

```python
llm = get_llm(model_name="models/finetuned_llm", use_lightweight=False)
```

## Training Performance

### CPU Training
- **Speed**: ~3 minutes per step
- **Total time**: ~1-2 hours for 3 epochs (44 examples)
- **Memory**: ~4-6GB RAM

### GPU Training (if available)
- **Speed**: ~10-30 seconds per step
- **Total time**: ~10-20 minutes for 3 epochs
- **Memory**: ~6-8GB VRAM

## Expanding the Dataset

To improve model performance, add more training examples:

1. Edit `training/prepare_llm_data.py`
2. Add examples to:
   - `INTERVIEW_QUESTIONS_DATA`
   - `ANSWER_EVALUATION_DATA`
   - `RESUME_ANALYSIS_DATA`
   - `JD_MATCHING_DATA`
3. Run `prepare_llm_data.py` again
4. Retrain the model

## Tips for Better Results

1. **More Data**: Add 100+ examples for better generalization
2. **Diverse Examples**: Include various question types and difficulty levels
3. **Quality over Quantity**: Focus on high-quality, accurate examples
4. **Domain-Specific**: Add examples specific to your use case
5. **Iterative Training**: Train for more epochs if loss is still decreasing

## Troubleshooting

### Out of Memory
- Reduce batch size (currently 2)
- Reduce gradient accumulation steps
- Use smaller LoRA rank (currently 16)

### Training Too Slow
- Use GPU if available
- Reduce number of epochs
- Use fewer training examples initially

### Poor Results
- Add more training data
- Increase training epochs
- Adjust learning rate (try 1e-4 or 5e-4)
- Check training data quality

## Next Steps

After fine-tuning:
1. Test the model with `test_llm.py`
2. Compare results with base model
3. Iterate on training data based on results
4. Deploy fine-tuned model in production

