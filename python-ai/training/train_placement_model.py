"""
Training script for Placement Probability Predictor
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

from models.ml_models import PlacementPredictor


class PlacementDataset(Dataset):
    """Dataset for placement probability prediction"""
    
    def __init__(self, num_samples=1000):
        self.num_samples = num_samples
        
        # Generate synthetic features
        # Features: resume_score, jd_score, technical_score, hr_score, gd_score,
        #           emotion_score, voice_score, personality traits (4)
        self.features = np.random.rand(num_samples, 10).astype(np.float32) * 100
        
        # Generate synthetic labels (probabilities 0-100)
        # Based on weighted combination of features
        weights = np.array([0.15, 0.15, 0.35, 0.25, 0.05, 0.02, 0.02, 0.01, 0.01, 0.01])
        base_scores = np.dot(self.features, weights)
        
        # Add some noise
        noise = np.random.randn(num_samples) * 5
        
        self.labels = {
            'prob_30': np.clip(base_scores - 20 + noise, 0, 100),
            'prob_60': np.clip(base_scores - 5 + noise, 0, 100),
            'prob_90': np.clip(base_scores + 10 + noise, 0, 100)
        }
    
    def __len__(self):
        return self.num_samples
    
    def __getitem__(self, idx):
        features = self.features[idx]
        labels = np.array([
            self.labels['prob_30'][idx],
            self.labels['prob_60'][idx],
            self.labels['prob_90'][idx]
        ])
        
        return torch.FloatTensor(features), torch.FloatTensor(labels)


def train_placement_model(model, train_loader, val_loader, epochs=20, device='cpu'):
    """Train placement probability predictor"""
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
            
            # Calculate loss for each time horizon
            loss = 0
            loss += criterion(outputs['probability_30_days'], labels[:, 0:1])
            loss += criterion(outputs['probability_60_days'], labels[:, 1:2])
            loss += criterion(outputs['probability_90_days'], labels[:, 2:3])
            
            loss = loss / 3  # Average loss
            
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
                torch.save(model.state_dict(), '../models/saved/placement_predictor.pth')
        else:
            val_loss = 0
        
        print(f'Epoch {epoch+1}/{epochs}, Loss: {running_loss/len(train_loader):.4f}, '
              f'Val Loss: {val_loss:.4f}')
    
    # Final save
    os.makedirs('../models/saved', exist_ok=True)
    torch.save(model.state_dict(), '../models/saved/placement_predictor_final.pth')
    print("Placement model saved!")


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
            loss += criterion(outputs['probability_30_days'], labels[:, 0:1])
            loss += criterion(outputs['probability_60_days'], labels[:, 1:2])
            loss += criterion(outputs['probability_90_days'], labels[:, 2:3])
            loss = loss / 3
            
            total_loss += loss.item()
    
    model.train()
    return total_loss / len(val_loader)


def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Create datasets
    print("Creating placement datasets...")
    train_dataset = PlacementDataset(num_samples=800)
    val_dataset = PlacementDataset(num_samples=200)
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
    
    # Initialize model
    print("Initializing placement predictor...")
    model = PlacementPredictor(input_features=10).to(device)
    
    # Train
    print("\nTraining placement probability model...")
    train_placement_model(model, train_loader, val_loader, epochs=15, device=device)
    
    print("\nPlacement model trained successfully!")


if __name__ == '__main__':
    main()

