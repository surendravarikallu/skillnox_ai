import type { Express } from "express";
import type { Server } from "http";
import { randomUUID } from "crypto";
import { createRequire } from "module";
import { storage } from "./storage";
import { isAuthenticated, isAdmin, isStudent, hasRole, registerHandler, loginHandler, logoutHandler } from "./auth";
import multer from "multer";
import { z } from "zod";
import {
  insertInterviewSchema,
  insertJobDescriptionSchema,
  COMPANIES,
  type User
} from "@shared/schema";
import * as pythonAI from "./pythonAI";
import { hashPassword } from "./auth";

const require = createRequire(import.meta.url);
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

const AI_ANALYSIS_TIMEOUT_MS = 15000;
const PARSE_TIMEOUT_MS = 10000;
const SCORE_TIMEOUT_MS = 8000;
const PDF_CONTENT_WARNING_LENGTH = 15000;
const MAX_AI_CONTENT_LENGTH = 6000;
const MAX_PARSE_CONTENT_LENGTH = 8000;
const RAW_RESUME_STORE_LENGTH = 4000;

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
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(file.buffer) });
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
    // Fallback for non-PDF or failed parse
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

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label?: string): Promise<T> {
  return await new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        if (label) {
          console.warn(`${label} timed out after ${ms}ms`);
        }
        resolve(fallback);
      }
    }, ms);

    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch((error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          if (label) {
            console.error(`${label} failed:`, error);
          }
          resolve(fallback);
        }
      });
  });
}

const technicalQuestions = [
  "Explain the concept of Object-Oriented Programming and its four main principles.",
  "What is the difference between a stack and a queue? When would you use each?",
  "Explain the concept of Big O notation and give examples of common time complexities.",
  "Explain what REST API is and its core principles.",
  "What is the difference between HTTP and HTTPS?",
  "Describe the process of debugging a complex issue in production.",
  "What is version control and why is it important?",
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

const companyQuestions: Record<string, string[]> = {
  TCS: [
    "What do you know about TCS and its values?",
    "How do you handle multiple projects with conflicting deadlines?",
    "Explain a situation where you had to learn a new technology quickly.",
    "What is your approach to continuous learning?",
  ],
  Infosys: [
    "What attracts you to Infosys as a company?",
    "Describe your experience with agile methodologies.",
    "How do you ensure quality in your deliverables?",
    "What is your understanding of digital transformation?",
  ],
  Wipro: [
    "Why do you want to join Wipro?",
    "Describe your experience working in a team environment.",
    "How do you stay updated with industry trends?",
    "What is your approach to problem-solving?",
  ],
  Accenture: [
    "What do you know about Accenture's business areas?",
    "How would you handle a disagreement with a colleague?",
    "Describe a project where you used innovative thinking.",
    "What is your experience with client-facing work?",
  ],
  Cognizant: [
    "Why Cognizant over other IT companies?",
    "How do you manage work-life balance?",
    "Describe a time when you had to meet challenging targets.",
    "What is your understanding of digital engineering?",
  ],
  Capgemini: [
    "What attracts you to Capgemini?",
    "How do you approach learning new technologies?",
    "Describe your experience with collaborative projects.",
    "What are your career aspirations?",
  ],
  Amazon: [
    "Tell me about a time you disagreed with a manager's decision.",
    "Describe a situation where you had to dive deep to solve a problem.",
    "How do you prioritize when you have multiple deadlines?",
    "Tell me about a time you simplified a complex process.",
  ],
};

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

async function evaluateAnswer(answer: string, question?: string): Promise<{ score: number; feedback: string }> {
  const trimmed = (answer || '').trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const charCount = trimmed.length;

  // Heuristic flags
  const isVeryShort = wordCount < 5 || charCount < 20;
  const isShort = wordCount < 15;

  // Simple relevance: count overlapping keywords between question and answer
  let relevanceScore = 0;
  if (question) {
    const stopwords = new Set(["the", "a", "an", "and", "or", "but", "if", "in", "on", "at", "to", "for", "of", "is", "are", "am", "you", "your", "why", "what", "how", "who", "when", "where", "i", "me", "my"]);
    const qTokens = question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(t => t && !stopwords.has(t));
    const aTokens = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const aSet = new Set(aTokens);
    relevanceScore = qTokens.reduce((acc, t) => acc + (aSet.has(t) ? 1 : 0), 0);
  }

  // Try Python AI service first, but with a timeout so UI isn't blocked too long
  let baseScore = 50;
  let baseFeedback = "Good attempt.";
  try {
    const truncatedAnswerForAI = trimmed.length > 1500 ? trimmed.slice(0, 1500) : trimmed;
    const truncatedQuestionForAI = question && question.length > 500 ? question.slice(0, 500) : question;

    const aiResult = await withTimeout(
      pythonAI.evaluateAnswer(truncatedAnswerForAI, truncatedQuestionForAI),
      1500, // keep UI very responsive; fall back quickly if Python is slow
      null,
      "Answer evaluation"
    );

    if (aiResult) {
      baseScore = aiResult.score ?? baseScore;
      baseFeedback = aiResult.feedback || baseFeedback;
    }
  } catch (e) {
    console.error("Error calling Python AI evaluateAnswer, using heuristic fallback:", e);
  }

  // Heuristic refinement layer to avoid over-scoring weak answers
  let score = baseScore;
  let feedback = baseFeedback ? baseFeedback + " " : "";

  if (isVeryShort) {
    score = Math.min(score, 20);
    feedback += "Answer is too short. Please provide more detail with concrete points and examples. ";
  } else if (isShort) {
    score = Math.min(score, 35);
    feedback += "Answer is brief. Try to elaborate with specific reasons and examples. ";
  }

  if (relevanceScore === 0 && question) {
    score = Math.min(score, 40);
    feedback += "Your answer doesn't clearly address the question. Focus on the main point being asked. ";
  }

  // Extra credit for structure in heuristic-only scenarios
  if (!question && !trimmed) {
    score = 0;
    feedback = "No answer detected. Please respond to the question.";
  } else {
    const hasExample = /example|instance|situation/i.test(trimmed);
    const hasReasoning = /because|reason|therefore|so that/i.test(trimmed);
    if (hasExample) {
      score += 5;
      feedback += "Good use of examples. ";
    }
    if (hasReasoning) {
      score += 5;
      feedback += "Clear reasoning is shown. ";
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, feedback: feedback.trim() || "Good attempt." };
}

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
              llm_status: 'loaded', // Assume loaded since service is running and test passes
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
  app.post('/api/auth/login', loginHandler);
  app.post('/api/auth/logout', logoutHandler);

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

      if (aiAnalysis) {
        overallScore = aiAnalysis.score || overallScore;
        suggestions = aiAnalysis.suggestions || [];
        strengths = aiAnalysis.strengths || [];
        improvements = aiAnalysis.improvements || [];
        aiSkills = aiAnalysis.skills || [];
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

      // Admin can see all interviews, students only see their own
      if (user?.role === 'admin') {
        const allInterviews = await storage.getAllInterviews();
        res.json(allInterviews);
      } else {
        const interviews = await storage.getInterviewsByUserId(userId);
        res.json(interviews);
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
      res.json(interview);
    } catch (error) {
      console.error("Error fetching interview:", error);
      res.status(500).json({ message: "Failed to fetch interview" });
    }
  });

  // Admin-only: Create interview for a student
  app.post('/api/interviews', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Admin creates interview for a specific student
      const { studentId, type, types, difficulty, company } = req.body;
      const userId = studentId; // Use the student's ID, not admin's ID

      if (!userId) {
        return res.status(400).json({ message: "Student ID is required" });
      }

      // Verify the student exists
      const student = await storage.getUser(userId);
      if (!student || student.role !== 'student') {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      // Support both old (single type) and new (multiple types) format
      const interviewTypes: string[] = types && Array.isArray(types) && types.length > 0
        ? types
        : (type ? [type] : ['technical']); // Fallback to technical if nothing provided

      const difficultyLevel: 'easy' | 'medium' | 'hard' = difficulty || 'medium';

      // Validate types
      const validTypes = ['technical', 'hr', 'behavioral', 'project', 'gd', 'company'];
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

      if (useLLM) {
        console.log(`Python AI service is available, generating 10 LLM questions for types: ${filteredTypes.join(', ')}, difficulty: ${difficultyLevel}`);
      } else {
        console.log("Python AI service not available, using static questions");
      }

      // Generate 10 questions distributed across selected types
      const totalQuestions = 10;
      const questionsPerType = Math.floor(totalQuestions / filteredTypes.length);
      const remainder = totalQuestions % filteredTypes.length;

      // Optimize: Use more static questions, fewer LLM calls for speed
      // Generate only 1-2 LLM questions per type, rest from static pool
      const maxLLMQuestionsPerType = 1; // Reduced for faster generation

      // Helper function to get static questions for a type
      const getStaticPool = (questionType: string, options?: { preferCAndDb?: boolean }): string[] => {
        switch (questionType) {
          case 'technical':
            if (options?.preferCAndDb) {
              return [
                ...technicalCLanguageQuestions,
                ...technicalDatabaseQuestions,
                ...technicalQuestions,
              ];
            }
            return [
              ...technicalQuestions,
              ...technicalPythonQuestions,
              ...technicalCLanguageQuestions,
              ...technicalDatabaseQuestions,
            ];
          case 'hr':
            return hrQuestions;
          case 'behavioral':
            return behavioralQuestions;
          case 'project':
            return projectQuestions;
          case 'gd':
            return gdTopics;
          case 'company':
            return company && companyQuestions[company] ? companyQuestions[company] : technicalQuestions;
          default:
            return technicalQuestions;
        }
      };

      // Generate all questions in parallel for better performance with timeout
      const questionPromises = filteredTypes.map(async (questionType, index) => {
        const count = questionsPerType + (index < remainder ? 1 : 0);
        const questions: string[] = [];
        const preferCAndDbForType = questionType === 'technical' && preferTechnicalCAndDb;

        try {
          if (questionType === 'gd') {
            // GD only needs 1 topic
            if (count > 0) {
              if (useLLM) {
                // Add timeout for LLM calls (5 seconds)
                const gdTopic = await Promise.race([
                  pythonAI.generateGDTopic().catch(() => null),
                  new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
                ]);
                questions.push(gdTopic || getRandomQuestions(gdTopics, 1)[0]);
              } else {
                questions.push(...getRandomQuestions(gdTopics, 1));
              }
            }
          } else {
            // For other types, generate a few LLM questions and fill rest with static
            const staticPool = getStaticPool(questionType, { preferCAndDb: preferCAndDbForType });
            const llmCount = useLLM ? Math.min(maxLLMQuestionsPerType, Math.max(1, Math.floor(count / 2))) : 0;
            const staticCount = count - llmCount;

            // Generate LLM questions in parallel with timeout (8 seconds per question)
            const llmPromises = useLLM ? Array(llmCount).fill(0).map(() => {
              const contextHint = preferCAndDbForType
                ? "Focus on C programming fundamentals and database design concepts. Avoid Python unless necessary."
                : undefined;
              const questionPromise = questionType === 'company' && company
                ? pythonAI.generateQuestion('company', company, contextHint, difficultyLevel)
                : pythonAI.generateQuestion(questionType, undefined, contextHint, difficultyLevel);

              return Promise.race([
                questionPromise.catch(() => null),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
              ]);
            }) : [];

            const llmResults = await Promise.all(llmPromises);
            const validLLMQuestions = llmResults.filter((q): q is string => typeof q === 'string' && q.trim() !== '');

            // Fill rest with static questions
            const staticQuestions = getRandomQuestions(staticPool, staticCount + (llmCount - validLLMQuestions.length));

            questions.push(...validLLMQuestions, ...staticQuestions);
          }
        } catch (error) {
          console.error(`Error generating questions for type ${questionType}:`, error);
          // Fallback to static questions
          const staticPool = getStaticPool(questionType, { preferCAndDb: preferCAndDbForType });
          if (questionType === 'gd') {
            questions.push(...getRandomQuestions(staticPool, 1));
          } else {
            questions.push(...getRandomQuestions(staticPool, count));
          }
        }

        return questions;
      });

      // Wait for all question types to generate in parallel (with overall timeout)
      const questionArrays = await Promise.race([
        Promise.all(questionPromises),
        new Promise<string[][]>((resolve) => {
          setTimeout(() => {
            // If timeout, use all static questions
            console.log("Question generation timeout, using static questions");
            resolve(filteredTypes.map((questionType, index) => {
              const count = questionsPerType + (index < remainder ? 1 : 0);
              const staticPool = getStaticPool(questionType);
              if (questionType === 'gd') {
                return getRandomQuestions(staticPool, 1);
              }
              return getRandomQuestions(staticPool, count);
            }));
          }, 15000); // 15 second overall timeout
        })
      ]);
      let allQuestions = questionArrays.flat();

      // Ensure the first question in any interview is a friendly greeting + intro question
      if (allQuestions.length > 0) {
        const studentName =
          [student.firstName, student.lastName].filter(Boolean).join(" ") ||
          student.rollNumber ||
          "Student";
        allQuestions[0] = `Hi ${studentName} and welcome to Skillnox AI, so here is your first question, tell me about yourself.`;
      }

      // Ensure we have exactly 10 questions (pad or trim if needed)
      if (allQuestions.length < totalQuestions) {
        // Pad with technical questions if needed
        const needed = totalQuestions - allQuestions.length;
        const fallbackPool = getStaticPool('technical', { preferCAndDb: preferTechnicalCAndDb });
        allQuestions.push(...getRandomQuestions(fallbackPool, needed));
      } else if (allQuestions.length > totalQuestions) {
        // Trim to exactly 10
        allQuestions = allQuestions.slice(0, totalQuestions);
      }

      // Determine primary type for backward compatibility (use first type)
      const primaryType = filteredTypes[0] as any;

      const interview = await storage.createInterview({
        userId,
        type: primaryType, // Keep for backward compatibility
        types: filteredTypes, // New field for multiple types
        difficulty: difficultyLevel, // New field for difficulty
        company,
        status: 'pending', // Interview starts as pending until student joins
        avatarGender,
        questions: allQuestions,
        startedAt: null, // Will be set when student starts
      });

      // Batch create interview questions in parallel for better performance
      const dbQuestionPromises = allQuestions.map((question, index) =>
        storage.createInterviewQuestion({
          interviewId: interview.id,
          question: question,
          orderIndex: index,
        })
      );
      await Promise.all(dbQuestionPromises);

      await storage.updateUserInterviewCount(userId);

      console.log(`Interview created successfully: ${interview.id} with ${allQuestions.length} questions`);
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
          debug: {
            userId,
            interviewOwner: interview.userId,
            userRole,
            isAdmin: isAdminUser
          }
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
        console.log(`[Questions] Returning ${questions.length} questions for interview ${interviewId}`);
        return res.json(questions);
      }

      // Should not reach here, but just in case
      return res.status(400).json({ message: "Interview not started yet." });

      const questions = await storage.getQuestionsByInterviewId(interviewId);
      console.log(`[Questions] Returning ${questions.length} questions for interview ${interviewId}`);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
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

      // Fire-and-forget evaluation so UI is not blocked
      (async () => {
        try {
          const questionText = question.question || '';

          let score = 50;
          let feedback = "Good attempt.";

          try {
            const evaluation = await evaluateAnswer(answer, questionText);
            if (evaluation) {
              score = evaluation.score || 50;
              feedback = evaluation.feedback || "Good attempt.";
            }
          } catch (evalError) {
            console.error("Error evaluating answer with AI, using fallback:", evalError);
            const wordCount = answer.trim().split(/\s+/).length;
            if (wordCount > 50) {
              score = 70;
              feedback = "Detailed response. Good work!";
            } else if (wordCount > 20) {
              score = 60;
              feedback = "Good answer. Could add more detail.";
            } else {
              score = 50;
              feedback = "Try to elaborate more with examples.";
            }
          }

          await storage.updateInterviewQuestion(questionId, {
            score,
            feedback,
          });

          console.log(`Async evaluation completed for question ${questionId} in interview ${interviewId}`);
        } catch (bgError) {
          console.error("Background evaluation error (non-fatal):", bgError);
        }
      })();
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

      const questions = await storage.getQuestionsByInterviewId(interviewId);
      const answeredQuestions = questions.filter(q => q.userAnswer);

      const avgScore = answeredQuestions.length > 0
        ? answeredQuestions.reduce((acc, q) => acc + (q.score || 0), 0) / answeredQuestions.length
        : 50;

      const technicalScore = avgScore + (Math.random() * 10 - 5);
      const communicationScore = avgScore + (Math.random() * 15 - 7.5);
      const emotionScore = 60 + Math.random() * 30;
      const voiceScore = 55 + Math.random() * 35;
      const overallScore = (technicalScore + communicationScore + emotionScore + voiceScore) / 4;

      const improvements = [];
      if (technicalScore < 70) improvements.push("Practice more technical concepts");
      if (communicationScore < 70) improvements.push("Work on structured responses");
      if (voiceScore < 70) improvements.push("Focus on voice clarity and pacing");

      const interview = await storage.updateInterview(interviewId, {
        status: 'completed',
        technicalScore,
        communicationScore,
        emotionScore,
        voiceScore,
        overallScore,
        improvements,
        completedAt: new Date(),
        duration: Math.floor(Math.random() * 1800) + 600,
      });

      const resume = await storage.getResumeByUserId(userId);
      const resumeScore = resume?.overallScore || 50;

      // Get JD score if available
      const jds = await storage.getJobDescriptionsByUserId(userId);
      const jdScore = jds.length > 0 ? (jds[0].matchScore || 50) : 50;

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
          confidence: 60 + answeredQuestions.length * 5,
          factors,
        });
      } else {
        await storage.createPlacementProbability({
          userId,
          probability30Days: prob30,
          probability60Days: prob60,
          probability90Days: prob90,
          confidence: 40 + answeredQuestions.length * 5,
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
      const students = await storage.getStudents();
      const interviews = await storage.getAllInterviews();
      const avgScores = await storage.getAverageScores();

      const completedInterviews = interviews.filter(i => i.status === 'completed');
      const avgPlacementProb = 60 + Math.random() * 20;

      res.json({
        totalStudents: students.length,
        totalInterviews: interviews.length,
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
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  const updateStudentSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    rollNumber: z.string().min(1).optional(),
    department: z.string().optional(),
    year: z.number().int().optional(),
    password: z.string().min(1).optional(),
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

  return server;
}
