import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, teacherOrAdmin, allRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated } from '../utils/response';
import { evaluationService } from '../services/evaluation.service';

const router = Router();
router.use(authenticate);

// ── Procesos de evaluación ────────────────────────────────────────────────────

router.get('/processes', allRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const processes = await evaluationService.listProcesses(req.query.courseId as string | undefined);
      sendSuccess(res, processes);
    } catch (error) { next(error); }
  }
);

router.get('/processes/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const process = await evaluationService.getProcessById(req.params.id, req.user!);
      sendSuccess(res, process);
    } catch (error) { next(error); }
  }
);

router.post('/processes', teacherOrAdmin,
  [
    body('courseId').isUUID(),
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
    body('startDate').isISO8601().toDate(),
    body('endDate').isISO8601().toDate(),
    body('selfWeight').optional().isFloat({ min: 0, max: 1 }),
    body('peerWeight').optional().isFloat({ min: 0, max: 1 }),
    body('teacherWeight').optional().isFloat({ min: 0, max: 1 }),
    body('includeSelf').optional().isBoolean(),
    body('includePeer').optional().isBoolean(),
    body('includeTeacher').optional().isBoolean(),
    body('allowAnonymousPeer').optional().isBoolean()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const process = await evaluationService.createProcess(req.body, req.user?.id);
      sendCreated(res, process, 'Proceso de evaluación creado');
    } catch (error) { next(error); }
  }
);

router.post('/processes/:id/activate', teacherOrAdmin,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await evaluationService.activateProcess(req.params.id, req.user?.id);
      sendSuccess(res, result, `Proceso activado. ${result.evaluationsCreated} evaluaciones generadas.`);
    } catch (error) { next(error); }
  }
);

router.patch('/processes/:id/close', teacherOrAdmin,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const process = await evaluationService.closeProcess(req.params.id, req.user?.id);
      sendSuccess(res, process, 'Proceso cerrado');
    } catch (error) { next(error); }
  }
);

router.delete('/processes/:id', teacherOrAdmin,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await evaluationService.deleteProcess(req.params.id, req.user!);
      sendSuccess(res, null, 'Proceso eliminado');
    } catch (error) { next(error); }
  }
);

// ── Evaluaciones individuales ─────────────────────────────────────────────────

router.get('/my-pending', allRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evaluations = await evaluationService.getMyPending(req.user!.id);
      sendSuccess(res, evaluations);
    } catch (error) { next(error); }
  }
);

router.get('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evaluation = await evaluationService.getEvaluationById(req.params.id, req.user!);
      sendSuccess(res, evaluation);
    } catch (error) { next(error); }
  }
);

router.post('/:id/submit', allRoles,
  [
    param('id').isUUID(),
    body('scores').isArray({ min: 1 }).withMessage('Se requieren puntajes'),
    body('scores.*.criteriaId').isUUID(),
    body('scores.*.score').isFloat({ min: 1, max: 5 }),
    body('scores.*.comment').optional().trim(),
    body('generalComment').optional().trim()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await evaluationService.submitEvaluation(req.params.id, req.user!.id, req.body);
      sendSuccess(res, null, 'Evaluación enviada exitosamente');
    } catch (error) { next(error); }
  }
);

export default router;
