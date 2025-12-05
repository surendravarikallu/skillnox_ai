## Complete Setup Guide (Env, DB, Test Users)

- Update `.env` with your actual `DATABASE_URL` (Neon/Supabase/local Postgres).  
- Run `npm run db:push` to create tables, then `npm run seed` to create admin + 3 student test accounts.  
- Start services: Python AI (`cd python-ai && python services/api_service.py`) and Node backend (`npm run dev`).  
- Login as admin `admin@interviewai.com` / `admin123` or student `student1@interviewai.com` / `student123`.  


