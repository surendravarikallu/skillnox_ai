"""
Optimized fine-tuning script for faster CPU training
Uses smaller batch sizes, fewer steps, and optimized settings
"""

import torch
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model
from datasets import Dataset
import json
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))

def load_training_data(data_path: Path) -> Dataset:
    """Load training data from JSON file"""
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    texts = []
    for item in data:
        if "messages" in item:
            user_msg = item["messages"][0]["content"]
            assistant_msg = item["messages"][1]["content"]
            text = f"<|im_start|>user\n{user_msg}<|im_end|>\n<|im_start|>assistant\n{assistant_msg}<|im_end|>"
        else:
            instruction = item.get("instruction", "")
            input_text = item.get("input", "")
            output = item.get("output", "")
            user_content = f"{instruction}\n\n{input_text}" if input_text else instruction
            text = f"<|im_start|>user\n{user_content}<|im_end|>\n<|im_start|>assistant\n{output}<|im_end|>"
        
        texts.append({"text": text})
    
    return Dataset.from_list(texts)

def main():
    print("=" * 60)
    print("Fast Fine-Tuning (Optimized for CPU)")
    print("=" * 60)
    
    # Load data
    datasets_dir = Path(__file__).parent.parent / "datasets"
    training_data_path = datasets_dir / "llm_training_chat.json"
    
    if not training_data_path.exists():
        print("Generating training data...")
        from prepare_llm_data import main as prepare_data
        prepare_data()
    
    print(f"\n[1] Loading training data...")
    train_dataset = load_training_data(training_data_path)
    print(f"  Loaded {len(train_dataset)} examples")
    
    # Use subset for faster training (optional - comment out to use all data)
    if len(train_dataset) > 20:
        print(f"  Using first 20 examples for faster training")
        train_dataset = train_dataset.select(range(20))
    
    # Load model
    print("\n[2] Loading model...")
    model_name = "Qwen/Qwen2.5-0.5B-Instruct"
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float32,
        trust_remote_code=True,
        low_cpu_mem_usage=True,
    )
    
    # Smaller LoRA config for faster training
    lora_config = LoraConfig(
        r=8,  # Smaller rank (was 16)
        lora_alpha=16,  # Smaller alpha (was 32)
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],  # Fewer modules
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    
    # Tokenize with shorter sequences
    print("\n[3] Tokenizing (using shorter sequences for speed)...")
    tokenized_dataset = train_dataset.map(
        lambda x: tokenizer(
            x["text"],
            truncation=True,
            max_length=256,  # Shorter (was 512)
            padding="max_length",
        ),
        batched=True,
        remove_columns=train_dataset.column_names,
    )
    
    # Optimized training args
    output_dir = Path(__file__).parent.parent / "models" / "finetuned_llm"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    training_args = TrainingArguments(
        output_dir=str(output_dir),
        overwrite_output_dir=True,
        num_train_epochs=2,  # Reduced from 3
        per_device_train_batch_size=1,  # Smallest batch
        gradient_accumulation_steps=8,  # Larger accumulation to maintain effective batch
        learning_rate=3e-4,  # Slightly higher for faster convergence
        fp16=False,
        logging_steps=2,  # More frequent logging
        save_steps=50,
        save_total_limit=1,  # Keep only latest
        warmup_steps=5,  # Fewer warmup steps
        report_to="none",
        dataloader_pin_memory=False,  # Disable pin_memory for CPU
        dataloader_num_workers=0,  # Single worker for CPU
        remove_unused_columns=False,
    )
    
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=data_collator,
    )
    
    print("\n[4] Starting optimized training...")
    print("  Epochs: 2")
    print("  Batch size: 1 (effective: 8 with gradient accumulation)")
    print("  Max length: 256 tokens")
    print("  Estimated time: ~20-30 minutes")
    print("\n  Training...")
    
    trainer.train()
    trainer.save_model()
    tokenizer.save_pretrained(output_dir)
    
    print("\n" + "=" * 60)
    print("✓ Fast fine-tuning complete!")
    print(f"  Model saved to: {output_dir}")
    print("=" * 60)
    print("\nTo use the fine-tuned model:")
    print("  python update_finetuned_model.py")

if __name__ == "__main__":
    try:
        import peft
    except ImportError:
        print("Installing peft...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "peft", "datasets"])
    
    main()

