## Role-Based Authentication System

Moved here from `ROLE_BASED_AUTH.md` at the project root.

Key points:
- Middleware: `isAdmin`, `isStudent`, and `hasRole([...])` guard routes.
- JWT includes the user `role`, available as `req.userRole`.
- Admin-only routes like `/api/admin/stats`, `/api/admin/students`, `/api/admin/skill-gaps` are protected.


