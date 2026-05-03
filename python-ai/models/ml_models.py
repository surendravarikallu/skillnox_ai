"""
ML Models for Placement Probability Prediction
Improved PlacementPredictor with deeper architecture and residual connections.
Enhanced SkillGapAnalyzer with LLM-powered extraction support.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Dict, List


class PlacementPredictor(nn.Module):
    """Improved neural network for predicting placement probability.
    
    Upgrades over previous version:
    - Deeper architecture with residual connection
    - Layer normalization for training stability
    - Separate feature processing paths for scores vs personality
    - Calibrated sigmoid output with temperature scaling
    """

    def __init__(self, input_features=10):
        super(PlacementPredictor, self).__init__()

        # Score features path (first 7 inputs: resume, jd, tech, hr, gd, emotion, voice)
        self.score_fc = nn.Sequential(
            nn.Linear(7, 64),
            nn.LayerNorm(64),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.GELU(),
        )

        # Personality features path (last 3 inputs)
        self.personality_fc = nn.Sequential(
            nn.Linear(3, 16),
            nn.LayerNorm(16),
            nn.GELU(),
            nn.Linear(16, 16),
            nn.GELU(),
        )

        # Combined processing with residual
        self.combined_fc1 = nn.Linear(48, 64)  # 32 + 16 = 48
        self.ln1 = nn.LayerNorm(64)
        self.combined_fc2 = nn.Linear(64, 64)
        self.ln2 = nn.LayerNorm(64)
        self.combined_fc3 = nn.Linear(64, 32)

        self.dropout = nn.Dropout(0.25)

        # Output heads for different time horizons
        self.prob_30_days = nn.Linear(32, 1)
        self.prob_60_days = nn.Linear(32, 1)
        self.prob_90_days = nn.Linear(32, 1)

        # Learnable temperature for calibration
        self.temperature = nn.Parameter(torch.ones(1))

    def forward(self, x):
        # Split inputs into score features and personality features
        score_features = x[:, :7]
        personality_features = x[:, 7:10]

        # Process separately
        score_out = self.score_fc(score_features)
        personality_out = self.personality_fc(personality_features)

        # Combine
        combined = torch.cat([score_out, personality_out], dim=1)
        h = F.gelu(self.ln1(self.combined_fc1(combined)))
        h = self.dropout(h)

        # Residual connection
        residual = h
        h = F.gelu(self.ln2(self.combined_fc2(h)))
        h = h + residual  # Skip connection
        h = self.dropout(h)

        h = F.gelu(self.combined_fc3(h))

        # Temperature-scaled sigmoid for calibrated probabilities
        t = self.temperature.clamp(min=0.1)
        prob_30 = torch.sigmoid(self.prob_30_days(h) / t) * 100
        prob_60 = torch.sigmoid(self.prob_60_days(h) / t) * 100
        prob_90 = torch.sigmoid(self.prob_90_days(h) / t) * 100

        return {
            'probability_30_days': prob_30,
            'probability_60_days': prob_60,
            'probability_90_days': prob_90,
        }


class SkillGapAnalyzer:
    """Analyze skill gaps between resume and job description.
    
    Uses rule-based keyword matching as the fast path.
    LLM-powered extraction is handled upstream in inference_service.py.
    """

    def __init__(self):
        # Comprehensive technical skills database
        self.skill_categories = {
            'programming_languages': [
                'python', 'java', 'javascript', 'c++', 'c#', 'go', 'rust', 'kotlin', 'swift',
                'php', 'ruby', 'scala', 'r', 'matlab', 'perl', 'typescript', 'dart', 'lua',
            ],
            'web_technologies': [
                'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask',
                'spring', 'asp.net', 'laravel', 'next.js', 'nuxt.js', 'svelte', 'tailwind',
                'bootstrap', 'webpack', 'vite', 'graphql', 'rest api', 'websocket',
            ],
            'databases': [
                'mysql', 'postgresql', 'mongodb', 'redis', 'oracle', 'sql server', 'sqlite',
                'cassandra', 'elasticsearch', 'dynamodb', 'neo4j', 'supabase', 'firebase',
            ],
            'cloud_platforms': [
                'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins',
                'ci/cd', 'devops', 'cloudformation', 'ansible', 'helm', 'prometheus', 'grafana',
            ],
            'data_science': [
                'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy',
                'scikit-learn', 'data analysis', 'data visualization', 'nlp', 'computer vision',
                'llm', 'transformers', 'huggingface', 'langchain', 'rag',
            ],
            'mobile': [
                'android', 'ios', 'react native', 'flutter', 'xamarin', 'swift', 'kotlin',
                'expo', 'ionic',
            ],
            'soft_skills': [
                'communication', 'teamwork', 'leadership', 'problem solving', 'critical thinking',
                'time management', 'adaptability', 'collaboration', 'presentation',
            ],
            'tools': [
                'git', 'jira', 'confluence', 'slack', 'agile', 'scrum', 'kanban',
                'figma', 'postman', 'swagger', 'linux', 'bash',
            ],
        }

    def extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from text using keyword matching"""
        text_lower = text.lower()
        found_skills = []

        for category, skills in self.skill_categories.items():
            for skill in skills:
                if skill in text_lower:
                    found_skills.append(skill)

        return list(set(found_skills))

    def calculate_match_score(self, resume_skills: List[str], jd_skills: List[str]) -> float:
        """Calculate match score between resume and JD skills"""
        if not jd_skills:
            return 0.0

        resume_lower = set(s.lower() for s in resume_skills)
        jd_lower = set(s.lower() for s in jd_skills)
        matched = resume_lower & jd_lower

        return min(100.0, (len(matched) / len(jd_lower)) * 100)

    def find_skill_gaps(self, resume_skills: List[str], jd_skills: List[str]) -> List[str]:
        """Find skills in JD but not in resume"""
        resume_set = set(s.lower() for s in resume_skills)
        jd_set = set(s.lower() for s in jd_skills)
        return list(jd_set - resume_set)

    def analyze(self, resume_text: str, jd_text: str) -> Dict:
        """Complete skill gap analysis"""
        resume_skills = self.extract_skills_from_text(resume_text)
        jd_skills = self.extract_skills_from_text(jd_text)

        match_score = self.calculate_match_score(resume_skills, jd_skills)
        skill_gaps = self.find_skill_gaps(resume_skills, jd_skills)

        return {
            'resume_skills': resume_skills,
            'required_skills': jd_skills,
            'matched_skills': list(set(s.lower() for s in resume_skills) & set(s.lower() for s in jd_skills)),
            'match_score': match_score,
            'skill_gaps': skill_gaps,
            'coverage_percentage': match_score,
        }


class ResumeScorer:
    """Score resume quality using heuristic analysis"""

    def __init__(self):
        self.quality_keywords = {
            'grammar': ['professional', 'achieved', 'implemented', 'developed', 'designed', 'led',
                        'optimized', 'delivered', 'managed', 'spearheaded', 'architected'],
            'structure': ['education', 'experience', 'skills', 'projects', 'achievements',
                         'certifications', 'summary', 'objective', 'awards'],
            'technical_depth': ['algorithm', 'architecture', 'optimization', 'scalability', 'performance',
                               'distributed', 'microservices', 'deployment', 'testing', 'security'],
        }

    def score_resume(self, resume_text: str) -> Dict:
        """Score resume on multiple dimensions"""
        text_lower = resume_text.lower()
        word_count = len(resume_text.split())

        # Grammar and professionalism
        grammar_score = 60
        action_words_found = sum(1 for w in self.quality_keywords['grammar'] if w in text_lower)
        grammar_score += min(25, action_words_found * 5)
        if word_count > 200:
            grammar_score += 5
        if word_count > 400:
            grammar_score += 5

        # Structure score
        structure_score = 0
        for section in self.quality_keywords['structure']:
            if section in text_lower:
                structure_score += 12
        structure_score = min(100, structure_score)

        # Technical depth
        technical_score = 40
        tech_found = sum(1 for w in self.quality_keywords['technical_depth'] if w in text_lower)
        technical_score += min(50, tech_found * 10)
        technical_score = min(100, technical_score)

        # Overall weighted score
        overall_score = (
            grammar_score * 0.3 +
            structure_score * 0.3 +
            technical_score * 0.4
        )

        return {
            'grammar_score': grammar_score,
            'structure_score': structure_score,
            'technical_score': technical_score,
            'overall_score': round(overall_score, 1),
        }
