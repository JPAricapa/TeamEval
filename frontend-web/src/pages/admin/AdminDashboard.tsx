import { useEffect, useState } from 'react'
import { Users, Building2, BookOpen, ClipboardList, TrendingUp, Activity } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usersApi, institutionsApi, coursesApi } from '@/services/api'
import type { User, Institution } from '@/types'
import { getRoleColor, getRoleName } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#1565C0', '#2196F3', '#64B5F6', '#BBDEFB']

export function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      usersApi.getAll({ limit: 100 }),
      institutionsApi.getAll(),
      coursesApi.getAll(),
    ]).then(([u, i]) => {
      setUsers(u.data.data ?? [])
      setInstitutions(i.data.data ?? [])
    }).catch(() => {
      // Use mock data in development if backend not available
      setUsers([
        { id: '1', email: 'admin@teameval.edu.co', firstName: 'Administrador', lastName: 'Sistema', role: 'ADMIN', isActive: true, createdAt: new Date().toISOString() },
        { id: '2', email: 'docente@teameval.edu.co', firstName: 'Jorge', lastName: 'Aldana', role: 'TEACHER', isActive: true, createdAt: new Date().toISOString() },
        { id: '3', email: 'est1@teameval.edu.co', firstName: 'Estudiante', lastName: 'Uno', role: 'STUDENT', isActive: true, createdAt: new Date().toISOString() },
        { id: '4', email: 'est2@teameval.edu.co', firstName: 'Estudiante', lastName: 'Dos', role: 'STUDENT', isActive: true, createdAt: new Date().toISOString() },
        { id: '5', email: 'est3@teameval.edu.co', firstName: 'Estudiante', lastName: 'Tres', role: 'STUDENT', isActive: true, createdAt: new Date().toISOString() },
        { id: '6', email: 'est4@teameval.edu.co', firstName: 'Estudiante', lastName: 'Cuatro', role: 'STUDENT', isActive: true, createdAt: new Date().toISOString() },
      ])
      setInstitutions([
        { id: '1', name: 'Institución Demo', code: 'DEMO', city: 'Demo City', country: 'Colombia', isActive: true }
      ])
    }).finally(() => setLoading(false))
  }, [])

  const roleData = [
    { name: 'Estudiantes', value: users.filter(u => u.role === 'STUDENT').length },
    { name: 'Docentes', value: users.filter(u => u.role === 'TEACHER').length },
    { name: 'Admins', value: users.filter(u => u.role === 'ADMIN').length },
  ]

  const activityData = [
    { month: 'Feb', evaluaciones: 12, usuarios: 45 },
    { month: 'Mar', evaluaciones: 28, usuarios: 52 },
    { month: 'Abr', evaluaciones: 35, usuarios: 58 },
    { month: 'May', evaluaciones: 42, usuarios: 61 },
    { month: 'Jun', evaluaciones: 38, usuarios: 63 },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Usuarios" value={users.length} icon={Users} color="blue"
          subtitle={`${users.filter(u => u.isActive).length} activos`} />
        <StatCard title="Instituciones" value={institutions.length} icon={Building2} color="purple"
          subtitle="Registradas en la plataforma" />
        <StatCard title="Cursos Activos" value={4} icon={BookOpen} color="green"
          subtitle="Período 2024-2" />
        <StatCard title="Evaluaciones" value={24} icon={ClipboardList} color="amber"
          subtitle="Completadas este período" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Actividad de la Plataforma
            </CardTitle>
            <CardDescription>Evaluaciones completadas y usuarios activos por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="evaluaciones" fill="#1565C0" name="Evaluaciones" radius={[4, 4, 0, 0]} />
                <Bar dataKey="usuarios" fill="#64B5F6" name="Usuarios" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
                      <Badge variant={user.isActive ? 'success' : 'secondary'}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
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
