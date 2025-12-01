"""
Fine-tune Qwen2.5-0.5B-Instruct for interview and resume analysis tasks
Uses LoRA (Low-Rank Adaptation) for memory-efficient fine-tuning
"""

import torch
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from datasets import Dataset
import json
from pathlib import Path
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

def load_training_data(data_path: Path) -> Dataset:
    """Load training data from JSON file"""
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Convert to format expected by trainer
    texts = []
    for item in data:
        if "messages" in item:
            # Chat format
            user_msg = item["messages"][0]["content"]
            assistant_msg = item["messages"][1]["content"]
            # Format as instruction-following prompt
            text = f"<|im_start|>user\n{user_msg}<|im_end|>\n<|im_start|>assistant\n{assistant_msg}<|im_end|>"
        else:
            # Standard format
            instruction = item.get("instruction", "")
            input_text = item.get("input", "")
            output = item.get("output", "")
            text = f"<|im_start|>user\n{instruction}\n\n{input_text}<|im_end|>\n<|im_start|>assistant\n{output}<|im_end|>"
        
        texts.append({"text": text})
    
    return Dataset.from_list(texts)

def tokenize_function(examples, tokenizer, max_length=512):
    """Tokenize examples for training"""
    return tokenizer(
        examples["text"],
        truncation=True,
        max_length=max_length,
        padding="max_length",
    )

def setup_model_and_tokenizer(model_name: str = "Qwen/Qwen2.5-0.5B-Instruct"):
    """Setup model and tokenizer with LoRA configuration"""
    print(f"Loading model: {model_name}")
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        model_name,
        trust_remote_code=True
    )
    
    # Add padding token if not present
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    # Load model
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float32,
        trust_remote_code=True,
        low_cpu_mem_usage=True,
        device_map="auto" if torch.cuda.is_available() else None,
    )
    
    # Configure LoRA for efficient fine-tuning
    lora_config = LoraConfig(
        r=16,  # Rank
        lora_alpha=32,  # LoRA alpha
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    
    # Prepare model for LoRA
    if hasattr(model, 'enable_input_require_grads'):
        model.enable_input_require_grads()
    else:
        def make_inputs_require_grad(module, input, output):
            output.requires_grad_(True)
        model.get_input_embeddings().register_forward_hook(make_inputs_require_grad)
    
    # Apply LoRA
    model = get_peft_model(model, lora_config)
    
    # Print trainable parameters
    model.print_trainable_parameters()
    
    return model, tokenizer

def train_model(
    model,
    tokenizer,
    train_dataset,
    output_dir: str = "./models/finetuned_llm",
    num_epochs: int = 3,
    batch_size: int = 4,
    learning_rate: float = 2e-4,
):
    """Train the model"""
    
    # Tokenize dataset
    print("Tokenizing dataset...")
    tokenized_dataset = train_dataset.map(
        lambda x: tokenize_function(x, tokenizer),
        batched=True,
        remove_columns=train_dataset.column_names,
    )
    
    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,  # Causal LM, not masked LM
    )
    
    # Training arguments (optimized for CPU)
    training_args = TrainingArguments(
        output_dir=output_dir,
        overwrite_output_dir=True,
        num_train_epochs=num_epochs,
        per_device_train_batch_size=batch_size,
        gradient_accumulation_steps=4,  # Effective batch size = 4 * 4 = 16
        learning_rate=learning_rate,
        fp16=False,  # Use fp32 for stability on CPU
        logging_steps=10,
        save_steps=100,
        save_total_limit=2,
        eval_strategy="no",  # Changed from evaluation_strategy
        warmup_steps=50,
        report_to="none",
        dataloader_pin_memory=False,  # Disable for CPU (faster)
        dataloader_num_workers=0,  # Single worker for CPU
        remove_unused_columns=False,
    )
    
    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=data_collator,
    )
    
    # Train
    print("Starting training...")
    print(f"  Epochs: {num_epochs}")
    print(f"  Batch size: {batch_size}")
    print(f"  Learning rate: {learning_rate}")
    print(f"  Training examples: {len(train_dataset)}")
    
    trainer.train()
    
    # Save model
    print(f"\nSaving fine-tuned model to {output_dir}...")
    trainer.save_model()
    tokenizer.save_pretrained(output_dir)
    
    print("✓ Training complete!")
    return trainer

def main():
    """Main training function"""
    print("=" * 60)
    print("Fine-tuning Qwen2.5-0.5B-Instruct for Interview Tasks")
    print("=" * 60)
    
    # Check if training data exists
    datasets_dir = Path(__file__).parent.parent / "datasets"
    training_data_path = datasets_dir / "llm_training_chat.json"
    
    if not training_data_path.exists():
        print(f"\n⚠ Training data not found at {training_data_path}")
        print("Generating training data...")
        from prepare_llm_data import main as prepare_data
        prepare_data()
    
    # Load training data
    print(f"\n[1] Loading training data from {training_data_path}...")
    train_dataset = load_training_data(training_data_path)
    print(f"  Loaded {len(train_dataset)} training examples")
    
    # Setup model and tokenizer
    print("\n[2] Setting up model and tokenizer...")
    model, tokenizer = setup_model_and_tokenizer()
    
    # Train model
    print("\n[3] Training model...")
    output_dir = Path(__file__).parent.parent / "models" / "finetuned_llm"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    trainer = train_model(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_dataset,
        output_dir=str(output_dir),
        num_epochs=3,
        batch_size=2,  # Small batch size for memory efficiency
        learning_rate=2e-4,
    )
    
    print("\n" + "=" * 60)
    print("✓ Fine-tuning complete!")
    print(f"  Model saved to: {output_dir}")
    print("=" * 60)
    print("\nTo use the fine-tuned model, update llm_models.py:")
    print(f"  model_name = '{output_dir}'")

if __name__ == "__main__":
    # Check for required packages
    try:
        import peft
    except ImportError:
        print("Installing required packages...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "peft", "datasets"])
    
    main()

