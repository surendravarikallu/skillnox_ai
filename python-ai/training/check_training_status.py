"""
Check the status of fine-tuning training
Shows progress and logs
"""

from pathlib import Path
import json
import os
from datetime import datetime

def check_training_status():
    """Check if training is running or completed"""
    print("=" * 60)
    print("Fine-Tuning Status Check")
    print("=" * 60)
    
    # Check for model directory
    model_dir = Path(__file__).parent.parent / "models" / "finetuned_llm"
    
    if model_dir.exists():
        print("\n[1] Model Directory Status:")
        print(f"  Location: {model_dir}")
        
        # Check for adapter files
        adapter_config = model_dir / "adapter_config.json"
        adapter_model = model_dir / "adapter_model.safetensors"
        
        if adapter_config.exists() and adapter_model.exists():
            print("  ✓ Fine-tuned model files found!")
            
            # Get file sizes
            config_size = adapter_config.stat().st_size / 1024  # KB
            model_size = adapter_model.stat().st_size / (1024 * 1024)  # MB
            
            print(f"  - Config: {config_size:.2f} KB")
            print(f"  - Model: {model_size:.2f} MB")
            
            # Get modification time
            mod_time = datetime.fromtimestamp(adapter_model.stat().st_mtime)
            print(f"  - Last updated: {mod_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            print("\n[2] Training Status: ✓ COMPLETE")
            print("\nTo use the fine-tuned model:")
            print("  python update_finetuned_model.py")
            print("\nOr test it:")
            print("  python test_llm.py")
            
        else:
            print("  ⚠ Model files not found yet")
            print("  Training may still be in progress...")
    else:
        print("\n[1] Model Directory Status:")
        print("  ⚠ Model directory not found")
        print("  Training may not have started yet")
    
    # Check for training logs
    print("\n[3] Training Logs:")
    log_files = list(model_dir.glob("*.log")) if model_dir.exists() else []
    
    if log_files:
        latest_log = max(log_files, key=lambda p: p.stat().st_mtime)
        print(f"  Found log: {latest_log.name}")
        print(f"  Last modified: {datetime.fromtimestamp(latest_log.stat().st_mtime)}")
    else:
        print("  No log files found")
    
    # Check for checkpoints
    print("\n[4] Checkpoints:")
    checkpoint_dirs = [d for d in model_dir.iterdir() if d.is_dir() and "checkpoint" in d.name]
    
    if checkpoint_dirs:
        print(f"  Found {len(checkpoint_dirs)} checkpoint(s):")
        for cp in sorted(checkpoint_dirs):
            mod_time = datetime.fromtimestamp(cp.stat().st_mtime)
            print(f"    - {cp.name} (updated: {mod_time.strftime('%H:%M:%S')})")
    else:
        print("  No checkpoints found")
    
    print("\n" + "=" * 60)
    print("Tip: Run this script periodically to check training progress")
    print("=" * 60)

if __name__ == "__main__":
    check_training_status()

