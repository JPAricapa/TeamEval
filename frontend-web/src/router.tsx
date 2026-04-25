import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layouts
import { AppLayout } from '@/components/layout/AppLayout'

// Auth
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const AcceptInvitationPage = lazy(() => import('@/pages/auth/AcceptInvitationPage').then((m) => ({ default: m.AcceptInvitationPage })))

// Admin
const UsersPage = lazy(() => import('@/pages/admin/UsersPage').then((m) => ({ default: m.UsersPage })))
const AuditPage = lazy(() => import('@/pages/admin/AuditPage').then((m) => ({ default: m.AuditPage })))

// Teacher
const TeacherDashboard = lazy(() => import('@/pages/teacher/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard })))
const CoursesPage = lazy(() => import('@/pages/teacher/CoursesPage').then((m) => ({ default: m.CoursesPage })))
const CourseDetailPage = lazy(() => import('@/pages/teacher/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage })))
const RubricsPage = lazy(() => import('@/pages/teacher/RubricsPage').then((m) => ({ default: m.RubricsPage })))
const EvaluationProcessesPage = lazy(() => import('@/pages/teacher/EvaluationProcessesPage').then((m) => ({ default: m.EvaluationProcessesPage })))
const ProcessDetailPage = lazy(() => import('@/pages/teacher/ProcessDetailPage').then((m) => ({ default: m.ProcessDetailPage })))
const AnalyticsPage = lazy(() => import('@/pages/teacher/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const TeacherPendingPage = lazy(() => import('@/pages/teacher/TeacherPendingPage').then((m) => ({ default: m.TeacherPendingPage })))

// Student
const StudentDashboard = lazy(() => import('@/pages/student/StudentDashboard').then((m) => ({ default: m.StudentDashboard })))
const MyEvaluationsPage = lazy(() => import('@/pages/student/MyEvaluationsPage').then((m) => ({ default: m.MyEvaluationsPage })))
const EvaluationFormPage = lazy(() => import('@/pages/student/EvaluationFormPage').then((m) => ({ default: m.EvaluationFormPage })))
const MyResultsPage = lazy(() => import('@/pages/student/MyResultsPage').then((m) => ({ default: m.MyResultsPage })))

function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
      Cargando...
    </div>
  )
}

function withSuspense(children: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

function RequireAuth({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }
  return <>{children}</>
}

function RoleRedirect() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'ADMIN') return <Navigate to="/admin/users" replace />
  if (user.role === 'TEACHER') return <Navigate to="/teacher" replace />
  return <Navigate to="/student" replace />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RoleRedirect />,
  },
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
  },
  {
    path: '/accept-invitation',
    element: withSuspense(<AcceptInvitationPage />),
  },
  {
    path: '/unauthorized',
    element: (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
          <p className="text-gray-600">No tienes permiso para acceder a esta página.</p>
        </div>
      </div>
    ),
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  {
    path: '/admin',
    element: (
      <RequireAuth roles={['ADMIN']}>
        <AppLayout role="ADMIN" />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/users" replace /> },
      { path: 'users', element: withSuspense(<UsersPage />) },
      { path: 'audit', element: withSuspense(<AuditPage />) },
    ],
  },

  // ── Teacher ───────────────────────────────────────────────────────────────
  {
    path: '/teacher',
    element: (
      <RequireAuth roles={['TEACHER', 'ADMIN']}>
        <AppLayout role="TEACHER" />
      </RequireAuth>
    ),
    children: [
      { index: true, element: withSuspense(<TeacherDashboard />) },
      { path: 'courses', element: withSuspense(<CoursesPage />) },
      { path: 'courses/:courseId', element: withSuspense(<CourseDetailPage />) },
      { path: 'rubrics', element: withSuspense(<RubricsPage />) },
      { path: 'evaluations', element: withSuspense(<EvaluationProcessesPage />) },
      { path: 'evaluations/:processId', element: withSuspense(<ProcessDetailPage />) },
      { path: 'pending', element: withSuspense(<TeacherPendingPage />) },
      { path: 'evaluate/:evalId', element: withSuspense(<EvaluationFormPage />) },
      { path: 'analytics/:processId', element: withSuspense(<AnalyticsPage />) },
    ],
  },

  // ── Student ───────────────────────────────────────────────────────────────
  {
    path: '/student',
    element: (
      <RequireAuth roles={['STUDENT']}>
        <AppLayout role="STUDENT" />
      </RequireAuth>
    ),
    children: [
      { index: true, element: withSuspense(<StudentDashboard />) },
      { path: 'evaluations', element: withSuspense(<MyEvaluationsPage />) },
      { path: 'evaluations/:evalId', element: withSuspense(<EvaluationFormPage />) },
      { path: 'results', element: withSuspense(<MyResultsPage />) },
    ],
  },
])
