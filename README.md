# 🎓 TeamEval Platform
## Plataforma de Evaluación y Analítica de Trabajo en Equipo

Sistema completo para evaluación formativa y sumativa del trabajo colaborativo en cursos universitarios.

---

## ⚡ Inicio Rápido (5 minutos)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con la base local de SQLite y claves JWT

npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed        # Carga rúbricas base + usuario administrador
npm run dev                # http://localhost:3000
```

### 2. Frontend Web

```bash
cd frontend-web
npm install
npm run dev                # http://localhost:5173
```

### 3. Seed inicial

El seed actual crea un usuario administrador/docente con contraseña `TeamEval2024!`:

- `jaldana@uniquindio.edu.co`

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend web | React + Vite + TypeScript |
| App móvil | Flutter (opcional, carpeta separada) |
| Backend | Node.js 20 + Express + TypeScript |
| ORM | Prisma 5.x |
| Base de datos | PostgreSQL |
| Autenticación | JWT (Access 1h + Refresh 7d) |
| Gráficas | Recharts |
| Exportación | ExcelJS + PDFKit |

---

## 📊 Rúbricas de Trabajo en Equipo

**Evaluación por Pares** (3 criterios):
- Contribución
- Roles
- Comunicación Interna

**Heteroevaluación Docente** (3 criterios):
- Metas del Equipo
- Decisiones del Equipo
- Registros de Control

Escala: 4 (Proficiente) → 3 (Aceptable) → 2 (Principiante) → 1 (Necesita mejorar)

---

## 📁 Estructura del Proyecto

```
teameval-platform/
├── backend/          # Node.js + TypeScript + Prisma
├── frontend-web/     # React + Vite
├── frontend/         # Flutter (opcional)
├── tests/            # Pruebas unitarias y funcionales
└── docs/             # Documentación técnica completa
```

## 🔗 Endpoints Principales

- `POST /api/v1/auth/login` — Autenticación
- `GET  /api/v1/analytics/course/:processId` — Analítica del curso
- `POST /api/v1/evaluations/:id/submit` — Enviar evaluación
- `GET  /api/v1/export/excel/:processId` — Exportar resultados

Ver documentación completa: `docs/Documentacion_Tecnica_TeamEval.docx`

---

## Deploy Gratis

Estructura recomendada:

```text
Frontend → Vercel
Backend  → Render
DB       → Supabase (PostgreSQL)
```

### Supabase

- Crear un proyecto nuevo en Supabase.
- Ir a `Connect` y copiar la cadena **Supavisor Session pooler** para Prisma.
- Esa cadena termina en `:5432` y se usa como `DATABASE_URL`.

Referencia oficial:

- https://supabase.com/docs/guides/database/prisma
- https://supabase.com/docs/guides/database

### Backend En Render

- Root directory: `backend`
- Build command: `npm install --include=dev && npm run prisma:generate && npm run build`
- Start command: `npm run start:render`

Variables mínimas:

```bash
NODE_ENV=production
DATABASE_URL=<cadena Supavisor Session pooler de Supabase>
JWT_SECRET=<secreto-largo-y-seguro>
JWT_REFRESH_SECRET=<secreto-largo-y-seguro>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://tu-frontend.vercel.app
FRONTEND_URL=https://tu-frontend.vercel.app
```

Notas:

- `start:render` corre migraciones y seed al arrancar.
- El seed es idempotente y deja creado el usuario administrador base.

Referencia oficial:

- https://render.com/docs/web-services
- https://render.com/docs/free

### Frontend En Vercel

- Root directory: `frontend-web`
- Build command: `npm run build`
- Output directory: `dist`

Variable mínima:

```bash
VITE_API_URL=https://tu-backend.onrender.com/api/v1
```

El frontend usa React Router en modo SPA, por eso incluye `vercel.json` con rewrite a `index.html`.

Referencia oficial:

- https://vercel.com/docs/frameworks/vite
- https://vercel.com/docs/rewrites
