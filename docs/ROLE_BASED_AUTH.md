# Role-Based Access Control (RBAC) System

## Overview

Skilnox AI implements a robust Role-Based Access Control (RBAC) pattern using **Passport.js**, **JWT (JSON Web Tokens)**, and **Express Middleware**.

---

## User Roles & Permissions

The system defines two primary roles stored in the `users` PostgreSQL table (`user_role` enum):

```typescript
export const userRoleEnum = pgEnum('user_role', ['student', 'admin']);
```

### 1. `student` Role
- Access student dashboard, resume uploader, and JD skill-gap analyzer.
- View and take interviews explicitly assigned to them by administrators.
- Access personal performance analytics, detailed review reports, and placement probability scores.
- Restricted from accessing admin dashboards or creating interviews for other users.

### 2. `admin` Role
- Full access to administrative control panels.
- Create, schedule, and assign interviews to any student by Roll Number or User ID.
- Manage student rosters, college cohorts, slot date/time windows.
- Access platform-wide skill-gap metrics, student completion rates, and system analytics.

---

## Middleware Implementation

Authentication middleware is defined in `server/auth.ts`:

### 1. `isAuthenticated`
Verifies that the request contains a valid JWT token in headers or cookies:
```typescript
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized access" });
}
```

### 2. `isAdmin`
Guards admin-only routes:
```typescript
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: "Forbidden: Admin privileges required" });
}
```

### 3. `isStudent`
Ensures caller has student role privileges:
```typescript
export function isStudent(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.role === 'student') {
    return next();
  }
  return res.status(403).json({ message: "Forbidden: Student access only" });
}
```

---

## API Protection Matrix

| Route Endpoint | HTTP Method | Required Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/auth/register` | POST | Public | Create new account |
| `/api/auth/login` | POST | Public | User authentication |
| `/api/user` | GET | Authenticated | Retrieve current user profile |
| `/api/interviews` | POST | `admin` | Create/assign interview slot |
| `/api/interviews` | GET | Authenticated | Fetch assigned interviews |
| `/api/admin/students` | GET | `admin` | Retrieve all student rosters |
| `/api/admin/stats` | GET | `admin` | System-wide statistics |
| `/api/admin/skill-gaps` | GET | `admin` | Aggregated skill gap analysis |
| `/api/resumes/upload` | POST | `student` / `admin` | Upload and parse resume |

---

## Frontend Authorization Enforcement

On the client side (`client/src/`), React routes are wrapped in role guards:

```tsx
<ProtectedRoute 
  path="/admin" 
  component={AdminDashboard} 
  requiredRole="admin" 
/>
```

Non-authorized users attempting to manually type admin URLs are automatically redirected to `/dashboard` or `/auth`.
