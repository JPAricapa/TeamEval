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
npm run prisma:seed        # Carga rúbricas de trabajo en equipo + datos de ejemplo
npm run dev                # http://localhost:3000
```

### 2. Frontend Web

```bash
cd frontend-web
npm install
npm run dev                # http://localhost:5173
```

### 3. Credenciales de prueba (todas con contraseña `TeamEval2024!`)

| Rol | Email |
|-----|-------|
| Admin | admin@teameval.edu.co |
| Docente | docente@teameval.edu.co |
| Estudiante | est1@teameval.edu.co |

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend web | React + Vite + TypeScript |
| App móvil | Flutter (opcional, carpeta separada) |
| Backend | Node.js 20 + Express + TypeScript |
| ORM | Prisma 5.x |
| Base de datos local | SQLite para desarrollo |
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
