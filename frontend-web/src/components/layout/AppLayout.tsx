import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Building2, BookOpen, FileText,
  ClipboardList, BarChart3, GraduationCap, LogOut, Menu, X,
  ChevronRight, Bell
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/services/api'
import { cn, getRoleName, getRoleColor } from '@/lib/utils'

type Role = 'ADMIN' | 'TEACHER' | 'STUDENT'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
}

const navItems: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { label: 'Usuarios', icon: Users, href: '/admin/users' },
    { label: 'Instituciones', icon: Building2, href: '/admin/institutions' },
  ],
  TEACHER: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/teacher' },
    { label: 'Mis Cursos', icon: BookOpen, href: '/teacher/courses' },
    { label: 'Rúbricas', icon: FileText, href: '/teacher/rubrics' },
    { label: 'Evaluaciones', icon: ClipboardList, href: '/teacher/evaluations' },
  ],
  STUDENT: [
    { label: 'Inicio', icon: LayoutDashboard, href: '/student' },
    { label: 'Mis Evaluaciones', icon: ClipboardList, href: '/student/evaluations' },
    { label: 'Mis Resultados', icon: BarChart3, href: '/student/results' },
  ],
}

interface AppLayoutProps {
  role: Role
}

export function AppLayout({ role }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const items = navItems[role]

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      try { await authApi.logout(refreshToken) } catch { /* ignore */ }
    }
    logout()
    navigate('/login')
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn(
      'flex flex-col h-full bg-white border-r border-gray-200',
      mobile ? 'w-72' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm leading-none">TeamEval</p>
          <p className="text-xs text-gray-400 mt-0.5">Evaluación de Equipos</p>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href.split('/').length === 2}
            onClick={() => mobile && setSidebarOpen(false)}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600')} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary/60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <span className={cn('inline-flex text-xs px-1.5 py-0.5 rounded font-medium', getRoleColor(user?.role ?? ''))}>
              {getRoleName(user?.role ?? '')}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 relative">
            <Bell className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-40">{user?.email}</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
