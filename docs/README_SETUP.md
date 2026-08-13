# End-to-End Setup & Installation Guide

## System Requirements

- **Operating System**: Windows 10/11, Ubuntu 20.04+, or macOS Monterey+
- **CPU**: Dual-core 2.0GHz minimum (Quad-core+ recommended for local LLM inference)
- **RAM**: 8GB minimum (16GB recommended for PyTorch models)
- **Storage**: 5GB free disk space (for Node modules, Python venv, and local model weights)

---

## Step-by-Step Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/surendravarikallu/skillnox_ai.git
cd skillnox_ai
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```

### Step 3: Install Python AI Dependencies
```bash
cd python-ai

# Optional: Create virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
cd ..
```

### Step 4: Database Connection
Ensure PostgreSQL is running locally or prepare a connection string from [Neon](https://neon.tech) or [Supabase](https://supabase.com).

Create your `.env` file:
```bash
copy env.template .env
```
Edit `.env` and set your `DATABASE_URL`:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/interviewai
```

### Step 5: Initialize Database Schema & Seed Data
```bash
# Push tables to PostgreSQL database using Drizzle ORM
npm run db:push

# Seed default admin & student test accounts
npm run seed
```

### Step 6: Start All Services

#### Command Option A (Unified Windows Batch Script)
```bash
.\start-servers.bat
```

#### Command Option B (Manual Dual-Terminal)
- Terminal 1 (Python AI Microservice):
  ```bash
  cd python-ai && python services/api_service.py
  ```
- Terminal 2 (Node Express Backend):
  ```bash
  npm run dev
  ```

---

## Post-Setup Verification

1. Open `http://localhost:5000` in Google Chrome or Microsoft Edge.
2. Sign in with seed credentials:
   - **Admin**: `admin@interviewai.com` / `admin123`
   - **Student**: `student1@interviewai.com` / `student123`
3. Visit `http://localhost:5000/ai-status` to verify microservice health.
