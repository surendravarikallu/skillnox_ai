# Database Setup Guide

## Quick Setup Options

### Option 1: Neon (Recommended - Free Cloud Database)

1. Go to https://neon.tech
2. Sign up (free)
3. Create a new project
4. Copy the connection string
5. Update `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

### Option 2: Supabase (Free)

1. Go to https://supabase.com
2. Sign up (free)
3. Create a new project
4. Go to Settings → Database
5. Copy the connection string
6. Update `.env` with the connection string

### Option 3: Local PostgreSQL

1. Install PostgreSQL: https://www.postgresql.org/download/
2. Create database:
   ```sql
   CREATE DATABASE interviewai;
   ```
3. Update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/interviewai
   ```

## After Database Setup

1. **Push schema to database**:
   ```bash
   npm run db:push
   ```

2. **Seed test users**:
   ```bash
   npm run seed
   ```

3. **Start the server**:
   ```bash
   npm run dev
   ```

## Test Accounts

After running `npm run seed`, you can login with:

### Admin:
- Email: `admin@interviewai.com`
- Password: `admin123`

### Students:
- Email: `student1@interviewai.com` / Password: `student123`
- Email: `student2@interviewai.com` / Password: `student123`
- Email: `student3@interviewai.com` / Password: `student123`

