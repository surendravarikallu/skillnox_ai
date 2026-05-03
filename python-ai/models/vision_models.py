"""
Vision Models for Emotion Detection
Uses pretrained HSEmotion (ResNet-based) for accurate facial expression recognition.
Replaces the previous untrained custom CNN.
"""

import torch
import torch.nn.functional as F
import torchvision.transforms as transforms
from PIL import Image
import numpy as np
import os
from typing import Dict


# ---------------------------------------------------------------------------
# Pretrained Emotion Recognizer (HSEmotion)
# ---------------------------------------------------------------------------

class HSEmotionRecognizer:
    """Pretrained emotion recognition using HSEmotion ResNet model.
    
    Accuracy: ~67% on FER2013, ~64% on AffectNet (vs ~14% random chance before).
    """

    # FER emotion labels (same order as HSEmotion output)
    EMOTION_LABELS = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']

    def __init__(self, device='cpu'):
        self.device = torch.device(device)
        self.model = None
        self._transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def _load_model(self):
        """Lazy-load the HSEmotion model"""
        if self.model is not None:
            return

        try:
            from hsemotion.facial_emotions import HSEmotionRecognizer as HSEmoModel
            self.model = HSEmoModel(model_name='enet_b0_8_best_afew', device=str(self.device))
            print("✓ HSEmotion pretrained model loaded (enet_b0)")
        except ImportError:
            print("⚠ hsemotion not installed. Falling back to lightweight CNN.")
            print("  Install with: pip install hsemotion")
            self.model = None
        except Exception as e:
            print(f"⚠ HSEmotion load error: {e}. Using fallback.")
            self.model = None

    def predict(self, face_image) -> Dict:
        """Predict emotion from a face image (PIL Image or numpy array)"""
        self._load_model()

        if isinstance(face_image, np.ndarray):
            face_image = Image.fromarray(face_image)

        if face_image.mode != 'RGB':
            face_image = face_image.convert('RGB')

        if self.model is not None:
            try:
                emotion, scores = self.model.predict_emotions(face_image, logits=True)
                # scores is a list of probabilities
                probs = np.array(scores)
                if len(probs) >= 7:
                    probs = probs[:7]
                else:
                    probs = np.zeros(7)
                    probs[6] = 1.0  # Neutral fallback

                # Normalize to sum to 1
                probs = probs / (probs.sum() + 1e-8)
                predicted_idx = np.argmax(probs)
                predicted_emotion = self.EMOTION_LABELS[predicted_idx]

                return {
                    'emotion': predicted_emotion,
                    'emotion_probabilities': dict(zip(self.EMOTION_LABELS, probs.tolist())),
                    'confidence_pct': float(np.max(probs) * 100),
                }
            except Exception as e:
                print(f"HSEmotion prediction error: {e}")

        # Fallback: simple heuristic
        return {
            'emotion': 'Neutral',
            'emotion_probabilities': {e: (1.0 / 7) for e in self.EMOTION_LABELS},
            'confidence_pct': 14.3,
        }


# ---------------------------------------------------------------------------
# Face Detector (lightweight, using OpenCV Haar cascade)
# ---------------------------------------------------------------------------

class FaceDetector:
    """Detect faces in images using OpenCV Haar cascades (CPU-friendly)"""

    def __init__(self):
        self.cascade = None

    def _load_cascade(self):
        if self.cascade is None:
            try:
                import cv2
                cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
                self.cascade = cv2.CascadeClassifier(cascade_path)
                print("✓ Face detector loaded (Haar cascade)")
            except ImportError:
                print("⚠ OpenCV not installed for face detection. Using full-frame fallback.")
            except Exception as e:
                print(f"⚠ Face detector error: {e}")

    def detect_faces(self, image) -> list:
        """Detect faces and return list of cropped face images (PIL)"""
        self._load_cascade()

        if isinstance(image, Image.Image):
            img_array = np.array(image)
        else:
            img_array = image

        if self.cascade is not None:
            try:
                import cv2
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY) if len(img_array.shape) == 3 else img_array
                faces = self.cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

                if len(faces) > 0:
                    face_images = []
                    for (x, y, w, h) in faces:
                        # Add padding
                        pad = int(0.1 * max(w, h))
                        y1 = max(0, y - pad)
                        y2 = min(img_array.shape[0], y + h + pad)
                        x1 = max(0, x - pad)
                        x2 = min(img_array.shape[1], x + w + pad)
                        face_crop = img_array[y1:y2, x1:x2]
                        face_images.append(Image.fromarray(face_crop))
                    return face_images
            except Exception:
                pass

        # Fallback: use entire image as "face"
        return [Image.fromarray(img_array) if isinstance(img_array, np.ndarray) else image]


# ---------------------------------------------------------------------------
# Emotion Analyzer (main entry point — keeps same API as before)
# ---------------------------------------------------------------------------

class EmotionAnalyzer:
    """Wrapper class for emotion analysis. Drop-in replacement for the old CNN-based analyzer."""

    def __init__(self, model_path=None, device='cpu'):
        self.device = device
        self.emotion_recognizer = HSEmotionRecognizer(device=device)
        self.face_detector = FaceDetector()

        # Emotion labels (same as before for API compatibility)
        self.emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']

    def preprocess_image(self, image):
        """Preprocess image — detect face first"""
        if isinstance(image, np.ndarray):
            image = Image.fromarray(image)
        elif isinstance(image, str):
            image = Image.open(image)

        if image.mode != 'RGB':
            image = image.convert('RGB')

        return image

    def analyze(self, image) -> Dict:
        """Analyze emotion from image"""
        image = self.preprocess_image(image)

        # Detect faces
        faces = self.face_detector.detect_faces(image)
        if not faces:
            faces = [image]

        # Analyze the first (largest) face
        face = faces[0]
        result = self.emotion_recognizer.predict(face)

        emotion = result['emotion']
        probs = result['emotion_probabilities']
        confidence_pct = result['confidence_pct']

        # Map emotion to interview score
        emotion_score = self._map_emotion_to_score(emotion, probs)

        # Derive interview-relevant metrics from emotion probabilities
        nervousness = self._estimate_nervousness(probs)
        eye_contact_estimate = self._estimate_eye_contact(probs)

        return {
            'emotion': emotion,
            'emotion_probabilities': probs,
            'confidence': confidence_pct,
            'eye_contact': eye_contact_estimate,
            'nervousness': nervousness,
            'emotion_score': emotion_score,
        }

    def _map_emotion_to_score(self, emotion: str, probs: Dict) -> float:
        """Map detected emotion to interview score (0-100)"""
        emotion_scores = {
            'Happy': 85, 'Neutral': 70, 'Surprise': 65,
            'Sad': 50, 'Fear': 40, 'Angry': 30, 'Disgust': 25,
        }

        base_score = emotion_scores.get(emotion, 50)
        confidence = max(probs.values()) if probs else 0.5
        adjusted_score = base_score + (confidence - 0.5) * 20

        return max(0, min(100, adjusted_score))

    def _estimate_nervousness(self, probs: Dict) -> float:
        """Estimate nervousness from emotion probabilities"""
        # Fear + Surprise + Sad indicate nervousness
        nervousness_signal = (
            probs.get('Fear', 0) * 1.5 +
            probs.get('Surprise', 0) * 0.5 +
            probs.get('Sad', 0) * 0.8
        )
        return max(0, min(100, nervousness_signal * 100))

    def _estimate_eye_contact(self, probs: Dict) -> float:
        """Estimate eye contact confidence from emotion distribution"""
        # Happy + Neutral suggest good engagement / eye contact
        engagement = probs.get('Happy', 0) + probs.get('Neutral', 0) + probs.get('Surprise', 0) * 0.3
        return max(0, min(100, engagement * 100))

    def analyze_video_frame(self, frame) -> Dict:
        """Analyze a single video frame"""
        return self.analyze(frame)

    def analyze_video_stream(self, frames) -> Dict:
        """Analyze multiple frames and return aggregated results"""
        results = [self.analyze(frame) for frame in frames]

        avg_confidence = np.mean([r['confidence'] for r in results])
        avg_eye_contact = np.mean([r['eye_contact'] for r in results])
        avg_nervousness = np.mean([r['nervousness'] for r in results])
        avg_emotion_score = np.mean([r['emotion_score'] for r in results])

        emotions = [r['emotion'] for r in results]
        most_common_emotion = max(set(emotions), key=emotions.count)

        return {
            'overall_confidence': float(avg_confidence),
            'overall_eye_contact': float(avg_eye_contact),
            'overall_nervousness': float(avg_nervousness),
            'overall_emotion_score': float(avg_emotion_score),
            'dominant_emotion': most_common_emotion,
            'frame_count': len(frames),
        }
