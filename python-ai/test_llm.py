"""
Quick test script to verify the LLM is working
"""

from models.llm_models import get_llm
from pathlib import Path

print("Testing Local LLM...")
print("=" * 60)

try:
    # Initialize LLM (try fine-tuned model first)
    print("\n[1] Loading LLM model...")
    # Check if fine-tuned model exists
    model_path = Path(__file__).parent / "models" / "finetuned_llm"
    if model_path.exists() and (model_path / "adapter_config.json").exists():
        print("  Using fine-tuned model...")
        llm = get_llm(model_name="models/finetuned_llm", use_lightweight=False)
    else:
        print("  Using base model (fine-tuned model not found)...")
        llm = get_llm(model_name="Qwen/Qwen2.5-0.5B-Instruct", use_lightweight=False)
    print("  ✓ LLM loaded successfully!")
    
    # Test question generation
    print("\n[2] Testing question generation...")
    question_types = ['technical', 'hr', 'behavioral']
    
    for qtype in question_types:
        question = llm.generate_question(qtype)
        print(f"\n  {qtype.capitalize()} Question:")
        print(f"  {question}")
    
    # Test answer evaluation
    print("\n[3] Testing answer evaluation...")
    test_question = "What is object-oriented programming?"
    test_answer = "Object-oriented programming is a programming paradigm based on the concept of objects, which contain data and code."
    
    evaluation = llm.evaluate_answer(test_question, test_answer)
    print(f"\n  Question: {test_question}")
    print(f"  Answer: {test_answer}")
    print(f"  Score: {evaluation.get('score', 'N/A')}")
    print(f"  Feedback: {evaluation.get('feedback', 'N/A')[:100]}...")
    
    print("\n" + "=" * 60)
    print("✓ All tests passed! LLM is working correctly.")
    print("=" * 60)
    
except Exception as e:
    print(f"\n✗ Error testing LLM: {e}")
    import traceback
    traceback.print_exc()

