/**
 * Rutas de Consolidación de Resultados
 */

import { Router, Request, Response, NextFunction } from 'express';
import { param, body } from 'express-validator';
import { authenticate, teacherOrAdmin, allRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess } from '../utils/response';
import { consolidationService } from '../services/consolidation.service';
import { prisma } from '../utils/prisma';

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
// Solo docente/admin: los estudiantes no deben ver los puntajes consolidados.
router.get('/process/:processId/results', teacherOrAdmin,
  [param('processId').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await consolidationService.getProcessResults(req.params.processId);
      sendSuccess(res, results, 'Resultados obtenidos');
    } catch (error) { next(error); }
  }
);

// GET /consolidation/my-results - Resultados propios del estudiante autenticado
router.get('/my-results', allRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await prisma.consolidatedResult.findMany({
        where: { studentId: req.user!.id },
        include: {
          process: {
            select: {
              id: true,
              name: true,
              status: true,
              selfWeight: true,
              peerWeight: true,
              teacherWeight: true,
              course: { select: { name: true, code: true } }
            }
          },
          team: { select: { name: true } }
        },
        orderBy: { calculatedAt: 'desc' }
      });

      const mapped = results.map(r => ({
        id: r.id,
        selfScore: r.selfScore,
        peerScore: r.peerScore,
        teacherScore: r.teacherScore,
        finalScore: r.finalScore,
        criteriaScores: r.criteriaScores ?? null,
        calculatedAt: r.calculatedAt,
        process: r.process,
        team: r.team,
      }));

      sendSuccess(res, mapped, 'Resultados obtenidos');
    } catch (error) { next(error); }
  }
);

export default router;
