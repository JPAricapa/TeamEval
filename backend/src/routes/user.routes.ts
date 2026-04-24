import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, adminOnly, teacherOrAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated } from '../utils/response';
import { UserRole } from '../constants/enums';
import { userService } from '../services/user.service';

const router = Router();
router.use(authenticate);

router.get('/', teacherOrAdmin,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('role').optional().isIn(Object.values(UserRole)),
    query('search').optional().isString()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { users, total, page, limit, totalPages } = await userService.listUsers({
        requester: req.user!,
        page: req.query.page as unknown as number,
        limit: req.query.limit as unknown as number,
        role: req.query.role as UserRole | undefined,
        search: req.query.search as string | undefined
      });
      sendSuccess(res, users, 'Usuarios obtenidos', 200, { total, page, limit, totalPages });
    } catch (error) { next(error); }
  }
);

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getMe(req.user!.id);
    sendSuccess(res, user, 'Perfil obtenido');
  } catch (error) { next(error); }
});

router.get('/:id', teacherOrAdmin,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getUserById(req.params.id, req.user!);
      sendSuccess(res, user);
    } catch (error) { next(error); }
  }
);

router.post('/', adminOnly,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('firstName').trim().notEmpty().withMessage('Nombre requerido'),
    body('lastName').trim().notEmpty().withMessage('Apellido requerido'),
    body('nationalId').trim().notEmpty().withMessage('Cédula requerida'),
    body('role').isIn(Object.values(UserRole)).withMessage('Rol inválido')
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.createUser(req.user!, req.body);
      sendCreated(res, user, `Usuario creado exitosamente: ${user.email}`);
    } catch (error) { next(error); }
  }
);

router.post('/bulk-import-students', teacherOrAdmin,
  [
    body('courseId').isUUID().withMessage('courseId inválido'),
    body('groupName').trim().notEmpty().withMessage('groupName requerido'),
    body('students').isArray({ min: 1 }).withMessage('Lista de estudiantes requerida'),
    body('students.*.firstName').trim().notEmpty(),
    body('students.*.lastName').trim().notEmpty(),
    body('students.*.email').isEmail().normalizeEmail(),
    body('students.*.nationalId').trim().notEmpty().withMessage('La cédula es requerida')
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, groupName, students } = req.body;
      const result = await userService.bulkImportStudents(req.user!, courseId, groupName, students);
      sendSuccess(res, result,
        `Importación completada: ${result.summary.created} creados, ${result.summary.existing} ya existían, ${result.summary.errors} errores`
      );
    } catch (error) { next(error); }
  }
);

router.patch('/:id',
  [
    param('id').isUUID(),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail().withMessage('Email inválido'),
    body('nationalId').optional().trim().notEmpty().withMessage('Cédula no puede estar vacía'),
    body('isActive').optional().isBoolean()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.updateUser(req.params.id, req.user!, req.body);
      sendSuccess(res, user, 'Usuario actualizado');
    } catch (error) { next(error); }
  }
);

router.delete('/:id', adminOnly,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const name = await userService.deleteUser(req.params.id, req.user!);
      sendSuccess(res, null, `Usuario eliminado: ${name}`);
    } catch (error) { next(error); }
  }
);

export default router;
