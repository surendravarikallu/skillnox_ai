"""
ML Models for Placement Probability Prediction
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Dict, List, Tuple


class PlacementPredictor(nn.Module):
    """Neural network for predicting placement probability"""
    
    def __init__(self, input_features=10):
        super(PlacementPredictor, self).__init__()
        
        # Input features:
        # 0: resume_score
        # 1: jd_match_score
        # 2: technical_score
        # 3: hr_score
        # 4: gd_score
        # 5: emotion_score
        # 6: voice_score
        # 7: personality_introvert_extrovert
        # 8: personality_thinker_feeler
        # 9: personality_logical_creative
        # 10: personality_planner_spontaneous
        
        self.fc1 = nn.Linear(input_features, 128)
        self.bn1 = nn.BatchNorm1d(128)
        self.fc2 = nn.Linear(128, 64)
        self.bn2 = nn.BatchNorm1d(64)
        self.fc3 = nn.Linear(64, 32)
        
        # Output heads for different time horizons
        self.prob_30_days = nn.Linear(32, 1)
        self.prob_60_days = nn.Linear(32, 1)
        self.prob_90_days = nn.Linear(32, 1)
        
        self.dropout = nn.Dropout(0.3)
        
    def forward(self, x):
        x = F.relu(self.bn1(self.fc1(x)))
        x = self.dropout(x)
        x = F.relu(self.bn2(self.fc2(x)))
        x = self.dropout(x)
        x = F.relu(self.fc3(x))
        
        prob_30 = torch.sigmoid(self.prob_30_days(x)) * 100
        prob_60 = torch.sigmoid(self.prob_60_days(x)) * 100
        prob_90 = torch.sigmoid(self.prob_90_days(x)) * 100
        
        return {
            'probability_30_days': prob_30,
            'probability_60_days': prob_60,
            'probability_90_days': prob_90
        }


class SkillGapAnalyzer:
    """Analyze skill gaps between resume and job description"""
    
    def __init__(self):
        # Common technical skills database
        self.skill_categories = {
            'programming_languages': [
                'python', 'java', 'javascript', 'c++', 'c#', 'go', 'rust', 'kotlin', 'swift',
                'php', 'ruby', 'scala', 'r', 'matlab', 'perl', 'typescript'
            ],
            'web_technologies': [
                'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask',
                'spring', 'asp.net', 'laravel', 'next.js', 'nuxt.js'
            ],
            'databases': [
                'mysql', 'postgresql', 'mongodb', 'redis', 'oracle', 'sql server', 'sqlite',
                'cassandra', 'elasticsearch', 'dynamodb', 'neo4j'
            ],
            'cloud_platforms': [
                'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins',
                'ci/cd', 'devops', 'cloudformation'
            ],
            'data_science': [
                'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy',
                'scikit-learn', 'data analysis', 'data visualization', 'nlp', 'computer vision'
            ],
            'mobile': [
                'android', 'ios', 'react native', 'flutter', 'xamarin', 'swift', 'kotlin'
            ],
            'tools': [
                'git', 'jira', 'confluence', 'slack', 'agile', 'scrum', 'kanban'
            ]
        }
    
    def extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from text (resume or JD)"""
        text_lower = text.lower()
        found_skills = []
        
        for category, skills in self.skill_categories.items():
            for skill in skills:
                if skill in text_lower:
                    found_skills.append(skill)
        
        return list(set(found_skills))  # Remove duplicates
    
    def calculate_match_score(self, resume_skills: List[str], jd_skills: List[str]) -> float:
        """Calculate match score between resume and JD skills"""
        if not jd_skills:
            return 0.0
        
        matched_skills = set(resume_skills) & set(jd_skills)
        match_score = (len(matched_skills) / len(jd_skills)) * 100
        
        return min(100.0, match_score)
    
    def find_skill_gaps(self, resume_skills: List[str], jd_skills: List[str]) -> List[str]:
        """Find skills in JD but not in resume"""
        resume_skills_set = set(skill.lower() for skill in resume_skills)
        jd_skills_set = set(skill.lower() for skill in jd_skills)
        
        gaps = jd_skills_set - resume_skills_set
        return list(gaps)
    
    def analyze(self, resume_text: str, jd_text: str) -> Dict:
        """Complete skill gap analysis"""
        resume_skills = self.extract_skills_from_text(resume_text)
        jd_skills = self.extract_skills_from_text(jd_text)
        
        match_score = self.calculate_match_score(resume_skills, jd_skills)
        skill_gaps = self.find_skill_gaps(resume_skills, jd_skills)
        
        return {
            'resume_skills': resume_skills,
            'required_skills': jd_skills,
            'matched_skills': list(set(resume_skills) & set(jd_skills)),
            'match_score': match_score,
            'skill_gaps': skill_gaps,
            'coverage_percentage': match_score
        }


class ResumeScorer:
    """Score resume quality"""
    
    def __init__(self):
        self.quality_keywords = {
            'grammar': ['professional', 'achieved', 'implemented', 'developed', 'designed', 'led'],
            'structure': ['education', 'experience', 'skills', 'projects', 'achievements'],
            'technical_depth': ['algorithm', 'architecture', 'optimization', 'scalability', 'performance']
        }
    
    def score_resume(self, resume_text: str) -> Dict:
        """Score resume on multiple dimensions"""
        text_lower = resume_text.lower()
        
        # Grammar and professionalism (simple heuristic)
        grammar_score = 70  # Base score
        if any(word in text_lower for word in self.quality_keywords['grammar']):
            grammar_score += 10
        if len(resume_text.split()) > 200:
            grammar_score += 5
        
        # Structure score
        structure_score = 0
        for section in self.quality_keywords['structure']:
            if section in text_lower:
                structure_score += 15
        structure_score = min(100, structure_score)
        
        # Technical depth
        technical_score = 50
        for keyword in self.quality_keywords['technical_depth']:
            if keyword in text_lower:
                technical_score += 10
        technical_score = min(100, technical_score)
        
        # Overall score (weighted average)
        overall_score = (
            grammar_score * 0.3 +
            structure_score * 0.3 +
            technical_score * 0.4
        )
        
        return {
            'grammar_score': grammar_score,
            'structure_score': structure_score,
            'technical_score': technical_score,
            'overall_score': overall_score
        }

