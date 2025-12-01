import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  real,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['student', 'admin']);
export const interviewTypeEnum = pgEnum('interview_type', ['technical', 'hr', 'behavioral', 'company', 'gd', 'project']);
export const interviewStatusEnum = pgEnum('interview_status', ['pending', 'in_progress', 'completed', 'cancelled']);
export const genderEnum = pgEnum('gender', ['male', 'female']);
export const personalityDimensionEnum = pgEnum('personality_dimension', ['introvert', 'extrovert', 'thinker', 'feeler', 'logical', 'creative', 'planner', 'spontaneous']);

// Session storage table (kept for compatibility, but not used with JWT auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default('student').notNull(),
  year: integer("year"),
  department: varchar("department"),
  college: varchar("college"),
  interviewCount: integer("interview_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Resume table
export const resumes = pgTable("resumes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileName: varchar("file_name").notNull(),
  fileUrl: varchar("file_url"),
  parsedData: jsonb("parsed_data"),
  skills: text("skills").array(),
  experience: jsonb("experience"),
  education: jsonb("education"),
  overallScore: real("overall_score"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Job Description table
export const jobDescriptions = pgTable("job_descriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title").notNull(),
  company: varchar("company"),
  description: text("description").notNull(),
  requiredSkills: text("required_skills").array(),
  matchScore: real("match_score"),
  skillGaps: text("skill_gaps").array(),
  // Store AI analysis (suggestions, strengths, improvements, etc.)
  // so the frontend can show JD-based recommendations
  parsedData: jsonb("parsed_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Interview table
export const interviews = pgTable("interviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: interviewTypeEnum("type").notNull(),
  status: interviewStatusEnum("status").default('pending').notNull(),
  company: varchar("company"),
  avatarGender: genderEnum("avatar_gender"),
  questions: jsonb("questions"),
  responses: jsonb("responses"),
  technicalScore: real("technical_score"),
  communicationScore: real("communication_score"),
  emotionScore: real("emotion_score"),
  voiceScore: real("voice_score"),
  overallScore: real("overall_score"),
  feedback: text("feedback"),
  improvements: text("improvements").array(),
  duration: integer("duration"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Interview Questions table
export const interviewQuestions = pgTable("interview_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  interviewId: varchar("interview_id").notNull().references(() => interviews.id, { onDelete: 'cascade' }),
  question: text("question").notNull(),
  expectedAnswer: text("expected_answer"),
  userAnswer: text("user_answer"),
  score: real("score"),
  feedback: text("feedback"),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Personality Assessment table
export const personalityAssessments = pgTable("personality_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  introvertExtrovert: real("introvert_extrovert"),
  thinkerFeeler: real("thinker_feeler"),
  logicalCreative: real("logical_creative"),
  plannerSpontaneous: real("planner_spontaneous"),
  dominantTraits: text("dominant_traits").array(),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Placement Probability table
export const placementProbabilities = pgTable("placement_probabilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  probability30Days: real("probability_30_days"),
  probability60Days: real("probability_60_days"),
  probability90Days: real("probability_90_days"),
  confidence: real("confidence"),
  factors: jsonb("factors"),
  recommendations: text("recommendations").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GD Sessions table
export const gdSessions = pgTable("gd_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  topic: text("topic").notNull(),
  transcript: text("transcript"),
  leadershipScore: real("leadership_score"),
  vocabularyScore: real("vocabulary_score"),
  logicScore: real("logic_score"),
  confidenceScore: real("confidence_score"),
  communicationScore: real("communication_score"),
  overallScore: real("overall_score"),
  feedback: text("feedback"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System Logs table
export const systemLogs = pgTable("system_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  details: jsonb("details"),
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  resumes: many(resumes),
  jobDescriptions: many(jobDescriptions),
  interviews: many(interviews),
  personalityAssessments: many(personalityAssessments),
  placementProbabilities: many(placementProbabilities),
  gdSessions: many(gdSessions),
}));

export const resumesRelations = relations(resumes, ({ one }) => ({
  user: one(users, {
    fields: [resumes.userId],
    references: [users.id],
  }),
}));

export const jobDescriptionsRelations = relations(jobDescriptions, ({ one }) => ({
  user: one(users, {
    fields: [jobDescriptions.userId],
    references: [users.id],
  }),
}));

export const interviewsRelations = relations(interviews, ({ one, many }) => ({
  user: one(users, {
    fields: [interviews.userId],
    references: [users.id],
  }),
  questions: many(interviewQuestions),
}));

export const interviewQuestionsRelations = relations(interviewQuestions, ({ one }) => ({
  interview: one(interviews, {
    fields: [interviewQuestions.interviewId],
    references: [interviews.id],
  }),
}));

export const personalityAssessmentsRelations = relations(personalityAssessments, ({ one }) => ({
  user: one(users, {
    fields: [personalityAssessments.userId],
    references: [users.id],
  }),
}));

export const placementProbabilitiesRelations = relations(placementProbabilities, ({ one }) => ({
  user: one(users, {
    fields: [placementProbabilities.userId],
    references: [users.id],
  }),
}));

export const gdSessionsRelations = relations(gdSessions, ({ one }) => ({
  user: one(users, {
    fields: [gdSessions.userId],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResumeSchema = createInsertSchema(resumes).omit({
  id: true,
  createdAt: true,
});

export const insertJobDescriptionSchema = createInsertSchema(jobDescriptions).omit({
  id: true,
  createdAt: true,
});

export const insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  createdAt: true,
});

export const insertInterviewQuestionSchema = createInsertSchema(interviewQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertPersonalityAssessmentSchema = createInsertSchema(personalityAssessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlacementProbabilitySchema = createInsertSchema(placementProbabilities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGdSessionSchema = createInsertSchema(gdSessions).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Resume = typeof resumes.$inferSelect;
export type InsertResume = z.infer<typeof insertResumeSchema>;

export type JobDescription = typeof jobDescriptions.$inferSelect;
export type InsertJobDescription = z.infer<typeof insertJobDescriptionSchema>;

export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = z.infer<typeof insertInterviewSchema>;

export type InterviewQuestion = typeof interviewQuestions.$inferSelect;
export type InsertInterviewQuestion = z.infer<typeof insertInterviewQuestionSchema>;

export type PersonalityAssessment = typeof personalityAssessments.$inferSelect;
export type InsertPersonalityAssessment = z.infer<typeof insertPersonalityAssessmentSchema>;

export type PlacementProbability = typeof placementProbabilities.$inferSelect;
export type InsertPlacementProbability = z.infer<typeof insertPlacementProbabilitySchema>;

export type GdSession = typeof gdSessions.$inferSelect;
export type InsertGdSession = z.infer<typeof insertGdSessionSchema>;

// Company types for interview simulator
export const COMPANIES = [
  'TCS',
  'Infosys', 
  'Wipro',
  'Accenture',
  'Cognizant',
  'Capgemini',
  'Amazon',
] as const;

export type Company = typeof COMPANIES[number];
