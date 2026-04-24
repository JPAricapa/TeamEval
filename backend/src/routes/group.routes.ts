import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, teacherOrAdmin, allRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated } from '../utils/response';
import { groupService } from '../services/group.service';

const router = Router();
router.use(authenticate);

router.get('/', allRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const groups = await groupService.listGroups(req.user!, req.query.courseId as string | undefined);
      sendSuccess(res, groups);
    } catch (error) { next(error); }
  }
);

router.get('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await groupService.getGroupById(req.params.id, req.user!);
      sendSuccess(res, group);
    } catch (error) { next(error); }
  }
);

router.post('/', teacherOrAdmin,
  [
    body('courseId').isUUID(),
    body('name').trim().notEmpty(),
    body('description').optional().trim()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await groupService.createGroup(req.user!, req.body);
      sendCreated(res, group, 'Grupo creado');
    } catch (error) { next(error); }
  }
);

router.post('/:id/members', teacherOrAdmin,
  [param('id').isUUID(), body('userId').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await groupService.addMember(req.params.id, req.body.userId, req.user!);
      sendCreated(res, member, 'Estudiante agregado al grupo');
    } catch (error) { next(error); }
  }
);

router.post('/:id/students', teacherOrAdmin,
  [
    param('id').isUUID(),
    body('email').isEmail().normalizeEmail(),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('nationalId').trim().notEmpty().withMessage('La cédula es requerida')
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await groupService.addStudent(req.params.id, req.user!, req.body);
      sendCreated(res, result, 'Estudiante registrado en el grupo');
    } catch (error) { next(error); }
  }
);

router.delete('/:id/members/:userId', teacherOrAdmin,
  [param('id').isUUID(), param('userId').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await groupService.removeMember(req.params.id, req.params.userId, req.user!);
      sendSuccess(res, null, 'Estudiante removido del grupo');
    } catch (error) { next(error); }
  }
);

router.patch('/:id', teacherOrAdmin,
  [param('id').isUUID(), body('name').trim().notEmpty().withMessage('El nombre es requerido')], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await groupService.renameGroup(req.params.id, req.body.name, req.user!);
      sendSuccess(res, group, 'Grupo actualizado');
    } catch (error) { next(error); }
  }
);

router.delete('/:id', teacherOrAdmin,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await groupService.deleteGroup(req.params.id, req.user!);
      sendSuccess(res, null, 'Grupo eliminado');
    } catch (error) { next(error); }
  }
);

export default router;
