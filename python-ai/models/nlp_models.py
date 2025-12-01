"""
NLP Models for Interview System
Includes: Resume Parser, JD Extractor, Q&A Evaluator, Personality Model, etc.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel
import re
from typing import Dict, List, Tuple, Any
import numpy as np


class ResumeParser(nn.Module):
    """Neural network for parsing and extracting information from resumes"""
    
    def __init__(self, vocab_size=10000, embedding_dim=128, hidden_dim=256):
        super(ResumeParser, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.skill_classifier = nn.Linear(hidden_dim * 2, 100)  # 100 common skills
        self.experience_extractor = nn.Linear(hidden_dim * 2, 1)
        self.education_extractor = nn.Linear(hidden_dim * 2, 1)
        
    def forward(self, x):
        embedded = self.embedding(x)
        lstm_out, _ = self.lstm(embedded)
        # Use last hidden state
        last_hidden = lstm_out[:, -1, :]
        skills = torch.sigmoid(self.skill_classifier(last_hidden))
        experience = torch.sigmoid(self.experience_extractor(last_hidden))
        education = torch.sigmoid(self.education_extractor(last_hidden))
        return skills, experience, education


class JDExtractor(nn.Module):
    """Extract required skills from Job Descriptions"""
    
    def __init__(self, vocab_size=10000, embedding_dim=128, hidden_dim=256):
        super(JDExtractor, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.skill_extractor = nn.Linear(hidden_dim * 2, 100)
        self.importance_scorer = nn.Linear(hidden_dim * 2, 1)
        
    def forward(self, x):
        embedded = self.embedding(x)
        lstm_out, _ = self.lstm(embedded)
        last_hidden = lstm_out[:, -1, :]
        skills = torch.sigmoid(self.skill_extractor(last_hidden))
        importance = torch.sigmoid(self.importance_scorer(last_hidden))
        return skills, importance


class AnswerEvaluator(nn.Module):
    """Evaluate technical/HR/behavioral interview answers"""
    
    def __init__(self, vocab_size=10000, embedding_dim=128, hidden_dim=256):
        super(AnswerEvaluator, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.attention = nn.MultiheadAttention(hidden_dim * 2, num_heads=4, batch_first=True)
        self.scorer = nn.Sequential(
            nn.Linear(hidden_dim * 2, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1)
        )
        self.feedback_generator = nn.Linear(hidden_dim * 2, 50)  # 50 feedback categories
        
    def forward(self, answer, question=None):
        embedded = self.embedding(answer)
        lstm_out, _ = self.lstm(embedded)
        
        # Self-attention
        attended, _ = self.attention(lstm_out, lstm_out, lstm_out)
        last_hidden = attended[:, -1, :]
        
        score = torch.sigmoid(self.scorer(last_hidden)) * 100  # Scale to 0-100
        feedback_logits = self.feedback_generator(last_hidden)
        
        return score, feedback_logits


class PersonalityModel(nn.Module):
    """MBTI-style personality detection from interview responses"""
    
    def __init__(self, vocab_size=10000, embedding_dim=128, hidden_dim=256):
        super(PersonalityModel, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.personality_traits = nn.Sequential(
            nn.Linear(hidden_dim * 2, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 4)  # 4 dimensions: Introvert/Extrovert, Thinker/Feeler, Logical/Creative, Planner/Spontaneous
        )
        
    def forward(self, responses):
        # responses shape: (batch, num_responses, seq_len)
        batch_size, num_responses, seq_len = responses.shape
        responses = responses.view(batch_size * num_responses, seq_len)
        
        embedded = self.embedding(responses)
        lstm_out, _ = self.lstm(embedded)
        last_hidden = lstm_out[:, -1, :]
        
        # Aggregate across responses
        last_hidden = last_hidden.view(batch_size, num_responses, -1)
        aggregated = torch.mean(last_hidden, dim=1)
        
        traits = torch.tanh(self.personality_traits(aggregated))  # Range: -1 to 1
        return traits


class ProjectEvaluator(nn.Module):
    """Evaluate project explanation clarity and depth"""
    
    def __init__(self, vocab_size=10000, embedding_dim=128, hidden_dim=256):
        super(ProjectEvaluator, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.architecture_score = nn.Linear(hidden_dim * 2, 1)
        self.tech_stack_score = nn.Linear(hidden_dim * 2, 1)
        self.role_clarity_score = nn.Linear(hidden_dim * 2, 1)
        self.challenge_score = nn.Linear(hidden_dim * 2, 1)
        self.overall_score = nn.Linear(hidden_dim * 2, 1)
        
    def forward(self, explanation):
        embedded = self.embedding(explanation)
        lstm_out, _ = self.lstm(embedded)
        last_hidden = lstm_out[:, -1, :]
        
        arch_score = torch.sigmoid(self.architecture_score(last_hidden)) * 100
        tech_score = torch.sigmoid(self.tech_stack_score(last_hidden)) * 100
        role_score = torch.sigmoid(self.role_clarity_score(last_hidden)) * 100
        challenge_score = torch.sigmoid(self.challenge_score(last_hidden)) * 100
        overall = torch.sigmoid(self.overall_score(last_hidden)) * 100
        
        return {
            'architecture': arch_score,
            'tech_stack': tech_score,
            'role_clarity': role_score,
            'challenges': challenge_score,
            'overall': overall
        }


class GD_Analyzer(nn.Module):
    """Analyze Group Discussion performance"""
    
    def __init__(self, vocab_size=10000, embedding_dim=128, hidden_dim=256):
        super(GD_Analyzer, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.leadership_score = nn.Linear(hidden_dim * 2, 1)
        self.communication_score = nn.Linear(hidden_dim * 2, 1)
        self.logic_score = nn.Linear(hidden_dim * 2, 1)
        self.confidence_score = nn.Linear(hidden_dim * 2, 1)
        self.vocabulary_score = nn.Linear(hidden_dim * 2, 1)
        self.team_behavior_score = nn.Linear(hidden_dim * 2, 1)
        
    def forward(self, transcript):
        embedded = self.embedding(transcript)
        lstm_out, _ = self.lstm(embedded)
        last_hidden = lstm_out[:, -1, :]
        
        scores = {
            'leadership': torch.sigmoid(self.leadership_score(last_hidden)) * 100,
            'communication': torch.sigmoid(self.communication_score(last_hidden)) * 100,
            'logic': torch.sigmoid(self.logic_score(last_hidden)) * 100,
            'confidence': torch.sigmoid(self.confidence_score(last_hidden)) * 100,
            'vocabulary': torch.sigmoid(self.vocabulary_score(last_hidden)) * 100,
            'team_behavior': torch.sigmoid(self.team_behavior_score(last_hidden)) * 100
        }
        
        return scores


class CompanyQuestionGenerator(nn.Module):
    """Generate company-specific interview questions"""
    
    def __init__(self, vocab_size=10000, embedding_dim=128, hidden_dim=256, num_companies=7):
        super(CompanyQuestionGenerator, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.company_encoder = nn.Embedding(num_companies, embedding_dim)
        self.question_decoder = nn.LSTM(hidden_dim * 2 + embedding_dim, hidden_dim, batch_first=True)
        self.question_output = nn.Linear(hidden_dim, vocab_size)
        
    def forward(self, company_id, max_length=50):
        # Encode company
        company_emb = self.company_encoder(company_id)
        
        # Generate question (simplified - in practice would use proper decoder)
        batch_size = company_id.shape[0]
        hidden = torch.zeros(1, batch_size, self.question_decoder.hidden_size)
        cell = torch.zeros(1, batch_size, self.question_decoder.hidden_size)
        
        # This is a simplified version - full implementation would use teacher forcing
        return company_emb  # Placeholder


# Utility functions for text preprocessing
def create_vocab(texts: List[str], max_vocab_size=10000):
    """Create vocabulary from texts"""
    word_counts = {}
    for text in texts:
        words = re.findall(r'\b\w+\b', text.lower())
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
    
    # Sort by frequency
    sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
    vocab = {word: idx + 1 for idx, (word, _) in enumerate(sorted_words[:max_vocab_size])}
    vocab['<PAD>'] = 0
    vocab['<UNK>'] = len(vocab)
    
    return vocab


def text_to_sequence(text: str, vocab: Dict[str, int], max_length=200):
    """Convert text to sequence of token IDs"""
    words = re.findall(r'\b\w+\b', text.lower())
    sequence = [vocab.get(word, vocab['<UNK>']) for word in words[:max_length]]
    # Pad or truncate
    if len(sequence) < max_length:
        sequence.extend([vocab['<PAD>']] * (max_length - len(sequence)))
    return sequence[:max_length]

