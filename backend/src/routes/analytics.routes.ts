/**
 * Rutas de Analítica de Datos
 * Individual, Equipo, Curso, Institucional
 */

import { Router, Request, Response, NextFunction } from 'express';
import { param, query } from 'express-validator';
import { authenticate, teacherOrAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess } from '../utils/response';
import { analyticsService } from '../services/analytics.service';

const router = Router();
router.use(authenticate);

// GET /analytics/individual/:processId/:studentId
// Solo docente/admin: los estudiantes no pueden consultar su analítica individual
// (incluye resultados recibidos de sus pares, que son confidenciales).
router.get('/individual/:processId/:studentId', teacherOrAdmin,
  [param('processId').isUUID(), param('studentId').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await analyticsService.getIndividualAnalytics(
        req.params.processId,
        req.params.studentId
      );
      sendSuccess(res, analytics, 'Analítica individual obtenida');
    } catch (error) { next(error); }
  }
);

// GET /analytics/team/:processId/:teamId
router.get('/team/:processId/:teamId', teacherOrAdmin,
  [param('processId').isUUID(), param('teamId').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await analyticsService.getTeamAnalytics(
        req.params.processId,
        req.params.teamId
      );
      sendSuccess(res, analytics, 'Analítica del equipo obtenida');
    } catch (error) { next(error); }
  }
);

// GET /analytics/course/:processId
router.get('/course/:processId', teacherOrAdmin,
  [param('processId').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await analyticsService.getCourseAnalytics(req.params.processId);
      sendSuccess(res, analytics, 'Analítica del curso obtenida');
    } catch (error) { next(error); }
  }
);

// GET /analytics/institutional/:institutionId
router.get('/institutional/:institutionId', teacherOrAdmin,
  [
    param('institutionId').isUUID(),
    query('periodId').optional().isUUID()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await analyticsService.getInstitutionalAnalytics(
        req.params.institutionId,
        req.query.periodId as string | undefined
      );
      sendSuccess(res, analytics, 'Analítica institucional obtenida');
    } catch (error) { next(error); }
  }
);

export default router;
