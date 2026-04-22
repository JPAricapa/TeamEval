# TeamEval Platform

Plataforma web para evaluar trabajo en equipo en cursos universitarios. TeamEval permite gestionar cursos, grupos y equipos, asignar rúbricas, ejecutar procesos de autoevaluación, coevaluación y heteroevaluación, consolidar resultados y consultar analítica académica.

## Qué resuelve

- Gestión de cursos, grupos, equipos y estudiantes.
- Rúbricas reutilizables para evaluación `SELF`, `PEER` y `TEACHER`.
- Procesos de evaluación con activación, cierre y consolidación.
- Resultados individuales, de equipo y de curso.
- Exportación de resultados a Excel, CSV y PDF.
- Auditoría de acciones clave en la plataforma.

## Arquitectura

| Capa | Implementación |
|------|----------------|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Express + TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Autenticación | JWT (`access` + `refresh`) |
| Deploy frontend | Vercel |
| Deploy backend | Render |
| Base de datos productiva | Supabase Postgres |

La API del backend se publica bajo `/api/v1` y expone módulos para autenticación, usuarios, estructura institucional, cursos, grupos, equipos, rúbricas, evaluaciones, consolidación, analítica, exportación y auditoría. El health check está en `/health`.

## Estructura del repositorio

```text
.
├── backend/        API, Prisma, seed y lógica de negocio
├── frontend-web/   Aplicación React
├── tests/          Pruebas separadas por frontend y backend
└── docs/           Documentación auxiliar
```

## Requisitos

- Node.js 20 o superior
- npm
- PostgreSQL local o una instancia de Supabase

## Puesta en marcha local

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Ajusta `backend/.env` con tu conexión PostgreSQL y tus secretos JWT.

Luego inicializa Prisma y la base:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Levanta la API:

```bash
npm run dev
```

Backend disponible en `http://localhost:3000`.

### 2. Frontend

```bash
cd frontend-web
npm install
cp .env.example .env
```

Confirma que `frontend-web/.env` apunte al backend local:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

Inicia el frontend:

```bash
npm run dev
```

Frontend disponible en `http://localhost:5173`.

## Variables de entorno

### Backend

Variables mínimas para desarrollo o producción:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

Archivo de referencia: [backend/.env.example](/home/juan-pablo/teameval-platform/backend/.env.example:1)

Notas:

- Este proyecto usa PostgreSQL tanto en desarrollo como en producción.
- Para Supabase, usa una cadena compatible con Prisma.
- Si no configuras SMTP, los enlaces de recuperación se imprimen en consola.

### Frontend

```env
VITE_API_URL=http://localhost:3000/api/v1
```

Archivo de referencia: [frontend-web/.env.example](/home/juan-pablo/teameval-platform/frontend-web/.env.example:1)


Importante: el login es por `email + password`, no por cédula como usuario.

## Scripts útiles

### Backend

```bash
npm run dev                  # desarrollo con hot reload
npm run build                # compila TypeScript a dist/
npm run start                # ejecuta el build compilado
npm run prisma:generate      # regenera el cliente Prisma
npm run prisma:migrate       # aplica migraciones en desarrollo
npm run prisma:migrate:deploy
npm run prisma:seed          # siembra datos base
npm run start:render         # migración + seed + arranque para Render
npm test                     # pruebas backend
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Flujo funcional

1. Un administrador o docente crea cursos y grupos.
2. Se crean o asignan rúbricas por tipo de evaluación.
3. Se activa un proceso de evaluación.
4. Los usuarios completan sus evaluaciones pendientes.
5. El sistema consolida resultados.
6. Se consultan analíticas y exportaciones.

## Deploy

| Servicio | Plataforma | Rama | Root directory |
|----------|------------|------|----------------|
| Frontend | Vercel | `main` | `frontend-web` |
| Backend | Render | `main` | `backend` |
| Base de datos | Supabase | n/a | n/a |

### Frontend en Vercel

- Root directory: `frontend-web`
- Build command: `npm run build`
- Output directory: `dist`
- Variable requerida:

```env
VITE_API_URL=https://tu-backend.onrender.com/api/v1
```

### Backend en Render

Configuración recomendada:

- Root directory: `backend`
- Build command: `npm install --include=dev && npm run prisma:generate && npm run build`
- Start command: `npm run start:render`

Variables mínimas:

```env
DATABASE_URL=<supabase connection string>
DIRECT_URL=<supabase direct connection>
JWT_SECRET=<min 64 chars>
JWT_REFRESH_SECRET=<min 64 chars>
CORS_ORIGIN=https://tu-frontend.vercel.app
FRONTEND_URL=https://tu-frontend.vercel.app
```

## Estado actual de ramas de deploy

- Vercel debe desplegar desde `main`.
- Render debe desplegar desde `main`.


## Endpoints principales

Rutas base relevantes del backend:

- `/api/v1/auth`
- `/api/v1/users`
- `/api/v1/courses`
- `/api/v1/groups`
- `/api/v1/teams`
- `/api/v1/rubrics`
- `/api/v1/evaluations`
- `/api/v1/consolidation`
- `/api/v1/analytics`
- `/api/v1/export`
- `/api/v1/audit`

## Notas operativas

- `npm run start:render` ejecuta migraciones y seed antes de arrancar la API.
- El seed es idempotente, pero puede sobrescribir datos base como el usuario administrador.
- Si ya existe una base con datos antiguos, la contraseña real del admin puede no coincidir con la del seed hasta que se vuelva a sincronizar o se resetee manualmente.
