"""
Synthetic data generation for training models
"""

import random
import numpy as np
from typing import List, Dict


def generate_synthetic_nlp_data(num_samples=1000) -> Dict:
    """Generate synthetic NLP training data"""
    
    # Common technical terms
    tech_terms = [
        'python', 'java', 'javascript', 'react', 'node.js', 'sql', 'mongodb',
        'postgresql', 'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum',
        'machine learning', 'deep learning', 'neural networks', 'api', 'rest',
        'microservices', 'cloud computing', 'devops', 'ci/cd', 'testing'
    ]
    
    # Common resume sections
    resume_templates = [
        "Software Engineer with experience in {tech}. Worked on projects involving {tech2} and {tech3}. Strong background in {tech4}.",
        "Computer Science graduate specializing in {tech}. Developed applications using {tech2}, {tech3}. Proficient in {tech4}, {tech5}.",
        "Full-stack developer with expertise in {tech}, {tech2}. Built scalable systems using {tech3}. Knowledge of {tech4}."
    ]
    
    # Job description templates
    jd_templates = [
        "We are looking for a {tech} developer with experience in {tech2}. Must have knowledge of {tech3}, {tech4}.",
        "Position requires expertise in {tech}, {tech2}. Familiarity with {tech3} is preferred. Experience with {tech4} is a plus.",
        "Seeking candidate with strong background in {tech}. Should be proficient in {tech2}, {tech3}. Knowledge of {tech4} required."
    ]
    
    # Answer templates
    answer_templates = [
        "I have experience with {tech} through my projects. For example, I used {tech} to build a system that {description}.",
        "In my previous role, I worked extensively with {tech}. This involved {description}. I learned {concept} which helped me understand {tech2} better.",
        "I'm familiar with {tech} and have applied it in several projects. One instance was when I {description}. This taught me {concept}."
    ]
    
    resumes = []
    jds = []
    answers = []
    
    for i in range(num_samples):
        # Generate resume
        techs = random.sample(tech_terms, 5)
        resume = random.choice(resume_templates).format(
            tech=techs[0], tech2=techs[1], tech3=techs[2], 
            tech4=techs[3], tech5=techs[4] if len(techs) > 4 else techs[0]
        )
        resumes.append(resume)
        
        # Generate JD
        jd_techs = random.sample(tech_terms, 4)
        jd = random.choice(jd_templates).format(
            tech=jd_techs[0], tech2=jd_techs[1], tech3=jd_techs[2], tech4=jd_techs[3]
        )
        jds.append(jd)
        
        # Generate answer
        answer_techs = random.sample(tech_terms, 2)
        answer = random.choice(answer_templates).format(
            tech=answer_techs[0],
            tech2=answer_techs[1] if len(answer_techs) > 1 else answer_techs[0],
            description=f"implemented a feature that improved performance by {random.randint(10, 50)}%",
            concept=random.choice(['scalability', 'optimization', 'best practices', 'design patterns'])
        )
        answers.append(answer)
    
    return {
        'resumes': resumes,
        'jds': jds,
        'answers': answers
    }


def generate_synthetic_audio_features(num_samples=1000, feature_dim=193) -> np.ndarray:
    """Generate synthetic audio features"""
    # Simulate MFCC, chroma, mel features
    features = np.random.rand(num_samples, feature_dim).astype(np.float32)
    
    # Normalize to realistic ranges
    # MFCC features typically range from -50 to 50
    features[:, :13] = (features[:, :13] - 0.5) * 100
    
    # Chroma features range from 0 to 1
    features[:, 13:25] = features[:, 13:25]
    
    # Mel features are positive
    features[:, 25:45] = features[:, 25:45] * 10
    
    return features


def generate_synthetic_emotion_images(num_samples=1000, img_size=48) -> np.ndarray:
    """Generate synthetic emotion images (simulates FER2013)"""
    images = np.random.rand(num_samples, 1, img_size, img_size).astype(np.float32)
    # Normalize
    images = (images - 0.5) / 0.5
    return images


def generate_synthetic_personality_data(num_samples=200) -> Dict:
    """Generate synthetic personality assessment data"""
    personalities = []
    
    for i in range(num_samples):
        # 4 dimensions, each -1 to 1
        traits = np.random.rand(4) * 2 - 1
        personalities.append(traits)
    
    return {
        'traits': np.array(personalities),
        'labels': ['introvert_extrovert', 'thinker_feeler', 'logical_creative', 'planner_spontaneous']
    }


def generate_synthetic_placement_data(num_samples=1000) -> Dict:
    """Generate synthetic placement probability data"""
    features = []
    labels = []
    
    for i in range(num_samples):
        # Generate features
        resume_score = np.random.rand() * 100
        jd_score = np.random.rand() * 100
        technical_score = np.random.rand() * 100
        hr_score = np.random.rand() * 100
        gd_score = np.random.rand() * 100
        emotion_score = np.random.rand() * 100
        voice_score = np.random.rand() * 100
        personality = np.random.rand(4) * 2 - 1
        
        feature_vector = np.array([
            resume_score, jd_score, technical_score, hr_score, gd_score,
            emotion_score, voice_score,
            personality[0], personality[1], personality[2], personality[3]
        ])
        
        # Calculate probabilities (weighted combination)
        weights = np.array([0.15, 0.15, 0.35, 0.25, 0.05, 0.02, 0.02, 0.01, 0.01, 0.01, 0.01])
        base_score = np.dot(feature_vector, weights)
        
        prob_30 = max(0, min(100, base_score - 20 + np.random.randn() * 5))
        prob_60 = max(0, min(100, base_score - 5 + np.random.randn() * 5))
        prob_90 = max(0, min(100, base_score + 10 + np.random.randn() * 5))
        
        features.append(feature_vector)
        labels.append([prob_30, prob_60, prob_90])
    
    return {
        'features': np.array(features),
        'labels': np.array(labels)
    }

