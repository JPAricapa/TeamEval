import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layouts
import { AppLayout } from '@/components/layout/AppLayout'

// Auth
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { AcceptInvitationPage } from '@/pages/auth/AcceptInvitationPage'

// Admin
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { UsersPage } from '@/pages/admin/UsersPage'
import { InstitutionsPage } from '@/pages/admin/InstitutionsPage'

// Teacher
import { TeacherDashboard } from '@/pages/teacher/TeacherDashboard'
import { CoursesPage } from '@/pages/teacher/CoursesPage'
import { CourseDetailPage } from '@/pages/teacher/CourseDetailPage'
import { RubricsPage } from '@/pages/teacher/RubricsPage'
import { EvaluationProcessesPage } from '@/pages/teacher/EvaluationProcessesPage'
import { ProcessDetailPage } from '@/pages/teacher/ProcessDetailPage'
import { AnalyticsPage } from '@/pages/teacher/AnalyticsPage'

// Student
import { StudentDashboard } from '@/pages/student/StudentDashboard'
import { MyEvaluationsPage } from '@/pages/student/MyEvaluationsPage'
import { EvaluationFormPage } from '@/pages/student/EvaluationFormPage'
import { MyResultsPage } from '@/pages/student/MyResultsPage'

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
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
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />
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
    element: <LoginPage />,
  },
  {
    path: '/accept-invitation',
    element: <AcceptInvitationPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
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
      { index: true, element: <AdminDashboard /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'institutions', element: <InstitutionsPage /> },
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
      { index: true, element: <TeacherDashboard /> },
      { path: 'courses', element: <CoursesPage /> },
      { path: 'courses/:courseId', element: <CourseDetailPage /> },
      { path: 'rubrics', element: <RubricsPage /> },
      { path: 'evaluations', element: <EvaluationProcessesPage /> },
      { path: 'evaluations/:processId', element: <ProcessDetailPage /> },
      { path: 'analytics/:processId', element: <AnalyticsPage /> },
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
      { index: true, element: <StudentDashboard /> },
      { path: 'evaluations', element: <MyEvaluationsPage /> },
      { path: 'evaluations/:evalId', element: <EvaluationFormPage /> },
      { path: 'results', element: <MyResultsPage /> },
    ],
  },
])
