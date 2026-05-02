"""
Extended Dataset Generator for Skillnox AI Fine-Tuning
Generates 20,000-30,000 training examples for interview preparation
Covers: Resume Analysis, Answer Evaluation, Question Generation
Includes: Indian IT companies (TCS, Infosys, Wipro, Accenture, etc.)
"""

import json
import random
import os
from pathlib import Path
from typing import List, Dict

# ---------------------------------------------------------------------------
# Data pools for generation
# ---------------------------------------------------------------------------

TECH_SKILLS = [
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust",
    "Ruby", "PHP", "Swift", "Kotlin", "Scala", "Elixir", "Dart",
    "React", "Angular", "Vue.js", "Next.js", "Svelte", "Django", "Flask",
    "FastAPI", "Spring Boot", "Node.js", "Express.js", ".NET Core", "Rails",
    "Laravel", "ASP.NET", "GraphQL", "REST API", "gRPC",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Cassandra", "DynamoDB",
    "Elasticsearch", "SQLite", "MariaDB", "CockroachDB", "Neo4j",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible",
    "Jenkins", "GitHub Actions", "GitLab CI", "ArgoCD", "Helm",
    "Kafka", "RabbitMQ", "SQS", "Celery", "BullMQ", "NATS",
    "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "OpenCV",
    "BERT", "Transformers", "LangChain", "FAISS", "MLflow", "Airflow",
    "Spark", "Hadoop", "Flink", "Hive", "Redshift", "BigQuery", "Snowflake",
    "Prometheus", "Grafana", "ELK Stack", "Datadog", "Splunk",
    "Linux", "Git", "Nginx", "Apache", "Vault", "Consul",
    "Selenium", "Cypress", "Playwright", "Jest", "JUnit", "Postman",
    "HTML", "CSS", "Tailwind", "Bootstrap", "SCSS", "Figma",
]

ROLES = [
    "Backend Developer", "Frontend Developer", "Full Stack Developer",
    "Data Engineer", "ML Engineer", "DevOps Engineer", "SRE Engineer",
    "Cloud Engineer", "Mobile Developer", "QA Automation Engineer",
    "Data Scientist", "AI Engineer", "Security Engineer", "Systems Engineer",
    "Software Engineer", "Platform Engineer", "Infrastructure Engineer",
    "iOS Developer", "Android Developer", "Embedded Systems Engineer",
]

INDIAN_COMPANIES = [
    "TCS", "Infosys", "Wipro", "HCL Technologies", "Tech Mahindra",
    "Accenture India", "Cognizant", "Capgemini India", "Mindtree", "Mphasis",
    "L&T Infotech", "Persistent Systems", "Zensar Technologies", "Hexaware",
    "NIIT Technologies", "Cyient", "Coforge", "Birlasoft",
]

GLOBAL_COMPANIES = [
    "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix",
    "Uber", "Airbnb", "Stripe", "Shopify", "Salesforce", "Adobe",
    "Oracle", "IBM", "SAP", "VMware", "Cisco", "Intel",
    "Goldman Sachs", "JP Morgan", "Morgan Stanley", "Deutsche Bank",
    "Flipkart", "Paytm", "Swiggy", "Zomato", "Razorpay", "PhonePe",
    "CRED", "Zerodha", "Freshworks", "Zoho", "Ola", "Dream11",
]

ALL_COMPANIES = INDIAN_COMPANIES + GLOBAL_COMPANIES

NAMES = [
    "Aarav Sharma", "Priya Patel", "Rohit Kumar", "Sneha Gupta", "Vikram Singh",
    "Ananya Reddy", "Karan Mehta", "Divya Nair", "Arjun Verma", "Meera Iyer",
    "Rahul Joshi", "Pooja Kapoor", "Amit Tiwari", "Neha Mishra", "Saurabh Rao",
    "Ishita Das", "Nikhil Agarwal", "Riya Malhotra", "Aditya Chauhan", "Kavya Bhat",
    "John Smith", "Emily Johnson", "Michael Brown", "Sarah Williams", "David Lee",
    "Jessica Taylor", "Chris Anderson", "Laura Martinez", "Daniel Garcia", "Rachel Kim",
    "Alex Morgan", "Sophia Chen", "James Wilson", "Olivia Jones", "Ryan Park",
    "Hannah Davis", "Kevin Patel", "Emma Thompson", "Brian Harris", "Natalie Cruz",
    "Farhan Ali", "Deepak Yadav", "Harshita Jain", "Manish Dubey", "Swati Pillai",
    "Rajesh Nair", "Tanya Saxena", "Vivek Choudhary", "Shruti Bhatt", "Gaurav Pandey",
]

PROJECTS = {
    "backend": [
        "Order processing API", "Payment gateway integration", "Real-time notification service",
        "Inventory management system", "Authentication microservice", "Rate limiting service",
        "Event-driven audit logger", "Document processing pipeline", "Search indexing service",
        "Task scheduling engine", "Email campaign scheduler", "Webhook delivery system",
    ],
    "frontend": [
        "Analytics dashboard", "E-commerce storefront", "Customer onboarding portal",
        "Admin management panel", "Real-time chat interface", "Video streaming dashboard",
        "Social media feed UI", "Project management board", "HR management dashboard",
        "Interactive data visualization tool", "Design system component library",
    ],
    "data": [
        "ETL pipeline for marketing analytics", "Real-time clickstream ingestion",
        "Customer segmentation model", "Fraud detection system", "Recommendation engine",
        "Sales forecasting model", "Churn prediction pipeline", "A/B testing framework",
        "Data quality monitoring system", "Feature store implementation",
    ],
    "devops": [
        "CI/CD pipeline automation", "Multi-region deployment system",
        "Infrastructure as Code migration", "Container orchestration setup",
        "Centralized logging pipeline", "Service mesh rollout",
        "Secret management automation", "Disaster recovery automation",
    ],
    "mobile": [
        "Fitness tracking app", "Food delivery app", "Chat messaging app",
        "Health monitoring app", "E-commerce mobile app", "Travel planner app",
        "Banking app", "Social networking app",
    ],
}

DIFFICULTY_LEVELS = ["easy", "medium", "hard"]

# ---------------------------------------------------------------------------
# Technical question templates by topic
# ---------------------------------------------------------------------------

TECHNICAL_QUESTIONS = {
    "dsa": [
        ("What is the difference between an array and a linked list?", "easy"),
        ("Explain time complexity of common sorting algorithms.", "easy"),
        ("What is a hash table and how does collision resolution work?", "medium"),
        ("Explain the difference between BFS and DFS with use cases.", "medium"),
        ("How would you design an LRU cache from scratch?", "hard"),
        ("Explain how you would find the shortest path in a weighted graph.", "hard"),
        ("What is dynamic programming? Give an example problem.", "medium"),
        ("Explain the concept of a balanced BST and its advantages.", "medium"),
        ("How does a priority queue work internally?", "medium"),
        ("What is the time complexity of operations in a trie?", "hard"),
        ("Explain the sliding window technique with an example.", "medium"),
        ("How would you detect a cycle in a linked list?", "easy"),
        ("What is the difference between a stack and a queue?", "easy"),
        ("Explain merge sort and its space complexity.", "medium"),
        ("How would you find the kth largest element efficiently?", "hard"),
    ],
    "system_design": [
        ("How would you design a URL shortening service?", "medium"),
        ("Design a real-time chat application architecture.", "hard"),
        ("How would you design a rate limiter?", "medium"),
        ("Design a distributed file storage system.", "hard"),
        ("How would you design a notification service?", "medium"),
        ("Design a scalable e-commerce system.", "hard"),
        ("How would you design a search autocomplete system?", "hard"),
        ("Design a job scheduling system.", "medium"),
        ("How would you design a social media news feed?", "hard"),
        ("Design a video streaming platform architecture.", "hard"),
        ("How would you design a load balancer?", "medium"),
        ("Design a distributed caching system.", "hard"),
        ("How would you design a payment processing system?", "hard"),
        ("Design a monitoring and alerting system.", "medium"),
        ("How would you handle database sharding?", "hard"),
    ],
    "dbms": [
        ("What is normalization? Explain up to 3NF.", "easy"),
        ("What is the difference between SQL and NoSQL databases?", "easy"),
        ("Explain ACID properties in databases.", "medium"),
        ("What are indexes and how do they improve query performance?", "medium"),
        ("Explain the difference between optimistic and pessimistic locking.", "hard"),
        ("What is database sharding and when should you use it?", "hard"),
        ("Explain the CAP theorem with practical examples.", "hard"),
        ("What are stored procedures and when should you use them?", "medium"),
        ("Explain the difference between INNER JOIN and LEFT JOIN.", "easy"),
        ("What is connection pooling and why is it important?", "medium"),
    ],
    "os": [
        ("What is the difference between a process and a thread?", "easy"),
        ("Explain deadlock and how to prevent it.", "medium"),
        ("What is virtual memory and how does it work?", "medium"),
        ("Explain the difference between mutex and semaphore.", "medium"),
        ("What is context switching and what causes it?", "easy"),
        ("Explain different process scheduling algorithms.", "medium"),
        ("What is thrashing in operating systems?", "hard"),
        ("Explain memory management techniques.", "medium"),
        ("What are system calls? Give examples.", "easy"),
        ("Explain the producer-consumer problem.", "medium"),
    ],
    "networking": [
        ("Explain the TCP/IP model layers.", "easy"),
        ("What is the difference between TCP and UDP?", "easy"),
        ("How does HTTPS work?", "medium"),
        ("Explain DNS resolution step by step.", "medium"),
        ("What is a CDN and how does it work?", "medium"),
        ("Explain the difference between HTTP/1.1 and HTTP/2.", "medium"),
        ("What are WebSockets and when would you use them?", "medium"),
        ("Explain how load balancing works.", "medium"),
        ("What is a reverse proxy?", "easy"),
        ("Explain the concept of API gateway.", "medium"),
    ],
    "oop": [
        ("Explain the four pillars of OOP.", "easy"),
        ("What is the difference between abstraction and encapsulation?", "easy"),
        ("Explain SOLID principles with examples.", "medium"),
        ("What are design patterns? Name common ones.", "medium"),
        ("Explain the difference between composition and inheritance.", "medium"),
        ("What is the strategy pattern and when would you use it?", "hard"),
        ("Explain dependency injection with an example.", "medium"),
        ("What is the observer pattern?", "medium"),
        ("Explain the factory pattern.", "medium"),
        ("What is polymorphism? Give a real-world example.", "easy"),
    ],
}

HR_QUESTIONS = [
    ("Tell me about yourself.", "easy"),
    ("What are your strengths and weaknesses?", "easy"),
    ("Why do you want to work for our company?", "medium"),
    ("Where do you see yourself in 5 years?", "easy"),
    ("Why should we hire you?", "medium"),
    ("Describe your ideal work environment.", "easy"),
    ("How do you handle pressure and stress?", "medium"),
    ("What motivates you?", "easy"),
    ("Tell me about a time you failed.", "medium"),
    ("How do you handle criticism?", "medium"),
    ("What are your salary expectations?", "medium"),
    ("Do you prefer working alone or in a team?", "easy"),
    ("How do you prioritize your work?", "medium"),
    ("What do you know about our company culture?", "medium"),
    ("Describe a situation where you showed leadership.", "medium"),
    ("How do you stay updated with industry trends?", "easy"),
    ("What would you do in the first 90 days of this job?", "hard"),
    ("How do you handle disagreements with your manager?", "hard"),
    ("What makes you unique compared to other candidates?", "medium"),
    ("Describe a time you went above and beyond.", "medium"),
]

BEHAVIORAL_QUESTIONS = [
    ("Tell me about a time you worked in a team to achieve a goal.", "easy"),
    ("Describe a challenging situation and how you handled it.", "medium"),
    ("Give an example of leading a team through a difficult project.", "hard"),
    ("Tell me about a time you had a conflict with a coworker.", "medium"),
    ("Describe a situation where you had to make a quick decision.", "medium"),
    ("Tell me about a time you received constructive criticism.", "medium"),
    ("Give an example of how you handled a tight deadline.", "medium"),
    ("Describe a time you had to adapt to a major change.", "medium"),
    ("Tell me about your biggest professional achievement.", "medium"),
    ("Describe a time you had to convince others of your idea.", "hard"),
    ("Tell me about a time you took initiative without being asked.", "medium"),
    ("Describe a situation where you had to learn something quickly.", "medium"),
    ("Give an example of how you handled multiple priorities.", "medium"),
    ("Tell me about a time you made a mistake and how you fixed it.", "medium"),
    ("Describe a time you improved a process or workflow.", "medium"),
]


# ---------------------------------------------------------------------------
# Answer quality templates
# ---------------------------------------------------------------------------

def generate_answer_quality(score_range: str) -> Dict:
    """Generate answer characteristics based on quality level."""
    if score_range == "excellent":
        return {
            "score": random.randint(86, 98),
            "characteristics": [
                "provides specific examples", "includes metrics",
                "demonstrates deep understanding", "structured response",
                "covers edge cases", "mentions real experience",
            ],
            "feedback_template": "Excellent response with {detail}. {strength}.",
        }
    elif score_range == "good":
        return {
            "score": random.randint(71, 85),
            "characteristics": [
                "solid understanding", "relevant examples",
                "good structure", "could add more depth",
            ],
            "feedback_template": "Good answer with {detail}. Could improve by {suggestion}.",
        }
    elif score_range == "average":
        return {
            "score": random.randint(51, 70),
            "characteristics": [
                "correct but generic", "lacks depth",
                "missing examples", "surface-level understanding",
            ],
            "feedback_template": "Average answer. {weakness}. Needs {suggestion}.",
        }
    elif score_range == "poor":
        return {
            "score": random.randint(20, 50),
            "characteristics": [
                "vague", "incorrect details", "off-topic",
                "too brief", "no examples", "misunderstands concept",
            ],
            "feedback_template": "Below average. {weakness}. Must {suggestion}.",
        }
    else:  # edge case
        return {
            "score": random.randint(0, 19),
            "characteristics": [
                "blank", "irrelevant", "copied text",
                "single word", "nonsensical",
            ],
            "feedback_template": "Unacceptable response. {weakness}.",
        }


# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------

def generate_resume_analysis_example() -> Dict:
    """Generate one resume analysis training example."""
    name = random.choice(NAMES)
    role = random.choice(ROLES)
    num_skills = random.randint(3, 8)
    skills = random.sample(TECH_SKILLS, min(num_skills, len(TECH_SKILLS)))
    exp_years = random.choice([0, 1, 2, 3, 4, 5, 7, 10])

    # Pick projects
    project_category = random.choice(list(PROJECTS.keys()))
    num_projects = random.randint(1, 3)
    projects = random.sample(PROJECTS[project_category], min(num_projects, len(PROJECTS[project_category])))

    resume_text = f"{name}\n{role}\nSkills: {', '.join(skills)}\nExperience: {exp_years} years\nProjects: {', '.join(projects)}."

    # Optionally add JD
    has_jd = random.random() > 0.3
    jd_company = random.choice(ALL_COMPANIES) if has_jd else None
    jd_skills = random.sample(TECH_SKILLS, random.randint(3, 6)) if has_jd else None
    jd_text = f"Hiring {role} at {jd_company} with {', '.join(jd_skills)} experience." if has_jd else None

    # Calculate score based on skill overlap
    if has_jd and jd_skills:
        overlap = len(set(s.lower() for s in skills) & set(s.lower() for s in jd_skills))
        base_score = 55 + (overlap / len(jd_skills)) * 35 + random.randint(-5, 5)
    else:
        base_score = 60 + len(skills) * 3 + min(exp_years * 2, 15) + random.randint(-8, 8)
    score = max(40, min(98, int(base_score)))

    strengths = []
    if len(skills) >= 5:
        strengths.append("Diverse technical skill set")
    if exp_years >= 3:
        strengths.append(f"Solid {exp_years} years of experience")
    if len(projects) >= 2:
        strengths.append("Multiple relevant project experiences")
    strengths.append(f"Good {skills[0]} expertise" if skills else "Shows initiative")
    strengths = strengths[:3]

    suggestions = []
    if exp_years < 2:
        suggestions.append("Add more project experience or internships")
    suggestions.append("Include measurable impact metrics")
    suggestions.append("Add testing and CI/CD experience")
    suggestions = suggestions[:3]

    example = {
        "instruction": "Analyze the resume against the job description." if has_jd else "Evaluate this resume based on the overall tech job market.",
        "input": {"resume_text": resume_text},
        "output": {
            "score": score,
            "strengths": strengths,
            "suggestions": suggestions,
            "skills": skills[:6],
        },
    }
    if has_jd:
        example["input"]["jd_text"] = jd_text
    if has_jd:
        example["output"]["market_fit"] = f"{role} roles at {jd_company} and similar companies"
    else:
        example["output"]["market_fit"] = f"{role} roles in the tech industry"

    return example


def generate_answer_eval_example() -> Dict:
    """Generate one answer evaluation training example."""
    # Pick question
    topic = random.choice(list(TECHNICAL_QUESTIONS.keys()) + ["hr", "behavioral"])

    if topic in TECHNICAL_QUESTIONS:
        q, diff = random.choice(TECHNICAL_QUESTIONS[topic])
    elif topic == "hr":
        q, diff = random.choice(HR_QUESTIONS)
    else:
        q, diff = random.choice(BEHAVIORAL_QUESTIONS)

    # Pick quality level with realistic distribution
    quality = random.choices(
        ["excellent", "good", "average", "poor", "edge"],
        weights=[15, 30, 30, 20, 5],
        k=1,
    )[0]

    q_info = generate_answer_quality(quality)
    score = q_info["score"]

    # Generate answer text based on quality
    chars = random.sample(q_info["characteristics"], min(2, len(q_info["characteristics"])))

    if quality == "excellent":
        answer = f"Based on my experience, {q.lower().replace('?','')} involves several key aspects. Specifically, I implemented this at {random.choice(ALL_COMPANIES)} where we achieved a {random.randint(20,60)}% improvement. The approach included {chars[0]} and {chars[1]}. I measured success through metrics like latency reduction and error rate decrease."
    elif quality == "good":
        answer = f"To address this, I would focus on {chars[0]}. In my previous project, I applied this concept and saw positive results. The key considerations include understanding the trade-offs and choosing the right approach for the specific context."
    elif quality == "average":
        answer = f"I think {q.lower().replace('?','')} is about {chars[0]}. It's important to consider different aspects and make good decisions."
    elif quality == "poor":
        answer = f"I'm not sure about this. I think it has something to do with {chars[0]}."
    else:  # edge
        edge_type = random.choice(["blank", "irrelevant", "single_word"])
        if edge_type == "blank":
            answer = ""
        elif edge_type == "irrelevant":
            answer = "My favorite color is blue and I like playing cricket on weekends."
        else:
            answer = "Yes."

    detail = random.choice(["concrete metrics", "specific examples", "clear structure", "real experience"])
    strength = random.choice(["Shows strong technical depth", "Demonstrates practical knowledge", "Well-structured response"])
    weakness = random.choice(["Lacks specific examples", "Too generic", "Missing depth", "Incorrect understanding"])
    suggestion = random.choice(["add concrete examples", "include metrics", "explain trade-offs", "show real-world application"])

    feedback = q_info["feedback_template"].format(
        detail=detail, strength=strength, weakness=weakness, suggestion=suggestion
    )

    return {
        "instruction": "Evaluate the interview answer.",
        "input": {"question": q, "answer": answer},
        "output": {"score": score, "feedback": feedback},
    }


def generate_question_gen_example() -> Dict:
    """Generate one question generation training example."""
    q_type = random.choice(["technical", "hr", "behavioral", "project", "company"])
    company = random.choice(ALL_COMPANIES) if q_type == "company" or random.random() > 0.6 else None

    if q_type == "technical":
        topic = random.choice(list(TECHNICAL_QUESTIONS.keys()))
        q, diff = random.choice(TECHNICAL_QUESTIONS[topic])
        context = f"{random.choice(ROLES)} focusing on {topic.replace('_', ' ')}"
    elif q_type == "hr":
        q, diff = random.choice(HR_QUESTIONS)
        context = random.choice(["General", "Startup culture", "Enterprise environment", "Remote work"])
    elif q_type == "behavioral":
        q, diff = random.choice(BEHAVIORAL_QUESTIONS)
        context = random.choice(["Team collaboration", "Leadership", "Conflict resolution", "Problem solving"])
    elif q_type == "project":
        cat = random.choice(list(PROJECTS.keys()))
        proj = random.choice(PROJECTS[cat])
        q = f"How did you design and implement {proj}?"
        diff = random.choice(DIFFICULTY_LEVELS)
        context = f"Candidate built {proj}"
    else:
        q = f"How would your engineering approach align with {company}'s culture?"
        diff = "medium"
        context = f"{company} interview"

    return {
        "instruction": "Generate an interview question.",
        "input": {
            "question_type": q_type,
            "context": context,
            **({"company": company} if company else {}),
        },
        "output": {"question": q},
    }


def generate_communication_eval_example() -> Dict:
    """Generate one communication evaluation example."""
    quality = random.choices(
        ["excellent", "good", "average", "poor"],
        weights=[20, 35, 30, 15],
        k=1,
    )[0]

    if quality == "excellent":
        answer = f"Thank you for that question. Let me walk you through my approach. First, I analyzed the problem by breaking it into smaller components. Specifically, at {random.choice(ALL_COMPANIES)}, we implemented a solution that reduced latency by {random.randint(20,50)}%. The key takeaway was the importance of iterative testing and clear communication with stakeholders."
        scores = {k: random.randint(80, 95) for k in ["clarity", "fluency", "tone", "structure", "confidence"]}
    elif quality == "good":
        answer = f"Sure, I'd be happy to explain. The main idea is to focus on understanding requirements first and then implementing incrementally. In my experience, this approach works well because it allows for early feedback."
        scores = {k: random.randint(65, 82) for k in ["clarity", "fluency", "tone", "structure", "confidence"]}
    elif quality == "average":
        answer = f"Well, I think the answer is... it depends on the situation. Sometimes you do it one way and sometimes another way. I've done similar things before."
        scores = {k: random.randint(45, 65) for k in ["clarity", "fluency", "tone", "structure", "confidence"]}
    else:
        answer = f"Uh, I'm not really sure about this. I mean, I guess... it's complicated."
        scores = {k: random.randint(25, 48) for k in ["clarity", "fluency", "tone", "structure", "confidence"]}

    overall = round(sum(scores.values()) / len(scores))

    return {
        "instruction": "Evaluate the communication quality of this response.",
        "input": {
            "question": random.choice([q for q, _ in HR_QUESTIONS + BEHAVIORAL_QUESTIONS]),
            "answer": answer,
        },
        "output": {**scores, "overall": overall},
    }


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_dataset(
    num_resume: int = 8000,
    num_answer: int = 10000,
    num_question: int = 5000,
    num_communication: int = 2000,
    output_dir: str = None,
) -> str:
    """Generate the full extended dataset."""
    if output_dir is None:
        output_dir = str(Path(__file__).parent.parent / "datasets")

    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "extended_training_data.jsonl")

    total = num_resume + num_answer + num_question + num_communication
    print(f"Generating {total:,} training examples...")
    print(f"  Resume Analysis: {num_resume:,}")
    print(f"  Answer Evaluation: {num_answer:,}")
    print(f"  Question Generation: {num_question:,}")
    print(f"  Communication Eval: {num_communication:,}")

    count = 0
    with open(output_path, "w", encoding="utf-8") as f:
        for i in range(num_resume):
            example = generate_resume_analysis_example()
            f.write(json.dumps(example, ensure_ascii=False) + "\n")
            count += 1
            if count % 5000 == 0:
                print(f"  Generated {count:,}/{total:,} examples...")

        for i in range(num_answer):
            example = generate_answer_eval_example()
            f.write(json.dumps(example, ensure_ascii=False) + "\n")
            count += 1
            if count % 5000 == 0:
                print(f"  Generated {count:,}/{total:,} examples...")

        for i in range(num_question):
            example = generate_question_gen_example()
            f.write(json.dumps(example, ensure_ascii=False) + "\n")
            count += 1
            if count % 5000 == 0:
                print(f"  Generated {count:,}/{total:,} examples...")

        for i in range(num_communication):
            example = generate_communication_eval_example()
            f.write(json.dumps(example, ensure_ascii=False) + "\n")
            count += 1
            if count % 5000 == 0:
                print(f"  Generated {count:,}/{total:,} examples...")

    print(f"\n[OK] Generated {count:,} examples -> {output_path}")

    # Print stats
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"   File size: {file_size_mb:.1f} MB")

    return output_path


if __name__ == "__main__":
    generate_dataset()
