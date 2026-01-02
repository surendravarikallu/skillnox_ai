"""
Training script for NLP models
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from models.nlp_models import (
    ResumeParser, JDExtractor, AnswerEvaluator, 
    PersonalityModel, ProjectEvaluator, GD_Analyzer,
    create_vocab, text_to_sequence
)
from utils.data_generator import generate_synthetic_nlp_data


class NLP_Dataset(Dataset):
    """Dataset for NLP models"""
    
    def __init__(self, texts, labels, vocab, max_length=200):
        self.texts = texts
        self.labels = labels
        self.vocab = vocab
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = self.texts[idx]
        sequence = text_to_sequence(text, self.vocab, self.max_length)
        label = self.labels[idx]
        return torch.LongTensor(sequence), torch.FloatTensor(label)


def train_resume_parser(model, train_loader, val_loader, epochs=10, device='cpu'):
    """Train resume parser model"""
    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    model.train()
    for epoch in range(epochs):
        total_loss = 0
        for batch_idx, (data, target) in enumerate(train_loader):
            data, target = data.to(device), target.to(device)
            
            optimizer.zero_grad()
            skills, experience, education = model(data)
            
            # For simplicity, using target as skills target
            loss = criterion(skills, target[:, :100])  # First 100 are skills
            loss += criterion(experience, target[:, 100:101])
            loss += criterion(education, target[:, 101:102])
            
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        
        print(f'Epoch {epoch+1}/{epochs}, Loss: {total_loss/len(train_loader):.4f}')
    
    # Save model
    os.makedirs('../models/saved', exist_ok=True)
    torch.save(model.state_dict(), '../models/saved/resume_parser.pth')
    print("Resume parser model saved!")


def train_answer_evaluator(model, train_loader, val_loader, epochs=10, device='cpu'):
    """Train answer evaluator model"""
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    model.train()
    for epoch in range(epochs):
        total_loss = 0
        for batch_idx, (data, target) in enumerate(train_loader):
            data, target = data.to(device), target.to(device)
            
            optimizer.zero_grad()
            score, _ = model(data)
            
            # Target is expected score (0-100)
            loss = criterion(score, target)
            
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        
        print(f'Epoch {epoch+1}/{epochs}, Loss: {total_loss/len(train_loader):.4f}')
    
    os.makedirs('../models/saved', exist_ok=True)
    torch.save(model.state_dict(), '../models/saved/answer_evaluator.pth')
    print("Answer evaluator model saved!")


def train_personality_model(model, train_loader, val_loader, epochs=10, device='cpu'):
    """Train personality model"""
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    model.train()
    for epoch in range(epochs):
        total_loss = 0
        for batch_idx, (data, target) in enumerate(train_loader):
            data, target = data.to(device), target.to(device)
            
            optimizer.zero_grad()
            traits = model(data)
            
            loss = criterion(traits, target)
            
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        
        print(f'Epoch {epoch+1}/{epochs}, Loss: {total_loss/len(train_loader):.4f}')
    
    os.makedirs('../models/saved', exist_ok=True)
    torch.save(model.state_dict(), '../models/saved/personality_model.pth')
    print("Personality model saved!")


def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Generate synthetic data
    print("Generating synthetic NLP data...")
    nlp_data = generate_synthetic_nlp_data(num_samples=1000)
    
    # Create vocabulary
    all_texts = nlp_data['resumes'] + nlp_data['jds'] + nlp_data['answers']
    vocab = create_vocab(all_texts, max_vocab_size=10000)
    
    # Prepare datasets
    print("Preparing datasets...")
    
    # Resume parser data
    resume_texts = nlp_data['resumes']
    resume_labels = nlp_data['resume_labels']  # Use correlated labels
    resume_dataset = NLP_Dataset(resume_texts, resume_labels, vocab)
    resume_loader = DataLoader(resume_dataset, batch_size=32, shuffle=True)
    
    # Answer evaluator data
    answer_texts = nlp_data['answers']
    answer_labels = nlp_data['answer_scores']  # Use correlated scores
    answer_dataset = NLP_Dataset(answer_texts, answer_labels, vocab)
    answer_loader = DataLoader(answer_dataset, batch_size=32, shuffle=True)
    
    # Personality model data (multiple responses per person)
    personality_texts = []
    personality_labels = []
    for i in range(200):  # 200 people
        responses = [nlp_data['answers'][i*5+j] for j in range(5)]
        personality_texts.append(responses)
        # 4 personality dimensions, each -1 to 1
        personality_labels.append(np.random.rand(4) * 2 - 1)
    
    # Convert to sequences
    personality_sequences = []
    for responses in personality_texts:
        seqs = [text_to_sequence(r, vocab, 200) for r in responses]
        # Pad to 5 responses
        while len(seqs) < 5:
            seqs.append([0] * 200)
        personality_sequences.append(seqs[:5])
    
    personality_dataset = torch.utils.data.TensorDataset(
        torch.LongTensor(personality_sequences),
        torch.FloatTensor(personality_labels)
    )
    personality_loader = DataLoader(personality_dataset, batch_size=16, shuffle=True)
    
    # Initialize models
    print("Initializing models...")
    resume_parser = ResumeParser().to(device)
    answer_evaluator = AnswerEvaluator().to(device)
    personality_model = PersonalityModel().to(device)
    
    # Train models
    print("\nTraining Resume Parser...")
    train_resume_parser(resume_parser, resume_loader, None, epochs=5, device=device)
    
    print("\nTraining Answer Evaluator...")
    train_answer_evaluator(answer_evaluator, answer_loader, None, epochs=5, device=device)
    
    print("\nTraining Personality Model...")
    train_personality_model(personality_model, personality_loader, None, epochs=5, device=device)
    
    print("\nAll NLP models trained successfully!")


if __name__ == '__main__':
    main()

