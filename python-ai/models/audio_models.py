"""
Audio Models for Voice Analysis
Uses librosa for feature extraction and PyTorch for analysis
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import librosa
import numpy as np
from typing import Dict, List, Tuple


class VoiceAnalyzer(nn.Module):
    """Neural network for analyzing voice characteristics"""
    
    def __init__(self, input_features=193):  # MFCC + chroma + mel + spectral features
        super(VoiceAnalyzer, self).__init__()
        
        self.fc1 = nn.Linear(input_features, 256)
        self.bn1 = nn.BatchNorm1d(256)
        self.fc2 = nn.Linear(256, 128)
        self.bn2 = nn.BatchNorm1d(128)
        self.fc3 = nn.Linear(128, 64)
        
        # Output heads
        self.fluency_score = nn.Linear(64, 1)
        self.grammar_score = nn.Linear(64, 1)
        self.tone_score = nn.Linear(64, 1)
        self.pace_score = nn.Linear(64, 1)
        self.filler_word_score = nn.Linear(64, 1)
        self.clarity_score = nn.Linear(64, 1)
        
        self.dropout = nn.Dropout(0.3)
        
    def forward(self, x):
        x = F.relu(self.bn1(self.fc1(x)))
        x = self.dropout(x)
        x = F.relu(self.bn2(self.fc2(x)))
        x = self.dropout(x)
        x = F.relu(self.fc3(x))
        
        scores = {
            'fluency': torch.sigmoid(self.fluency_score(x)) * 100,
            'grammar': torch.sigmoid(self.grammar_score(x)) * 100,
            'tone': torch.sigmoid(self.tone_score(x)) * 100,
            'pace': torch.sigmoid(self.pace_score(x)) * 100,
            'filler_words': torch.sigmoid(self.filler_word_score(x)) * 100,
            'clarity': torch.sigmoid(self.clarity_score(x)) * 100
        }
        
        return scores


class AudioFeatureExtractor:
    """Extract audio features using librosa"""
    
    def __init__(self, sr=22050, n_mfcc=13, n_chroma=12):
        self.sr = sr
        self.n_mfcc = n_mfcc
        self.n_chroma = n_chroma
    
    def extract_features(self, audio_path: str) -> np.ndarray:
        """Extract comprehensive audio features"""
        try:
            y, sr = librosa.load(audio_path, sr=self.sr)
        except:
            # If file doesn't exist, return zeros
            return np.zeros(193)
        
        features = []
        
        # MFCC features (13 coefficients)
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=self.n_mfcc)
        mfccs_mean = np.mean(mfccs, axis=1)
        features.extend(mfccs_mean)
        
        # Chroma features (12)
        chroma = librosa.feature.chroma(y=y, sr=sr)
        chroma_mean = np.mean(chroma, axis=1)
        features.extend(chroma_mean)
        
        # Mel spectrogram features
        mel = librosa.feature.melspectrogram(y=y, sr=sr)
        mel_mean = np.mean(mel, axis=1)
        features.extend(mel_mean[:20])  # Take first 20
        
        # Spectral features
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)
        features.append(np.mean(spectral_centroids))
        
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
        features.append(np.mean(spectral_rolloff))
        
        zero_crossing_rate = librosa.feature.zero_crossing_rate(y)
        features.append(np.mean(zero_crossing_rate))
        
        # Tempo (BPM)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        features.append(tempo)
        
        # Rhythm features
        tempogram = librosa.feature.tempogram(y=y, sr=sr)
        features.append(np.mean(tempogram))
        
        # Pitch features
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_mean = np.mean(pitches[pitches > 0]) if np.any(pitches > 0) else 0
        features.append(pitch_mean)
        
        # Additional features for speech analysis
        # Pause detection (silence ratio)
        frame_length = 2048
        hop_length = 512
        rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)
        silence_threshold = np.percentile(rms, 10)
        silence_ratio = np.sum(rms < silence_threshold) / len(rms[0])
        features.append(silence_ratio)
        
        # Speech rate (approximate)
        speech_rate = len(y) / sr  # Duration in seconds
        features.append(speech_rate)
        
        # Pad or truncate to fixed size
        target_size = 193
        if len(features) < target_size:
            features.extend([0] * (target_size - len(features)))
        else:
            features = features[:target_size]
        
        return np.array(features, dtype=np.float32)
    
    def extract_from_array(self, audio_array: np.ndarray, sr: int = None) -> np.ndarray:
        """Extract features from audio array"""
        if sr is None:
            sr = self.sr
        
        # Resample if needed
        if sr != self.sr:
            audio_array = librosa.resample(audio_array, orig_sr=sr, target_sr=self.sr)
        
        # Save temporarily and extract (simplified approach)
        # In production, would process directly
        return self.extract_features_from_memory(audio_array)
    
    def extract_features_from_memory(self, y: np.ndarray) -> np.ndarray:
        """Extract features directly from audio array in memory"""
        sr = self.sr
        features = []
        
        # MFCC features
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=self.n_mfcc)
        mfccs_mean = np.mean(mfccs, axis=1)
        features.extend(mfccs_mean)
        
        # Chroma features
        chroma = librosa.feature.chroma(y=y, sr=sr)
        chroma_mean = np.mean(chroma, axis=1)
        features.extend(chroma_mean)
        
        # Mel spectrogram
        mel = librosa.feature.melspectrogram(y=y, sr=sr)
        mel_mean = np.mean(mel, axis=1)
        features.extend(mel_mean[:20])
        
        # Spectral features
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)
        features.append(np.mean(spectral_centroids))
        
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
        features.append(np.mean(spectral_rolloff))
        
        zero_crossing_rate = librosa.feature.zero_crossing_rate(y)
        features.append(np.mean(zero_crossing_rate))
        
        # Tempo
        try:
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            features.append(tempo)
        except:
            features.append(120.0)  # Default tempo
        
        # Tempogram
        tempogram = librosa.feature.tempogram(y=y, sr=sr)
        features.append(np.mean(tempogram))
        
        # Pitch
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_mean = np.mean(pitches[pitches > 0]) if np.any(pitches > 0) else 0
        features.append(pitch_mean)
        
        # Silence ratio
        frame_length = 2048
        hop_length = 512
        rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)
        silence_threshold = np.percentile(rms, 10) if len(rms[0]) > 0 else 0
        silence_ratio = np.sum(rms < silence_threshold) / len(rms[0]) if len(rms[0]) > 0 else 0
        features.append(silence_ratio)
        
        # Speech rate
        speech_rate = len(y) / sr
        features.append(speech_rate)
        
        # Pad to target size
        target_size = 193
        if len(features) < target_size:
            features.extend([0] * (target_size - len(features)))
        else:
            features = features[:target_size]
        
        return np.array(features, dtype=np.float32)


class VoiceAnalysisService:
    """Complete voice analysis service"""
    
    def __init__(self, model_path=None, device='cpu'):
        self.device = torch.device(device)
        self.model = VoiceAnalyzer().to(self.device)
        
        if model_path:
            self.model.load_state_dict(torch.load(model_path, map_location=device))
        
        self.model.eval()
        self.feature_extractor = AudioFeatureExtractor()
        
        # Common filler words
        self.filler_words = ['um', 'uh', 'er', 'ah', 'like', 'you know', 'actually', 'basically']
    
    def analyze_audio(self, audio_path: str, transcript: str = None) -> Dict:
        """Analyze audio file and return scores"""
        # Extract features
        features = self.feature_extractor.extract_features(audio_path)
        features_tensor = torch.FloatTensor(features).unsqueeze(0).to(self.device)
        
        # Get model predictions
        with torch.no_grad():
            scores = self.model(features_tensor)
        
        # Extract scores
        result = {
            'fluency': float(scores['fluency'].cpu().numpy()[0]),
            'grammar': float(scores['grammar'].cpu().numpy()[0]),
            'tone': float(scores['tone'].cpu().numpy()[0]),
            'pace': float(scores['pace'].cpu().numpy()[0]),
            'filler_words': float(scores['filler_words'].cpu().numpy()[0]),
            'clarity': float(scores['clarity'].cpu().numpy()[0])
        }
        
        # If transcript provided, analyze filler words
        if transcript:
            filler_count = sum(transcript.lower().count(word) for word in self.filler_words)
            word_count = len(transcript.split())
            filler_ratio = (filler_count / word_count * 100) if word_count > 0 else 0
            result['filler_word_count'] = filler_count
            result['filler_word_ratio'] = filler_ratio
            # Adjust filler word score based on actual count
            result['filler_words'] = max(0, 100 - filler_ratio * 2)
        
        # Calculate overall voice score
        result['overall_voice_score'] = np.mean([
            result['fluency'],
            result['grammar'],
            result['tone'],
            result['pace'],
            result['clarity']
        ])
        
        return result
    
    def analyze_audio_array(self, audio_array: np.ndarray, sr: int = 22050, transcript: str = None) -> Dict:
        """Analyze audio from numpy array"""
        features = self.feature_extractor.extract_features_from_memory(audio_array)
        features_tensor = torch.FloatTensor(features).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            scores = self.model(features_tensor)
        
        result = {
            'fluency': float(scores['fluency'].cpu().numpy()[0]),
            'grammar': float(scores['grammar'].cpu().numpy()[0]),
            'tone': float(scores['tone'].cpu().numpy()[0]),
            'pace': float(scores['pace'].cpu().numpy()[0]),
            'filler_words': float(scores['filler_words'].cpu().numpy()[0]),
            'clarity': float(scores['clarity'].cpu().numpy()[0])
        }
        
        if transcript:
            filler_count = sum(transcript.lower().count(word) for word in self.filler_words)
            word_count = len(transcript.split())
            filler_ratio = (filler_count / word_count * 100) if word_count > 0 else 0
            result['filler_word_count'] = filler_count
            result['filler_word_ratio'] = filler_ratio
            result['filler_words'] = max(0, 100 - filler_ratio * 2)
        
        result['overall_voice_score'] = np.mean([
            result['fluency'],
            result['grammar'],
            result['tone'],
            result['pace'],
            result['clarity']
        ])
        
        return result

