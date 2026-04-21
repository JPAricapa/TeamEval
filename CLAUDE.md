# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`cd backend`)
```bash
npm run dev              # Start with hot-reload (ts-node-dev)
npm run build            # Compile TypeScript → dist/
npm run start            # Run compiled build
npm run prisma:generate  # Regenerate Prisma client after schema changes
npm run prisma:migrate   # Apply schema to DB (prisma db push)
npm run prisma:seed      # Populate seed data
npm test                 # Jest with coverage
npm run test:watch       # Jest in watch mode
```

### Frontend (`cd frontend-web`)
```bash
npm run dev     # Vite dev server on http://localhost:5173
npm run build   # tsc + vite build
npm run lint    # ESLint (zero warnings allowed)
```

### Full stack development
Start backend first (`npm run dev` in `backend/`), then frontend (`npm run dev` in `frontend-web/`).

## Architecture

**Backend**: Express + TypeScript + Prisma ORM. All routes mount under `/api/v1`. Business logic lives in `backend/src/services/`; routes stay thin. Custom `AppError(message, statusCode)` is thrown for operational errors and caught by the global handler in `middleware/errorHandler.ts`.

**Frontend**: React 18 + Vite + React Router v6. State management via Zustand (`store/authStore`, `store/appStore`). All API calls go through `services/api.ts`, which is an Axios instance with auto-attach of JWT and auto-refresh on 401.

**Database**: SQLite for development, PostgreSQL for production — controlled by `DATABASE_URL` in `.env`. Schema is in `backend/prisma/schema.prisma`; never write raw SQL, always update the schema and run `prisma:migrate`.

## Authentication

JWT with two tokens: `accessToken` (1 h) stored in memory, `refreshToken` (7 d) stored in localStorage and in the `RefreshToken` DB table. The auth middleware (`middleware/auth.ts`) exposes `authenticate`, `authorize(...roles)`, `teacherOrAdmin`, and `adminOnly`. Roles: `ADMIN`, `TEACHER`, `STUDENT`.

Login is by **email + password**. Users can also have a `national_id` (cédula). New users receive an invitation email with a token; they set their password via `POST /auth/accept-invitation`.

## Key Domain Concepts

**EvaluationProcess lifecycle**: `DRAFT → ACTIVE → CLOSED → ARCHIVED`. A process links a course to up to three rubrics (one per evaluation type: SELF, PEER, TEACHER) and configures weights (`self_weight`, `peer_weight`, `teacher_weight` — must sum to 1).

**Peer anonymity**: `allow_anonymous_peer` on the process hides evaluator identity from students. The `evaluator_id` is stored but must not be exposed to the evaluated student in API responses.

**Consolidation**: `POST /consolidation/process/:processId` aggregates individual `Evaluation` records into `ConsolidatedResult` rows (weighted average + overvaluation index). Run after closing a process.

**Analytics**: Three levels — `CourseAnalytics` (distribution, percentiles), `TeamAnalytics` (cohesion, outliers), and individual per student. Computed on demand via the analytics service.

**Rubric versioning**: `Rubric.parentId` tracks lineage. `CourseRubric` associates a rubric to a course with an `evaluation_type`.

## Response Shape

All API responses follow:
```json
{ "success": true/false, "message": "...", "data": { ... } }
```
Validation errors include a `field` key. Never expose stack traces or Prisma internals in responses.

## Environment Variables

Backend needs a `.env` file (copy `.env.example`). Required: `DATABASE_URL`, `JWT_SECRET` (min 64 chars), `JWT_REFRESH_SECRET`. Email (`EMAIL_HOST`, etc.) is optional; if absent, emails print to console. Frontend needs `VITE_API_URL=http://localhost:3000/api/v1`.

## Seed Accounts

After `npm run prisma:seed`, test accounts are available (password: `TeamEval2024!`):
- Admin: configured in seed
- Docente (Teacher): configured in seed
- Estudiante (Student): configured in seed

## Conventions

- DB columns use `snake_case` mapped with `@map()` in Prisma; TypeScript uses `camelCase`.
- Services are class instances exported as singletons (e.g., `export const authService = new AuthService()`).
- Validation uses `express-validator` chains + the `validate` middleware to format errors uniformly.
- Bulk student import via `POST /users/bulk-import-students` accepts CSV (cédula, nombre, email fields).
