import { Router, Request, Response, NextFunction } from 'express';
import { query } from 'express-validator';
import { authenticate, adminOnly } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { prisma } from '../utils/prisma';
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
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (req.query.entity) where.entity = req.query.entity;
      if (req.query.action) where.action = req.query.action;
      if (req.query.userId) where.userId = req.query.userId;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
          }
        }),
        prisma.auditLog.count({ where })
      ]);

      sendSuccess(res, {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
