# Environment Variables & `.env` Setup Guide

## Overview

Skilnox AI relies on environment variables stored in a `.env` file at the root of the project to manage database credentials, JWT secrets, AI service endpoints, API keys, and server ports.

---

## Quick Setup

Copy the provided template to create your `.env` file:

```bash
# Windows PowerShell
copy env.template .env

# Linux / macOS
cp env.template .env
```

---

## Detailed Variable Reference

| Variable Name | Description | Default / Example Value | Required? |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (Neon, Supabase, or local PG) | `postgresql://postgres:password@localhost:5432/interviewai` | **Required** |
| `JWT_SECRET` | Secret key used for signing session JWT tokens | `super-secret-jwt-key-min-32-chars-long` | **Required** |
| `SESSION_SECRET` | Secret key for express-session cookie encryption | `super-secret-session-key` | **Required** |
| `PYTHON_AI_SERVICE_URL` | URL of the FastAPI Python AI microservice | `http://localhost:8000` | **Required** |
| `NVIDIA_API_KEY` | NVIDIA NIM Cloud API key (Primary LLM & Vision Engine) | `nvapi-...` | **Recommended** |
| `NVIDIA_API_KEYS` | Comma-separated NVIDIA API keys for high-throughput concurrency | `nvapi-key1,nvapi-key2` | Optional |
| `NVIDIA_MODEL` | NVIDIA NIM LLM Model identifier | `meta/llama-3.1-8b-instruct` | Optional |
| `GROQ_API_KEYS` | Comma-separated Groq Cloud API keys for ultra-fast STT | `gsk_key1,gsk_key2` | Recommended |
| `GROQ_STT_MODEL` | Whisper model specified for Groq STT | `whisper-large-v3-turbo` | Optional |
| `OLLAMA_BASE_URL` | Local Ollama service endpoint (Local Fallback) | `http://localhost:11434` | Optional |
| `OLLAMA_MODEL` | Local Ollama model name | `qwen3.5:9b` | Optional |
| `AI_SERVICE_API_KEY` | Optional security header for Python service | `skilnox_ai_secret_key` | Optional |
| `PORT` | HTTP port for Node.js Express application | `5000` | Optional (Default: 5000) |
| `NODE_ENV` | Environment state (`development` / `production`) | `development` | Optional |
| `SMTP_HOST` | Email SMTP host for scheduling notifications | `smtp.gmail.com` | Optional |
| `SMTP_PORT` | Email SMTP port | `587` | Optional |
| `SMTP_USER` | Email SMTP username | `notifications@skilnox.ai` | Optional |
| `SMTP_PASS` | Email SMTP password / app key | `your_smtp_app_password` | Optional |

---

## Sample `.env` Template

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/interviewai

# Security & Authentication
JWT_SECRET=c8f9a2e1d0b3456789abcdef0123456789abcdef0123456789abcdef01234567
SESSION_SECRET=session_secret_key_skilnox_2026

# Microservice Endpoints
PYTHON_AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=

# NVIDIA NIM Cloud API (Primary LLM & Vision Engine)
NVIDIA_API_KEY=
# NVIDIA_API_KEYS=nvapi-key1,nvapi-key2
NVIDIA_MODEL=meta/llama-3.1-8b-instruct

# Speech-To-Text API Keys (Groq Cloud Failover)
GROQ_API_KEYS=
GROQ_STT_MODEL=whisper-large-v3-turbo

# Local Ollama Fallback Engine
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:9b

# Server Settings
PORT=5000
NODE_ENV=development
```

---

## Post-Configuration Steps

After creating and updating your `.env` file:

1. **Push Database Schema**:
   ```bash
   npm run db:push
   ```
2. **Seed Initial Database**:
   ```bash
   npm run seed
   ```
3. **Verify Environment Configuration**:
   ```bash
   npm run check
   ```
