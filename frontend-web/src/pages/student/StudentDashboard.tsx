import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, BarChart3, CheckCircle2, Clock, ArrowRight, UserRoundCheck } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAuthStore } from '@/store/authStore'
import { evaluationsApi } from '@/services/api'
import { toTitleCase } from '@/lib/utils'
import type { Evaluation } from '@/types'

const typeLabel: Record<string, { label: string; color: string }> = {
  SELF:    { label: 'Autoevaluación', color: 'bg-purple-100 text-purple-700' },
  PEER:    { label: 'Evaluar compañero', color: 'bg-blue-100 text-blue-700'   },
  TEACHER: { label: 'Docente',        color: 'bg-amber-100 text-amber-700' },
}

export function StudentDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [pending, setPending] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    evaluationsApi.getMyPending()
      .then(r => setPending(r.data.data ?? []))
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(msg ?? 'No se pudieron cargar tus evaluaciones.')
      })
      .finally(() => setLoading(false))
  }, [])

  const selfPending = pending.filter(e => e.type === 'SELF').length
  const peerPending = pending.filter(e => e.type === 'PEER').length
  const pendingSummary = [
    selfPending > 0 ? `${selfPending} autoevaluación${selfPending > 1 ? 'es' : ''}` : null,
    peerPending > 0 ? `${peerPending} evaluación${peerPending > 1 ? 'es' : ''} de compañeros` : null,
  ].filter((item): item is string => Boolean(item)).join(' y ')

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
        description={pending.length > 0
          ? `Tienes ${pending.length} evaluación${pending.length > 1 ? 'es' : ''} pendiente${pending.length > 1 ? 's' : ''}${pendingSummary ? `: ${pendingSummary}` : ''}.`
          : 'Estás al día. Cuando tengas nuevas evaluaciones aparecerán aquí.'}
        actions={
          <Button className="gap-2" onClick={() => navigate(pending.length > 0 ? '/student/evaluations' : '/student/results')}>
            {pending.length > 0 ? <ClipboardList className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
            {pending.length > 0 ? 'Ir a evaluaciones' : 'Ver resultados'}
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Pendientes" value={pending.length} icon={Clock} color="amber" subtitle="Por completar" />
        <StatCard title="Autoevaluaciones" value={selfPending} icon={CheckCircle2} color="blue" subtitle="Pendientes" />
        <StatCard title="Evaluar compañeros" value={peerPending} icon={BarChart3} color="green" subtitle="Pendientes" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Evaluaciones pendientes</CardTitle>
            <CardDescription>Completa primero las asignaciones con estado pendiente</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/student/evaluations')} className="gap-1 text-primary text-xs">
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <LoadingState label="Cargando evaluaciones..." className="min-h-32" />
          ) : pending.length === 0 ? (
            <EmptyState
              icon={UserRoundCheck}
              title="Todo completado"
              description="No tienes evaluaciones pendientes en este momento."
              className="border-emerald-100 bg-emerald-50/50"
            />
          ) : (
            pending.slice(0, 6).map(ev => {
              const t = typeLabel[ev.type]
              const isSelf = ev.type === 'SELF'
              const evaluated = ev.evaluatee ?? ev.evaluated
              const fn = evaluated ? toTitleCase(evaluated.firstName) : ''
              const ln = evaluated ? toTitleCase(evaluated.lastName) : ''
              const evaluateeName = evaluated ? `${fn} ${ln}` : undefined
              return (
                <div key={ev.id}
                  className="flex cursor-pointer flex-col gap-3 rounded-lg border border-gray-100 p-3.5 transition-all hover:border-primary/30 hover:bg-sky-50/60 sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => navigate(`/student/evaluations/${ev.id}`, { state: { evaluateeName } })}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {isSelf ? 'YO' : (evaluated ? `${fn[0]}${ln[0]}` : '?')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {isSelf
                          ? 'Autoevaluación'
                          : (evaluated ? `Evaluar a ${fn} ${ln}` : 'Evaluar compañero')}
                      </p>
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${t.color}`}>
                        {t.label}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status="PENDING" type="evaluation" />
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
