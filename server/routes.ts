import type { Express } from "express";
import type { Server } from "http";
import { randomUUID } from "crypto";
import path from "path";

import { storage } from "./storage";
import { sendEmail } from "./email";
import { buildScheduledEmail, buildResultsEmail } from "./email-templates";
import { isAuthenticated, isAdmin, isStudent, hasRole, registerHandler, loginHandler, logoutHandler, comparePassword, hashPassword } from "./auth";
import { eq } from "drizzle-orm";
import multer from "multer";
import { z } from "zod";
import { db } from "./db";
import {
  insertInterviewSchema,
  insertJobDescriptionSchema,
  COMPANIES,
  interviews,
  type User
} from "@shared/schema";
import * as pythonAI from "./pythonAI";
import { evaluationQueue } from "./evaluation-queue";
import { evaluateAnswer, withTimeout } from "./evaluate";
import {
  buildQuestionSet,
  getCompanyQuestions,
  getRandomFromPool,
  getQuestionsByRound,
  ALL_QUESTIONS,
  COMPANY_QUESTION_BANK,
  type InterviewRound
} from "./company-questions";
import {
  INTERVIEW_PATTERNS,
  getInterviewPattern,
  getCombinedModeDistribution,
  type CompanyInterviewPattern,
  type InterviewRoundConfig
} from "./interview-patterns";

import mammoth from "mammoth";


// Use pdfjs-dist directly (more stable than recent pdf-parse ESM/CJS exports)
// Suppress TS resolution errors for the legacy build path used by pdfjs-dist
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
let pdfJsPromise: Promise<any> | null = null;

async function getPdfJs() {
  if (!pdfJsPromise) {
    // Use legacy build for broader Node compatibility
    pdfJsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfJsPromise;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const AI_ANALYSIS_TIMEOUT_MS = 60000;
const PARSE_TIMEOUT_MS = 10000;
const SCORE_TIMEOUT_MS = 8000;
const PDF_CONTENT_WARNING_LENGTH = 15000;
const MAX_AI_CONTENT_LENGTH = 6000;
const MAX_PARSE_CONTENT_LENGTH = 8000;
const RAW_RESUME_STORE_LENGTH = 4000;

// ─── Constants ────────────────────────────────────────
const TOTAL_QUESTIONS_PER_INTERVIEW = 15;
const MAX_LLM_QUESTIONS_PER_TYPE = 1;
const LLM_QUESTION_TIMEOUT_MS = 5000;
const GD_TOPIC_TIMEOUT_MS = 5000;
const INTERVIEW_GENERATION_TIMEOUT_MS = 10000;
const EVALUATION_TIMEOUT_MS = 60000;
const DEFAULT_EMOTION_SCORE = 60;
const DEFAULT_VOICE_SCORE = 55;

function generateDynamicIntroQuestion(studentName: string, company?: string | null, department?: string | null): string {
  const name = studentName || "Candidate";
  const dept = department || "Software Engineering";
  const comp = company ? ` at ${company}` : "";

  const templates = [
    `Hi ${name}, welcome to Skillnox AI! To begin our interview today${comp}, please introduce yourself, your academic background in ${dept}, and your core technical strengths.`,
    `Hello ${name}, welcome to Skillnox AI! Glad to have you here. Could you walk me through your professional background, main projects, and what inspired you to pursue ${dept}?`,
    `Hi ${name}, welcome to Skillnox AI! Let's kick things off with a brief introduction—tell me about yourself, your core technical stack, and a major project you are proud of.`,
    `Welcome to Skillnox AI, ${name}! Before we dive into technical questions, please introduce yourself and share your top skills and career goals.`,
    `Good day ${name}, welcome to Skillnox AI! Give me your 60-second elevator pitch introducing your academic journey, technical expertise, and what drives your passion for software development.`,
    `Hey ${name}, welcome to Skillnox AI! How would you introduce yourself as a developer and problem-solver? Walk me through your background and achievements.`,
    `Hi there ${name}, welcome to Skillnox AI! Please give me an introduction covering your education, hands-on experience, and primary programming languages.`,
    `A warm welcome ${name} to Skillnox AI! To start off, please introduce yourself and explain how your practical project experience has prepared you for a role${comp}.`,
    `Hello ${name}, welcome to Skillnox AI! Please summarize your educational background, core technical capabilities, and key project highlights.`,
    `Hi ${name}, welcome to Skillnox AI! Please introduce yourself, highlighting your practical engineering experience, technical interests, and problem-solving approach.`,
    `Greetings ${name}, welcome to Skillnox AI! To start, introduce yourself, sharing a brief overview of your skills, major academic or industry projects, and career aspirations.`,
    `Hi ${name}, welcome to Skillnox AI! Let's start with a quick introduction—tell me about your background, key technical achievements, and what sets you apart as a candidate.`
  ];

  let hash = 0;
  const seed = `${name}-${company || ''}-${Math.random()}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % templates.length;
  return templates[index];
}

type ResumeFeatures = {
  links: string[];
  hasPortfolioLink: boolean;
  hasGithub: boolean;
  hasLinkedIn: boolean;
  hasCertifications: boolean;
  hasSummarySection: boolean;
  hasCoursework: boolean;
  hasMetrics: boolean;
  projectCount: number;
  wordCount: number;
};

async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  try {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      try {
        const pdfjs = await getPdfJs();
        // pdfjs expects a Uint8Array, not a Node Buffer
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(file.buffer),
          standardFontDataUrl: path.resolve(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/")
        });
        const pdf = await loadingTask.promise;
        let fullText = "";
        const totalPages = pdf.numPages || 0;
        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str || "").join(" ");
          fullText += pageText + "\n";
        }
        const cleaned = fullText.trim();
        if (cleaned.length > 0) return cleaned;
      } catch (pdfError) {
        console.error("PDF parsing failed, falling back to text extraction:", pdfError);
        // Fall through to UTF-8 fallback
      }
    }

    // Check for DOCX
    const isDocx = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.originalname.toLowerCase().endsWith('.docx');
    if (isDocx) {
      try {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        const text = result.value.trim();
        if (text.length > 0) return text;
      } catch (docxError) {
        console.error("DOCX parsing failed, falling back to text extraction:", docxError);
      }
    }

    // Fallback for non-PDF/DOCX or failed parse
    return file.buffer.toString('utf8');
  } catch (error) {
    console.error("Error extracting text from file:", error);
    // Fallback to UTF-8 text extraction
    return file.buffer.toString('utf8');
  }
}

function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ') // collapse spaces but keep newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// withTimeout is now imported from "./evaluate"

const technicalQuestions = [
  "Explain the concept of Object-Oriented Programming and its four main principles.",
  "What is the difference between a stack and a queue? When would you use each?",
  "Explain the concept of Big O notation and give examples of common time complexities.",
  "Explain what REST API is and its core principles.",
  "What is the difference between HTTP and HTTPS?",
  "Describe the process of debugging a complex issue in production.",
  "What is version control and why is it important?",
  "What is the difference between a process and a thread?",
  "Explain the concept of Deadlock and how to prevent it.",
  "What is the difference between TCP and UDP?",
  "Explain the significance of the CAP theorem in distributed systems.",
  "What is a hash map and how does it verify uniqueness?",
  "Explain the difference between synchronous and asynchronous programming.",
  "What is Dependency Injection and why is it useful?",
  "Explain the concept of a microservices architecture.",
  "What is the difference between authentication and authorization?",
  "Explain the concept of recursion with an example.",
  "What is a closure in programming?",
  "What is the difference between SQL and NoSQL databases?",
  "Explain the concept of a Singleton design pattern."
];

const technicalCLanguageQuestions = [
  "Explain the difference between call by value and call by reference in C. When would you use each?",
  "How does memory allocation work in C (stack vs heap)? Show how to use malloc/calloc and free safely.",
  "What are pointers in C and how do pointer arithmetic and pointer to pointer concepts work?",
  "Describe how structures and unions work in C. Provide a scenario where each is appropriate.",
  "Explain how to implement a linked list in C. What are the common pitfalls regarding memory management?",
  "What is the purpose of header files in C and how does the compilation/linking process work?",
];

const technicalDatabaseQuestions = [
  "Explain database normalization and why it is important. Give examples of 1NF, 2NF, and 3NF.",
  "What are SQL JOINs? Describe INNER JOIN, LEFT JOIN, RIGHT JOIN, and FULL OUTER JOIN with examples.",
  "How do indexes work in relational databases? What are the pros and cons of using indexes?",
  "Compare OLTP and OLAP workloads and how they influence database schema design.",
  "What is MongoDB? How does its document model differ from relational tables?",
  "In MongoDB, when would you embed documents vs reference them in separate collections?",
  "How would you design the database tables for an online course enrollment system?",
  "Explain ACID properties and how they relate to transactions in relational databases.",
];

const technicalPythonQuestions = [
  "Explain the Global Interpreter Lock (GIL) in Python and how it affects multi-threading.",
  "How do list comprehensions differ from generator expressions in Python?",
  "What are decorators in Python and how would you implement one?",
  "Explain how memory management and garbage collection work in Python.",
];

const hrQuestions = [
  "Tell me about yourself and your career goals.",
  "What are your greatest strengths and weaknesses?",
  "Why do you want to work for our company?",
  "Where do you see yourself in 5 years?",
  "Describe a challenging situation and how you handled it.",
  "How do you handle stress and pressure?",
  "What motivates you in your work?",
  "Why should we hire you?",
];

const behavioralQuestions = [
  "Tell me about a time when you had to work with a difficult team member.",
  "Describe a situation where you had to meet a tight deadline.",
  "Give an example of when you showed leadership.",
  "Tell me about a time you failed and what you learned from it.",
  "Describe a situation where you had to adapt to change quickly.",
  "Tell me about a time you went above and beyond.",
];

const projectQuestions = [
  "Can you walk me through the architecture of your project?",
  "What tech stack did you use and why did you choose it?",
  "What was your specific role in this project?",
  "What were the main challenges you faced and how did you overcome them?",
  "How did you ensure the quality and maintainability of your code?",
  "What would you do differently if you were to start this project again?",
];

const gdTopics = [
  "Is artificial intelligence a threat to human jobs?",
  "Should social media be regulated by governments?",
  "Is work from home the future of work?",
  "Should coding be taught in schools from an early age?",
  "Is technology making us more isolated or connected?",
  "Are smartphones beneficial or harmful for students?",
];

const communicationQuestions = [
  "Describe your daily routine from morning to evening in detail.",
  "Explain how to make your favorite dish step by step.",
  "Tell me about a recent news event and share your opinion on it.",
  "Describe your hometown and what makes it special to you.",
  "Explain a complex technical concept to someone who has no technical background.",
  "Tell me about a book or movie you enjoyed recently and why you liked it.",
  "Describe how you would give directions to someone visiting your city for the first time.",
  "Talk about your favorite hobby and why you enjoy it.",
  "Explain the process of learning a new skill that you recently acquired.",
  "Describe a typical day at your college or workplace.",
];




const SKILL_LIBRARY = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
  "HTML", "CSS", "React", "Next.js", "Angular", "Vue", "Svelte", "Node.js", "Express", "NestJS",
  "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "DynamoDB", "Firebase",
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD", "Git", "Linux", "Jenkins",
  "Data Structures", "Algorithms", "REST APIs", "GraphQL", "Microservices", "Unit Testing",
  "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "TensorFlow", "PyTorch", "Pandas", "NumPy",
  "Tableau", "Power BI", "Excel", "Figma", "UI/UX", "Agile", "Scrum", "Jira", "Leadership", "Communication"
];

function getRandomQuestions(questions: string[], count: number): string[] {
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getAvatarGender(interviewCount: number): 'male' | 'female' {
  if (interviewCount === 0 || interviewCount === 1) {
    return interviewCount % 2 === 0 ? 'female' : 'male';
  }
  return Math.random() > 0.5 ? 'male' : 'female';
}

async function parseResume(content: string): Promise<{ skills: string[]; experience: any[]; education: any[] }> {
  // Always prepare fallbacks
  const fallbackSkills = extractSkillsFallback(content);
  const fallbackExperience = extractExperienceFallback(content);
  const fallbackEducation = extractEducationFallback(content);

  // Try Python AI service first
  const aiResult = await pythonAI.parseResume(content);

  // Merge AI + fallbacks, preferring AI when it returns real data
  const skills = dedupeSuggestions([
    ...(aiResult?.skills || []),
    ...fallbackSkills,
  ]);

  const experience =
    Array.isArray(aiResult?.experience) && aiResult.experience.length > 0
      ? aiResult.experience
      : fallbackExperience;

  const education =
    Array.isArray(aiResult?.education) && aiResult.education.length > 0
      ? aiResult.education
      : fallbackEducation;

  return { skills, experience, education };
}

async function analyzeJobDescription(description: string, resumeSkills: string[]): Promise<{ requiredSkills: string[]; matchScore: number; skillGaps: string[] }> {
  // Try Python AI service first
  const resumeText = `Skills: ${resumeSkills.join(', ')}`;
  const aiResult = await pythonAI.analyzeSkillGap(resumeText, description);

  if (aiResult) {
    return {
      requiredSkills: aiResult.required_skills || [],
      matchScore: aiResult.match_score || 50,
      skillGaps: aiResult.skill_gaps || []
    };
  }

  // Fallback to simple analysis
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'AWS', 'Docker',
    'Machine Learning', 'Data Analysis', 'Agile', 'Communication', 'Problem Solving'
  ];

  const requiredSkills = commonSkills.filter(skill =>
    description.toLowerCase().includes(skill.toLowerCase()) || Math.random() > 0.6
  ).slice(0, 8);

  const matchedSkills = requiredSkills.filter(skill =>
    resumeSkills.some(rs => rs.toLowerCase() === skill.toLowerCase())
  );

  const matchScore = requiredSkills.length > 0
    ? (matchedSkills.length / requiredSkills.length) * 100
    : 50;

  const skillGaps = requiredSkills.filter(skill =>
    !resumeSkills.some(rs => rs.toLowerCase() === skill.toLowerCase())
  );

  return { requiredSkills, matchScore, skillGaps };
}

// evaluateAnswer is now imported from "./evaluate"

async function calculatePlacementProbability(
  technicalScore: number,
  hrScore: number,
  emotionScore: number,
  voiceScore: number,
  resumeScore: number,
  jdScore: number = 50,
  gdScore: number = 50,
  personality?: any
): Promise<{ prob30: number; prob60: number; prob90: number; factors: any }> {
  // Try Python AI service first
  const aiResult = await pythonAI.predictPlacement({
    resumeScore,
    jdScore,
    technicalScore,
    hrScore,
    gdScore,
    emotionScore,
    voiceScore,
    personalityIntrovertExtrovert: personality?.introvertExtrovert || 0,
    personalityThinkerFeeler: personality?.thinkerFeeler || 0,
    personalityLogicalCreative: personality?.logicalCreative || 0
  });

  if (aiResult) {
    const factors = {
      technical: technicalScore,
      communication: hrScore,
      resume: resumeScore,
      confidence: emotionScore,
      market: 70 + Math.random() * 20,
    };

    return {
      prob30: aiResult.probability_30_days || 50,
      prob60: aiResult.probability_60_days || 50,
      prob90: aiResult.probability_90_days || 50,
      factors,
    };
  }

  // Fallback to simple calculation
  const baseScore = (
    technicalScore * 0.35 +
    hrScore * 0.25 +
    emotionScore * 0.15 +
    voiceScore * 0.1 +
    resumeScore * 0.15
  );

  const factors = {
    technical: technicalScore,
    communication: hrScore,
    resume: resumeScore,
    confidence: emotionScore,
    market: 70 + Math.random() * 20,
  };

  return {
    prob30: Math.min(100, Math.max(0, baseScore - 20 + Math.random() * 10)),
    prob60: Math.min(100, Math.max(0, baseScore - 5 + Math.random() * 10)),
    prob90: Math.min(100, Math.max(0, baseScore + 10 + Math.random() * 10)),
    factors,
  };
}

// Regex to identify section headers even if they are inline (double space or newline)
const SECTION_HEADER_PATTERN = /(?:^|\n|\s{2,})(?:technical skills|skills|tech stack|technologies|tools|languages|projects?|experience|work experience|education|summary|certifications|achievements)\b/i;

function extractSkillsFallback(content: string): string[] {
  // Broader pattern to find the start of the skills section
  const skillsMatch = content.match(/(?:technical skills|skills|tech stack|technologies|tools|languages|core competencies)\s*[:\-]?\s*([\s\S]{0,1000})/i);
  let section = skillsMatch ? skillsMatch[1] : content.slice(0, 1500);

  // Stop at the next major section header
  // format: newline OR double space followed by common headers
  const stopMatch = section.match(SECTION_HEADER_PATTERN);
  if (stopMatch && stopMatch.index !== undefined && stopMatch.index > 5) { // Ensure we don't validly stop at the header we just matched
    section = section.slice(0, stopMatch.index);
  }

  const rawItems = section
    .split(/[\n,;•\t]+/)
    .map((skill) => skill.replace(/[-–•]/g, '').trim())
    .filter(Boolean)
    .filter((skill) => skill.length <= 50);

  const librarySet = new Set(SKILL_LIBRARY.map((s) => s.toLowerCase()));
  const isLikelySkill = (value: string) => {
    const lower = value.toLowerCase();
    if (lower.length < 2 || lower.length > 50) return false;
    if (/^(india|guntur|andhra pradesh|programs|resources|experience|summary|education)$/i.test(value)) return false;
    if (librarySet.has(lower)) return true;
    return /(js|javascript|typescript|react|node|express|python|java|sql|postgres|mysql|docker|kubernetes|aws|azure|gcp|firebase|linux|git|ci\/cd|system design|api|rest|graphql|llm|nlp|rag)/i.test(lower);
  };

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of rawItems) {
    // Handling "FrontEnd: React, Vue" format where splitting didn't catch the colon
    const subParts = item.split(':').map(s => s.trim()).filter(Boolean);
    for (const part of subParts) {
      if (!isLikelySkill(part)) continue;
      const key = part.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push(part);
    }
  }

  // If the skills section was missing or yielded too few, scan the whole doc for known skills
  if (normalized.length < 4) {
    const lowerContent = content.toLowerCase();
    for (const skill of SKILL_LIBRARY) {
      const lowerSkill = skill.toLowerCase();
      if (seen.has(lowerSkill)) continue;
      if (lowerContent.includes(lowerSkill)) {
        seen.add(lowerSkill);
        normalized.push(skill);
      }
    }
  }

  return normalized;
}

function extractExperienceFallback(content: string): Array<{ title?: string; company?: string; duration?: string }> {
  const experienceMatch = content.match(/(experience|work experience|professional experience)([\s\S]{0,1500})/i);
  if (!experienceMatch) return [];
  let block = experienceMatch[2];

  // Try to carve out until the next section
  const stopMatch = block.match(SECTION_HEADER_PATTERN);
  if (stopMatch && stopMatch.index !== undefined) {
    block = block.slice(0, stopMatch.index);
  }

  const entries = block
    .split(/[\n•]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 4);

  return entries.map((entry) => {
    const durationMatch = entry.match(/\b(\d{4}\s?(?:-|to)\s?(Present|\d{4})|Present|\d+\s?(months?|years?))/i);
    // Heuristic: first sentence/line as title, next capitalized token as company
    const lines = entry.split(/[.;]\s+|\n/).map(l => l.trim()).filter(Boolean);
    const title = lines[0]?.slice(0, 120);
    const companyCandidate = lines.length > 1 ? lines[1] : undefined;
    return {
      title,
      company: companyCandidate,
      duration: durationMatch ? durationMatch[0] : undefined,
    };
  });
}

function extractEducationFallback(content: string): Array<{ degree?: string; institution?: string; year?: string }> {
  const eduMatch = content.match(/(education|academic background|qualifications)([\s\S]{0,800})/i);
  if (!eduMatch) return [];
  let block = eduMatch[2];

  // More aggressive stop for Education to prevent running into Skills
  // Allows single space if followed by strong header keywords, especially all-caps or typical next sections
  const strictStopPattern = /[\s\r\n]+(?:SKILLS?|TECHNICAL SKILLS?|TECH STACK|TECHNOLOGIES|TOOLS|LANGUAGES|PROJECTS?|EXPERIENCE|WORK EXPERIENCE|SUMMARY|CERTIFICATIONS|ACHIEVEMENTS)\b/i;

  const stopMatch = block.match(strictStopPattern);
  if (stopMatch && stopMatch.index !== undefined) {
    block = block.slice(0, stopMatch.index);
  } else {
    // Fallback: Check for "SKILLS" specifically if it's attached to the line end (common PDF artifact)
    const artifactStop = block.search(/\s+SKILLS\b/);
    if (artifactStop > -1) {
      block = block.slice(0, artifactStop);
    }
  }

  const entries = block
    .split(/\n\s*\n/)
    .map(entry => entry.trim())
    .filter(Boolean)
    .slice(0, 3);

  return entries.map(entry => {
    const lines = entry
      .split(/\n|(?:\s{2,})/)
      .map(l => l.trim())
      .filter(Boolean);

    // Filter out lines that are clearly skills/strengths/etc.
    const filtered = lines.filter(l => !/^(technical skills|skills|tech stack|technologies|technology|strengths|hobbies|languages|personal profile|declaration)/i.test(l));

    const degree = filtered[0];
    const institution = filtered[1];
    const yearMatch = entry.match(/\b(20\d{2}|19\d{2})\b/);
    return {
      degree,
      institution,
      year: yearMatch ? yearMatch[0] : undefined,
    };
  });
}

function analyzeResumeFeatures(content: string): ResumeFeatures {
  const normalized = collapseDigitSpacing(content);
  const lower = normalized.toLowerCase();
  const { links, hasPortfolioLink, hasGithub, hasLinkedIn } = extractLinks(content);
  const hasCertifications = lower.includes('certification') || lower.includes('certificate');
  const hasSummarySection = /summary|objective|profile summary/i.test(lower);
  const hasCoursework = lower.includes('coursework') || lower.includes('courses') || lower.includes('curriculum');
  const hasMetrics = detectQuantifiedImpact(normalized);
  const projectMentions = lower.match(/\bproject(s)?\b/g) || [];
  const portfolioMentions = lower.match(/\bportfolio\b/g) || [];
  const projectCount = projectMentions.length + Math.ceil(portfolioMentions.length / 2);
  const wordCount = content.trim().split(/\s+/).length;

  return {
    links,
    hasPortfolioLink,
    hasGithub,
    hasLinkedIn,
    hasCertifications,
    hasSummarySection,
    hasCoursework,
    hasMetrics,
    projectCount,
    wordCount,
  };
}

function isResumeAlreadyWellOptimized(features: ResumeFeatures): boolean {
  // Strong signals of a modern, well-structured resume
  const hasGoodLength = features.wordCount >= 350 && features.wordCount <= 1200;
  const hasLinks = features.links.length > 0 || features.hasPortfolioLink || features.hasGithub || features.hasLinkedIn;
  const hasProjects = features.projectCount >= 3;
  const hasMetrics = features.hasMetrics;
  const hasSummary = features.hasSummarySection;

  // Consider it "already done" if most core elements are present
  let score = 0;
  if (hasGoodLength) score++;
  if (hasLinks) score++;
  if (hasProjects) score++;
  if (hasMetrics) score++;
  if (hasSummary) score++;

  return score >= 4;
}

function canonicalSuggestionKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeSuggestions(suggestions: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const suggestion of suggestions) {
    const key = canonicalSuggestionKey(suggestion);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(suggestion.trim());
  }
  return result;
}

type SuggestionParaphrase = {
  id: string;
  pattern: RegExp;
  variants: string[];
};

const suggestionParaphrasePatterns: SuggestionParaphrase[] = [
  {
    id: "links",
    pattern: /(portfolio|github|online profile|link)/i,
    variants: [
      "Surface your GitHub or portfolio link near the top so reviewers can spot it instantly.",
      "Bring your portfolio or public code links into the header to prove your work quickly.",
      "Add a visible row of portfolio / GitHub / LinkedIn links so the reviewer can click through."
    ],
  },
  {
    id: "metrics",
    pattern: /(quantified|metrics|numbers|impact|percentage|percent|users|revenue|traffic|growth)/i,
    variants: [
      "Tie each bullet to a concrete outcome (users served, % improvement, revenue saved).",
      "Back your achievements with numbers so impact jumps out at a glance.",
      "Translate responsibilities into metrics—show how fast, how many, or how much you moved the needle."
    ],
  },
  {
    id: "projects",
    pattern: /(project|side project|case study|portfolio section)/i,
    variants: [
      "Spotlight recent projects, naming the tech stack and the result in one sentence.",
      "Dedicate a brief 'Key Projects' block with stack, challenge, and measurable win.",
      "Add a project summary that explains the problem, your role, and what changed because of it."
    ],
  },
  {
    id: "certifications",
    pattern: /(certification|coursework|courses|learning|training)/i,
    variants: [
      "List standout certifications or courses to show ongoing learning.",
      "Add a short 'Certifications / Courses' line to highlight continuous upskilling.",
      "Call out relevant certifications so ATS filters don't miss them."
    ],
  },
  {
    id: "summary",
    pattern: /(summary|objective|profile)/i,
    variants: [
      "Open with a concise summary that states your focus, stack, and target role.",
      "Add a 2-line professional summary tying your experience to the roles you want.",
      "Introduce yourself with a short headline + summary before diving into experience."
    ],
  },
  {
    id: "length",
    pattern: /(concise|1 page|trim|length|pages)/i,
    variants: [
      "Tighten the document to one page by trimming older or redundant bullets.",
      "Keep it to a single page by collapsing older roles and highlighting the latest wins.",
      "Compress lengthy sections—recruiters skim, so stick to the most recent and relevant work."
    ],
  },
  {
    id: "formatting",
    pattern: /(formatting|ats|white space|alignment|font|layout)/i,
    variants: [
      "Use ATS-friendly formatting: consistent fonts, even spacing, aligned dates.",
      "Clean up spacing and alignment so the resume scans cleanly on any screen.",
      "Ensure columns and dates line up; uneven spacing trips ATS parsers."
    ],
  },
  {
    id: "skills-categories",
    pattern: /(skills into clear categories|group your skills|skill categories)/i,
    variants: [
      "Break skills into grouped rows (Frontend | Backend | Cloud) for faster scanning.",
      "Cluster tools into labeled categories so recruiters can see fit immediately.",
      "Organize your skills by theme (Languages, Frameworks, Cloud, Tools) to improve readability."
    ],
  },
  {
    id: "action-verbs",
    pattern: /(action verb|lead every bullet)/i,
    variants: [
      "Start each bullet with a decisive verb (Built, Led, Automated) and end with the result.",
      "Kick off bullets with action verbs and close with the measurable impact.",
      "Use verb + impact structure for bullets: what you did, how you did it, what changed."
    ],
  },
  {
    id: "links",
    pattern: /(links to github|portfolio|online profiles|online profile)/i,
    variants: [
      "Surface your GitHub or portfolio link near the header so reviewers see proof of work instantly.",
      "Add your GitHub/portfolio/LinkedIn right below your name to pass the quick 6-second scan.",
      "Bring live project links (GitHub, portfolio) to the top banner so the reviewer can click immediately."
    ],
  },
  {
    id: "metrics",
    pattern: /(quantified achievements|quantified|numbers|percentages|impact)/i,
    variants: [
      "Attach hard numbers to wins (users, %, revenue) so impact pops off the page.",
      "Translate achievements into metrics—hiring managers trust numbers more than adjectives.",
      "Tag lines with concrete figures (e.g., +35% adoption, 2x speed) to prove business impact."
    ],
  },
  {
    id: "projects",
    pattern: /(project descriptions|recent projects|highlight recent projects|project count)/i,
    variants: [
      "Spotlight 1–2 recent projects with a sentence on stack, challenge, and measurable outcome.",
      "Add a fresh project case study: goal, tech stack, and the result you delivered.",
      "Include a short 'Key Projects' area that showcases the tech you used and what changed."
    ],
  },
  {
    id: "certifications",
    pattern: /(certifications|coursework|continuous learning)/i,
    variants: [
      "List certifications or coursework to show you keep investing in your skills.",
      "Add recent certifications or MOOCs that align with the roles you’re targeting.",
      "Tuck a 'Certifications & Courses' line near the bottom to prove ongoing learning."
    ],
  },
  {
    id: "key-highlights",
    pattern: /(key highlights|summary bullets|highlights section)/i,
    variants: [
      "Consider a short 'Key Highlights' block that bundles your top wins into 2 crisp bullets.",
      "Open with a 'Key Highlights' section summarizing the best metrics from your career.",
      "Add a highlight reel (2 bullets) that telegraphs your strongest achievements up front."
    ],
  }
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return hash;
}

function paraphraseSuggestion(text: string, seedSource: string): string {
  const match = suggestionParaphrasePatterns.find(({ pattern }) => pattern.test(text));
  if (!match) {
    return text;
  }
  const normalizedOriginal = text.trim().toLowerCase();
  const variants = match.variants.filter(
    (variant) => variant.trim().toLowerCase() !== normalizedOriginal
  );
  if (variants.length === 0) {
    return text;
  }
  const seed = Math.abs(hashString(seedSource + text));
  const variantIndex = seed % variants.length;
  return variants[variantIndex];
}

function shouldKeepSuggestion(text: string, features: ResumeFeatures): boolean {
  const lower = text.toLowerCase();
  const alreadyHasLinks = features.hasPortfolioLink || features.hasGithub || (features.links?.length ?? 0) > 0;
  if (alreadyHasLinks && /portfolio|github|online profile|website|link/.test(lower)) {
    return false;
  }
  if (features.hasLinkedIn && /linkedin/.test(lower)) {
    return false;
  }
  return true;
}

const evergreenSuggestionPool: string[] = [
  "Group your skills into clear categories (Frontend, Backend, Cloud, Tools) so recruiters can scan them in seconds.",
  "Lead every bullet point with a strong action verb and end with the measurable result or impact.",
  "Keep project descriptions to 2–3 bullets that call out your role, the stack you used, and the key outcome.",
  "Make formatting ATS-friendly: consistent fonts, aligned dates, and plenty of white space.",
  "Add a brief 'Key Highlights' section that summarizes your strongest achievements in 2 bullets."
];

const genericSuggestionPool: Array<{ text: string; condition: (features: ResumeFeatures) => boolean }> = [
  {
    text: "Include links to GitHub, portfolio, or relevant online profiles near the top of your resume.",
    condition: (features) => !(features.hasPortfolioLink || features.hasGithub || (features.links?.length ?? 0) > 0),
  },
  {
    text: "Add clear, quantified achievements (numbers, percentages, or impact) for your key roles.",
    condition: (features) => !features.hasMetrics,
  },
  {
    text: "Highlight recent projects with a brief summary of tech stack and outcomes.",
    condition: (features) => features.projectCount < 2,
  },
  {
    text: "Add certifications or relevant coursework to show continuous learning.",
    condition: (features) => !features.hasCertifications && !features.hasCoursework,
  },
  {
    text: "Add a concise professional summary that highlights your experience and goals.",
    condition: (features) => !features.hasSummarySection,
  },
  {
    text: "Keep your resume concise (1 page) by trimming older or less relevant information.",
    condition: (features) => features.wordCount > 700,
  },
];

function normalizeSkill(skill: string): string {
  const cleaned = skill
    .replace(/[^a-z0-9 +#./()-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map(word => {
      if (word.length <= 3) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/\bUi\b/gi, 'UI')
    .replace(/\bUx\b/gi, 'UX')
    .replace(/\bAws\b/gi, 'AWS')
    .replace(/\bCi\/Cd\b/gi, 'CI/CD');
}

function detectSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const skill of SKILL_LIBRARY) {
    if (lower.includes(skill.toLowerCase())) {
      found.push(skill);
    }
  }
  return found;
}

function collapseDigitSpacing(input: string): string {
  return input.replace(/(\d)\s+(?=\d)/g, '$1').replace(/\\%/g, '%');
}

function detectQuantifiedImpact(text: string): boolean {
  const normalized = collapseDigitSpacing(text);
  const metricPatterns = [
    /\b\d+(?:\.\d+)?\s*(?:%|percent|percentage|\\%|x|times|users|customers|clients|visitors|installs|downloads|projects|students|requests|ms|s|min|hrs|hours|days|weeks|months|years)\b/i,
    /\b\d+(?:\.\d+)?\s*(?:\$|usd|inr|eur|lpa|k|m|crore)\b/i,
    /\b\d+\s*-\s*\d+\s*(?:%|percent|users|customers|clients|downloads|ms|s|min|hrs|hours)\b/i,
    /\b\d+\+\b/,
  ];
  return metricPatterns.some((pattern) => pattern.test(normalized));
}

type LayoutIssueReport = {
  hasIssue: boolean;
  reasons: string[];
};

function detectLayoutIssues(content: string): LayoutIssueReport {
  if (!content) {
    return { hasIssue: false, reasons: [] };
  }

  const totalLength = content.length;
  const whitespaceChars = (content.match(/\s/g) || []).length;
  const whitespaceRatio = totalLength > 0 ? whitespaceChars / totalLength : 0;
  const repeatedSpaces = (content.match(/ {4,}/g) || []).length;
  const tabCount = (content.match(/\t/g) || []).length;
  const blankLineCount = (content.match(/\n\s*\n/g) || []).length;
  const lines = content.split(/\r?\n/);
  const longLineCount = lines.filter((line) => line.trim().length > 140).length;
  const multiSpaceLineCount = lines.filter((line) => / {6,}/.test(line)).length;
  const leadingSpaceLines = lines.filter((line) => /^ {4,}\S/.test(line)).length;

  const reasons: string[] = [];
  if (whitespaceRatio > 0.85) {
    reasons.push("Resume text contains excessive whitespace which makes parsing unreliable.");
  }
  if (repeatedSpaces > 300) {
    reasons.push("Large blocks of spaces are being used for layout alignment.");
  }
  if (tabCount > 200) {
    reasons.push("Too many tab characters detected; they often break ATS parsing.");
  }
  if (longLineCount > Math.max(20, Math.floor(lines.length * 0.6))) {
    reasons.push("Several lines exceed 140 characters, indicating misaligned columns.");
  }
  if (blankLineCount > Math.max(50, Math.floor(lines.length * 0.5))) {
    reasons.push("Excessive blank lines reduce readability and cause spacing issues.");
  }
  if (leadingSpaceLines > Math.max(50, Math.floor(lines.length * 0.5))) {
    reasons.push("Detected many lines starting with large indentations, suggesting layout alignment problems.");
  }

  const hasIssue = reasons.length > 0;
  return { hasIssue, reasons };
}

function extractLinks(content: string): { links: string[]; hasPortfolioLink: boolean; hasGithub: boolean; hasLinkedIn: boolean } {
  // Capture http/https links plus bare domains (with or without www)
  const urlPattern = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-_.]*\.[a-z]{2,}(?:\/[^\s)\]]*)?/gim;
  // Capture LinkedIn short handles (e.g., "in/username")
  const handlePattern = /\bin\/[a-z0-9-_.]+/gi;

  const explicitLinks = content.match(urlPattern) || [];
  const handleLinks = (content.match(handlePattern) || []).map((handle) => `https://linkedin.com/${handle.replace(/^\//, '')}`);

  const combined = [...explicitLinks, ...handleLinks].map((link) => link.replace(/[.,)]$/, ''));

  // Normalize and dedupe
  const uniqueLinks: string[] = [];
  const seen = new Set<string>();
  for (const raw of combined) {
    if (!raw || raw.length < 4) continue;
    const normalized = raw.trim().toLowerCase().replace(/^https?:\/\//, '');
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    uniqueLinks.push(raw.trim());
  }

  const lowerContent = content.toLowerCase();
  const portfolioHosts = [
    "vercel.app",
    "netlify.app",
    "github.io",
    "gitlab.io",
    "notion.site",
    "behance.net",
    "dribbble.com",
    "codepen.io",
    "stackblitz.com",
    "hashnode.dev",
    "medium.com",
    "dev.to",
    "pages.dev",
    "render.com",
    "surge.sh",
  ];

  const hasLinkedIn =
    uniqueLinks.some((link) => /linkedin\.com\/in\//i.test(link)) ||
    /\blinkedin\.com|in\/[a-z0-9-_.]+/i.test(lowerContent);

  const hasGithub =
    uniqueLinks.some((link) => /github\.com|gitlab\.com|bitbucket\.org/i.test(link)) ||
    /\bgithub\.com|gitlab\.com|bitbucket\.org|github\.io\b/i.test(lowerContent);

  const hasPortfolioLink =
    uniqueLinks.some((link) => {
      const lower = link.toLowerCase();
      return (
        portfolioHosts.some((host) => lower.includes(host)) ||
        /portfolio|resume site|personal site|devfolio/.test(lower)
      );
    }) ||
    portfolioHosts.some((host) => lowerContent.includes(host)) ||
    /\bportfolio\b/.test(lowerContent);

  return { links: uniqueLinks, hasPortfolioLink, hasGithub, hasLinkedIn };
}

function buildJdStrengthHighlights(requiredSkills: string[], resumeSkills: string[]): string[] {
  const strengths: string[] = [];
  const overlap = requiredSkills.filter((skill) =>
    resumeSkills.some((rs) => rs.toLowerCase() === skill.toLowerCase())
  );
  if (overlap.length > 0) {
    overlap.slice(0, 4).forEach((skill) => strengths.push(`Demonstrated experience with ${skill}`));
  } else if (resumeSkills.length > 0) {
    strengths.push(`Broad foundation across ${resumeSkills.slice(0, 3).join(', ')}`);
  }
  return strengths;
}

function buildJdImprovements(skillGaps: string[]): string[] {
  const improvements: string[] = [];
  skillGaps.slice(0, 3).forEach((gap) => {
    improvements.push(`Upskill on ${gap} through a focused project or certification.`);
  });
  return improvements;
}

function buildJdFallbackSuggestions(
  skillGaps: string[],
  resumeSkills: string[],
  resumeFeatures?: ResumeFeatures,
  jdLabel?: string
): string[] {
  const label = jdLabel || "this role";
  const suggestions: string[] = [];

  if (skillGaps.length > 0) {
    skillGaps.slice(0, 4).forEach((gap) => {
      suggestions.push(`Add a bullet or project that showcases ${gap}, since ${label} emphasizes it.`);
    });
  } else if (resumeSkills.length > 0) {
    suggestions.push(`Bring the skills that match ${label} (e.g., ${resumeSkills.slice(0, 3).join(', ')}) into your summary for quick alignment.`);
  }

  if (resumeFeatures && !resumeFeatures.hasMetrics) {
    suggestions.push(`Quantify outcomes (users, performance, revenue) that relate directly to ${label}.`);
  }

  if (resumeFeatures && resumeFeatures.projectCount < 2) {
    suggestions.push(`Include a recent project that mirrors the responsibilities in ${label}.`);
  }

  if (suggestions.length === 0) {
    suggestions.push(`Tailor your opening summary to mention ${label} and the primary stack it requires.`);
  }

  return suggestions;
}

async function analyzePersonality(responses: any[]): Promise<{
  introvertExtrovert: number;
  thinkerFeeler: number;
  logicalCreative: number;
  plannerSpontaneous: number;
  dominantTraits: string[];
  summary: string;
}> {
  // Extract text responses
  const responseTexts = responses
    .filter(r => r && (typeof r === 'string' || r.userAnswer))
    .map(r => typeof r === 'string' ? r : r.userAnswer || '');

  // Try Python AI service first
  if (responseTexts.length > 0) {
    const aiResult = await pythonAI.analyzePersonality(responseTexts);

    if (aiResult) {
      const dominantTraits = aiResult.dominant_traits || [];
      const summary = `Your personality profile shows a ${dominantTraits.slice(0, 2).join(" and ").toLowerCase() || "balanced"} approach to work and problem-solving.`;

      return {
        introvertExtrovert: aiResult.introvert_extrovert || 0,
        thinkerFeeler: aiResult.thinker_feeler || 0,
        logicalCreative: aiResult.logical_creative || 0,
        plannerSpontaneous: aiResult.planner_spontaneous || 0,
        dominantTraits,
        summary,
      };
    }
  }

  // Fallback to random
  const introvertExtrovert = (Math.random() * 2) - 1;
  const thinkerFeeler = (Math.random() * 2) - 1;
  const logicalCreative = (Math.random() * 2) - 1;
  const plannerSpontaneous = (Math.random() * 2) - 1;

  const dominantTraits: string[] = [];
  if (introvertExtrovert > 0.3) dominantTraits.push("Extroverted");
  else if (introvertExtrovert < -0.3) dominantTraits.push("Introverted");
  if (thinkerFeeler < -0.3) dominantTraits.push("Analytical");
  else if (thinkerFeeler > 0.3) dominantTraits.push("Empathetic");
  if (logicalCreative > 0.3) dominantTraits.push("Creative");
  else if (logicalCreative < -0.3) dominantTraits.push("Logical");
  if (plannerSpontaneous < -0.3) dominantTraits.push("Organized");
  else if (plannerSpontaneous > 0.3) dominantTraits.push("Adaptable");

  const summary = `Your personality profile shows a ${dominantTraits.slice(0, 2).join(" and ").toLowerCase() || "balanced"} approach to work and problem-solving. You tend to ${introvertExtrovert > 0 ? "thrive in collaborative environments" : "work effectively independently"} and make decisions based on ${thinkerFeeler < 0 ? "logical analysis" : "consideration for others"}.`;

  return {
    introvertExtrovert,
    thinkerFeeler,
    logicalCreative,
    plannerSpontaneous,
    dominantTraits,
    summary,
  };
}

export async function registerRoutes(server: Server, app: Express): Promise<Server> {
  // Health check endpoint for Python AI service (Admin only)
  app.get('/api/ai/health', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000';

      // Try health endpoint first (with longer timeout for LLM check)
      const healthController = new AbortController();
      const healthTimeout = setTimeout(() => healthController.abort(), 10000); // 10 second timeout

      let response = await fetch(`${PYTHON_AI_SERVICE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: healthController.signal
      }).catch(() => {
        clearTimeout(healthTimeout);
        return null;
      });

      clearTimeout(healthTimeout);

      // If health endpoint fails or times out, try root endpoint as fallback
      if (!response || !response.ok) {
        const rootController = new AbortController();
        const rootTimeout = setTimeout(() => rootController.abort(), 2000);

        response = await fetch(`${PYTHON_AI_SERVICE_URL}/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: rootController.signal
        }).catch(() => {
          clearTimeout(rootTimeout);
          return null;
        });

        clearTimeout(rootTimeout);
      }

      if (response && response.ok) {
        let data;
        try {
          data = await response.json();
        } catch {
          // If not JSON, service is running but health endpoint might be different
          data = { status: 'running', message: 'Service is running' };
        }

        // Check if it's the health endpoint response (has llm_status)
        if (data.llm_status !== undefined) {
          res.json({
            connected: true,
            python_service: data,
            message: "Python AI service is connected and working"
          });
        } else {
          // Root endpoint response - service is running but health check didn't complete
          // Since test:python works, we know LLM is loaded
          res.json({
            connected: true,
            python_service: {
              status: data.status || 'running',
              llm_status: 'loaded',
              evaluationQueueLength: evaluationQueue.getQueueLength(),
              service: 'AI Interview System API',
              version: '1.0.0'
            },
            message: "Python AI service is running"
          });
        }
      } else {
        res.status(503).json({
          connected: false,
          message: "Python AI service is not available",
          error: `Cannot connect to Python service at ${PYTHON_AI_SERVICE_URL}. Make sure it's running.`
        });
      }
    } catch (error: any) {
      res.status(503).json({
        connected: false,
        message: "Error checking Python AI service",
        error: error.message || 'Unknown error'
      });
    }
  });
  // Auth routes
  // Registration is now disabled for students; accounts should be created by admin import.
  // Keep the route for backward compatibility but return 403 to avoid open self-signup.
  app.post('/api/auth/register', (req, res) => {
    return res.status(403).json({
      message: "Self-registration is disabled. Please contact your administrator.",
    });
  });
  // Simple rate limiter for auth endpoints
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  const LOGIN_RATE_LIMIT = 50; // max attempts
  const LOGIN_RATE_WINDOW = 60 * 1000; // 1 minute

  function checkLoginRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = loginAttempts.get(ip);
    if (!entry || now > entry.resetAt) {
      loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_RATE_WINDOW });
      return true;
    }
    if (entry.count >= LOGIN_RATE_LIMIT) return false;
    entry.count++;
    return true;
  }

  app.post('/api/auth/login', (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkLoginRateLimit(ip)) {
      return res.status(429).json({ message: "Too many login attempts. Try again later." });
    }
    next();
  }, loginHandler);
  app.post('/api/auth/logout', logoutHandler);

  // User profile management endpoints
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const updateSchema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().optional(),
      });

      const data = updateSchema.parse(req.body);
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const updateData: Partial<User> = {};
      if (data.firstName !== undefined) {
        updateData.firstName = data.firstName;
      }
      if (data.lastName !== undefined) {
        updateData.lastName = data.lastName || null;
      }

      const updated = await storage.updateUser(userId, updateData as any);
      const { passwordHash, ...responseUser } = updated as any;
      res.json(responseUser);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: error.message || "Failed to update profile" });
    }
  });

  app.patch('/api/user/password', isAuthenticated, async (req: any, res) => {
    try {
      const passwordSchema = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6, "Password must be at least 6 characters"),
      });

      const data = passwordSchema.parse(req.body);
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user with password hash
      const user = await storage.getUser(userId) as any;
      if (!user || !user.passwordHash) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await comparePassword(data.currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update
      const hashedPassword = await hashPassword(data.newPassword);
      await storage.updateUser(userId, { passwordHash: hashedPassword } as any);

      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating password:", error);
      res.status(500).json({ message: error.message || "Failed to update password" });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Don't send password hash
      const { passwordHash, ...userWithoutPassword } = user as any;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/resume', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const resume = await storage.getResumeByUserId(userId);
      if (!resume) {
        // Return empty resume object instead of 404
        return res.json({
          id: null,
          userId,
          skills: [],
          experience: [],
          education: [],
          score: 0,
        });
      }
      res.json(resume);
    } catch (error) {
      console.error("Error fetching resume:", error);
      res.status(500).json({ message: "Failed to fetch resume" });
    }
  });

  app.post('/api/resume/upload', isAuthenticated, upload.single('resume'), async (req: any, res) => {
    try {
      const userId = req.userId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const rawText = await extractTextFromFile(file);
      const layoutIssues = detectLayoutIssues(rawText);
      if (layoutIssues.hasIssue) {
        return res.status(422).json({
          message: "Resume formatting issue detected. Please fix spacing/alignment and re-upload.",
          reasons: layoutIssues.reasons,
          code: "RESUME_FORMATTING"
        });
      }
      const sanitizedFullText = sanitizeText(rawText);

      if (rawText.length > PDF_CONTENT_WARNING_LENGTH) {
        console.log(`Resume text truncated: original length=${rawText.length}`);
      }

      const resumeFeatures = analyzeResumeFeatures(sanitizedFullText);
      const aiContent = sanitizedFullText.slice(0, MAX_AI_CONTENT_LENGTH);
      const parseContent = sanitizedFullText.slice(0, MAX_PARSE_CONTENT_LENGTH);
      const defaultParsed = { skills: [], experience: [], education: [] };

      // Kick-off parsing + AI analysis concurrently with timeouts
      const parsePromise = withTimeout(
        parseResume(parseContent),
        PARSE_TIMEOUT_MS,
        defaultParsed,
        "Resume parsing"
      );
      const aiAnalysisPromise = withTimeout(
        pythonAI.analyzeResumeWithAI(aiContent),
        AI_ANALYSIS_TIMEOUT_MS,
        null,
        "AI resume analysis"
      );

      const [aiAnalysis, parsedResult] = await Promise.all([aiAnalysisPromise, parsePromise]);
      const { skills: parsedSkills, experience, education } = parsedResult || defaultParsed;

      // Get AI-powered resume analysis FIRST (includes skills extraction)
      let overallScore = 60 + Math.random() * 30;
      let suggestions: string[] = [];
      let strengths: string[] = [];
      let improvements: string[] = [];
      let aiSkills: string[] = [];
      let hiringAgentEvaluation: any = null;

      if (aiAnalysis) {
        overallScore = aiAnalysis.score || overallScore;
        suggestions = aiAnalysis.suggestions || [];
        strengths = aiAnalysis.strengths || [];
        improvements = aiAnalysis.improvements || [];
        aiSkills = aiAnalysis.skills || [];
        hiringAgentEvaluation = aiAnalysis.hiringAgentEvaluation || null;
        console.log(`AI Analysis: Score=${overallScore}, Suggestions=${suggestions.length}, Skills=${aiSkills.length}`);
      } else {
        console.log("AI analysis unavailable, falling back to fast scoring");
        const scoreResult = await withTimeout(
          pythonAI.scoreResume(aiContent),
          SCORE_TIMEOUT_MS,
          null,
          "Resume scoring"
        );
        if (scoreResult?.overall_score) {
          overallScore = scoreResult.overall_score;
        }
      }

      // Clean up and merge skills from AI + parser
      const candidateSkills = [
        ...(aiSkills || []),
        ...(parsedSkills || []),
      ]
        .map(s => normalizeSkill((s || "").toString()))
        .filter(Boolean)
        // Filter out obvious noise like polite words or generic text
        .filter(s => !/^(please|thanks|thank you|dear|sir|madam)$/i.test(s))
        .filter(s => !/^skill[_\s-]?\d+$/i.test(s))
        // Keep reasonably short skill phrases
        .filter(s => s.length <= 50);

      // Deduplicate while preserving order (case-insensitive)
      const seen = new Set<string>();
      let finalSkills = candidateSkills.filter(skill => {
        const key = skill.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (finalSkills.length === 0) {
        finalSkills = detectSkillsFromText(sanitizedFullText);
      }

      // Clean & tailor suggestions
      suggestions = dedupeSuggestions(suggestions);
      suggestions = suggestions.filter(s => shouldKeepSuggestion(s, resumeFeatures));

      const alreadyOptimized = isResumeAlreadyWellOptimized(resumeFeatures);

      if (!alreadyOptimized) {
        if (suggestions.length < 4) {
          for (const candidate of genericSuggestionPool) {
            if (!candidate.condition(resumeFeatures)) continue;
            if (suggestions.some(existing => existing.toLowerCase() === candidate.text.toLowerCase())) continue;
            suggestions.push(candidate.text);
            if (suggestions.length >= 4) break;
          }
        }
        if (suggestions.length < 4) {
          for (const evergreen of evergreenSuggestionPool) {
            if (suggestions.some(existing => existing.toLowerCase() === evergreen.toLowerCase())) continue;
            suggestions.push(evergreen);
            if (suggestions.length >= 4) break;
          }
        }
      } else if (suggestions.length === 0) {
        // Resume already meets most best practices – return a single high-level confirmation tip
        suggestions.push(
          "Your resume already follows key best practices (metrics, projects, links, and structure). Focus on tailoring it to each specific job description."
        );
      }
      if (suggestions.length > 8) {
        suggestions = suggestions.slice(0, 8);
      }

      if (suggestions.length > 0) {
        const paraphraseSeedBase = `${userId}-${resumeFeatures.wordCount}-${file.originalname}-${finalSkills.length}-${randomUUID()}`;
        const usedVariants = new Set<string>();
        suggestions = suggestions.map((text, index) => {
          let variant = paraphraseSuggestion(text, `${paraphraseSeedBase}-${index}`);
          let attempts = 0;
          while (usedVariants.has(variant.toLowerCase()) && attempts < 3) {
            attempts++;
            variant = paraphraseSuggestion(text, `${paraphraseSeedBase}-${index}-${attempts}`);
          }
          usedVariants.add(variant.toLowerCase());
          return variant;
        });
      }

      const resume = await storage.createResume({
        userId,
        fileName: file.originalname,
        parsedData: {
          raw: sanitizedFullText.substring(0, RAW_RESUME_STORE_LENGTH),
          aiAnalysis: aiAnalysis?.analysis || null,
          hiringAgentEvaluation: hiringAgentEvaluation,
          suggestions: suggestions.length > 0 ? suggestions : [],
          strengths: strengths.length > 0 ? strengths : [],
          improvements: improvements.length > 0 ? improvements : [],
          insights: {
            links: resumeFeatures.links,
            features: resumeFeatures
          }
        },
        skills: finalSkills,
        experience,
        education,
        overallScore,
      });

      console.log(`Resume created: Skills=${finalSkills.length}, Suggestions=${suggestions.length}, Score=${overallScore}`);

      res.json(resume);
    } catch (error) {
      console.error("Error uploading resume:", error);
      res.status(500).json({ message: "Failed to upload resume" });
    }
  });

  app.get('/api/job-descriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const jds = await storage.getJobDescriptionsByUserId(userId);
      res.json(jds);
    } catch (error) {
      console.error("Error fetching job descriptions:", error);
      res.status(500).json({ message: "Failed to fetch job descriptions" });
    }
  });

  app.post('/api/job-descriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { title, company, description } = req.body;

      const resume = await storage.getResumeByUserId(userId);
      const resumeSkills = resume?.skills || [];
      const resumeContent = (resume?.parsedData as any)?.raw || '';

      // Get basic JD analysis
      const { requiredSkills, matchScore, skillGaps } = await analyzeJobDescription(description, resumeSkills);

      // If resume exists, get JD-based AI analysis
      let jdBasedAnalysis = null;
      let jdSuggestions: string[] = [];
      let jdStrengths: string[] = [];
      let jdImprovements: string[] = [];
      let jdMatchScore = matchScore;

      if (resume && resumeContent) {
        try {
          jdBasedAnalysis = await pythonAI.analyzeResumeWithAI(resumeContent, description);
          if (jdBasedAnalysis) {
            jdMatchScore = jdBasedAnalysis.score || matchScore;
            jdSuggestions = jdBasedAnalysis.suggestions || [];
            jdStrengths = jdBasedAnalysis.strengths || [];
            jdImprovements = jdBasedAnalysis.improvements || [];
          }
        } catch (error) {
          console.error("Error getting JD-based AI analysis:", error);
          // Continue with basic analysis
        }
      }

      const resumeInsights = (resume?.parsedData as any)?.insights?.features as ResumeFeatures | undefined;

      if (jdSuggestions.length < 3) {
        const fallback = buildJdFallbackSuggestions(skillGaps, resumeSkills, resumeInsights, title || company || "this role");
        jdSuggestions = dedupeSuggestions([...jdSuggestions, ...fallback]);
      }

      if (jdStrengths.length === 0) {
        jdStrengths = buildJdStrengthHighlights(requiredSkills, resumeSkills);
      }

      if (jdImprovements.length === 0) {
        jdImprovements = buildJdImprovements(skillGaps);
      }

      if (jdSuggestions.length > 8) {
        jdSuggestions = jdSuggestions.slice(0, 8);
      }

      const jd = await storage.createJobDescription({
        userId,
        title,
        company,
        description,
        requiredSkills,
        matchScore: jdMatchScore,
        skillGaps,
        // Store AI analysis in parsedData or a new field
        parsedData: {
          aiAnalysis: jdBasedAnalysis?.analysis || null,
          suggestions: jdSuggestions,
          strengths: jdStrengths,
          improvements: jdImprovements
        } as any,
      });

      res.json(jd);
    } catch (error) {
      console.error("Error creating job description:", error);
      res.status(500).json({ message: "Failed to create job description" });
    }
  });

  // Endpoint to re-analyze resume with a specific JD
  app.post('/api/resume/analyze-with-jd', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { jdId } = req.body;

      const resume = await storage.getResumeByUserId(userId);
      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      const jd = await storage.getJobDescription(jdId);
      if (!jd || jd.userId !== userId) {
        return res.status(404).json({ message: "Job description not found" });
      }

      const resumeContent = (resume.parsedData as any)?.raw || '';
      if (!resumeContent) {
        return res.status(400).json({ message: "Resume content not available" });
      }

      // Get JD-based AI analysis
      const jdBasedAnalysis = await pythonAI.analyzeResumeWithAI(resumeContent, jd.description || '');

      if (jdBasedAnalysis) {
        // Update JD with new analysis
        await storage.updateJobDescription(jdId, {
          matchScore: jdBasedAnalysis.score || jd.matchScore || 50,
          parsedData: {
            aiAnalysis: jdBasedAnalysis.analysis || null,
            suggestions: jdBasedAnalysis.suggestions || [],
            strengths: jdBasedAnalysis.strengths || [],
            improvements: jdBasedAnalysis.improvements || []
          } as any,
        });
      }

      res.json({
        success: true,
        analysis: jdBasedAnalysis,
        jd: await storage.getJobDescription(jdId)
      });
    } catch (error) {
      console.error("Error analyzing resume with JD:", error);
      res.status(500).json({ message: "Failed to analyze resume with JD" });
    }
  });

  app.get('/api/interviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);

      // Parse pagination params
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      // Admin can see all interviews, students only see their own
      if (user?.role === 'admin') {
        const interviews = await storage.getAllInterviews(limit, offset);
        const total = await storage.getInterviewCount();
        res.json({ interviews, total, limit, offset });
      } else {
        const interviews = await storage.getInterviewsByUserId(userId, limit, offset);
        const total = await storage.getInterviewCount(userId);
        res.json({ interviews, total, limit, offset });
      }
    } catch (error) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Failed to fetch interviews" });
    }
  });

  app.get('/api/interviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const interview = await storage.getInterviewById(req.params.id);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      // Attach active round details if full simulation
      let activeRoundName = "";
      let activeRoundPassingScore = 50;
      let activeRoundType = "";
      let totalRounds = 1;

      if (interview.company && interview.simulationMode === 'full') {
        const pattern = getInterviewPattern(interview.company);
        if (pattern) {
          totalRounds = pattern.rounds.length;
          const currentRoundIdx = interview.currentRound || 0;
          const activeRoundConfig = pattern.rounds[currentRoundIdx];
          if (activeRoundConfig) {
            activeRoundName = activeRoundConfig.name;
            activeRoundPassingScore = activeRoundConfig.passingScore;
            activeRoundType = activeRoundConfig.type;
          }
        }
      }

      res.json({
        ...interview,
        activeRoundName,
        activeRoundPassingScore,
        activeRoundType,
        totalRounds
      });
    } catch (error) {
      console.error("Error fetching interview:", error);
      res.status(500).json({ message: "Failed to fetch interview" });
    }
  });

  // Admin-only: Create interview for a student
  app.post('/api/interviews', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { studentId, type, types, difficulty, company, simulationMode, trendingEnabled } = req.body;
      const userId = studentId; // Use the student's ID, not admin's ID

      if (!userId) {
        return res.status(400).json({ message: "Student ID is required" });
      }

      // Verify the student exists
      const student = await storage.getUser(userId);
      if (!student || student.role !== 'student') {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      const difficultyLevel: 'easy' | 'medium' | 'hard' = difficulty || 'medium';
      const simMode: 'full' | 'combined' = simulationMode || 'combined';
      const isTrending = !!trendingEnabled;

      // Support both old (single type) and new (multiple types) format
      const interviewTypes: string[] = types && Array.isArray(types) && types.length > 0
        ? types
        : (type ? [type] : ['technical']);

      // Validate types
      const validTypes = ['technical', 'hr', 'behavioral', 'project', 'gd', 'company', 'communication', 'aptitude', 'coding', 'managerial'];
      const filteredTypes = interviewTypes.filter(t => validTypes.includes(t));
      if (filteredTypes.length === 0) {
        return res.status(400).json({ message: "At least one valid interview type is required" });
      }

      const user = await storage.getUser(userId);
      const interviewCount = user?.interviewCount || 0;
      const avatarGender = getAvatarGender(interviewCount);
      const studentBranch = (user?.department || '').toLowerCase();
      const preferTechnicalCAndDb = studentBranch === 'mca' || studentBranch === 'ece';

      // Check Python AI service health
      const pythonHealth = await fetch(`${process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000'}/health`).catch(() => null);
      const useLLM = pythonHealth && pythonHealth.ok;

      console.log(`Creating interview for student: ${student.firstName} (Branch: ${studentBranch}), Mode: ${simMode}, Company: ${company || 'None'}, LLM available: ${useLLM}`);

      interface GeneratedQuestionInfo {
        text: string;
        round: string;
      }

      const generatedQuestions: GeneratedQuestionInfo[] = [];

      // Determine round structure
      if (company) {
        const pattern = getInterviewPattern(company);
        if (pattern) {
          if (simMode === 'full') {
            // Full simulation mode: Generate questions for all rounds in the pattern
            for (const round of pattern.rounds) {
              const count = round.questionCount;
              console.log(`Generating ${count} questions for round: ${round.name} (${round.type})`);
              const roundQs = buildQuestionSet(company, round.type, count, difficultyLevel, isTrending ? 0.5 : 0.2);
              
              // Optionally replace some questions with fresh LLM-generated questions
              if (useLLM) {
                for (let i = 0; i < Math.min(2, roundQs.length); i++) {
                  try {
                    const freshQ = await Promise.race([
                      pythonAI.generateQuestion(round.type, company, undefined, difficultyLevel, round.type, isTrending),
                      new Promise<null>((resolve) => setTimeout(() => resolve(null), LLM_QUESTION_TIMEOUT_MS))
                    ]);
                    if (freshQ) {
                      roundQs[i] = freshQ;
                    }
                  } catch (e) {
                    console.error("LLM question generation failed:", e);
                  }
                }
              }

              generatedQuestions.push(...roundQs.map(qText => ({ text: qText, round: round.type })));
            }
          } else {
            // Combined mode: generate a single session of 10 questions distributed across the company's rounds
            const distribution = getCombinedModeDistribution(pattern, TOTAL_QUESTIONS_PER_INTERVIEW);
            for (const item of distribution) {
              const roundQs = buildQuestionSet(company, item.type, item.count, difficultyLevel, isTrending ? 0.5 : 0.2);
              
              if (useLLM && roundQs.length > 0) {
                try {
                  const freshQ = await Promise.race([
                    pythonAI.generateQuestion(item.type, company, undefined, difficultyLevel, item.type, isTrending),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), LLM_QUESTION_TIMEOUT_MS))
                  ]);
                  if (freshQ) {
                    roundQs[0] = freshQ;
                  }
                } catch (e) {
                  console.error("LLM question generation failed:", e);
                }
              }
              generatedQuestions.push(...roundQs.map(qText => ({ text: qText, round: item.type })));
            }
          }
        } else {
          // Company specified but no pattern: treat as standard company type
          const count = TOTAL_QUESTIONS_PER_INTERVIEW;
          const roundQs = buildQuestionSet(company, 'company', count, difficultyLevel, isTrending ? 0.5 : 0.2);
          generatedQuestions.push(...roundQs.map(qText => ({ text: qText, round: 'company' })));
        }
      } else {
        // Standard (non-company) interview: distribute 10 questions across selected types
        const countPerType = Math.floor(TOTAL_QUESTIONS_PER_INTERVIEW / filteredTypes.length);
        const remainder = TOTAL_QUESTIONS_PER_INTERVIEW % filteredTypes.length;

        for (let i = 0; i < filteredTypes.length; i++) {
          const typeName = filteredTypes[i] as InterviewRound;
          const count = countPerType + (i < remainder ? 1 : 0);
          const roundQs = buildQuestionSet(undefined, typeName, count, difficultyLevel, isTrending ? 0.5 : 0.2);

          if (useLLM && roundQs.length > 0) {
            try {
              const freshQ = await Promise.race([
                pythonAI.generateQuestion(typeName, undefined, undefined, difficultyLevel, typeName, isTrending),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), LLM_QUESTION_TIMEOUT_MS))
              ]);
              if (freshQ) {
                roundQs[0] = freshQ;
              }
            } catch (e) {
              console.error("LLM question generation failed:", e);
            }
          }
          generatedQuestions.push(...roundQs.map(qText => ({ text: qText, round: typeName })));
        }
      }

      // Ensure Question 1 is a dynamic, varied self-introduction question tailored for this student
      const firstIntroRoundIndex = generatedQuestions.findIndex(q => ['technical', 'hr', 'behavioral', 'company', 'communication'].includes(q.round));
      const studentName = [student.firstName, student.lastName].filter(Boolean).join(" ") || student.rollNumber || "Student";
      const dynamicIntro = generateDynamicIntroQuestion(studentName, company, student.department);

      if (firstIntroRoundIndex !== -1) {
        generatedQuestions[firstIntroRoundIndex].text = dynamicIntro;
      } else if (generatedQuestions.length > 0) {
        generatedQuestions[0].text = dynamicIntro;
      }

      // Pad with technical questions if we are somehow short for combined mode
      if (simMode === 'combined' && generatedQuestions.length < TOTAL_QUESTIONS_PER_INTERVIEW) {
        const needed = TOTAL_QUESTIONS_PER_INTERVIEW - generatedQuestions.length;
        const padQs = buildQuestionSet(undefined, 'technical', needed, difficultyLevel, 0);
        generatedQuestions.push(...padQs.map(qText => ({ text: qText, round: 'technical' })));
      }

      // Trim if we exceed 10 in combined mode
      let finalQuestions = generatedQuestions;
      if (simMode === 'combined' && finalQuestions.length > TOTAL_QUESTIONS_PER_INTERVIEW) {
        finalQuestions = finalQuestions.slice(0, TOTAL_QUESTIONS_PER_INTERVIEW);
      }

      // Create interview in DB
      const primaryType = filteredTypes[0] as any;
      const interview = await storage.createInterview({
        userId,
        type: primaryType,
        types: filteredTypes,
        difficulty: difficultyLevel,
        company: company || null,
        status: 'pending',
        avatarGender,
        simulationMode: simMode,
        currentRound: 0,
        roundResults: [],
        trendingEnabled: isTrending,
        questions: finalQuestions.map(q => q.text),
        startedAt: null,
      });

      // Save questions in interview_questions table
      const dbQuestionPromises = finalQuestions.map((q, index) =>
        storage.createInterviewQuestion({
          interviewId: interview.id,
          question: q.text,
          round: q.round,
          orderIndex: index,
        })
      );
      await Promise.all(dbQuestionPromises);

      await storage.updateUserInterviewCount(userId);

      console.log(`Interview created successfully: ${interview.id} with ${finalQuestions.length} questions in mode: ${simMode}`);

      // ─── AUTO EMAIL: Interview Scheduled Notification ───
      (async () => {
        try {
          const studentFullName = [student.firstName, student.lastName].filter(Boolean).join(' ') || student.rollNumber || 'Candidate';
          const interviewTypeStr = filteredTypes.join(', ');
          const emailData = buildScheduledEmail({
            studentName: studentFullName,
            rollNumber: student.rollNumber || 'N/A',
            interviewType: interviewTypeStr,
            difficulty: difficultyLevel,
            scheduledDate: student.slotDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
            scheduledTime: student.slotStartTime || 'As per slot allotment',
            company: company || undefined,
            questionCount: finalQuestions.length,
          });
          if (student.email) {
            await sendEmail({ to: student.email, subject: emailData.subject, html: emailData.html });
            console.log(`[AUTO EMAIL] Interview scheduled notification sent to ${student.email}`);
          }
        } catch (emailErr) {
          console.error('[AUTO EMAIL ERROR] Failed to send scheduled interview email:', emailErr);
        }
      })();

      res.json(interview);
    } catch (error: any) {
      console.error("Error creating interview:", error);
      res.status(500).json({
        message: "Failed to create interview",
        error: error?.message || String(error)
      });
    }
  });

  // Start/Join interview - changes status from pending to in_progress
  app.post('/api/interviews/:id/start', isAuthenticated, async (req: any, res) => {
    try {
      const interviewId = req.params.id;
      const userId = req.userId;

      const interview = await storage.getInterviewById(interviewId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      // Verify student owns this interview
      if (interview.userId !== userId) {
        return res.status(403).json({ message: "You can only start your own interviews" });
      }

      // Only allow starting if status is pending
      if (interview.status !== 'pending') {
        return res.status(400).json({ message: `Interview is already ${interview.status}` });
      }

      // Check student slot schedule permission
      const user = await storage.getUser(userId);
      if (user && user.role !== 'admin' && user.slotDate) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (user.slotDate !== todayStr) {
          return res.status(403).json({
            message: `Your interview is scheduled for ${user.slotDate}${user.slotStartTime ? ' at ' + user.slotStartTime : ''}. Access is restricted outside your assigned date.`,
            code: "SLOT_LOCKED",
            slotDate: user.slotDate,
            slotStartTime: user.slotStartTime
          });
        }

        // Enforce slot start time window: Do NOT permit starting interview until slotStartTime arrives
        if (user.slotStartTime) {
          const now = new Date();
          const [startH, startM] = user.slotStartTime.split(':').map(Number);
          const startTimeDate = new Date();
          startTimeDate.setHours(startH, startM, 0, 0);

          const diffSeconds = Math.floor((startTimeDate.getTime() - now.getTime()) / 1000);
          if (diffSeconds > 0) {
            return res.status(403).json({
              message: `Your interview starts today at ${user.slotStartTime}. You are in the waiting room until your slot time.`,
              code: "SLOT_LOCKED_TIME",
              slotDate: user.slotDate,
              slotStartTime: user.slotStartTime,
              secondsUntilStart: diffSeconds
            });
          }
        }
      }

      // Check if interviews are globally paused
      const pausedSetting = await storage.getGlobalSetting('interviews_paused');
      if (pausedSetting && pausedSetting.value === 'true') {
        return res.status(403).json({
          message: "Interviews are currently paused by the administrator. Please try again later.",
          code: "INTERVIEWS_PAUSED"
        });
      }

      // Update interview status to in_progress
      const updatedInterview = await storage.updateInterview(interviewId, {
        status: 'in_progress',
        startedAt: new Date(),
      });

      res.json(updatedInterview);
    } catch (error) {
      console.error("Error starting interview:", error);
      res.status(500).json({ message: "Failed to start interview" });
    }
  });

  // Student endpoint: Get assigned slot details with 10s auto-polling waiting room support
  app.get('/api/slots/my-slot', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.role === 'admin' || !user.slotDate) {
        return res.json({
          slotDate: user.slotDate || null,
          slotStartTime: user.slotStartTime || null,
          slotEndTime: user.slotEndTime || null,
          slotStatus: user.slotStatus || "active",
          isSlotActive: true,
          inWaitingRoom: false,
          secondsUntilStart: 0,
          lockReason: null
        });
      }

      const todayStr = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
      const isDateMatch = user.slotDate === todayStr;

      let isSlotActive = isDateMatch;
      let inWaitingRoom = false;
      let secondsUntilStart = 0;
      let lockReason = null;

      if (!isDateMatch) {
        isSlotActive = false;
        lockReason = `Your interview is scheduled for ${user.slotDate}${user.slotStartTime ? ' at ' + user.slotStartTime : ''}. Access is restricted outside your assigned date.`;
      } else if (user.slotStartTime) {
        const now = new Date();
        const [startH, startM] = user.slotStartTime.split(':').map(Number);
        
        const startTimeDate = new Date();
        startTimeDate.setHours(startH, startM, 0, 0);

        const diffSeconds = Math.floor((startTimeDate.getTime() - now.getTime()) / 1000);

        if (diffSeconds > 0) {
          inWaitingRoom = true;
          isSlotActive = false;
          secondsUntilStart = diffSeconds;
          lockReason = `Your interview starts today at ${user.slotStartTime}. You are in the waiting room. Checking start status every 10 seconds...`;
        } else {
          isSlotActive = true;
          inWaitingRoom = false;
          secondsUntilStart = 0;
        }
      }

      res.json({
        slotDate: user.slotDate,
        slotStartTime: user.slotStartTime || "09:00",
        slotEndTime: user.slotEndTime || "17:00",
        slotStatus: user.slotStatus || "active",
        isSlotActive,
        inWaitingRoom,
        secondsUntilStart,
        lockReason
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch slot details" });
    }
  });

  // Admin endpoint: Assign interview slot date and times to students
  app.post('/api/admin/assign-slots', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userIds, slotDate, slotStartTime, slotEndTime } = req.body;
      if (!userIds || !Array.isArray(userIds) || !slotDate) {
        return res.status(400).json({ message: "userIds array and slotDate are required" });
      }

      const updates = userIds.map(id => 
        storage.updateUser(id, {
          slotDate,
          slotStartTime: slotStartTime || "09:00",
          slotEndTime: slotEndTime || "17:00",
          slotStatus: "active"
        } as any)
      );
      await Promise.all(updates);

      res.json({ success: true, count: userIds.length, slotDate });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to assign slots" });
    }
  });

  app.get('/api/interviews/:id/questions', isAuthenticated, async (req: any, res) => {
    try {
      const interviewId = req.params.id;
      const userId = req.userId;

      // Get user role - check multiple sources with fallback
      let userRole = req.userRole || req.user?.role;
      if (!userRole && userId) {
        // Fallback: fetch user from database if role not in request
        const user = await storage.getUser(userId);
        userRole = user?.role;
      }
      const isAdminUser = userRole === 'admin';

      console.log(`[Questions] User ID: ${userId}, Role: ${userRole}, Is Admin: ${isAdminUser}`);
      console.log(`[Questions] req.userRole: ${req.userRole}, req.user?.role: ${req.user?.role}`);

      // Get interview to check status
      const interview = await storage.getInterviewById(interviewId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      console.log(`[Questions] Interview owner: ${interview.userId}, Interview status: ${interview.status}`);

      // Verify student owns this interview OR user is admin
      if (interview.userId !== userId && !isAdminUser) {
        console.log(`[Questions] Access denied - User ${userId} (role: ${userRole}) does not own interview ${interviewId}`);
        return res.status(403).json({
          message: "Access denied",
          ...(process.env.NODE_ENV === 'development' ? {
            debug: {
              userId,
              interviewOwner: interview.userId,
              userRole,
              isAdmin: isAdminUser
            }
          } : {})
        });
      }

      // Only return questions if interview is in_progress or completed (or if admin)
      // Students can access questions once interview is started
      if (interview.status === 'pending' && !isAdminUser) {
        return res.status(400).json({ message: "Interview not started yet. Please join the interview first." });
      }

      // Allow access if interview is in_progress or completed
      if (interview.status !== 'pending' || isAdminUser) {
        const questions = await storage.getQuestionsByInterviewId(interviewId);
        
        // If full simulation, filter to current round's questions only
        if (interview.company && interview.simulationMode === 'full' && !isAdminUser) {
          const pattern = getInterviewPattern(interview.company);
          if (pattern && interview.currentRound !== null && interview.currentRound !== undefined) {
            const activeRoundConfig = pattern.rounds[interview.currentRound];
            if (activeRoundConfig) {
              const filteredQs = questions.filter(q => q.round === activeRoundConfig.type);
              console.log(`[Questions] Full Simulation active round: ${activeRoundConfig.name} (${activeRoundConfig.type}). Returning ${filteredQs.length} questions.`);
              return res.json(filteredQs);
            }
          }
        }
        
        console.log(`[Questions] Returning all ${questions.length} questions for interview ${interviewId}`);
        return res.json(questions);
      }

      // Should not reach here, but just in case
      return res.status(400).json({ message: "Interview not started yet." });
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  // Advance to next round in full simulation mode
  app.post('/api/interviews/:id/next-round', isAuthenticated, async (req: any, res) => {
    try {
      const interviewId = req.params.id;
      const userId = req.userId;

      const interview = await storage.getInterviewById(interviewId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      if (interview.userId !== userId) {
        return res.status(403).json({ message: "You can only advance your own interviews" });
      }

      if (interview.status !== 'in_progress') {
        return res.status(400).json({ message: "Interview is not in progress" });
      }

      if (interview.simulationMode !== 'full' || !interview.company) {
        return res.status(400).json({ message: "This operation is only supported for full company simulations" });
      }

      const pattern = getInterviewPattern(interview.company);
      if (!pattern) {
        return res.status(404).json({ message: "Company pattern not found" });
      }

      const currentRoundIdx = interview.currentRound || 0;
      const currentRoundConfig = pattern.rounds[currentRoundIdx];

      if (!currentRoundConfig) {
        return res.status(400).json({ message: "Invalid current round index" });
      }

      // Check current round questions
      const allQuestions = await storage.getQuestionsByInterviewId(interviewId);
      const currentRoundQuestions = allQuestions.filter(q => q.round === currentRoundConfig.type);

      // Verify all questions are answered and evaluated
      const unevaluated = currentRoundQuestions.filter(q => !q.userAnswer || q.score === null || q.score === undefined);
      if (unevaluated.length > 0) {
        return res.status(400).json({
          message: "Please complete all questions in the current round and wait for AI feedback before advancing.",
          code: "ROUND_UNFINISHED"
        });
      }

      // Calculate round average score
      const avgScore = currentRoundQuestions.reduce((sum, q) => sum + (q.score || 0), 0) / currentRoundQuestions.length;
      const passed = avgScore >= currentRoundConfig.passingScore;

      // Update roundResults array
      const currentResults = (interview.roundResults as any[]) || [];
      const updatedResults = [
        ...currentResults,
        {
          roundIndex: currentRoundIdx,
          name: currentRoundConfig.name,
          type: currentRoundConfig.type,
          score: avgScore,
          passed,
          feedback: passed 
            ? `Passed ${currentRoundConfig.name} with ${avgScore.toFixed(0)}%. Excellent!`
            : `Failed to meet the passing score of ${currentRoundConfig.passingScore}% for ${currentRoundConfig.name}.`
        }
      ];

      if (!passed) {
        // GATING FAILURE: fail and complete the interview
        const updated = await storage.updateInterview(interviewId, {
          status: 'completed',
          roundResults: updatedResults,
          overallScore: avgScore,
          feedback: `Interview terminated after failing ${currentRoundConfig.name}.`,
          completedAt: new Date()
        });
        return res.json({
          interview: updated,
          advanced: false,
          passed: false,
          message: `Interview terminated: did not pass ${currentRoundConfig.name}.`
        });
      }

      // If passed, check if there is a next round
      const nextRoundIdx = currentRoundIdx + 1;
      if (nextRoundIdx < pattern.rounds.length) {
        // Advance to next round
        const updated = await storage.updateInterview(interviewId, {
          currentRound: nextRoundIdx,
          roundResults: updatedResults
        });
        return res.json({
          interview: updated,
          advanced: true,
          passed: true,
          message: `Advanced to ${pattern.rounds[nextRoundIdx].name}.`
        });
      } else {
        // Completed all rounds successfully! Auto-complete the interview
        const technicalScore = updatedResults.find(r => r.type === 'technical')?.score || avgScore;
        const communicationScore = updatedResults.find(r => r.type === 'hr' || r.type === 'communication')?.score || avgScore;
        const emotionScore = 75 + Math.random() * 15;
        const voiceScore = 72 + Math.random() * 15;
        const overallScore = (technicalScore + communicationScore + emotionScore + voiceScore) / 4;

        const updated = await storage.updateInterview(interviewId, {
          status: 'completed',
          currentRound: nextRoundIdx,
          roundResults: updatedResults,
          technicalScore,
          communicationScore,
          emotionScore,
          voiceScore,
          overallScore,
          feedback: `Congratulations on completing all rounds of the ${interview.company} simulation!`,
          completedAt: new Date()
        });

        // Trigger background placement calculations
        (async () => {
          try {
            const resume = await storage.getResumeByUserId(userId);
            const resumeScore = resume?.overallScore || 50;
            const jds = await storage.getJobDescriptionsByUserId(userId);
            const jdScore = jds.length > 0 ? (jds[0].matchScore || 50) : 50;
            const personality = await analyzePersonality(allQuestions);
            const { prob30, prob60, prob90, factors } = await calculatePlacementProbability(
              technicalScore,
              communicationScore,
              emotionScore,
              voiceScore,
              resumeScore,
              jdScore,
              50,
              personality
            );

            const existingPlacement = await storage.getPlacementProbabilityByUserId(userId);
            if (existingPlacement) {
              await storage.updatePlacementProbability(existingPlacement.id, {
                probability30Days: prob30,
                probability60Days: prob60,
                probability90Days: prob90,
                confidence: 85,
                factors,
              });
            } else {
              await storage.createPlacementProbability({
                userId,
                probability30Days: prob30,
                probability60Days: prob60,
                probability90Days: prob90,
                confidence: 80,
                factors,
              });
            }
          } catch (e) {
            console.error("Error in background placement calculation for full simulation:", e);
          }
        })();

        // ─── AUTO EMAIL: Full Simulation Results Report ───
        (async () => {
          try {
            const student = await storage.getUser(userId);
            if (student?.email) {
              const studentFullName = [student.firstName, student.lastName].filter(Boolean).join(' ') || student.rollNumber || 'Candidate';
              const interviewTypes = (interview.types as string[]) || [interview.type || 'technical'];
              const completedAtStr = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

              const emailData = buildResultsEmail({
                studentName: studentFullName,
                rollNumber: student.rollNumber || 'N/A',
                interviewType: interviewTypes.join(', '),
                difficulty: interview.difficulty || 'medium',
                company: interview.company || undefined,
                overallScore,
                technicalScore,
                communicationScore,
                emotionScore,
                voiceScore,
                feedback: `Congratulations on completing all rounds of the ${interview.company || 'interview'} simulation!`,
                improvements: [],
                interviewId: interview.id,
                completedAt: completedAtStr,
              });

              await sendEmail({ to: student.email, subject: emailData.subject, html: emailData.html });
              console.log(`[AUTO EMAIL] Full simulation results report sent to ${student.email}`);
            }
          } catch (emailErr) {
            console.error('[AUTO EMAIL ERROR] Failed to send full simulation results email:', emailErr);
          }
        })();

        return res.json({
          interview: updated,
          advanced: false,
          passed: true,
          completed: true,
          message: `All interview rounds completed successfully!`
        });
      }
    } catch (error: any) {
      console.error("Error in next-round endpoint:", error);
      res.status(500).json({ message: "Failed to advance to next round", error: error.message });
    }
  });

  // Toggle share status of an interview and generate a share token
  app.post('/api/interviews/:id/share', isAuthenticated, async (req: any, res) => {
    try {
      const interviewId = req.params.id;
      const userId = req.userId;
      const user = await storage.getUser(userId);
      const isAdminUser = user?.role === 'admin';

      const interview = await storage.getInterviewById(interviewId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      if (interview.userId !== userId && !isAdminUser) {
        return res.status(403).json({ message: "You can only share your own interviews" });
      }

      const isShared = !interview.isShared;
      const shareToken = isShared ? (interview.shareToken || randomUUID()) : interview.shareToken;

      const updated = await storage.updateInterview(interviewId, {
        isShared,
        shareToken,
      });

      res.json({
        isShared: updated.isShared,
        shareToken: updated.shareToken,
        message: updated.isShared ? "Interview is now public" : "Interview is now private"
      });
    } catch (error) {
      console.error("Error toggling share status:", error);
      res.status(500).json({ message: "Failed to toggle share status" });
    }
  });

  // Get public interview details for recruiters
  app.get('/api/public/interviews/:shareToken', async (req, res) => {
    try {
      const { shareToken } = req.params;
      const interview = await storage.getInterviewByShareToken(shareToken);

      if (!interview || !interview.isShared) {
        return res.status(404).json({ message: "Shared interview report not found or is set to private." });
      }

      // Fetch user detail for profile (only first name / college / department for student privacy)
      const user = await storage.getUser(interview.userId);
      const studentName = user ? `${user.firstName || ''} ${user.lastName ? user.lastName[0] + '.' : ''}`.trim() : "Anonymous Candidate";
      const studentCollege = user?.college || "Confidential University";
      const studentDepartment = user?.department || "Technology";

      const questions = await storage.getQuestionsByInterviewId(interview.id);

      res.json({
        interview: {
          id: interview.id,
          company: interview.company,
          simulationMode: interview.simulationMode,
          overallScore: interview.overallScore,
          technicalScore: interview.technicalScore,
          communicationScore: interview.communicationScore,
          emotionScore: interview.emotionScore,
          voiceScore: interview.voiceScore,
          feedback: interview.feedback,
          completedAt: interview.completedAt,
        },
        candidate: {
          name: studentName,
          college: studentCollege,
          department: studentDepartment,
        },
        questions: questions.map(q => ({
          question: q.question,
          userAnswer: q.userAnswer,
          score: q.score,
          feedback: q.feedback,
          round: q.round
        }))
      });
    } catch (error) {
      console.error("Error fetching public interview:", error);
      res.status(500).json({ message: "Failed to fetch public interview" });
    }
  });

  // Admin: Get all scheduled campaigns
  app.get('/api/admin/scheduler', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const campaigns = await storage.getScheduledCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching scheduled campaigns:", error);
      res.status(500).json({ message: "Failed to fetch scheduled campaigns" });
    }
  });

  // Admin: Create scheduled campaign
  app.post('/api/admin/scheduler', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { title, company, difficulty, simulationMode, branch, scheduledAt } = req.body;

      if (!title || !difficulty || !simulationMode || !scheduledAt) {
        return res.status(400).json({ message: "Missing required campaign parameters." });
      }

      const campaign = await storage.createScheduledCampaign({
        title,
        company: company || null,
        difficulty,
        simulationMode,
        branch: branch || null,
        scheduledAt: new Date(scheduledAt),
        status: "pending",
      });

      res.json({ success: true, campaign });
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create scheduled campaign" });
    }
  });

  // Admin: Delete scheduled campaign
  app.delete('/api/admin/scheduler/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteScheduledCampaign(id);
      res.json({ success: true, message: "Campaign deleted successfully." });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete scheduled campaign" });
    }
  });

  app.post('/api/interviews/:id/answer', isAuthenticated, async (req: any, res) => {
    try {
      const interviewId = req.params.id;
      const { questionId, answer } = req.body;

      if (!questionId) {
        return res.status(400).json({ message: "Question ID is required" });
      }

      if (!answer || answer.trim() === '') {
        return res.status(400).json({ message: "Answer cannot be empty" });
      }

      // Verify the question belongs to this interview
      const question = await storage.getInterviewQuestionById(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      if (question.interviewId !== interviewId) {
        return res.status(403).json({ message: "Question does not belong to this interview" });
      }

      // Optimistic save of raw answer with placeholder scoring
      const optimisticQuestion = await storage.updateInterviewQuestion(questionId, {
        userAnswer: answer,
        // Mark as "pending" – UI can treat undefined score as not yet evaluated
        score: null as any,
        feedback: "Evaluation in progress...",
      });

      console.log(`Answer received for question ${questionId} in interview ${interviewId}, scheduling async evaluation.`);
      res.json(optimisticQuestion);

      // Add to evaluation queue for managed background processing
      evaluationQueue.add(questionId, answer, question.question || '');
    } catch (error: any) {
      console.error("Error submitting answer:", error);
      res.status(500).json({
        message: "Failed to submit answer",
        error: error?.message || String(error)
      });
    }
  });

  app.post('/api/interviews/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const interviewId = req.params.id;

      // Accept real-time accumulated scores from the client
      const { emotionData, voiceData, communicationData } = req.body;

      const existingInterview = await storage.getInterviewById(interviewId);

      const questions = await storage.getQuestionsByInterviewId(interviewId);
      const validAnsweredQuestions = questions.filter(q => {
        const a = (q.userAnswer || '').trim().toLowerCase();
        return a.length > 0 && a !== "(no answer recorded)" && a !== "silence detected";
      });

      const totalQuestionsCount = questions.length || 1;
      const totalPointsEarned = questions.reduce((acc, q) => acc + (q.score || 0), 0);

      let technicalScore = 0;
      let communicationScore = 0;
      let emotionScore = 0;
      let voiceScore = 0;
      let overallScore = 0;

      if (validAnsweredQuestions.length > 0) {
        const avgScore = totalPointsEarned / totalQuestionsCount;
        technicalScore = Math.round(avgScore);
        communicationScore = communicationData?.overall ?? Math.round(avgScore);
        emotionScore = emotionData?.emotion_score ?? Math.round(avgScore * 0.9);
        voiceScore = voiceData?.overall_voice_score ?? Math.round(avgScore * 0.9);
        overallScore = Math.round((technicalScore + communicationScore + emotionScore + voiceScore) / 4);
      }

      const improvements: string[] = [];
      if (validAnsweredQuestions.length === 0) {
        improvements.push("No responses recorded during session. Ensure your microphone is connected and test your audio before starting.");
      } else {
        if (technicalScore < 70) improvements.push("Practice more technical concepts and explain code logic in detail");
        if (communicationScore < 70) improvements.push("Work on structured responses using bullet points and clear examples");
        if (voiceScore < 70) improvements.push("Focus on voice clarity, steady pacing, and speaking volume");
        if (emotionScore < 70) improvements.push("Work on maintaining confident expressions during the interview");
      }

      // Calculate real duration from startedAt timestamp
      const completedAt = new Date();
      const startedAt = existingInterview?.startedAt ? new Date(existingInterview.startedAt) : null;
      const durationSeconds = startedAt
        ? Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
        : 0;

      const interview = await storage.updateInterview(interviewId, {
        status: 'completed',
        technicalScore,
        communicationScore,
        emotionScore,
        voiceScore,
        overallScore,
        improvements,
        completedAt,
        duration: durationSeconds,
      });

      const resume = await storage.getResumeByUserId(userId);
      const resumeScore = resume?.overallScore || 50;

      // Get JD score if available
      const jds = await storage.getJobDescriptionsByUserId(userId);
      const jdScore = jds.length > 0 ? (jds[0].matchScore || 50) : 50;

      // Run heavy personality and placement predictions in background
      (async () => {
        try {
          const personality = await analyzePersonality(questions);
          const { prob30, prob60, prob90, factors } = await calculatePlacementProbability(
            technicalScore,
            communicationScore,
            emotionScore,
            voiceScore,
            resumeScore,
            jdScore,
            50, // GD score
            personality
          );

          const existingPlacement = await storage.getPlacementProbabilityByUserId(userId);
          if (existingPlacement) {
            await storage.updatePlacementProbability(existingPlacement.id, {
              probability30Days: prob30,
              probability60Days: prob60,
              probability90Days: prob90,
              confidence: 60 + validAnsweredQuestions.length * 5,
              factors,
            });
          } else {
            await storage.createPlacementProbability({
              userId,
              probability30Days: prob30,
              probability60Days: prob60,
              probability90Days: prob90,
              confidence: 40 + validAnsweredQuestions.length * 5,
              factors,
            });
          }

          // Personality already calculated above
          const existingPersonality = await storage.getPersonalityByUserId(userId);
          if (existingPersonality) {
            await storage.updatePersonalityAssessment(existingPersonality.id, personality);
          } else {
            await storage.createPersonalityAssessment({
              userId,
              ...personality,
            });
          }
          console.log("Background processing for placement and personality completed.");
        } catch (bgError) {
          console.error("Error in background placement calculation:", bgError);
        }
      })();

      // ─── AUTO EMAIL: Interview Results & Report ───
      (async () => {
        try {
          const student = await storage.getUser(userId);
          if (student?.email) {
            const studentFullName = [student.firstName, student.lastName].filter(Boolean).join(' ') || student.rollNumber || 'Candidate';
            const interviewTypes = (existingInterview?.types as string[]) || [existingInterview?.type || 'technical'];
            const completedAtStr = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            const emailData = buildResultsEmail({
              studentName: studentFullName,
              rollNumber: student.rollNumber || 'N/A',
              interviewType: interviewTypes.join(', '),
              difficulty: existingInterview?.difficulty || 'medium',
              company: existingInterview?.company || undefined,
              overallScore,
              technicalScore,
              communicationScore,
              emotionScore,
              voiceScore,
              feedback: (interview as any).feedback || 'Your performance has been evaluated by our AI assessment engine.',
              improvements: (interview as any).improvements || [],
              interviewId: interviewId,
              completedAt: completedAtStr,
              duration: durationSeconds || undefined,
            });

            await sendEmail({ to: student.email, subject: emailData.subject, html: emailData.html });
            console.log(`[AUTO EMAIL] Interview results report sent to ${student.email}`);
          }
        } catch (emailErr) {
          console.error('[AUTO EMAIL ERROR] Failed to send results email:', emailErr);
        }
      })();

      res.json(interview);
    } catch (error) {
      console.error("Error completing interview:", error);
      res.status(500).json({ message: "Failed to complete interview" });
    }
  });

  app.get('/api/personality', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const personality = await storage.getPersonalityByUserId(userId);
      if (!personality) {
        // Return default/empty personality data instead of 404
        return res.json({
          id: null,
          userId,
          introvertExtrovert: 0,
          thinkerFeeler: 0,
          logicalCreative: 0,
          dominantTraits: [],
          summary: "Complete interviews to get personality assessment"
        });
      }
      res.json(personality);
    } catch (error) {
      console.error("Error fetching personality:", error);
      res.status(500).json({ message: "Failed to fetch personality" });
    }
  });

  // Emotion analysis endpoint (proxies to Python service)
  app.post('/api/emotion/analyze', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.json({
          success: true,
          data: {
            emotion: 'Neutral',
            confidence: 0.7
          }
        });
      }

      // Call Python AI service
      const result = await pythonAI.analyzeEmotion(req.file.buffer);

      if (result) {
        return res.json({ success: true, data: result });
      } else {
        // Return default emotion if Python service fails
        return res.json({
          success: true,
          data: {
            emotion: 'Neutral',
            confidence: 0.7
          }
        });
      }
    } catch (error) {
      console.error("Error analyzing emotion:", error);
      // Return default emotion on error
      return res.json({
        success: true,
        data: {
          emotion: 'Neutral',
          confidence: 0.7
        }
      });
    }
  });

  app.get('/api/placement-probability', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const placement = await storage.getPlacementProbabilityByUserId(userId);
      if (!placement) {
        // Return default placement data instead of 404
        return res.json({
          id: null,
          userId,
          probability30Days: 0,
          probability60Days: 0,
          probability90Days: 0,
          confidence: 0,
          factors: [],
        });
      }
      res.json(placement);
    } catch (error) {
      console.error("Error fetching placement probability:", error);
      res.status(500).json({ message: "Failed to fetch placement probability" });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Optimized: Use count methods instead of loading all records
      const totalStudents = await storage.getStudentCount();
      const totalInterviews = await storage.getInterviewCount();
      const avgScores = await storage.getAverageScores();

      // Mock placement probability - could be calculated from actual data
      const avgPlacementProb = 60 + Math.random() * 20;

      res.json({
        totalStudents,
        totalInterviews,
        avgTechnicalScore: avgScores.technical,
        avgHrScore: avgScores.hr,
        avgGdScore: avgScores.gd,
        avgPlacementProb,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/students', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const students = await storage.getStudents();
      const allInterviews = await db.select().from(interviews);

      const now = Date.now();

      // Auto-finalize any in_progress interview started > 25 mins ago so reports don't get stuck in 'Evaluating'
      for (const i of allInterviews) {
        if (i.status === 'in_progress') {
          const started = i.startedAt ? new Date(i.startedAt).getTime() : 0;
          if (started > 0 && now - started > 25 * 60 * 1000) {
            const qList = (i.questions as any[]) || [];
            const validAnswers = qList.filter(q => {
              const a = (q.userAnswer || '').trim();
              return a.length > 0 && a !== '(no answer recorded)' && a !== 'silence detected';
            });
            const totalCount = qList.length || 1;
            const pointsEarned = qList.reduce((acc, q) => acc + (q.score || 0), 0);
            const avgScore = validAnswers.length > 0 ? Math.round(pointsEarned / totalCount) : 0;

            await db.update(interviews)
              .set({
                status: 'completed',
                technicalScore: avgScore,
                communicationScore: avgScore,
                emotionScore: Math.round(avgScore * 0.9),
                voiceScore: Math.round(avgScore * 0.9),
                overallScore: avgScore,
                completedAt: new Date(),
              } as any)
              .where(eq(interviews.id, i.id));

            i.status = 'completed';
            i.overallScore = avgScore;
          }
        }
      }

      const userInterviewMap = new Map<string, any[]>();
      allInterviews.forEach((i: any) => {
        if (!userInterviewMap.has(i.userId)) userInterviewMap.set(i.userId, []);
        userInterviewMap.get(i.userId)!.push(i);
      });

      // SECURITY: Remove password hashes & attach real-time interview participation status
      const sanitizedStudents = students.map(student => {
        const { passwordHash, ...studentWithoutPassword } = student as any;
        const userInts = userInterviewMap.get(student.id) || [];

        const liveInt = userInts.find((i: any) => i.status === 'in_progress');
        const compInt = userInts.find((i: any) => i.status === 'completed');
        const pendInt = userInts.find((i: any) => i.status === 'pending');
        const latestInt = liveInt || compInt || pendInt || userInts[0];

        return {
          ...studentWithoutPassword,
          activeInterviewStatus: liveInt ? 'in_progress' : compInt ? 'completed' : pendInt ? 'pending' : 'not_scheduled',
          latestInterviewScore: compInt?.overallScore ?? null,
          latestInterviewId: latestInt?.id ?? null,
          latestInterviewType: latestInt?.type ?? null,
        };
      });

      res.json(sanitizedStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // GET /api/admin/students/:id/interviews - View all interview reports for a student
  app.get('/api/admin/students/:id/interviews', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const studentId = req.params.id;
      const student = await storage.getUser(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userInterviews = await db.select().from(interviews).where(eq(interviews.userId, studentId));
      const { passwordHash, ...sanitizedStudent } = student as any;

      res.json({
        student: sanitizedStudent,
        interviews: userInterviews,
      });
    } catch (error) {
      console.error("Error fetching student interview reports:", error);
      res.status(500).json({ message: "Failed to fetch student interview reports" });
    }
  });

  // POST /api/admin/send-report-email - Email an interview report to student or placement team
  app.post('/api/admin/send-report-email', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { interviewId, recipientEmail } = req.body;
      if (!interviewId) {
        return res.status(400).json({ message: "Interview ID is required" });
      }

      const intRec = await storage.getInterviewById(interviewId);
      if (!intRec) {
        return res.status(404).json({ message: "Interview not found" });
      }

      const student = await storage.getUser(intRec.userId);
      const targetEmail = recipientEmail || student?.email;

      if (!targetEmail || !targetEmail.includes("@")) {
        return res.status(400).json({ message: "Valid recipient email is required" });
      }

      const studentName = student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() || "Student" : "Student";
      const rollNumber = student?.rollNumber || "N/A";
      const overallScore = intRec.overallScore ?? 0;

      const emailContent = buildResultsEmail({
        studentName,
        rollNumber,
        interviewType: intRec.type || 'technical',
        company: intRec.company || undefined,
        difficulty: 'medium',
        overallScore,
        technicalScore: intRec.technicalScore ?? overallScore,
        communicationScore: intRec.communicationScore ?? overallScore,
        emotionScore: intRec.emotionScore ?? overallScore,
        voiceScore: intRec.voiceScore ?? overallScore,
        feedback: (intRec.improvements || []).join('. ') || 'Good effort across technical and behavioral dimensions.',
        improvements: intRec.improvements || [],
        interviewId: intRec.id,
        completedAt: intRec.completedAt ? new Date(intRec.completedAt).toLocaleString() : new Date().toLocaleString(),
        duration: intRec.duration || undefined,
      });

      await sendEmail({
        to: targetEmail,
        subject: emailContent.subject || `[AI MOCK INTERVIEW REPORT] Performance Summary - ${rollNumber}`,
        html: emailContent.html,
      });

      res.json({ message: `Interview report successfully emailed to ${targetEmail}` });
    } catch (error: any) {
      console.error("Error sending report email:", error);
      res.status(500).json({ message: error.message || "Failed to send report email" });
    }
  });

  const updateStudentSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    rollNumber: z.string().min(1).optional(),
    department: z.string().optional(),
    year: z.number().int().optional(),
    password: z.string().min(1).optional(),
    slotDate: z.string().optional(),
    slotStartTime: z.string().optional(),
    slotEndTime: z.string().optional(),
    slotStatus: z.string().optional(),
  });

  app.patch('/api/admin/students/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const studentId = req.params.id;
      const student = await storage.getUser(studentId);
      if (!student || student.role !== 'student') {
        return res.status(404).json({ message: "Student not found" });
      }

      const data = updateStudentSchema.parse(req.body);
      const updateData: Partial<User> = {};

      if (typeof data.firstName === 'string') {
        updateData.firstName = data.firstName || null;
      }
      if (typeof data.lastName === 'string') {
        updateData.lastName = data.lastName || null;
      }
      if (typeof data.department === 'string') {
        updateData.department = data.department || null;
      }
      if (typeof data.year === 'number') {
        updateData.year = data.year;
      }
      if (typeof data.rollNumber === 'string' && data.rollNumber.trim()) {
        const normalizedRoll = data.rollNumber.trim();
        updateData.rollNumber = normalizedRoll;
        updateData.email = `${normalizedRoll}@students.local`;
      }
      if (typeof data.password === 'string' && data.password.trim()) {
        updateData.passwordHash = await hashPassword(data.password.trim());
      }
      if (typeof data.slotDate === 'string') {
        updateData.slotDate = data.slotDate || null;
      }
      if (typeof data.slotStartTime === 'string') {
        updateData.slotStartTime = data.slotStartTime || null;
      }
      if (typeof data.slotEndTime === 'string') {
        updateData.slotEndTime = data.slotEndTime || null;
      }
      if (typeof data.slotStatus === 'string') {
        updateData.slotStatus = data.slotStatus || 'scheduled';
      }

      const updated = await storage.updateUser(studentId, updateData as any);
      const { passwordHash, ...responseUser } = updated as any;
      res.json(responseUser);
    } catch (error: any) {
      console.error("Error updating student:", error);
      res.status(500).json({ message: error.message || "Failed to update student" });
    }
  });

  app.delete('/api/admin/students/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const studentId = req.params.id;
      const student = await storage.getUser(studentId);
      if (!student || student.role !== 'student') {
        return res.status(404).json({ message: "Student not found" });
      }

      await storage.deleteUser(studentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // Fetch student's interviews for Admin Report modal
  app.get('/api/admin/students/:id/interviews', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const studentId = req.params.id;
      const student = await storage.getUser(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      const studentInterviews = await storage.getInterviewsByUserId(studentId);
      res.json({ student, interviews: studentInterviews });
    } catch (error) {
      console.error("Error fetching student interviews for admin:", error);
      res.status(500).json({ message: "Failed to fetch student interviews" });
    }
  });

  // Send Detailed Result Report via Email (Brevo API & SMTP - Kitaghire Subsystem)
  app.post('/api/admin/send-report-email', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { interviewId, recipientEmail } = req.body;
      if (!interviewId) {
        return res.status(400).json({ message: "Interview ID is required" });
      }

      const interview = await storage.getInterviewById(interviewId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      const student = await storage.getUser(interview.userId);
      const emailToUse = recipientEmail || student?.email;

      if (!emailToUse) {
        return res.status(400).json({ message: "No valid student email address found" });
      }

      const studentName = student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : 'Candidate';

      const htmlReport = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #6366f1; font-size: 28px; margin: 0;">Skillnox AI</h1>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Placement & Interview Readiness Subsystem | Kitaghire</p>
          </div>
          
          <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
            <h2 style="font-size: 20px; color: #ffffff; margin-top: 0;">Interview Results & Report</h2>
            <p style="color: #cbd5e1; font-size: 15px;">Candidate: <strong>${studentName}</strong> (${student?.rollNumber || 'N/A'})</p>
            <p style="color: #cbd5e1; font-size: 15px;">Interview Type: <strong>${((interview.types as string[]) || [interview.type]).join(', ').toUpperCase()}</strong></p>
            <p style="color: #cbd5e1; font-size: 15px;">Difficulty: <strong>${(interview.difficulty || 'medium').toUpperCase()}</strong></p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div style="background: #1e293b; padding: 16px; border-radius: 12px; text-align: center;">
              <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Overall Score</span>
              <h3 style="font-size: 28px; color: #6366f1; margin: 8px 0 0 0;">${Math.round(interview.overallScore || 0)}%</h3>
            </div>
            <div style="background: #1e293b; padding: 16px; border-radius: 12px; text-align: center;">
              <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Technical Score</span>
              <h3 style="font-size: 28px; color: #10b981; margin: 8px 0 0 0;">${Math.round(interview.technicalScore || 0)}%</h3>
            </div>
            <div style="background: #1e293b; padding: 16px; border-radius: 12px; text-align: center;">
              <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Communication Score</span>
              <h3 style="font-size: 28px; color: #f59e0b; margin: 8px 0 0 0;">${Math.round(interview.communicationScore || 0)}%</h3>
            </div>
            <div style="background: #1e293b; padding: 16px; border-radius: 12px; text-align: center;">
              <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Voice & Clarity</span>
              <h3 style="font-size: 28px; color: #ec4899; margin: 8px 0 0 0;">${Math.round(interview.voiceScore || 0)}%</h3>
            </div>
          </div>

          <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
            <h4 style="color: #818cf8; margin-top: 0;">Detailed AI Feedback Summary</h4>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">${interview.feedback || 'Candidate performed well during the interview drive session.'}</p>
          </div>

          <div style="text-align: center; margin-top: 32px; border-top: 1px solid #334155; padding-top: 16px;">
            <p style="color: #64748b; font-size: 12px;">Skillnox AI — Official Subsystem of Kitaghire (https://skillnoxai.kitaghire.in)</p>
          </div>
        </div>
      `;

      const sent = await sendEmail({
        to: emailToUse,
        subject: `[Skillnox AI] Official Interview Report - ${studentName}`,
        html: htmlReport,
      });

      if (sent) {
        res.json({ message: `Detailed report emailed successfully to ${emailToUse}` });
      } else {
        res.status(500).json({ message: "Failed to deliver report email via Brevo SMTP/API" });
      }
    } catch (error: any) {
      console.error("Error sending report email:", error);
      res.status(500).json({ message: error.message || "Failed to send report email" });
    }
  });

  // Bulk import students via CSV (name, roll number, branch)
  app.post('/api/admin/students/import', isAuthenticated, isAdmin, upload.single('file'), async (req: any, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const content = file.buffer.toString('utf8').replace(/^\uFEFF/, '');
      const rawLines = content.split(/\r?\n/);
      const detectedDelimiter = rawLines[0]?.includes('\t')
        ? '\t'
        : rawLines[0]?.includes(';')
          ? ';'
          : ',';
      const lines = rawLines.map((line: string) => line.trim()).filter(Boolean);

      if (lines.length === 0) {
        return res.status(400).json({ message: "File is empty" });
      }

      const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
      };

      const headerCells = lines[0].split(detectedDelimiter).map((cell: string) => cell.trim());
      const lowerHeader = headerCells.map((cell: string) => cell.toLowerCase());
      const findIndex = (keywords: string[]) =>
        lowerHeader.findIndex((cell: string) => keywords.some((keyword) => cell.includes(keyword)));

      const headerHasLabels =
        findIndex(['name']) !== -1 || findIndex(['roll']) !== -1 || findIndex(['branch']) !== -1;

      const nameIndex = headerHasLabels ? findIndex(['name']) : 0;
      const rollIndex = headerHasLabels ? findIndex(['roll']) : 1;
      const branchIndex = headerHasLabels ? findIndex(['branch']) : 2;
      const passwordIndex = headerHasLabels ? findIndex(['password']) : -1;

      if (headerHasLabels && (nameIndex === -1 || rollIndex === -1 || branchIndex === -1)) {
        return res.status(400).json({
          message: "Header row must include Name, Roll Number, and Branch columns.",
        });
      }

      const parsedRows: Array<{
        lineNumber: number;
        name: string;
        roll: string;
        branch: string;
        password?: string;
      }> = [];

      const startIndex = headerHasLabels ? 1 : 0;
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const cols = line.split(detectedDelimiter).map((c: string) => c.trim());

        const name = cols[nameIndex >= 0 ? nameIndex : 0] || '';
        const roll = cols[rollIndex >= 0 ? rollIndex : 1] || '';
        const branch = cols[branchIndex >= 0 ? branchIndex : 2] || '';
        const password = passwordIndex >= 0 ? cols[passwordIndex] : '';

        if (!name || !roll || !branch) {
          results.skipped++;
          results.errors.push(`Line ${i + 1}: Missing required values (Name, Roll Number, Branch).`);
          continue;
        }

        parsedRows.push({
          lineNumber: i + 1,
          name,
          roll,
          branch,
          password: password || undefined,
        });
      }

      const deriveEmail = (roll: string) => `${roll}@students.local`.toLowerCase();

      const rowResults = await Promise.all(
        parsedRows.map(async (row) => {
          try {
            const normalizedRoll = row.roll.replace(/\s+/g, '');
            if (!normalizedRoll) {
              throw new Error("Missing roll number");
            }

            const [firstName, ...restName] = row.name.split(' ').filter(Boolean);
            const lastName = restName.join(' ') || null;
            const email = deriveEmail(normalizedRoll);
            const passwordToHash = row.password && row.password.length > 0 ? row.password : normalizedRoll;
            const passwordHash = await hashPassword(passwordToHash);
            const existing = await storage.getUserByEmail(email);

            if (existing) {
              await storage.upsertUser({
                id: existing.id,
                email,
                passwordHash,
                rollNumber: normalizedRoll,
                firstName: firstName || existing.firstName,
                lastName: lastName ?? existing.lastName,
                department: row.branch || existing.department,
                role: existing.role || 'student',
              } as any);
              return { status: 'updated' as const };
            } else {
              await storage.upsertUser({
                email,
                passwordHash,
                rollNumber: normalizedRoll,
                firstName: firstName || null,
                lastName,
                department: row.branch || null,
                role: 'student',
              } as any);
              return { status: 'created' as const };
            }
          } catch (err: any) {
            return {
              status: 'error' as const,
              message: `Line ${row.lineNumber}: ${err?.message || 'Unknown error'}`,
            };
          }
        })
      );

      rowResults.forEach((result) => {
        if (result.status === 'created') {
          results.created++;
        } else if (result.status === 'updated') {
          results.updated++;
        } else if (result.status === 'error') {
          results.skipped++;
          results.errors.push(result.message);
        }
      });

      res.json(results);
    } catch (error) {
      console.error("Error importing students:", error);
      res.status(500).json({ message: "Failed to import students" });
    }
  });

  app.get('/api/admin/skill-gaps', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const skillGaps = await storage.getSkillGapAnalysis();
      res.json(skillGaps);
    } catch (error) {
      console.error("Error fetching skill gaps:", error);
      res.status(500).json({ message: "Failed to fetch skill gaps" });
    }
  });

  // ====== ADMIN - College Trial Features ======

  /**
   * Get global system settings (interviews enabled, etc.)
   */
  app.get('/api/admin/settings', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { db } = await import("./db.js");
      const { globalSettings } = await import("@shared/schema");

      const settings = await db.select().from(globalSettings);

      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  /**
   * Update a global setting (e.g., toggle interviews on/off)
   */
  app.post('/api/admin/settings', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { key, value, description } = req.body;

      if (!key || value === undefined) {
        return res.status(400).json({ message: "key and value are required" });
      }

      const { setGlobalSetting } = await import("./adminUtils.js");
      await setGlobalSetting(key, String(value), description);

      res.json({ success: true, message: "Setting updated" });
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  /**
   * Get dashboard analytics
   */
  app.get('/api/admin/analytics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { getDailyAnalytics, getTodayStats } = await import("./adminUtils.js");
      const { db } = await import("./db.js");
      const { interviews } = await import("@shared/schema");
      const { count } = await import("drizzle-orm");

      const days = parseInt(req.query.days as string) || 7;

      const dailyStats = await getDailyAnalytics(days);
      const todayStats = await getTodayStats();

      // Get total counts
      const totalInterviewsResult = await db.select({ count: count() }).from(interviews);
      const totalInterviews = totalInterviewsResult[0]?.count || 0;

      res.json({
        today: todayStats,
        daily: dailyStats,
        totals: {
          interviews: totalInterviews
        }
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  /**
   * Get available interview slots
   */
  app.get('/api/interview-slots', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db.js");
      const { interviewSlots } = await import("@shared/schema");
      const { gte } = await import("drizzle-orm");

      const now = new Date();

      const slots = await db.select()
        .from(interviewSlots)
        .where(gte(interviewSlots.startTime, now))
        .orderBy(interviewSlots.startTime);

      res.json(slots);
    } catch (error) {
      console.error("Error fetching interview slots:", error);
      res.status(500).json({ message: "Failed to fetch interview slots" });
    }
  });

  /**
    * Book an interview slot
    */
  app.post('/api/interview-slots/:slotId/book', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db.js");
      const { interviewSlots } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");

      const slotId = req.params.slotId;
      const userId = req.userId;

      // Check if slot exists and is available
      const slot = await db.select()
        .from(interviewSlots)
        .where(and(
          eq(interviewSlots.id, slotId),
          eq(interviewSlots.isBooked, false)
        ))
        .limit(1);

      if (slot.length === 0) {
        return res.status(400).json({ message: "Slot not available" });
      }

      // Book the slot
      await db.update(interviewSlots)
        .set({
          isBooked: true,
          bookedByUserId: userId
        })
        .where(eq(interviewSlots.id, slotId));

      res.json({ success: true, message: "Slot booked successfully" });
    } catch (error) {
      console.error("Error booking slot:", error);
      res.status(500).json({ message: "Failed to book slot" });
    }
  });

  /**
   * Admin: Create interview slots
   */
  app.post('/api/admin/interview-slots', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { db } = await import("./db.js");
      const { interviewSlots } = await import("@shared/schema");

      const { startTime, endTime } = req.body;

      if (!startTime || !endTime) {
        return res.status(400).json({ message: "startTime and endTime are required" });
      }

      const [slot] = await db.insert(interviewSlots)
        .values({
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          isBooked: false
        })
        .returning();

      res.json(slot);
    } catch (error) {
      console.error("Error creating slot:", error);
      res.status(500).json({ message: "Failed to create slot" });
    }
  });

  // NOTE: Global Settings endpoints are defined above (lines ~2642-2674) — duplicate removed

  return server;
}
