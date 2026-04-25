import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, CheckCircle2, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { evaluationsApi } from '@/services/api'
import { toTitleCase } from '@/lib/utils'
import type { Evaluation } from '@/types'

const typeInfo: Record<string, { label: string; color: string }> = {
  SELF:    { label: 'Autoevaluación', color: 'bg-purple-100 text-purple-700' },
  PEER:    { label: 'Evaluar compañero',   color: 'bg-blue-100 text-blue-700'    },
  TEACHER: { label: 'Docente',        color: 'bg-amber-100 text-amber-700'  },
}

function getEvaluationTitle(ev: Evaluation) {
  const evaluated = ev.evaluatee ?? ev.evaluated
  if (ev.type === 'SELF') return 'Autoevaluación'
  if (ev.type === 'PEER') {
    return evaluated ? `${toTitleCase(evaluated.firstName)} ${toTitleCase(evaluated.lastName)}` : 'Evaluar compañero'
  }
  if (ev.type === 'TEACHER') {
    return evaluated ? `${toTitleCase(evaluated.firstName)} ${toTitleCase(evaluated.lastName)}` : 'Evaluación docente'
  }
  return 'Evaluación'
}

function getEvaluationAvatar(ev: Evaluation) {
  const evaluated = ev.evaluatee ?? ev.evaluated
  if (ev.type === 'SELF') return 'YO'
  if (evaluated) return `${toTitleCase(evaluated.firstName)[0]}${toTitleCase(evaluated.lastName)[0]}`
  return '?'
}

export function MyEvaluationsPage() {
  const navigate = useNavigate()
  const [evals, setEvals] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    evaluationsApi.getMyPending()
      .then(r => setEvals(r.data.data ?? []))
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(msg ?? 'No se pudieron cargar tus evaluaciones.')
        setEvals([])
      })
      .finally(() => setLoading(false))
  }, [])

  const pending   = evals.filter(e => e.status === 'PENDING')
  const completed = evals.filter(e => e.status === 'COMPLETED')

  const EvalCard = ({ ev }: { ev: Evaluation }) => {
    const t = typeInfo[ev.type]
    const isPending = ev.status === 'PENDING'
    const evaluated = ev.evaluatee ?? ev.evaluated
    const evaluateeName = evaluated ? `${evaluated.firstName} ${evaluated.lastName}` : undefined
    return (
      <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isPending ? 'border-gray-200 hover:border-primary/40 hover:bg-blue-50/20 cursor-pointer' : 'border-gray-100 bg-gray-50/50'}`}
        onClick={() => isPending && navigate(`/student/evaluations/${ev.id}`, { state: { evaluateeName } })}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${isPending ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>
            {getEvaluationAvatar(ev)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {getEvaluationTitle(ev)}
            </p>
            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${t.color}`}>{t.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isPending
            ? <><StatusBadge status="PENDING" type="evaluation" /><ArrowRight className="w-4 h-4 text-gray-300" /></>
            : <StatusBadge status="COMPLETED" type="evaluation" />}
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Mis Evaluaciones"
        description={`${pending.length} pendiente${pending.length !== 1 ? 's' : ''} · ${completed.length} completada${completed.length !== 1 ? 's' : ''}`}
        actions={
          <Button variant="outline" onClick={() => navigate('/student/results')} className="gap-2">
            Ver resultados <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState label="Cargando tus evaluaciones..." className="min-h-64" />
      ) : (
        <div className="space-y-5">
          {/* Pending */}
          {pending.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Pendientes por completar
                  <span className="ml-1 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">{pending.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
            {pending.map(ev => <EvalCard key={ev.id} ev={ev} />)}
              </CardContent>
            </Card>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Completadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {completed.map(ev => <EvalCard key={ev.id} ev={ev} />)}
              </CardContent>
            </Card>
          )}

          {evals.length === 0 && (
            <EmptyState
              icon={ClipboardList}
              title="No hay evaluaciones asignadas"
              description="Cuando tu docente active un proceso, tus evaluaciones aparecerán en esta pantalla."
            />
          )}
        </div>
      )}
    </div>
  )
}
