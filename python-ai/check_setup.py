"""
Check if all models and dependencies are set up correctly
"""

import sys
import os
from pathlib import Path

print("=" * 60)
print("Checking AI Models Setup")
print("=" * 60)

# Check Python version
print("\n[1] Python Version:")
print(f"  Python {sys.version}")

# Check dependencies
print("\n[2] Checking Dependencies:")
dependencies = [
    'torch', 'torchvision', 'numpy', 'PIL', 'librosa', 
    'fastapi', 'uvicorn', 'pydantic'
]

missing = []
for dep in dependencies:
    try:
        if dep == 'PIL':
            import PIL
            print(f"  ✓ {dep} (Pillow)")
        else:
            __import__(dep)
            print(f"  ✓ {dep}")
    except ImportError:
        print(f"  ✗ {dep} - MISSING")
        missing.append(dep)

if missing:
    print(f"\n  Please install missing dependencies: pip install {' '.join(missing)}")
else:
    print("\n  All dependencies installed!")

# Check model files
print("\n[3] Checking Model Files:")
model_dir = Path(__file__).parent / 'models' / 'saved'
model_files = [
    'resume_parser.pth',
    'answer_evaluator.pth',
    'personality_model.pth',
    'emotion_cnn.pth',
    'voice_analyzer.pth',
    'placement_predictor.pth'
]

trained_models = []
for model_file in model_files:
    model_path = model_dir / model_file
    if model_path.exists():
        size = model_path.stat().st_size / (1024 * 1024)  # MB
        print(f"  ✓ {model_file} ({size:.2f} MB)")
        trained_models.append(model_file)
    else:
        print(f"  ✗ {model_file} - NOT FOUND")

if not trained_models:
    print("\n  No models found. Please train models first:")
    print("    python train_all_models.py")
else:
    print(f"\n  Found {len(trained_models)}/{len(model_files)} trained models")

# Check directory structure
print("\n[4] Checking Directory Structure:")
required_dirs = [
    'models', 'training', 'inference', 'services', 'utils', 'datasets'
]

for dir_name in required_dirs:
    dir_path = Path(__file__).parent / dir_name
    if dir_path.exists():
        print(f"  ✓ {dir_name}/")
    else:
        print(f"  ✗ {dir_name}/ - MISSING")

# Summary
print("\n" + "=" * 60)
if len(missing) == 0 and len(trained_models) > 0:
    print("✓ Setup looks good! You can start the service with:")
    print("  python services/api_service.py")
elif len(missing) == 0:
    print("⚠ Dependencies OK, but models need training:")
    print("  python train_all_models.py")
else:
    print("✗ Setup incomplete. Please fix the issues above.")
print("=" * 60)

