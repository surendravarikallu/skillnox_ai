"""
Inference service for all AI models
"""

import torch
import numpy as np
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
import base64
import io
from PIL import Image

sys.path.append(str(Path(__file__).parent.parent))

from models.nlp_models import (
    ResumeParser, JDExtractor, AnswerEvaluator, PersonalityModel,
    ProjectEvaluator, GD_Analyzer, create_vocab, text_to_sequence
)
from models.vision_models import EmotionAnalyzer
from models.audio_models import VoiceAnalysisService, AudioFeatureExtractor
from models.ml_models import PlacementPredictor, SkillGapAnalyzer, ResumeScorer


class InferenceService:
    """Main inference service for all AI models"""
    
    def __init__(self, model_dir='models/saved', device='cpu'):
        self.device = torch.device(device)
        self.model_dir = Path(model_dir)
        
        # Initialize models
        self._load_models()
        
        # Initialize analyzers
        self.skill_gap_analyzer = SkillGapAnalyzer()
        self.resume_scorer = ResumeScorer()
        self.audio_feature_extractor = AudioFeatureExtractor()
        
        # Create vocabulary (in production, would load from saved vocab)
        self.vocab = self._create_default_vocab()
    
    def _create_default_vocab(self):
        """Create default vocabulary"""
        common_words = [
            'python', 'java', 'javascript', 'react', 'node', 'sql', 'database',
            'project', 'experience', 'developed', 'implemented', 'designed',
            'system', 'application', 'software', 'engineer', 'developer',
            'technology', 'framework', 'api', 'service', 'architecture'
        ]
        vocab = {word: idx + 1 for idx, word in enumerate(common_words)}
        vocab['<PAD>'] = 0
        vocab['<UNK>'] = len(vocab)
        return vocab
    
    def _load_models(self):
        """Initialize model references (lazy load on first access)"""
        # Models will be loaded on first access via properties
        self._resume_parser = None
        self._answer_evaluator = None
        self._personality_model = None
        self._emotion_analyzer = None
        self._voice_analyzer = None
        self._placement_predictor = None
        
        print("✓ Inference service initialized (models will load on demand)")
    
    @property
    def resume_parser(self):
        """Lazy load resume parser"""
        if self._resume_parser is None:
            print("Loading resume parser...")
            self._resume_parser = ResumeParser().to(self.device)
            resume_parser_path = self.model_dir / 'resume_parser.pth'
            if resume_parser_path.exists():
                self._resume_parser.load_state_dict(torch.load(resume_parser_path, map_location=self.device))
            self._resume_parser.eval()
        return self._resume_parser
    
    @property
    def answer_evaluator(self):
        """Lazy load answer evaluator"""
        if self._answer_evaluator is None:
            print("Loading answer evaluator...")
            self._answer_evaluator = AnswerEvaluator().to(self.device)
            answer_eval_path = self.model_dir / 'answer_evaluator.pth'
            if answer_eval_path.exists():
                self._answer_evaluator.load_state_dict(torch.load(answer_eval_path, map_location=self.device))
            self._answer_evaluator.eval()
        return self._answer_evaluator
    
    @property
    def personality_model(self):
        """Lazy load personality model"""
        if self._personality_model is None:
            print("Loading personality model...")
            self._personality_model = PersonalityModel().to(self.device)
            personality_path = self.model_dir / 'personality_model.pth'
            if personality_path.exists():
                self._personality_model.load_state_dict(torch.load(personality_path, map_location=self.device))
            self._personality_model.eval()
        return self._personality_model
    
    @property
    def emotion_analyzer(self):
        """Lazy load emotion analyzer"""
        if self._emotion_analyzer is None:
            print("Loading emotion analyzer...")
            emotion_model_path = self.model_dir / 'emotion_cnn.pth'
            self._emotion_analyzer = EmotionAnalyzer(
                model_path=str(emotion_model_path) if emotion_model_path.exists() else None,
                device=str(self.device)
            )
        return self._emotion_analyzer
    
    @property
    def voice_analyzer(self):
        """Lazy load voice analyzer"""
        if self._voice_analyzer is None:
            print("Loading voice analyzer...")
            voice_model_path = self.model_dir / 'voice_analyzer.pth'
            self._voice_analyzer = VoiceAnalysisService(
                model_path=str(voice_model_path) if voice_model_path.exists() else None,
                device=str(self.device)
            )
        return self._voice_analyzer
    
    @property
    def placement_predictor(self):
        """Lazy load placement predictor"""
        if self._placement_predictor is None:
            print("Loading placement predictor...")
            self._placement_predictor = PlacementPredictor(input_features=10).to(self.device)
            placement_path = self.model_dir / 'placement_predictor.pth'
            if placement_path.exists():
                self._placement_predictor.load_state_dict(torch.load(placement_path, map_location=self.device))
            self._placement_predictor.eval()
        return self._placement_predictor
    
    def cleanup(self):
        """Explicitly unload models and free memory"""
        import gc
        
        self._resume_parser = None
        self._answer_evaluator = None
        self._personality_model = None
        self._emotion_analyzer = None
        self._voice_analyzer = None
        self._placement_predictor = None
        
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        print("✓ Models unloaded, memory freed")
    
    def parse_resume(self, resume_text: str) -> Dict:
        """Parse resume and extract information"""
        sequence = text_to_sequence(resume_text, self.vocab, max_length=200)
        sequence_tensor = torch.LongTensor(sequence).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            skills, experience, education = self.resume_parser(sequence_tensor)
        
        # Extract skills (simplified - in production would use actual skill vocabulary)
        skills_probs = skills.cpu().numpy()[0]
        top_skills_indices = np.argsort(skills_probs)[-10:][::-1]
        
        # Map to actual skill names (simplified)
        skill_names = ['Python', 'Java', 'JavaScript', 'React', 'Node.js', 'SQL', 
                      'MongoDB', 'AWS', 'Docker', 'Git']
        extracted_skills = [skill_names[i] if i < len(skill_names) else f'Skill_{i}' 
                           for i in top_skills_indices[:5]]
        
        return {
            'skills': extracted_skills,
            'has_experience': float(experience.cpu().numpy()[0]) > 0.5,
            'has_education': float(education.cpu().numpy()[0]) > 0.5
        }
    
    def extract_jd_skills(self, jd_text: str) -> Dict:
        """Extract required skills from job description"""
        analysis = self.skill_gap_analyzer.extract_skills_from_text(jd_text)
        return {
            'required_skills': analysis,
            'skill_count': len(analysis)
        }
    
    def evaluate_answer(self, answer: str, question: Optional[str] = None) -> Dict:
        """Evaluate interview answer"""
        sequence = text_to_sequence(answer, self.vocab, max_length=200)
        sequence_tensor = torch.LongTensor(sequence).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            score, feedback_logits = self.answer_evaluator(sequence_tensor)
        
        score_value = float(score.cpu().numpy()[0])
        
        # Generate feedback
        feedback = self._generate_feedback(score_value, answer)
        
        return {
            'score': score_value,
            'feedback': feedback,
            'word_count': len(answer.split())
        }
    
    def _generate_feedback(self, score: float, answer: str) -> str:
        """Generate feedback based on score"""
        feedback_parts = []
        
        if score >= 80:
            feedback_parts.append("Excellent answer with good detail.")
        elif score >= 60:
            feedback_parts.append("Good answer, but could be more comprehensive.")
        else:
            feedback_parts.append("Answer needs more depth and examples.")
        
        if len(answer.split()) < 20:
            feedback_parts.append("Try to elaborate more with examples.")
        
        if 'example' in answer.lower() or 'instance' in answer.lower():
            feedback_parts.append("Good use of examples.")
        
        return " ".join(feedback_parts)
    
    def analyze_personality(self, responses: List[str]) -> Dict:
        """Analyze personality from interview responses"""
        # Convert responses to sequences
        sequences = []
        for response in responses:
            seq = text_to_sequence(response, self.vocab, max_length=200)
            sequences.append(seq)
        
        # Pad to 5 responses
        while len(sequences) < 5:
            sequences.append([0] * 200)
        sequences = sequences[:5]
        
        sequences_tensor = torch.LongTensor([sequences]).to(self.device)
        
        with torch.no_grad():
            traits = self.personality_model(sequences_tensor)
        
        traits_np = traits.cpu().numpy()[0]
        
        return {
            'introvert_extrovert': float(traits_np[0]),
            'thinker_feeler': float(traits_np[1]),
            'logical_creative': float(traits_np[2]),
            'planner_spontaneous': float(traits_np[3]),
            'dominant_traits': self._get_dominant_traits(traits_np)
        }
    
    def _get_dominant_traits(self, traits: np.ndarray) -> List[str]:
        """Get dominant personality traits"""
        traits_list = []
        if traits[0] > 0.3:
            traits_list.append("Extroverted")
        elif traits[0] < -0.3:
            traits_list.append("Introverted")
        
        if traits[1] < -0.3:
            traits_list.append("Analytical")
        elif traits[1] > 0.3:
            traits_list.append("Empathetic")
        
        if traits[2] > 0.3:
            traits_list.append("Creative")
        elif traits[2] < -0.3:
            traits_list.append("Logical")
        
        if traits[3] < -0.3:
            traits_list.append("Organized")
        elif traits[3] > 0.3:
            traits_list.append("Adaptable")
        
        return traits_list if traits_list else ["Balanced"]
    
    def analyze_emotion(self, image_data: bytes) -> Dict:
        """Analyze emotion from image"""
        try:
            image = Image.open(io.BytesIO(image_data))
            raw_result = self.emotion_analyzer.analyze(image)

            # Ensure all values are plain Python types (no numpy / tensors)
            emotion = str(raw_result.get('emotion', 'Neutral'))

            # Probabilities dict may contain numpy types – cast to float
            raw_probs = raw_result.get('emotion_probabilities', {}) or {}
            emotion_probabilities = {
                str(k): float(v) for k, v in raw_probs.items()
            }

            return {
                'emotion': emotion,
                'emotion_probabilities': emotion_probabilities,
                'confidence': float(raw_result.get('confidence', 50.0)),
                'eye_contact': float(raw_result.get('eye_contact', 50.0)),
                'nervousness': float(raw_result.get('nervousness', 50.0)),
                'emotion_score': float(raw_result.get('emotion_score', 50.0)),
            }
        except Exception as e:
            return {
                'error': str(e),
                'emotion': 'Neutral',
                'confidence': 50.0,
                'eye_contact': 50.0,
                'nervousness': 50.0,
                'emotion_score': 50.0
            }
    
    def analyze_voice(self, audio_data: np.ndarray, transcript: Optional[str] = None) -> Dict:
        """Analyze voice from audio data"""
        try:
            result = self.voice_analyzer.analyze_audio_array(audio_data, transcript=transcript)
            return result
        except Exception as e:
            return {
                'error': str(e),
                'fluency': 50.0,
                'grammar': 50.0,
                'tone': 50.0,
                'pace': 50.0,
                'filler_words': 50.0,
                'clarity': 50.0,
                'overall_voice_score': 50.0
            }
    
    def predict_placement(self, features: Dict) -> Dict:
        """Predict placement probability"""
        # Extract features
        feature_vector = np.array([
            features.get('resume_score', 50),
            features.get('jd_score', 50),
            features.get('technical_score', 50),
            features.get('hr_score', 50),
            features.get('gd_score', 50),
            features.get('emotion_score', 50),
            features.get('voice_score', 50),
            features.get('personality_introvert_extrovert', 0),
            features.get('personality_thinker_feeler', 0),
            features.get('personality_logical_creative', 0)
        ], dtype=np.float32)
        
        feature_tensor = torch.FloatTensor(feature_vector).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            predictions = self.placement_predictor(feature_tensor)
        
        return {
            'probability_30_days': float(predictions['probability_30_days'].cpu().numpy()[0]),
            'probability_60_days': float(predictions['probability_60_days'].cpu().numpy()[0]),
            'probability_90_days': float(predictions['probability_90_days'].cpu().numpy()[0])
        }
    
    def analyze_skill_gap(self, resume_text: str, jd_text: str) -> Dict:
        """Analyze skill gap between resume and JD"""
        return self.skill_gap_analyzer.analyze(resume_text, jd_text)
    
    def score_resume(self, resume_text: str) -> Dict:
        """Score resume quality"""
        return self.resume_scorer.score_resume(resume_text)

