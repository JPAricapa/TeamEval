# TeamEval Platform

Plataforma de evaluación formativa y analítica de trabajo en equipo para cursos universitarios.

## Inicio rápido

```bash
# Backend
cd backend && npm install && cp .env.example .env
npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed
npm run dev                  # http://localhost:3000

# Frontend (nueva terminal)
cd frontend-web && npm install && npm run dev   # http://localhost:5173
```

Cuenta semilla: `jaldana@uniquindio.edu.co` / `TeamEval2024!`

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js 20 + Express + TypeScript |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL (SQLite en local) |
| Auth | JWT — access 1 h / refresh 7 d |

## Deploy (gratuito)

| Servicio | Plataforma |
|----------|-----------|
| Frontend | Vercel — root: `frontend-web`, output: `dist` |
| Backend | Render — root: `backend`, start: `npm run start:render` |
| Base de datos | Supabase (PostgreSQL) |

### Variables de entorno mínimas

**Backend (Render)**
```
DATABASE_URL=<Supavisor session pooler de Supabase>
DIRECT_URL=<direct connection de Supabase>
JWT_SECRET=<min 64 chars>
JWT_REFRESH_SECRET=<min 64 chars>
CORS_ORIGIN=https://tu-frontend.vercel.app
FRONTEND_URL=https://tu-frontend.vercel.app
```

**Frontend (Vercel)**
```
VITE_API_URL=https://tu-backend.onrender.com/api/v1
```

> El seed es idempotente. `start:render` corre migraciones y seed automáticamente al arrancar.
