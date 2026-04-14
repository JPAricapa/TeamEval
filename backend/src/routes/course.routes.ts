/**
 * Rutas de Cursos
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticate, teacherOrAdmin, allRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../constants/enums';

const router = Router();
router.use(authenticate);

// GET /courses - Listar cursos
router.get('/', allRoles,
  [query('periodId').optional().isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const where: Record<string, unknown> = { isActive: true };

      // Los docentes solo ven sus cursos
      if (req.user!.role === UserRole.TEACHER) {
        where.teacherId = req.user!.id;
      }

      // Los estudiantes solo ven cursos donde están en grupos
      if (req.user!.role === UserRole.STUDENT) {
        const studentGroups = await prisma.groupMember.findMany({
          where: { userId: req.user!.id, isActive: true },
          select: { group: { select: { courseId: true } } }
        });
        const courseIds = studentGroups.map((gm) => gm.group.courseId);
        where.id = { in: courseIds };
      }

      if (req.query.periodId) where.periodId = req.query.periodId;

      const courses = await prisma.course.findMany({
        where,
        include: {
          teacher: { select: { firstName: true, lastName: true, email: true } },
          period: { select: { name: true, code: true } },
          program: { select: { name: true } },
          _count: { select: { groups: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      sendSuccess(res, courses);
    } catch (error) { next(error); }
  }
);

// GET /courses/:id
router.get('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const course = await prisma.course.findUnique({
        where: { id: req.params.id },
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
          period: true,
          program: true,
          groups: {
            include: {
              members: {
                include: { user: { select: { id: true, firstName: true, lastName: true } } }
              },
              teams: { include: { members: { include: { user: true } } } }
            }
          },
          courseRubrics: { include: { rubric: true } },
          evaluationProcesses: true
        }
      });
      if (!course) return sendNotFound(res);
      sendSuccess(res, course);
    } catch (error) { next(error); }
  }
);

// POST /courses
router.post('/', teacherOrAdmin,
  [
    body('institutionId').isUUID(),
    body('periodId').isUUID(),
    body('teacherId').isUUID(),
    body('name').trim().notEmpty(),
    body('code').trim().notEmpty(),
    body('programId').optional().isUUID(),
    body('credits').optional().isInt({ min: 1 }),
    body('description').optional().trim()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Si es docente, solo puede crear cursos propios
      if (req.user!.role === UserRole.TEACHER && req.body.teacherId !== req.user!.id) {
        throw new AppError('Solo puede crear cursos asignados a usted', 403);
      }

      const course = await prisma.course.create({ data: req.body });
      sendCreated(res, course, 'Curso creado exitosamente');
    } catch (error) { next(error); }
  }
);

// PATCH /courses/:id
router.patch('/:id', teacherOrAdmin,
  [param('id').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const course = await prisma.course.update({
        where: { id: req.params.id },
        data: req.body
      });
      sendSuccess(res, course, 'Curso actualizado');
    } catch (error) { next(error); }
  }
);

// POST /courses/:id/rubrics - Asociar rúbrica a curso
router.post('/:id/rubrics', teacherOrAdmin,
  [param('id').isUUID(), body('rubricId').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rubricId } = req.body;
      const courseRubric = await prisma.courseRubric.create({
        data: { courseId: req.params.id, rubricId }
      });
      sendCreated(res, courseRubric, 'Rúbrica asociada al curso');
    } catch (error) { next(error); }
  }
);

export default router;
