/**
 * Rutas de Períodos Académicos
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticate, teacherOrAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';

const router = Router();
router.use(authenticate, teacherOrAdmin);

// GET /periods
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const periods = await prisma.academicPeriod.findMany({
      orderBy: { startDate: 'desc' }
    });
    sendSuccess(res, periods);
  } catch (error) { next(error); }
});

// GET /periods/:id
router.get('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = await prisma.academicPeriod.findUnique({
        where: { id: req.params.id }
      });
      if (!period) return sendNotFound(res);
      sendSuccess(res, period);
    } catch (error) { next(error); }
  }
);

// POST /periods
router.post('/',
  [
    body('name').trim().notEmpty().withMessage('Nombre requerido'),
    body('code').trim().notEmpty(),
    body('startDate').isISO8601().toDate().withMessage('Fecha inicio inválida'),
    body('endDate').isISO8601().toDate().withMessage('Fecha fin inválida')
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = await prisma.academicPeriod.create({ data: req.body });
      sendCreated(res, period, 'Período académico creado');
    } catch (error) { next(error); }
  }
);

// PATCH /periods/:id
router.patch('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = await prisma.academicPeriod.update({
        where: { id: req.params.id },
        data: req.body
      });
      sendSuccess(res, period, 'Período actualizado');
    } catch (error) { next(error); }
  }
);

export default router;
