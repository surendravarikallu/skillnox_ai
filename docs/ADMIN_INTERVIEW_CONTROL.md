# Admin Interview Control & Management Guide

## Overview

The **Admin Interview Control System** in Skilnox AI provides administrators with centralized control over interview scheduling, candidate assignment, interview customization, and performance oversight. Students cannot arbitrarily generate high-stakes official interviews; instead, administrators schedule and configure interviews specifically assigned to individual students or student cohorts.

---

## Key Features

1. **Centralized Interview Assignment**: Admins create and configure interviews for specific students via Roll Number or User ID.
2. **Customizable Round Distributions**: Admins can configure specific interview round mixes (Technical, HR, Behavioral, System Design, Coding, Company-specific).
3. **Slot & Schedule Management**: Admins assign dates, start times, and duration slots for candidates.
4. **Student Access Control**: Students only see interviews assigned to them on their dashboard, with access restricted until the scheduled window or admin activation.
5. **Real-time Oversight & Analytics**: Admins can track completion status, view overall performance scores, analyze skill gaps, and export reports.

---

## Administrative Interview Workflow

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│   Admin Creates Slot    │ ──> │ Candidate Joined Event  │ ──> │ Real-Time AI Evaluation │
│ & Assigns to Student ID │     │ Status: 'in_progress'   │     │ Question & Answer Loop  │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
                                                                             │
                                                                             ▼
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│ Admin Dashboard Reports │ <── │  Email Notification &   │ <── │  Interview Completed    │
│  & Placement Metrics    │     │    Result Summary Sent  │     │   Status: 'completed'   │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

---

## API Reference

### 1. Create Assigned Interview (Admin Only)

- **Endpoint**: `POST /api/interviews`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>` (User role must be `admin`)
- **Request Body**:
```json
{
  "studentId": "usr_987654321",
  "title": "TCS Technical & HR Assessment",
  "company": "TCS",
  "interviewType": "company",
  "difficulty": "medium",
  "totalQuestions": 5,
  "slotDate": "2026-08-20",
  "slotStartTime": "10:00",
  "slotEndTime": "11:00"
}
```
- **Response** (`201 Created`):
```json
{
  "id": "int_123456789",
  "studentId": "usr_987654321",
  "title": "TCS Technical & HR Assessment",
  "company": "TCS",
  "status": "pending",
  "createdAt": "2026-08-13T10:00:00.000Z"
}
```

### 2. Admin Analytics & Student Control

- **Get All Student Progress**: `GET /api/admin/students`
- **Get Skill Gap Breakdown**: `GET /api/admin/skill-gaps`
- **Get System Performance Stats**: `GET /api/admin/stats`
- **Schedule Bulk Student Slots**: `POST /api/admin/schedule-slots`

---

## Security & Middleware Rules

- All admin endpoints are protected using the `isAdmin` Express middleware:
```typescript
import { isAuthenticated, isAdmin } from "./auth";

app.post("/api/interviews", isAuthenticated, isAdmin, async (req, res) => {
  // Only executed if req.user.role === 'admin'
});
```
- Student attempts to post directly to `/api/interviews` without admin privilege will receive a `403 Forbidden` error.

---

## Best Practices for Admins

1. **Verify Student Uploads**: Ensure the student has uploaded their resume before assigning company-specific interviews for optimal question customization.
2. **Configure Company Patterns**: Select target companies (e.g. Amazon, TCS, Infosys, Wipro) to automatically load preset round distributions.
3. **Monitor Statuses**: Filter dashboard views by status (`pending`, `in_progress`, `completed`) to follow up on overdue candidate interviews.
