/**
 * Rutas de Instituciones
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticate, adminOnly } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';

const router = Router();
router.use(authenticate);

// GET /institutions
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const institutions = await prisma.institution.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    sendSuccess(res, institutions, 'Instituciones obtenidas');
  } catch (error) { next(error); }
});

// GET /institutions/:id
router.get('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inst = await prisma.institution.findUnique({
        where: { id: req.params.id },
        include: { programs: true }
      });
      if (!inst) return sendNotFound(res);
      sendSuccess(res, inst);
    } catch (error) { next(error); }
  }
);

// POST /institutions
router.post('/', adminOnly,
  [
    body('name').trim().notEmpty().withMessage('Nombre requerido'),
    body('code').trim().notEmpty().withMessage('Código requerido'),
    body('logoUrl').optional().isURL()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, code, logoUrl } = req.body;
      const inst = await prisma.institution.create({ data: { name, code, logoUrl } });
      sendCreated(res, inst, 'Institución creada');
    } catch (error) { next(error); }
  }
);

// PATCH /institutions/:id
router.patch('/:id', adminOnly,
  [param('id').isUUID(), body('name').optional().trim().notEmpty()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inst = await prisma.institution.update({
        where: { id: req.params.id },
        data: req.body
      });
      sendSuccess(res, inst, 'Institución actualizada');
    } catch (error) { next(error); }
  }
);

export default router;
