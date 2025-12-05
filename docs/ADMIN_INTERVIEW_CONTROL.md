## Admin-Only Interview Creation

This document was moved here from `ADMIN_INTERVIEW_CONTROL.md` at the project root to keep docs centralized.

Key points:
- `/api/interviews` POST now requires `isAdmin` and a `studentId`.
- Admin creates interviews **for students**; students can only take interviews assigned to them.
- Student dashboard no longer shows "Start Interview" controls; admin uses the interview start page instead.

