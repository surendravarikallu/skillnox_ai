"""
Audio Models for Voice Analysis
Uses librosa for feature extraction, Faster-Whisper for STT,
and LLM-powered analysis for intelligent voice scoring.
"""

import torch
import numpy as np
import librosa
import re
import os
import requests
from typing import Dict, List, Optional

__all__ = ['AudioFeatureExtractor', 'AudioTranscriber', 'LLMVoiceAnalyzer', 'VoiceAnalysisService', 'DEFAULT_WHISPER_MODEL']

DEFAULT_WHISPER_MODEL = "large-v3-turbo"


# ---------------------------------------------------------------------------
# Audio Feature Extractor (Real acoustic analysis via librosa)
# ---------------------------------------------------------------------------

class AudioFeatureExtractor:
    """Extract real audio features using librosa for voice quality analysis"""

    def __init__(self, sr=22050):
        self.sr = sr

    def extract_features(self, audio_path: str) -> Dict:
        """Extract comprehensive, interpretable audio features"""
        try:
            y, sr = librosa.load(audio_path, sr=self.sr)
        except Exception:
            return self._default_features()

        return self._extract_from_array(y, sr)

    def extract_from_array(self, audio_array: np.ndarray, sr: int = None) -> Dict:
        """Extract features from audio array"""
        if sr is None:
            sr = self.sr
        if sr != self.sr:
            audio_array = librosa.resample(audio_array, orig_sr=sr, target_sr=self.sr)
        return self._extract_from_array(audio_array, self.sr)

    def _extract_from_array(self, y: np.ndarray, sr: int) -> Dict:
        """Core feature extraction — returns human-readable metrics"""
        duration = len(y) / sr

        # --- Pitch analysis (nervousness / monotone detection) ---
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        voiced_pitches = pitches[pitches > 0]
        pitch_mean = float(np.mean(voiced_pitches)) if len(voiced_pitches) > 0 else 0
        pitch_std = float(np.std(voiced_pitches)) if len(voiced_pitches) > 0 else 0

        # --- Silence / pause analysis (fluency) ---
        frame_length = 2048
        hop_length = 512
        rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
        silence_threshold = np.percentile(rms, 20) if len(rms) > 0 else 0
        silence_ratio = float(np.sum(rms < silence_threshold) / len(rms)) if len(rms) > 0 else 0

        # Count distinct pauses (consecutive silent frames)
        is_silent = rms < silence_threshold
        pause_count = 0
        in_pause = False
        for s in is_silent:
            if s and not in_pause:
                pause_count += 1
                in_pause = True
            elif not s:
                in_pause = False

        # --- Speaking rate ---
        # Approximate words per minute using onset detection
        onsets = librosa.onset.onset_detect(y=y, sr=sr, units='time')
        estimated_syllables = len(onsets)
        speaking_rate_spm = (estimated_syllables / duration * 60) if duration > 0 else 0

        # --- Energy / volume consistency ---
        energy_mean = float(np.mean(rms))
        energy_std = float(np.std(rms))
        energy_consistency = 1.0 - min(1.0, energy_std / (energy_mean + 1e-6))

        # --- Spectral features (voice quality / clarity) ---
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_mean = float(np.mean(spectral_centroids))

        zcr = librosa.feature.zero_crossing_rate(y)[0]
        zcr_mean = float(np.mean(zcr))

        # --- Tempo ---
        try:
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            tempo = float(tempo) if np.isscalar(tempo) else float(tempo[0])
        except Exception:
            tempo = 0.0

        return {
            'duration_seconds': round(duration, 2),
            'pitch_mean_hz': round(pitch_mean, 1),
            'pitch_std_hz': round(pitch_std, 1),
            'silence_ratio': round(silence_ratio, 3),
            'pause_count': pause_count,
            'speaking_rate_spm': round(speaking_rate_spm, 1),
            'energy_mean': round(energy_mean, 5),
            'energy_consistency': round(energy_consistency, 3),
            'spectral_centroid_mean': round(spectral_mean, 1),
            'zero_crossing_rate': round(zcr_mean, 5),
            'tempo_bpm': round(tempo, 1),
        }

    def _default_features(self) -> Dict:
        return {
            'duration_seconds': 0,
            'pitch_mean_hz': 0,
            'pitch_std_hz': 0,
            'silence_ratio': 0,
            'pause_count': 0,
            'speaking_rate_spm': 0,
            'energy_mean': 0,
            'energy_consistency': 0,
            'spectral_centroid_mean': 0,
            'zero_crossing_rate': 0,
            'tempo_bpm': 0,
        }


# ---------------------------------------------------------------------------
# Audio Transcriber — Faster-Whisper (large-v3-turbo)
# ---------------------------------------------------------------------------

class AudioTranscriber:
    """Audio transcription using Faster Whisper large-v3-turbo"""

    def __init__(self, model_size=DEFAULT_WHISPER_MODEL, device="cpu"):
        """
        Initialize audio transcriber with Whisper.

        Model sizes and accuracy:
        - tiny.en (39M): ~70% accuracy, very fast
        - base.en (74M): ~85% accuracy, fast
        - small.en (244M): ~90% accuracy, moderate speed
        - medium.en (769M): ~95% accuracy, slow
        - large-v3-turbo (1.5G): ~96% accuracy, optimized speed (RECOMMENDED)
        """
        self.device = device
        self.model_size = model_size
        self.model = None

    def _load_model(self):
        if self.model is None:
            try:
                from faster_whisper import WhisperModel
                # Use int8 quantization for CPU to save memory
                compute_type = "float16" if self.device == "cuda" else "int8"
                print(f"Loading Whisper model: {self.model_size} with compute_type={compute_type}")
                self.model = WhisperModel(self.model_size, device=self.device, compute_type=compute_type)
                print("✓ Whisper model loaded successfully")
            except Exception as e:
                print(f"Error loading Whisper model: {e}")
                # Fallback to smaller model if large-v3-turbo fails
                if self.model_size == "large-v3-turbo":
                    print("Falling back to small.en...")
                    try:
                        from faster_whisper import WhisperModel
                        self.model_size = "small.en"
                        self.model = WhisperModel("small.en", device=self.device, compute_type="int8")
                        print("✓ Fallback Whisper model loaded")
                    except Exception as e2:
                        print(f"Fallback also failed: {e2}")

    def transcribe(self, audio_array: np.ndarray) -> str:
        """Transcribe audio array to text with optimized settings"""
        self._load_model()
        if self.model is None:
            return ""

        try:
            # Faster Whisper expects float32 array
            if audio_array.dtype != np.float32:
                audio_array = audio_array.astype(np.float32)

            # Use beam_size=10 for better accuracy (moderate latency trade-off)
            # vad_filter helps remove silence for cleaner transcription
            segments, info = self.model.transcribe(
                audio_array,
                beam_size=10,
                vad_filter=True,
                vad_parameters=dict(
                    min_silence_duration_ms=300,
                    threshold=0.35,
                    speech_pad_ms=400
                )
            )
            transcript = " ".join([segment.text for segment in segments])
            return transcript.strip()
        except Exception as e:
            print(f"Transcription error: {e}")
            return ""


# ---------------------------------------------------------------------------
# LLM-Powered Voice Analyzer (replaces the untrained MLP)
# ---------------------------------------------------------------------------

class LLMVoiceAnalyzer:
    """Voice quality analysis using real audio features + LLM interpretation.

    Instead of a random MLP, this class:
    1. Extracts real acoustic metrics from librosa
    2. Counts filler words from the transcript
    3. Sends metrics + transcript to the Qwen LLM for scoring
    """

    # Common filler words in English (especially Indian English interviews)
    FILLER_WORDS = [
        'um', 'uh', 'er', 'ah', 'like', 'you know', 'actually', 'basically',
        'so', 'right', 'okay', 'well', 'I mean', 'sort of', 'kind of',
    ]

    def __init__(self):
        self.ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model = os.environ.get("OLLAMA_MODEL", "qwen3:8b")

    def analyze(self, acoustic_features: Dict, transcript: str = "") -> Dict:
        """Analyze voice quality from acoustic features and transcript."""

        # --- Rule-based metrics (fast, accurate) ---
        filler_count, filler_ratio, word_count = self._count_fillers(transcript)

        # Speaking rate scoring (optimal is 120-160 syllables/min)
        spm = acoustic_features.get('speaking_rate_spm', 0)
        if 120 <= spm <= 160:
            pace_score = 90
        elif 100 <= spm <= 180:
            pace_score = 75
        elif 80 <= spm <= 200:
            pace_score = 60
        else:
            pace_score = 40

        # Silence ratio scoring (some pauses are good, too many are bad)
        silence = acoustic_features.get('silence_ratio', 0)
        if 0.15 <= silence <= 0.35:
            fluency_base = 85
        elif 0.10 <= silence <= 0.45:
            fluency_base = 70
        else:
            fluency_base = 50

        # Filler word penalty
        filler_penalty = min(30, filler_ratio * 3)
        filler_score = max(0, 100 - filler_penalty * 2)

        # Energy consistency → clarity indicator
        energy_consistency = acoustic_features.get('energy_consistency', 0.5)
        clarity_base = int(energy_consistency * 100)

        # --- LLM-enhanced scoring (if available) ---
        llm_scores = self._get_llm_scores(acoustic_features, transcript)

        if llm_scores:
            # Blend rule-based and LLM scores (60% LLM, 40% rule-based)
            fluency = int(0.6 * llm_scores.get('fluency', fluency_base) + 0.4 * fluency_base)
            grammar = llm_scores.get('grammar', 60)
            tone = llm_scores.get('tone', 60)
            pace = int(0.6 * llm_scores.get('pace', pace_score) + 0.4 * pace_score)
            clarity = int(0.6 * llm_scores.get('clarity', clarity_base) + 0.4 * clarity_base)
        else:
            fluency = fluency_base
            grammar = 60  # Cannot assess grammar without LLM
            tone = 60
            pace = pace_score
            clarity = clarity_base

        result = {
            'fluency': max(0, min(100, fluency)),
            'grammar': max(0, min(100, grammar)),
            'tone': max(0, min(100, tone)),
            'pace': max(0, min(100, pace)),
            'filler_words': max(0, min(100, filler_score)),
            'clarity': max(0, min(100, clarity)),
            'transcript': transcript,
            'filler_word_count': filler_count,
            'filler_word_ratio': round(filler_ratio, 2),
            'acoustic_features': acoustic_features,
        }

        result['overall_voice_score'] = round(np.mean([
            result['fluency'], result['grammar'], result['tone'],
            result['pace'], result['clarity']
        ]), 1)

        return result

    def _count_fillers(self, transcript: str):
        """Count filler words in transcript"""
        if not transcript:
            return 0, 0.0, 0

        text_lower = transcript.lower()
        word_count = len(transcript.split())
        filler_count = sum(text_lower.count(filler) for filler in self.FILLER_WORDS)
        filler_ratio = (filler_count / word_count * 100) if word_count > 0 else 0

        return filler_count, filler_ratio, word_count

    def _get_llm_scores(self, features: Dict, transcript: str) -> Optional[Dict]:
        """Get LLM-powered voice quality scores"""
        if not transcript or len(transcript.strip()) < 10:
            return None

        prompt = (
            f"Analyze this interview candidate's voice quality based on the following data.\n\n"
            f"Transcript: \"{transcript[:1500]}\"\n\n"
            f"Acoustic Metrics:\n"
            f"- Speaking rate: {features.get('speaking_rate_spm', 0):.0f} syllables/min\n"
            f"- Silence ratio: {features.get('silence_ratio', 0):.1%}\n"
            f"- Pause count: {features.get('pause_count', 0)}\n"
            f"- Pitch variation: {features.get('pitch_std_hz', 0):.1f} Hz std\n"
            f"- Energy consistency: {features.get('energy_consistency', 0):.1%}\n\n"
            f"Rate each aspect 0-100 in EXACTLY this format:\n"
            f"Fluency: [score]\nGrammar: [score]\nTone: [score]\n"
            f"Pace: [score]\nClarity: [score]"
        )

        try:
            resp = requests.post(
                f"{self.ollama_base_url}/api/generate",
                json={
                    "model": self.ollama_model,
                    "prompt": prompt,
                    "system": "You are a voice quality evaluator for interview candidates. Score strictly 0-100.",
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 150},
                },
                timeout=60,
            )
            if resp.status_code == 200:
                text = resp.json().get("response", "")
                return self._parse_scores(text)
        except Exception:
            pass

        return None

    def _parse_scores(self, text: str) -> Dict:
        """Parse LLM response into scores"""
        scores = {}
        for metric in ['fluency', 'grammar', 'tone', 'pace', 'clarity']:
            match = re.search(rf"{metric}:\s*(\d{{1,3}})", text, re.IGNORECASE)
            if match:
                scores[metric] = max(0, min(100, int(match.group(1))))
        return scores if scores else None


# ---------------------------------------------------------------------------
# Voice Analysis Service (main entry point)
# ---------------------------------------------------------------------------

class VoiceAnalysisService:
    """Complete voice analysis service — combines STT + acoustic analysis + LLM scoring"""

    def __init__(self, model_path=None, device='cpu'):
        self.device = device
        self.feature_extractor = AudioFeatureExtractor()
        self.transcriber = AudioTranscriber(
            model_size=DEFAULT_WHISPER_MODEL,
            device="cuda" if torch.cuda.is_available() else "cpu"
        )
        self.voice_analyzer = LLMVoiceAnalyzer()

    def analyze_audio(self, audio_path: str, transcript: str = None) -> Dict:
        """Analyze audio file and return scores"""
        # Extract real acoustic features
        features = self.feature_extractor.extract_features(audio_path)

        # Auto-transcribe if no transcript provided
        if not transcript:
            try:
                y, _ = librosa.load(audio_path, sr=16000)
                transcript = self.transcriber.transcribe(y)
            except Exception as e:
                print(f"Auto-transcription failed: {e}")

        # LLM-powered voice scoring
        return self.voice_analyzer.analyze(features, transcript or "")

    def analyze_audio_array(self, audio_array: np.ndarray, sr: int = 22050, transcript: str = None) -> Dict:
        """Analyze audio from numpy array"""
        # Extract real acoustic features
        features = self.feature_extractor.extract_from_array(audio_array, sr)

        # Auto-transcribe if needed
        if not transcript:
            try:
                y_16k = librosa.resample(audio_array, orig_sr=sr, target_sr=16000)
                transcript = self.transcriber.transcribe(y_16k)
            except Exception as e:
                print(f"Auto-transcription failed: {e}")

        # LLM-powered voice scoring
        return self.voice_analyzer.analyze(features, transcript or "")
