import { storage } from './storage';
import { buildQuestionSet, CompanyQuestion, type InterviewRound } from './company-questions';
import { Interview } from '@shared/schema';

export function generateDynamicIntroQuestion(studentName: string, company?: string | null, department?: string | null): string {
  const name = studentName || "Candidate";
  const dept = department || "Computer Science and Engineering";
  const comp = company ? ` for the ${company} recruitment drive` : "";

  const templates = [
    `Welcome ${name} to CONLOQUIUM '26${comp}! Could you walk us through your academic journey in ${dept} and summarize your core technical strengths?`,
    `Hello ${name}! Welcome to your placement assessment${comp}. Please provide a comprehensive self-introduction detailing your background in ${dept} and a software project you recently developed.`,
    `Good day ${name}! We are excited to interview you today${comp}. Please introduce yourself, highlighting your key technical skills, programming expertise in ${dept}, and your career aspirations.`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

export async function createFullInterviewWithQuestions(params: {
  userId: string;
  type?: string;
  types?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  company?: string | null;
  simulationMode?: string;
  status?: string;
  avatarGender?: 'male' | 'female';
  trendingEnabled?: boolean;
}): Promise<Interview> {
  const {
    userId,
    type = 'technical',
    types = ['communication', 'technical', 'hr'],
    difficulty = 'medium',
    company = null,
    simulationMode = 'combined',
    status = 'pending',
    avatarGender = 'female',
    trendingEnabled = true
  } = params;

  const user = await storage.getUser(userId);
  const studentName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.rollNumber || 'Candidate' : 'Candidate';
  const department = user?.department || 'Computer Science and Engineering';

  // 1. Build balanced 15 questions
  // Q1: Dynamic Intro
  const introQuestion = generateDynamicIntroQuestion(studentName, company, department);

  // Communication & Behavioral (4 questions)
  const commQs = buildQuestionSet(company || undefined, 'communication', 2, difficulty);
  const behQs = buildQuestionSet(company || undefined, 'behavioral', 3, difficulty);

  // Technical CS & Core Engineering (9 questions)
  const techQs = buildQuestionSet(company || undefined, 'technical', 9, difficulty);

  // HR (1 question)
  const hrQs = buildQuestionSet(company || undefined, 'hr', 1, difficulty);

  const questionList: Array<{ text: string; round: InterviewRound }> = [
    { text: introQuestion, round: 'communication' },
    ...commQs.slice(0, 1).map(q => ({ text: q, round: 'communication' as InterviewRound })),
    ...behQs.slice(0, 3).map(q => ({ text: q, round: 'behavioral' as InterviewRound })),
    ...techQs.slice(0, 9).map(q => ({ text: q, round: 'technical' as InterviewRound })),
    ...hrQs.slice(0, 1).map(q => ({ text: q, round: 'hr' as InterviewRound }))
  ];

  // Trim or pad to exactly 15 questions
  while (questionList.length < 15) {
    const extraTech = buildQuestionSet(company || undefined, 'technical', 15 - questionList.length, difficulty);
    for (const eq of extraTech) {
      if (!questionList.some(q => q.text === eq)) {
        questionList.push({ text: eq, round: 'technical' });
      }
    }
  }
  const finalQuestions = questionList.slice(0, 15);

  // 2. Create Interview Record
  const interview = await storage.createInterview({
    userId,
    type: type as any,
    types,
    difficulty,
    company: company || null,
    status: status as any,
    avatarGender,
    simulationMode,
    currentRound: 0,
    roundResults: [],
    trendingEnabled,
    questions: finalQuestions.map(q => q.text),
    startedAt: null,
  });

  // 3. Save questions into interview_questions table (CRITICAL FIX!)
  const dbQuestionPromises = finalQuestions.map((q, index) =>
    storage.createInterviewQuestion({
      interviewId: interview.id,
      question: q.text,
      round: q.round,
      orderIndex: index,
    })
  );
  await Promise.all(dbQuestionPromises);

  if (user) {
    await storage.updateUserInterviewCount(user.id);
  }

  console.log(`[questionGenerator] ✅ Created full 15-question interview ${interview.id} for student ${studentName} (${userId})`);

  return interview;
}
