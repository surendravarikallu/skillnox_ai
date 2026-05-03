"""
Inference service for all AI models.
Routes NLP tasks through Qwen 3.5 LLM instead of untrained LSTM models.
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

from models.vision_models import EmotionAnalyzer
from models.audio_models import VoiceAnalysisService
from models.ml_models import PlacementPredictor, SkillGapAnalyzer, ResumeScorer
from models.llm_models import get_llm


class InferenceService:
    """Main inference service — uses LLM for NLP tasks, pretrained models for audio/vision"""

    def __init__(self, model_dir='models/saved', device='cpu'):
        self.device = torch.device(device)
        self.model_dir = Path(model_dir)

        # LLM instance (shared singleton via get_llm)
        self._llm = None

        # Lazy-loaded model references
        self._emotion_analyzer = None
        self._voice_analyzer = None
        self._placement_predictor = None

        # Rule-based analyzers (lightweight, always loaded)
        self.skill_gap_analyzer = SkillGapAnalyzer()
        self.resume_scorer = ResumeScorer()

        print("✓ Inference service initialized (models will load on demand)")

    @property
    def llm(self):
        """Lazy-load LLM"""
        if self._llm is None:
            self._llm = get_llm()
        return self._llm

    @property
    def emotion_analyzer(self):
        """Lazy load emotion analyzer (pretrained HSEmotion)"""
        if self._emotion_analyzer is None:
            print("Loading emotion analyzer (HSEmotion)...")
            self._emotion_analyzer = EmotionAnalyzer(device=str(self.device))
        return self._emotion_analyzer

    @property
    def voice_analyzer(self):
        """Lazy load voice analyzer (LLM-powered)"""
        if self._voice_analyzer is None:
            print("Loading voice analyzer...")
            self._voice_analyzer = VoiceAnalysisService(device=str(self.device))
        return self._voice_analyzer

    @property
    def placement_predictor(self):
        """Lazy load placement predictor"""
        if self._placement_predictor is None:
            print("Loading placement predictor...")
            self._placement_predictor = PlacementPredictor(input_features=10).to(self.device)
            placement_path = self.model_dir / 'placement_predictor.pth'
            if placement_path.exists():
                self._placement_predictor.load_state_dict(
                    torch.load(placement_path, map_location=self.device)
                )
            self._placement_predictor.eval()
        return self._placement_predictor

    def cleanup(self):
        """Explicitly unload models and free memory"""
        import gc
        self._llm = None
        self._emotion_analyzer = None
        self._voice_analyzer = None
        self._placement_predictor = None
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        print("✓ Models unloaded, memory freed")

    # ------------------------------------------------------------------
    # Resume parsing — now powered by LLM
    # ------------------------------------------------------------------

    def parse_resume(self, resume_text: str) -> Dict:
        """Parse resume and extract information using LLM"""
        try:
            return self.llm.parse_resume_structured(resume_text)
        except Exception as e:
            print(f"LLM resume parse failed: {e}")
            return {'skills': [], 'has_experience': False, 'has_education': False}

    # ------------------------------------------------------------------
    # JD skill extraction — LLM-enhanced
    # ------------------------------------------------------------------

    def extract_jd_skills(self, jd_text: str) -> Dict:
        """Extract required skills from job description"""
        try:
            # Try LLM-powered extraction first
            skills = self.llm.extract_skills_from_text(jd_text)
            if skills:
                return {'required_skills': skills, 'skill_count': len(skills)}
        except Exception:
            pass

        # Fallback to rule-based
        analysis = self.skill_gap_analyzer.extract_skills_from_text(jd_text)
        return {'required_skills': analysis, 'skill_count': len(analysis)}

    # ------------------------------------------------------------------
    # Answer evaluation — now powered by LLM
    # ------------------------------------------------------------------

    def evaluate_answer(self, answer: str, question: Optional[str] = None) -> Dict:
        """Evaluate interview answer using LLM"""
        try:
            if question:
                return self.llm.evaluate_answer(question, answer)
            else:
                result = self.llm.evaluate_answer("General interview question", answer)
                return result
        except Exception as e:
            print(f"LLM answer eval failed: {e}")
            return {
                'score': 50,
                'feedback': 'Unable to evaluate at this time.',
                'word_count': len(answer.split()),
            }

    # ------------------------------------------------------------------
    # Personality analysis — now powered by LLM
    # ------------------------------------------------------------------

    def analyze_personality(self, responses: List[str]) -> Dict:
        """Analyze personality from interview responses using LLM"""
        try:
            return self.llm.analyze_personality(responses)
        except Exception as e:
            print(f"LLM personality analysis failed: {e}")
            return {
                'introvert_extrovert': 0.0,
                'thinker_feeler': 0.0,
                'logical_creative': 0.0,
                'planner_spontaneous': 0.0,
                'dominant_traits': ['Balanced'],
            }

    # ------------------------------------------------------------------
    # Emotion analysis — pretrained HSEmotion
    # ------------------------------------------------------------------

    def analyze_emotion(self, image_data: bytes) -> Dict:
        """Analyze emotion from image using pretrained HSEmotion"""
        try:
            image = Image.open(io.BytesIO(image_data))
            raw_result = self.emotion_analyzer.analyze(image)

            # Ensure all values are plain Python types
            emotion = str(raw_result.get('emotion', 'Neutral'))
            raw_probs = raw_result.get('emotion_probabilities', {}) or {}
            emotion_probabilities = {str(k): float(v) for k, v in raw_probs.items()}

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
                'emotion_score': 50.0,
            }

    # ------------------------------------------------------------------
    # Voice analysis — LLM-powered with real acoustic features
    # ------------------------------------------------------------------

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
                'overall_voice_score': 50.0,
            }

    # ------------------------------------------------------------------
    # Placement prediction
    # ------------------------------------------------------------------

    def predict_placement(self, features: Dict) -> Dict:
        """Predict placement probability"""
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
            features.get('personality_logical_creative', 0),
        ], dtype=np.float32)

        feature_tensor = torch.FloatTensor(feature_vector).unsqueeze(0).to(self.device)

        with torch.no_grad():
            predictions = self.placement_predictor(feature_tensor)

        return {
            'probability_30_days': float(predictions['probability_30_days'].cpu().numpy()[0]),
            'probability_60_days': float(predictions['probability_60_days'].cpu().numpy()[0]),
            'probability_90_days': float(predictions['probability_90_days'].cpu().numpy()[0]),
        }

    # ------------------------------------------------------------------
    # Skill gap analysis — LLM-enhanced
    # ------------------------------------------------------------------

    def analyze_skill_gap(self, resume_text: str, jd_text: str) -> Dict:
        """Analyze skill gap between resume and JD"""
        # Try LLM-enhanced extraction
        try:
            resume_skills = self.llm.extract_skills_from_text(resume_text)
            jd_skills = self.llm.extract_skills_from_text(jd_text)

            if resume_skills and jd_skills:
                matched = list(set(s.lower() for s in resume_skills) & set(s.lower() for s in jd_skills))
                gaps = list(set(s.lower() for s in jd_skills) - set(s.lower() for s in resume_skills))
                match_score = (len(matched) / len(jd_skills) * 100) if jd_skills else 0

                return {
                    'resume_skills': resume_skills,
                    'required_skills': jd_skills,
                    'matched_skills': matched,
                    'match_score': min(100.0, match_score),
                    'skill_gaps': gaps,
                    'coverage_percentage': min(100.0, match_score),
                }
        except Exception:
            pass

        # Fallback to rule-based
        return self.skill_gap_analyzer.analyze(resume_text, jd_text)

    def score_resume(self, resume_text: str) -> Dict:
        """Score resume quality"""
        return self.resume_scorer.score_resume(resume_text)
