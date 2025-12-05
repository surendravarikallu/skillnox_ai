"""
Local LLM Models for Interview System
Uses lightweight models that can run locally without external APIs
Supports: LLaMA, Mistral, Phi-2, or TinyLlama
"""

import torch
import torch.nn as nn
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM,
    AutoModelForSeq2SeqLM,
    pipeline,
    BitsAndBytesConfig
)
from typing import List, Dict, Optional
from pathlib import Path
import os


class LocalLLM:
    """Wrapper for local LLM models"""
    
    def __init__(self, model_name: str = "Qwen/Qwen2.5-0.5B-Instruct", device: str = "cpu"):
        """
        Initialize local LLM with memory-efficient model
        
        Options for model_name:
        - "Qwen/Qwen2.5-0.5B-Instruct" (0.5B, ~1GB, best memory efficiency, recommended)
        - "Qwen/Qwen2.5-1.5B-Instruct" (1.5B, ~3GB, better quality)
        - "TinyLlama/TinyLlama-1.1B-Chat-v1.0" (1.1B, ~2.3GB, fast)
        - "microsoft/Phi-3-mini-4k-instruct" (3.8B, ~7.5GB, requires more RAM)
        """
        self.device = device
        self.model_name = model_name
        
        print(f"Loading local LLM: {model_name}")
        print("This may take a few minutes on first run...")
        
        try:
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                trust_remote_code=True
            )
            
            # Add padding token if not present
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Load model with memory-efficient settings
            # Qwen2.5 models support efficient quantization
            try:
                if device == "cpu":
                    # For CPU, use float32 with low_cpu_mem_usage for memory efficiency
                    self.model = AutoModelForCausalLM.from_pretrained(
                        model_name,
                        torch_dtype=torch.float32,
                        trust_remote_code=True,
                        low_cpu_mem_usage=True
                    )
                    self.model = self.model.to(device)
                else:
                    # For GPU, use float16 for efficiency
                    self.model = AutoModelForCausalLM.from_pretrained(
                        model_name,
                        torch_dtype=torch.float16,
                        device_map="auto",
                        trust_remote_code=True,
                        low_cpu_mem_usage=True
                    )
            except Exception as e:
                print(f"Warning: Could not load model: {e}")
                # Fallback to standard loading
                self.model = AutoModelForCausalLM.from_pretrained(
                    model_name,
                    torch_dtype=torch.float32,
                    trust_remote_code=True,
                    low_cpu_mem_usage=True
                )
                if device == "cpu":
                    self.model = self.model.to(device)
            
            self.model.eval()
            
            # Create pipeline for easier generation (only if model loaded successfully)
            if self.model is not None:
                try:
                    self.generator = pipeline(
                        "text-generation",
                        model=self.model,
                        tokenizer=self.tokenizer,
                        device=0 if device == "cuda" else -1,
                        do_sample=True,
                        temperature=0.7,
                        top_p=0.9
                    )
                except Exception as e:
                    print(f"Warning: Could not create pipeline: {e}")
                    self.generator = None
            
            print(f"✓ LLM loaded successfully!")
            
        except Exception as e:
            print(f"Warning: Could not load {model_name}: {e}")
            print("Falling back to simple rule-based generation")
            self.model = None
            self.tokenizer = None
            self.generator = None
    
    def generate(self, prompt: str, max_length: int = 200, temperature: float = 0.7) -> str:
        """Generate text from prompt"""
        if not self.generator:
            return self._fallback_generate(prompt)
        
        try:
            # Format prompt for instruction-following models
            if "instruct" in self.model_name.lower() or "chat" in self.model_name.lower():
                formatted_prompt = self._format_instruction_prompt(prompt)
            else:
                formatted_prompt = prompt
            
            # Generate
            outputs = self.generator(
                formatted_prompt,
                max_new_tokens=max_length,
                temperature=temperature,
                top_p=0.9,
                do_sample=True,
                num_return_sequences=1,
                pad_token_id=self.tokenizer.eos_token_id,
                truncation=True,
                return_full_text=False
            )
            
            generated_text = outputs[0]['generated_text']
            
            # Remove prompt from output
            if generated_text.startswith(formatted_prompt):
                generated_text = generated_text[len(formatted_prompt):].strip()
            
            return generated_text
            
        except Exception as e:
            print(f"Error in LLM generation: {e}")
            return self._fallback_generate(prompt)
    
    def _format_instruction_prompt(self, prompt: str) -> str:
        """Format prompt for instruction-following models"""
        if "qwen" in self.model_name.lower():
            # Qwen2.5 uses chat template
            messages = [{"role": "user", "content": prompt}]
            return self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        elif "phi" in self.model_name.lower():
            return f"<|user|>\n{prompt}<|end|>\n<|assistant|>\n"
        elif "mistral" in self.model_name.lower():
            return f"[INST] {prompt} [/INST]"
        elif "tinyllama" in self.model_name.lower():
            return f"<|user|>{prompt}<|assistant|>"
        else:
            return prompt
    
    def _fallback_generate(self, prompt: str) -> str:
        """Fallback to simple rule-based generation"""
        # Simple keyword-based generation
        if "question" in prompt.lower() or "ask" in prompt.lower():
            if "technical" in prompt.lower():
                return "Explain the concept of object-oriented programming and its principles."
            elif "hr" in prompt.lower():
                return "Tell me about yourself and your career goals."
            elif "behavioral" in prompt.lower():
                return "Describe a challenging situation you faced and how you handled it."
            else:
                return "Can you walk me through your most recent project?"
        elif "topic" in prompt.lower() and "group discussion" in prompt.lower():
            topics = [
                "Is artificial intelligence a threat to human jobs?",
                "Should social media be regulated by governments?",
                "Is work from home the future of work?"
            ]
            import random
            return random.choice(topics)
        else:
            return "I understand. Please continue."
    
    def generate_question(self, question_type: str, context: Optional[str] = None, difficulty: str = 'medium') -> str:
        """Generate interview question based on type and difficulty"""
        try:
            difficulty_guidance = {
                "easy": "The question should be suitable for beginners, testing fundamental concepts and basic understanding.",
                "medium": "The question should be of moderate complexity, testing solid understanding and practical application.",
                "hard": "The question should be challenging and advanced, testing deep knowledge, problem-solving skills, and expertise."
            }
            
            # Normalize difficulty
            if difficulty not in difficulty_guidance:
                difficulty = 'medium'
            
            prompts = {
                "technical": f"Generate a {difficulty} technical interview question for a software engineering position. The question should test programming concepts, data structures, or algorithms. {difficulty_guidance.get(difficulty, difficulty_guidance['medium'])}",
                "hr": f"Generate a {difficulty} HR interview question that assesses a candidate's communication skills, motivation, and cultural fit. {difficulty_guidance.get(difficulty, difficulty_guidance['medium'])}",
                "behavioral": f"Generate a {difficulty} behavioral interview question that asks about past experiences and how the candidate handled specific situations. {difficulty_guidance.get(difficulty, difficulty_guidance['medium'])}",
                "project": f"Generate a {difficulty} question about a candidate's project that tests their understanding of architecture, challenges, and technical decisions. {difficulty_guidance.get(difficulty, difficulty_guidance['medium'])}",
                "company": f"Generate a {difficulty} company-specific interview question that tests knowledge about the company and role fit. {difficulty_guidance.get(difficulty, difficulty_guidance['medium'])}"
            }
            
            prompt = prompts.get(question_type, prompts["technical"])
            if context:
                prompt += f"\nContext: {context}"
            
            result = self.generate(prompt, max_length=150)
            
            # Ensure we return a valid question
            if not result or result.strip() == "":
                return self._fallback_generate_question(question_type, difficulty)
            
            return result
        except Exception as e:
            print(f"Error in generate_question: {e}")
            return self._fallback_generate_question(question_type, difficulty)
    
    def _fallback_generate_question(self, question_type: str, difficulty: str = 'medium') -> str:
        """Fallback question generation if LLM fails"""
        fallback_questions = {
            "technical": {
                "easy": "What is the difference between a list and a tuple in Python?",
                "medium": "Explain the concept of time complexity and give an example of O(n log n) algorithm.",
                "hard": "Design a distributed system to handle 1 million requests per second. What are the key components?"
            },
            "hr": {
                "easy": "Tell me about yourself and your career goals.",
                "medium": "Why do you want to work for our company?",
                "hard": "Describe a situation where you had to make a difficult decision under pressure."
            },
            "behavioral": {
                "easy": "Tell me about a time you worked in a team.",
                "medium": "Describe a challenging situation and how you handled it.",
                "hard": "Give an example of when you had to lead a team through a crisis."
            },
            "project": {
                "easy": "Can you describe one of your projects?",
                "medium": "What were the main challenges you faced in your project?",
                "hard": "How would you scale your project to handle 10x the current load?"
            },
            "company": {
                "easy": "What do you know about our company?",
                "medium": "Why do you want to join our company?",
                "hard": "How do you see yourself contributing to our company's mission?"
            }
        }
        
        type_questions = fallback_questions.get(question_type, fallback_questions["technical"])
        return type_questions.get(difficulty, type_questions["medium"])
    
    def evaluate_answer(self, question: str, answer: str) -> Dict:
        """Evaluate answer using LLM"""
        prompt = f"""Evaluate this interview answer and provide:
1. A score from 0-100
2. Brief feedback

Question: {question}
Answer: {answer}

Evaluation:"""
        
        evaluation = self.generate(prompt, max_length=150)
        
        # Extract score and feedback
        score = 70  # Default
        feedback = evaluation
        
        # Try to extract score
        import re
        score_match = re.search(r'\b(\d{1,2}|100)\b', evaluation)
        if score_match:
            try:
                score = int(score_match.group(1))
            except:
                pass
        
        return {
            "score": score,
            "feedback": feedback,
            "detailed_analysis": evaluation
        }
    
    def generate_gd_topic(self) -> str:
        """Generate a group discussion topic"""
        prompt = "Generate an interesting and debatable topic for a group discussion that is relevant for engineering students preparing for placements."
        return self.generate(prompt, max_length=50)
    
    def generate_company_question(self, company: str, difficulty: str = 'medium') -> str:
        """Generate company-specific interview question"""
        difficulty_guidance = {
            "easy": "The question should be suitable for beginners, testing fundamental concepts and basic understanding.",
            "medium": "The question should be of moderate complexity, testing solid understanding and practical application.",
            "hard": "The question should be challenging and advanced, testing deep knowledge, problem-solving skills, and expertise."
        }
        prompt = f"Generate a {difficulty} specific interview question that {company} might ask during their recruitment process. The question should test both technical knowledge and company fit. {difficulty_guidance.get(difficulty, difficulty_guidance['medium'])}"
        return self.generate(prompt, max_length=150)
    
    def analyze_resume(self, resume_text: str, jd_text: Optional[str] = None) -> Dict:
        """Analyze resume using LLM with detailed evaluation and suggestions"""
        if jd_text:
            # JD-based analysis
            prompt = f"""You are an expert resume reviewer. Analyze this resume against the job description and provide constructive, positive feedback.

Job Description:
{jd_text[:2000]}

Resume:
{resume_text[:3000]}

Provide a detailed analysis in the following format:
1. Overall Match Score (0-100): [score]
2. Strengths: [list 3-5 strengths that match the JD]
3. Areas for Improvement: [list 3-5 specific, actionable suggestions to improve match]
4. Missing Skills: [list skills from JD that are missing or weak in resume]
5. Recommendations: [provide 3-5 positive, actionable suggestions like "Add a project demonstrating [skill]" or "Highlight your experience with [technology]"]

Be positive and constructive. Focus on actionable improvements.

Analysis:"""
        else:
            # General resume evaluation
            prompt = f"""You are an expert resume reviewer. Analyze this resume for overall job market readiness and provide constructive, positive feedback.

Resume:
{resume_text[:3000]}

Provide a detailed analysis in the following format:
1. Overall Quality Score (0-100): [score]
2. Strengths: [list 3-5 key strengths]
3. Areas for Improvement: [list 3-5 specific, actionable suggestions]
4. Missing Elements: [list important resume sections or elements that are weak or missing]
5. Recommendations: [provide 3-5 positive, actionable suggestions like "Add a project section showcasing your technical skills" or "Include quantifiable achievements in your experience"]

Be positive and constructive. Focus on actionable improvements that will help the candidate succeed.

Analysis:"""
        
        analysis = self.generate(prompt, max_length=800)
        
        # Extract structured data from analysis
        suggestions = self._extract_suggestions(analysis)
        score = self._extract_score(analysis)
        strengths = self._extract_strengths(analysis)
        improvements = self._extract_improvements(analysis)
        
        return {
            "analysis": analysis,
            "score": score,
            "strengths": strengths,
            "suggestions": suggestions,
            "improvements": improvements,
            "skills": self._extract_skills(analysis)
        }
    
    def _extract_suggestions(self, text: str) -> List[str]:
        """Extract actionable suggestions from analysis"""
        suggestions = []
        lines = text.split('\n')
        in_recommendations = False
        
        for line in lines:
            line_lower = line.lower()
            if 'recommendation' in line_lower or 'suggestion' in line_lower:
                in_recommendations = True
                continue
            if in_recommendations:
                # Extract bullet points or numbered items
                line = line.strip()
                if line and (line.startswith('-') or line.startswith('•') or 
                           line[0].isdigit() or line.startswith('*')):
                    # Clean up the line
                    clean_line = line.lstrip('-•*0123456789. ').strip()
                    if clean_line and len(clean_line) > 10:
                        suggestions.append(clean_line)
                    if len(suggestions) >= 5:
                        break
        
        # Fallback: extract any actionable phrases
        if not suggestions:
            import re
            action_patterns = [
                r'(?:add|include|highlight|showcase|demonstrate|improve|enhance|strengthen)\s+[^.!?]+[.!?]',
                r'(?:you should|consider|try to|make sure to)\s+[^.!?]+[.!?]'
            ]
            for pattern in action_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                suggestions.extend([m.strip() for m in matches[:5]])
        
        return suggestions[:5] if suggestions else [
            "Add quantifiable achievements to your experience section",
            "Include a projects section showcasing your technical skills",
            "Highlight your most relevant skills at the top of your resume"
        ]
    
    def _extract_strengths(self, text: str) -> List[str]:
        """Extract strengths from analysis"""
        strengths = []
        lines = text.split('\n')
        in_strengths = False
        
        for line in lines:
            line_lower = line.lower()
            if 'strength' in line_lower and ':' in line_lower:
                in_strengths = True
                continue
            if in_strengths:
                line = line.strip()
                if line and (line.startswith('-') or line.startswith('•') or 
                           line[0].isdigit() or line.startswith('*')):
                    clean_line = line.lstrip('-•*0123456789. ').strip()
                    if clean_line and len(clean_line) > 5:
                        strengths.append(clean_line)
                    if len(strengths) >= 5:
                        break
        
        return strengths[:5] if strengths else []
    
    def _extract_improvements(self, text: str) -> List[str]:
        """Extract improvement areas from analysis"""
        improvements = []
        lines = text.split('\n')
        in_improvements = False
        
        for line in lines:
            line_lower = line.lower()
            if ('improvement' in line_lower or 'area' in line_lower) and ':' in line_lower:
                in_improvements = True
                continue
            if in_improvements:
                line = line.strip()
                if line and (line.startswith('-') or line.startswith('•') or 
                           line[0].isdigit() or line.startswith('*')):
                    clean_line = line.lstrip('-•*0123456789. ').strip()
                    if clean_line and len(clean_line) > 5:
                        improvements.append(clean_line)
                    if len(improvements) >= 5:
                        break
        
        return improvements[:5] if improvements else []
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from analysis text and resume"""
        # Common technical skills to look for
        common_skills = [
            "Python", "Java", "JavaScript", "TypeScript", "React", "Node.js", "Vue", "Angular",
            "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis",
            "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git", "CI/CD",
            "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
            "HTML", "CSS", "SASS", "Bootstrap", "Tailwind",
            "REST API", "GraphQL", "Microservices", "Spring Boot", "Django", "Flask",
            "Agile", "Scrum", "DevOps", "Linux", "Windows"
        ]
        
        # Find skills mentioned in text
        found_skills = []
        text_lower = text.lower()
        
        for skill in common_skills:
            if skill.lower() in text_lower:
                found_skills.append(skill)
        
        # Also try to extract skills from the original resume text if available
        # Look for skill patterns (capitalized words, technical terms)
        import re
        # Pattern for potential skills (capitalized words, technical terms)
        skill_patterns = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b', text)
        for pattern in skill_patterns:
            if len(pattern) > 2 and pattern not in found_skills:
                # Check if it looks like a skill (not common words)
                common_words = ['the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'been', 'your']
                if pattern.lower() not in common_words and len(pattern.split()) <= 2:
                    found_skills.append(pattern)
        
        # Remove duplicates and limit
        unique_skills = list(dict.fromkeys(found_skills))[:15]  # Keep order, limit to 15
        return unique_skills if unique_skills else []
    
    def _extract_score(self, text: str) -> int:
        """Extract score from analysis text"""
        import re
        score_match = re.search(r'\b(\d{1,2}|100)\b', text)
        if score_match:
            try:
                return int(score_match.group(1))
            except:
                pass
        return 70


class LightweightLLM:
    """Ultra-lightweight alternative using simple transformers"""
    
    def __init__(self):
        """Use a very small model for quick setup"""
        self.model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float32,
                device_map="cpu"
            )
            self.model.eval()
            print("✓ Lightweight LLM loaded")
        except Exception as e:
            print(f"Could not load LLM: {e}")
            self.model = None
    
    def generate_question(self, question_type: str) -> str:
        """Generate question using lightweight model"""
        if not self.model:
            return self._get_default_question(question_type)
        
        prompt = f"Generate a {question_type} interview question:"
        inputs = self.tokenizer(prompt, return_tensors="pt")
        
        with torch.no_grad():
            outputs = self.model.generate(
                inputs.input_ids,
                max_length=50,
                temperature=0.7,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
        
        generated = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return generated.replace(prompt, "").strip()
    
    def _get_default_question(self, question_type: str) -> str:
        """Default questions if model not available"""
        defaults = {
            "technical": "Explain the concept of object-oriented programming.",
            "hr": "Tell me about yourself.",
            "behavioral": "Describe a challenging situation you faced.",
            "project": "Walk me through your most recent project.",
            "company": "Why do you want to work for our company?"
        }
        return defaults.get(question_type, defaults["technical"])


# Global LLM instance
_llm_instance = None

def get_llm(model_name: str = "Qwen/Qwen2.5-0.5B-Instruct", use_lightweight: bool = False) -> LocalLLM:
    """Get or create LLM instance with memory-efficient model
    
    Args:
        model_name: Model name or path. Can be:
            - HuggingFace model ID (e.g., "Qwen/Qwen2.5-0.5B-Instruct")
            - Path to fine-tuned model (e.g., "models/finetuned_llm")
        use_lightweight: Use lightweight model (deprecated, use model_name instead)
    """
    global _llm_instance
    
    # Check if fine-tuned model exists
    if isinstance(model_name, str) and not model_name.startswith(("Qwen/", "microsoft/", "TinyLlama/")):
        # Assume it's a local path
        model_path = Path(__file__).parent.parent / model_name
        if model_path.exists() and (model_path / "adapter_config.json").exists():
            print(f"Loading fine-tuned model from: {model_path}")
            # For fine-tuned models, we need to load base model and adapter
            try:
                from peft import PeftModel
                base_model_name = "Qwen/Qwen2.5-0.5B-Instruct"
                base_model = AutoModelForCausalLM.from_pretrained(
                    base_model_name,
                    torch_dtype=torch.float32,
                    trust_remote_code=True,
                    low_cpu_mem_usage=True,
                )
                model = PeftModel.from_pretrained(base_model, str(model_path))
                tokenizer = AutoTokenizer.from_pretrained(base_model_name, trust_remote_code=True)
                if tokenizer.pad_token is None:
                    tokenizer.pad_token = tokenizer.eos_token
                
                # Create a custom LLM instance with fine-tuned model
                _llm_instance = LocalLLM.__new__(LocalLLM)
                _llm_instance.model = model
                _llm_instance.tokenizer = tokenizer
                _llm_instance.model_name = str(model_path)
                _llm_instance.device = "cpu"
                _llm_instance.model.eval()
                
                # Create pipeline
                _llm_instance.generator = pipeline(
                    "text-generation",
                    model=_llm_instance.model,
                    tokenizer=_llm_instance.tokenizer,
                    device=-1,  # CPU
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.9
                )
                
                print("✓ Fine-tuned model loaded successfully!")
                return _llm_instance
            except ImportError:
                print("Warning: peft not installed. Cannot load fine-tuned model.")
                print("Install with: pip install peft")
                model_name = "Qwen/Qwen2.5-0.5B-Instruct"
            except Exception as e:
                print(f"Warning: Could not load fine-tuned model: {e}")
                print("Falling back to base model...")
                model_name = "Qwen/Qwen2.5-0.5B-Instruct"
    
    if _llm_instance is None:
        if use_lightweight:
            _llm_instance = LightweightLLM()
        else:
            # Use Qwen2.5-0.5B by default for best memory efficiency
            _llm_instance = LocalLLM(model_name=model_name)
    
    return _llm_instance

