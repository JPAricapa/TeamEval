import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, teacherOrAdmin, allRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated } from '../utils/response';
import { rubricService } from '../services/rubric.service';

const router = Router();
router.use(authenticate);

router.get('/', allRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rubrics = await rubricService.listRubrics(req.user!.id);
      sendSuccess(res, rubrics);
    } catch (error) { next(error); }
  }
);

router.get('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rubric = await rubricService.getRubricById(req.params.id);
      sendSuccess(res, rubric);
    } catch (error) { next(error); }
  }
);

router.post('/', teacherOrAdmin,
  [
    body('name').trim().notEmpty().withMessage('Nombre requerido'),
    body('description').optional().trim(),
    body('isPublic').optional().isBoolean(),
    body('criteria').isArray({ min: 1 }).withMessage('Se requiere al menos un criterio'),
    body('criteria.*.name').trim().notEmpty(),
    body('criteria.*.description').optional().trim(),
    body('criteria.*.weight').isFloat({ min: 0, max: 10 }),
    body('criteria.*.order').optional().isInt({ min: 0 }),
    body('criteria.*.performanceLevels').isArray({ min: 2 }),
    body('criteria.*.performanceLevels.*.name').trim().notEmpty(),
    body('criteria.*.performanceLevels.*.score').isFloat({ min: 0 }),
    body('criteria.*.performanceLevels.*.order').optional().isInt()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rubric = await rubricService.createRubric(req.user!, req.body);
      sendCreated(res, rubric, 'Rúbrica creada exitosamente');
    } catch (error) { next(error); }
  }
);

router.put('/:id', teacherOrAdmin,
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rubric = await rubricService.updateRubricVersion(req.params.id, req.user!.id, req.body);
      sendCreated(res, rubric, `Nueva versión ${rubric.version} creada`);
    } catch (error) { next(error); }
  }
);

router.patch('/:id', teacherOrAdmin,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rubric = await rubricService.patchRubric(req.params.id, req.body);
      sendSuccess(res, rubric, 'Rúbrica actualizada');
    } catch (error) { next(error); }
  }
);

router.post('/:id/criteria', teacherOrAdmin,
  [
    param('id').isUUID(),
    body('name').trim().notEmpty(),
    body('weight').isFloat({ min: 0 }),
    body('order').optional().isInt({ min: 0 })
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const criteria = await rubricService.addCriteria(req.params.id, req.body);
      sendCreated(res, criteria, 'Criterio agregado');
    } catch (error) { next(error); }
  }
);

router.post('/criteria/:criteriaId/levels', teacherOrAdmin,
  [
    param('criteriaId').isUUID(),
    body('name').trim().notEmpty(),
    body('score').isFloat({ min: 0 }),
    body('order').optional().isInt({ min: 0 })
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const level = await rubricService.addPerformanceLevel(req.params.criteriaId, req.body);
      sendCreated(res, level, 'Nivel de desempeño agregado');
    } catch (error) { next(error); }
  }
);

router.delete('/:id', teacherOrAdmin,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await rubricService.deleteRubric(req.params.id);
      sendSuccess(res, null, 'Rúbrica desactivada');
    } catch (error) { next(error); }
  }
);

export default router;
