"""
Synthetic data generation for training models
"""

import random
import numpy as np
from typing import List, Dict


def generate_synthetic_nlp_data(num_samples=1000) -> Dict:
    """Generate synthetic NLP training data with correlated labels"""
    
    # Common technical terms
    tech_terms = [
        'python', 'java', 'javascript', 'react', 'node.js', 'sql', 'mongodb',
        'postgresql', 'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum',
        'machine learning', 'deep learning', 'neural networks', 'api', 'rest',
        'microservices', 'cloud computing', 'devops', 'ci/cd', 'testing'
    ]
    
    # Templates with associated quality scores
    
    # Resumes
    resume_good = [
        "Senior Software Engineer with 8 years of experience in {tech}, {tech2}. Architected scalable microservices using {tech3}. Lead a team of developers.",
        "Principal Developer specialized in {tech}. Expert in {tech2}, {tech3}, and {tech4}. Published papers on {tech5}. 10+ years experience."
    ]
    resume_avg = [
        "Software Developer with 2 years experience in {tech}. Worked on {tech2} projects. Familiar with {tech3}.",
        "Junior Developer looking for opportunities in {tech}. Completed internship using {tech2}."
    ]
    
    # Answers
    answer_good = [
        "I have extensive experience with {tech}. In my last project, I implemented a {tech2} based solution that improved latency by 40%. I also ensured code quality using {tech3}.",
        "My approach to {tech} involves understanding the underlying architecture. For instance, when using {tech2}, I optimized the database queries using {tech3} which resulted in significant performance gains."
    ]
    answer_bad = [
        "I know {tech}.",
        "I used {tech} once.",
        "It is good.",
        "maybe {tech} is okay."
    ]
    
    resumes = []
    resume_labels = [] # [skills_score (0-1), exp_score (0-1), edu_score (0-1)] + 99 skill binary flags
    
    answers = []
    answer_scores = [] # 0-100
    
    jds = []

    for i in range(num_samples):
        # --- Generate Resume Data ---
        techs = random.sample(tech_terms, 5)
        
        if random.random() > 0.5:
            # Good/Senior Resume
            text = random.choice(resume_good).format(
                tech=techs[0], tech2=techs[1], tech3=techs[2], tech4=techs[3], tech5=techs[4]
            )
            # High scores
            exp_score = random.uniform(0.8, 1.0)
            edu_score = random.uniform(0.7, 1.0)
            skills = np.zeros(100)
            skills[:10] = 1 # Fake "detected skills"
            
            label = np.concatenate([skills, [exp_score], [edu_score]])
        else:
            # Avg/Junior Resume
            text = random.choice(resume_avg).format(
                tech=techs[0], tech2=techs[1], tech3=techs[2]
            )
            # Lower scores
            exp_score = random.uniform(0.2, 0.5)
            edu_score = random.uniform(0.3, 0.6)
            skills = np.zeros(100)
            skills[:3] = 1
            
            label = np.concatenate([skills, [exp_score], [edu_score]])
            
        resumes.append(text)
        resume_labels.append(label)

        # --- Generate Answer Data ---
        if random.random() > 0.5:
            # Good Answer
            ans_techs = random.sample(tech_terms, 3)
            ans_text = random.choice(answer_good).format(
                tech=ans_techs[0], tech2=ans_techs[1], tech3=ans_techs[2]
            )
            ans_score = random.uniform(80, 100)
        else:
            # Bad Answer
            ans_tech = random.choice(tech_terms)
            ans_text = random.choice(answer_bad).format(tech=ans_tech)
            ans_score = random.uniform(10, 40)
            
        answers.append(ans_text)
        answer_scores.append([ans_score])
        
        # --- Generate JD (Placeholder) ---
        jds.append(f"Looking for {techs[0]} developer.")

    return {
        'resumes': resumes,
        'resume_labels': np.array(resume_labels),
        'jds': jds,
        'answers': answers,
        'answer_scores': np.array(answer_scores)
    }



def generate_synthetic_voice_data(num_samples=1000, feature_dim=193) -> Dict:
    """Generate correlated synthetic voice data"""
    # Create features where specific indices correlate with specific labels
    features = np.random.rand(num_samples, feature_dim).astype(np.float32)
    
    # Define correlations
    # Feature 0-9: Fluency (Higher is better)
    # Feature 10-19: Grammar
    # Feature 20-29: Tone
    
    # We'll make the "signal" features stronger than the noise
    fluency_signal = np.mean(features[:, 0:10], axis=1) # 0-1
    grammar_signal = np.mean(features[:, 10:20], axis=1)
    tone_signal = np.mean(features[:, 20:30], axis=1)
    
    labels = {
        'fluency': fluency_signal * 100, # 0-100
        'grammar': grammar_signal * 100,
        'tone': tone_signal * 100,
        'pace': np.random.normal(70, 10, num_samples), # Normal distribution around 70
        'filler_words': (1.0 - fluency_signal) * 100, # Inverse of fluency
        'clarity': (fluency_signal + grammar_signal) / 2 * 100
    }
    
    return {
        'features': features,
        'labels': labels
    }


def generate_synthetic_emotion_images(num_samples=1000, img_size=48) -> Dict:
    """Generate synthetic emotion images with simple shapes"""
    images = np.zeros((num_samples, 1, img_size, img_size), dtype=np.float32)
    labels = np.zeros(num_samples, dtype=np.longlong)
    
    # 0: Angry (Fill top half)
    # 1: Disgust (Fill bottom half)
    # 2: Fear (Fill left half)
    # 3: Happy (Center square)
    # 4: Sad (Corner squares)
    # 5: Surprise (Circle/Ring approx)
    # 6: Neutral (Empty/Noise)
    
    for i in range(num_samples):
        label = np.random.randint(0, 7)
        noise = np.random.randn(img_size, img_size) * 0.1
        
        if label == 0: # Angry
            images[i, 0, :img_size//2, :] = 1.0
        elif label == 1: # Disgust
            images[i, 0, img_size//2:, :] = 1.0
        elif label == 2: # Fear
            images[i, 0, :, :img_size//2] = 1.0
        elif label == 3: # Happy (Center)
            images[i, 0, img_size//4:3*img_size//4, img_size//4:3*img_size//4] = 1.0
        elif label == 4: # Sad (Corners)
            images[i, 0, :10, :10] = 1.0
            images[i, 0, -10:, -10:] = 1.0
        elif label == 5: # Surprise (Edges)
            images[i, 0, :, 0] = 1.0
            images[i, 0, :, -1] = 1.0
            
        # Add noise
        images[i, 0] += noise
        labels[i] = label
        
    return {
        'images': images,
        'labels': labels
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
        
        # Less noise for better training signal
        prob_30 = max(0, min(100, base_score - 20 + np.random.randn() * 2)) 
        prob_60 = max(0, min(100, base_score - 5 + np.random.randn() * 2))
        prob_90 = max(0, min(100, base_score + 10 + np.random.randn() * 2))
        
        features.append(feature_vector)
        labels.append([prob_30, prob_60, prob_90])
    
    return {
        'features': np.array(features),
        'labels': np.array(labels)
    }

