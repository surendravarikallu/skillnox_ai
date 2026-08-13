# Skilnox AI Developer Quick Start Guide

Get Skilnox AI up and running on your local machine in under 5 minutes.

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher (`node -v`)
- **Python**: v3.9 or higher (`python --version`)
- **PostgreSQL**: v14 or higher (or cloud account on Neon / Supabase)
- **Git**: v2.0 or higher

---

## 5-Step Rapid Setup

### 1. Clone & Navigate
```bash
git clone https://github.com/surendravarikallu/skillnox_ai.git
cd skillnox_ai
```

### 2. Install Dependencies
```bash
# Install Node.js packages
npm install

# Install Python ML packages
cd python-ai
pip install -r requirements.txt
cd ..
```

### 3. Environment & Database Setup
```bash
# Create environment file from template
copy env.template .env   # On Windows
# cp env.template .env   # On Linux/Mac

# Push Drizzle ORM schema to PostgreSQL
npm run db:push

# Seed admin and student test accounts
npm run seed
```

### 4. Launch Application Servers

#### Option A: Unified Helper Script (Windows)
```bash
.\start-servers.bat
# or in PowerShell:
.\start-servers.ps1
```

#### Option B: Manual Multi-Terminal Startup

- **Terminal 1 (Python AI Service)**:
  ```bash
  cd python-ai
  python services/api_service.py
  ```
- **Terminal 2 (Node Express App)**:
  ```bash
  npm run dev
  ```

### 5. Access the Web App
Open your browser and navigate to:
- **Application Portal**: `http://localhost:5000`
- **AI Service Health**: `http://localhost:8000/health`
- **AI Status Dashboard**: `http://localhost:5000/ai-status`

---

## Default Login Credentials

- **Admin Account**: `admin@interviewai.com` / Password: `admin123`
- **Student Account**: `student1@interviewai.com` / Password: `student123`
