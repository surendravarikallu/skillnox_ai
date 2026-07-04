"""
Trending Topics Knowledge Base for 2025-26 Interview Season
=============================================================
Contains categorized trending topics, company-specific interviewer personas,
and difficulty-calibrated prompt templates for generating high-quality
interview questions that reflect current industry trends.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, field

# ═══════════════════════════════════════════════════════
# TRENDING TOPIC CATEGORIES
# ═══════════════════════════════════════════════════════

TRENDING_TOPICS_2026 = {
    "genai_llm": {
        "name": "Generative AI & Large Language Models",
        "topics": [
            "Transformer architecture and self-attention mechanisms",
            "RAG (Retrieval Augmented Generation) pipelines",
            "Vector databases (Pinecone, Milvus, ChromaDB, Weaviate)",
            "Prompt engineering techniques (CoT, few-shot, ReAct)",
            "Fine-tuning strategies: LoRA, QLoRA, PEFT",
            "LLM evaluation metrics (BLEU, ROUGE, perplexity, human eval)",
            "AI agents and multi-agent architectures",
            "Responsible AI: bias detection, fairness, explainability",
            "Multimodal AI (vision-language models)",
            "On-device AI and model compression (quantization, distillation)",
        ],
        "sample_questions": [
            "Explain how Retrieval Augmented Generation (RAG) works. What are its advantages over pure fine-tuning?",
            "What are vector databases and why are they essential for modern AI applications?",
            "Describe the transformer architecture. How does self-attention enable parallel processing?",
            "What is the difference between LoRA and full fine-tuning? When would you choose each?",
            "How would you evaluate the quality of an LLM's output in a production system?",
        ],
    },
    "cloud_native": {
        "name": "Cloud-Native & DevOps",
        "topics": [
            "Kubernetes orchestration and service mesh (Istio, Linkerd)",
            "Serverless architectures (AWS Lambda, Azure Functions, Cloudflare Workers)",
            "Infrastructure as Code (Terraform, Pulumi, CloudFormation)",
            "GitOps workflow and deployment strategies",
            "Observability stack: OpenTelemetry, Prometheus, Grafana, Jaeger",
            "Platform engineering and internal developer platforms",
            "Multi-cloud strategies and cloud cost optimization (FinOps)",
            "Container security and supply chain security (SBOM)",
            "Edge computing and CDN at the edge",
            "Chaos engineering and reliability testing",
        ],
        "sample_questions": [
            "What is platform engineering and how does it differ from traditional DevOps?",
            "Explain the observability pillars (logs, metrics, traces) and how OpenTelemetry unifies them.",
            "What is GitOps? How does it change the deployment workflow compared to traditional CI/CD?",
            "Describe the concept of chaos engineering. How does it improve system reliability?",
            "What is FinOps? How do organizations optimize cloud costs without sacrificing performance?",
        ],
    },
    "system_design": {
        "name": "System Design & Architecture",
        "topics": [
            "Rate limiter design (token bucket, sliding window, leaky bucket)",
            "URL shortener at scale (hashing, base62, collision handling)",
            "Real-time chat/messaging system (WebSocket, long-polling, server-sent events)",
            "Notification system (push vs pull, fan-out, priority queues)",
            "Payment gateway (idempotency, saga pattern, reconciliation)",
            "Search engine design (inverted index, ranking, relevance scoring)",
            "Social media feed (fan-out on write vs read, timeline caching)",
            "Video streaming platform (adaptive bitrate, CDN, transcoding pipeline)",
            "Collaborative document editing (CRDTs, Operational Transform)",
            "API gateway pattern and service mesh",
        ],
        "sample_questions": [
            "Design a rate limiter for an API service. Discuss token bucket vs sliding window approaches.",
            "Design a URL shortener like bit.ly. How would you handle billions of URLs and ensure uniqueness?",
            "Design a real-time notification system for a social media platform with 100M users.",
            "Design a payment processing system. How do you ensure exactly-once processing?",
            "Design a collaborative document editor like Google Docs. How do you handle concurrent edits?",
        ],
    },
    "dsa_patterns": {
        "name": "DSA Patterns (2025-26 Most Asked)",
        "topics": [
            "Sliding window (fixed and variable size)",
            "Two pointers (sorted arrays, linked lists, partitioning)",
            "Monotonic stack/queue (next greater element, histogram)",
            "Binary search on answer (minimize maximum, capacity problems)",
            "Graph algorithms: Dijkstra, Bellman-Ford, topological sort, union-find",
            "Dynamic programming optimization: bitmask DP, digit DP, DP on trees",
            "Trie for string matching and autocomplete",
            "Segment tree and BIT for range queries",
            "Backtracking with pruning (N-Queens, Sudoku, word search)",
            "Greedy with proof of optimality",
        ],
        "sample_questions": [
            "Given an array, find the longest subarray with sum equal to K. Explain your approach and time complexity.",
            "Find the minimum number of platforms needed at a railway station given arrival/departure times.",
            "Given a graph with weighted edges, find the shortest path between two nodes. Handle negative weights.",
            "Implement a Trie that supports insert, search, and startsWith operations efficiently.",
            "Solve the 0/1 knapsack problem. Can you optimize space complexity?",
        ],
    },
    "web_modern": {
        "name": "Modern Web Development",
        "topics": [
            "Server-side rendering (SSR) vs static site generation (SSG) vs ISR",
            "WebAssembly (WASM) for high-performance web apps",
            "Web Components and micro-frontends",
            "React Server Components and the edge runtime",
            "Progressive Web Apps (PWA) and offline-first architecture",
            "GraphQL federation and API composition",
            "Real-time web: WebSocket, WebRTC, Server-Sent Events",
            "Web security: OWASP Top 10, CSP, SRI, CORS",
            "Performance optimization: Core Web Vitals, lazy loading, code splitting",
            "TypeScript advanced patterns: conditional types, mapped types, template literals",
        ],
        "sample_questions": [
            "What are React Server Components? How do they differ from traditional SSR?",
            "Explain WebAssembly. What performance benefits does it bring to web applications?",
            "How would you implement a micro-frontend architecture? What are the tradeoffs?",
            "Describe the Core Web Vitals metrics. How would you optimize each one?",
            "What is GraphQL federation? How does it solve the problem of distributed schemas?",
        ],
    },
    "data_engineering": {
        "name": "Data Engineering & Analytics",
        "topics": [
            "Data mesh vs data lake vs data lakehouse",
            "Stream processing (Kafka, Flink, Spark Streaming)",
            "Data pipeline orchestration (Airflow, Dagster, Prefect)",
            "Change Data Capture (CDC) patterns",
            "Feature stores for ML (Feast, Tecton)",
            "Data quality frameworks and data contracts",
            "Real-time analytics and OLAP engines (ClickHouse, Druid, Pinot)",
            "Data governance and compliance (GDPR, data lineage)",
        ],
        "sample_questions": [
            "What is a data mesh? How does it differ from a centralized data lake approach?",
            "Explain Change Data Capture (CDC). How would you implement real-time data sync between services?",
            "What is a feature store? Why is it important for ML systems in production?",
            "Design a real-time analytics pipeline for an e-commerce platform tracking user behavior.",
        ],
    },
    "security": {
        "name": "Cybersecurity & Privacy",
        "topics": [
            "Zero Trust Architecture",
            "API security: OAuth 2.0 + PKCE, JWT best practices",
            "Supply chain security (SBOM, Sigstore)",
            "PCI DSS compliance for payment systems",
            "Container and Kubernetes security",
            "OWASP Top 10 (2025 edition)",
            "End-to-end encryption and key management",
            "Privacy engineering (differential privacy, data anonymization)",
        ],
        "sample_questions": [
            "What is Zero Trust Architecture? How does it change traditional network security?",
            "Explain OAuth 2.0 with PKCE flow. Why is PKCE important for mobile/SPA applications?",
            "How would you secure a Kubernetes cluster in production? List at least 5 security measures.",
            "What is PCI DSS compliance and how does it affect the architecture of a payment system?",
        ],
    },
}

# ═══════════════════════════════════════════════════════
# COMPANY-SPECIFIC INTERVIEWER PERSONAS
# ═══════════════════════════════════════════════════════

COMPANY_PERSONAS: Dict[str, Dict] = {
    "TCS": {
        "interviewer_style": "professional and structured, focused on fundamentals",
        "key_focus": "OOP concepts, DBMS normalization, basic coding, willingness to learn and relocate",
        "values": "Integrity, Responsibility, Excellence, Pioneering, Unity",
        "tone": "Formal and encouraging, tests foundational knowledge",
        "evaluation_emphasis": "Fundamentals clarity, communication, cultural fit, adaptability",
    },
    "Infosys": {
        "interviewer_style": "methodical and detail-oriented, balancing breadth and depth",
        "key_focus": "Data structures, algorithms, DBMS, digital transformation awareness",
        "values": "Client Value, Leadership by Example, Integrity, Fairness, Excellence",
        "tone": "Professional, values systematic problem-solving approach",
        "evaluation_emphasis": "Problem-solving approach, coding ability, digital transformation mindset",
    },
    "Wipro": {
        "interviewer_style": "warm and conversational, emphasis on communication clarity",
        "key_focus": "Programming concepts, OOP, DBMS basics, communication skills",
        "values": "Spirit of Wipro: Intensity to Win, Act with Sensitivity, Unyielding Integrity",
        "tone": "Friendly yet professional, values clear communication",
        "evaluation_emphasis": "Communication clarity, technical basics, team-player attitude",
    },
    "Accenture": {
        "interviewer_style": "consulting-oriented, values problem-solving and innovation",
        "key_focus": "Cloud computing, security, architecture, innovative thinking",
        "values": "Client Value, One Global Network, Respect, Integrity, Best People, Stewardship",
        "tone": "Dynamic and forward-thinking, values creative solutions",
        "evaluation_emphasis": "Innovation, problem analysis, consulting mindset, client engagement readiness",
    },
    "Google": {
        "interviewer_style": "deeply technical, values algorithmic thinking and scalability",
        "key_focus": "Algorithms, system design at scale, data structures, Googleyness",
        "values": "Focus on the user, Think 10x, Don't be evil, Ship and iterate",
        "tone": "Collaborative but rigorous, expects strong technical depth",
        "evaluation_emphasis": "Algorithmic thinking, scalability awareness, communication of thought process, Googleyness (ambiguity tolerance, leadership)",
    },
    "Microsoft": {
        "interviewer_style": "growth mindset oriented, values learning ability and inclusivity",
        "key_focus": "Data structures, system design, OS concepts, cloud (Azure)",
        "values": "Growth Mindset, Diversity & Inclusion, Customer Obsession",
        "tone": "Supportive, encourages candidates to think through problems",
        "evaluation_emphasis": "Growth mindset, problem-solving process, design thinking, inclusivity",
    },
    "Amazon": {
        "interviewer_style": "Leadership Principles driven, every answer evaluated through LP lens",
        "key_focus": "STAR method behavioral stories, system design for scale, ownership",
        "values": "16 Leadership Principles: Customer Obsession, Ownership, Invent and Simplify, Bias for Action, Dive Deep, etc.",
        "tone": "Direct and structured, probes deeply into past experiences",
        "evaluation_emphasis": "Leadership Principles alignment, STAR method clarity, customer obsession, ownership mentality",
    },
    "Meta": {
        "interviewer_style": "fast-paced, values execution speed and impact",
        "key_focus": "Coding speed, system design for social scale, product sense",
        "values": "Move Fast, Focus on Long-Term Impact, Build Awesome Things, Be Open, Be Bold",
        "tone": "Energetic, values speed and clarity of solution",
        "evaluation_emphasis": "Coding speed, solution elegance, impact-oriented thinking, product intuition",
    },
    "Flipkart": {
        "interviewer_style": "product engineering focused, values clean code and design",
        "key_focus": "DSA, machine coding, e-commerce system design",
        "values": "Customer First, Ownership, Integrity, Speed",
        "tone": "Startup energy with engineering discipline",
        "evaluation_emphasis": "Code quality, system design for scale, trade-off analysis, ownership",
    },
    "Razorpay": {
        "interviewer_style": "fintech specialist, values reliability and correctness",
        "key_focus": "Payment systems, distributed transactions, event sourcing",
        "values": "Transparency, Ownership, Speed with Quality",
        "tone": "Technically demanding, expects deep understanding of financial systems",
        "evaluation_emphasis": "System reliability thinking, distributed systems knowledge, fintech domain awareness",
    },
    "Zoho": {
        "interviewer_style": "coding-intensive, product-first engineering culture",
        "key_focus": "Pure coding ability in C/C++/Java, memory management, OS internals",
        "values": "Privacy, Independence, Product Excellence",
        "tone": "Hands-on and practical, values fundamentals over frameworks",
        "evaluation_emphasis": "Raw coding ability, CS fundamentals depth, problem-solving without IDE",
    },
    "Goldman Sachs": {
        "interviewer_style": "rigorous and quantitative, values precision and analytical depth",
        "key_focus": "Hard DSA, mathematical problems, low-latency systems, financial domain",
        "values": "Client Service, Integrity, Excellence, Partnership",
        "tone": "Formal and demanding, expects precision in answers",
        "evaluation_emphasis": "Algorithmic precision, quantitative reasoning, system performance awareness",
    },
    "Deloitte": {
        "interviewer_style": "consulting-oriented, values structured thinking and communication",
        "key_focus": "Case studies, data governance, RPA, enterprise technology",
        "values": "Integrity, Outstanding Value, Commitment, Strength from Diversity",
        "tone": "Professional and structured, values frameworks and clear presentation",
        "evaluation_emphasis": "Structured thinking, communication, stakeholder management, analytical approach",
    },
}

# Default persona for companies not explicitly defined
DEFAULT_PERSONA = {
    "interviewer_style": "professional and balanced, testing both technical and soft skills",
    "key_focus": "Core CS fundamentals, problem-solving, and communication",
    "values": "Excellence, Integrity, Innovation",
    "tone": "Professional and encouraging",
    "evaluation_emphasis": "Technical depth, communication clarity, problem-solving approach",
}

# ═══════════════════════════════════════════════════════
# DIFFICULTY CALIBRATION PROMPTS
# ═══════════════════════════════════════════════════════

DIFFICULTY_CALIBRATION = {
    "easy": {
        "description": "Entry-level / fresher appropriate",
        "instruction": "Ask a fundamental question that a recent graduate should know. Keep it straightforward with no ambiguity. Test basic understanding, not deep expertise.",
        "examples": "What is polymorphism? | What is the difference between HTTP GET and POST? | What is normalization in databases?",
    },
    "medium": {
        "description": "1-2 years experience or strong fresher",
        "instruction": "Ask a question that requires applying concepts to a practical scenario. Include some depth but remain achievable for someone with solid fundamentals and some project experience.",
        "examples": "Explain the trade-offs between SQL and NoSQL for an e-commerce application. | How would you design a caching layer for a read-heavy API? | Implement a function to detect cycles in a graph.",
    },
    "hard": {
        "description": "Senior-level or competitive",
        "instruction": "Ask a question that requires deep understanding, system thinking, or advanced algorithmic knowledge. The candidate should demonstrate expertise, handle edge cases, and discuss trade-offs.",
        "examples": "Design a distributed rate limiter that works across multiple data centers. | Implement an LRU cache with O(1) operations. | How would you ensure exactly-once delivery in a message queue?",
    },
}


def get_company_persona(company: str) -> Dict:
    """Get the interviewer persona for a company, falling back to default."""
    return COMPANY_PERSONAS.get(company, DEFAULT_PERSONA)


def get_trending_context(categories: Optional[List[str]] = None) -> str:
    """Build a trending topics context string for LLM prompts."""
    if categories is None:
        categories = list(TRENDING_TOPICS_2026.keys())

    context_parts = []
    for cat_key in categories:
        if cat_key in TRENDING_TOPICS_2026:
            cat = TRENDING_TOPICS_2026[cat_key]
            topics_str = ", ".join(cat["topics"][:5])
            context_parts.append(f"- {cat['name']}: {topics_str}")

    return "\n".join(context_parts)


def get_difficulty_instruction(difficulty: str) -> str:
    """Get the difficulty calibration instruction."""
    cal = DIFFICULTY_CALIBRATION.get(difficulty, DIFFICULTY_CALIBRATION["medium"])
    return cal["instruction"]


def build_company_question_prompt(
    question_type: str,
    company: Optional[str] = None,
    difficulty: str = "medium",
    include_trending: bool = True,
) -> str:
    """
    Build a comprehensive prompt for generating company-specific interview questions.
    This replaces the simple one-liner prompts in the current LLM integration.
    """
    persona = get_company_persona(company) if company else DEFAULT_PERSONA
    diff_instruction = get_difficulty_instruction(difficulty)

    prompt_parts = [
        f"You are a senior technical interviewer",
    ]

    if company:
        prompt_parts[0] += f" at {company}"
        prompt_parts.append(f"Interview style: {persona['interviewer_style']}")
        prompt_parts.append(f"Key focus areas: {persona['key_focus']}")
        prompt_parts.append(f"Company values: {persona['values']}")
        prompt_parts.append(f"Evaluation emphasis: {persona['evaluation_emphasis']}")

    prompt_parts.append(f"\nDifficulty level: {difficulty.upper()}")
    prompt_parts.append(f"Difficulty instruction: {diff_instruction}")
    prompt_parts.append(f"\nQuestion type: {question_type}")

    if include_trending:
        relevant_categories = _get_relevant_categories(question_type)
        trending_context = get_trending_context(relevant_categories)
        if trending_context:
            prompt_parts.append(f"\nIncorporate awareness of these 2025-26 trending topics where relevant:")
            prompt_parts.append(trending_context)

    prompt_parts.append(
        "\nGenerate a single, high-quality interview question. "
        "The question should be specific, thought-provoking, and relevant to real interviews. "
        "Do NOT include the answer. Output ONLY the question text, nothing else."
    )

    return "\n".join(prompt_parts)


def build_company_evaluation_prompt(
    company: Optional[str] = None,
    question_type: str = "technical",
) -> str:
    """Build evaluation prompt with company-specific rubric."""
    persona = get_company_persona(company) if company else DEFAULT_PERSONA

    parts = [
        "You are evaluating an interview answer.",
    ]

    if company:
        parts[0] = f"You are evaluating an interview answer for a {company} interview."
        parts.append(f"Evaluation emphasis: {persona['evaluation_emphasis']}")
        parts.append(f"Company values lens: {persona['values']}")

    parts.append(
        "\nEvaluate on: correctness, depth, communication clarity, and practical applicability. "
        "Score from 0-100 and provide specific, actionable feedback."
    )

    return "\n".join(parts)


def _get_relevant_categories(question_type: str) -> List[str]:
    """Map question type to relevant trending categories."""
    mapping = {
        "technical": ["genai_llm", "cloud_native", "system_design", "web_modern"],
        "coding": ["dsa_patterns"],
        "company": ["genai_llm", "cloud_native", "system_design"],
        "hr": [],
        "behavioral": [],
        "gd": ["genai_llm", "data_engineering", "security"],
        "communication": [],
        "project": ["cloud_native", "web_modern"],
        "aptitude": [],
    }
    return mapping.get(question_type, ["genai_llm", "system_design"])


def get_all_trending_sample_questions() -> List[str]:
    """Get all sample trending questions for training data generation."""
    questions = []
    for cat in TRENDING_TOPICS_2026.values():
        questions.extend(cat.get("sample_questions", []))
    return questions
