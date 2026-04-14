/**
 * Rutas de Equipos de trabajo
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticate, teacherOrAdmin, allRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';

const router = Router();
router.use(authenticate);

// GET /teams?groupId=...
router.get('/', allRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.query;
      const teams = await prisma.team.findMany({
        where: {
          isActive: true,
          ...(groupId ? { groupId: groupId as string } : {})
        },
        include: {
          members: {
            where: { isActive: true },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
          },
          group: { select: { name: true, courseId: true } }
        }
      });
      sendSuccess(res, teams);
    } catch (error) { next(error); }
  }
);

// GET /teams/:id
router.get('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await prisma.team.findUnique({
        where: { id: req.params.id },
        include: {
          members: { include: { user: true } },
          results: true
        }
      });
      if (!team) return sendNotFound(res);
      sendSuccess(res, team);
    } catch (error) { next(error); }
  }
);

// POST /teams
router.post('/', teacherOrAdmin,
  [
    body('groupId').isUUID(),
    body('name').trim().notEmpty(),
    body('description').optional().trim()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await prisma.team.create({ data: req.body });
      sendCreated(res, team, 'Equipo creado');
    } catch (error) { next(error); }
  }
);

// POST /teams/:id/members
router.post('/:id/members', teacherOrAdmin,
  [param('id').isUUID(), body('userId').isUUID(), body('role').optional().trim()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await prisma.teamMember.create({
        data: {
          teamId: req.params.id,
          userId: req.body.userId,
          role: req.body.role
        }
      });
      sendCreated(res, member, 'Miembro agregado al equipo');
    } catch (error) { next(error); }
  }
);

// DELETE /teams/:id/members/:userId
router.delete('/:id/members/:userId', teacherOrAdmin,
  [param('id').isUUID(), param('userId').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.teamMember.updateMany({
        where: { teamId: req.params.id, userId: req.params.userId },
        data: { isActive: false }
      });
      sendSuccess(res, null, 'Miembro removido del equipo');
    } catch (error) { next(error); }
  }
);

export default router;
