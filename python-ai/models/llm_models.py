import os
import re
import json
import time
import asyncio
import random
import logging
import requests
import httpx
from typing import List, Dict, Optional
from pathlib import Path
from cachetools import TTLCache
from jinja2 import Environment, FileSystemLoader

# Import trending topics for enhanced question generation
from models.trending_topics import (
    build_company_question_prompt,
    build_company_evaluation_prompt,
    get_trending_context,
    get_difficulty_instruction,
    get_company_persona,
    get_all_trending_sample_questions,
    TRENDING_TOPICS_2026,
)

# Configure Jinja Environment for prompts
TEMPLATE_DIR = Path(__file__).parent.parent / "prompts" / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), trim_blocks=True, lstrip_blocks=True)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

from dotenv import load_dotenv
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "skillnox-qwen:latest")
OLLAMA_TIMEOUT = int(os.environ.get("OLLAMA_TIMEOUT", "180"))

# Global semaphore to limit concurrent LLM inferences
# Set to 350 concurrent candidate evaluations for massive placement drives
LLM_CONCURRENCY = int(os.environ.get("OLLAMA_CONCURRENCY", "350"))
LLM_SEMAPHORE = asyncio.Semaphore(LLM_CONCURRENCY)

# Simple cache for repeated evaluations (10 minute TTL)
eval_cache = TTLCache(maxsize=500, ttl=600)

# ---------------------------------------------------------------------------
# OllamaLLM — Main LLM class
# ---------------------------------------------------------------------------

class OllamaLLM:
    """LLM wrapper using Ollama's REST API with async support and throttling."""

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
        
        # High-performance multi-socket Async client for true parallel concurrency
        limits = httpx.Limits(max_keepalive_connections=350, max_connections=500)
        self._async_client = httpx.AsyncClient(
            limits=limits,
            timeout=float(self.timeout),
            headers={"Content-Type": "application/json"}
        )

        nvidia_key = os.environ.get("NVIDIA_API_KEY")
        if nvidia_key:
            nvidia_model = os.environ.get("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")
            print(f"[OK] AI Engine Initialized: NVIDIA NIM Cloud API ({nvidia_model})")
        else:
            print(f"Initializing Local LLM: {model_name} @ {base_url}")
            self._verify_connection()

    async def close(self):
        """Close the async client to free connections."""
        if self._async_client:
            await self._async_client.aclose()
            self._async_client = None
        if self._session:
            self._session.close()
            self._session = None

    # ------------------------------------------------------------------
    # Connection helpers
    # ------------------------------------------------------------------

    def _verify_connection(self):
        """Verify NVIDIA NIM API or local Ollama is running."""
        nvidia_key = os.environ.get("NVIDIA_API_KEY")
        nvidia_model = os.environ.get("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")

        if nvidia_key:
            print(f"[OK] NVIDIA NIM LLM Cloud API ready: {nvidia_model} (High-Speed H100 GPU cluster)")
            return

        try:
            resp = self._session.get(
                f"{self.base_url}/api/tags", timeout=10
            )
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                if self.model_name in models or f"{self.model_name}:latest" in models:
                    print(f"[OK] Ollama LLM ready: {self.model_name}")
                else:
                    print(f"[WARN] Model '{self.model_name}' not found. Available: {models}")
                    print(f"  Run: ollama pull {self.model_name}")
            else:
                print(f"[WARN] Ollama returned status {resp.status_code}")
        except requests.ConnectionError:
            print("[WARN] Cannot connect to Ollama. Ensure it is running.")
            print("  Start with: ollama serve")
        except Exception as e:
            print(f"[WARN] Ollama connection check failed: {e}")

    # ------------------------------------------------------------------
    # Core generation (Async & Sync with NVIDIA NIM Cloud Fallback)
    # ------------------------------------------------------------------

    async def generate_async(
        self,
        prompt: str,
        max_length: int = 300,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None,
        json_format: bool = False,
    ) -> str:
        """Generate text using NVIDIA NIM API if key exists, otherwise local Ollama."""
        keys_str = os.environ.get("NVIDIA_API_KEYS", "")
        if keys_str:
            nvidia_keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        else:
            single_k = os.environ.get("NVIDIA_API_KEY", "").strip()
            nvidia_keys = [single_k] if single_k else []

        nvidia_model = os.environ.get("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")

        if nvidia_keys:
            url = "https://integrate.api.nvidia.com/v1/chat/completions"
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            payload = {
                "model": nvidia_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_length,
                "top_p": 0.9
            }
            if json_format:
                payload["response_format"] = {"type": "json_object"}

            # Iterate through key pool first
            for key_idx, nvidia_key in enumerate(nvidia_keys, 1):
                headers = {
                    "Authorization": f"Bearer {nvidia_key}",
                    "Content-Type": "application/json"
                }

                # Retry loop per key
                for attempt in range(2):
                    is_rate_limited = False
                    try:
                        async with LLM_SEMAPHORE:
                            resp = await self._async_client.post(url, headers=headers, json=payload)
                            if resp.status_code == 429:
                                is_rate_limited = True
                            else:
                                resp.raise_for_status()
                                data = resp.json()
                                return data["choices"][0]["message"]["content"].strip()
                    except Exception as e:
                        if not is_rate_limited:
                            print(f"[NVIDIA Key {key_idx}] Attempt {attempt+1} failed ({e}), trying next option...")
                            await asyncio.sleep(0.3)

                    if is_rate_limited:
                        backoff = (attempt + 1) * 0.5
                        print(f"[NVIDIA Key {key_idx} 429] Rate limit hit. Retrying key {key_idx} after releasing semaphore...")
                        await asyncio.sleep(backoff)

        # Fallback to local Ollama API
        async with LLM_SEMAPHORE:
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
                        "num_ctx": 2048,
                    },
                }
                if system_prompt:
                    payload["system"] = system_prompt
                if json_format:
                    payload["format"] = "json"

                resp = await self._async_client.post(f"{self.base_url}/api/generate", json=payload)
                resp.raise_for_status()
                return resp.json().get("response", "").strip()
            except Exception as e:
                print(f"[WARN] Local Ollama async generation failed: {e}")
                return self._fallback_generate(prompt)

    def generate(self, prompt, max_length=300, temperature=0.7, system_prompt=None):
        """Synchronous generation using NVIDIA NIM API if key exists, otherwise local Ollama."""
        nvidia_key = os.environ.get("NVIDIA_API_KEY")
        nvidia_model = os.environ.get("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")

        if nvidia_key:
            try:
                url = "https://integrate.api.nvidia.com/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {nvidia_key}",
                    "Content-Type": "application/json"
                }
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})

                payload = {
                    "model": nvidia_model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_length,
                    "top_p": 0.9
                }
                resp = self._session.post(url, headers=headers, json=payload, timeout=self.timeout)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
            except Exception as e:
                print(f"[WARN] NVIDIA NIM API sync call failed: {e}. Falling back to local Ollama...")

        # Fallback to local Ollama API
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

            resp = self._session.post(f"{self.base_url}/api/generate", json=payload, timeout=self.timeout)
            resp.raise_for_status()
            return resp.json().get("response", "").strip()
        except Exception as e:
            print(f"Error in sync generate: {e}")
            return self._fallback_generate(prompt)

    # ------------------------------------------------------------------
    # Interview Question Generation (Async)
    # ------------------------------------------------------------------

    async def generate_question_async(
        self,
        question_type: str,
        context: Optional[str] = None,
        difficulty: str = "medium",
        company: Optional[str] = None,
        include_trending: bool = True,
    ) -> str:
        """Generate interview question with company persona, difficulty calibration, and trending awareness."""
        try:
            # Build enhanced prompt using trending_topics module
            if company:
                system = build_company_question_prompt(
                    question_type=question_type,
                    company=company,
                    difficulty=difficulty,
                    include_trending=include_trending,
                )
            else:
                # Generic interviewer with trending awareness
                diff_instruction = get_difficulty_instruction(difficulty)
                trending_ctx = ""
                if include_trending:
                    trending_ctx = f"\nIncorporate awareness of 2025-26 trends where relevant:\n{get_trending_context()}"

                if question_type == "hr":
                    system = (
                        "You are an experienced HR Recruiter conducting a campus placement HR interview round.\n"
                        "STRICT GUARDRAILS FOR HR INTERVIEW:\n"
                        "- Do NOT ask technical questions, coding problems, math/arithmetic problems, or system design.\n"
                        "- Focus strictly on HR topics: career goals (e.g. 'Where do you see yourself in 3 to 5 years in this job?'), expectations regarding job roles & responsibilities, company culture fit, strengths/weaknesses, teamwork, handling pressure, and personal motivation.\n"
                        "Generate exactly ONE HR interview question. Output ONLY the question — no preamble, no numbering, no explanation."
                    )
                else:
                    system = (
                        "You are an expert interview coach for engineering placement preparation. "
                        f"Difficulty level: {difficulty.upper()}. {diff_instruction}\n"
                        f"{trending_ctx}\n"
                        "STRICT GUARDRAILS:\n"
                        "- Do NOT ask the candidate to write code, implement functions, or produce code output.\n"
                        "- Do NOT ask coding/algorithm problems that require writing actual code.\n"
                        "- You CAN ask about technical concepts (OOP, DBMS, OS, networking, design patterns).\n"
                        "- You CAN ask 'explain', 'describe', 'compare', 'what is', 'how does X work' questions.\n"
                        "- You CAN ask system design/architecture questions about designing systems at scale.\n"
                        "Generate exactly ONE interview question. Output ONLY the question — "
                        "no preamble, no numbering, no explanation."
                    )

            type_hints = {
                "technical": f"Generate a {difficulty} technical interview question. Focus: {context or 'Software Engineering concepts like OOP, DBMS, OS, Networking, Design Patterns'}. Do NOT ask to write code — ask conceptual explanation questions only.",
                "hr": f"Generate a {difficulty} HR interview question. Focus: {context or 'Career goals, 3-5 year future plans, expectations for roles & responsibilities, strengths, weaknesses, and company culture fit'}. Do NOT ask technical, math, or coding questions.",
                "behavioral": f"Generate a {difficulty} behavioral STAR-method question. Focus: {context or 'Professional scenarios, teamwork, conflict resolution, and handling pressure'}.",
                "project": f"Generate a {difficulty} project explanation question. Focus: {context or 'Architecture and contributions'}.",
                "company": f"Generate a {difficulty} company-specific interview question for {company or 'a tech company'}. Focus: {context or 'Company values and fit'}.",
                "communication": f"Generate a {difficulty} communication assessment question. Focus: {context or 'Clarity and articulation'}.",
                "coding": f"Generate a {difficulty} coding/algorithm question. Focus: {context or 'Data structures and algorithms'}.",
                "aptitude": f"Generate a {difficulty} aptitude/reasoning question. Focus: {context or 'Quantitative and logical reasoning'}.",
                "resume_based": f"Generate a {difficulty} interview question based on the candidate's resume skills: {context or 'general software engineering skills'}. Ask about their practical experience, depth of knowledge, or real-world application of these specific skills. Do NOT ask to write code.",
                "system_design": f"Generate a {difficulty} system design/architecture question. Focus: {context or 'Designing scalable systems, APIs, databases, and distributed architectures for millions of users'}. Ask about high-level architecture, component design, trade-offs, and scalability strategies.",
            }

            prompt = type_hints.get(question_type, type_hints["technical"])

            # Use lower temperature for aptitude (precision matters) and higher for creative
            temp = 0.5 if question_type in ("aptitude", "coding") else 0.7
            result = await self.generate_async(prompt, max_length=200, temperature=temp, system_prompt=system)

            if not result or len(result.strip()) < 10:
                return self._fallback_generate_question(question_type, difficulty)
            return result.strip()

        except Exception as e:
            print(f"Error in generate_question_async: {e}")
            return self._fallback_generate_question(question_type, difficulty)

    def generate_question(self, question_type, context=None, difficulty="medium"):
        """Sync version"""
        system = "Generate exactly ONE interview question. Output ONLY the question."
        prompt = f"Generate a {difficulty} {question_type} interview question. Context: {context}"
        return self.generate(prompt, system_prompt=system)

    # ------------------------------------------------------------------
    # Answer Evaluation (Async)
    # ------------------------------------------------------------------

    async def evaluate_answer_async(self, question: str, answer: str) -> Dict:
        """Evaluate answer with async support and caching."""
        # Check cache first
        cache_key = f"{question}|{answer}"
        if cache_key in eval_cache:
            return eval_cache[cache_key]

        is_behavioral = any(word in question.lower() for word in ["tell me about a time", "situation", "describe a scenario", "how do you handle", "conflict", "experience"])
        
        system = (
            "You are an encouraging, expert Campus Technical Recruiter evaluating engineering students in a live mock interview.\n"
            "CRITICAL CONTEXT: Candidate answers are recorded via Speech-To-Text (STT/Whisper). "
            "STT software frequently produces minor phonetic typos or homophone mis-hearings (e.g., 'hits' for 'heads', 'actual' for 'factorial', 'NBDIJOD' for 'NBDIJOF', 'consecutive 2 difference' for 'difference increases by 2'). "
            "You MUST be intelligent and forgiving of minor STT transcription errors. Do NOT penalize phonetic or spelling glitches caused by speech recognition!\n\n"
            "FAIR CANDIDATE SCORING RULES:\n"
            "- If the candidate states the CORRECT numerical answer or core technical concept (e.g., 120, 42, 37.5% / 3 in 8, block scope vs function scope, shifting letters in alphabet), ALWAYS AWARD AT LEAST 75-90% SCORE!\n"
            "- 85-100: Candidate provides correct answer AND clear explanation or step-by-step logic.\n"
            "- 70-84: Candidate provides correct final answer or main concept clearly, even if brief or containing STT phonetic typos.\n"
            "- 45-69: Candidate shows partial understanding but missed key details or made a slight calculation error.\n"
            "- 0-30: Answer is completely wrong, off-topic, or empty.\n\n"
            "EXACT OUTPUT FORMAT REQUIRED (No preamble, no markdown headers):\n"
            "Score: [number 0-100]\n"
            "Feedback: [2-3 supportive, constructive sentences highlighting candidate strengths and simple areas to improve]\n"
            "IdealAnswer: [2-3 clear, student-friendly sentences demonstrating how to answer this question effectively]\n\n"
            + ("SPECIAL INSTRUCTION (BEHAVIORAL): Encourage candidate storytelling and clear personal contribution.\n" if is_behavioral else "SPECIAL INSTRUCTION (TECHNICAL): Focus on core technical understanding and problem solving.\n") +
            "Evaluate fairly for college students and start your response immediately with 'Score: '."
        )

        prompt = (
            f"Question: {question}\n"
            f"Candidate Answer: {answer}\n\n"
            "Evaluate fairly and output Score, Feedback, and IdealAnswer."
        )

        evaluation = await self.generate_async(prompt, max_length=500, temperature=0.3, system_prompt=system)

        # Strip any <think>...</think> blocks
        evaluation = re.sub(r'<think>.*?</think>', '', evaluation, flags=re.DOTALL).strip()

        # Parse score
        score = 50
        score_match = re.search(r"Score:\s*(\d{1,3})", evaluation, re.IGNORECASE)
        if score_match:
            score = max(0, min(100, int(score_match.group(1))))

        # Parse feedback
        feedback = ""
        fb_match = re.search(
            r"Feedback:\s*(.+?)(?:IdealAnswer:|Ideal Answer:|$)", evaluation, re.IGNORECASE | re.DOTALL
        )
        if fb_match:
            feedback = fb_match.group(1).strip()

        # Parse ideal answer
        ideal_answer = ""
        ideal_match = re.search(
            r"(?:IdealAnswer|Ideal Answer):\s*(.+?)$", evaluation, re.IGNORECASE | re.DOTALL
        )
        if ideal_match:
            ideal_answer = ideal_match.group(1).strip()

        if not feedback:
            feedback = evaluation[:300]

        combined_feedback = feedback
        if ideal_answer:
            combined_feedback = f"{feedback}\n\nHow to answer: {ideal_answer}"

        result = {
            "score": score,
            "feedback": combined_feedback,
            "detailed_analysis": evaluation,
        }
        
        # Save to cache
        eval_cache[cache_key] = result
        return result

    def evaluate_answer(self, question: str, answer: str) -> Dict:
        """Sync version for fallback"""
        system = "Evaluate the answer. Format: Score: [n], Feedback: [text]"
        prompt = f"Question: {question}\nAnswer: {answer}"
        evaluation = self.generate(prompt, system_prompt=system)
        
        score = 50
        score_match = re.search(r"Score:\s*(\d{1,3})", evaluation, re.IGNORECASE)
        if score_match: score = int(score_match.group(1))
        
        return {"score": score, "feedback": evaluation}

    # ------------------------------------------------------------------
    # Communication Evaluation (Async)
    # ------------------------------------------------------------------

    async def evaluate_communication_async(self, answer: str, question: str = None) -> Dict:
        """Evaluate communication-specific aspects (Async)."""
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

        evaluation = await self.generate_async(prompt, max_length=300, system_prompt=system)

        def extract_score(name):
            m = re.search(rf"{name}:\s*(\d{{1,3}})", evaluation, re.IGNORECASE)
            return max(0, min(100, int(m.group(1)))) if m else 60

        clarity = extract_score("Clarity")
        fluency = extract_score("Fluency")
        tone = extract_score("Tone")
        structure = extract_score("Structure")
        confidence = extract_score("Confidence")
        overall = round((clarity + fluency + tone + structure + confidence) / 5)

        fb_match = re.search(
            r"Feedback:\s*(.+?)(?:\n\n|$)", evaluation, re.IGNORECASE | re.DOTALL
        )
        feedback = fb_match.group(1).strip() if fb_match else evaluation[:200]

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
    # Resume Analysis (Async)
    # ------------------------------------------------------------------

    # ------------------------------------------------------------------
    # Resume Parsing & Extraction (Async)
    # ------------------------------------------------------------------

    async def parse_resume_structured(self, resume_text: str) -> Dict:
        """Parse resume text and extract skills, experience, and education in one LLM call."""
        try:
            template = jinja_env.get_template("resume_parsing.jinja")
            prompt = template.render(text_content=resume_text)
            
            system = "You are an expert resume parser. Respond ONLY with a valid JSON object matching the requested schema."
            
            logger = logging.getLogger(__name__) if 'logging' in globals() else None
            if logger:
                logger.info("Extracting structured resume sections using Ollama...")

            response_text = await self.generate_async(
                prompt=prompt,
                max_length=1500,
                temperature=0.1,
                system_prompt=system,
                json_format=True
            )

            # Strip potential markdown code blocks
            if "```" in response_text:
                response_text = re.sub(r"```[a-zA-Z]*", "", response_text).strip()

            parsed_data = json.loads(response_text)
            return {
                "skills": parsed_data.get("skills", []),
                "experience": parsed_data.get("experience", []),
                "education": parsed_data.get("education", [])
            }
        except Exception as e:
            print(f"Error in parse_resume_structured: {e}")
            return {"skills": [], "experience": [], "education": []}

    # ------------------------------------------------------------------
    # Resume Analysis / HackerRank Evaluator (Async)
    # ------------------------------------------------------------------

    async def analyze_resume_async(self, resume_text: str, jd_text: Optional[str] = None) -> Dict:
        """Analyze and score resume using HackerRank criteria and GitHub data."""
        try:
            # 1. Look for GitHub URL to enrich evaluation
            github_data = ""
            github_url_match = re.search(r"github\.com/([a-zA-Z0-9-]+)", resume_text, re.IGNORECASE)
            if github_url_match:
                github_url = f"https://{github_url_match.group(0)}"
                print(f"Detected GitHub URL: {github_url}. Pulling enrichment data...")
                try:
                    from services import github_service
                    github_data = await github_service.fetch_and_format_github_info(self, github_url)
                except Exception as gh_err:
                    print(f"Warning: Failed to fetch GitHub details: {gh_err}")

            # 2. Prepare context
            combined_text = resume_text
            if github_data:
                combined_text = f"{resume_text}\n\n{github_data}"

            # 3. Render prompt templates
            criteria_template = jinja_env.get_template("resume_evaluation_criteria.jinja")
            prompt = criteria_template.render(text_content=combined_text)

            system_template = jinja_env.get_template("resume_evaluation_system_message.jinja")
            system_prompt = system_template.render()

            print("Evaluating resume using HackerRank scoring model...")
            response_text = await self.generate_async(
                prompt=prompt,
                max_length=2000,
                temperature=0.2,
                system_prompt=system_prompt,
                json_format=True
            )

            # Strip markdown formatting from JSON
            if "```" in response_text:
                response_text = re.sub(r"```[a-zA-Z]*", "", response_text).strip()

            parsed_evaluation = json.loads(response_text)

            # 4. Calculate total score
            scores = parsed_evaluation.get("scores", {})
            open_source = scores.get("open_source", {}).get("score", 0)
            self_projects = scores.get("self_projects", {}).get("score", 0)
            production = scores.get("production", {}).get("score", 0)
            technical_skills = scores.get("technical_skills", {}).get("score", 0)
            
            bonus = parsed_evaluation.get("bonus_points", {}).get("total", 0)
            deductions = parsed_evaluation.get("deductions", {}).get("total", 0)

            raw_total_score = open_source + self_projects + production + technical_skills + bonus - deductions
            # Normalize to 0-100 scale for standard progress rendering, but clamp cleanly
            overall_score = min(100.0, max(0.0, float(raw_total_score)))

            # Extract list section helper for fallback
            strengths = parsed_evaluation.get("key_strengths", [])
            improvements = parsed_evaluation.get("areas_for_improvement", [])

            return {
                "analysis": response_text,
                "score": overall_score,
                "strengths": strengths,
                "suggestions": improvements,
                "improvements": improvements,
                "skills": self._extract_skills(resume_text),
                "hiringAgentEvaluation": parsed_evaluation
            }

        except Exception as e:
            print(f"Error in analyze_resume_async (HackerRank Scorer): {e}")
            # Fallback to simple analysis if the model output fails to parse
            return {
                "analysis": None,
                "score": 60.0,
                "strengths": ["Clear technical section"],
                "suggestions": ["Add link to GitHub portfolio", "Include impact metrics"],
                "improvements": ["Add link to GitHub portfolio", "Include impact metrics"],
                "skills": self._extract_skills(resume_text)
            }

    # ------------------------------------------------------------------
    # Personality Analysis (Async)
    # ------------------------------------------------------------------

    async def analyze_personality_async(self, responses: List[str]) -> Dict:
        """Analyze personality traits from responses (Async)."""
        system = (
            "You are an expert psychologist analyzing interview responses. "
            "Evaluate the candidate's personality on 4 dimensions (-1.0 to +1.0).\n"
            "IE: Introvert-Extrovert, TF: Thinker-Feeler, LC: Logical-Creative, PS: Planner-Spontaneous.\n"
            "Respond EXACTLY: IE: [s], TF: [s], LC: [s], PS: [s], Traits: [traits]"
        )

        combined = "\n".join([f"R{i+1}: {r[:400]}" for i, r in enumerate(responses[:5])])
        prompt = f"Analyze personality:\n\n{combined}"

        evaluation = await self.generate_async(prompt, max_length=200, system_prompt=system)

        def extract_dim(name):
            m = re.search(rf"{name}:\s*([+-]?\d*\.?\d+)", evaluation, re.IGNORECASE)
            return max(-1.0, min(1.0, float(m.group(1)))) if m else 0.0

        ie = extract_dim("IE")
        tf = extract_dim("TF")
        lc = extract_dim("LC")
        ps = extract_dim("PS")

        traits = []
        if ie > 0.3: traits.append("Extroverted")
        elif ie < -0.3: traits.append("Introverted")
        if tf < -0.3: traits.append("Analytical")
        elif tf > 0.3: traits.append("Empathetic")
        
        return {
            "introvert_extrovert": ie,
            "thinker_feeler": tf,
            "logical_creative": lc,
            "planner_spontaneous": ps,
            "dominant_traits": traits or ["Balanced"],
        }

    # ------------------------------------------------------------------
    # Helper for parsing
    # ------------------------------------------------------------------

    def _extract_score(self, text: str) -> int:
        m = re.search(r"Score:\s*(\d{1,3})", text, re.IGNORECASE)
        if m:
            return max(0, min(100, int(m.group(1))))
        return 70

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
                if stripped and any(stripped.startswith(c) for c in ["-", "•", "*"]):
                    items.append(stripped.lstrip("-•* ").strip())
                elif stripped and ":" in stripped:
                    break
        return items[:5]

    def _extract_skills(self, text: str) -> List[str]:
        m = re.search(r"Skills?:\s*(.+)", text, re.IGNORECASE)
        if m:
            return [s.strip() for s in m.group(1).split(",") if s.strip()][:15]
        return []

    # ------------------------------------------------------------------
    # Fallback generators (kept as is)
    # ------------------------------------------------------------------

    def _fallback_generate(self, prompt: str) -> str:
        return "I understand. Please continue."

    def _fallback_generate_question(self, question_type: str, difficulty: str = "medium") -> str:
        return "Can you tell me about your experience with technical problem solving?"

    async def generate_gd_topic_async(self) -> str:
        """Generate a trending, debatable GD topic for engineers."""
        trending_gd_topics = [
            "AI in job market", "data privacy vs security", "remote work future",
            "AI-generated content regulation", "cryptocurrency viability",
            "4-day work week in India", "electric vehicles by 2035",
        ]
        topic_hint = random.choice(trending_gd_topics)
        system = (
            "Generate ONE thought-provoking, debatable group discussion topic for engineering students. "
            "The topic should be relevant to 2025-26 and encourage multiple perspectives. "
            "Output ONLY the topic statement, nothing else."
        )
        prompt = f"Generate a GD topic related to or inspired by: {topic_hint}"
        return await self.generate_async(prompt, max_length=80, temperature=0.8, system_prompt=system)

    async def generate_company_question_async(
        self,
        company: str,
        difficulty: str = "medium",
        round_type: Optional[str] = None,
        include_trending: bool = True,
    ) -> str:
        """Generate a company-specific interview question with persona and trending awareness."""
        persona = get_company_persona(company)

        system_parts = [
            f"You are a senior interviewer at {company}.",
            f"Interview style: {persona['interviewer_style']}",
            f"Key focus areas: {persona['key_focus']}",
            f"Company values: {persona['values']}",
        ]

        if include_trending:
            system_parts.append(
                f"\nIncorporate awareness of 2025-26 trends where relevant:\n"
                f"{get_trending_context(['genai_llm', 'cloud_native', 'system_design'])}"
            )

        diff_instruction = get_difficulty_instruction(difficulty)
        system_parts.append(f"\nDifficulty: {difficulty.upper()}. {diff_instruction}")
        system_parts.append(
            "\nGenerate exactly ONE interview question that {company} would ask. "
            "Output ONLY the question, nothing else.".replace("{company}", company)
        )

        system = "\n".join(system_parts)

        round_hint = f" for a {round_type} round" if round_type else ""
        prompt = f"Generate a {difficulty} interview question{round_hint} for {company}."

        result = await self.generate_async(prompt, max_length=180, temperature=0.65, system_prompt=system)
        if not result or len(result.strip()) < 10:
            return self._fallback_generate_question("technical", difficulty)
        return result.strip()

    async def evaluate_answer_company_async(
        self,
        question: str,
        answer: str,
        company: Optional[str] = None,
        question_type: str = "technical",
    ) -> Dict:
        """Evaluate answer with company-specific rubric."""
        # Build company-aware evaluation prompt
        eval_context = build_company_evaluation_prompt(company, question_type)

        is_behavioral = any(word in question.lower() for word in [
            "tell me about a time", "situation", "describe a scenario",
            "how do you handle", "conflict", "experience", "leadership principle"
        ])

        system = (
            f"{eval_context}\n\n"
            "Analyze the candidate's answer critically and provide strict, honest feedback. "
            "ALWAYS respond in this EXACT format with NO extra text:\n"
            "Score: [number 0-100]\n"
            "Feedback: [2-3 specific sentences about what was good/bad]\n"
            "IdealAnswer: [A concise 2-4 sentence model answer]\n\n"
            "Scoring Rubric:\n"
            "- 0-30: Vague, irrelevant, or extremely short.\n"
            "- 31-50: Partially addresses question but lacks depth.\n"
            "- 51-70: Good answer but could be more structured.\n"
            "- 71-85: Strong answer with clear examples.\n"
            "- 86-100: Exceptional, perfectly articulated.\n\n"
            + ("BEHAVIORAL: Look for STAR method. Penalize if result or actions are missing.\n" if is_behavioral else "") +
            "ONLY output Score, Feedback, and IdealAnswer."
        )

        prompt = (
            f"/no_think\n"
            f"Question: {question}\n"
            f"Candidate Answer: {answer}\n\n"
            "Evaluate with Score (0-100), Feedback, and IdealAnswer. "
            "START YOUR RESPONSE WITH 'Score: '."
        )

        evaluation = await self.generate_async(prompt, max_length=450, system_prompt=system)
        evaluation = re.sub(r'<think>.*?</think>', '', evaluation, flags=re.DOTALL).strip()

        score = 50
        score_match = re.search(r"Score:\s*(\d{1,3})", evaluation, re.IGNORECASE)
        if score_match:
            score = max(0, min(100, int(score_match.group(1))))

        feedback = ""
        fb_match = re.search(r"Feedback:\s*(.+?)(?:IdealAnswer:|Ideal Answer:|$)", evaluation, re.IGNORECASE | re.DOTALL)
        if fb_match:
            feedback = fb_match.group(1).strip()

        ideal_answer = ""
        ideal_match = re.search(r"(?:IdealAnswer|Ideal Answer):\s*(.+?)$", evaluation, re.IGNORECASE | re.DOTALL)
        if ideal_match:
            ideal_answer = ideal_match.group(1).strip()

        if not feedback:
            feedback = evaluation[:300]

        combined_feedback = feedback
        if ideal_answer:
            combined_feedback = f"{feedback}\n\nHow to answer: {ideal_answer}"

        return {
            "score": score,
            "feedback": combined_feedback,
            "detailed_analysis": evaluation,
        }

# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_llm_instance = None


def get_llm(
    model_name: str = OLLAMA_MODEL,
    use_lightweight: bool = False,
) -> OllamaLLM:
    global _llm_instance
    if _llm_instance is None or _llm_instance.model_name != model_name:
        _llm_instance = OllamaLLM(model_name=model_name)
    return _llm_instance
