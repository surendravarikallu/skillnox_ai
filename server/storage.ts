import {
  users,
  resumes,
  jobDescriptions,
  interviews,
  interviewQuestions,
  personalityAssessments,
  placementProbabilities,
  gdSessions,
  systemLogs,
  type User,
  type UpsertUser,
  type Resume,
  type InsertResume,
  type JobDescription,
  type InsertJobDescription,
  type Interview,
  type InsertInterview,
  type InterviewQuestion,
  type InsertInterviewQuestion,
  type PersonalityAssessment,
  type InsertPersonalityAssessment,
  type PlacementProbability,
  type InsertPlacementProbability,
  type GdSession,
  type InsertGdSession,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getStudents(): Promise<User[]>;
  updateUserInterviewCount(userId: string): Promise<void>;

  // Resume operations
  getResumeByUserId(userId: string): Promise<Resume | undefined>;
  createResume(resume: InsertResume): Promise<Resume>;
  updateResume(id: string, data: Partial<InsertResume>): Promise<Resume>;

  // Job Description operations
  getJobDescriptionsByUserId(userId: string): Promise<JobDescription[]>;
  getJobDescription(id: string): Promise<JobDescription | undefined>;
  createJobDescription(jd: InsertJobDescription): Promise<JobDescription>;
  updateJobDescription(id: string, data: Partial<InsertJobDescription>): Promise<JobDescription>;

  // Interview operations
  getInterviewsByUserId(userId: string): Promise<Interview[]>;
  getInterviewById(id: string): Promise<Interview | undefined>;
  createInterview(interview: InsertInterview): Promise<Interview>;
  updateInterview(id: string, data: Partial<InsertInterview>): Promise<Interview>;
  getAllInterviews(): Promise<Interview[]>;

  // Interview Questions operations
  getQuestionsByInterviewId(interviewId: string): Promise<InterviewQuestion[]>;
  createInterviewQuestion(question: InsertInterviewQuestion): Promise<InterviewQuestion>;
  updateInterviewQuestion(id: string, data: Partial<InsertInterviewQuestion>): Promise<InterviewQuestion>;

  // Personality Assessment operations
  getPersonalityByUserId(userId: string): Promise<PersonalityAssessment | undefined>;
  createPersonalityAssessment(assessment: InsertPersonalityAssessment): Promise<PersonalityAssessment>;
  updatePersonalityAssessment(id: string, data: Partial<InsertPersonalityAssessment>): Promise<PersonalityAssessment>;

  // Placement Probability operations
  getPlacementProbabilityByUserId(userId: string): Promise<PlacementProbability | undefined>;
  createPlacementProbability(prob: InsertPlacementProbability): Promise<PlacementProbability>;
  updatePlacementProbability(id: string, data: Partial<InsertPlacementProbability>): Promise<PlacementProbability>;

  // GD Session operations
  getGdSessionsByUserId(userId: string): Promise<GdSession[]>;
  createGdSession(session: InsertGdSession): Promise<GdSession>;
  updateGdSession(id: string, data: Partial<InsertGdSession>): Promise<GdSession>;

  // Analytics
  getAverageScores(): Promise<{ technical: number; hr: number; gd: number; overall: number }>;
  getSkillGapAnalysis(): Promise<{ skill: string; count: number }[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // If id is provided, try to update, otherwise insert
    if (userData.id) {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } else {
      // Insert new user
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getStudents(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'student')).orderBy(desc(users.createdAt));
  }

  async updateUserInterviewCount(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        interviewCount: sql`${users.interviewCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Resume operations
  async getResumeByUserId(userId: string): Promise<Resume | undefined> {
    const [resume] = await db.select().from(resumes).where(eq(resumes.userId, userId)).orderBy(desc(resumes.createdAt)).limit(1);
    return resume;
  }

  async createResume(resume: InsertResume): Promise<Resume> {
    const [newResume] = await db.insert(resumes).values(resume).returning();
    return newResume;
  }

  async updateResume(id: string, data: Partial<InsertResume>): Promise<Resume> {
    const [updated] = await db.update(resumes).set(data).where(eq(resumes.id, id)).returning();
    return updated;
  }

  // Job Description operations
  async getJobDescriptionsByUserId(userId: string): Promise<JobDescription[]> {
    return await db.select().from(jobDescriptions).where(eq(jobDescriptions.userId, userId)).orderBy(desc(jobDescriptions.createdAt));
  }

  async getJobDescription(id: string): Promise<JobDescription | undefined> {
    const [jd] = await db.select().from(jobDescriptions).where(eq(jobDescriptions.id, id));
    return jd;
  }

  async createJobDescription(jd: InsertJobDescription): Promise<JobDescription> {
    const [newJd] = await db.insert(jobDescriptions).values(jd).returning();
    return newJd;
  }

  async updateJobDescription(id: string, data: Partial<InsertJobDescription>): Promise<JobDescription> {
    const [updated] = await db.update(jobDescriptions).set(data).where(eq(jobDescriptions.id, id)).returning();
    return updated;
  }

  // Interview operations
  async getInterviewsByUserId(userId: string): Promise<Interview[]> {
    return await db.select().from(interviews).where(eq(interviews.userId, userId)).orderBy(desc(interviews.createdAt));
  }

  async getInterviewById(id: string): Promise<Interview | undefined> {
    const [interview] = await db.select().from(interviews).where(eq(interviews.id, id));
    return interview;
  }

  async createInterview(interview: InsertInterview): Promise<Interview> {
    const [newInterview] = await db.insert(interviews).values(interview).returning();
    return newInterview;
  }

  async updateInterview(id: string, data: Partial<InsertInterview>): Promise<Interview> {
    const [updated] = await db.update(interviews).set(data).where(eq(interviews.id, id)).returning();
    return updated;
  }

  async getAllInterviews(): Promise<Interview[]> {
    return await db.select().from(interviews).orderBy(desc(interviews.createdAt));
  }

  // Interview Questions operations
  async getQuestionsByInterviewId(interviewId: string): Promise<InterviewQuestion[]> {
    return await db.select().from(interviewQuestions).where(eq(interviewQuestions.interviewId, interviewId)).orderBy(interviewQuestions.orderIndex);
  }

  async createInterviewQuestion(question: InsertInterviewQuestion): Promise<InterviewQuestion> {
    const [newQuestion] = await db.insert(interviewQuestions).values(question).returning();
    return newQuestion;
  }

  async updateInterviewQuestion(id: string, data: Partial<InsertInterviewQuestion>): Promise<InterviewQuestion> {
    const [updated] = await db.update(interviewQuestions).set(data).where(eq(interviewQuestions.id, id)).returning();
    return updated;
  }

  // Personality Assessment operations
  async getPersonalityByUserId(userId: string): Promise<PersonalityAssessment | undefined> {
    const [assessment] = await db.select().from(personalityAssessments).where(eq(personalityAssessments.userId, userId)).orderBy(desc(personalityAssessments.updatedAt)).limit(1);
    return assessment;
  }

  async createPersonalityAssessment(assessment: InsertPersonalityAssessment): Promise<PersonalityAssessment> {
    const [newAssessment] = await db.insert(personalityAssessments).values(assessment).returning();
    return newAssessment;
  }

  async updatePersonalityAssessment(id: string, data: Partial<InsertPersonalityAssessment>): Promise<PersonalityAssessment> {
    const [updated] = await db.update(personalityAssessments).set({ ...data, updatedAt: new Date() }).where(eq(personalityAssessments.id, id)).returning();
    return updated;
  }

  // Placement Probability operations
  async getPlacementProbabilityByUserId(userId: string): Promise<PlacementProbability | undefined> {
    const [prob] = await db.select().from(placementProbabilities).where(eq(placementProbabilities.userId, userId)).orderBy(desc(placementProbabilities.updatedAt)).limit(1);
    return prob;
  }

  async createPlacementProbability(prob: InsertPlacementProbability): Promise<PlacementProbability> {
    const [newProb] = await db.insert(placementProbabilities).values(prob).returning();
    return newProb;
  }

  async updatePlacementProbability(id: string, data: Partial<InsertPlacementProbability>): Promise<PlacementProbability> {
    const [updated] = await db.update(placementProbabilities).set({ ...data, updatedAt: new Date() }).where(eq(placementProbabilities.id, id)).returning();
    return updated;
  }

  // GD Session operations
  async getGdSessionsByUserId(userId: string): Promise<GdSession[]> {
    return await db.select().from(gdSessions).where(eq(gdSessions.userId, userId)).orderBy(desc(gdSessions.createdAt));
  }

  async createGdSession(session: InsertGdSession): Promise<GdSession> {
    const [newSession] = await db.insert(gdSessions).values(session).returning();
    return newSession;
  }

  async updateGdSession(id: string, data: Partial<InsertGdSession>): Promise<GdSession> {
    const [updated] = await db.update(gdSessions).set(data).where(eq(gdSessions.id, id)).returning();
    return updated;
  }

  // Analytics
  async getAverageScores(): Promise<{ technical: number; hr: number; gd: number; overall: number }> {
    const [techResult] = await db.select({ avg: sql<number>`AVG(${interviews.technicalScore})` }).from(interviews).where(sql`${interviews.technicalScore} IS NOT NULL`);
    const [commResult] = await db.select({ avg: sql<number>`AVG(${interviews.communicationScore})` }).from(interviews).where(sql`${interviews.communicationScore} IS NOT NULL`);
    const [gdResult] = await db.select({ avg: sql<number>`AVG(${gdSessions.overallScore})` }).from(gdSessions).where(sql`${gdSessions.overallScore} IS NOT NULL`);
    const [overallResult] = await db.select({ avg: sql<number>`AVG(${interviews.overallScore})` }).from(interviews).where(sql`${interviews.overallScore} IS NOT NULL`);

    return {
      technical: techResult?.avg || 0,
      hr: commResult?.avg || 0,
      gd: gdResult?.avg || 0,
      overall: overallResult?.avg || 0,
    };
  }

  async getSkillGapAnalysis(): Promise<{ skill: string; count: number }[]> {
    const jds = await db.select({ skillGaps: jobDescriptions.skillGaps }).from(jobDescriptions).where(sql`${jobDescriptions.skillGaps} IS NOT NULL`);
    
    const skillCounts: Record<string, number> = {};
    jds.forEach(jd => {
      if (jd.skillGaps) {
        jd.skillGaps.forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      }
    });

    return Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count);
  }
}

export const storage = new DatabaseStorage();
