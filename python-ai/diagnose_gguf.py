"""
Diagnose GGUF fine-tuned model quality issues.
Compares skillnox-qwen (fine-tuned) vs qwen3:8b (base).
"""
import requests
import json
import time

BASE = "http://localhost:11434"
FT_MODEL = "skillnox-qwen:9b"
BASE_MODEL = "qwen3:8b"

def test_generate(model, prompt, temperature=0.7, num_predict=80, system=None):
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"num_predict": num_predict, "temperature": temperature},
    }
    if system:
        payload["system"] = system
    try:
        resp = requests.post(f"{BASE}/api/generate", json=payload, timeout=180)
        if resp.status_code == 200:
            return resp.json().get("response", "")
        else:
            return f"[HTTP {resp.status_code}] {resp.text[:200]}"
    except Exception as e:
        return f"[ERROR] {e}"

def test_chat(model, user_msg, temperature=0.7, num_predict=80):
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": user_msg}],
        "stream": False,
        "options": {"num_predict": num_predict, "temperature": temperature},
    }
    try:
        resp = requests.post(f"{BASE}/api/chat", json=payload, timeout=180)
        if resp.status_code == 200:
            return resp.json().get("message", {}).get("content", "")
        else:
            return f"[HTTP {resp.status_code}] {resp.text[:200]}"
    except Exception as e:
        return f"[ERROR] {e}"

print("=" * 70)
print("GGUF FINE-TUNED MODEL DIAGNOSTIC")
print("=" * 70)

# --- Test 1: Simple raw generation ---
print("\n[Test 1] Raw /api/generate - 'What is Python?'")
print("-" * 50)
for model in [FT_MODEL, BASE_MODEL]:
    t0 = time.time()
    out = test_generate(model, "What is Python?", temperature=0.7)
    dt = time.time() - t0
    print(f"  {model} ({dt:.1f}s): {repr(out[:150])}")

# --- Test 2: Low temperature ---
print("\n[Test 2] Low temp (0.1) - 'Explain OOP in one sentence.'")
print("-" * 50)
for model in [FT_MODEL, BASE_MODEL]:
    t0 = time.time()
    out = test_generate(model, "Explain OOP in one sentence.", temperature=0.1)
    dt = time.time() - t0
    print(f"  {model} ({dt:.1f}s): {repr(out[:150])}")

# --- Test 3: Chat API ---
print("\n[Test 3] Chat API - 'Generate a technical interview question.'")
print("-" * 50)
for model in [FT_MODEL, BASE_MODEL]:
    t0 = time.time()
    out = test_chat(model, "Generate a technical interview question.", temperature=0.7)
    dt = time.time() - t0
    print(f"  {model} ({dt:.1f}s): {repr(out[:150])}")

# --- Test 4: With system prompt ---
print("\n[Test 4] System prompt + question generation")
print("-" * 50)
sys_prompt = (
    "You are an expert interview coach. "
    "Generate exactly ONE interview question. Output ONLY the question."
)
for model in [FT_MODEL, BASE_MODEL]:
    t0 = time.time()
    out = test_generate(model, "Generate a medium difficulty technical question about Python.", 
                        temperature=0.7, system=sys_prompt)
    dt = time.time() - t0
    print(f"  {model} ({dt:.1f}s): {repr(out[:150])}")

# --- Test 5: Repeat penalty variations ---
print("\n[Test 5] Higher repeat_penalty (1.3) on fine-tuned model")
print("-" * 50)
payload = {
    "model": FT_MODEL,
    "prompt": "What is Python?",
    "stream": False,
    "options": {"num_predict": 80, "temperature": 0.7, "repeat_penalty": 1.3},
}
resp = requests.post(f"{BASE}/api/generate", json=payload, timeout=180)
out = resp.json().get("response", "") if resp.status_code == 200 else f"[HTTP {resp.status_code}]"
print(f"  repeat_penalty=1.3: {repr(out[:150])}")

payload["options"]["repeat_penalty"] = 1.5
resp = requests.post(f"{BASE}/api/generate", json=payload, timeout=180)
out = resp.json().get("response", "") if resp.status_code == 200 else f"[HTTP {resp.status_code}]"
print(f"  repeat_penalty=1.5: {repr(out[:150])}")

# --- Test 6: Check model info ---
print("\n[Test 6] Model metadata")
print("-" * 50)
resp = requests.post(f"{BASE}/api/show", json={"name": FT_MODEL}, timeout=30)
if resp.status_code == 200:
    info = resp.json()
    details = info.get("details", {})
    print(f"  Family: {details.get('family', 'unknown')}")
    print(f"  Parameter Size: {details.get('parameter_size', 'unknown')}")
    print(f"  Quantization: {details.get('quantization_level', 'unknown')}")
    print(f"  Format: {details.get('format', 'unknown')}")
    modelinfo = info.get("model_info", {})
    for k, v in list(modelinfo.items())[:8]:
        print(f"  {k}: {v}")

print("\n" + "=" * 70)
print("DIAGNOSIS COMPLETE")
print("=" * 70)
