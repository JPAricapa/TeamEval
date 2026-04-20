/**
 * Rutas de Grupos y Equipos dentro de un curso
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { authenticate, teacherOrAdmin, allRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../constants/enums';

const router = Router();
router.use(authenticate);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeGroupName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

// GET /groups?courseId=...
router.get('/', allRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.query;
      const groups = await prisma.group.findMany({
        where: {
          isActive: true,
          ...(courseId ? { courseId: courseId as string } : {})
        },
        include: {
          members: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
          },
          teams: {
            include: {
              members: {
                include: { user: { select: { id: true, firstName: true, lastName: true } } }
              }
            }
          }
        }
      });
      sendSuccess(res, groups);
    } catch (error) { next(error); }
  }
);

// GET /groups/:id
router.get('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await prisma.group.findUnique({
        where: { id: req.params.id },
        include: {
          members: { include: { user: true } },
          teams: { include: { members: { include: { user: true } } } }
        }
      });
      if (!group) return sendNotFound(res);
      sendSuccess(res, group);
    } catch (error) { next(error); }
  }
);

// POST /groups
router.post('/', teacherOrAdmin,
  [
    body('courseId').isUUID(),
    body('name').trim().notEmpty(),
    body('description').optional().trim()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const course = await prisma.course.findUnique({ where: { id: req.body.courseId } });
      if (!course) throw new AppError('Curso no encontrado', 404);
      if (req.user!.role === UserRole.TEACHER && course.teacherId !== req.user!.id) {
        throw new AppError('No puedes crear grupos en un curso que no te pertenece', 403);
      }

      const normalizedName = normalizeGroupName(req.body.name);
      const existingGroup = await prisma.group.findFirst({
        where: {
          courseId: req.body.courseId,
          name: {
            equals: normalizedName,
            mode: 'insensitive'
          }
        }
      });

      if (existingGroup) {
        throw new AppError('Ya existe un grupo con ese nombre en este curso', 409);
      }

      const group = await prisma.group.create({
        data: {
          ...req.body,
          name: normalizedName
        }
      });
      sendCreated(res, group, 'Grupo creado');
    } catch (error) { next(error); }
  }
);

// POST /groups/:id/members - Agregar estudiante al grupo
router.post('/:id/members', teacherOrAdmin,
  [param('id').isUUID(), body('userId').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await prisma.groupMember.create({
        data: { groupId: req.params.id, userId: req.body.userId }
      });
      sendCreated(res, member, 'Estudiante agregado al grupo');
    } catch (error) { next(error); }
  }
);

// POST /groups/:id/students - Crear o vincular estudiante directamente al grupo
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
      const group = await prisma.group.findUnique({
        where: { id: req.params.id },
        include: { course: true }
      });
      if (!group) return sendNotFound(res, 'Grupo no encontrado');

      if (req.user!.role === UserRole.TEACHER && group.course.teacherId !== req.user!.id) {
        throw new AppError('No puedes registrar estudiantes en un curso que no te pertenece', 403);
      }

      const { firstName, lastName, nationalId } = req.body;
      const email = normalizeEmail(req.body.email);

      let user = await prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: 'insensitive'
          }
        }
      });

      if (!user) {
        const byNationalId = await prisma.user.findUnique({ where: { nationalId } });
        if (byNationalId) {
          throw new AppError('La cédula ya está registrada con otro correo', 409);
        }

        const passwordHash = await bcrypt.hash(nationalId, 12);
        user = await prisma.user.create({
          data: {
            email,
            firstName,
            lastName,
            nationalId,
            passwordHash,
            role: UserRole.STUDENT,
            institutionId: group.course.institutionId,
            isActive: true
          }
        });
      } else if (user.role !== UserRole.STUDENT) {
        throw new AppError('El correo ya pertenece a un usuario que no es estudiante', 409);
      } else if (user.email !== email) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { email }
        });
      }

      await prisma.groupMember.upsert({
        where: { groupId_userId: { groupId: group.id, userId: user.id } },
        update: { isActive: true },
        create: { groupId: group.id, userId: user.id }
      });

      sendCreated(res, {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive
        },
        initialPassword: nationalId
      }, 'Estudiante registrado en el grupo');
    } catch (error) { next(error); }
  }
);

// DELETE /groups/:id/members/:userId
router.delete('/:id/members/:userId', teacherOrAdmin,
  [param('id').isUUID(), param('userId').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.groupMember.updateMany({
        where: { groupId: req.params.id, userId: req.params.userId },
        data: { isActive: false }
      });
      sendSuccess(res, null, 'Estudiante removido del grupo');
    } catch (error) { next(error); }
  }
);

// DELETE /groups/:id
router.delete('/:id', teacherOrAdmin,
  [param('id').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await prisma.group.findUnique({
        where: { id: req.params.id },
        include: { course: true }
      });
      if (!group) return sendNotFound(res, 'Grupo no encontrado');

      if (req.user!.role === UserRole.TEACHER && group.course.teacherId !== req.user!.id) {
        throw new AppError('No puedes eliminar grupos de un curso que no te pertenece', 403);
      }

      await prisma.$transaction([
        prisma.groupMember.updateMany({
          where: { groupId: req.params.id },
          data: { isActive: false }
        }),
        prisma.group.update({
          where: { id: req.params.id },
          data: { isActive: false }
        })
      ]);

      sendSuccess(res, null, 'Grupo eliminado');
    } catch (error) { next(error); }
  }
);

export default router;
