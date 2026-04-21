import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { evaluationsApi } from '@/services/api'
import { toTitleCase } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Rubric } from '@/types'

type RawPerformanceLevel = {
  id: string
  name: string
  score: number
  description: string
}

const levelColor: Record<number, string> = {
  5: 'border-emerald-400 bg-emerald-50 text-emerald-800',
  4: 'border-blue-400 bg-blue-50 text-blue-800',
  3: 'border-amber-400 bg-amber-50 text-amber-800',
  2: 'border-red-400 bg-red-50 text-red-800',
  1: 'border-rose-500 bg-rose-50 text-rose-800',
}

const levelBadge: Record<number, string> = {
  5: 'bg-emerald-400', 4: 'bg-blue-400', 3: 'bg-amber-400', 2: 'bg-red-400', 1: 'bg-rose-500',
}

const defaultLevelContent: Record<number, { name: string; description: string }> = {
  5: { name: 'Excelente', description: 'Desempeño sobresaliente en este criterio.' },
  4: { name: 'Bueno', description: 'Cumple muy bien este criterio en la mayoría de situaciones.' },
  3: { name: 'Aceptable', description: 'Cumple este criterio de forma suficiente, con aspectos por mejorar.' },
  2: { name: 'Bajo', description: 'Cumple este criterio de forma limitada y requiere mejora.' },
  1: { name: 'Muy bajo', description: 'No alcanza el nivel esperado en este criterio.' },
}

function normalizeLevels(levels: RawPerformanceLevel[]) {
  if (levels.length > 0) {
    return [...levels].sort((a, b) => b.score - a.score)
  }

  return [5, 4, 3, 2, 1].map((score) => ({
    id: `fallback-${score}`,
    score,
    name: defaultLevelContent[score].name,
    description: defaultLevelContent[score].description,
  }))
}

export function EvaluationFormPage() {
  const { evalId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const backPath = user?.role === 'STUDENT' ? '/student/evaluations' : '/teacher/pending'
  const navigationState = location.state as { evaluateeName?: string } | null
  const [rubric, setRubric] = useState<Rubric | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [evalInfo, setEvalInfo] = useState<{ type: string; evaluateeName: string } | null>(null)

  useEffect(() => {
    if (!evalId) return
    setLoading(true)
    evaluationsApi.getById(evalId)
      .then(r => {
        const ev = r.data.data
        const evaluatedName = ev.evaluatee
          ? `${toTitleCase(ev.evaluatee.firstName)} ${toTitleCase(ev.evaluatee.lastName)}`
          : ev.evaluated
            ? `${toTitleCase(ev.evaluated.firstName)} ${toTitleCase(ev.evaluated.lastName)}`
            : null
        const fallbackEvaluateeName =
          ev.type === 'SELF'
            ? 'Autoevaluación'
            : ev.type === 'PEER'
              ? (navigationState?.evaluateeName ?? 'tu compañero')
              : 'el estudiante'
        setEvalInfo({
          type: ev.type,
          evaluateeName: evaluatedName ?? fallbackEvaluateeName,
        })
        const realRubric = ev.process?.rubric
        if (!realRubric) {
          setLoadError('Esta evaluación no tiene una rúbrica asignada.')
          return
        }
        const normalizedCriteria = (realRubric.criteria ?? []).map((criterion: {
          id: string
          name: string
          description?: string
          weight: number
          performanceLevels?: RawPerformanceLevel[]
        }) => {
          const levels = normalizeLevels(criterion.performanceLevels ?? [])

          return {
            id: criterion.id,
            name: criterion.name,
            description: criterion.description ?? '',
            weight: criterion.weight,
            maxScore: levels.length > 0 ? Math.max(...levels.map((level) => level.score)) : 5,
            rubricId: realRubric.id,
            levels: levels.map((level) => ({
              id: level.id,
              name: level.name,
              score: level.score,
              description: level.description,
            })),
          }
        })

        setRubric({
          id: realRubric.id,
          name: realRubric.name,
          description: realRubric.description ?? '',
          version: realRubric.version,
          isActive: true,
          isTemplate: false,
          createdAt: realRubric.createdAt ?? '',
          criteria: normalizedCriteria,
        })
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setLoadError(msg ?? 'No se pudo cargar la evaluación.')
      })
      .finally(() => setLoading(false))
  }, [evalId, navigationState?.evaluateeName])

  const answered = Object.keys(scores).length
  const total = rubric?.criteria?.length ?? 0
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0
  const canSubmit = total > 0 && answered === total
  const evaluationTitle =
    evalInfo?.type === 'SELF'
      ? 'Autoevaluación'
      : evalInfo?.type === 'PEER'
        ? `Evaluando a ${evalInfo?.evaluateeName ?? 'tu compañero'}`
        : `Evaluación de ${evalInfo?.evaluateeName ?? 'el estudiante'}`
  const evaluationSubtitle =
    evalInfo?.type === 'PEER'
      ? `Compañero evaluado: ${evalInfo?.evaluateeName ?? 'tu compañero'}`
      : rubric?.name ?? ''

  const handleSubmit = async () => {
    if (!canSubmit || !evalId) return
    setSubmitting(true)
    setSubmitError('')
    const payload = {
      scores: Object.entries(scores).map(([criteriaId, score]) => ({
        criteriaId, score, comment: comments[criteriaId] ?? '',
      })),
    }
    try {
      await evaluationsApi.submit(evalId, payload)
      setSubmitted(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setSubmitError(msg ?? 'No se pudo enviar la evaluación. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Evaluación enviada!</h2>
        <p className="text-gray-500 mb-6 max-w-sm">Tu evaluación ha sido registrada exitosamente.</p>
        <Button onClick={() => navigate(backPath)}>Volver a mis evaluaciones</Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Cargando evaluación...
      </div>
    )
  }

  if (loadError || !rubric) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />Volver
        </Button>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError || 'No se pudo cargar la evaluación.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{evaluationTitle}</h1>
          <p className="text-sm text-gray-500">{evaluationSubtitle}</p>
          {evalInfo?.type === 'PEER' && (
            <p className="text-xs text-gray-400">{rubric.name}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 font-medium">Progreso</span>
          <span className="text-gray-900 font-semibold">{answered}/{total} criterios</span>
        </div>
        <Progress value={pct} className="h-2.5" />
      </div>

      {/* Criteria */}
      {rubric.criteria?.map((criterion, idx) => {
        const selected = scores[criterion.id]
        return (
          <Card key={criterion.id} className={`transition-all ${selected ? 'border-primary/30' : 'border-gray-200'}`}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{criterion.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{criterion.description}</p>
                  <span className="text-xs text-gray-400">Peso: {Math.round(criterion.weight * 100)}%</span>
                </div>
                {selected && (
                  <div className={`ml-auto w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${levelBadge[selected]}`}>
                    {selected}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {criterion.levels?.map(level => (
                  <button
                    key={level.id}
                    onClick={() => setScores(s => ({ ...s, [criterion.id]: level.score }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selected === level.score
                        ? levelColor[level.score]
                        : 'border-gray-100 hover:border-gray-300 bg-white'
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{level.name}</span>
                      <span className={`text-sm font-bold ${selected === level.score ? '' : 'text-gray-400'}`}>{level.score}</span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-80">{level.description}</p>
                  </button>
                ))}
              </div>

              {selected && (
                <div className="mt-3">
                  <textarea
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    rows={2}
                    placeholder="Comentario opcional sobre este criterio..."
                    value={comments[criterion.id] ?? ''}
                    onChange={e => setComments(c => ({ ...c, [criterion.id]: e.target.value }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Submit */}
      <div className="sticky bottom-4 space-y-2">
        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
        <Button
          className="w-full h-12 gap-2 shadow-lg text-base"
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}>
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
            : canSubmit
              ? <><Send className="w-4 h-4" />Enviar evaluación</>
              : `Completa ${total - answered} criterio${total - answered > 1 ? 's' : ''} más`}
        </Button>
      </div>
    </div>
  )
}
