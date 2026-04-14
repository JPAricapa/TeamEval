/**
 * Rutas de Grupos y Equipos dentro de un curso
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticate, teacherOrAdmin, allRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';

const router = Router();
router.use(authenticate);

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
      const group = await prisma.group.create({ data: req.body });
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

export default router;
