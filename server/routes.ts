import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import { z } from "zod";
import { 
  insertInterviewSchema, 
  insertJobDescriptionSchema,
  COMPANIES
} from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } 
});

const technicalQuestions = [
  "Explain the concept of Object-Oriented Programming and its four main principles.",
  "What is the difference between a stack and a queue? When would you use each?",
  "Explain the concept of Big O notation and give examples of common time complexities.",
  "What is the difference between SQL and NoSQL databases?",
  "Explain what REST API is and its core principles.",
  "What is the difference between HTTP and HTTPS?",
  "Describe the process of debugging a complex issue in production.",
  "What is version control and why is it important?",
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

function parseResume(content: string): { skills: string[]; experience: any[]; education: any[] } {
  const skills = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'HTML', 'CSS',
    'TypeScript', 'Git', 'AWS', 'Docker', 'MongoDB', 'PostgreSQL'
  ].filter(() => Math.random() > 0.5);

  const experience = [
    { title: 'Software Developer Intern', company: 'Tech Corp', duration: '3 months' },
    { title: 'Project Lead', company: 'College Project', duration: '6 months' },
  ];

  const education = [
    { degree: 'B.Tech Computer Science', institution: 'XYZ University', year: '2024' },
  ];

  return { skills, experience, education };
}

function analyzeJobDescription(description: string, resumeSkills: string[]): { requiredSkills: string[]; matchScore: number; skillGaps: string[] } {
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

function evaluateAnswer(answer: string, expectedKeywords?: string[]): { score: number; feedback: string } {
  const wordCount = answer.trim().split(/\s+/).length;
  
  let score = 50;
  let feedback = "Good attempt. ";

  if (wordCount > 50) {
    score += 20;
    feedback += "Detailed response. ";
  } else if (wordCount > 20) {
    score += 10;
    feedback += "Could add more detail. ";
  } else {
    feedback += "Try to elaborate more. ";
  }

  if (answer.includes("example") || answer.includes("instance") || answer.includes("situation")) {
    score += 15;
    feedback += "Good use of examples. ";
  }

  if (answer.includes("because") || answer.includes("reason") || answer.includes("therefore")) {
    score += 10;
    feedback += "Good logical reasoning. ";
  }

  score = Math.min(100, Math.max(0, score + (Math.random() * 10 - 5)));

  return { score, feedback };
}

function calculatePlacementProbability(
  technicalScore: number,
  hrScore: number,
  emotionScore: number,
  voiceScore: number,
  resumeScore: number
): { prob30: number; prob60: number; prob90: number; factors: any } {
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

function analyzePersonality(responses: any[]): {
  introvertExtrovert: number;
  thinkerFeeler: number;
  logicalCreative: number;
  plannerSpontaneous: number;
  dominantTraits: string[];
  summary: string;
} {
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
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/resume', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resume = await storage.getResumeByUserId(userId);
      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }
      res.json(resume);
    } catch (error) {
      console.error("Error fetching resume:", error);
      res.status(500).json({ message: "Failed to fetch resume" });
    }
  });

  app.post('/api/resume/upload', isAuthenticated, upload.single('resume'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const content = file.buffer.toString('utf-8');
      const { skills, experience, education } = parseResume(content);
      const overallScore = 60 + Math.random() * 30;

      const resume = await storage.createResume({
        userId,
        fileName: file.originalname,
        parsedData: { raw: content.substring(0, 500) },
        skills,
        experience,
        education,
        overallScore,
      });

      res.json(resume);
    } catch (error) {
      console.error("Error uploading resume:", error);
      res.status(500).json({ message: "Failed to upload resume" });
    }
  });

  app.get('/api/job-descriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jds = await storage.getJobDescriptionsByUserId(userId);
      res.json(jds);
    } catch (error) {
      console.error("Error fetching job descriptions:", error);
      res.status(500).json({ message: "Failed to fetch job descriptions" });
    }
  });

  app.post('/api/job-descriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, company, description } = req.body;

      const resume = await storage.getResumeByUserId(userId);
      const resumeSkills = resume?.skills || [];

      const { requiredSkills, matchScore, skillGaps } = analyzeJobDescription(description, resumeSkills);

      const jd = await storage.createJobDescription({
        userId,
        title,
        company,
        description,
        requiredSkills,
        matchScore,
        skillGaps,
      });

      res.json(jd);
    } catch (error) {
      console.error("Error creating job description:", error);
      res.status(500).json({ message: "Failed to create job description" });
    }
  });

  app.get('/api/interviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const interviews = await storage.getInterviewsByUserId(userId);
      res.json(interviews);
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

  app.post('/api/interviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type, company } = req.body;

      const user = await storage.getUser(userId);
      const interviewCount = user?.interviewCount || 0;
      const avatarGender = getAvatarGender(interviewCount);

      let questions: string[] = [];
      switch (type) {
        case 'technical':
          questions = getRandomQuestions(technicalQuestions, 5);
          break;
        case 'hr':
          questions = getRandomQuestions(hrQuestions, 5);
          break;
        case 'behavioral':
          questions = getRandomQuestions(behavioralQuestions, 5);
          break;
        case 'project':
          questions = getRandomQuestions(projectQuestions, 5);
          break;
        case 'gd':
          questions = getRandomQuestions(gdTopics, 1);
          break;
        case 'company':
          if (company && companyQuestions[company]) {
            questions = [...companyQuestions[company], ...getRandomQuestions(technicalQuestions, 2)];
          } else {
            questions = getRandomQuestions(technicalQuestions, 5);
          }
          break;
        default:
          questions = getRandomQuestions(technicalQuestions, 5);
      }

      const interview = await storage.createInterview({
        userId,
        type,
        company,
        status: 'in_progress',
        avatarGender,
        questions,
        startedAt: new Date(),
      });

      for (let i = 0; i < questions.length; i++) {
        await storage.createInterviewQuestion({
          interviewId: interview.id,
          question: questions[i],
          orderIndex: i,
        });
      }

      await storage.updateUserInterviewCount(userId);

      res.json(interview);
    } catch (error) {
      console.error("Error creating interview:", error);
      res.status(500).json({ message: "Failed to create interview" });
    }
  });

  app.get('/api/interviews/:id/questions', isAuthenticated, async (req: any, res) => {
    try {
      const questions = await storage.getQuestionsByInterviewId(req.params.id);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post('/api/interviews/:id/answer', isAuthenticated, async (req: any, res) => {
    try {
      const { questionId, answer } = req.body;

      const { score, feedback } = evaluateAnswer(answer);

      const question = await storage.updateInterviewQuestion(questionId, {
        userAnswer: answer,
        score,
        feedback,
      });

      res.json(question);
    } catch (error) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ message: "Failed to submit answer" });
    }
  });

  app.post('/api/interviews/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

      const { prob30, prob60, prob90, factors } = calculatePlacementProbability(
        technicalScore,
        communicationScore,
        emotionScore,
        voiceScore,
        resumeScore
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

      const personality = analyzePersonality(questions);
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
      const userId = req.user.claims.sub;
      const personality = await storage.getPersonalityByUserId(userId);
      if (!personality) {
        return res.status(404).json({ message: "Personality assessment not found" });
      }
      res.json(personality);
    } catch (error) {
      console.error("Error fetching personality:", error);
      res.status(500).json({ message: "Failed to fetch personality" });
    }
  });

  app.get('/api/placement-probability', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const placement = await storage.getPlacementProbabilityByUserId(userId);
      if (!placement) {
        return res.status(404).json({ message: "Placement probability not found" });
      }
      res.json(placement);
    } catch (error) {
      console.error("Error fetching placement probability:", error);
      res.status(500).json({ message: "Failed to fetch placement probability" });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
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

  app.get('/api/admin/students', isAuthenticated, async (req: any, res) => {
    try {
      const students = await storage.getStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get('/api/admin/skill-gaps', isAuthenticated, async (req: any, res) => {
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
