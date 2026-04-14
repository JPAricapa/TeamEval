/**
 * Rutas de Rúbricas
 * CRUD completo con criterios, niveles de desempeño y versionamiento
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticate, teacherOrAdmin, allRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /rubrics - Listar rúbricas accesibles
router.get('/', allRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rubrics = await prisma.rubric.findMany({
        where: {
          isActive: true,
          OR: [
            { creatorId: req.user!.id },
            { isPublic: true }
          ]
        },
        include: {
          creator: { select: { firstName: true, lastName: true } },
          _count: { select: { criteria: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      sendSuccess(res, rubrics);
    } catch (error) { next(error); }
  }
);

// GET /rubrics/:id - Obtener rúbrica completa
router.get('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rubric = await prisma.rubric.findUnique({
        where: { id: req.params.id },
        include: {
          creator: { select: { firstName: true, lastName: true } },
          criteria: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: {
              performanceLevels: { orderBy: { order: 'asc' } }
            }
          },
          versions: {
            select: { id: true, version: true, name: true, createdAt: true }
          }
        }
      });
      if (!rubric) return sendNotFound(res);
      sendSuccess(res, rubric);
    } catch (error) { next(error); }
  }
);

// POST /rubrics - Crear rúbrica con criterios y niveles
router.post('/', teacherOrAdmin,
  [
    body('name').trim().notEmpty().withMessage('Nombre requerido'),
    body('description').optional().trim(),
    body('isPublic').optional().isBoolean(),
    body('criteria').isArray({ min: 1 }).withMessage('Se requiere al menos un criterio'),
    body('criteria.*.name').trim().notEmpty(),
    body('criteria.*.description').optional().trim(),
    body('criteria.*.weight').isFloat({ min: 0, max: 10 }),
    body('criteria.*.order').optional().isInt({ min: 0 }),
    body('criteria.*.performanceLevels').isArray({ min: 2 }),
    body('criteria.*.performanceLevels.*.name').trim().notEmpty(),
    body('criteria.*.performanceLevels.*.score').isFloat({ min: 0 }),
    body('criteria.*.performanceLevels.*.order').optional().isInt()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, isPublic, criteria, institutionId } = req.body;

      // Crear rúbrica con criterios y niveles en transacción
      const rubric = await prisma.$transaction(async (tx) => {
        const newRubric = await tx.rubric.create({
          data: {
            name,
            description,
            isPublic: isPublic ?? false,
            creatorId: req.user!.id,
            institutionId: institutionId ?? req.user!.institutionId
          }
        });

        // Crear criterios con sus niveles de desempeño
        for (const criterion of criteria) {
          const newCriteria = await tx.rubricCriteria.create({
            data: {
              rubricId: newRubric.id,
              name: criterion.name,
              description: criterion.description,
              weight: criterion.weight,
              order: criterion.order ?? 0
            }
          });

          for (const level of criterion.performanceLevels) {
            await tx.performanceLevel.create({
              data: {
                criteriaId: newCriteria.id,
                name: level.name,
                description: level.description,
                score: level.score,
                order: level.order ?? 0
              }
            });
          }
        }

        return tx.rubric.findUnique({
          where: { id: newRubric.id },
          include: {
            criteria: {
              include: { performanceLevels: { orderBy: { order: 'asc' } } },
              orderBy: { order: 'asc' }
            }
          }
        });
      });

      sendCreated(res, rubric, 'Rúbrica creada exitosamente');
    } catch (error) { next(error); }
  }
);

// PUT /rubrics/:id - Actualizar rúbrica (crea nueva versión)
router.put('/:id', teacherOrAdmin,
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const original = await prisma.rubric.findUnique({ where: { id: req.params.id } });
      if (!original) return sendNotFound(res, 'Rúbrica no encontrada');

      if (original.creatorId !== req.user!.id) {
        throw new AppError('Solo el creador puede modificar esta rúbrica', 403);
      }

      // Archivar la original
      await prisma.rubric.update({
        where: { id: req.params.id },
        data: { isActive: false }
      });

      // Crear nueva versión
      const newRubric = await prisma.rubric.create({
        data: {
          name: req.body.name ?? original.name,
          description: req.body.description ?? original.description,
          isPublic: original.isPublic,
          creatorId: req.user!.id,
          institutionId: original.institutionId,
          parentId: original.parentId ?? original.id,
          version: original.version + 1
        }
      });

      sendCreated(res, newRubric, `Nueva versión ${newRubric.version} creada`);
    } catch (error) { next(error); }
  }
);

// PATCH /rubrics/:id - Actualización parcial sin versionamiento
router.patch('/:id', teacherOrAdmin,
  [param('id').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rubric = await prisma.rubric.update({
        where: { id: req.params.id },
        data: req.body
      });
      sendSuccess(res, rubric, 'Rúbrica actualizada');
    } catch (error) { next(error); }
  }
);

// POST /rubrics/:id/criteria - Agregar criterio
router.post('/:id/criteria', teacherOrAdmin,
  [
    param('id').isUUID(),
    body('name').trim().notEmpty(),
    body('weight').isFloat({ min: 0 }),
    body('order').optional().isInt({ min: 0 })
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const criteria = await prisma.rubricCriteria.create({
        data: {
          rubricId: req.params.id,
          name: req.body.name,
          description: req.body.description,
          weight: req.body.weight,
          order: req.body.order ?? 0
        }
      });
      sendCreated(res, criteria, 'Criterio agregado');
    } catch (error) { next(error); }
  }
);

// POST /rubrics/criteria/:criteriaId/levels - Agregar nivel de desempeño
router.post('/criteria/:criteriaId/levels', teacherOrAdmin,
  [
    param('criteriaId').isUUID(),
    body('name').trim().notEmpty(),
    body('score').isFloat({ min: 0 }),
    body('order').optional().isInt({ min: 0 })
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const level = await prisma.performanceLevel.create({
        data: {
          criteriaId: req.params.criteriaId,
          name: req.body.name,
          description: req.body.description,
          score: req.body.score,
          order: req.body.order ?? 0
        }
      });
      sendCreated(res, level, 'Nivel de desempeño agregado');
    } catch (error) { next(error); }
  }
);

// DELETE /rubrics/:id - Desactivar rúbrica
router.delete('/:id', teacherOrAdmin,
  [param('id').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.rubric.update({
        where: { id: req.params.id },
        data: { isActive: false }
      });
      sendSuccess(res, null, 'Rúbrica desactivada');
    } catch (error) { next(error); }
  }
);

export default router;
