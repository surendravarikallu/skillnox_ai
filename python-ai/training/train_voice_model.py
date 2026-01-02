"""
Training script for Voice Analysis Model
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

from models.audio_models import VoiceAnalyzer


from utils.data_generator import generate_synthetic_voice_data


class VoiceDataset(Dataset):
    """Dataset for voice analysis"""
    
    def __init__(self, num_samples=1000, feature_dim=193):
        self.num_samples = num_samples
        self.feature_dim = feature_dim
        
        # Generate correlated synthetic data
        data = generate_synthetic_voice_data(num_samples, feature_dim)
        
        self.features = data['features']
        self.labels = data['labels']
    
    def __len__(self):
        return self.num_samples
    
    def __getitem__(self, idx):
        features = self.features[idx]
        labels = np.array([
            self.labels['fluency'][idx],
            self.labels['grammar'][idx],
            self.labels['tone'][idx],
            self.labels['pace'][idx],
            self.labels['filler_words'][idx],
            self.labels['clarity'][idx]
        ])
        
        return torch.FloatTensor(features), torch.FloatTensor(labels)


def train_voice_model(model, train_loader, val_loader, epochs=20, device='cpu'):
    """Train voice analysis model"""
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=7, gamma=0.1)
    
    model.train()
    best_val_loss = float('inf')
    
    for epoch in range(epochs):
        running_loss = 0.0
        
        for batch_idx, (features, labels) in enumerate(train_loader):
            features = features.to(device)
            labels = labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(features)
            
            # Calculate loss for each metric
            loss = 0
            metric_names = ['fluency', 'grammar', 'tone', 'pace', 'filler_words', 'clarity']
            for i, metric in enumerate(metric_names):
                loss += criterion(outputs[metric], labels[:, i:i+1])
            
            loss = loss / len(metric_names)  # Average loss
            
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
        
        scheduler.step()
        
        # Validation
        if val_loader:
            val_loss = validate(model, val_loader, device, criterion)
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                # Save best model
                os.makedirs('../models/saved', exist_ok=True)
                torch.save(model.state_dict(), '../models/saved/voice_analyzer.pth')
        else:
            val_loss = 0
        
        print(f'Epoch {epoch+1}/{epochs}, Loss: {running_loss/len(train_loader):.4f}, '
              f'Val Loss: {val_loss:.4f}')
    
    # Final save
    os.makedirs('../models/saved', exist_ok=True)
    torch.save(model.state_dict(), '../models/saved/voice_analyzer_final.pth')
    print("Voice model saved!")


def validate(model, val_loader, device, criterion):
    """Validate model"""
    model.eval()
    total_loss = 0
    
    with torch.no_grad():
        for features, labels in val_loader:
            features = features.to(device)
            labels = labels.to(device)
            
            outputs = model(features)
            
            loss = 0
            metric_names = ['fluency', 'grammar', 'tone', 'pace', 'filler_words', 'clarity']
            for i, metric in enumerate(metric_names):
                loss += criterion(outputs[metric], labels[:, i:i+1])
            loss = loss / len(metric_names)
            
            total_loss += loss.item()
    
    model.train()
    return total_loss / len(val_loader)


def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Create datasets
    print("Creating voice datasets...")
    train_dataset = VoiceDataset(num_samples=800)
    val_dataset = VoiceDataset(num_samples=200)
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
    
    # Initialize model
    print("Initializing voice analyzer...")
    model = VoiceAnalyzer().to(device)
    
    # Train
    print("\nTraining voice analysis model...")
    train_voice_model(model, train_loader, val_loader, epochs=15, device=device)
    
    print("\nVoice model trained successfully!")


if __name__ == '__main__':
    main()

