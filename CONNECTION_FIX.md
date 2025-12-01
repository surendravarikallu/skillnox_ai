# Connection Fix Instructions

## Issue
The `/api/ai/health` endpoint was showing "disconnected" even though Python service is running.

## Changes Made

1. **Python Health Endpoint** - Made it faster by checking model existence instead of generating a question
2. **Node.js Health Check** - Now tries root endpoint first (faster), then health endpoint
3. **Better Error Handling** - More detailed error messages and logging

## To Fix the Connection

### Step 1: Restart Python Service
The Python service needs to be restarted to use the faster health check:

```bash
# Stop the current Python service (Ctrl+C)
# Then restart it:
cd python-ai
python services/api_service.py
```

### Step 2: Verify Connection
1. Check Python service is running:
   ```bash
   curl http://localhost:8000/
   ```
   Should return: `{"message":"AI Interview System API","status":"running"}`

2. Check Node.js health endpoint:
   ```bash
   curl http://localhost:5000/api/ai/health
   ```
   Should return connection status

3. Visit in browser:
   ```
   http://localhost:5000/ai-status
   ```

## Expected Behavior

- **Python Service Running**: Shows "Connected" with green badge
- **Python Service Stopped**: Shows "Disconnected" with red badge
- **LLM Status**: Shows "loaded" if model is ready

## Troubleshooting

If still showing disconnected:
1. Make sure Python service is running on port 8000
2. Check Node.js server logs for connection errors
3. Verify no firewall is blocking localhost:8000
4. Try accessing `http://localhost:8000/health` directly in browser

