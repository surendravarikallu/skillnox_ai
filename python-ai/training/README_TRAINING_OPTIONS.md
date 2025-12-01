# Fine-Tuning Training Options

## Training Scripts Overview

### 1. `train_minimal.py` - Fastest (~5-10 minutes)
**Best for**: Quick testing, verifying setup works
- Uses only 10 training examples
- 1 epoch
- Very small LoRA rank (r=4)
- Short sequences (128 tokens)
- **Time**: ~5-10 minutes

```bash
python training/train_minimal.py
```

### 2. `finetune_llm_fast.py` - Fast (~20-30 minutes)
**Best for**: Good balance of speed and quality
- Uses 20 training examples
- 2 epochs
- Small LoRA rank (r=8)
- Medium sequences (256 tokens)
- **Time**: ~20-30 minutes

```bash
python training/finetune_llm_fast.py
```

### 3. `finetune_llm.py` - Full Training (~1-2 hours)
**Best for**: Best results, production use
- Uses all 44 training examples
- 3 epochs
- Standard LoRA rank (r=16)
- Full sequences (512 tokens)
- **Time**: ~1-2 hours on CPU

```bash
# Run in background (Windows PowerShell):
Start-Process python -ArgumentList "training/finetune_llm.py" -WindowStyle Minimized

# Or run normally:
python training/finetune_llm.py
```

## Running in Background

### Windows PowerShell
```powershell
# Start training in background (minimized window)
Start-Process python -ArgumentList "training/finetune_llm.py" -WindowStyle Minimized

# Start training in background (no window)
Start-Process python -ArgumentList "training/finetune_llm.py" -WindowStyle Hidden
```

### Check Training Status
```bash
python training/check_training_status.py
```

### Stop Training (if needed)
```bash
python training/stop_training.py
# Or use Task Manager to end python.exe processes
```

## Training Progress

The training will show progress like:
```
6%|██▎ | 1/18 [02:56<50:07, 176.89s/it]
```

This means:
- **6%** complete
- **1/18** steps done
- **02:56** elapsed
- **50:07** estimated remaining
- **176.89s/it** = ~3 minutes per step

## After Training Completes

1. **Check status**:
   ```bash
   python training/check_training_status.py
   ```

2. **Update service to use fine-tuned model**:
   ```bash
   python update_finetuned_model.py
   ```

3. **Test the model**:
   ```bash
   python test_llm.py
   ```

## Recommendations

- **First time?** → Use `train_minimal.py` to verify everything works
- **Want good results quickly?** → Use `finetune_llm_fast.py`
- **Best quality?** → Use `finetune_llm.py` (run in background)

## Troubleshooting

**Training too slow?**
- Use `train_minimal.py` or `finetune_llm_fast.py` instead
- Reduce epochs in the script
- Use fewer training examples

**Out of memory?**
- Reduce batch size
- Reduce max_length in tokenization
- Use smaller LoRA rank

**Want to monitor progress?**
- Run `check_training_status.py` periodically
- Check the model directory for checkpoint files

