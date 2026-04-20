import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, BarChart3, CheckCircle2, Clock, ArrowRight, Loader2 } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'
import { evaluationsApi } from '@/services/api'
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
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-primary rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm">{greeting()},</p>
        <h1 className="text-2xl font-bold mt-1">{user?.firstName} {user?.lastName}</h1>
        <p className="text-blue-200 mt-1 text-sm">
          {pending.length > 0
            ? `Tienes ${pending.length} evaluación${pending.length > 1 ? 'es' : ''} pendiente${pending.length > 1 ? 's' : ''}${pendingSummary ? `: ${pendingSummary}` : ''}`
            : '¡Estás al día! No tienes evaluaciones pendientes.'}
        </p>
        {pending.length > 0 && (
          <Button size="sm" variant="secondary" className="mt-4 text-gray-800 gap-1.5"
            onClick={() => navigate('/student/evaluations')}>
            <ClipboardList className="w-3.5 h-3.5" /> Ir a mis evaluaciones
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Pendientes" value={pending.length} icon={Clock} color="amber" subtitle="Por completar" />
        <StatCard title="Autoevaluaciones" value={selfPending} icon={CheckCircle2} color="blue" subtitle="Pendientes" />
        <StatCard title="Evaluar compañeros" value={peerPending} icon={BarChart3} color="green" subtitle="Pendientes" />
      </div>

      {/* Pending evaluations list */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Evaluaciones Pendientes</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/student/evaluations')} className="gap-1 text-primary text-xs">
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : pending.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">¡Todo completado!</p>
            </div>
          ) : (
            pending.slice(0, 6).map(ev => {
              const t = typeLabel[ev.type]
              const isSelf = ev.type === 'SELF'
              const evaluated = ev.evaluatee ?? ev.evaluated
              const evaluateeName = evaluated ? `${evaluated.firstName} ${evaluated.lastName}` : undefined
              return (
                <div key={ev.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-blue-50/30 cursor-pointer transition-all"
                  onClick={() => navigate(`/student/evaluations/${ev.id}`, { state: { evaluateeName } })}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {isSelf ? 'YO' : (evaluated ? `${evaluated.firstName[0]}${evaluated.lastName[0]}` : '?')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {isSelf
                          ? 'Autoevaluación'
                          : (evaluated ? `Evaluar a ${evaluated.firstName} ${evaluated.lastName}` : 'Evaluar compañero')}
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

      <Button className="w-full gap-2" onClick={() => navigate('/student/results')}>
        <BarChart3 className="w-4 h-4" /> Ver mis resultados
      </Button>
    </div>
  )
}
