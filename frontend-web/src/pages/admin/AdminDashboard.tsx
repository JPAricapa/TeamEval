import { useEffect, useState } from 'react'
import { Users, BookOpen, ClipboardList, Activity, Loader2, MoreHorizontal } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { usersApi, coursesApi } from '@/services/api'
import type { User } from '@/types'
import { getRoleColor, getRoleName } from '@/lib/utils'
import {
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#1565C0', '#2196F3', '#64B5F6', '#BBDEFB']

export function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [courseCount, setCourseCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      usersApi.getAll({ limit: 100 }),
      coursesApi.getAll(),
    ]).then(([u, c]) => {
      setUsers(u.data.data ?? [])
      setCourseCount((c.data.data ?? []).length)
    }).catch((err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudieron cargar los datos del panel.')
    }).finally(() => setLoading(false))
  }, [])

  const roleData = [
    { name: 'Estudiantes', value: users.filter(u => u.role === 'STUDENT').length },
    { name: 'Docente', value: users.filter(u => u.role === 'ADMIN' || u.role === 'TEACHER').length },
  ]

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    setUpdatingUserId(userId)
    setError('')
    setOpenStatusMenuId(null)
    try {
      const response = await usersApi.update(userId, { isActive })
      setUsers((prev) => prev.map((user) => (
        user.id === userId ? { ...user, ...response.data.data } : user
      )))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo actualizar el estado del usuario.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-gray-500 mt-1 text-sm">Resumen general de la plataforma TeamEval</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Usuarios" value={users.length} icon={Users} color="blue"
          subtitle={`${users.filter(u => u.isActive).length} activos`} />
        <StatCard title="Cursos" value={courseCount} icon={BookOpen} color="green"
          subtitle="Registrados en la plataforma" />
        <StatCard title="Estudiantes" value={users.filter(u => u.role === 'STUDENT').length} icon={ClipboardList} color="amber"
          subtitle="Inscritos en todos los cursos" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        {/* Role distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Distribución de Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                  paddingAngle={3} dataKey="value">
                  {roleData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent users */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios Recientes</CardTitle>
          <CardDescription>Últimos usuarios registrados en la plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-500 pb-3">Usuario</th>
                  <th className="text-left font-medium text-gray-500 pb-3">Correo</th>
                  <th className="text-left font-medium text-gray-500 pb-3">Rol</th>
                  <th className="text-left font-medium text-gray-500 pb-3">Estado</th>
                  <th className="text-left font-medium text-gray-500 pb-3">Equipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.slice(0, 6).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <span className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-500">{user.email}</td>
                    <td className="py-3">
                      <span className={`inline-flex text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(user.role)}`}>
                        {getRoleName(user.role)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="relative flex items-center gap-2">
                        <span
                          className={`inline-block h-3 w-3 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}
                          title={user.isActive ? 'Activo' : 'Inactivo'}
                        />
                        <button
                          type="button"
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                          onClick={() => setOpenStatusMenuId((current) => current === user.id ? null : user.id)}
                          disabled={updatingUserId === user.id || user.role === 'ADMIN'}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                        {updatingUserId === user.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                        {openStatusMenuId === user.id && (
                          <div className="absolute left-6 top-7 z-10 min-w-28 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                            <button
                              type="button"
                              className="block w-full rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                              onClick={() => handleStatusChange(user.id, true)}
                            >
                              Activo
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                              onClick={() => handleStatusChange(user.id, false)}
                            >
                              Inactivo
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-gray-500">
                      {user.teamName ?? user.groupName ?? (user.role === 'STUDENT' ? 'Sin grupo' : 'No aplica')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
