"""
Setup and verify Ollama LLM for Skillnox AI
Pulls the recommended model and runs benchmarks
"""

import sys
import os
import time
import json
import subprocess

# Default configuration
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3.5:9b")
DEFAULT_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")


def check_ollama_installed():
    """Check if Ollama is installed"""
    print("\n[1] Checking Ollama installation...")
    try:
        result = subprocess.run(
            ["ollama", "--version"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            version = result.stdout.strip()
            print(f"  ✓ Ollama installed: {version}")
            return True
        else:
            print("  ✗ Ollama not found")
            return False
    except FileNotFoundError:
        print("  ✗ Ollama is not installed")
        print("  Install from: https://ollama.com/download")
        return False
    except Exception as e:
        print(f"  ✗ Error checking Ollama: {e}")
        return False


def check_ollama_running():
    """Check if Ollama server is running"""
    print("\n[2] Checking Ollama server...")
    try:
        import requests
        response = requests.get(f"{DEFAULT_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            print(f"  ✓ Ollama server is running")
            if models:
                print(f"  Available models: {', '.join(m['name'] for m in models)}")
            else:
                print("  No models installed yet")
            return True
    except ImportError:
        print("  ⚠ requests library not installed. Installing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
        return check_ollama_running()
    except Exception as e:
        print(f"  ✗ Ollama server not running: {e}")
        print("  Start Ollama by running 'ollama serve' or launching the Ollama app")
        return False


def pull_model(model_name=None):
    """Pull the recommended model"""
    model = model_name or DEFAULT_MODEL
    print(f"\n[3] Pulling model: {model}")
    print(f"  This may take several minutes on first download...")

    try:
        result = subprocess.run(
            ["ollama", "pull", model],
            timeout=1800  # 30 minute timeout
        )
        if result.returncode == 0:
            print(f"  ✓ Model '{model}' is ready!")
            return True
        else:
            print(f"  ✗ Failed to pull model")
            return False
    except subprocess.TimeoutExpired:
        print(f"  ✗ Download timed out (30 min). Try running manually: ollama pull {model}")
        return False
    except Exception as e:
        print(f"  ✗ Error pulling model: {e}")
        return False


def check_model_available(model_name=None):
    """Check if model is already available"""
    model = model_name or DEFAULT_MODEL
    try:
        import requests
        response = requests.get(f"{DEFAULT_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            model_names = [m["name"] for m in models]
            # Check both exact match and base name match
            return model in model_names or f"{model}:latest" in model_names
    except Exception:
        pass
    return False


def run_benchmark(model_name=None):
    """Run inference benchmarks"""
    model = model_name or DEFAULT_MODEL
    print(f"\n[4] Running benchmarks with '{model}'...")

    import requests

    test_prompts = [
        {
            "name": "Question Generation",
            "prompt": "Generate a technical interview question about data structures and algorithms. Output ONLY the question.",
            "max_tokens": 100
        },
        {
            "name": "Answer Evaluation",
            "prompt": "Evaluate this interview answer.\nQuestion: What is OOP?\nAnswer: OOP stands for Object-Oriented Programming. It uses four principles: encapsulation, inheritance, polymorphism, and abstraction.\n\nProvide: Score (0-100) and Feedback.",
            "max_tokens": 200
        },
        {
            "name": "Resume Analysis",
            "prompt": "Analyze this resume briefly.\nName: John Doe\nSkills: Python, React, PostgreSQL\nExperience: 2 years as Full Stack Developer\n\nProvide: Score (0-100), top 3 strengths, top 3 suggestions.",
            "max_tokens": 300
        }
    ]

    results = []
    for test in test_prompts:
        print(f"\n  Testing: {test['name']}...")
        start = time.time()

        try:
            response = requests.post(
                f"{DEFAULT_BASE_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": test["prompt"],
                    "options": {
                        "temperature": 0.7,
                        "num_predict": test["max_tokens"],
                    },
                    "stream": False
                },
                timeout=120
            )

            elapsed = time.time() - start
            data = response.json()
            generated = data.get("response", "")
            tokens = data.get("eval_count", len(generated.split()))
            tokens_per_sec = tokens / elapsed if elapsed > 0 else 0

            print(f"  ✓ {test['name']}: {elapsed:.1f}s ({tokens_per_sec:.1f} tokens/sec)")
            print(f"    Preview: {generated[:120].strip()}...")

            results.append({
                "name": test["name"],
                "time": round(elapsed, 2),
                "tokens": tokens,
                "tokens_per_sec": round(tokens_per_sec, 1)
            })

        except Exception as e:
            print(f"  ✗ Error: {e}")
            results.append({"name": test["name"], "error": str(e)})

    # Print summary
    if results:
        print("\n" + "=" * 60)
        print("Benchmark Results")
        print("=" * 60)
        print(f"{'Task':<25} {'Time':>8} {'Tokens/s':>10}")
        print("-" * 45)
        for r in results:
            if "error" not in r:
                print(f"{r['name']:<25} {r['time']:>6.1f}s {r['tokens_per_sec']:>8.1f}")
            else:
                print(f"{r['name']:<25} {'ERROR':>8}")
        print("-" * 45)

        avg_time = sum(r.get("time", 0) for r in results if "error" not in r) / max(1, len([r for r in results if "error" not in r]))
        print(f"{'Average':.<25} {avg_time:>6.1f}s")

    return results


def check_ram_usage():
    """Check system RAM availability"""
    print("\n[5] System RAM check...")
    try:
        import psutil
        mem = psutil.virtual_memory()
        total_gb = mem.total / (1024**3)
        available_gb = mem.available / (1024**3)
        used_gb = mem.used / (1024**3)
        print(f"  Total RAM: {total_gb:.1f} GB")
        print(f"  Used:      {used_gb:.1f} GB")
        print(f"  Available: {available_gb:.1f} GB")

        if available_gb < 6:
            print("  ⚠ Low available RAM. Close other applications for best performance.")
        else:
            print(f"  ✓ Sufficient RAM for {DEFAULT_MODEL}")
    except ImportError:
        print("  ⚠ psutil not installed, skipping RAM check")
        print("  Install with: pip install psutil")


def main():
    print("=" * 60)
    print("Skillnox AI - Ollama LLM Setup")
    print(f"Model: {DEFAULT_MODEL}")
    print("=" * 60)

    # Step 1: Check Ollama installed
    if not check_ollama_installed():
        print("\n✗ Please install Ollama first: https://ollama.com/download")
        sys.exit(1)

    # Step 2: Check Ollama server
    if not check_ollama_running():
        print("\n⚠ Starting Ollama server...")
        try:
            subprocess.Popen(["ollama", "serve"], 
                           stdout=subprocess.DEVNULL, 
                           stderr=subprocess.DEVNULL)
            time.sleep(3)
            if not check_ollama_running():
                print("✗ Could not start Ollama server")
                sys.exit(1)
        except Exception:
            print("✗ Please start Ollama manually")
            sys.exit(1)

    # Step 3: Pull model if not available
    if check_model_available():
        print(f"\n[3] Model '{DEFAULT_MODEL}' already available ✓")
    else:
        if not pull_model():
            sys.exit(1)

    # Step 4: Run benchmarks
    run_benchmark()

    # Step 5: RAM check
    check_ram_usage()

    print("\n" + "=" * 60)
    print("✓ Ollama LLM setup complete!")
    print("=" * 60)
    print(f"\nModel '{DEFAULT_MODEL}' is ready to use.")
    print("Start the Python AI service with:")
    print("  python services/api_service.py")
    print("\nOr test the LLM directly:")
    print("  python test_llm.py")


if __name__ == "__main__":
    main()
