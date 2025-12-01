# Starting the Servers

## ✅ Fixed Issues

1. **NODE_ENV error** - Fixed by installing `cross-env` package
2. **Python dependencies** - Installed all required packages

## 🚀 How to Start Servers

### Option 1: Use the Batch File (Easiest)
```bash
.\start-servers.bat
```

### Option 2: Use PowerShell Script
```powershell
.\start-servers.ps1
```

### Option 3: Manual Start (Two Terminals)

**Terminal 1 - Python AI Service:**
```powershell
cd python-ai
python services/api_service.py
```

**Terminal 2 - Node.js Backend:**
```powershell
npm run dev
```

## ✅ Verification

After starting, check:
- Python service: http://localhost:8000/health
- Node.js backend: http://localhost:5000

## 🔐 Test Login

Open: http://localhost:5000

**Admin:**
- Email: `admin@interviewai.com`
- Password: `admin123`

**Student:**
- Email: `student1@interviewai.com`
- Password: `student123`

## 🆘 Troubleshooting

**Port already in use?**
```powershell
# Check what's using the port
netstat -ano | findstr ":5000"
netstat -ano | findstr ":8000"

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Python module not found?**
```powershell
cd python-ai
pip install -r requirements.txt
```

**Node.js errors?**
```powershell
npm install
npm run dev
```

