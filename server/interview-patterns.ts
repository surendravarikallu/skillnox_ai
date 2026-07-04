/**
 * Company-Specific Interview Patterns
 * =====================================
 * Defines the multi-round interview structure for each company.
 * Supports both full simulation (with round-gating) and combined mode.
 */

import type { InterviewRound } from './company-questions';

// ─── Types ────────────────────────────────────────────

export interface InterviewRoundConfig {
  name: string;
  type: InterviewRound;
  questionCount: number;
  timeLimit: number; // minutes
  passingScore: number; // minimum to advance (0-100)
  difficultyDistribution: { easy: number; medium: number; hard: number };
  description: string;
}

export interface CompanyInterviewPattern {
  company: string;
  fullName: string;
  category: 'indian_it' | 'global_tech' | 'indian_startup' | 'bfsi';
  rounds: InterviewRoundConfig[];
  description: string;
  totalDuration: string;
  yearUpdated: number;
  interviewStyle: string;
  tips: string[];
  logo?: string; // icon name or emoji
}

export type SimulationMode = 'full' | 'combined';

// ─── Pattern Definitions ──────────────────────────────

export const INTERVIEW_PATTERNS: Record<string, CompanyInterviewPattern> = {
  // ═══════════════════════════════════════════════
  // INDIAN IT SERVICES
  // ═══════════════════════════════════════════════

  'TCS': {
    company: 'TCS',
    fullName: 'Tata Consultancy Services',
    category: 'indian_it',
    description: 'TCS NQT (National Qualifier Test) based hiring — Written Test → Technical → Managerial → HR',
    totalDuration: '60-90 min',
    yearUpdated: 2026,
    interviewStyle: 'Structured and process-driven, focused on fundamentals and cultural fit',
    tips: [
      'Practice TCS NQT pattern aptitude questions',
      'Focus on OOP concepts, DBMS, and Networking fundamentals',
      'Be prepared for questions about TCS values and willingness to relocate',
      'Show enthusiasm for continuous learning and adaptability',
    ],
    rounds: [
      {
        name: 'Aptitude & Reasoning',
        type: 'aptitude',
        questionCount: 5,
        timeLimit: 15,
        passingScore: 50,
        difficultyDistribution: { easy: 40, medium: 50, hard: 10 },
        description: 'Quantitative aptitude, logical reasoning, and verbal ability',
      },
      {
        name: 'Technical Interview',
        type: 'technical',
        questionCount: 5,
        timeLimit: 20,
        passingScore: 50,
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
        description: 'Core CS fundamentals, OOP, DBMS, networking, and basic coding',
      },
      {
        name: 'HR Interview',
        type: 'hr',
        questionCount: 3,
        timeLimit: 10,
        passingScore: 50,
        difficultyDistribution: { easy: 50, medium: 40, hard: 10 },
        description: 'Behavioral questions, company knowledge, career goals, and cultural fit',
      },
    ],
  },

  'Infosys': {
    company: 'Infosys',
    fullName: 'Infosys Limited',
    category: 'indian_it',
    description: 'InfyTQ based hiring — Online Assessment → Technical + Coding → HR',
    totalDuration: '60-75 min',
    yearUpdated: 2026,
    interviewStyle: 'Balanced between aptitude and technical depth',
    tips: [
      'Practice InfyTQ mock tests for aptitude',
      'Strong focus on coding ability and problem-solving',
      'Know about Infosys Foundation and corporate initiatives',
      'Prepare for questions about digital transformation',
    ],
    rounds: [
      {
        name: 'Online Assessment',
        type: 'aptitude',
        questionCount: 4,
        timeLimit: 12,
        passingScore: 50,
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
        description: 'Aptitude, logical reasoning, and pseudo-code understanding',
      },
      {
        name: 'Technical + Coding',
        type: 'technical',
        questionCount: 5,
        timeLimit: 25,
        passingScore: 50,
        difficultyDistribution: { easy: 20, medium: 50, hard: 30 },
        description: 'Data structures, algorithms, DBMS, OOP, and hands-on coding',
      },
      {
        name: 'HR Interview',
        type: 'hr',
        questionCount: 3,
        timeLimit: 10,
        passingScore: 50,
        difficultyDistribution: { easy: 60, medium: 30, hard: 10 },
        description: 'Company knowledge, career aspirations, and personality assessment',
      },
    ],
  },

  'Wipro': {
    company: 'Wipro',
    fullName: 'Wipro Limited',
    category: 'indian_it',
    description: 'WILP/Elite NTH hiring — Written Test → Technical → HR',
    totalDuration: '50-70 min',
    yearUpdated: 2026,
    interviewStyle: 'Moderate difficulty with focus on fundamentals and communication',
    tips: [
      'Practice Wipro-style aptitude with verbal focus',
      'Know about Spirit of Wipro values',
      'Be prepared for programming questions in C/Java',
      'Wipro values communication skills highly',
    ],
    rounds: [
      {
        name: 'Written Assessment',
        type: 'aptitude',
        questionCount: 3,
        timeLimit: 10,
        passingScore: 50,
        difficultyDistribution: { easy: 40, medium: 50, hard: 10 },
        description: 'Quantitative, verbal, and logical reasoning',
      },
      {
        name: 'Technical Interview',
        type: 'technical',
        questionCount: 5,
        timeLimit: 20,
        passingScore: 50,
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
        description: 'Programming concepts, OOP, DBMS, and basic networking',
      },
      {
        name: 'HR Interview',
        type: 'hr',
        questionCount: 4,
        timeLimit: 12,
        passingScore: 50,
        difficultyDistribution: { easy: 50, medium: 40, hard: 10 },
        description: 'Communication assessment, cultural fit, and career goals',
      },
    ],
  },

  'Accenture': {
    company: 'Accenture',
    fullName: 'Accenture PLC',
    category: 'indian_it',
    description: 'Cognitive & Technical Assessment → Technical → HR',
    totalDuration: '60-80 min',
    yearUpdated: 2026,
    interviewStyle: 'Consulting-oriented with emphasis on problem-solving and communication',
    tips: [
      'Focus on cognitive assessment and critical thinking',
      'Know Accenture\'s five business areas',
      'Prepare for situational and innovative thinking questions',
      'Show interest in emerging technologies and digital transformation',
    ],
    rounds: [
      {
        name: 'Cognitive Assessment',
        type: 'aptitude',
        questionCount: 3,
        timeLimit: 10,
        passingScore: 50,
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
        description: 'Critical thinking, problem analysis, and verbal reasoning',
      },
      {
        name: 'Technical Interview',
        type: 'technical',
        questionCount: 5,
        timeLimit: 20,
        passingScore: 50,
        difficultyDistribution: { easy: 20, medium: 50, hard: 30 },
        description: 'Software engineering, cloud, security, and architecture concepts',
      },
      {
        name: 'HR Interview',
        type: 'hr',
        questionCount: 4,
        timeLimit: 12,
        passingScore: 50,
        difficultyDistribution: { easy: 40, medium: 40, hard: 20 },
        description: 'Leadership, innovation, client engagement, and cultural fit',
      },
    ],
  },

  'Cognizant': {
    company: 'Cognizant',
    fullName: 'Cognizant Technology Solutions',
    category: 'indian_it',
    description: 'GenC / GenC Pro hiring — Aptitude → Technical → HR',
    totalDuration: '50-65 min',
    yearUpdated: 2026,
    interviewStyle: 'Standard IT service hiring with focus on fundamentals',
    tips: [
      'Practice aptitude at GenC difficulty level',
      'Brush up on data structures and DBMS',
      'Be open to learning legacy technologies',
      'Know about Cognizant\'s digital engineering focus',
    ],
    rounds: [
      { name: 'Aptitude Test', type: 'aptitude', questionCount: 3, timeLimit: 10, passingScore: 50, difficultyDistribution: { easy: 40, medium: 50, hard: 10 }, description: 'Quantitative, logical, and verbal' },
      { name: 'Technical Interview', type: 'technical', questionCount: 5, timeLimit: 20, passingScore: 50, difficultyDistribution: { easy: 30, medium: 50, hard: 20 }, description: 'CS fundamentals, coding, and DBMS' },
      { name: 'HR Interview', type: 'hr', questionCount: 3, timeLimit: 10, passingScore: 50, difficultyDistribution: { easy: 50, medium: 40, hard: 10 }, description: 'Behavioral and cultural fit' },
    ],
  },

  'Capgemini': {
    company: 'Capgemini',
    fullName: 'Capgemini SE',
    category: 'indian_it',
    description: 'Game-based Assessment → Technical → HR',
    totalDuration: '50-65 min',
    yearUpdated: 2026,
    interviewStyle: 'Modern assessment with game-based aptitude and strong technical focus',
    tips: [
      'Practice behavioral game-based assessments',
      'Know Capgemini\'s 7 values',
      'Focus on emerging tech topics like cloud and DevOps',
      'Diversity and inclusion are valued topics',
    ],
    rounds: [
      { name: 'Game-based Assessment', type: 'aptitude', questionCount: 2, timeLimit: 8, passingScore: 50, difficultyDistribution: { easy: 40, medium: 50, hard: 10 }, description: 'Cognitive games and logical puzzles' },
      { name: 'Technical Interview', type: 'technical', questionCount: 5, timeLimit: 22, passingScore: 50, difficultyDistribution: { easy: 20, medium: 50, hard: 30 }, description: 'Web development, architecture, and DevOps' },
      { name: 'HR Interview', type: 'hr', questionCount: 3, timeLimit: 10, passingScore: 50, difficultyDistribution: { easy: 50, medium: 40, hard: 10 }, description: 'Values alignment and career aspirations' },
    ],
  },

  'HCL': {
    company: 'HCL',
    fullName: 'HCL Technologies',
    category: 'indian_it',
    description: 'Online Test → Technical → HR',
    totalDuration: '50-65 min',
    yearUpdated: 2026,
    interviewStyle: 'Standard with emphasis on Employees First philosophy',
    tips: [
      'Know about HCL\'s "Employees First" culture',
      'Focus on fundamentals and coding',
      'Be prepared for questions about willingness to travel',
    ],
    rounds: [
      { name: 'Online Assessment', type: 'aptitude', questionCount: 3, timeLimit: 10, passingScore: 50, difficultyDistribution: { easy: 40, medium: 50, hard: 10 }, description: 'Aptitude and logical reasoning' },
      { name: 'Technical Interview', type: 'technical', questionCount: 5, timeLimit: 20, passingScore: 50, difficultyDistribution: { easy: 30, medium: 50, hard: 20 }, description: 'Programming, OS, DBMS, and networking' },
      { name: 'HR Interview', type: 'hr', questionCount: 3, timeLimit: 10, passingScore: 50, difficultyDistribution: { easy: 50, medium: 40, hard: 10 }, description: 'Cultural fit and flexibility' },
    ],
  },

  'Tech Mahindra': {
    company: 'Tech Mahindra',
    fullName: 'Tech Mahindra Limited',
    category: 'indian_it',
    description: 'Online Test → Technical → HR',
    totalDuration: '50-60 min',
    yearUpdated: 2026,
    interviewStyle: 'Telecom-focused with emerging tech interest',
    tips: [
      'Know about 5G, IoT, and telecom trends',
      'Understand the Mahindra Group ecosystem',
      'Be prepared for questions on emerging technologies',
    ],
    rounds: [
      { name: 'Online Test', type: 'aptitude', questionCount: 2, timeLimit: 8, passingScore: 50, difficultyDistribution: { easy: 50, medium: 40, hard: 10 }, description: 'Quantitative and logical' },
      { name: 'Technical Interview', type: 'technical', questionCount: 5, timeLimit: 20, passingScore: 50, difficultyDistribution: { easy: 30, medium: 50, hard: 20 }, description: 'Programming, telecom, and emerging tech' },
      { name: 'HR Interview', type: 'hr', questionCount: 3, timeLimit: 10, passingScore: 50, difficultyDistribution: { easy: 50, medium: 40, hard: 10 }, description: 'Career goals and adaptability' },
    ],
  },

  'L&T Infotech': {
    company: 'L&T Infotech',
    fullName: 'LTIMindtree (formerly L&T Infotech)',
    category: 'indian_it',
    description: 'Online Test → Technical → HR',
    totalDuration: '50-60 min',
    yearUpdated: 2026,
    interviewStyle: 'Engineering excellence focused',
    tips: ['Know about the LTI + Mindtree merger', 'Focus on system design and architecture'],
    rounds: [
      { name: 'Online Assessment', type: 'aptitude', questionCount: 2, timeLimit: 8, passingScore: 50, difficultyDistribution: { easy: 40, medium: 50, hard: 10 }, description: 'Aptitude and reasoning' },
      { name: 'Technical Interview', type: 'technical', questionCount: 5, timeLimit: 20, passingScore: 50, difficultyDistribution: { easy: 20, medium: 50, hard: 30 }, description: 'System design, coding, and architecture' },
      { name: 'HR Interview', type: 'hr', questionCount: 2, timeLimit: 8, passingScore: 50, difficultyDistribution: { easy: 50, medium: 50, hard: 0 }, description: 'Cultural fit' },
    ],
  },

  'Mindtree': {
    company: 'Mindtree',
    fullName: 'Mindtree (part of LTIMindtree)',
    category: 'indian_it',
    description: 'Online Test → Technical → HR',
    totalDuration: '45-55 min',
    yearUpdated: 2026,
    interviewStyle: 'Innovation-focused with emphasis on testing and quality',
    tips: ['Focus on testing methodologies', 'Show innovation mindset'],
    rounds: [
      { name: 'Online Test', type: 'aptitude', questionCount: 2, timeLimit: 8, passingScore: 50, difficultyDistribution: { easy: 40, medium: 50, hard: 10 }, description: 'Quantitative and logical' },
      { name: 'Technical Interview', type: 'technical', questionCount: 4, timeLimit: 18, passingScore: 50, difficultyDistribution: { easy: 30, medium: 50, hard: 20 }, description: 'Programming, testing, and architecture' },
      { name: 'HR Interview', type: 'hr', questionCount: 2, timeLimit: 8, passingScore: 50, difficultyDistribution: { easy: 50, medium: 50, hard: 0 }, description: 'Innovation and teamwork' },
    ],
  },

  'Zoho': {
    company: 'Zoho',
    fullName: 'Zoho Corporation',
    category: 'indian_it',
    description: 'Coding Round → Advanced Coding → Technical → HR (Known for intense coding rounds)',
    totalDuration: '90-120 min',
    yearUpdated: 2026,
    interviewStyle: 'Highly coding-intensive, product engineering focus',
    tips: [
      'Practice competitive programming (LeetCode Medium-Hard)',
      'Strong C/C++ fundamentals are preferred',
      'Know about Zoho\'s product suite and bootstrapped philosophy',
      'System design questions at higher levels',
    ],
    rounds: [
      { name: 'Coding Round 1', type: 'coding', questionCount: 4, timeLimit: 30, passingScore: 60, difficultyDistribution: { easy: 20, medium: 50, hard: 30 }, description: 'Algorithm and data structure problems' },
      { name: 'Advanced Coding', type: 'coding', questionCount: 3, timeLimit: 25, passingScore: 60, difficultyDistribution: { easy: 0, medium: 40, hard: 60 }, description: 'Complex problems: DP, graphs, system design coding' },
      { name: 'Technical Interview', type: 'technical', questionCount: 3, timeLimit: 15, passingScore: 50, difficultyDistribution: { easy: 20, medium: 40, hard: 40 }, description: 'OS, DBMS, networking, and design fundamentals' },
      { name: 'HR Interview', type: 'hr', questionCount: 2, timeLimit: 8, passingScore: 50, difficultyDistribution: { easy: 50, medium: 50, hard: 0 }, description: 'Product thinking and cultural fit' },
    ],
  },

  // ═══════════════════════════════════════════════
  // GLOBAL TECH
  // ═══════════════════════════════════════════════

  'Google': {
    company: 'Google',
    fullName: 'Google (Alphabet Inc.)',
    category: 'global_tech',
    description: 'Phone Screen → 4-5 Onsite Rounds (Coding + System Design + Behavioral)',
    totalDuration: '90-120 min',
    yearUpdated: 2026,
    interviewStyle: 'World-class bar: deep algorithms, system design, and "Googleyness"',
    tips: [
      'Practice LeetCode Hard problems extensively',
      'Master system design (Grokking System Design)',
      'Prepare "Googleyness" stories (ambiguity, leadership, collaboration)',
      'Think out loud during coding — communication matters',
    ],
    rounds: [
      { name: 'Coding Round 1', type: 'coding', questionCount: 3, timeLimit: 25, passingScore: 65, difficultyDistribution: { easy: 10, medium: 40, hard: 50 }, description: 'Algorithms, data structures, and optimization' },
      { name: 'Coding Round 2', type: 'coding', questionCount: 3, timeLimit: 25, passingScore: 65, difficultyDistribution: { easy: 0, medium: 30, hard: 70 }, description: 'Advanced algorithms: graphs, DP, and string' },
      { name: 'System Design', type: 'technical', questionCount: 2, timeLimit: 20, passingScore: 60, difficultyDistribution: { easy: 0, medium: 30, hard: 70 }, description: 'Large-scale system design and architecture' },
      { name: 'Googleyness & Leadership', type: 'behavioral', questionCount: 3, timeLimit: 15, passingScore: 60, difficultyDistribution: { easy: 20, medium: 50, hard: 30 }, description: 'Collaboration, ambiguity, and leadership scenarios' },
    ],
  },

  'Microsoft': {
    company: 'Microsoft',
    fullName: 'Microsoft Corporation',
    category: 'global_tech',
    description: 'Online Assessment → 3-4 Rounds (Coding + Design + Behavioral)',
    totalDuration: '80-100 min',
    yearUpdated: 2026,
    interviewStyle: 'Growth mindset focused with strong coding and design expectations',
    tips: [
      'Practice coding on a whiteboard / without IDE',
      'Microsoft values "Growth Mindset" — show learning ability',
      'System design with Azure-lens is a plus',
      'Prepare diversity and inclusion examples',
    ],
    rounds: [
      { name: 'Online Assessment', type: 'coding', questionCount: 3, timeLimit: 25, passingScore: 60, difficultyDistribution: { easy: 10, medium: 50, hard: 40 }, description: 'Algorithms and problem-solving' },
      { name: 'Technical Round', type: 'technical', questionCount: 4, timeLimit: 25, passingScore: 60, difficultyDistribution: { easy: 10, medium: 40, hard: 50 }, description: 'CS fundamentals, system design, and OS concepts' },
      { name: 'Growth Mindset Round', type: 'behavioral', questionCount: 3, timeLimit: 12, passingScore: 55, difficultyDistribution: { easy: 30, medium: 50, hard: 20 }, description: 'Learning ability, feedback handling, and collaboration' },
    ],
  },

  'Amazon': {
    company: 'Amazon',
    fullName: 'Amazon.com Inc.',
    category: 'global_tech',
    description: 'Online Assessment → 4 Leadership Principle Rounds (each with coding or design)',
    totalDuration: '90-120 min',
    yearUpdated: 2026,
    interviewStyle: 'Leadership Principles driven — every answer evaluated through LP lens',
    tips: [
      'Memorize all 16 Amazon Leadership Principles',
      'Use STAR method for every behavioral answer',
      'Prepare 2-3 stories per Leadership Principle',
      'System design: focus on scalability and trade-offs',
    ],
    rounds: [
      { name: 'Online Assessment', type: 'coding', questionCount: 3, timeLimit: 25, passingScore: 60, difficultyDistribution: { easy: 10, medium: 50, hard: 40 }, description: 'Algorithmic problems + work simulation' },
      { name: 'LP + Coding Round', type: 'technical', questionCount: 3, timeLimit: 20, passingScore: 60, difficultyDistribution: { easy: 10, medium: 40, hard: 50 }, description: 'Coding with Leadership Principle behavioral questions' },
      { name: 'System Design', type: 'technical', questionCount: 2, timeLimit: 20, passingScore: 60, difficultyDistribution: { easy: 0, medium: 30, hard: 70 }, description: 'Design scalable distributed systems' },
      { name: 'Bar Raiser (LP Deep Dive)', type: 'behavioral', questionCount: 4, timeLimit: 20, passingScore: 65, difficultyDistribution: { easy: 10, medium: 40, hard: 50 }, description: 'Deep behavioral with multiple Leadership Principles' },
    ],
  },

  'Meta': {
    company: 'Meta',
    fullName: 'Meta Platforms Inc.',
    category: 'global_tech',
    description: 'Phone Screen → 3 Onsite (2 Coding + 1 System Design + Behavioral)',
    totalDuration: '80-100 min',
    yearUpdated: 2026,
    interviewStyle: 'Fast-paced coding with emphasis on impact and execution speed',
    tips: [
      'Practice coding speed — Meta values efficiency',
      'Focus on product-sense for system design',
      'Prepare "Move Fast" stories about shipping under pressure',
      'Graph and tree problems are common',
    ],
    rounds: [
      { name: 'Coding Round 1', type: 'coding', questionCount: 3, timeLimit: 20, passingScore: 65, difficultyDistribution: { easy: 0, medium: 40, hard: 60 }, description: 'Algorithms with speed focus' },
      { name: 'System Design', type: 'technical', questionCount: 2, timeLimit: 20, passingScore: 60, difficultyDistribution: { easy: 0, medium: 30, hard: 70 }, description: 'Social media scale system design' },
      { name: 'Behavioral', type: 'behavioral', questionCount: 3, timeLimit: 15, passingScore: 60, difficultyDistribution: { easy: 20, medium: 50, hard: 30 }, description: 'Meta values: Move Fast, Build Social Value, Focus on Impact' },
    ],
  },

  'IBM': {
    company: 'IBM',
    fullName: 'International Business Machines',
    category: 'global_tech',
    description: 'Online Assessment → Technical → HR',
    totalDuration: '50-65 min',
    yearUpdated: 2026,
    interviewStyle: 'Innovation-focused with cloud and AI emphasis',
    tips: ['Know about IBM Cloud Paks and Watson', 'Focus on hybrid cloud and AI topics'],
    rounds: [
      { name: 'Online Assessment', type: 'aptitude', questionCount: 3, timeLimit: 10, passingScore: 50, difficultyDistribution: { easy: 30, medium: 50, hard: 20 }, description: 'Aptitude, cognitive, and English' },
      { name: 'Technical Interview', type: 'technical', questionCount: 5, timeLimit: 22, passingScore: 50, difficultyDistribution: { easy: 20, medium: 40, hard: 40 }, description: 'AI/ML, cloud computing, and system design' },
      { name: 'HR Interview', type: 'hr', questionCount: 3, timeLimit: 10, passingScore: 50, difficultyDistribution: { easy: 40, medium: 50, hard: 10 }, description: 'Innovation mindset and ethical tech' },
    ],
  },

  // ═══════════════════════════════════════════════
  // INDIAN STARTUPS
  // ═══════════════════════════════════════════════

  'Flipkart': {
    company: 'Flipkart',
    fullName: 'Flipkart Internet Pvt Ltd',
    category: 'indian_startup',
    description: 'Online Coding → Machine Coding → Problem Solving + Design → HR',
    totalDuration: '90-110 min',
    yearUpdated: 2026,
    interviewStyle: 'Product engineering focused with high coding bar',
    tips: [
      'Practice LeetCode Medium-Hard problems',
      'Machine coding round tests clean code and design',
      'Know about e-commerce system design',
      'Prepare for A/B testing and experimentation questions',
    ],
    rounds: [
      { name: 'Online Coding Test', type: 'coding', questionCount: 3, timeLimit: 25, passingScore: 60, difficultyDistribution: { easy: 10, medium: 50, hard: 40 }, description: 'DSA and problem-solving' },
      { name: 'Problem Solving + Design', type: 'technical', questionCount: 3, timeLimit: 25, passingScore: 60, difficultyDistribution: { easy: 0, medium: 40, hard: 60 }, description: 'System design and architecture for e-commerce scale' },
      { name: 'HR / Cultural Fit', type: 'behavioral', questionCount: 3, timeLimit: 12, passingScore: 55, difficultyDistribution: { easy: 30, medium: 50, hard: 20 }, description: 'Ownership, trade-offs, and startup culture' },
    ],
  },

  'Paytm': {
    company: 'Paytm',
    fullName: 'Paytm (One97 Communications)',
    category: 'indian_startup',
    description: 'Coding Test → Technical Interview → HR',
    totalDuration: '60-80 min',
    yearUpdated: 2026,
    interviewStyle: 'Fintech-focused with emphasis on speed and payments domain',
    tips: [
      'Know about UPI and India\'s payment ecosystem',
      'Focus on concurrency and system reliability',
      'Be ready for fast-paced startup culture questions',
    ],
    rounds: [
      { name: 'Coding Assessment', type: 'coding', questionCount: 3, timeLimit: 20, passingScore: 55, difficultyDistribution: { easy: 10, medium: 50, hard: 40 }, description: 'Algorithms and data structures' },
      { name: 'Technical Interview', type: 'technical', questionCount: 4, timeLimit: 22, passingScore: 55, difficultyDistribution: { easy: 10, medium: 40, hard: 50 }, description: 'Fintech systems, payments, and architecture' },
      { name: 'HR Interview', type: 'hr', questionCount: 2, timeLimit: 8, passingScore: 50, difficultyDistribution: { easy: 50, medium: 50, hard: 0 }, description: 'Startup mindset and adaptability' },
    ],
  },

  'Razorpay': {
    company: 'Razorpay',
    fullName: 'Razorpay Software Pvt Ltd',
    category: 'indian_startup',
    description: 'Online Test → Technical Deep Dive → System Design → Cultural',
    totalDuration: '80-100 min',
    yearUpdated: 2026,
    interviewStyle: 'High engineering bar with fintech domain expertise',
    tips: [
      'Deep understanding of payment systems and PCI DSS',
      'Event sourcing and saga patterns are important',
      'Focus on distributed systems concepts',
      'Show ownership and autonomy traits',
    ],
    rounds: [
      { name: 'Online Coding', type: 'coding', questionCount: 3, timeLimit: 20, passingScore: 60, difficultyDistribution: { easy: 0, medium: 40, hard: 60 }, description: 'Advanced DSA problems' },
      { name: 'Technical + Design', type: 'technical', questionCount: 4, timeLimit: 28, passingScore: 60, difficultyDistribution: { easy: 0, medium: 30, hard: 70 }, description: 'Payment systems, distributed transactions, and architecture' },
      { name: 'Cultural Fit', type: 'behavioral', questionCount: 2, timeLimit: 10, passingScore: 55, difficultyDistribution: { easy: 30, medium: 50, hard: 20 }, description: 'Ownership, building from scratch' },
    ],
  },

  'Freshworks': {
    company: 'Freshworks',
    fullName: 'Freshworks Inc.',
    category: 'indian_startup',
    description: 'Coding + Technical → System Design → HR',
    totalDuration: '70-90 min',
    yearUpdated: 2026,
    interviewStyle: 'SaaS product engineering focused',
    tips: [
      'Know about multi-tenant SaaS architecture',
      'Freshworks product suite knowledge is a plus',
      'Focus on customer support and CRM domain',
    ],
    rounds: [
      { name: 'Coding Assessment', type: 'coding', questionCount: 3, timeLimit: 22, passingScore: 55, difficultyDistribution: { easy: 10, medium: 50, hard: 40 }, description: 'Algorithms and data structures' },
      { name: 'Technical + Design', type: 'technical', questionCount: 4, timeLimit: 25, passingScore: 55, difficultyDistribution: { easy: 10, medium: 40, hard: 50 }, description: 'SaaS architecture, multi-tenancy, and real-time systems' },
      { name: 'HR Interview', type: 'hr', questionCount: 2, timeLimit: 8, passingScore: 50, difficultyDistribution: { easy: 50, medium: 50, hard: 0 }, description: 'Initiative and improvement mindset' },
    ],
  },

  'CRED': {
    company: 'CRED',
    fullName: 'CRED (Dreamplug Technologies)',
    category: 'indian_startup',
    description: 'Coding → System Design → Craft & Culture',
    totalDuration: '80-100 min',
    yearUpdated: 2026,
    interviewStyle: 'Extremely high engineering bar, craft-oriented',
    tips: [
      'CRED values craft and attention to detail',
      'Prepare for hard coding and design problems',
      'Know about rewards systems and fintech',
      'Show passion for building beautiful products',
    ],
    rounds: [
      { name: 'Coding Round', type: 'coding', questionCount: 3, timeLimit: 25, passingScore: 65, difficultyDistribution: { easy: 0, medium: 30, hard: 70 }, description: 'Hard algorithmic problems' },
      { name: 'System Design', type: 'technical', questionCount: 3, timeLimit: 25, passingScore: 65, difficultyDistribution: { easy: 0, medium: 20, hard: 80 }, description: 'Scalable system design for rewards and fintech' },
      { name: 'Craft & Culture', type: 'behavioral', questionCount: 2, timeLimit: 10, passingScore: 60, difficultyDistribution: { easy: 20, medium: 40, hard: 40 }, description: 'Passion for craft, product thinking, and pride in work' },
    ],
  },

  // ═══════════════════════════════════════════════
  // BFSI
  // ═══════════════════════════════════════════════

  'Goldman Sachs': {
    company: 'Goldman Sachs',
    fullName: 'Goldman Sachs Group Inc.',
    category: 'bfsi',
    description: 'HackerRank Test → Technical Rounds (2-3) → HR',
    totalDuration: '90-120 min',
    yearUpdated: 2026,
    interviewStyle: 'High bar for DSA, math, and systems. Finance domain knowledge valued.',
    tips: [
      'Practice HackerRank-style competitive programming',
      'Focus on graphs, DP, and mathematical problems',
      'Know about low-latency trading systems',
      'Database sharding and ACID at scale are important',
    ],
    rounds: [
      { name: 'HackerRank Coding', type: 'coding', questionCount: 3, timeLimit: 25, passingScore: 65, difficultyDistribution: { easy: 0, medium: 40, hard: 60 }, description: 'Competitive programming style problems' },
      { name: 'Technical Deep Dive', type: 'technical', questionCount: 4, timeLimit: 25, passingScore: 60, difficultyDistribution: { easy: 0, medium: 30, hard: 70 }, description: 'Low-latency systems, databases, and distributed computing' },
      { name: 'Behavioral / HR', type: 'behavioral', questionCount: 3, timeLimit: 12, passingScore: 55, difficultyDistribution: { easy: 20, medium: 50, hard: 30 }, description: 'Risk management, quality, and integrity' },
    ],
  },

  'Deloitte': {
    company: 'Deloitte',
    fullName: 'Deloitte Touche Tohmatsu Limited',
    category: 'bfsi',
    description: 'Aptitude → Technical → Case Study / Consulting → HR',
    totalDuration: '70-90 min',
    yearUpdated: 2026,
    interviewStyle: 'Consulting-oriented with strong analytical and communication focus',
    tips: [
      'Practice case study frameworks (profitability, market entry)',
      'Know about data governance and RPA',
      'Communication and presentation skills are paramount',
      'Understand Big Four differentiators',
    ],
    rounds: [
      { name: 'Aptitude Assessment', type: 'aptitude', questionCount: 3, timeLimit: 10, passingScore: 50, difficultyDistribution: { easy: 30, medium: 50, hard: 20 }, description: 'Quantitative, data interpretation, and verbal' },
      { name: 'Technical Interview', type: 'technical', questionCount: 4, timeLimit: 20, passingScore: 55, difficultyDistribution: { easy: 20, medium: 40, hard: 40 }, description: 'Enterprise tech, security, and automation' },
      { name: 'Case Study / Behavioral', type: 'behavioral', questionCount: 3, timeLimit: 15, passingScore: 55, difficultyDistribution: { easy: 10, medium: 50, hard: 40 }, description: 'Consulting scenarios, stakeholder management, and influence' },
      { name: 'HR Interview', type: 'hr', questionCount: 2, timeLimit: 8, passingScore: 50, difficultyDistribution: { easy: 50, medium: 50, hard: 0 }, description: 'Motivation and career aspirations' },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────

/** Get interview pattern for a company */
export function getInterviewPattern(company: string): CompanyInterviewPattern | undefined {
  return INTERVIEW_PATTERNS[company];
}

/** Get all available companies with patterns */
export function getAvailablePatterns(): string[] {
  return Object.keys(INTERVIEW_PATTERNS);
}

/** Get companies by category */
export function getCompaniesByCategory(category: CompanyInterviewPattern['category']): CompanyInterviewPattern[] {
  return Object.values(INTERVIEW_PATTERNS).filter(p => p.category === category);
}

/** Build a combined-mode question distribution from a pattern */
export function getCombinedModeDistribution(pattern: CompanyInterviewPattern, totalQuestions: number = 10): {
  type: InterviewRound;
  count: number;
  difficulty: { easy: number; medium: number; hard: number };
}[] {
  const totalInPattern = pattern.rounds.reduce((sum, r) => sum + r.questionCount, 0);

  return pattern.rounds.map(round => {
    const ratio = round.questionCount / totalInPattern;
    const count = Math.max(1, Math.round(totalQuestions * ratio));
    return {
      type: round.type,
      count,
      difficulty: round.difficultyDistribution,
    };
  });
}

/** Get total question count for a pattern */
export function getPatternTotalQuestions(pattern: CompanyInterviewPattern): number {
  return pattern.rounds.reduce((sum, r) => sum + r.questionCount, 0);
}

/** Get pattern summary for display */
export function getPatternSummary(company: string): string {
  const pattern = INTERVIEW_PATTERNS[company];
  if (!pattern) return 'Standard interview process';

  const roundNames = pattern.rounds.map(r => r.name);
  return roundNames.join(' → ');
}
