/**
 * Servicio de Analítica Avanzada de Trabajo en Equipo
 *
 * Calcula métricas estadísticas individuales, de equipo, de curso e institucionales:
 * - Media, mediana, varianza, desviación estándar
 * - Percentiles (25, 75, 90)
 * - Índice de sobrevaloración
 * - Cohesión del equipo
 * - Detección de outliers (método IQR)
 * - Distribución de resultados
 * - Criterios más débiles
 */

import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { getAllProcessCriteria, getRubricForEvaluationType } from '../utils/rubricAssignment';

export interface IndividualAnalytics {
  studentId: string;
  studentName: string;
  overallAverage: number;
  selfScore: number | null;
  peerScore: number | null;
  teacherScore: number | null;
  finalScore: number | null;
  criteriaAverages: Record<string, number>;
  selfVsPeerDifference: number | null;
  selfVsTeacherDifference: number | null;
  overvaluationIndex: number | null; // autoevaluación - coevaluación
}

export interface TeamAnalyticsResult {
  teamId: string;
  teamName: string;
  averageScore: number;
  standardDeviation: number;
  cohesionIndex: number;  // 1 - (sd / mean) cuando mean > 0
  minScore: number;
  maxScore: number;
  outliers: string[];     // IDs de estudiantes outliers
  criteriaAverages: Record<string, number>;
}

export interface CourseAnalyticsResult {
  processId: string;
  courseId: string;
  courseName: string;
  totalStudents: number;
  completionRate: number;
  mean: number;
  median: number;
  variance: number;
  standardDeviation: number;
  percentile25: number;
  percentile75: number;
  percentile90: number;
  scoreDistribution: Record<string, number>; // rangos: '0-2', '2-4', etc.
  criteriaAverages: Record<string, { name: string; average: number; weight: number }>;
  weakestCriteria: string[];
}

export class AnalyticsService {

  // ============================================================
  // MÉTRICAS ESTADÍSTICAS BÁSICAS
  // ============================================================

  /** Calcular media aritmética */
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /** Calcular mediana */
  private median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /** Calcular varianza poblacional */
  private variance(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = this.mean(values);
    return this.mean(values.map((v) => Math.pow(v - avg, 2)));
  }

  /** Calcular desviación estándar */
  private stdDev(values: number[]): number {
    return Math.sqrt(this.variance(values));
  }

  /** Calcular percentil usando interpolación lineal */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower]);
  }

  /** Detectar outliers usando método IQR */
  private detectOutliers(values: number[], ids: string[]): string[] {
    const q1 = this.percentile(values, 25);
    const q3 = this.percentile(values, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return ids.filter((_, i) => values[i] < lowerBound || values[i] > upperBound);
  }

  // ============================================================
  // ANALÍTICA INDIVIDUAL
  // ============================================================

  async getIndividualAnalytics(
    processId: string,
    studentId: string
  ): Promise<IndividualAnalytics> {
    // Obtener proceso con rúbrica
    const process = await prisma.evaluationProcess.findUnique({
      where: { id: processId },
      include: {
        selfRubric: { include: { criteria: true } },
        peerRubric: { include: { criteria: true } },
        teacherRubric: { include: { criteria: true } },
      }
    });
    if (!process) throw new AppError('Proceso no encontrado', 404);

    // Obtener evaluaciones del estudiante
    const evaluations = await prisma.evaluation.findMany({
      where: { processId, evaluatedId: studentId, status: 'COMPLETED' },
      include: {
        scores: { include: { criteria: true } },
        evaluator: { select: { firstName: true, lastName: true, role: true } }
      }
    });

    // Agrupar por tipo
    const selfEval = evaluations.find((e) => e.type === 'SELF');
    const peerEvals = evaluations.filter((e) => e.type === 'PEER');
    const teacherEval = evaluations.find((e) => e.type === 'TEACHER');

    // Calcular puntajes ponderados
    const calcWeightedScore = (eval_: typeof evaluations[0] | undefined): number | null => {
      if (!eval_ || eval_.scores.length === 0) return null;
      const rubric = getRubricForEvaluationType(process, eval_.type);
      if (!rubric) return null;
      const totalWeight = rubric.criteria.reduce((s, c) => s + c.weight, 0);
      let weighted = 0;
      for (const score of eval_.scores) {
        const criterion = rubric.criteria.find((c) => c.id === score.criteriaId);
        if (criterion) weighted += score.score * (criterion.weight / totalWeight);
      }
      return Math.round(weighted * 100) / 100;
    };

    const selfScore = calcWeightedScore(selfEval);
    const peerScores = peerEvals.map((e) => calcWeightedScore(e)).filter((s): s is number => s !== null);
    const peerScore = peerScores.length > 0 ? Math.round(this.mean(peerScores) * 100) / 100 : null;
    const teacherScore = calcWeightedScore(teacherEval);

    // Puntaje final ponderado
    let finalScore: number | null = null;
    const weights: { score: number; weight: number }[] = [];
    if (selfScore !== null && process.includeSelf) weights.push({ score: selfScore, weight: process.selfWeight });
    if (peerScore !== null && process.includePeer) weights.push({ score: peerScore, weight: process.peerWeight });
    if (teacherScore !== null && process.includeTeacher) weights.push({ score: teacherScore, weight: process.teacherWeight });

    if (weights.length > 0) {
      const totalW = weights.reduce((s, w) => s + w.weight, 0);
      finalScore = Math.round(
        weights.reduce((s, w) => s + w.score * (w.weight / totalW), 0) * 100
      ) / 100;
    }

    // Promedios por criterio (todas las evaluaciones)
    const criteriaAverages: Record<string, number> = {};
    for (const criterion of getAllProcessCriteria(process)) {
      const allScores = evaluations
        .flatMap((e) => e.scores)
        .filter((s) => s.criteriaId === criterion.id)
        .map((s) => s.score);
      criteriaAverages[criterion.name] = allScores.length > 0
        ? Math.round(this.mean(allScores) * 100) / 100
        : 0;
    }

    // Índice de sobrevaloración
    const overvaluationIndex =
      selfScore !== null && peerScore !== null
        ? Math.round((selfScore - peerScore) * 100) / 100
        : null;

    // Nombre del estudiante
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { firstName: true, lastName: true }
    });

    return {
      studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Desconocido',
      overallAverage: finalScore ?? 0,
      selfScore,
      peerScore,
      teacherScore,
      finalScore,
      criteriaAverages,
      selfVsPeerDifference: selfScore !== null && peerScore !== null ? selfScore - peerScore : null,
      selfVsTeacherDifference: selfScore !== null && teacherScore !== null ? selfScore - teacherScore : null,
      overvaluationIndex
    };
  }

  // ============================================================
  // ANALÍTICA DE EQUIPO
  // ============================================================

  async getTeamAnalytics(
    processId: string,
    teamId: string
  ): Promise<TeamAnalyticsResult> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { where: { isActive: true } } }
    });
    if (!team) throw new AppError('Equipo no encontrado', 404);

    const process = await prisma.evaluationProcess.findUnique({
      where: { id: processId },
      include: {
        selfRubric: { include: { criteria: true } },
        peerRubric: { include: { criteria: true } },
        teacherRubric: { include: { criteria: true } },
      }
    });
    if (!process) throw new AppError('Proceso no encontrado', 404);

    const memberIds = team.members.map((m) => m.userId);
    const memberAnalytics = await Promise.all(
      memberIds.map((id) => this.getIndividualAnalytics(processId, id))
    );

    const finalScores = memberAnalytics
      .map((a) => a.finalScore)
      .filter((s): s is number => s !== null);

    const averageScore = Math.round(this.mean(finalScores) * 100) / 100;
    const standardDeviation = Math.round(this.stdDev(finalScores) * 100) / 100;
    const cohesionIndex = averageScore > 0
      ? Math.round((1 - standardDeviation / averageScore) * 100) / 100
      : 0;

    const outlierIds = this.detectOutliers(finalScores, memberIds);

    // Promedios por criterio del equipo
    const criteriaAverages: Record<string, number> = {};
    for (const criterion of getAllProcessCriteria(process)) {
      const vals = memberAnalytics.map((a) => a.criteriaAverages[criterion.name] ?? 0);
      criteriaAverages[criterion.name] = Math.round(this.mean(vals) * 100) / 100;
    }

    // Guardar en BD
    await prisma.teamAnalytics.upsert({
      where: { processId_teamId: { processId, teamId } },
      create: {
        processId, teamId, averageScore, standardDeviation,
        cohesionIndex,
        minScore: finalScores.length > 0 ? Math.min(...finalScores) : null,
        maxScore: finalScores.length > 0 ? Math.max(...finalScores) : null,
        outlierStudentIds: JSON.stringify(outlierIds),
        criteriaAverages: JSON.stringify(criteriaAverages)
      },
      update: {
        averageScore, standardDeviation, cohesionIndex,
        minScore: finalScores.length > 0 ? Math.min(...finalScores) : null,
        maxScore: finalScores.length > 0 ? Math.max(...finalScores) : null,
        outlierStudentIds: JSON.stringify(outlierIds),
        criteriaAverages: JSON.stringify(criteriaAverages),
        calculatedAt: new Date()
      }
    });

    return {
      teamId,
      teamName: team.name,
      averageScore,
      standardDeviation,
      cohesionIndex,
      minScore: finalScores.length > 0 ? Math.min(...finalScores) : 0,
      maxScore: finalScores.length > 0 ? Math.max(...finalScores) : 0,
      outliers: outlierIds,
      criteriaAverages
    };
  }

  // ============================================================
  // ANALÍTICA DEL CURSO
  // ============================================================

  async getCourseAnalytics(processId: string): Promise<CourseAnalyticsResult> {
    const process = await prisma.evaluationProcess.findUnique({
      where: { id: processId },
      include: {
        course: { select: { id: true, name: true } },
        selfRubric: { include: { criteria: true } },
        peerRubric: { include: { criteria: true } },
        teacherRubric: { include: { criteria: true } },
      }
    });
    if (!process) throw new AppError('Proceso no encontrado', 404);

    // Obtener todos los resultados consolidados del proceso
    const results = await prisma.consolidatedResult.findMany({
      where: { processId },
      select: {
        studentId: true,
        finalScore: true,
        criteriaScores: true
      }
    });

    const allFinalScores = results
      .map((r) => r.finalScore)
      .filter((s): s is number => s !== null);

    // Estadísticas generales
    const mean = Math.round(this.mean(allFinalScores) * 100) / 100;
    const median = Math.round(this.median(allFinalScores) * 100) / 100;
    const variance = Math.round(this.variance(allFinalScores) * 100) / 100;
    const standardDeviation = Math.round(this.stdDev(allFinalScores) * 100) / 100;
    const percentile25 = Math.round(this.percentile(allFinalScores, 25) * 100) / 100;
    const percentile75 = Math.round(this.percentile(allFinalScores, 75) * 100) / 100;
    const percentile90 = Math.round(this.percentile(allFinalScores, 90) * 100) / 100;

    // Distribución de puntajes (histograma)
    const distribution: Record<string, number> = {
      '0.0-2.0': 0, '2.0-3.0': 0, '3.0-3.5': 0,
      '3.5-4.0': 0, '4.0-4.5': 0, '4.5-5.0': 0
    };
    for (const score of allFinalScores) {
      if (score < 2) distribution['0.0-2.0']++;
      else if (score < 3) distribution['2.0-3.0']++;
      else if (score < 3.5) distribution['3.0-3.5']++;
      else if (score < 4) distribution['3.5-4.0']++;
      else if (score < 4.5) distribution['4.0-4.5']++;
      else distribution['4.5-5.0']++;
    }

    // Promedios por criterio
    const criteriaAverages: Record<string, { name: string; average: number; weight: number }> = {};
    for (const criterion of getAllProcessCriteria(process)) {
      const vals = results
        .map((r) => {
          const cs = r.criteriaScores ? JSON.parse(r.criteriaScores) as Record<string, number> : null;
          return cs ? cs[criterion.id] : null;
        })
        .filter((v): v is number => v !== null);
      criteriaAverages[criterion.id] = {
        name: criterion.name,
        average: Math.round(this.mean(vals) * 100) / 100,
        weight: criterion.weight
      };
    }

    // Criterios más débiles (promedio más bajo)
    const sortedCriteria = Object.entries(criteriaAverages)
      .sort((a, b) => a[1].average - b[1].average)
      .slice(0, 3)
      .map(([id]) => id);

    // Tasa de completitud
    const totalAssigned = await prisma.evaluation.count({ where: { processId } });
    const totalCompleted = await prisma.evaluation.count({
      where: { processId, status: 'COMPLETED' }
    });
    const completionRate = totalAssigned > 0
      ? Math.round((totalCompleted / totalAssigned) * 100) / 100
      : 0;

    // Guardar en BD
    await prisma.courseAnalytics.upsert({
      where: { processId },
      create: {
        processId,
        courseId: process.course.id,
        totalStudents: results.length,
        completionRate,
        averageScore: mean,
        medianScore: median,
        standardDeviation,
        variance,
        percentile25,
        percentile75,
        percentile90,
        weakestCriteria: JSON.stringify(sortedCriteria),
        scoreDistribution: JSON.stringify(distribution),
        criteriaAverages: JSON.stringify(criteriaAverages)
      },
      update: {
        totalStudents: results.length,
        completionRate, averageScore: mean, medianScore: median,
        standardDeviation, variance,
        percentile25, percentile75, percentile90,
        weakestCriteria: JSON.stringify(sortedCriteria),
        scoreDistribution: JSON.stringify(distribution),
        criteriaAverages: JSON.stringify(criteriaAverages),
        calculatedAt: new Date()
      }
    });

    return {
      processId,
      courseId: process.course.id,
      courseName: process.course.name,
      totalStudents: results.length,
      completionRate,
      mean, median, variance, standardDeviation,
      percentile25, percentile75, percentile90,
      scoreDistribution: distribution,
      criteriaAverages,
      weakestCriteria: sortedCriteria
    };
  }

  // ============================================================
  // ANALÍTICA INSTITUCIONAL
  // ============================================================

  async getInstitutionalAnalytics(institutionId: string, periodId?: string) {
    // Comparación entre cursos
    const analytics = await prisma.courseAnalytics.findMany();

    // Comparación entre docentes
    const courses = await prisma.course.findMany({
      where: {
        institutionId,
        ...(periodId && { periodId }),
        isActive: true
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        evaluationProcesses: {
          include: { _count: { select: { evaluations: true, results: true } } }
        }
      }
    });

    // Evolución por período
    const periods = await prisma.academicPeriod.findMany({
      orderBy: { startDate: 'asc' }
    });

    const evolutionData = await Promise.all(
      periods.map(async (period) => {
        const periodCourses = await prisma.course.findMany({
          where: { institutionId, periodId: period.id },
      include: { evaluationProcesses: true }
        });

        const processIds = periodCourses
          .flatMap((c) => c.evaluationProcesses)
          .map((p) => p.id);

        if (processIds.length === 0) return { period: period.name, average: null };

        const results = await prisma.consolidatedResult.findMany({
          where: { processId: { in: processIds } },
          select: { finalScore: true }
        });

        const scores = results
          .map((r) => r.finalScore)
          .filter((s): s is number => s !== null);

        return {
          period: period.name,
          periodCode: period.code,
          average: scores.length > 0 ? this.mean(scores) : null,
          totalStudents: scores.length
        };
      })
    );

    return {
      institutionId,
      courseComparison: courses.map((c) => ({
        courseId: c.id,
        courseName: c.name,
        teacher: `${c.teacher.firstName} ${c.teacher.lastName}`,
        processes: c.evaluationProcesses.length
      })),
      evolution: evolutionData.filter((d) => d.average !== null),
      totalCourses: courses.length
    };
  }
}

export const analyticsService = new AnalyticsService();
