/**
 * Servicio de Consolidación de Resultados
 *
 * Calcula el puntaje final ponderado por estudiante combinando:
 * - Autoevaluación (peso configurable)
 * - Coevaluación promedio (peso configurable)
 * - Evaluación docente (peso configurable)
 */

import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { EvaluationType, EvaluationStatus } from '../constants/enums';
import { getAllProcessCriteria, getRubricForEvaluationType } from '../utils/rubricAssignment';

export interface ConsolidationResult {
  studentId: string;
  selfScore: number | null;
  peerScore: number | null;
  teacherScore: number | null;
  finalScore: number;
  overvaluationIndex: number | null;
  criteriaScores: Record<string, number>;
}

export class ConsolidationService {

  /**
   * Calcular puntaje ponderado de una evaluación
   * Usa los pesos de los criterios de la rúbrica
   */
  private async calcEvaluationScore(
    evaluationId: string,
    criteriaWithWeights: { id: string; weight: number }[]
  ): Promise<number | null> {
    const scores = await prisma.evaluationScore.findMany({
      where: { evaluationId }
    });

    if (scores.length === 0) return null;

    const totalWeight = criteriaWithWeights.reduce((s, c) => s + c.weight, 0);
    if (totalWeight === 0) return null;

    let weighted = 0;
    for (const score of scores) {
      const criterion = criteriaWithWeights.find((c) => c.id === score.criteriaId);
      if (criterion) {
        weighted += score.score * (criterion.weight / totalWeight);
      }
    }

    return Math.round(weighted * 100) / 100;
  }

  /**
   * Consolidar resultados de un estudiante en un proceso
   */
  async consolidateStudent(
    processId: string,
    studentId: string
  ): Promise<ConsolidationResult> {
    // Obtener proceso con configuración de pesos
    const process = await prisma.evaluationProcess.findUnique({
      where: { id: processId },
      include: {
        selfRubric: { include: { criteria: { where: { isActive: true } } } },
        peerRubric: { include: { criteria: { where: { isActive: true } } } },
        teacherRubric: { include: { criteria: { where: { isActive: true } } } },
      }
    });

    if (!process) throw new AppError('Proceso no encontrado', 404);

    // Obtener evaluaciones completadas del estudiante
    const evaluations = await prisma.evaluation.findMany({
      where: {
        processId,
        evaluatedId: studentId,
        status: EvaluationStatus.COMPLETED
      },
      include: { scores: true }
    });

    // Calcular puntajes por tipo
    const selfEval = evaluations.find((e) => e.type === EvaluationType.SELF);
    const peerEvals = evaluations.filter((e) => e.type === EvaluationType.PEER);
    const teacherEval = evaluations.find((e) => e.type === EvaluationType.TEACHER);

    const selfCriteria = (getRubricForEvaluationType(process, EvaluationType.SELF)?.criteria ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      weight: c.weight
    }));
    const peerCriteria = (getRubricForEvaluationType(process, EvaluationType.PEER)?.criteria ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      weight: c.weight
    }));
    const teacherCriteria = (getRubricForEvaluationType(process, EvaluationType.TEACHER)?.criteria ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      weight: c.weight
    }));

    const selfScore = selfEval
      ? await this.calcEvaluationScore(selfEval.id, selfCriteria)
      : null;

    const peerScores = await Promise.all(
      peerEvals.map((e) => this.calcEvaluationScore(e.id, peerCriteria))
    );
    const validPeerScores = peerScores.filter((s): s is number => s !== null);
    const peerScore = validPeerScores.length > 0
      ? Math.round(validPeerScores.reduce((a, b) => a + b, 0) / validPeerScores.length * 100) / 100
      : null;

    const teacherScore = teacherEval
      ? await this.calcEvaluationScore(teacherEval.id, teacherCriteria)
      : null;

    // Calcular puntaje final ponderado
    let finalScore = 0;
    let totalUsedWeight = 0;

    if (selfScore !== null && process.includeSelf) {
      finalScore += selfScore * process.selfWeight;
      totalUsedWeight += process.selfWeight;
    }
    if (peerScore !== null && process.includePeer) {
      finalScore += peerScore * process.peerWeight;
      totalUsedWeight += process.peerWeight;
    }
    if (teacherScore !== null && process.includeTeacher) {
      finalScore += teacherScore * process.teacherWeight;
      totalUsedWeight += process.teacherWeight;
    }

    // Normalizar si no se completaron todos los tipos
    if (totalUsedWeight > 0 && totalUsedWeight < 1) {
      finalScore = finalScore / totalUsedWeight;
    }

    finalScore = Math.round(finalScore * 100) / 100;

    // Índice de sobrevaloración (autoevaluación - coevaluación)
    const overvaluationIndex =
      selfScore !== null && peerScore !== null
        ? Math.round((selfScore - peerScore) * 100) / 100
        : null;

    // Calcular scores por criterio (promedio de todas las evaluaciones)
    const criteriaScores: Record<string, number> = {};
    for (const criterion of getAllProcessCriteria(process)) {
      const allScores = evaluations
        .flatMap((e) => e.scores)
        .filter((s) => s.criteriaId === criterion.id)
        .map((s) => s.score);
      criteriaScores[criterion.id] = allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length * 100) / 100
        : 0;
    }

    // Buscar equipo del estudiante en el proceso
    const teamMembership = await prisma.teamMember.findFirst({
      where: {
        userId: studentId,
        isActive: true,
        team: { group: { course: { evaluationProcesses: { some: { id: processId } } } } }
      },
      select: { teamId: true }
    });

    // Guardar/actualizar resultado consolidado
    await prisma.consolidatedResult.upsert({
      where: { processId_studentId: { processId, studentId } },
      create: {
        processId,
        studentId,
        teamId: teamMembership?.teamId,
        selfScore,
        peerScore,
        teacherScore,
        finalScore,
        overvaluationIndex,
        criteriaScores
      },
      update: {
        selfScore,
        peerScore,
        teacherScore,
        finalScore,
        overvaluationIndex,
        criteriaScores,
        calculatedAt: new Date()
      }
    });

    return {
      studentId,
      selfScore,
      peerScore,
      teacherScore,
      finalScore,
      overvaluationIndex,
      criteriaScores
    };
  }

  /**
   * Consolidar todos los estudiantes de un proceso
   */
  async consolidateProcess(processId: string): Promise<ConsolidationResult[]> {
    // Obtener todos los estudiantes evaluados en el proceso
    const evaluatedStudents = await prisma.evaluation.findMany({
      where: { processId, status: EvaluationStatus.COMPLETED },
      select: { evaluatedId: true },
      distinct: ['evaluatedId']
    });

    const results: ConsolidationResult[] = [];
    for (const { evaluatedId } of evaluatedStudents) {
      const result = await this.consolidateStudent(processId, evaluatedId);
      results.push(result);
    }

    return results;
  }

  /**
   * Obtener resultados consolidados de un proceso
   */
  async getProcessResults(processId: string) {
    const results = await prisma.consolidatedResult.findMany({
      where: { processId },
      include: {
        team: { select: { name: true } }
      }
    });

    // Enriquecer con información del estudiante
    const enriched = await Promise.all(
      results.map(async (r) => {
        const student = await prisma.user.findUnique({
          where: { id: r.studentId },
          select: { firstName: true, lastName: true, email: true }
        });
        return {
          ...r,
          criteriaScores: r.criteriaScores ?? null,
          student: student ? {
            name: `${student.firstName} ${student.lastName}`,
            email: student.email
          } : null
        };
      })
    );

    return enriched;
  }
}

export const consolidationService = new ConsolidationService();
