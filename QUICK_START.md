# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Create .env File

The `.env` file has been created from template. **Update it with your database URL:**

```env
DATABASE_URL=your-database-connection-string-here
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
PORT=5000
NODE_ENV=development
PYTHON_AI_SERVICE_URL=http://localhost:8000
SESSION_SECRET=your-session-secret-key-change-this-in-production
```

### Step 2: Setup Database

**Easiest Option - Neon (Free Cloud Database):**
1. Visit: https://neon.tech
2. Sign up (free)
3. Create project
4. Copy connection string
5. Paste into `.env` as `DATABASE_URL`

**Or use Supabase, Railway, or local PostgreSQL** (see `setup-database.md`)

### Step 3: Initialize Database

```bash
# Push database schema
npm run db:push
```

### Step 4: Create Test Users

```bash
# Seed admin and student accounts
npm run seed
```

### Step 5: Start Services

**Terminal 1 - Python AI Service:**
```bash
cd python-ai
python services/api_service.py
```

**Terminal 2 - Node.js Backend:**
```bash
npm run dev
```

### Step 6: Access Application

Open: http://localhost:5000

**Login with test accounts:**
- Admin: `admin@interviewai.com` / `admin123`
- Student: `student1@interviewai.com` / `student123`

## ✅ Test Accounts Created

After running `npm run seed`:

| Role | Email | Password | Name |
|------|-------|----------|------|
| Admin | admin@interviewai.com | admin123 | Admin User |
| Student | student1@interviewai.com | student123 | John Doe |
| Student | student2@interviewai.com | student123 | Jane Smith |
| Student | student3@interviewai.com | student123 | Alex Johnson |

## 🎯 What You Can Test

1. **Login** with test accounts
2. **Start Interview** - AI generates questions
3. **See AI Avatar** - Animated interviewer
4. **Use Voice Input** - Speak your answers
5. **View Results** - Get scores and feedback
6. **Admin Dashboard** - View all students (admin only)

## 🔧 Troubleshooting

**Database connection error?**
- Check `.env` has correct `DATABASE_URL`
- Verify database is running/accessible
- Try `npm run db:push` again

**Seed script fails?**
- Ensure database schema is pushed first
- Check database connection
- Verify `.env` file exists

**Python service not working?**
- Check if port 8000 is available
- Verify fine-tuned model exists
- Check Python dependencies installed

## 📝 Next Steps

1. Update `.env` with your database URL
2. Run `npm run db:push`
3. Run `npm run seed`
4. Start both services
5. Test the application!

