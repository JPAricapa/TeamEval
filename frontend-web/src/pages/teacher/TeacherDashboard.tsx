import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ClipboardList, Users, ArrowRight, Clock, CheckCircle2, Play, FileText, PlusCircle } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAuthStore } from '@/store/authStore'
import { evaluationsApi, coursesApi } from '@/services/api'
import { toTitleCase } from '@/lib/utils'
import type { EvaluationProcess, Course } from '@/types'

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
  const draft = processes.filter(p => p.status === 'DRAFT').length
  const closed = processes.filter(p => p.status === 'CLOSED').length
  const totalEvaluations = processes.reduce((sum, p) => sum + (p.totalCount ?? 0), 0)
  const completedEvaluations = processes.reduce((sum, p) => sum + (p.completedCount ?? 0), 0)
  const completionRate = totalEvaluations > 0 ? Math.round((completedEvaluations / totalEvaluations) * 100) : 0
  const totalGroups = courses.reduce((sum, c) => sum + ((c as unknown as { _count?: { groups?: number } })._count?.groups ?? 0), 0)
  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={greeting()}
        title={`${user?.firstName ? toTitleCase(user.firstName) : ''} ${user?.lastName ? toTitleCase(user.lastName) : ''}`}
        description={active.length > 0
          ? `Tienes ${active.length} proceso${active.length > 1 ? 's' : ''} activo${active.length > 1 ? 's' : ''} y ${completionRate}% de avance global.`
          : 'Organiza cursos, rúbricas y procesos de evaluación desde tu panel docente.'}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/teacher/rubrics')} className="gap-2">
              <FileText className="h-4 w-4" /> Rúbricas
            </Button>
            <Button onClick={() => navigate('/teacher/evaluations')} className="gap-2">
              <PlusCircle className="h-4 w-4" /> Nuevo proceso
            </Button>
          </>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Cursos" value={courses.length} icon={BookOpen} color="blue" subtitle="A tu cargo" />
        <StatCard title="Procesos activos" value={active.length} icon={Play} color="green" subtitle={`${draft} en borrador`} />
        <StatCard title="Grupos" value={totalGroups} icon={Users} color="purple" subtitle="En tus cursos" />
        <StatCard title="Avance global" value={`${completionRate}%`} icon={CheckCircle2} color="amber" subtitle={`${closed} procesos cerrados`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
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
              <LoadingState label="Cargando procesos..." className="min-h-32" />
            ) : processes.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Aún no hay procesos"
                description="Crea tu primer proceso para activar evaluaciones de pares, autoevaluación y evaluación docente."
                action={<Button onClick={() => navigate('/teacher/evaluations')} className="gap-2"><PlusCircle className="h-4 w-4" /> Crear proceso</Button>}
              />
            ) : (
              processes.slice(0, 4).map(proc => {
                return (
                  <div key={proc.id}
                    className="cursor-pointer rounded-lg border border-gray-100 p-3.5 transition-all hover:border-primary/30 hover:bg-sky-50/60"
                    onClick={() => navigate(`/teacher/evaluations/${proc.id}`)}>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{proc.name}</p>
                      <StatusBadge status={proc.status} className="flex-shrink-0 text-xs" />
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acciones rápidas</CardTitle>
            <CardDescription>Flujos frecuentes del docente</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              { label: 'Crear o revisar cursos', icon: BookOpen, href: '/teacher/courses' },
              { label: 'Gestionar procesos', icon: ClipboardList, href: '/teacher/evaluations' },
              { label: 'Evaluar estudiantes', icon: Users, href: '/teacher/pending' },
            ].map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-left transition-colors hover:border-primary/25 hover:bg-sky-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-semibold text-gray-800">{item.label}</span>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
