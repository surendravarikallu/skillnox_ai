# Server Startup Methods & Ecosystem Management

## Overview

Skilnox AI requires running both the **Node.js Express backend** (Port 5000) and the **Python FastAPI AI microservice** (Port 8000). Several convenience helper scripts and production process managers are provided.

---

## Method 1: Windows Batch / PowerShell Helpers (Recommended for Dev)

### Batch Script (`start-servers.bat`)
Double-click `start-servers.bat` in the root folder or execute from Command Prompt:
```cmd
start-servers.bat
```
This automatically launches both services in separate terminal windows.

### PowerShell Script (`start-servers.ps1`)
Execute in PowerShell:
```powershell
.\start-servers.ps1
```

---

## Method 2: Manual Startup (Multi-Terminal)

### Terminal 1: Python AI Service
```bash
cd python-ai
python services/api_service.py
```
*Port*: `http://localhost:8000`

### Terminal 2: Express Backend & React Vite Frontend
```bash
npm run dev
```
*Port*: `http://localhost:5000`

---

## Method 3: PM2 Ecosystem Manager (Production Mode)

For background process management on production Linux servers or Windows servers, use PM2 with `ecosystem.config.cjs`:

```bash
# Install PM2 globally
npm install -g pm2

# Start all applications configured in ecosystem.config.cjs
pm2 start ecosystem.config.cjs

# Check process status
pm2 status

# View live application logs
pm2 logs
```

### `ecosystem.config.cjs` Configuration
```javascript
module.exports = {
  apps: [
    {
      name: 'skilnox-node-server',
      script: 'dist/index.cjs',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'skilnox-python-ai',
      script: 'python-ai/services/api_service.py',
      interpreter: 'python',
      env: {
        PORT: 8000
      }
    }
  ]
};
```

---

## Verification Endpoints

Once servers are started, verify that both ports respond:

- **Web Portal**: `http://localhost:5000`
- **AI Status Health Route**: `http://localhost:5000/ai-status`
- **FastAPI Direct Health**: `http://localhost:8000/health`
