"""
Update the LLM service to use the fine-tuned model
Run this after fine-tuning is complete
"""

from pathlib import Path
import sys

def update_llm_service():
    """Update llm_service.py to use fine-tuned model"""
    service_path = Path(__file__).parent / "services" / "llm_service.py"
    
    if not service_path.exists():
        print(f"Error: {service_path} not found")
        return
    
    content = service_path.read_text()
    
    # Update the model name
    old_line = 'llm = get_llm(model_name="Qwen/Qwen2.5-0.5B-Instruct", use_lightweight=False)'
    new_line = 'llm = get_llm(model_name="models/finetuned_llm", use_lightweight=False)'
    
    if old_line in content:
        content = content.replace(old_line, new_line)
        service_path.write_text(content)
        print("✓ Updated llm_service.py to use fine-tuned model")
    else:
        print("⚠ Could not find the line to update. Please update manually:")
        print(f"  Change: model_name=\"Qwen/Qwen2.5-0.5B-Instruct\"")
        print(f"  To: model_name=\"models/finetuned_llm\"")

def check_finetuned_model():
    """Check if fine-tuned model exists"""
    model_path = Path(__file__).parent / "models" / "finetuned_llm"
    
    if model_path.exists() and (model_path / "adapter_config.json").exists():
        print("✓ Fine-tuned model found")
        return True
    else:
        print("⚠ Fine-tuned model not found")
        print("  Please run: python training/finetune_llm.py")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Updating to Fine-Tuned Model")
    print("=" * 60)
    
    if check_finetuned_model():
        update_llm_service()
        print("\n✓ Setup complete! The service will now use the fine-tuned model.")
    else:
        print("\n⚠ Please complete fine-tuning first.")

