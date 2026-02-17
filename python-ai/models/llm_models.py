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
    
    def __init__(self, model_name: str = "Qwen/Qwen2.5-1.5B-Instruct", device: str = "cpu"):
        """
        Initialize local LLM with performance-optimized model
        
        Options:
        - "Qwen/Qwen2.5-1.5B-Instruct" (1.5B, ~1.5GB VRAM with 4-bit, Best local balance)
        - "Qwen/Qwen2.5-3B-Instruct" (3B, ~2.5GB VRAM with 4-bit, Smarter but slower)
        - "Qwen/Qwen2.5-0.5B-Instruct" (0.5B, Very fast but less smart)
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
            
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Load model with smart quantization logic
            try:
                if device == "cuda":
                    print("Loading with 4-bit quantization for GPU...")
                    bnb_config = BitsAndBytesConfig(
                        load_in_4bit=True,
                        bnb_4bit_quant_type="nf4",
                        bnb_4bit_compute_dtype=torch.float16,
                        bnb_4bit_use_double_quant=True,
                    )
                    self.model = AutoModelForCausalLM.from_pretrained(
                        model_name,
                        quantization_config=bnb_config,
                        device_map="auto",
                        trust_remote_code=True
                    )
                else:
                    # CPU optimization
                    print("Loading for CPU execution...")
                    self.model = AutoModelForCausalLM.from_pretrained(
                        model_name,
                        torch_dtype=torch.float32,
                        trust_remote_code=True,
                        low_cpu_mem_usage=True
                    ).to(device)
            except Exception as e:
                print(f"Quantization/Loading failed ({e}), falling back to standard loading...")
                self.model = AutoModelForCausalLM.from_pretrained(
                    model_name,
                    torch_dtype=torch.float32,
                    trust_remote_code=True,
                    low_cpu_mem_usage=True,
                    device_map="auto" if device == "cuda" else None
                )
                if device == "cpu":
                    self.model = self.model.to(device)
            
            # Apply dynamic quantization for CPU to save memory
            if device == "cpu":
                print("Applying dynamic quantization (int8) to reduce memory usage...")
                self.model = torch.quantization.quantize_dynamic(
                    self.model,
                    {torch.nn.Linear},
                    dtype=torch.qint8
                )
                print("✓ Model quantized successfully! Memory usage reduced by ~75%")
            
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
            
            # Chain of Thought Prompt Templates
            prompts = {
                "technical": f"""
You are an expert technical interviewer.
Context: {context or "General Software Engineering"}
Difficulty: {difficulty}

Task: Generate a technical interview question.
Step 1: Identify a core concept relevant to the context and difficulty.
Step 2: Formulate a question that tests deep understanding, not just memorization.
Step 3: Output ONLY the question.

Question:""",
                "hr": f"""
You are an expert HR manager.
Context: {context or "General Interaction"}
Difficulty: {difficulty}

Task: Generate an HR interview question.
Step 1: Consider the candidate's potential fit and motivation.
Step 2: Formulate a question about their soft skills or career goals.
Step 3: Output ONLY the question.

Question:""",
                "behavioral": f"""
You are an expert behavioral interviewer.
Context: {context or "Professional Experience"}
Difficulty: {difficulty}

Task: Generate a behavioral question using the STAR method context.
Step 1: Think of a challenging professional situation.
Step 2: Formulate a "Tell me about a time..." question.
Step 3: Output ONLY the question.

Question:""",
                "project": f"""
You are a Senior Architect reviewing a candidate's project.
Context: {context or "Project Review"}
Difficulty: {difficulty}

Task: Generate a project-specific question.
Step 1: Focus on architectural decisions or challenges.
Step 2: Formulate a question that probes *why* certain choices were made.
Step 3: Output ONLY the question.

Question:""",
                "company": f"""
You are a Hiring Manager at {company if 'company' in locals() else 'the company'}.
Difficulty: {difficulty}

Task: Generate a company-culture fit question.
Step 1: Consider the company's values and mission.
Step 2: Formulate a question about how the candidate aligns with these.
Step 3: Output ONLY the question.

Question:""",
                "communication": f"""
You are a Communication Coach.
Difficulty: {difficulty}

Task: Generate a question to test communication skills.
Step 1: Think of a complex topic that needs simple explanation.
Step 2: Formulate a question asking the candidate to explain it to a non-technical audience.
Step 3: Output ONLY the question.

Question:"""
            }
            
            prompt = prompts.get(question_type, prompts["technical"])
            
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
            },
            "communication": {
                "easy": "Describe your daily routine from morning to evening.",
                "medium": "Explain how you would teach someone a skill you're good at.",
                "hard": "Describe a complex problem you solved and explain it in simple terms."
            }
        }
        
        type_questions = fallback_questions.get(question_type, fallback_questions["technical"])
        return type_questions.get(difficulty, type_questions["medium"])
    
    def evaluate_answer(self, question: str, answer: str) -> Dict:
        """Evaluate answer using LLM with strict, detailed criteria"""
        prompt = f"""You are an expert technical interviewer conducting a rigorous evaluation. Analyze the candidate's answer critically and provide strict, honest feedback.

Question: {question}
Candidate Answer: {answer}

Evaluation Criteria:
1. **Relevance (0-25)**: Does the answer directly address the question asked?
2. **Technical Accuracy (0-25)**: Are technical concepts explained correctly?
3. **Depth & Detail (0-25)**: Does the answer show deep understanding with examples?
4. **Communication (0-25)**: Is the answer well-structured and clearly articulated?

Scoring Guidelines:
- 0-40: Poor/Irrelevant - Answer misses the point, has major errors, or is too brief
- 41-60: Below Average - Answer is generic, lacks depth, or has some inaccuracies
- 61-75: Average - Answer is correct but could be more detailed or specific
- 76-85: Good - Answer is solid with good examples and clear explanation
- 86-100: Excellent - Answer is comprehensive, insightful, with real-world examples

Provide evaluation in this format:
Score: [number 0-100]
Feedback: [2-3 specific sentences highlighting strengths AND weaknesses]

Be strict but constructive. Focus on what's missing or could be improved.

Evaluation:"""
        
        evaluation = self.generate(prompt, max_length=200)
        
        # Extract score and feedback
        score = 60  # Default to lower score
        feedback = evaluation
        
        # Try to extract score
        import re
        score_match = re.search(r'Score:\s*(\d{1,3})', evaluation, re.IGNORECASE)
        if score_match:
            try:
                extracted_score = int(score_match.group(1))
                # Ensure score is in valid range
                score = max(0, min(100, extracted_score))
            except:
                pass
        
        # Extract feedback portion
        feedback_match = re.search(r'Feedback:\s*(.+?)(?:\n\n|$)', evaluation, re.IGNORECASE | re.DOTALL)
        if feedback_match:
            feedback = feedback_match.group(1).strip()
        
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
    
    def evaluate_communication(self, answer: str, question: str = None) -> Dict:
        """Evaluate communication-specific aspects using LLM"""
        prompt = f"""You are an expert communication evaluator. Analyze this candidate's verbal communication skills critically.

Question: {question or "General communication assessment"}
Candidate Answer: {answer}

Evaluate the following aspects (0-100 each):
1. **Clarity (0-100)**: How clear and understandable is the response? Are ideas expressed simply?
2. **Fluency (0-100)**: How smooth and natural is the speech flow? Any awkward phrasing?
3. **Tone (0-100)**: Is the tone professional, confident, and appropriate?
4. **Structure (0-100)**: Is the answer well-organized with logical flow?
5. **Confidence (0-100)**: Does the candidate sound confident and assured?

Scoring Guidelines:
- 0-40: Poor - Major issues in this area
- 41-60: Below Average - Needs significant improvement
- 61-75: Average - Acceptable but could be better
- 76-85: Good - Strong performance
- 86-100: Excellent - Outstanding communication

Provide evaluation in this exact format:
Clarity: [score 0-100]
Fluency: [score 0-100]
Tone: [score 0-100]
Structure: [score 0-100]
Confidence: [score 0-100]
Overall: [average of above scores]
Feedback: [2-3 specific sentences on communication strengths and areas to improve]

Be strict but constructive. Focus on what could make communication more effective.

Evaluation:"""
        
        evaluation = self.generate(prompt, max_length=300)
        
        # Extract scores and feedback
        import re
        
        clarity = 60
        fluency = 60
        tone = 60
        structure = 60
        confidence = 60
        feedback = evaluation
        
        # Try to extract scores
        clarity_match = re.search(r'Clarity:\s*(\d{1,3})', evaluation, re.IGNORECASE)
        if clarity_match:
            clarity = max(0, min(100, int(clarity_match.group(1))))
        
        fluency_match = re.search(r'Fluency:\s*(\d{1,3})', evaluation, re.IGNORECASE)
        if fluency_match:
            fluency = max(0, min(100, int(fluency_match.group(1))))
        
        tone_match = re.search(r'Tone:\s*(\d{1,3})', evaluation, re.IGNORECASE)
        if tone_match:
            tone = max(0, min(100, int(tone_match.group(1))))
        
        structure_match = re.search(r'Structure:\s*(\d{1,3})', evaluation, re.IGNORECASE)
        if structure_match:
            structure = max(0, min(100, int(structure_match.group(1))))
        
        confidence_match = re.search(r'Confidence:\s*(\d{1,3})', evaluation, re.IGNORECASE)
        if confidence_match:
            confidence = max(0, min(100, int(confidence_match.group(1))))
        
        overall = round((clarity + fluency + tone + structure + confidence) / 5)
        
        # Extract feedback portion
        feedback_match = re.search(r'Feedback:\s*(.+?)(?:\n\n|$)', evaluation, re.IGNORECASE | re.DOTALL)
        if feedback_match:
            feedback = feedback_match.group(1).strip()
        
        return {
            "clarity": clarity,
            "fluency": fluency,
            "tone": tone,
            "structure": structure,
            "confidence": confidence,
            "overall": overall,
            "score": overall,  # For compatibility
            "feedback": feedback,
            "detailed_analysis": evaluation
        }

    
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
        # Pattern for potential skills (capitalized words, technical terms)
        # Improved: Catches "C++", "C#", "Node.js", "React.js" and standard capitalized words
        skill_patterns = re.findall(r'\b([A-Z][a-zA-Z0-9.+]+(?:[.][a-zA-Z0-9]+)?(?:\s+[A-Z][a-zA-Z0-9.+]+)?)\b', text)
        for pattern in skill_patterns:
            if len(pattern) > 1 and pattern not in found_skills:
                # Check if it looks like a skill (not common words)
                common_words = ['The', 'And', 'For', 'With', 'From', 'This', 'That', 'Have', 'Been', 'Your', 'Work', 'Year', 'Time', 'Team', 'Data', 'User', 'Code']
                if pattern not in common_words and len(pattern.split()) <= 3:
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

def get_llm(model_name: str = "Qwen/Qwen2.5-1.5B-Instruct", use_lightweight: bool = False) -> LocalLLM:
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
                base_model_name = "Qwen/Qwen2.5-1.5B-Instruct"
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
                model_name = "Qwen/Qwen2.5-1.5B-Instruct"
            except Exception as e:
                print(f"Warning: Could not load fine-tuned model: {e}")
                print("Falling back to base model...")
                model_name = "Qwen/Qwen2.5-1.5B-Instruct"
    
    if _llm_instance is None:
        if use_lightweight:
            _llm_instance = LightweightLLM()
        else:
            # Use Qwen2.5-0.5B by default for best memory efficiency
            _llm_instance = LocalLLM(model_name=model_name)
    
    return _llm_instance

