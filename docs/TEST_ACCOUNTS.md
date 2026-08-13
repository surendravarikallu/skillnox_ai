# Pre-Populated Test Accounts & Seed Credentials

## Overview

Running `npm run seed` populates the PostgreSQL database with default administrative and candidate test accounts. These credentials allow immediate testing of role-based authorization, candidate assignment, and mock interview completion.

---

## Seed Accounts Reference

| Role | Email | Password | Roll Number | Name | Department | Year |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@interviewai.com` | `admin123` | `ADM001` | System Administrator | Computer Science | N/A |
| **Student 1** | `student1@interviewai.com` | `student123` | `21CS001` | Alex Johnson | Computer Science | 4 |
| **Student 2** | `student2@interviewai.com` | `student123` | `21EC002` | Priya Sharma | Electronics | 4 |
| **Student 3** | `student3@interviewai.com` | `student123` | `22IT003` | Rahul Verma | Information Tech | 3 |

---

## Pre-Configured Test Data

When you execute `npm run seed`, the database is enriched with sample records for testing:

1. **Pre-Parsed Resumes**: Attached to `student1` and `student2`, containing extracted skills (React, Node.js, Python, PostgreSQL, Data Structures).
2. **Sample Job Descriptions**: Standard JDs for Software Development Engineer (SDE-1) and Data Analyst roles.
3. **Scheduled Interview Slots**:
   - TCS Technical & HR Drill (Status: `pending`)
   - Amazon System Design Assessment (Status: `completed`, with past score history)
   - Infosys HR Behavioral Round (Status: `in_progress`)

---

## Re-Seeding the Database

To reset all test accounts and clear temporary interviews back to their default state:

```bash
# Push schema and re-run seed script
npm run db:push
npm run seed
```

> **Note**: Default passwords in dev mode are hashed with `bcryptjs` (salt factor: 10). In production environments, change the admin credentials immediately via the user settings page or database console.
