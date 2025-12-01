# Creating .env File and Test Users

## Step 1: Create .env File

Create a file named `.env` in the root directory with the following content:

```env
# Database Configuration
# For local PostgreSQL, use: postgresql://user:password@localhost:5432/dbname
# For Neon/Cloud PostgreSQL, use your connection string
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/interviewai

# JWT Secret (Change this in production!)
# Generate a strong secret: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024

# Server Configuration
PORT=5000
NODE_ENV=development

# Python AI Service
PYTHON_AI_SERVICE_URL=http://localhost:8000

# Session Secret (for cookies)
SESSION_SECRET=your-session-secret-key-change-this-in-production
```

### Quick Copy Command (Windows PowerShell):
```powershell
Copy-Item env.template .env
```

### Or create manually:
1. Copy `env.template` to `.env`
2. Update `DATABASE_URL` with your actual database connection string

## Step 2: Setup Database

### Option A: Local PostgreSQL

1. Install PostgreSQL if not already installed
2. Create database:
   ```sql
   CREATE DATABASE interviewai;
   ```
3. Update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/interviewai
   ```

### Option B: Neon (Cloud PostgreSQL - Free)

1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string
4. Update `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

### Option C: Other Cloud Providers

- **Supabase**: Free PostgreSQL hosting
- **Railway**: Easy PostgreSQL setup
- **Render**: Free PostgreSQL tier

## Step 3: Push Database Schema

```bash
npm run db:push
```

This creates all the necessary tables in your database.

## Step 4: Seed Test Users

```bash
npm run seed
```

This creates:
- 1 Admin account
- 3 Student accounts

## Step 5: Test Accounts

After running the seed script, you can login with:

### Admin Account:
- **Email**: `admin@interviewai.com`
- **Password**: `admin123`
- **Role**: Admin (can access admin dashboard)

### Student Accounts:
- **Email**: `student1@interviewai.com`
- **Password**: `student123`
- **Name**: John Doe, Year 3, Computer Science

- **Email**: `student2@interviewai.com`
- **Password**: `student123`
- **Name**: Jane Smith, Year 4, Information Technology

- **Email**: `student3@interviewai.com`
- **Password**: `student123`
- **Name**: Alex Johnson, Year 2, Computer Science

## Troubleshooting

### Database Connection Error
- Check `DATABASE_URL` in `.env`
- Verify database is running
- Check firewall/network settings

### Seed Script Fails
- Ensure database schema is pushed (`npm run db:push`)
- Check database connection
- Verify `.env` file exists and has correct values

### Users Already Exist
- The seed script skips existing users
- To reset, delete users from database and run seed again

