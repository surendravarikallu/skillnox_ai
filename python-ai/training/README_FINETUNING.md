# LLM Fine-Tuning Guide

This guide explains how to fine-tune the Qwen3-8B model for interview and resume analysis tasks.

## Overview

The fine-tuning process uses **QLoRA (Quantized Low-Rank Adaptation)** via Unsloth which is memory-efficient and trains only ~2-3% of the model parameters while the base model stays in 4-bit quantization.

## Training Data

The training dataset includes **50,000 examples** across 6 categories:
- **Resume Analysis** (15,000): Skills extraction, scoring, JD matching
- **Answer Evaluation** (15,000): Scoring and feedback for interview answers
- **Question Generation** (10,000): Technical, HR, behavioral, aptitude, coding, situational
- **Communication Evaluation** (3,000): Clarity, fluency, tone, structure assessment
- **Group Discussion** (3,000): GD response evaluation and feedback
- **Aptitude Evaluation** (4,000): Quantitative, logical reasoning assessment

## Quick Start — Kaggle (Recommended)

### 1. Generate Expanded Dataset

```bash
cd python-ai
python training/generate_extended_dataset.py
```

This creates `datasets/extended_training_data.jsonl` (~25 MB, 50,000 examples).

### 2. Upload Dataset to Kaggle

```bash
python training/monitor_kaggle.py --push-dataset
```

Or manually:
1. Go to https://www.kaggle.com/datasets
2. Click "New Dataset"
3. Upload `extended_training_data.jsonl`
4. Name it `skillnox-training-data`

### 3. Upload Notebook to Kaggle

```bash
python training/monitor_kaggle.py --push-notebook
```

Or manually:
1. Go to https://www.kaggle.com/code
2. Click "New Notebook"
3. Import `training/Skillnox_Kaggle_Finetune_V2.ipynb`
4. Settings → Accelerator: **GPU P100**
5. Settings → Internet: **ON**
6. Add dataset: `skillnox-training-data`

### 4. Run Training

**Interactive mode** (recommended for first run):
- Open the notebook, run cells one by one
- Watch for errors and adjust config in Cell 2

**Batch mode** (for unattended training):
- Click "Commit" → "Run All" to run as a batch session
- Training runs for ~8-10 hours

### 5. Monitor Training

```bash
# Check status once
python training/monitor_kaggle.py

# Watch mode — checks every 5 minutes
python training/monitor_kaggle.py --watch

# Watch with custom interval (every 2 minutes)
python training/monitor_kaggle.py --watch --interval 120
```

### 6. Download Trained Model

```bash
python training/monitor_kaggle.py --download
```

Or download from the notebook's Output tab on Kaggle.

### 7. Deploy Locally

```bash
# Copy the GGUF file to models/
cp kaggle_output/*.gguf python-ai/models/

# Update Modelfile
# Edit models/Modelfile line 1: FROM ./unsloth.Q4_K_M.gguf

# Create Ollama model
ollama create skillnox-qwen:latest -f python-ai/models/Modelfile

# Test
ollama run skillnox-qwen:latest

# Start service
cd python-ai && start_service.bat
```

## Training Configuration (V2 Notebook)

| Parameter | Value | Notes |
|---|---|---|
| Model | Qwen3-8B (4-bit) | Via Unsloth pre-quantized |
| LoRA Rank | 32 | Higher than V1 (was 16) |
| LoRA Alpha | 64 | 2x rank |
| Epochs | 5 | Configurable |
| Batch Size | 2 (eff. 8) | 2 per device × 4 grad accum |
| Learning Rate | 2e-4 | Cosine schedule with warmup |
| Sequence Length | 1024 | Max tokens per example |
| Checkpoints | Every 500 steps | Keep last 3 |
| Validation | Every 500 steps | 5% held out |

## Checkpoint Resume

If training gets interrupted (session timeout, error, etc.):

1. **Re-open** the notebook on Kaggle
2. **Run Cells 1-4** (fast — installs deps, loads data/model)
3. **Run Cell 5** — it will automatically detect the last checkpoint and resume

The notebook stores checkpoints at `/kaggle/working/output/checkpoint-*`. With `RESUME_FROM_CHECKPOINT = True` (default), it finds the latest one automatically.

## Multi-Session Training

If your training needs more than 12 hours:

1. Set `NUM_EPOCHS = 3` in the first session
2. After completion, commit the notebook (saves checkpoints as output)
3. In a new session, add the previous notebook's output as input
4. Copy checkpoints: `cp /kaggle/input/your-notebook/output/* /kaggle/working/output/`
5. Set remaining epochs and run — it resumes from the checkpoint

## Local Training (CPU/GPU)

For local training (slower, limited to smaller models):

```bash
cd python-ai
python training/finetune_llm.py
```

See [README_TRAINING_OPTIONS.md](README_TRAINING_OPTIONS.md) for local training options.

## Troubleshooting

### Out of Memory on Kaggle
- Reduce `BATCH_SIZE` to 1
- Reduce `LORA_RANK` to 16
- Reduce `MAX_SEQ_LEN` to 512

### Training Too Slow
- Check GPU is enabled (Settings → Accelerator)
- Reduce `NUM_EPOCHS`
- Set `MAX_EXAMPLES = 25000` to use fewer examples

### Session Timeout
- Training auto-saves checkpoints every 500 steps
- Re-run the notebook — it resumes from the last checkpoint
- Use batch mode (Commit) instead of interactive to avoid idle timeout

### Overfitting (eval loss increasing)
- Reduce epochs (check Cell 6 loss plot)
- Increase `LORA_DROPOUT` to 0.1
- Reduce `LORA_RANK` to 16

### Poor Results
- Add more training data (expand dataset generator)
- Increase training epochs
- Increase `LORA_RANK` for more model capacity
- Check training data quality — remove duplicates/errors
