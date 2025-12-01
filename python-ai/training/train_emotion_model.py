"""
Training script for Emotion Detection CNN
Simulates training on FER2013-style data
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
import os
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from models.vision_models import EmotionCNN


class SyntheticEmotionDataset(Dataset):
    """Synthetic dataset for emotion detection (simulates FER2013)"""
    
    def __init__(self, num_samples=1000, img_size=48):
        self.num_samples = num_samples
        self.img_size = img_size
        self.num_classes = 7
        self.emotions = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']
    
    def __len__(self):
        return self.num_samples
    
    def __getitem__(self, idx):
        # Generate synthetic grayscale image (48x48)
        # In real scenario, would load from FER2013 dataset
        image = np.random.rand(1, self.img_size, self.img_size).astype(np.float32)
        # Normalize
        image = (image - 0.5) / 0.5
        
        # Random emotion label
        label = np.random.randint(0, self.num_classes)
        
        return torch.FloatTensor(image), torch.LongTensor([label])


def train_emotion_model(model, train_loader, val_loader, epochs=20, device='cpu'):
    """Train emotion detection model"""
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=7, gamma=0.1)
    
    model.train()
    best_val_acc = 0
    
    for epoch in range(epochs):
        running_loss = 0.0
        correct = 0
        total = 0
        
        for batch_idx, (images, labels) in enumerate(train_loader):
            images = images.to(device)
            labels = labels.squeeze().to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs['emotion_logits'], labels)
            
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            _, predicted = torch.max(outputs['emotion_logits'].data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
        
        scheduler.step()
        train_acc = 100 * correct / total
        
        # Validation
        if val_loader:
            val_acc = validate(model, val_loader, device)
            if val_acc > best_val_acc:
                best_val_acc = val_acc
                # Save best model
                os.makedirs('../models/saved', exist_ok=True)
                torch.save(model.state_dict(), '../models/saved/emotion_cnn.pth')
        else:
            val_acc = 0
        
        print(f'Epoch {epoch+1}/{epochs}, Loss: {running_loss/len(train_loader):.4f}, '
              f'Train Acc: {train_acc:.2f}%, Val Acc: {val_acc:.2f}%')
    
    # Final save
    os.makedirs('../models/saved', exist_ok=True)
    torch.save(model.state_dict(), '../models/saved/emotion_cnn_final.pth')
    print("Emotion model saved!")


def validate(model, val_loader, device):
    """Validate model"""
    model.eval()
    correct = 0
    total = 0
    
    with torch.no_grad():
        for images, labels in val_loader:
            images = images.to(device)
            labels = labels.squeeze().to(device)
            
            outputs = model(images)
            _, predicted = torch.max(outputs['emotion_logits'].data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
    
    model.train()
    return 100 * correct / total


def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Create synthetic datasets
    print("Creating synthetic emotion datasets...")
    train_dataset = SyntheticEmotionDataset(num_samples=800)
    val_dataset = SyntheticEmotionDataset(num_samples=200)
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
    
    # Initialize model
    print("Initializing emotion CNN...")
    model = EmotionCNN(num_classes=7).to(device)
    
    # Train
    print("\nTraining emotion detection model...")
    train_emotion_model(model, train_loader, val_loader, epochs=15, device=device)
    
    print("\nEmotion model trained successfully!")


if __name__ == '__main__':
    main()

