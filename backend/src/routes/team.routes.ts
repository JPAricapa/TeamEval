import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, teacherOrAdmin, allRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated } from '../utils/response';
import { teamService } from '../services/team.service';

const router = Router();
router.use(authenticate);

router.get('/', allRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teams = await teamService.listTeams(req.user!, req.query.groupId as string | undefined);
      sendSuccess(res, teams);
    } catch (error) { next(error); }
  }
);

router.get('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await teamService.getTeamById(req.params.id, req.user!);
      sendSuccess(res, team);
    } catch (error) { next(error); }
  }
);

router.post('/', teacherOrAdmin,
  [
    body('groupId').isUUID(),
    body('name').trim().notEmpty(),
    body('description').optional().trim()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await teamService.createTeam(req.user!, req.body);
      sendCreated(res, team, 'Equipo creado');
    } catch (error) { next(error); }
  }
);

router.post('/:id/members', teacherOrAdmin,
  [param('id').isUUID(), body('userId').isUUID(), body('role').optional().trim()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await teamService.addMember(req.params.id, req.body.userId, req.user!, req.body.role);
      sendCreated(res, member, 'Miembro agregado al equipo');
    } catch (error) { next(error); }
  }
);

router.delete('/:id/members/:userId', teacherOrAdmin,
  [param('id').isUUID(), param('userId').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await teamService.removeMember(req.params.id, req.params.userId, req.user!);
      sendSuccess(res, null, 'Miembro removido del equipo');
    } catch (error) { next(error); }
  }
);

export default router;
