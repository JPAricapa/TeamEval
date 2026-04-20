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
import { getRubricForEvaluationType, groupCourseRubricsByType } from '../utils/rubricAssignment';

const router = Router();
router.use(authenticate);

type RubricSummary = {
  id: string;
  name: string;
  criteria?: Array<{ id: string; name: string; weight: number }>;
};

async function resolveEvaluationRubric(
  process: {
    rubricId?: string | null;
    legacyRubric?: RubricSummary | null;
    selfRubric?: RubricSummary | null;
    peerRubric?: RubricSummary | null;
    teacherRubric?: RubricSummary | null;
  },
  evaluationType: string,
  includePerformanceLevels: boolean
) {
  const typedRubric = getRubricForEvaluationType(process, evaluationType);
  if (typedRubric) return typedRubric;
  if (!process.rubricId) return null;

  return prisma.rubric.findUnique({
    where: { id: process.rubricId },
    include: {
      criteria: includePerformanceLevels
        ? { include: { performanceLevels: true } }
        : true
    }
  });
}

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
          course: {
            select: {
              id: true,
              name: true,
              code: true,
              groups: {
                where: { isActive: true },
                select: {
                  id: true,
                  name: true,
                  _count: { select: { members: { where: { isActive: true } } } }
                }
              }
            }
          },
          selfRubric: { select: { id: true, name: true, version: true } },
          peerRubric: { select: { id: true, name: true, version: true } },
          teacherRubric: { select: { id: true, name: true, version: true } },
          _count: { select: { evaluations: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const completedByProcess = processes.length === 0 ? [] : await prisma.evaluation.groupBy({
        by: ['processId'],
        where: {
          processId: { in: processes.map(p => p.id) },
          status: EvaluationStatus.COMPLETED
        },
        _count: { _all: true }
      });
      const completedMap = new Map(completedByProcess.map(c => [c.processId, c._count._all]));

      const withProgress = processes.map(p => {
        const groups = p.course?.groups ?? [];
        const studentCount = groups.reduce((sum, g) => sum + (g._count?.members ?? 0), 0);
        return {
          ...p,
          totalCount: p._count.evaluations,
          completedCount: completedMap.get(p.id) ?? 0,
          groupCount: groups.length,
          studentCount
        };
      });

      sendSuccess(res, withProgress);
    } catch (error) { next(error); }
  }
);

// GET /evaluations/processes/:id
router.get('/processes/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isStudent = req.user!.role === UserRole.STUDENT;

      // A los estudiantes solo les devolvemos sus propias evaluaciones como evaluador.
      // Esto garantiza el anonimato entre pares y que no vean los resultados recibidos.
      const evaluationsInclude = isStudent
        ? {
            where: { evaluatorId: req.user!.id },
            include: {
              evaluated: { select: { firstName: true, lastName: true } }
            }
          }
        : {
            include: {
              evaluator: { select: { firstName: true, lastName: true } },
              evaluated: { select: { firstName: true, lastName: true } }
            }
          };

      const process = await prisma.evaluationProcess.findUnique({
        where: { id: req.params.id },
        include: {
          course: {
            include: {
              groups: {
                where: { isActive: true },
                include: {
                  members: {
                    where: { isActive: true },
                    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
                  }
                }
              }
            }
          },
          selfRubric: { include: { criteria: { include: { performanceLevels: true } } } },
          peerRubric: { include: { criteria: { include: { performanceLevels: true } } } },
          teacherRubric: { include: { criteria: { include: { performanceLevels: true } } } },
          evaluations: evaluationsInclude
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
      const { courseId, selfWeight = 0.2, peerWeight = 0.5, teacherWeight = 0.3 } = req.body;

      // Validar que los pesos sumen 1
      const total = selfWeight + peerWeight + teacherWeight;
      if (Math.abs(total - 1) > 0.001) {
        throw new AppError(`Los pesos deben sumar 1.0 (actual: ${total.toFixed(2)})`, 400);
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          courseRubrics: {
            include: { rubric: true }
          }
        }
      });

      if (!course) {
        throw new AppError('Curso no encontrado.', 404);
      }

      const { selfRubric, peerRubric, teacherRubric } = groupCourseRubricsByType(course.courseRubrics);

      if (!selfRubric || !peerRubric || !teacherRubric) {
        throw new AppError(
          'El curso debe tener asociadas las rúbricas de autoevaluación, pares y docente.',
          400
        );
      }

      const process = await prisma.evaluationProcess.create({
        data: {
          ...req.body,
          selfRubricId: selfRubric.id,
          peerRubricId: peerRubric.id,
          teacherRubricId: teacherRubric.id,
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
                where: { isActive: true },
                include: {
                  members: { where: { isActive: true } }
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

      // Validar que haya al menos un grupo con ≥2 estudiantes (para coevaluación)
      const validGroups = process.course.groups.filter((g) => g.members.length >= 2);
      if (validGroups.length === 0) {
        throw new AppError(
          'No puedes activar el proceso: se necesita al menos un grupo con 2 o más integrantes.',
          400
        );
      }

      // Generar evaluaciones automáticamente: cada Group es un equipo de trabajo
      const evaluationsToCreate: Array<{
        processId: string;
        evaluatorId: string;
        evaluatedId: string;
        type: EvaluationType;
      }> = [];

      for (const group of process.course.groups) {
        const memberIds = group.members.map((m) => m.userId);

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

          // Coevaluación (evalúa a sus compañeros del mismo grupo)
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

      if (evaluationsToCreate.length === 0) {
        throw new AppError('No hay evaluaciones para generar. Verifica los grupos del curso.', 400);
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

// DELETE /evaluations/processes/:id - Eliminar proceso
// Solo permite eliminar si está en DRAFT o si no tiene evaluaciones completadas.
router.delete('/processes/:id', teacherOrAdmin,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const process = await prisma.evaluationProcess.findUnique({
        where: { id: req.params.id },
        include: { course: true }
      });
      if (!process) return sendNotFound(res, 'Proceso no encontrado');

      if (
        req.user!.role === UserRole.TEACHER &&
        process.course.teacherId !== req.user!.id
      ) {
        throw new AppError('No puedes eliminar procesos de un curso que no te pertenece', 403);
      }

      if (process.status === ProcessStatus.ACTIVE) {
        throw new AppError(
          'No puedes eliminar un proceso activo. Ciérralo primero antes de eliminarlo.',
          400
        );
      }

      await prisma.$transaction([
        prisma.evaluationScore.deleteMany({ where: { evaluation: { processId: process.id } } }),
        prisma.evaluation.deleteMany({ where: { processId: process.id } }),
        prisma.courseAnalytics.deleteMany({ where: { processId: process.id } }),
        prisma.teamAnalytics.deleteMany({ where: { processId: process.id } }),
        prisma.consolidatedResult.deleteMany({ where: { processId: process.id } }),
        prisma.evaluationProcess.delete({ where: { id: process.id } })
      ]);

      sendSuccess(res, null, 'Proceso eliminado');
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
            include: {
              selfRubric: { include: { criteria: { include: { performanceLevels: true } } } },
              peerRubric: { include: { criteria: { include: { performanceLevels: true } } } },
              teacherRubric: { include: { criteria: { include: { performanceLevels: true } } } },
            }
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

      const selectedRubric = await resolveEvaluationRubric(evaluation.process, evaluation.type, true);
      sendSuccess(res, {
        ...evaluation,
        process: {
          ...evaluation.process,
          rubric: selectedRubric
        }
      });
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
            include: {
              selfRubric: { include: { criteria: true } },
              peerRubric: { include: { criteria: true } },
              teacherRubric: { include: { criteria: true } },
            }
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
      const rubric = await resolveEvaluationRubric(evaluation.process, evaluation.type, false);
      if (!rubric) {
        throw new AppError('No hay una rúbrica configurada para este tipo de evaluación.', 400);
      }

      const criteriaIds = (rubric.criteria ?? []).map((c) => c.id);
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
