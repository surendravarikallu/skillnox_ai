"""
Vision Models for Emotion Detection
Trained on FER2013 dataset style
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as transforms
from PIL import Image
import numpy as np


class EmotionCNN(nn.Module):
    """CNN for emotion detection from facial expressions"""
    
    def __init__(self, num_classes=7):
        super(EmotionCNN, self).__init__()
        # FER2013 has 48x48 grayscale images
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(128)
        self.conv4 = nn.Conv2d(128, 128, kernel_size=3, padding=1)
        self.bn4 = nn.BatchNorm2d(128)
        
        self.pool = nn.MaxPool2d(2, 2)
        self.dropout = nn.Dropout(0.5)
        
        # After 3 pooling operations: 48/8 = 6
        self.fc1 = nn.Linear(128 * 6 * 6, 512)
        self.fc2 = nn.Linear(512, 256)
        self.fc3 = nn.Linear(256, num_classes)
        
        # Additional outputs for interview analysis
        self.confidence_score = nn.Linear(256, 1)
        self.eye_contact_score = nn.Linear(256, 1)
        self.nervousness_score = nn.Linear(256, 1)
        
    def forward(self, x):
        # x shape: (batch, 1, 48, 48)
        x = self.pool(F.relu(self.bn1(self.conv1(x))))
        x = self.pool(F.relu(self.bn2(self.conv2(x))))
        x = self.pool(F.relu(self.bn3(self.conv3(x))))
        x = F.relu(self.bn4(self.conv4(x)))
        
        x = x.view(x.size(0), -1)
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        x = F.relu(self.fc2(x))
        
        # Emotion classification
        emotion_logits = self.fc3(x)
        emotion_probs = F.softmax(emotion_logits, dim=1)
        
        # Additional metrics
        confidence = torch.sigmoid(self.confidence_score(x)) * 100
        eye_contact = torch.sigmoid(self.eye_contact_score(x)) * 100
        nervousness = torch.sigmoid(self.nervousness_score(x)) * 100
        
        return {
            'emotion_probs': emotion_probs,
            'emotion_logits': emotion_logits,
            'confidence': confidence,
            'eye_contact': eye_contact,
            'nervousness': nervousness
        }


class EmotionAnalyzer:
    """Wrapper class for emotion analysis with preprocessing"""
    
    def __init__(self, model_path=None, device='cpu'):
        self.device = torch.device(device)
        self.model = EmotionCNN(num_classes=7).to(self.device)
        
        if model_path:
            self.model.load_state_dict(torch.load(model_path, map_location=device))
        
        self.model.eval()
        
        # Emotion labels (FER2013)
        self.emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']
        
        # Transform for input images
        self.transform = transforms.Compose([
            transforms.Grayscale(),
            transforms.Resize((48, 48)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5], std=[0.5])
        ])
    
    def preprocess_image(self, image):
        """Preprocess image for model input"""
        if isinstance(image, np.ndarray):
            image = Image.fromarray(image)
        elif isinstance(image, str):
            image = Image.open(image)
        
        # Convert to RGB if needed
        if image.mode != 'L':
            image = image.convert('L')
        
        image = self.transform(image).unsqueeze(0)
        return image.to(self.device)
    
    def analyze(self, image):
        """Analyze emotion from image"""
        processed = self.preprocess_image(image)
        
        with torch.no_grad():
            outputs = self.model(processed)
        
        emotion_probs = outputs['emotion_probs'].cpu().numpy()[0]
        predicted_emotion = self.emotion_labels[np.argmax(emotion_probs)]
        
        # Map emotions to interview-relevant metrics
        emotion_score = self._map_emotion_to_score(predicted_emotion, emotion_probs)
        
        return {
            'emotion': predicted_emotion,
            'emotion_probabilities': dict(zip(self.emotion_labels, emotion_probs.tolist())),
            'confidence': float(outputs['confidence'].cpu().numpy()[0]),
            'eye_contact': float(outputs['eye_contact'].cpu().numpy()[0]),
            'nervousness': float(outputs['nervousness'].cpu().numpy()[0]),
            'emotion_score': emotion_score
        }
    
    def _map_emotion_to_score(self, emotion, probs):
        """Map detected emotion to interview score (0-100)"""
        # Positive emotions boost score, negative reduce
        emotion_scores = {
            'Happy': 85,
            'Neutral': 70,
            'Surprise': 65,
            'Sad': 50,
            'Fear': 40,
            'Angry': 30,
            'Disgust': 25
        }
        
        base_score = emotion_scores.get(emotion, 50)
        # Adjust based on confidence
        confidence = np.max(probs)
        adjusted_score = base_score + (confidence - 0.5) * 20
        
        return max(0, min(100, adjusted_score))
    
    def analyze_video_frame(self, frame):
        """Analyze a single video frame"""
        return self.analyze(frame)
    
    def analyze_video_stream(self, frames):
        """Analyze multiple frames and return aggregated results"""
        results = [self.analyze(frame) for frame in frames]
        
        # Aggregate results
        avg_confidence = np.mean([r['confidence'] for r in results])
        avg_eye_contact = np.mean([r['eye_contact'] for r in results])
        avg_nervousness = np.mean([r['nervousness'] for r in results])
        avg_emotion_score = np.mean([r['emotion_score'] for r in results])
        
        # Most common emotion
        emotions = [r['emotion'] for r in results]
        most_common_emotion = max(set(emotions), key=emotions.count)
        
        return {
            'overall_confidence': float(avg_confidence),
            'overall_eye_contact': float(avg_eye_contact),
            'overall_nervousness': float(avg_nervousness),
            'overall_emotion_score': float(avg_emotion_score),
            'dominant_emotion': most_common_emotion,
            'frame_count': len(frames)
        }

