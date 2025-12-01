"""
Master script to train all AI models
Run this to train all models at once
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

print("=" * 60)
print("Training All AI Models")
print("=" * 60)

# Train NLP models
print("\n[1/5] Training NLP Models...")
print("-" * 60)
try:
    from training.train_nlp_models import main as train_nlp
    train_nlp()
except Exception as e:
    print(f"Error training NLP models: {e}")

# Train Emotion model
print("\n[2/5] Training Emotion Detection Model...")
print("-" * 60)
try:
    from training.train_emotion_model import main as train_emotion
    train_emotion()
except Exception as e:
    print(f"Error training emotion model: {e}")

# Train Voice model
print("\n[3/5] Training Voice Analysis Model...")
print("-" * 60)
try:
    from training.train_voice_model import main as train_voice
    train_voice()
except Exception as e:
    print(f"Error training voice model: {e}")

# Train Personality model (included in NLP)
print("\n[4/5] Personality model trained with NLP models")

# Train Placement model
print("\n[5/5] Training Placement Probability Model...")
print("-" * 60)
try:
    from training.train_placement_model import main as train_placement
    train_placement()
except Exception as e:
    print(f"Error training placement model: {e}")

print("\n" + "=" * 60)
print("All models training completed!")
print("=" * 60)
print("\nNote: Models are saved in python-ai/models/saved/")
print("You can now start the FastAPI service with:")
print("  python python-ai/services/api_service.py")
print("=" * 60)

