import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ClipboardList, Users, ArrowRight, Clock, CheckCircle2, Play } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { evaluationsApi, coursesApi } from '@/services/api'
import { toTitleCase } from '@/lib/utils'
import type { EvaluationProcess, Course } from '@/types'

const statusBadge: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'secondary' }> = {
  DRAFT:    { label: 'Borrador',  variant: 'secondary' },
  ACTIVE:   { label: 'Activo',    variant: 'success'   },
  CLOSED:   { label: 'Cerrado',   variant: 'warning'   },
  ARCHIVED: { label: 'Archivado', variant: 'info'       },
}

export function TeacherDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [processes, setProcesses] = useState<EvaluationProcess[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([evaluationsApi.getProcesses(), coursesApi.getAll()])
      .then(([p, c]) => {
        setProcesses(p.data.data ?? [])
        setCourses(c.data.data ?? [])
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(msg ?? 'No se pudieron cargar los datos del panel.')
      })
      .finally(() => setLoading(false))
  }, [])

  const active = processes.filter(p => p.status === 'ACTIVE')
  const closed = processes.filter(p => p.status === 'CLOSED').length
  const totalGroups = courses.reduce((sum, c) => sum + ((c as unknown as { _count?: { groups?: number } })._count?.groups ?? 0), 0)
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
        <h1 className="text-2xl font-bold mt-1">{user?.firstName ? toTitleCase(user.firstName) : ''} {user?.lastName ? toTitleCase(user.lastName) : ''}</h1>
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
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Cursos" value={courses.length} icon={BookOpen} color="blue" subtitle="A tu cargo" />
        <StatCard title="Procesos Activos" value={active.length} icon={Play} color="green" subtitle="En progreso" />
        <StatCard title="Grupos" value={totalGroups} icon={Users} color="purple" subtitle="En tus cursos" />
        <StatCard title="Procesos Cerrados" value={closed} icon={CheckCircle2} color="amber" subtitle="Consolidados" />
      </div>

      <div className="grid grid-cols-1 gap-6">
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
                return (
                  <div key={proc.id}
                    className="p-3.5 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-blue-50/30 cursor-pointer transition-all"
                    onClick={() => navigate(`/teacher/evaluations/${proc.id}`)}>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{proc.name}</p>
                      <Badge variant={s.variant} className="flex-shrink-0 text-xs">{s.label}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      Pares: {Math.round(proc.peerWeight * 100)}% · Auto: {Math.round(proc.selfWeight * 100)}% · Docente: {Math.round(proc.teacherWeight * 100)}%
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
