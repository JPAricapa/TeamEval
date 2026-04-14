import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, BarChart3, CheckCircle2, Clock, ArrowRight } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/store/authStore'
import { evaluationsApi } from '@/services/api'
import type { Evaluation } from '@/types'

const MOCK_PENDING: Evaluation[] = [
  { id: 'e1', type: 'PEER', status: 'PENDING', evaluatorId: 's1', evaluateeId: 's2', processId: 'p1', evaluatee: { id: 's2', firstName: 'Luis', lastName: 'Martínez', email: '', role: 'STUDENT', isActive: true, createdAt: '' } },
  { id: 'e2', type: 'PEER', status: 'PENDING', evaluatorId: 's1', evaluateeId: 's3', processId: 'p1', evaluatee: { id: 's3', firstName: 'María', lastName: 'López', email: '', role: 'STUDENT', isActive: true, createdAt: '' } },
  { id: 'e3', type: 'SELF', status: 'PENDING', evaluatorId: 's1', evaluateeId: 's1', processId: 'p1' },
]

const typeLabel: Record<string, { label: string; color: string }> = {
  SELF:    { label: 'Autoevaluación', color: 'bg-purple-100 text-purple-700' },
  PEER:    { label: 'Coevaluación',   color: 'bg-blue-100 text-blue-700'   },
  TEACHER: { label: 'Docente',        color: 'bg-amber-100 text-amber-700' },
}

export function StudentDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [pending, setPending] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    evaluationsApi.getMyPending()
      .then(r => setPending(r.data.data ?? []))
      .catch(() => setPending(MOCK_PENDING))
      .finally(() => setLoading(false))
  }, [])

  const completed = 2
  const total = pending.length + completed
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-primary rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm">{greeting()},</p>
        <h1 className="text-2xl font-bold mt-1">{user?.firstName} {user?.lastName}</h1>
        <p className="text-blue-200 mt-1 text-sm">
          {pending.length > 0
            ? `Tienes ${pending.length} evaluación${pending.length > 1 ? 'es' : ''} pendiente${pending.length > 1 ? 's' : ''} por completar`
            : '¡Estás al día! No tienes evaluaciones pendientes.'}
        </p>
        {pending.length > 0 && (
          <Button size="sm" variant="secondary" className="mt-4 text-gray-800 gap-1.5"
            onClick={() => navigate('/student/evaluations')}>
            <ClipboardList className="w-3.5 h-3.5" /> Ir a mis evaluaciones
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Pendientes" value={pending.length} icon={Clock} color="amber" subtitle="Por completar" />
        <StatCard title="Completadas" value={completed} icon={CheckCircle2} color="green" subtitle="Este período" />
        <StatCard title="Progreso" value={`${pct}%`} icon={BarChart3} color="blue" subtitle="Del período actual" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending evaluations */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Evaluaciones Pendientes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/student/evaluations')} className="gap-1 text-primary text-xs">
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : pending.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">¡Todo completado!</p>
              </div>
            ) : (
              pending.slice(0, 4).map(ev => {
                const t = typeLabel[ev.type]
                return (
                  <div key={ev.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-blue-50/30 cursor-pointer transition-all"
                    onClick={() => navigate(`/student/evaluations/${ev.id}`)}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {ev.evaluatee ? `${ev.evaluatee.firstName[0]}${ev.evaluatee.lastName[0]}` : 'YO'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {ev.evaluatee ? `${ev.evaluatee.firstName} ${ev.evaluatee.lastName}` : 'Autoevaluación'}
                        </p>
                        <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${t.color}`}>
                          {t.label}
                        </span>
                      </div>
                    </div>
                    <Badge variant="warning">Pendiente</Badge>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mi Progreso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Evaluaciones completadas</span>
                <span className="font-semibold">{completed}/{total}</span>
              </div>
              <Progress value={pct} className="h-3" />
              <p className="text-xs text-gray-400 mt-1.5">{pct}% del período completado</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Autoevaluación', done: 0, total: 1, color: 'bg-purple-100', text: 'text-purple-700' },
                { label: 'Coevaluación', done: 0, total: 2, color: 'bg-blue-100', text: 'text-blue-700' },
                { label: 'Total', done: completed, total, color: 'bg-emerald-100', text: 'text-emerald-700' },
              ].map(item => (
                <div key={item.label} className={`${item.color} rounded-xl p-3 text-center`}>
                  <p className={`text-2xl font-bold ${item.text}`}>{item.done}/{item.total}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            <Button className="w-full gap-2" onClick={() => navigate('/student/results')}>
              <BarChart3 className="w-4 h-4" /> Ver mis resultados
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
