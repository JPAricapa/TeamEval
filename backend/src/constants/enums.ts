export const UserRole = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const EvaluationType = {
  SELF: 'SELF',
  PEER: 'PEER',
  TEACHER: 'TEACHER',
} as const;

export type EvaluationType = (typeof EvaluationType)[keyof typeof EvaluationType];

export const EvaluationStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
} as const;

export type EvaluationStatus = (typeof EvaluationStatus)[keyof typeof EvaluationStatus];

export const ProcessStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ProcessStatus = (typeof ProcessStatus)[keyof typeof ProcessStatus];
