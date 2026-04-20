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

## Deploy En Railway

Estructura recomendada:

```text
Proyecto TeamEval
├── Servicio "backend"   → Express API
├── Servicio "frontend"  → React/Vite
└── Servicio "database"  → PostgreSQL
```

### Backend

- Root directory: `backend`
- Build command: `npm install && npm run prisma:generate && npm run build`
- Start command: `npm run start:prod`

Variables mínimas:

```bash
NODE_ENV=production
DATABASE_URL=<referencia a DATABASE_URL del servicio PostgreSQL de Railway>
JWT_SECRET=<secreto-largo-y-seguro>
JWT_REFRESH_SECRET=<secreto-largo-y-seguro>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://frontend-production.up.railway.app
FRONTEND_URL=https://frontend-production.up.railway.app
```

### Frontend

- Root directory: `frontend-web`
- Build command: `npm install && npm run build`
- Start command: `npm run preview -- --host 0.0.0.0 --port $PORT`

Variables mínimas:

```bash
VITE_API_URL=https://backend-production.up.railway.app/api/v1
```

### Base de datos

- Agrega PostgreSQL desde Railway al mismo proyecto.
- Enlaza `DATABASE_URL` del backend con la variable que Railway expone para Postgres.
