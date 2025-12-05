## Creating the `.env` File

Moved here from `CREATE_ENV.md` at the project root.

Core steps:
- Copy `env.template` to `.env`.
- Set `DATABASE_URL`, `JWT_SECRET`, `PYTHON_AI_SERVICE_URL`, and `SESSION_SECRET`.
- Run `npm run db:push` then `npm run seed` to prepare the database and test users.


