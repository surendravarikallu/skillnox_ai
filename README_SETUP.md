# Complete Setup Guide

## ✅ What's Been Created

1. **`.env` file** - Environment variables template (created from `env.template`)
2. **`server/seed.ts`** - Script to create test users
3. **Test accounts** - Admin and 3 student accounts ready to use

## 🚀 Setup Steps

### 1. Update .env File

The `.env` file has been created. **You need to update the `DATABASE_URL`** with your actual database connection string.

**Current (needs update):**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/interviewai
```

**Update to your database:**
- **Neon (Free)**: Get connection string from https://neon.tech
- **Supabase (Free)**: Get from project settings
- **Local PostgreSQL**: Update user/password/host

### 2. Setup Database

#### Option A: Neon (Recommended - Easiest)
1. Visit https://neon.tech
2. Sign up (free)
3. Create project
4. Copy connection string
5. Paste into `.env` as `DATABASE_URL`

#### Option B: Local PostgreSQL
```bash
# Create database
createdb interviewai

# Or using psql:
psql -U postgres
CREATE DATABASE interviewai;
```

### 3. Initialize Database Schema

```bash
npm run db:push
```

This creates all tables (users, interviews, resumes, etc.)

### 4. Create Test Users

```bash
npm run seed
```

This creates:
- 1 Admin account
- 3 Student accounts

### 5. Start Services

**Terminal 1 - Python AI:**
```bash
cd python-ai
python services/api_service.py
```

**Terminal 2 - Node.js:**
```bash
npm run dev
```

### 6. Access Application

Open: **http://localhost:5000**

## 🔐 Test Accounts

### Admin
- **Email**: `admin@interviewai.com`
- **Password**: `admin123`
- **Access**: Admin dashboard, view all students

### Students
- **Email**: `student1@interviewai.com` → **Password**: `student123` (John Doe)
- **Email**: `student2@interviewai.com` → **Password**: `student123` (Jane Smith)
- **Email**: `student3@interviewai.com` → **Password**: `student123` (Alex Johnson)

## 📝 Environment Variables

Your `.env` file should have:

```env
# Database (REQUIRED - Update this!)
DATABASE_URL=postgresql://user:password@host:port/dbname

# JWT Secret (Change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024

# Server
PORT=5000
NODE_ENV=development

# Python AI Service
PYTHON_AI_SERVICE_URL=http://localhost:8000

# Session
SESSION_SECRET=your-session-secret-key-change-this-in-production
```

## ✅ Verification

After setup, verify:

1. **Database connected**: No errors when running `npm run db:push`
2. **Users created**: `npm run seed` shows "✓ Seeding complete!"
3. **Services running**: Both Python (port 8000) and Node.js (port 5000)
4. **Can login**: Use test accounts to login

## 🎯 Quick Test

1. Login as admin: `admin@interviewai.com` / `admin123`
2. Check admin dashboard
3. Logout and login as student: `student1@interviewai.com` / `student123`
4. Start an interview
5. See AI avatar and answer questions

## 🆘 Troubleshooting

**"DATABASE_URL must be set"**
- Check `.env` file exists
- Verify `DATABASE_URL` is set correctly
- No spaces around `=` sign

**"Connection refused"**
- Database not running (if local)
- Wrong connection string
- Firewall blocking connection

**"User already exists"**
- Normal - seed script skips existing users
- To reset: Delete users from database and run seed again

**Seed script fails**
- Run `npm run db:push` first
- Check database connection
- Verify `.env` file

## 📚 Files Created

- `.env` - Environment variables (update DATABASE_URL!)
- `env.template` - Template for .env
- `server/seed.ts` - User seeding script
- `CREATE_ENV.md` - Detailed setup instructions
- `QUICK_START.md` - Quick setup guide
- `TEST_ACCOUNTS.md` - Test account details
- `setup-database.md` - Database setup options

## 🎉 Ready to Test!

Once you:
1. ✅ Update `.env` with database URL
2. ✅ Run `npm run db:push`
3. ✅ Run `npm run seed`
4. ✅ Start both services

You can login and test the full interview system!

