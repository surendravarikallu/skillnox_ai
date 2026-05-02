"""
Evaluate and benchmark LLM models for Skillnox AI
Compares base vs fine-tuned model quality and speed
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from typing import Dict, List

sys.path.append(str(Path(__file__).parent.parent))

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3.5:9b")


def benchmark_speed(model_name: str, num_runs: int = 5) -> Dict:
    """Benchmark inference speed."""
    print(f"\n--- Speed Benchmark: {model_name} ({num_runs} runs) ---")

    prompts = [
        "Generate a medium difficulty technical interview question about Python data structures.",
        "Evaluate this answer.\nQuestion: What is REST API?\nAnswer: REST is an architectural style for APIs using HTTP methods.\n\nScore (0-100) and Feedback:",
        "Analyze this resume.\nName: John Doe\nSkills: Python, React, SQL\n\nScore (0-100), Strengths, Suggestions:",
    ]

    times = []
    for i in range(num_runs):
        prompt = prompts[i % len(prompts)]
        start = time.time()
        try:
            resp = requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": model_name, "prompt": prompt, "stream": False,
                      "options": {"num_predict": 200}},
                timeout=120,
            )
            elapsed = time.time() - start
            if resp.status_code == 200:
                tokens = resp.json().get("eval_count", 0)
                times.append({"time": elapsed, "tokens": tokens})
                print(f"  Run {i+1}: {elapsed:.1f}s ({tokens} tokens)")
        except Exception as e:
            print(f"  Run {i+1}: ERROR - {e}")

    if times:
        avg_time = sum(t["time"] for t in times) / len(times)
        avg_tokens = sum(t["tokens"] for t in times) / len(times)
        tps = avg_tokens / avg_time if avg_time > 0 else 0
        print(f"  Average: {avg_time:.1f}s, {tps:.1f} tokens/sec")
        return {"avg_time": round(avg_time, 2), "avg_tokens_per_sec": round(tps, 1)}
    return {"error": "No successful runs"}


def evaluate_question_quality(model_name: str) -> Dict:
    """Test question generation quality."""
    print(f"\n--- Question Quality: {model_name} ---")

    tests = [
        ("technical", "Python backend development"),
        ("hr", "General"),
        ("behavioral", "Team collaboration"),
        ("project", "E-commerce platform"),
        ("company", "TCS placement interview"),
    ]

    results = []
    for q_type, context in tests:
        prompt = f"Generate ONE {q_type} interview question. Context: {context}. Output ONLY the question."
        try:
            resp = requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": model_name, "prompt": prompt, "stream": False,
                      "options": {"num_predict": 100, "temperature": 0.7}},
                timeout=60,
            )
            question = resp.json().get("response", "").strip()
            is_question = "?" in question
            is_reasonable_length = 15 < len(question) < 500
            is_clean = not any(x in question.lower() for x in ["sure", "here's", "certainly"])

            score = sum([is_question, is_reasonable_length, is_clean]) / 3 * 100
            results.append({"type": q_type, "question": question[:120], "score": score})
            status = "OK" if score >= 66 else "WARN"
            print(f"  [{status}] {q_type}: {question[:80]}...")
        except Exception as e:
            results.append({"type": q_type, "error": str(e), "score": 0})
            print(f"  [ERR] {q_type}: {e}")

    avg_score = sum(r["score"] for r in results) / max(1, len(results))
    print(f"  Average quality: {avg_score:.0f}%")
    return {"tests": results, "avg_quality": round(avg_score, 1)}


def evaluate_scoring_accuracy(model_name: str) -> Dict:
    """Test answer evaluation accuracy against known scores."""
    print(f"\n--- Scoring Accuracy: {model_name} ---")

    test_cases = [
        {
            "question": "What is OOP?",
            "answer": "OOP is Object-Oriented Programming with encapsulation, inheritance, polymorphism, and abstraction.",
            "expected_range": (60, 80),
        },
        {
            "question": "Explain microservices.",
            "answer": "I redesigned our monolith into 12 microservices using Docker and Kubernetes. Deployment time dropped from 2 hours to 10 minutes. We used gRPC for inter-service communication and achieved 99.9% uptime.",
            "expected_range": (82, 98),
        },
        {
            "question": "Describe a challenging project.",
            "answer": "It was hard.",
            "expected_range": (10, 40),
        },
        {
            "question": "How do you handle deadlines?",
            "answer": "",
            "expected_range": (0, 20),
        },
    ]

    results = []
    for tc in test_cases:
        prompt = (
            f"Evaluate this answer.\nQuestion: {tc['question']}\n"
            f"Answer: {tc['answer']}\n\nRespond with: Score: [0-100]\nFeedback: [text]"
        )
        try:
            resp = requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": model_name, "prompt": prompt, "stream": False,
                      "options": {"num_predict": 200}},
                timeout=60,
            )
            text = resp.json().get("response", "")
            import re
            m = re.search(r"Score:\s*(\d{1,3})", text, re.IGNORECASE)
            score = int(m.group(1)) if m else -1

            lo, hi = tc["expected_range"]
            in_range = lo <= score <= hi
            results.append({"expected": f"{lo}-{hi}", "actual": score, "pass": in_range})
            status = "PASS" if in_range else "FAIL"
            print(f"  [{status}] Expected {lo}-{hi}, Got {score} | Q: {tc['question'][:40]}")
        except Exception as e:
            results.append({"error": str(e), "pass": False})
            print(f"  [ERR] {e}")

    pass_rate = sum(1 for r in results if r.get("pass")) / max(1, len(results)) * 100
    print(f"  Pass rate: {pass_rate:.0f}%")
    return {"tests": results, "pass_rate": round(pass_rate, 1)}


def run_full_evaluation(model_name: str = None):
    """Run complete evaluation suite."""
    model = model_name or DEFAULT_MODEL

    print("=" * 60)
    print(f"Skillnox AI - Model Evaluation: {model}")
    print("=" * 60)

    speed = benchmark_speed(model, num_runs=3)
    quality = evaluate_question_quality(model)
    accuracy = evaluate_scoring_accuracy(model)

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Model: {model}")
    print(f"Avg Response Time: {speed.get('avg_time', 'N/A')}s")
    print(f"Tokens/sec: {speed.get('avg_tokens_per_sec', 'N/A')}")
    print(f"Question Quality: {quality.get('avg_quality', 'N/A')}%")
    print(f"Scoring Accuracy: {accuracy.get('pass_rate', 'N/A')}%")

    return {"speed": speed, "quality": quality, "accuracy": accuracy}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=None, help="Model name")
    parser.add_argument("--compare", nargs=2, help="Compare two models")
    parser.add_argument("--benchmark", action="store_true", help="Speed only")
    args = parser.parse_args()

    if args.compare:
        print("Comparing models...")
        r1 = run_full_evaluation(args.compare[0])
        r2 = run_full_evaluation(args.compare[1])
        print(f"\n{'Metric':<25} {args.compare[0]:<20} {args.compare[1]:<20}")
        print("-" * 65)
        print(f"{'Avg Time':<25} {r1['speed'].get('avg_time','N/A'):<20} {r2['speed'].get('avg_time','N/A'):<20}")
        print(f"{'Tokens/sec':<25} {r1['speed'].get('avg_tokens_per_sec','N/A'):<20} {r2['speed'].get('avg_tokens_per_sec','N/A'):<20}")
        print(f"{'Question Quality':<25} {r1['quality'].get('avg_quality','N/A'):<20} {r2['quality'].get('avg_quality','N/A'):<20}")
        print(f"{'Scoring Accuracy':<25} {r1['accuracy'].get('pass_rate','N/A'):<20} {r2['accuracy'].get('pass_rate','N/A'):<20}")
    elif args.benchmark:
        benchmark_speed(args.model or DEFAULT_MODEL, num_runs=5)
    else:
        run_full_evaluation(args.model)
