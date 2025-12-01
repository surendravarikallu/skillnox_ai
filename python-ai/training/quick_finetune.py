"""
Quick fine-tuning script with reduced settings for faster training
Use this for initial testing or when you have limited resources
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
    print("Quick Fine-Tuning (Reduced Settings)")
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
    
    # LoRA config (smaller for faster training)
    lora_config = LoraConfig(
        r=8,  # Smaller rank
        lora_alpha=16,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    
    # Tokenize
    print("\n[3] Tokenizing...")
    tokenized_dataset = train_dataset.map(
        lambda x: tokenizer(
            x["text"],
            truncation=True,
            max_length=512,
            padding="max_length",
        ),
        batched=True,
        remove_columns=train_dataset.column_names,
    )
    
    # Training args (reduced for speed)
    output_dir = Path(__file__).parent.parent / "models" / "finetuned_llm"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    training_args = TrainingArguments(
        output_dir=str(output_dir),
        overwrite_output_dir=True,
        num_train_epochs=1,  # Only 1 epoch for quick test
        per_device_train_batch_size=1,  # Smaller batch
        gradient_accumulation_steps=2,
        learning_rate=2e-4,
        fp16=False,
        logging_steps=5,
        save_steps=50,
        save_total_limit=1,
        warmup_steps=10,
        report_to="none",
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
    
    print("\n[4] Starting training...")
    print("  Epochs: 1")
    print("  Batch size: 1")
    print("  This will take ~15-30 minutes on CPU")
    
    trainer.train()
    trainer.save_model()
    tokenizer.save_pretrained(output_dir)
    
    print("\n" + "=" * 60)
    print("✓ Quick fine-tuning complete!")
    print(f"  Model saved to: {output_dir}")
    print("=" * 60)

if __name__ == "__main__":
    try:
        import peft
    except ImportError:
        print("Installing peft...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "peft", "datasets"])
    
    main()

