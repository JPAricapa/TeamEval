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

function getCurrentAcademicPeriod(date = new Date()) {
  const year = date.getFullYear();
  const semester = date.getMonth() <= 4 ? 1 : 2;

  return {
    code: `${year}-${semester}`,
    name: `Semestre ${year}-${semester}`,
    startDate: new Date(`${year}-${semester === 1 ? '01-01' : '06-01'}`),
    endDate: new Date(`${year}-${semester === 1 ? '05-31' : '12-31'}`)
  };
}

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
          _count: { select: { groups: { where: { isActive: true } } } },
          groups: {
            where: { isActive: true },
            select: {
              _count: { select: { members: { where: { isActive: true } } } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const withCounts = courses.map(({ groups, ...course }) => ({
        ...course,
        studentCount: groups.reduce((sum, g) => sum + (g._count?.members ?? 0), 0)
      }));

      sendSuccess(res, withCounts);
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
            where: { isActive: true },
            include: {
              members: {
                where: { isActive: true },
                include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
              },
              teams: {
                where: { isActive: true },
                include: {
                  members: {
                    where: { isActive: true },
                    include: { user: true }
                  }
                }
              }
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
    body('name').trim().notEmpty(),
    body('code').trim().notEmpty(),
    body('credits').optional().isInt({ min: 1 }),
    body('description').optional().trim()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const institutionId = req.user!.institutionId;
      if (!institutionId) {
        throw new AppError('No se pudo determinar la institución del usuario', 400);
      }

      const currentPeriod = getCurrentAcademicPeriod();

      await prisma.academicPeriod.updateMany({
        where: {
          isActive: true,
          code: { not: currentPeriod.code }
        },
        data: { isActive: false }
      });

      const activePeriod = await prisma.academicPeriod.upsert({
        where: { code: currentPeriod.code },
        update: {
          name: currentPeriod.name,
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          isActive: true
        },
        create: {
          name: currentPeriod.name,
          code: currentPeriod.code,
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          isActive: true
        }
      });

      const electronicsProgram = await prisma.program.findFirst({
        where: {
          institutionId,
          isActive: true,
          OR: [
            { code: 'IE' },
            { name: 'Ingeniería Electrónica' },
            { name: 'Ingenieria Electronica' }
          ]
        },
        orderBy: { createdAt: 'asc' }
      });

      const course = await prisma.course.create({
        data: {
          institutionId,
          teacherId: req.user!.id,
          periodId: activePeriod.id,
          programId: electronicsProgram?.id,
          name: req.body.name,
          code: req.body.code,
          credits: req.body.credits,
          description: req.body.description
        },
        include: {
          teacher: { select: { firstName: true, lastName: true, email: true } },
          period: { select: { name: true, code: true } },
          program: { select: { name: true } },
          _count: { select: { groups: true } }
        }
      });
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

// DELETE /courses/:id - Eliminar curso y todos sus datos
router.delete('/:id', teacherOrAdmin,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const course = await prisma.course.findUnique({
        where: { id: req.params.id },
        include: { evaluationProcesses: true }
      });
      if (!course) return sendNotFound(res, 'Curso no encontrado');

      if (req.user!.role === UserRole.TEACHER && course.teacherId !== req.user!.id) {
        throw new AppError('No puedes eliminar un curso que no te pertenece', 403);
      }

      const activeProcess = course.evaluationProcesses.find(p => p.status === 'ACTIVE');
      if (activeProcess) {
        throw new AppError('El curso tiene un proceso de evaluación activo. Ciérralo antes de eliminar el curso.', 400);
      }

      // Eliminar en cascada respetando claves foráneas
      const processIds = course.evaluationProcesses.map(p => p.id);
      await prisma.$transaction([
        prisma.evaluationScore.deleteMany({ where: { evaluation: { processId: { in: processIds } } } }),
        prisma.evaluation.deleteMany({ where: { processId: { in: processIds } } }),
        prisma.courseAnalytics.deleteMany({ where: { processId: { in: processIds } } }),
        prisma.teamAnalytics.deleteMany({ where: { processId: { in: processIds } } }),
        prisma.consolidatedResult.deleteMany({ where: { processId: { in: processIds } } }),
        prisma.evaluationProcess.deleteMany({ where: { courseId: req.params.id } }),
        prisma.courseRubric.deleteMany({ where: { courseId: req.params.id } }),
        prisma.groupMember.deleteMany({ where: { group: { courseId: req.params.id } } }),
        prisma.teamMember.deleteMany({ where: { team: { group: { courseId: req.params.id } } } }),
        prisma.team.deleteMany({ where: { group: { courseId: req.params.id } } }),
        prisma.group.deleteMany({ where: { courseId: req.params.id } }),
        prisma.course.delete({ where: { id: req.params.id } }),
      ]);

      sendSuccess(res, null, 'Curso eliminado');
    } catch (error) { next(error); }
  }
);

// POST /courses/:id/rubrics - Asociar rúbrica a curso
router.post('/:id/rubrics', teacherOrAdmin,
  [param('id').isUUID(), body('rubricId').isUUID(), body('evaluationType').optional().isIn(['SELF', 'PEER', 'TEACHER'])],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rubricId, evaluationType } = req.body;
      const courseRubric = await prisma.courseRubric.create({
        data: { courseId: req.params.id, rubricId, evaluationType }
      });
      sendCreated(res, courseRubric, 'Rúbrica asociada al curso');
    } catch (error) { next(error); }
  }
);

export default router;
