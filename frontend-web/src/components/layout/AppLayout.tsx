import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Users, BookOpen, FileText,
  ClipboardList, BarChart3, GraduationCap, LogOut, Menu, X,
  ChevronRight, Bell, Shield, CheckCircle2
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/services/api'
import { cn, getRoleName, getRoleColor, toTitleCase } from '@/lib/utils'

type Role = 'ADMIN' | 'TEACHER' | 'STUDENT'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
}

interface NotificationItem {
  title: string
  description: string
  href: string
  icon: React.ElementType
  tone: 'blue' | 'green' | 'amber'
}

const navItems: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'Usuarios', icon: Users, href: '/admin/users' },
    { label: 'Historial', icon: Shield, href: '/admin/audit' },
  ],
  TEACHER: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/teacher' },
    { label: 'Mis Cursos', icon: BookOpen, href: '/teacher/courses' },
    { label: 'Rúbricas', icon: FileText, href: '/teacher/rubrics' },
    { label: 'Procesos', icon: ClipboardList, href: '/teacher/evaluations' },
    { label: 'Evaluar Estudiantes', icon: BarChart3, href: '/teacher/pending' },
  ],
  STUDENT: [
    { label: 'Inicio', icon: LayoutDashboard, href: '/student' },
    { label: 'Mis Evaluaciones', icon: ClipboardList, href: '/student/evaluations' },
    { label: 'Mis Resultados', icon: BarChart3, href: '/student/results' },
  ],
}

const notificationTone = {
  ADMIN: 'blue',
  TEACHER: 'amber',
  STUDENT: 'green',
} as const

function getNotificationItems(role: Role): NotificationItem[] {
  if (role === 'ADMIN') {
    return [
      {
        title: 'Usuarios y accesos',
        description: 'Crea estudiantes y revisa estados activos.',
        href: '/admin/users',
        icon: Users,
        tone: notificationTone.ADMIN,
      },
      {
        title: 'Historial de cambios',
        description: 'Consulta la auditoría de acciones recientes.',
        href: '/admin/audit',
        icon: Shield,
        tone: 'green',
      },
      {
        title: 'Procesos de evaluación',
        description: 'Gestiona tus procesos como docente del curso.',
        href: '/teacher/evaluations',
        icon: ClipboardList,
        tone: 'amber',
      },
      {
        title: 'Evaluar estudiantes',
        description: 'Completa evaluaciones docentes pendientes.',
        href: '/teacher/pending',
        icon: BarChart3,
        tone: 'blue',
      },
    ]
  }

  if (role === 'TEACHER') {
    return [
      {
        title: 'Procesos de evaluación',
        description: 'Verifica borradores, procesos activos y cierres.',
        href: '/teacher/evaluations',
        icon: ClipboardList,
        tone: notificationTone.TEACHER,
      },
      {
        title: 'Evaluar estudiantes',
        description: 'Completa evaluaciones docentes pendientes.',
        href: '/teacher/pending',
        icon: BarChart3,
        tone: 'blue',
      },
      {
        title: 'Rúbricas disponibles',
        description: 'Confirma que cada curso tenga instrumentos asociados.',
        href: '/teacher/rubrics',
        icon: FileText,
        tone: 'green',
      },
    ]
  }

  return [
    {
      title: 'Evaluaciones pendientes',
      description: 'Completa autoevaluaciones y evaluaciones de compañeros.',
      href: '/student/evaluations',
      icon: ClipboardList,
      tone: notificationTone.STUDENT,
    },
    {
      title: 'Resultados publicados',
      description: 'Consulta tus puntajes consolidados cuando el proceso cierre.',
      href: '/student/results',
      icon: CheckCircle2,
      tone: 'blue',
    },
  ]
}

interface AppLayoutProps {
  role: Role
}

export function AppLayout({ role }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  // El admin también es docente: le mostramos ambos conjuntos de items
  // (gestión de usuarios/institución + cursos/rúbricas/evaluaciones).
  const items =
    user?.role === 'ADMIN'
      ? [...navItems.ADMIN, ...navItems.TEACHER]
      : navItems[role]
  const currentItem =
    items
      .filter((item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0] ?? items[0]
  const notificationItems = getNotificationItems(user?.role ?? role)

  useEffect(() => {
    setNotificationsOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      try { await authApi.logout(refreshToken) } catch { /* ignore */ }
    }
    logout()
    navigate('/login')
  }

  const openNotification = (href: string) => {
    setNotificationsOpen(false)
    navigate(href)
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn(
      'flex h-full flex-col border-r border-gray-200 bg-white/95 shadow-xl shadow-gray-950/5 backdrop-blur supports-[backdrop-filter]:bg-white/90 lg:shadow-none',
      mobile ? 'w-72' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/20">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none tracking-tight text-gray-950">TeamEval</p>
          <p className="mt-1 text-xs text-gray-500">Evaluación académica</p>
        </div>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Cerrar navegación"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {getRoleName(user?.role ?? role)}
        </p>
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href.split('/').length === 2}
            onClick={() => mobile && setSidebarOpen(false)}
            className={({ isActive }) => cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive
                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                : 'text-gray-600 hover:bg-sky-50 hover:text-gray-950'
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary')} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-white/70" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 px-3 py-3">
        <div className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-100">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <span className="text-xs font-bold text-primary">
              {user?.firstName ? toTitleCase(user.firstName)[0] : ''}{user?.lastName ? toTitleCase(user.lastName)[0] : ''}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName ? toTitleCase(user.firstName) : ''} {user?.lastName ? toTitleCase(user.lastName) : ''}
            </p>
            <span className={cn('inline-flex text-xs px-1.5 py-0.5 rounded font-medium', getRoleColor(user?.role ?? ''))}>
              {getRoleName(user?.role ?? '')}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.08),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)]">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-gray-950/45 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 shadow-sm shadow-gray-950/[0.02] backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            aria-label="Abrir navegación"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-none text-gray-950">{currentItem?.label}</p>
            <p className="mt-1 hidden text-xs text-gray-400 sm:block">
              TeamEval / {getRoleName(user?.role ?? role)} / {currentItem?.label}
            </p>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((current) => !current)}
              className="relative rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Notificaciones"
              aria-expanded={notificationsOpen}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
            </button>

            {notificationsOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  aria-label="Cerrar notificaciones"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="fixed right-4 top-16 z-50 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-950/15 sm:right-6 lg:right-7">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-950">Notificaciones</p>
                    <p className="mt-0.5 text-xs text-gray-500">Actividad y tareas de tu rol</p>
                  </div>
                  <div className="max-h-[min(22rem,calc(100vh-7rem))] overflow-y-auto p-2">
                    {notificationItems.map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => openNotification(item.href)}
                        className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-gray-50"
                      >
                        <span className={cn(
                          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                          item.tone === 'green' && 'bg-emerald-50 text-emerald-700',
                          item.tone === 'amber' && 'bg-amber-50 text-amber-700',
                          item.tone === 'blue' && 'bg-sky-50 text-sky-700'
                        )}>
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-gray-900">{item.title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-gray-500">{item.description}</span>
                        </span>
                        <ChevronRight className="mt-2 h-4 w-4 text-gray-300" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/10">
              <span className="text-xs font-bold text-primary">
                {user?.firstName ? toTitleCase(user.firstName)[0] : ''}{user?.lastName ? toTitleCase(user.lastName)[0] : ''}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {user?.firstName ? toTitleCase(user.firstName) : ''} {user?.lastName ? toTitleCase(user.lastName) : ''}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-40">{user?.email}</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
