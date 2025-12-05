## AI Model Connection Guide

This guide explains how to verify that the AI model is working correctly and connected to the website.

### Quick Status Check

#### Via Website (Recommended)
- Start both servers (Node backend and Python AI service).  
- Open `http://localhost:5000/ai-status` to see real-time connection and model status.  

#### Via Command Line
- `cd python-ai && python test_connection.py` to test Python service directly.  
- `npm run test:python` to test from Node.js.  


