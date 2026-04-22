import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { EvaluationType, EvaluationStatus, ProcessStatus, UserRole } from '../constants/enums';
import { getRubricForEvaluationType, groupCourseRubricsByType } from '../utils/rubricAssignment';
import { audit } from '../utils/audit';

type AuthUser = { id: string; role: UserRole; institutionId?: string };

type RubricSummary = {
  id: string;
  name: string;
  criteria?: Array<{
    id: string;
    name: string;
    weight: number;
    performanceLevels?: Array<{ score: number }>;
  }>;
};

type ProcessRubrics = {
  selfRubric?: RubricSummary | null;
  peerRubric?: RubricSummary | null;
  teacherRubric?: RubricSummary | null;
};

class EvaluationService {
  async listProcesses(courseId?: string) {
    const where: Record<string, unknown> = {};
    if (courseId) where.courseId = courseId;

    const processes = await prisma.evaluationProcess.findMany({
      where,
      include: {
        course: {
          select: {
            id: true, name: true, code: true,
            groups: {
              where: { isActive: true },
              select: {
                id: true, name: true,
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
      where: { processId: { in: processes.map(p => p.id) }, status: EvaluationStatus.COMPLETED },
      _count: { _all: true }
    });
    const completedMap = new Map(completedByProcess.map(c => [c.processId, c._count._all]));

    return processes.map(p => {
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
  }

  async getProcessById(id: string, user: AuthUser) {
    const isStudent = user.role === UserRole.STUDENT;

    const evaluationsInclude = isStudent
      ? {
          where: { evaluatorId: user.id },
          include: { evaluated: { select: { firstName: true, lastName: true } } }
        }
      : {
          include: {
            evaluator: { select: { id: true, firstName: true, lastName: true } },
            evaluated: { select: { id: true, firstName: true, lastName: true } }
          }
        };

    const process = await prisma.evaluationProcess.findUnique({
      where: { id },
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
    if (!process) throw new AppError('Proceso no encontrado', 404);
    return process;
  }

  async createProcess(data: {
    courseId: string; name: string; description?: string;
    startDate: Date; endDate: Date;
    selfWeight?: number; peerWeight?: number; teacherWeight?: number;
    includeSelf?: boolean; includePeer?: boolean; includeTeacher?: boolean;
    allowAnonymousPeer?: boolean;
  }, actorId?: string) {
    const { courseId, selfWeight = 0.2, peerWeight = 0.5, teacherWeight = 0.3 } = data;

    const total = selfWeight + peerWeight + teacherWeight;
    if (Math.abs(total - 1) > 0.001) {
      throw new AppError(`Los pesos deben sumar 1.0 (actual: ${total.toFixed(2)})`, 400);
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { courseRubrics: { include: { rubric: true } } }
    });
    if (!course) throw new AppError('Curso no encontrado.', 404);

    const { selfRubric, peerRubric, teacherRubric } = groupCourseRubricsByType(course.courseRubrics);
    if (!selfRubric || !peerRubric || !teacherRubric) {
      throw new AppError('El curso debe tener asociadas las rúbricas de autoevaluación, pares y docente.', 400);
    }

    const process = await prisma.evaluationProcess.create({
      data: {
        ...data,
        selfRubricId: selfRubric.id,
        peerRubricId: peerRubric.id,
        teacherRubricId: teacherRubric.id,
        selfWeight,
        peerWeight,
        teacherWeight
      }
    });
    audit({ userId: actorId ?? null, action: 'PROCESS_CREATED', entity: 'EvaluationProcess', entityId: process.id, details: { name: data.name, courseId } });
    return process;
  }

  async activateProcess(id: string, actorId?: string) {
    const process = await prisma.evaluationProcess.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            groups: { where: { isActive: true }, include: { members: { where: { isActive: true } } } }
          }
        }
      }
    });
    if (!process) throw new AppError('Proceso no encontrado', 404);
    if (process.status !== ProcessStatus.DRAFT) throw new AppError('Solo procesos en borrador pueden activarse', 400);

    const validGroups = process.course.groups.filter(g => g.members.length >= 2);
    if (validGroups.length === 0) {
      throw new AppError('No puedes activar el proceso: se necesita al menos un grupo con 2 o más integrantes.', 400);
    }

    const evaluationsToCreate: Array<{
      processId: string; evaluatorId: string; evaluatedId: string; type: EvaluationType;
    }> = [];

    for (const group of process.course.groups) {
      const memberIds = group.members.map(m => m.userId);
      for (const memberId of memberIds) {
        if (process.includeSelf) {
          evaluationsToCreate.push({ processId: process.id, evaluatorId: memberId, evaluatedId: memberId, type: EvaluationType.SELF });
        }
        if (process.includePeer) {
          for (const peerId of memberIds) {
            if (peerId !== memberId) {
              evaluationsToCreate.push({ processId: process.id, evaluatorId: memberId, evaluatedId: peerId, type: EvaluationType.PEER });
            }
          }
        }
        if (process.includeTeacher) {
          evaluationsToCreate.push({ processId: process.id, evaluatorId: process.course.teacherId, evaluatedId: memberId, type: EvaluationType.TEACHER });
        }
      }
    }

    if (evaluationsToCreate.length === 0) {
      throw new AppError('No hay evaluaciones para generar. Verifica los grupos del curso.', 400);
    }

    await prisma.$transaction([
      prisma.evaluation.createMany({ data: evaluationsToCreate }),
      prisma.evaluationProcess.update({ where: { id: process.id }, data: { status: ProcessStatus.ACTIVE } })
    ]);

    audit({ userId: actorId ?? null, action: 'PROCESS_ACTIVATED', entity: 'EvaluationProcess', entityId: process.id, details: { name: process.name, evaluationsCreated: evaluationsToCreate.length } });
    return { processId: process.id, evaluationsCreated: evaluationsToCreate.length };
  }

  async closeProcess(id: string, actorId?: string) {
    const process = await prisma.evaluationProcess.update({ where: { id }, data: { status: ProcessStatus.CLOSED } });
    audit({ userId: actorId ?? null, action: 'PROCESS_CLOSED', entity: 'EvaluationProcess', entityId: id, details: { name: process.name } });
    return process;
  }

  async deleteProcess(id: string, user: AuthUser) {
    const process = await prisma.evaluationProcess.findUnique({ where: { id }, include: { course: true } });
    if (!process) throw new AppError('Proceso no encontrado', 404);

    if (user.role === UserRole.TEACHER && process.course.teacherId !== user.id) {
      throw new AppError('No puedes eliminar procesos de un curso que no te pertenece', 403);
    }
    if (process.status === ProcessStatus.ACTIVE) {
      throw new AppError('No puedes eliminar un proceso activo. Ciérralo primero antes de eliminarlo.', 400);
    }

    await prisma.$transaction([
      prisma.evaluationScore.deleteMany({ where: { evaluation: { processId: id } } }),
      prisma.evaluation.deleteMany({ where: { processId: id } }),
      prisma.courseAnalytics.deleteMany({ where: { processId: id } }),
      prisma.teamAnalytics.deleteMany({ where: { processId: id } }),
      prisma.consolidatedResult.deleteMany({ where: { processId: id } }),
      prisma.evaluationProcess.delete({ where: { id } })
    ]);
    audit({ userId: user.id, action: 'PROCESS_DELETED', entity: 'EvaluationProcess', entityId: id, details: { name: process.name } });
  }

  async getMyPending(userId: string) {
    return prisma.evaluation.findMany({
      where: {
        evaluatorId: userId,
        status: { in: [EvaluationStatus.PENDING, EvaluationStatus.IN_PROGRESS] },
        process: { status: ProcessStatus.ACTIVE }
      },
      include: {
        evaluated: { select: { id: true, firstName: true, lastName: true } },
        process: {
          select: {
            name: true, endDate: true,
            course: {
              select: {
                groups: {
                  where: { isActive: true },
                  select: {
                    name: true,
                    members: { where: { isActive: true }, select: { userId: true } }
                  }
                }
              }
            }
          }
        },
        scores: { include: { criteria: true } }
      },
      orderBy: { process: { endDate: 'asc' } }
    });
  }

  async getEvaluationById(id: string, user: AuthUser) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      include: {
        evaluator: { select: { firstName: true, lastName: true, role: true } },
        evaluated: { select: { firstName: true, lastName: true } },
        process: {
          include: {
            selfRubric: { include: { criteria: { include: { performanceLevels: true } } } },
            peerRubric: { include: { criteria: { include: { performanceLevels: true } } } },
            teacherRubric: { include: { criteria: { include: { performanceLevels: true } } } }
          }
        },
        scores: { include: { criteria: true } }
      }
    });
    if (!evaluation) throw new AppError('Evaluación no encontrada', 404);

    if (evaluation.evaluatorId !== user.id && user.role !== UserRole.TEACHER && user.role !== UserRole.ADMIN) {
      throw new AppError('Sin permisos para ver esta evaluación', 403);
    }

    const rubric = this.resolveEvaluationRubric(evaluation.process, evaluation.type);
    return { ...evaluation, process: { ...evaluation.process, rubric } };
  }

  async submitEvaluation(id: string, userId: string, data: {
    scores: Array<{ criteriaId: string; score: number; comment?: string }>;
    generalComment?: string;
  }) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      include: {
        process: {
          include: {
            selfRubric: { include: { criteria: { include: { performanceLevels: true } } } },
            peerRubric: { include: { criteria: { include: { performanceLevels: true } } } },
            teacherRubric: { include: { criteria: { include: { performanceLevels: true } } } }
          }
        }
      }
    });
    if (!evaluation) throw new AppError('Evaluación no encontrada', 404);
    if (evaluation.evaluatorId !== userId) throw new AppError('No es el evaluador asignado', 403);
    if (evaluation.status === EvaluationStatus.COMPLETED) throw new AppError('Esta evaluación ya fue completada', 400);
    if (evaluation.process.status !== ProcessStatus.ACTIVE) throw new AppError('El proceso de evaluación no está activo', 400);

    const rubric = this.resolveEvaluationRubric(evaluation.process, evaluation.type);
    if (!rubric) throw new AppError('No hay una rúbrica configurada para este tipo de evaluación.', 400);

    const criteriaIds = (rubric.criteria ?? []).map(c => c.id);
    const scoreCriteriaIds = data.scores.map(s => s.criteriaId);
    const missing = criteriaIds.filter(cid => !scoreCriteriaIds.includes(cid));
    if (missing.length > 0) throw new AppError(`Faltan criterios por evaluar: ${missing.length} criterio(s)`, 400);

    const invalidScores = data.scores.filter(submittedScore => {
      const criterion = rubric.criteria?.find(item => item.id === submittedScore.criteriaId);
      if (!criterion) return true;
      const performanceLevels =
        'performanceLevels' in criterion && Array.isArray(criterion.performanceLevels)
          ? criterion.performanceLevels
          : [];
      const allowedScores = performanceLevels.map((level: { score: number }) => level.score);
      if (allowedScores.length === 0) return submittedScore.score < 1 || submittedScore.score > 5;
      return !allowedScores.includes(submittedScore.score);
    });
    if (invalidScores.length > 0) {
      throw new AppError('Uno o más puntajes no corresponden a la escala configurada para la rúbrica.', 400);
    }

    await prisma.$transaction(async (tx) => {
      for (const score of data.scores) {
        await tx.evaluationScore.upsert({
          where: { evaluationId_criteriaId: { evaluationId: evaluation.id, criteriaId: score.criteriaId } },
          create: { evaluationId: evaluation.id, criteriaId: score.criteriaId, score: score.score, comment: score.comment },
          update: { score: score.score, comment: score.comment }
        });
      }
      await tx.evaluation.update({
        where: { id: evaluation.id },
        data: { status: EvaluationStatus.COMPLETED, generalComment: data.generalComment, submittedAt: new Date() }
      });
    });
  }

  private resolveEvaluationRubric(process: ProcessRubrics, evaluationType: string) {
    return getRubricForEvaluationType(process, evaluationType);
  }
}

export const evaluationService = new EvaluationService();
