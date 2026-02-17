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
  globalSettings,
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
  type GlobalSetting,
  type InsertGlobalSetting,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getStudents(limit?: number, offset?: number): Promise<User[]>;
  getStudentCount(): Promise<number>;
  updateUserInterviewCount(userId: string): Promise<void>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;

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
  getInterviewsByUserId(userId: string, limit?: number, offset?: number): Promise<Interview[]>;
  getInterviewById(id: string): Promise<Interview | undefined>;
  createInterview(interview: InsertInterview): Promise<Interview>;
  updateInterview(id: string, data: Partial<InsertInterview>): Promise<Interview>;
  getAllInterviews(limit?: number, offset?: number): Promise<Interview[]>;
  getInterviewCount(userId?: string): Promise<number>;

  // Interview Questions operations
  getQuestionsByInterviewId(interviewId: string): Promise<InterviewQuestion[]>;
  createInterviewQuestion(question: InsertInterviewQuestion): Promise<InterviewQuestion>;
  getInterviewQuestionById(id: string): Promise<InterviewQuestion | undefined>;
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

  // Global Settings
  getGlobalSettings(): Promise<GlobalSetting[]>;
  getGlobalSetting(key: string): Promise<GlobalSetting | undefined>;
  setGlobalSetting(key: string, value: string, description?: string): Promise<GlobalSetting>;
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

  async getStudents(limit?: number, offset?: number): Promise<User[]> {
    let query = db.select().from(users).where(eq(users.role, 'student')).orderBy(desc(users.createdAt));

    if (limit !== undefined) {
      query = query.limit(limit) as any;
    }
    if (offset !== undefined) {
      query = query.offset(offset) as any;
    }

    return await query;
  }

  async getStudentCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(users).where(eq(users.role, 'student'));
    return result?.count || 0;
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User> {
    const [updated] = await db.update(users).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
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
  async getInterviewsByUserId(userId: string, limit?: number, offset?: number): Promise<Interview[]> {
    let query = db.select().from(interviews).where(eq(interviews.userId, userId)).orderBy(desc(interviews.createdAt));

    if (limit !== undefined) {
      query = query.limit(limit) as any;
    }
    if (offset !== undefined) {
      query = query.offset(offset) as any;
    }

    return await query;
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

  async getAllInterviews(limit?: number, offset?: number): Promise<Interview[]> {
    let query = db.select().from(interviews).orderBy(desc(interviews.createdAt));

    if (limit !== undefined) {
      query = query.limit(limit) as any;
    }
    if (offset !== undefined) {
      query = query.offset(offset) as any;
    }

    return await query;
  }

  async getInterviewCount(userId?: string): Promise<number> {
    const result = userId
      ? await db.select({ count: sql<number>`COUNT(*)::int` }).from(interviews).where(eq(interviews.userId, userId))
      : await db.select({ count: sql<number>`COUNT(*)::int` }).from(interviews);
    return result[0]?.count || 0;
  }

  // Interview Questions operations
  async getQuestionsByInterviewId(interviewId: string): Promise<InterviewQuestion[]> {
    return await db.select().from(interviewQuestions).where(eq(interviewQuestions.interviewId, interviewId)).orderBy(interviewQuestions.orderIndex);
  }

  async createInterviewQuestion(question: InsertInterviewQuestion): Promise<InterviewQuestion> {
    const [newQuestion] = await db.insert(interviewQuestions).values(question).returning();
    return newQuestion;
  }

  async getInterviewQuestionById(id: string): Promise<InterviewQuestion | undefined> {
    const [question] = await db.select().from(interviewQuestions).where(eq(interviewQuestions.id, id));
    return question;
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

  // Analytics - optimized to use single query
  async getAverageScores(): Promise<{ technical: number; hr: number; gd: number; overall: number }> {
    const [result] = await db.select({
      technical: sql<number>`AVG(${interviews.technicalScore})`,
      hr: sql<number>`AVG(${interviews.communicationScore})`,
      overall: sql<number>`AVG(${interviews.overallScore})`,
      gd: sql<number>`(
        SELECT AVG(${gdSessions.overallScore}) 
        FROM ${gdSessions}
        WHERE ${gdSessions.overallScore} IS NOT NULL
      )`
    }).from(interviews);

    return {
      technical: result?.technical || 0,
      hr: result?.hr || 0,
      gd: result?.gd || 0,
      overall: result?.overall || 0,
    };
  }

  async getSkillGapAnalysis(): Promise<{ skill: string; count: number }[]> {
    // Optimized: Use DB aggregation instead of in-memory processing
    const skillGaps = await db.select({
      skill: sql<string>`unnest(${jobDescriptions.skillGaps})`,
      count: sql<number>`COUNT(*)::int`
    })
      .from(jobDescriptions)
      .where(sql`${jobDescriptions.skillGaps} IS NOT NULL`)
      .groupBy(sql`unnest(${jobDescriptions.skillGaps})`)
      .orderBy(desc(sql`COUNT(*)`));

    return skillGaps;
  }

  // Global Settings operations
  async getGlobalSettings(): Promise<GlobalSetting[]> {
    return await db.select().from(globalSettings);
  }

  async getGlobalSetting(key: string): Promise<GlobalSetting | undefined> {
    const [setting] = await db.select().from(globalSettings).where(eq(globalSettings.key, key));
    return setting;
  }

  async setGlobalSetting(key: string, value: string, description?: string): Promise<GlobalSetting> {
    const [setting] = await db
      .insert(globalSettings)
      .values({ key, value, description })
      .onConflictDoUpdate({
        target: globalSettings.key,
        set: { value, updatedAt: new Date() },
      })
      .returning();
    return setting;
  }
}

export const storage = new DatabaseStorage();
