"""
Setup script to install and verify the local LLM
This will download the Qwen2.5-0.5B-Instruct model from Hugging Face
"""

import sys
import os
from pathlib import Path

print("=" * 60)
print("Setting up Local LLM (Qwen2.5-0.5B-Instruct)")
print("=" * 60)

# Check Python version
print("\n[1] Checking Python version...")
print(f"  Python {sys.version}")
if sys.version_info < (3, 8):
    print("  ⚠ Warning: Python 3.8+ recommended")
else:
    print("  ✓ Python version OK")

# Check and install dependencies
print("\n[2] Checking dependencies...")
required_packages = {
    'torch': 'torch',
    'transformers': 'transformers',
    'accelerate': 'accelerate',
    'sentencepiece': 'sentencepiece',
    'tiktoken': 'tiktoken',
    'protobuf': 'protobuf',
}

missing = []
for module, package in required_packages.items():
    try:
        __import__(module)
        print(f"  ✓ {package}")
    except ImportError:
        print(f"  ✗ {package} - MISSING")
        missing.append(package)

if missing:
    print(f"\n  Installing missing packages: {', '.join(missing)}")
    import subprocess
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing)
        print("  ✓ Dependencies installed!")
    except subprocess.CalledProcessError:
        print("  ✗ Failed to install dependencies")
        print("  Please install manually: pip install " + " ".join(missing))
        sys.exit(1)
else:
    print("  ✓ All dependencies installed!")

# Download and test the model
print("\n[3] Downloading LLM model (this may take a few minutes)...")
print("  Model: Qwen/Qwen2.5-0.5B-Instruct")
print("  Size: ~1GB")
print("  This will download from Hugging Face...")

try:
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch
    
    model_name = "Qwen/Qwen2.5-0.5B-Instruct"
    
    print(f"\n  Downloading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
        model_name,
        trust_remote_code=True
    )
    print("  ✓ Tokenizer downloaded")
    
    print(f"\n  Downloading model (this may take 5-10 minutes)...")
    print("  Please wait...")
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float32,
        trust_remote_code=True,
        low_cpu_mem_usage=True
    )
    print("  ✓ Model downloaded successfully!")
    
    # Test the model
    print("\n[4] Testing model...")
    test_prompt = "Generate a technical interview question:"
    inputs = tokenizer(test_prompt, return_tensors="pt")
    
    with torch.no_grad():
        outputs = model.generate(
            inputs.input_ids,
            max_length=50,
            temperature=0.7,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
    
    generated = tokenizer.decode(outputs[0], skip_special_tokens=True)
    print(f"  Test prompt: {test_prompt}")
    print(f"  Generated: {generated[:100]}...")
    print("  ✓ Model is working!")
    
    print("\n" + "=" * 60)
    print("✓ LLM setup complete!")
    print("=" * 60)
    print("\nThe model is now ready to use.")
    print("You can start the Python AI service with:")
    print("  python services/api_service.py")
    print("\nOr test the LLM directly:")
    print("  python -c \"from models.llm_models import get_llm; llm = get_llm(); print(llm.generate_question('technical'))\"")
    
except Exception as e:
    print(f"\n  ✗ Error setting up model: {e}")
    print("\n  The model will download automatically on first use.")
    print("  You can continue - the system will work with fallback mode.")
    import traceback
    traceback.print_exc()
    sys.exit(1)
