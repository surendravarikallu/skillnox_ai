## Starting the Servers

### Option 1: Batch/PowerShell Helpers
- `.\start-servers.bat` or `.\start-servers.ps1` from project root.  

### Option 2: Manual Start (Two Terminals)
- Terminal 1: `cd python-ai && python services/api_service.py`  
- Terminal 2: `npm run dev`  

Verify:
- Python health: `http://localhost:8000/health`  
- App: `http://localhost:5000`  


