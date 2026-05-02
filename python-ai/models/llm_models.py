"""
Local LLM Models for Interview System — Ollama Backend
Uses Ollama's optimized C++ inference engine for fast local execution.
Fully replaces the old HuggingFace/PyTorch pipeline.
"""

import os
import re
import json
import time
import random
import requests
from typing import List, Dict, Optional
from pathlib import Path


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3.5:9b")
OLLAMA_TIMEOUT = int(os.environ.get("OLLAMA_TIMEOUT", "120"))


# ---------------------------------------------------------------------------
# OllamaLLM — Main LLM class
# ---------------------------------------------------------------------------

class OllamaLLM:
    """LLM wrapper using Ollama's REST API for fast CPU inference."""

    def __init__(
        self,
        model_name: str = OLLAMA_MODEL,
        base_url: str = OLLAMA_BASE_URL,
        timeout: int = OLLAMA_TIMEOUT,
    ):
        self.model_name = model_name
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update({"Content-Type": "application/json"})

        print(f"Initializing Ollama LLM: {model_name} @ {base_url}")
        self._verify_connection()

    # ------------------------------------------------------------------
    # Connection helpers
    # ------------------------------------------------------------------

    def _verify_connection(self):
        """Verify Ollama is running and model is available."""
        try:
            resp = self._session.get(
                f"{self.base_url}/api/tags", timeout=10
            )
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                if self.model_name in models or f"{self.model_name}:latest" in models:
                    print(f"✓ Ollama LLM ready: {self.model_name}")
                else:
                    print(f"⚠ Model '{self.model_name}' not found. Available: {models}")
                    print(f"  Run: ollama pull {self.model_name}")
            else:
                print(f"⚠ Ollama returned status {resp.status_code}")
        except requests.ConnectionError:
            print("⚠ Cannot connect to Ollama. Ensure it is running.")
            print("  Start with: ollama serve")
        except Exception as e:
            print(f"⚠ Ollama connection check failed: {e}")

    # ------------------------------------------------------------------
    # Core generation
    # ------------------------------------------------------------------

    def generate(
        self,
        prompt: str,
        max_length: int = 200,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Generate text from prompt using Ollama API."""
        try:
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "top_p": 0.9,
                    "num_predict": max_length,
                    "repeat_penalty": 1.1,
                },
            }
            if system_prompt:
                payload["system"] = system_prompt

            resp = self._session.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.timeout,
            )
            resp.raise_for_status()
            return resp.json().get("response", "").strip()

        except requests.Timeout:
            print(f"⚠ Ollama request timed out ({self.timeout}s)")
            return self._fallback_generate(prompt)
        except requests.ConnectionError:
            print("⚠ Cannot connect to Ollama server")
            return self._fallback_generate(prompt)
        except Exception as e:
            print(f"Error in Ollama generation: {e}")
            return self._fallback_generate(prompt)

    def chat(
        self,
        messages: List[Dict[str, str]],
        max_length: int = 200,
        temperature: float = 0.7,
    ) -> str:
        """Chat-style generation using Ollama's /api/chat endpoint."""
        try:
            payload = {
                "model": self.model_name,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "top_p": 0.9,
                    "num_predict": max_length,
                    "repeat_penalty": 1.1,
                },
            }

            resp = self._session.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=self.timeout,
            )
            resp.raise_for_status()
            return resp.json().get("message", {}).get("content", "").strip()

        except Exception as e:
            print(f"Error in Ollama chat: {e}")
            return self._fallback_generate(
                messages[-1].get("content", "") if messages else ""
            )

    # ------------------------------------------------------------------
    # Interview Question Generation
    # ------------------------------------------------------------------

    def generate_question(
        self,
        question_type: str,
        context: Optional[str] = None,
        difficulty: str = "medium",
    ) -> str:
        """Generate interview question based on type and difficulty."""
        try:
            difficulty_guidance = {
                "easy": "suitable for freshers / beginners — fundamental concepts",
                "medium": "moderate complexity — solid understanding and practical application",
                "hard": "challenging & advanced — deep knowledge, problem-solving, system design",
            }
            diff = difficulty_guidance.get(difficulty, difficulty_guidance["medium"])

            system = (
                "You are an expert interview coach for engineering placement preparation. "
                "Generate exactly ONE interview question. Output ONLY the question — "
                "no preamble, no numbering, no explanation."
            )

            prompts = {
                "technical": f"Generate a {difficulty} technical interview question.\nContext: {context or 'General Software Engineering'}.\nDifficulty: {diff}",
                "hr": f"Generate a {difficulty} HR interview question.\nContext: {context or 'General'}.\nDifficulty: {diff}",
                "behavioral": f"Generate a {difficulty} behavioral (STAR method) interview question.\nContext: {context or 'Professional experience'}.\nDifficulty: {diff}",
                "project": f"Generate a {difficulty} project-based interview question.\nContext: {context or 'Project review'}.\nDifficulty: {diff}",
                "company": f"Generate a {difficulty} company-culture fit interview question.\nContext: {context or 'Company values'}.\nDifficulty: {diff}",
                "communication": f"Generate a {difficulty} communication skills question.\nDifficulty: {diff}",
            }

            prompt = prompts.get(question_type, prompts["technical"])
            result = self.generate(prompt, max_length=150, system_prompt=system)

            if not result or len(result.strip()) < 10:
                return self._fallback_generate_question(question_type, difficulty)
            return result.strip()

        except Exception as e:
            print(f"Error in generate_question: {e}")
            return self._fallback_generate_question(question_type, difficulty)

    # ------------------------------------------------------------------
    # Answer Evaluation
    # ------------------------------------------------------------------

    def evaluate_answer(self, question: str, answer: str) -> Dict:
        """Evaluate answer with strict, detailed criteria."""
        system = (
            "You are an expert technical interviewer conducting a rigorous evaluation. "
            "Analyze the candidate's answer critically and provide strict, honest feedback. "
            "ALWAYS respond in this exact format:\n"
            "Score: [number 0-100]\n"
            "Feedback: [2-3 specific sentences]\n\n"
            "Scoring: 0-40 Poor, 41-60 Below Average, 61-75 Average, 76-85 Good, 86-100 Excellent."
        )

        prompt = (
            f"Question: {question}\n"
            f"Candidate Answer: {answer}\n\n"
            "Evaluate with Score (0-100) and Feedback."
        )

        evaluation = self.generate(prompt, max_length=250, system_prompt=system)

        # Parse score
        score = 60
        score_match = re.search(r"Score:\s*(\d{1,3})", evaluation, re.IGNORECASE)
        if score_match:
            score = max(0, min(100, int(score_match.group(1))))

        # Parse feedback
        feedback = evaluation
        fb_match = re.search(
            r"Feedback:\s*(.+?)(?:\n\n|$)", evaluation, re.IGNORECASE | re.DOTALL
        )
        if fb_match:
            feedback = fb_match.group(1).strip()

        return {
            "score": score,
            "feedback": feedback,
            "detailed_analysis": evaluation,
        }

    # ------------------------------------------------------------------
    # Communication Evaluation
    # ------------------------------------------------------------------

    def evaluate_communication(self, answer: str, question: str = None) -> Dict:
        """Evaluate communication-specific aspects."""
        system = (
            "You are an expert communication evaluator. "
            "Rate each aspect 0-100 in this EXACT format:\n"
            "Clarity: [score]\nFluency: [score]\nTone: [score]\n"
            "Structure: [score]\nConfidence: [score]\n"
            "Feedback: [2-3 sentences]"
        )

        prompt = (
            f"Question: {question or 'General communication assessment'}\n"
            f"Candidate Answer: {answer}\n\n"
            "Evaluate communication skills."
        )

        evaluation = self.generate(prompt, max_length=300, system_prompt=system)

        def extract_score(name):
            m = re.search(rf"{name}:\s*(\d{{1,3}})", evaluation, re.IGNORECASE)
            return max(0, min(100, int(m.group(1)))) if m else 60

        clarity = extract_score("Clarity")
        fluency = extract_score("Fluency")
        tone = extract_score("Tone")
        structure = extract_score("Structure")
        confidence = extract_score("Confidence")
        overall = round((clarity + fluency + tone + structure + confidence) / 5)

        feedback = evaluation
        fb_match = re.search(
            r"Feedback:\s*(.+?)(?:\n\n|$)", evaluation, re.IGNORECASE | re.DOTALL
        )
        if fb_match:
            feedback = fb_match.group(1).strip()

        return {
            "clarity": clarity,
            "fluency": fluency,
            "tone": tone,
            "structure": structure,
            "confidence": confidence,
            "overall": overall,
            "score": overall,
            "feedback": feedback,
            "detailed_analysis": evaluation,
        }

    # ------------------------------------------------------------------
    # GD Topic & Company Questions
    # ------------------------------------------------------------------

    def generate_gd_topic(self) -> str:
        """Generate a group discussion topic."""
        system = (
            "Generate ONE interesting, debatable group discussion topic "
            "relevant for engineering students preparing for placements. "
            "Output ONLY the topic — no explanation."
        )
        return self.generate(
            "Generate a group discussion topic.", max_length=60, system_prompt=system
        )

    def generate_company_question(
        self, company: str, difficulty: str = "medium"
    ) -> str:
        """Generate company-specific interview question."""
        system = (
            f"You are a hiring manager at {company}. "
            "Generate exactly ONE interview question that tests both "
            "technical knowledge and company fit. Output ONLY the question."
        )
        prompt = (
            f"Generate a {difficulty} interview question for {company}. "
            f"The question should reflect {company}'s interview style."
        )
        result = self.generate(prompt, max_length=150, system_prompt=system)
        return result if result and len(result) > 10 else self._fallback_generate_question("company", difficulty)

    # ------------------------------------------------------------------
    # Resume Analysis
    # ------------------------------------------------------------------

    def analyze_resume(self, resume_text: str, jd_text: Optional[str] = None) -> Dict:
        """Analyze resume using LLM with detailed evaluation."""
        system = (
            "You are an expert resume reviewer. Provide constructive, positive feedback. "
            "Respond in this format:\n"
            "Score: [0-100]\n"
            "Strengths:\n- ...\n- ...\n"
            "Suggestions:\n- ...\n- ...\n"
            "Skills: skill1, skill2, ...\n"
        )

        if jd_text:
            prompt = (
                f"Analyze this resume against the job description.\n\n"
                f"Job Description:\n{jd_text[:2000]}\n\n"
                f"Resume:\n{resume_text[:3000]}\n\n"
                "Provide Score, Strengths, Suggestions, and extracted Skills."
            )
        else:
            prompt = (
                f"Analyze this resume for job market readiness.\n\n"
                f"Resume:\n{resume_text[:3000]}\n\n"
                "Provide Score, Strengths, Suggestions, and extracted Skills."
            )

        analysis = self.generate(prompt, max_length=800, system_prompt=system)

        return {
            "analysis": analysis,
            "score": self._extract_score(analysis),
            "strengths": self._extract_list_section(analysis, "Strengths"),
            "suggestions": self._extract_list_section(analysis, "Suggestions"),
            "improvements": self._extract_list_section(analysis, "Improvements"),
            "skills": self._extract_skills(analysis),
        }

    # ------------------------------------------------------------------
    # Fallback generators (when Ollama is unavailable)
    # ------------------------------------------------------------------

    def _fallback_generate(self, prompt: str) -> str:
        """Rule-based fallback when Ollama is unavailable."""
        if "question" in prompt.lower() or "ask" in prompt.lower():
            if "technical" in prompt.lower():
                return "Explain the concept of object-oriented programming and its principles."
            elif "hr" in prompt.lower():
                return "Tell me about yourself and your career goals."
            elif "behavioral" in prompt.lower():
                return "Describe a challenging situation you faced and how you handled it."
            else:
                return "Can you walk me through your most recent project?"
        elif "topic" in prompt.lower():
            topics = [
                "Is artificial intelligence a threat to human jobs?",
                "Should social media be regulated by governments?",
                "Is work from home the future of work?",
            ]
            return random.choice(topics)
        return "I understand. Please continue."

    def _fallback_generate_question(
        self, question_type: str, difficulty: str = "medium"
    ) -> str:
        """Fallback question generation."""
        fallback = {
            "technical": {
                "easy": "What is the difference between a list and a tuple in Python?",
                "medium": "Explain time complexity and give an example of O(n log n).",
                "hard": "Design a distributed system to handle 1 million requests/sec.",
            },
            "hr": {
                "easy": "Tell me about yourself and your career goals.",
                "medium": "Why do you want to work for our company?",
                "hard": "Describe a difficult decision you made under pressure.",
            },
            "behavioral": {
                "easy": "Tell me about a time you worked in a team.",
                "medium": "Describe a challenging situation and how you handled it.",
                "hard": "Give an example of leading a team through a crisis.",
            },
            "project": {
                "easy": "Can you describe one of your projects?",
                "medium": "What were the main challenges in your project?",
                "hard": "How would you scale your project to handle 10x load?",
            },
            "company": {
                "easy": "What do you know about our company?",
                "medium": "Why do you want to join our company?",
                "hard": "How do you see yourself contributing to our mission?",
            },
            "communication": {
                "easy": "Describe your daily routine.",
                "medium": "Explain how you would teach someone a skill.",
                "hard": "Explain a complex problem in simple terms.",
            },
        }
        q = fallback.get(question_type, fallback["technical"])
        return q.get(difficulty, q["medium"])

    # ------------------------------------------------------------------
    # Text extraction helpers
    # ------------------------------------------------------------------

    def _extract_score(self, text: str) -> int:
        m = re.search(r"Score:\s*(\d{1,3})", text, re.IGNORECASE)
        if m:
            return max(0, min(100, int(m.group(1))))
        # Fallback: find any 2-digit number
        m2 = re.search(r"\b(\d{2})\b", text)
        return int(m2.group(1)) if m2 else 70

    def _extract_list_section(self, text: str, section_name: str) -> List[str]:
        items = []
        lines = text.split("\n")
        in_section = False
        for line in lines:
            if section_name.lower() in line.lower() and ":" in line:
                in_section = True
                continue
            if in_section:
                stripped = line.strip()
                if stripped and (
                    stripped.startswith("-")
                    or stripped.startswith("•")
                    or stripped.startswith("*")
                    or (stripped[0].isdigit() and "." in stripped[:3])
                ):
                    clean = stripped.lstrip("-•*0123456789. ").strip()
                    if clean and len(clean) > 5:
                        items.append(clean)
                    if len(items) >= 5:
                        break
                elif stripped and not stripped.startswith("-"):
                    # Hit a new section header
                    if ":" in stripped:
                        break
        return items[:5]

    def _extract_skills(self, text: str) -> List[str]:
        # Try to find "Skills:" line
        m = re.search(r"Skills?:\s*(.+)", text, re.IGNORECASE)
        if m:
            skills_str = m.group(1).strip()
            skills = [s.strip() for s in skills_str.split(",") if s.strip()]
            if skills:
                return skills[:15]

        # Fallback: look for known tech skills
        common = [
            "Python", "Java", "JavaScript", "TypeScript", "React", "Node.js",
            "Vue", "Angular", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis",
            "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git", "CI/CD",
            "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
            "HTML", "CSS", "REST API", "GraphQL", "Microservices",
            "Spring Boot", "Django", "Flask", "Go", "Rust", "C++",
        ]
        found = [s for s in common if s.lower() in text.lower()]
        return found[:15]


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_llm_instance = None


def get_llm(
    model_name: str = OLLAMA_MODEL,
    use_lightweight: bool = False,  # ignored, kept for API compat
) -> OllamaLLM:
    """Get or create Ollama LLM instance.

    Args:
        model_name: Ollama model name (e.g. "qwen3.5:9b")
        use_lightweight: Deprecated, ignored. Kept for backward compatibility.
    """
    global _llm_instance

    if _llm_instance is None or _llm_instance.model_name != model_name:
        # Check for custom fine-tuned model first
        custom_model = os.environ.get("OLLAMA_FINETUNED_MODEL")
        if custom_model:
            try:
                resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
                available = [m["name"] for m in resp.json().get("models", [])]
                if custom_model in available or f"{custom_model}:latest" in available:
                    print(f"Using fine-tuned model: {custom_model}")
                    _llm_instance = OllamaLLM(model_name=custom_model)
                    return _llm_instance
            except Exception:
                pass

        _llm_instance = OllamaLLM(model_name=model_name)

    return _llm_instance
