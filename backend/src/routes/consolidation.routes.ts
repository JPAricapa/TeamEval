/**
 * Rutas de Consolidación de Resultados
 */

import { Router, Request, Response, NextFunction } from 'express';
import { param, body } from 'express-validator';
import { authenticate, teacherOrAdmin, allRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess } from '../utils/response';
import { consolidationService } from '../services/consolidation.service';

const router = Router();
router.use(authenticate);

// POST /consolidation/process/:processId - Consolidar todos los estudiantes
router.post('/process/:processId', teacherOrAdmin,
  [param('processId').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await consolidationService.consolidateProcess(req.params.processId);
      sendSuccess(res, results, `Consolidación completada: ${results.length} estudiantes`);
    } catch (error) { next(error); }
  }
);

// POST /consolidation/process/:processId/student/:studentId - Consolidar un estudiante
router.post('/process/:processId/student/:studentId', teacherOrAdmin,
  [param('processId').isUUID(), param('studentId').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await consolidationService.consolidateStudent(
        req.params.processId,
        req.params.studentId
      );
      sendSuccess(res, result, 'Resultado consolidado');
    } catch (error) { next(error); }
  }
);

// GET /consolidation/process/:processId/results - Obtener resultados
router.get('/process/:processId/results', allRoles,
  [param('processId').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await consolidationService.getProcessResults(req.params.processId);
      sendSuccess(res, results, 'Resultados obtenidos');
    } catch (error) { next(error); }
  }
);

export default router;
