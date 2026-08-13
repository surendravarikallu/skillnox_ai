# Database Setup & Drizzle ORM Guide

## Overview

Skilnox AI uses **PostgreSQL** as its relational database and **Drizzle ORM** for schema definition, type safety, and migration management.

---

## Database Connection Options

### Option 1: Cloud PostgreSQL (Recommended)
You can use free tier serverless PostgreSQL providers:
- **Neon**: [https://neon.tech](https://neon.tech)
- **Supabase**: [https://supabase.com](https://supabase.com)

Copy the provided pooling connection string into your `.env` file:
```env
DATABASE_URL=postgresql://user:password@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Option 2: Local PostgreSQL Installation
If running PostgreSQL locally on port 5432:
1. Open psql or pgAdmin:
   ```sql
   CREATE DATABASE interviewai;
   ```
2. Update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/interviewai
   ```

---

## Schema Architecture (`shared/schema.ts`)

The database schema includes the following core tables:

### 1. `users`
Stores student and administrator accounts, profile information, roll numbers, college details, and scheduled slot metadata.

### 2. `resumes`
Stores candidate uploaded resumes, raw text, spaCy extracted skills, ATS overall score, education, and experience JSON records.

### 3. `job_descriptions`
Stores job postings and company requirements, parsed required skills, and calculated skill gap lists.

### 4. `interviews`
Tracks interview instances assigned to candidates. Stores status (`pending`, `in_progress`, `completed`, `cancelled`), company name, difficulty level, overall evaluation score, technical score, and communication score.

### 5. `interview_questions`
Stores individual questions generated or assigned for an interview, question category/round type, and difficulty level.

### 6. `answers`
Stores candidate audio transcripts, submitted text answers, per-question AI feedback, evaluation score, and timestamp.

### 7. `placement_predictions`
Stores ML placement probability calculations (30/60/90 day hire odds) based on holistic candidate metrics.

---

## Drizzle Workflow Commands

### Push Schema to Database
Applies schema changes directly to your PostgreSQL database without requiring manual SQL migration scripts:
```bash
npm run db:push
```

### Inspect Database with Drizzle Studio
Launch Drizzle Studio's interactive GUI to inspect records, view relations, and edit data in your browser:
```bash
npx drizzle-kit studio
```

### Seed Database
Populates initial admin account, test student accounts, sample resumes, and test interview slots:
```bash
npm run seed
```
