/**
 * Rutas de Programas Académicos
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticate, teacherOrAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';

const router = Router();
router.use(authenticate, teacherOrAdmin);

// GET /programs
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const programs = await prisma.program.findMany({
      where: { isActive: true },
      include: { institution: { select: { name: true } } },
      orderBy: { name: 'asc' }
    });
    sendSuccess(res, programs);
  } catch (error) { next(error); }
});

// GET /programs/:id
router.get('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const program = await prisma.program.findUnique({
        where: { id: req.params.id },
        include: { institution: true, courses: { where: { isActive: true } } }
      });
      if (!program) return sendNotFound(res);
      sendSuccess(res, program);
    } catch (error) { next(error); }
  }
);

// POST /programs
router.post('/',
  [
    body('institutionId').isUUID().withMessage('ID de institución requerido'),
    body('name').trim().notEmpty(),
    body('code').trim().notEmpty(),
    body('department').optional().trim()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const program = await prisma.program.create({ data: req.body });
      sendCreated(res, program, 'Programa creado');
    } catch (error) { next(error); }
  }
);

// PATCH /programs/:id
router.patch('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const program = await prisma.program.update({
        where: { id: req.params.id },
        data: req.body
      });
      sendSuccess(res, program, 'Programa actualizado');
    } catch (error) { next(error); }
  }
);

export default router;
