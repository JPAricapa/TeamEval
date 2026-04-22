import { Router, Request, Response, NextFunction } from 'express';
import { query } from 'express-validator';
import { authenticate, adminOnly } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { auditService } from '../services/audit.service';
import { sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate, adminOnly);

router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('entity').optional().isString().trim(),
    query('action').optional().isString().trim(),
    query('userId').optional().isString().trim(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = (req.query.page as unknown as number) || 1;
      const limit = (req.query.limit as unknown as number) || 30;
      const result = await auditService.getLogs({
        page,
        limit,
        entity: req.query.entity as string | undefined,
        action: req.query.action as string | undefined,
        userId: req.query.userId as string | undefined,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
