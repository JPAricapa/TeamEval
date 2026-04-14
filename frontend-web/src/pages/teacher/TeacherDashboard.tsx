import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ClipboardList, Users, TrendingUp, ArrowRight, Clock, CheckCircle2, Play } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { evaluationsApi, coursesApi } from '@/services/api'
import type { EvaluationProcess } from '@/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const statusBadge: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'secondary' }> = {
  DRAFT:    { label: 'Borrador',  variant: 'secondary' },
  ACTIVE:   { label: 'Activo',    variant: 'success'   },
  CLOSED:   { label: 'Cerrado',   variant: 'warning'   },
  ARCHIVED: { label: 'Archivado', variant: 'info'       },
}

const MOCK_PROCESSES: EvaluationProcess[] = [
  { id: 'p1', name: 'Evaluación Parcial 1 – Proyecto Integrador', description: '', status: 'ACTIVE', selfWeight: 0.2, peerWeight: 0.5, teacherWeight: 0.3, courseId: 'c1', rubricId: 'r1', createdAt: new Date().toISOString() },
  { id: 'p2', name: 'Evaluación Final – Trabajo en Equipo', description: '', status: 'DRAFT', selfWeight: 0.2, peerWeight: 0.5, teacherWeight: 0.3, courseId: 'c1', rubricId: 'r1', createdAt: new Date().toISOString() },
]

const chartData = [
  { name: 'Comunicación', promedio: 3.8 },
  { name: 'Colaboración', promedio: 4.1 },
  { name: 'Liderazgo', promedio: 3.5 },
  { name: 'Compromiso', promedio: 4.3 },
  { name: 'Resolución', promedio: 3.9 },
  { name: 'Planificación', promedio: 3.7 },
]

export function TeacherDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [processes, setProcesses] = useState<EvaluationProcess[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([evaluationsApi.getProcesses(), coursesApi.getAll()])
      .then(([p]) => setProcesses(p.data.data ?? []))
      .catch(() => setProcesses(MOCK_PROCESSES))
      .finally(() => setLoading(false))
  }, [])

  const active = processes.filter(p => p.status === 'ACTIVE')
  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary to-blue-700 rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm">{greeting()},</p>
        <h1 className="text-2xl font-bold mt-1">{user?.firstName} {user?.lastName}</h1>
        <p className="text-blue-200 mt-1 text-sm">
          {active.length > 0
            ? `Tienes ${active.length} proceso${active.length > 1 ? 's' : ''} de evaluación activo${active.length > 1 ? 's' : ''}`
            : 'No hay procesos activos. Crea uno para comenzar.'}
        </p>
        <div className="flex gap-3 mt-4">
          <Button size="sm" variant="secondary" onClick={() => navigate('/teacher/evaluations')} className="gap-1.5 text-gray-800">
            <ClipboardList className="w-3.5 h-3.5" /> Ver evaluaciones
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/teacher/rubrics')} className="gap-1.5 border-white/30 text-white hover:bg-white/10">
            Ver rúbricas
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Cursos Activos" value={2} icon={BookOpen} color="blue" subtitle="Período 2024-2" />
        <StatCard title="Procesos Activos" value={active.length} icon={Play} color="green" subtitle="En progreso" />
        <StatCard title="Estudiantes" value={12} icon={Users} color="purple" subtitle="En mis cursos" />
        <StatCard title="Completados" value={8} icon={CheckCircle2} color="amber" subtitle="Evaluaciones enviadas" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active processes */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Procesos en Curso</CardTitle>
              <CardDescription>Estado de evaluaciones activas</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/evaluations')} className="gap-1 text-primary text-xs">
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : processes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No hay procesos activos</div>
            ) : (
              processes.slice(0, 4).map(proc => {
                const s = statusBadge[proc.status]
                const pct = proc.status === 'ACTIVE' ? 62 : proc.status === 'CLOSED' ? 100 : 0
                return (
                  <div key={proc.id}
                    className="p-3.5 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-blue-50/30 cursor-pointer transition-all"
                    onClick={() => navigate(`/teacher/evaluations/${proc.id}`)}>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{proc.name}</p>
                      <Badge variant={s.variant} className="flex-shrink-0 text-xs">{s.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="flex-1 h-1.5" />
                      <span className="text-xs text-gray-400 flex-shrink-0">{pct}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      Pares: {Math.round(proc.peerWeight * 100)}% · Autoevaluación: {Math.round(proc.selfWeight * 100)}%
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Quick analytics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Promedio por Criterio
            </CardTitle>
            <CardDescription>Último proceso consolidado</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} tickCount={6} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(v: number) => [v.toFixed(2), 'Promedio']}
                />
                <Bar dataKey="promedio" fill="#1565C0" radius={[0, 4, 4, 0]}
                  label={{ position: 'right', fontSize: 11, fill: '#6b7280', formatter: (v: number) => v.toFixed(1) }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
