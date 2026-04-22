import { EvaluationType } from '../constants/enums';

type EvaluationTypeValue = typeof EvaluationType[keyof typeof EvaluationType];

type RubricLike = {
  id: string;
  name: string;
  criteria?: Array<{ id: string; name: string; weight: number }>;
};

type CourseRubricLike<T extends RubricLike> = {
  evaluationType?: string | null;
  rubric?: T | null;
};

type ProcessRubricsLike<T extends RubricLike> = {
  selfRubric?: T | null;
  peerRubric?: T | null;
  teacherRubric?: T | null;
};

export function inferRubricTypeFromName(name?: string | null): EvaluationTypeValue | null {
  const normalized = (name ?? '').toLowerCase();

  if (normalized.includes('auto')) return EvaluationType.SELF;
  if (normalized.includes('peer') || normalized.includes('par') || normalized.includes('coevalu')) {
    return EvaluationType.PEER;
  }
  if (normalized.includes('docente') || normalized.includes('teacher') || normalized.includes('hetero')) {
    return EvaluationType.TEACHER;
  }

  return null;
}

export function groupCourseRubricsByType<T extends RubricLike>(
  courseRubrics: Array<CourseRubricLike<T>>
) {
  const grouped: Partial<Record<EvaluationTypeValue, T>> = {};

  for (const item of courseRubrics) {
    if (!item.rubric) continue;
    const explicitType = item.evaluationType as EvaluationTypeValue | undefined;
    const inferredType = inferRubricTypeFromName(item.rubric.name);
    const type = explicitType ?? inferredType;
    if (!type || grouped[type]) continue;
    grouped[type] = item.rubric;
  }

  return {
    selfRubric: grouped[EvaluationType.SELF] ?? null,
    peerRubric: grouped[EvaluationType.PEER] ?? null,
    teacherRubric: grouped[EvaluationType.TEACHER] ?? null,
  };
}

export function getRubricForEvaluationType<T extends RubricLike>(
  process: ProcessRubricsLike<T>,
  evaluationType: string
) {
  if (evaluationType === EvaluationType.SELF) return process.selfRubric ?? null;
  if (evaluationType === EvaluationType.PEER) return process.peerRubric ?? null;
  if (evaluationType === EvaluationType.TEACHER) return process.teacherRubric ?? null;
  return null;
}

export function getAllProcessCriteria<T extends RubricLike>(process: ProcessRubricsLike<T>) {
  const criteriaMap = new Map<string, { id: string; name: string; weight: number }>();

  [process.selfRubric, process.peerRubric, process.teacherRubric]
    .filter((rubric): rubric is T => Boolean(rubric))
    .forEach((rubric) => {
      (rubric.criteria ?? []).forEach((criterion) => {
        if (!criteriaMap.has(criterion.id)) {
          criteriaMap.set(criterion.id, criterion);
        }
      });
    });

  return Array.from(criteriaMap.values());
}
