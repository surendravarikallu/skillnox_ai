"""
Test script to verify Python AI service and LLM model are working correctly
"""

import sys
from pathlib import Path
import requests
import json

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

def test_llm_loading():
    """Test if LLM model can be loaded"""
    print("\n" + "="*60)
    print("Testing LLM Model Loading")
    print("="*60)
    
    try:
        from models.llm_models import get_llm
        
        print("\n1. Testing base model loading...")
        llm = get_llm(model_name="Qwen/Qwen2.5-0.5B-Instruct", use_lightweight=False)
        print("✅ Base model loaded successfully")
        
        print("\n2. Testing question generation...")
        question = llm.generate_question("technical")
        print(f"✅ Generated question: {question[:100]}...")
        
        print("\n3. Testing answer evaluation...")
        result = llm.evaluate_answer(
            "What is OOP?",
            "Object-Oriented Programming is a programming paradigm based on the concept of objects."
        )
        print(f"✅ Evaluation result: Score={result.get('score', 'N/A')}, Feedback={result.get('feedback', 'N/A')[:50]}...")
        
        return True
    except Exception as e:
        print(f"❌ Error loading LLM: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_service():
    """Test if API service endpoints are working"""
    print("\n" + "="*60)
    print("Testing API Service Endpoints")
    print("="*60)
    
    base_url = "http://localhost:8000"
    
    # Test health endpoint
    print("\n1. Testing /health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print(f"✅ Health check passed: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API service. Is it running on port 8000?")
        print("   Start it with: cd python-ai && python services/api_service.py")
        return False
    except Exception as e:
        print(f"❌ Error checking health: {e}")
        return False
    
    # Test question generation endpoint
    print("\n2. Testing /api/llm/generate-question endpoint...")
    try:
        payload = {
            "question_type": "technical",
            "context": None,
            "company": None
        }
        response = requests.post(
            f"{base_url}/api/llm/generate-question",
            json=payload,
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            question = data.get("question", "")
            print(f"✅ Question generated: {question[:100]}...")
        else:
            print(f"❌ Question generation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error generating question: {e}")
        return False
    
    # Test answer evaluation endpoint
    print("\n3. Testing /api/answer/evaluate endpoint...")
    try:
        payload = {
            "answer": "Object-Oriented Programming is a programming paradigm.",
            "question": "What is OOP?"
        }
        response = requests.post(
            f"{base_url}/api/answer/evaluate",
            json=payload,
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            result = data.get("data", {})
            print(f"✅ Answer evaluated: Score={result.get('score', 'N/A')}")
        else:
            print(f"❌ Answer evaluation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error evaluating answer: {e}")
        return False
    
    return True

def test_nodejs_connection():
    """Test if Node.js backend can connect to Python service"""
    print("\n" + "="*60)
    print("Testing Node.js Backend Connection")
    print("="*60)
    
    # This would need to be tested from Node.js side
    print("\n⚠️  This test should be run from Node.js backend")
    print("   The Python service is accessible at: http://localhost:8000")
    return True

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("AI Model Connection Test Suite")
    print("="*60)
    
    results = {
        "LLM Loading": False,
        "API Service": False,
    }
    
    # Test LLM loading
    results["LLM Loading"] = test_llm_loading()
    
    # Test API service (only if service is running)
    print("\n" + "-"*60)
    print("Note: Make sure the API service is running before testing endpoints")
    print("Start it with: cd python-ai && python services/api_service.py")
    print("-"*60)
    
    try:
        results["API Service"] = test_api_service()
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    if all_passed:
        print("\n✅ All tests passed! Model is working correctly.")
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

