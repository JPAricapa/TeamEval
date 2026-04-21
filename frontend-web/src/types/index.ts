// ── Auth ──────────────────────────────────────────────────────────────────────
export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  nationalId?: string | null
  role: Role
  institutionId?: string
  institution?: Institution
  groupName?: string | null
  teamName?: string | null
  courseName?: string | null
  courseCode?: string | null
  isActive: boolean
  createdAt: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

// ── Institution ───────────────────────────────────────────────────────────────
export interface Institution {
  id: string
  name: string
  code: string
  city: string
  country: string
  isActive: boolean
}

// ── Academic ──────────────────────────────────────────────────────────────────
export interface AcademicPeriod {
  id: string
  name: string
  code?: string
  startDate: string
  endDate: string
  isActive: boolean
  institutionId: string
}

export interface Program {
  id: string
  name: string
  code: string
  department?: string
  institutionId: string
  isActive?: boolean
}

export interface Course {
  id: string
  name: string
  code: string
  credits: number
  semester: number
  teacherId: string
  teacher?: User
  periodId: string
  period?: AcademicPeriod
  programId: string
  isActive: boolean
  studentCount?: number
}

export interface Group {
  id: string
  name: string
  courseId: string
  course?: Course
  members?: User[]
}

export interface Team {
  id: string
  name: string
  groupId: string
  members?: User[]
}

// ── Rubric ────────────────────────────────────────────────────────────────────
export interface PerformanceLevel {
  id: string
  name: string
  score: number
  description: string
  color?: string
}

export interface RubricCriteria {
  id: string
  name: string
  description: string
  weight: number
  maxScore: number
  rubricId: string
  levels: PerformanceLevel[]
}

export interface Rubric {
  id: string
  name: string
  description: string
  version: number
  isActive: boolean
  isTemplate: boolean
  createdAt: string
  criteria: RubricCriteria[]
}

// ── Evaluation ────────────────────────────────────────────────────────────────
export type EvalProcessStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED'
export type EvalType = 'SELF' | 'PEER' | 'TEACHER' | 'EXTERNAL'
export type EvalStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export interface EvaluationProcess {
  id: string
  name: string
  description: string
  status: EvalProcessStatus
  selfWeight: number
  peerWeight: number
  teacherWeight: number
  courseId: string
  course?: Course
  rubricId?: string
  legacyRubric?: Rubric
  selfRubricId?: string
  peerRubricId?: string
  teacherRubricId?: string
  selfRubric?: Rubric
  peerRubric?: Rubric
  teacherRubric?: Rubric
  rubric?: Rubric
  startDate?: string
  endDate?: string
  createdAt: string
  totalCount?: number
  completedCount?: number
  groupCount?: number
  studentCount?: number
}

export interface EvaluationScore {
  criteriaId: string
  score: number
  comment?: string
}

export interface Evaluation {
  id: string
  type: EvalType
  status: EvalStatus
  evaluatorId: string
  evaluateeId: string
  evaluatee?: User
  evaluated?: Pick<User, 'firstName' | 'lastName'>
  processId: string
  process?: EvaluationProcess
  scores?: EvaluationScore[]
  finalScore?: number
  submittedAt?: string
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export interface DescriptiveStats {
  mean: number
  median: number
  variance: number
  stdDev: number
  min: number
  max: number
  p25: number
  p75: number
  p90: number
  count: number
}

export interface ConsolidatedResult {
  id: string
  studentId: string
  student?: User
  processId: string
  teamId: string
  selfScore?: number
  peerScore?: number
  teacherScore?: number
  finalScore: number
  overvaluationIndex?: number
  isOutlier: boolean
}

export interface TeamAnalytics {
  teamId: string
  teamName?: string
  stats: DescriptiveStats
  cohesionIndex: number
  outlierCount: number
  memberResults?: ConsolidatedResult[]
}

export interface CourseAnalytics {
  processId: string
  stats: DescriptiveStats
  teamCount: number
  studentCount: number
  completionRate: number
  histogram: { range: string; count: number }[]
  criteriaStats: { criteriaName: string; mean: number; stdDev: number }[]
}

// ── API Response ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
