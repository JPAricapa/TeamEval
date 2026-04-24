/**
 * ============================================================
 * PUNTO DE ENTRADA - TeamEval Platform Backend
 * Plataforma de Evaluación y Analítica de Trabajo en Equipo
 * ============================================================
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

// Rutas
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import institutionRoutes from './routes/institution.routes';
import programRoutes from './routes/program.routes';
import periodRoutes from './routes/period.routes';
import courseRoutes from './routes/course.routes';
import groupRoutes from './routes/group.routes';
import teamRoutes from './routes/team.routes';
import rubricRoutes from './routes/rubric.routes';
import evaluationRoutes from './routes/evaluation.routes';
import consolidationRoutes from './routes/consolidation.routes';
import analyticsRoutes from './routes/analytics.routes';
import exportRoutes from './routes/export.routes';
import auditRoutes from './routes/audit.routes';

// Middleware
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';

const app = express();
const PORT = process.env.PORT || 3000;

// Render expone la app detrás de un proxy; esto evita fallos con express-rate-limit.
app.set('trust proxy', 1);

// ============================================================
// MIDDLEWARE GLOBAL
// ============================================================

// Seguridad HTTP
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compresión de respuestas
app.use(compression());

// Parseo de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging HTTP
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) }
}));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Demasiadas solicitudes, por favor espere.' }
});
app.use('/api/', globalLimiter);

// ============================================================
// RUTAS DE LA API
// ============================================================

const API_V1 = '/api/v1';

// Salud del servidor
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'TeamEval Platform API'
  });
});

// Autenticación
app.use(`${API_V1}/auth`, authRoutes);

// Usuarios
app.use(`${API_V1}/users`, userRoutes);

// Estructura institucional
app.use(`${API_V1}/institutions`, institutionRoutes);
app.use(`${API_V1}/programs`, programRoutes);
app.use(`${API_V1}/periods`, periodRoutes);

// Estructura académica
app.use(`${API_V1}/courses`, courseRoutes);
app.use(`${API_V1}/groups`, groupRoutes);
app.use(`${API_V1}/teams`, teamRoutes);

// Rúbricas
app.use(`${API_V1}/rubrics`, rubricRoutes);

// Evaluación
app.use(`${API_V1}/evaluations`, evaluationRoutes);

// Consolidación
app.use(`${API_V1}/consolidation`, consolidationRoutes);

// Analítica
app.use(`${API_V1}/analytics`, analyticsRoutes);

// Exportación
app.use(`${API_V1}/export`, exportRoutes);

// Auditoría (solo admin)
app.use(`${API_V1}/audit`, auditRoutes);

// ============================================================
// MANEJO DE ERRORES
// ============================================================

// Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada`
  });
});

// Manejador global de errores
app.use(errorHandler);

// ============================================================
// INICIO DEL SERVIDOR
// ============================================================

export async function bootstrap() {
  try {
    // Verificar conexión a base de datos
    await prisma.$connect();
    logger.info('✅ Conexión a PostgreSQL establecida');

    app.listen(PORT, () => {
      logger.info(`🚀 Servidor TeamEval corriendo en puerto ${PORT}`);
      logger.info(`📚 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Manejo limpio del cierre
process.on('SIGINT', async () => {
  logger.info('🛑 Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Terminando proceso...');
  await prisma.$disconnect();
  process.exit(0);
});

if (require.main === module) {
  bootstrap();
}

export default app;
