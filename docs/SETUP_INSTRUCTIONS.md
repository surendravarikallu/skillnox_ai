# Operational Setup & Deployment Manual

## System Architecture Overview

Skilnox AI consists of three interconnected runtime tiers:

1. **Database Layer**: PostgreSQL (v14+) configured with Drizzle ORM.
2. **Backend API Layer**: Express.js running Node 18+ (TypeScript), handling auth, business logic, email scheduling, and database access.
3. **AI Microservice Layer**: FastAPI running Python 3.9+, handling LLM question generation, spaCy NLP resume parsing, PyTorch evaluation, and voice/emotion ML models.

---

## Detailed Step-by-Step Instructions

### Step 1: Pre-Flight Check

Run environment verification:
```bash
node -v      # Must be >= v18.0.0
python --version  # Must be >= 3.9.0
git --version
```

### Step 2: Database Initialization

1. Obtain a PostgreSQL connection string (Local server or Neon Cloud).
2. Configure `.env`:
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/interviewai
   ```
3. Push table schemas using Drizzle Kit:
   ```bash
   npx drizzle-kit push
   ```
4. Load seed records (admin user, test students, sample question banks):
   ```bash
   npm run seed
   ```

### Step 3: Python AI Microservice Setup

1. Open terminal in `python-ai/`:
   ```bash
   cd python-ai
   pip install -r requirements.txt
   ```
2. Test standalone FastAPI launch:
   ```bash
   python services/api_service.py
   ```
3. Confirm health output on `http://localhost:8000/health`.

### Step 4: Express Node Application Setup

1. In project root, run type checker:
   ```bash
   npm run check
   ```
2. Launch Express in development mode:
   ```bash
   npm run dev
   ```

---

## Verification & Sanity Checks

- Open `http://localhost:5000` to verify client loads cleanly.
- Log in with seed admin account (`admin@interviewai.com` / `admin123`).
- Visit `/ai-status` to verify microservice status is `connected`.
- Create a test interview from Admin Panel and verify candidate slot scheduling.
