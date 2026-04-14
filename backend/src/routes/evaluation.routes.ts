/**
 * Rutas de Evaluación
 * Gestión de procesos de evaluación, asignación y envío de evaluaciones
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticate, teacherOrAdmin, allRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { EvaluationType, EvaluationStatus, ProcessStatus, UserRole } from '../constants/enums';

const router = Router();
router.use(authenticate);

// ============================================================
// PROCESOS DE EVALUACIÓN
// ============================================================

// GET /evaluations/processes - Listar procesos
router.get('/processes', allRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.query;
      const where: Record<string, unknown> = {};
      if (courseId) where.courseId = courseId;

      const processes = await prisma.evaluationProcess.findMany({
        where,
        include: {
          course: { select: { name: true, code: true } },
          rubric: { select: { name: true, version: true } },
          _count: { select: { evaluations: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      sendSuccess(res, processes);
    } catch (error) { next(error); }
  }
);

// GET /evaluations/processes/:id
router.get('/processes/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const process = await prisma.evaluationProcess.findUnique({
        where: { id: req.params.id },
        include: {
          course: { include: { groups: { include: { teams: { include: { members: { include: { user: true } } } } } } } },
          rubric: { include: { criteria: { include: { performanceLevels: true } } } },
          evaluations: {
            include: {
              evaluator: { select: { firstName: true, lastName: true } },
              evaluated: { select: { firstName: true, lastName: true } }
            }
          }
        }
      });
      if (!process) return sendNotFound(res);
      sendSuccess(res, process);
    } catch (error) { next(error); }
  }
);

// POST /evaluations/processes - Crear proceso de evaluación
router.post('/processes', teacherOrAdmin,
  [
    body('courseId').isUUID(),
    body('rubricId').isUUID(),
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
    body('startDate').isISO8601().toDate(),
    body('endDate').isISO8601().toDate(),
    body('selfWeight').optional().isFloat({ min: 0, max: 1 }),
    body('peerWeight').optional().isFloat({ min: 0, max: 1 }),
    body('teacherWeight').optional().isFloat({ min: 0, max: 1 }),
    body('includeSelf').optional().isBoolean(),
    body('includePeer').optional().isBoolean(),
    body('includeTeacher').optional().isBoolean(),
    body('allowAnonymousPeer').optional().isBoolean()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { selfWeight = 0.2, peerWeight = 0.5, teacherWeight = 0.3 } = req.body;

      // Validar que los pesos sumen 1
      const total = selfWeight + peerWeight + teacherWeight;
      if (Math.abs(total - 1) > 0.001) {
        throw new AppError(`Los pesos deben sumar 1.0 (actual: ${total.toFixed(2)})`, 400);
      }

      const process = await prisma.evaluationProcess.create({
        data: {
          ...req.body,
          selfWeight,
          peerWeight,
          teacherWeight
        }
      });
      sendCreated(res, process, 'Proceso de evaluación creado');
    } catch (error) { next(error); }
  }
);

// POST /evaluations/processes/:id/activate - Activar proceso y generar evaluaciones
router.post('/processes/:id/activate', teacherOrAdmin,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const process = await prisma.evaluationProcess.findUnique({
        where: { id: req.params.id },
        include: {
          course: {
            include: {
              groups: {
                include: {
                  teams: {
                    include: { members: { where: { isActive: true } } }
                  }
                }
              }
            }
          }
        }
      });

      if (!process) return sendNotFound(res, 'Proceso no encontrado');
      if (process.status !== ProcessStatus.DRAFT) {
        throw new AppError('Solo procesos en borrador pueden activarse', 400);
      }

      // Generar evaluaciones automáticamente para cada equipo
      const evaluationsToCreate: Array<{
        processId: string;
        evaluatorId: string;
        evaluatedId: string;
        type: EvaluationType;
      }> = [];

      for (const group of process.course.groups) {
        for (const team of group.teams) {
          const memberIds = team.members.map((m) => m.userId);

          for (const memberId of memberIds) {
            // Autoevaluación
            if (process.includeSelf) {
              evaluationsToCreate.push({
                processId: process.id,
                evaluatorId: memberId,
                evaluatedId: memberId,
                type: EvaluationType.SELF
              });
            }

            // Coevaluación (evalúa a sus compañeros)
            if (process.includePeer) {
              for (const peerId of memberIds) {
                if (peerId !== memberId) {
                  evaluationsToCreate.push({
                    processId: process.id,
                    evaluatorId: memberId,
                    evaluatedId: peerId,
                    type: EvaluationType.PEER
                  });
                }
              }
            }

            // Evaluación docente
            if (process.includeTeacher) {
              evaluationsToCreate.push({
                processId: process.id,
                evaluatorId: process.course.teacherId,
                evaluatedId: memberId,
                type: EvaluationType.TEACHER
              });
            }
          }
        }
      }

      // Crear en transacción
      await prisma.$transaction([
        prisma.evaluation.createMany({
          data: evaluationsToCreate
        }),
        prisma.evaluationProcess.update({
          where: { id: process.id },
          data: { status: ProcessStatus.ACTIVE }
        })
      ]);

      sendSuccess(res, {
        processId: process.id,
        evaluationsCreated: evaluationsToCreate.length
      }, `Proceso activado. ${evaluationsToCreate.length} evaluaciones generadas.`);
    } catch (error) { next(error); }
  }
);

// PATCH /evaluations/processes/:id/close - Cerrar proceso
router.patch('/processes/:id/close', teacherOrAdmin,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const process = await prisma.evaluationProcess.update({
        where: { id: req.params.id },
        data: { status: ProcessStatus.CLOSED }
      });
      sendSuccess(res, process, 'Proceso cerrado');
    } catch (error) { next(error); }
  }
);

// ============================================================
// EVALUACIONES INDIVIDUALES
// ============================================================

// GET /evaluations/my-pending - Evaluaciones pendientes del usuario
router.get('/my-pending', allRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evaluations = await prisma.evaluation.findMany({
        where: {
          evaluatorId: req.user!.id,
          status: { in: [EvaluationStatus.PENDING, EvaluationStatus.IN_PROGRESS] },
          process: { status: ProcessStatus.ACTIVE }
        },
        include: {
          evaluated: { select: { firstName: true, lastName: true } },
          process: { select: { name: true, endDate: true } },
          scores: { include: { criteria: true } }
        },
        orderBy: { process: { endDate: 'asc' } }
      });
      sendSuccess(res, evaluations);
    } catch (error) { next(error); }
  }
);

// GET /evaluations/:id
router.get('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evaluation = await prisma.evaluation.findUnique({
        where: { id: req.params.id },
        include: {
          evaluator: { select: { firstName: true, lastName: true, role: true } },
          evaluated: { select: { firstName: true, lastName: true } },
          process: {
            include: { rubric: { include: { criteria: { include: { performanceLevels: true } } } } }
          },
          scores: { include: { criteria: true } }
        }
      });
      if (!evaluation) return sendNotFound(res);

      // Solo el evaluador puede ver su evaluación
      if (
        evaluation.evaluatorId !== req.user!.id &&
        req.user!.role !== UserRole.TEACHER &&
        req.user!.role !== UserRole.ADMIN
      ) {
        throw new AppError('Sin permisos para ver esta evaluación', 403);
      }

      sendSuccess(res, evaluation);
    } catch (error) { next(error); }
  }
);

// POST /evaluations/:id/submit - Enviar evaluación con puntajes
router.post('/:id/submit', allRoles,
  [
    param('id').isUUID(),
    body('scores').isArray({ min: 1 }).withMessage('Se requieren puntajes'),
    body('scores.*.criteriaId').isUUID(),
    body('scores.*.score').isFloat({ min: 0 }),
    body('scores.*.comment').optional().trim(),
    body('generalComment').optional().trim()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evaluation = await prisma.evaluation.findUnique({
        where: { id: req.params.id },
        include: {
          process: {
            include: { rubric: { include: { criteria: true } } }
          }
        }
      });

      if (!evaluation) return sendNotFound(res, 'Evaluación no encontrada');
      if (evaluation.evaluatorId !== req.user!.id) {
        throw new AppError('No es el evaluador asignado', 403);
      }
      if (evaluation.status === EvaluationStatus.COMPLETED) {
        throw new AppError('Esta evaluación ya fue completada', 400);
      }
      if (evaluation.process.status !== ProcessStatus.ACTIVE) {
        throw new AppError('El proceso de evaluación no está activo', 400);
      }

      // Verificar que se evaluaron todos los criterios
      const criteriaIds = evaluation.process.rubric.criteria.map((c) => c.id);
      const scoreCriteriaIds = req.body.scores.map((s: { criteriaId: string }) => s.criteriaId);
      const missing = criteriaIds.filter((id) => !scoreCriteriaIds.includes(id));

      if (missing.length > 0) {
        throw new AppError(`Faltan criterios por evaluar: ${missing.length} criterio(s)`, 400);
      }

      // Guardar evaluación en transacción
      await prisma.$transaction(async (tx) => {
        // Crear/actualizar scores por criterio
        for (const score of req.body.scores) {
          await tx.evaluationScore.upsert({
            where: {
              evaluationId_criteriaId: {
                evaluationId: evaluation.id,
                criteriaId: score.criteriaId
              }
            },
            create: {
              evaluationId: evaluation.id,
              criteriaId: score.criteriaId,
              score: score.score,
              comment: score.comment
            },
            update: {
              score: score.score,
              comment: score.comment
            }
          });
        }

        // Marcar como completada
        await tx.evaluation.update({
          where: { id: evaluation.id },
          data: {
            status: EvaluationStatus.COMPLETED,
            generalComment: req.body.generalComment,
            submittedAt: new Date()
          }
        });
      });

      sendSuccess(res, null, 'Evaluación enviada exitosamente');
    } catch (error) { next(error); }
  }
);

export default router;
