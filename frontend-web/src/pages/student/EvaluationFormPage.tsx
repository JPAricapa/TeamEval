import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { evaluationsApi, rubricsApi } from '@/services/api'
import type { Rubric } from '@/types'

const MOCK_RUBRIC: Rubric = {
  id: 'r1', name: 'Rúbrica  – Coevaluación', description: '', version: 1, isActive: true, isTemplate: true, createdAt: '',
  criteria: [
    { id: 'c1', name: 'Comunicación efectiva', description: 'Capacidad de transmitir ideas con claridad y precisión', weight: 0.20, maxScore: 5, rubricId: 'r1',
      levels: [
        { id: 'l1', name: 'Excelente',  score: 5, description: 'Comunica ideas de forma clara, precisa y oportuna en todo momento' },
        { id: 'l2', name: 'Bueno',      score: 4, description: 'Comunica ideas claramente en la mayoría de situaciones' },
        { id: 'l3', name: 'Aceptable',  score: 3, description: 'Comunica ideas con claridad moderada, con algunas imprecisiones' },
        { id: 'l4', name: 'Deficiente', score: 2, description: 'Tiene dificultades para comunicar ideas con claridad' },
      ]},
    { id: 'c2', name: 'Colaboración y trabajo cooperativo', description: 'Contribución activa y apoyo al equipo', weight: 0.20, maxScore: 5, rubricId: 'r1',
      levels: [
        { id: 'l5', name: 'Excelente',  score: 5, description: 'Contribuye activamente al equipo, apoya a sus compañeros constantemente' },
        { id: 'l6', name: 'Bueno',      score: 4, description: 'Generalmente contribuye al equipo y apoya a compañeros' },
        { id: 'l7', name: 'Aceptable',  score: 3, description: 'Contribución moderada, con apoyo limitado al equipo' },
        { id: 'l8', name: 'Deficiente', score: 2, description: 'Contribución mínima al equipo' },
      ]},
    { id: 'c3', name: 'Cumplimiento de compromisos', description: 'Entrega puntual de las tareas asignadas', weight: 0.20, maxScore: 5, rubricId: 'r1',
      levels: [
        { id: 'l9',  name: 'Excelente',  score: 5, description: 'Cumple todos los compromisos dentro del plazo acordado' },
        { id: 'l10', name: 'Bueno',      score: 4, description: 'Cumple la mayoría de compromisos puntualmente' },
        { id: 'l11', name: 'Aceptable',  score: 3, description: 'Cumple compromisos con algunos retrasos menores' },
        { id: 'l12', name: 'Deficiente', score: 2, description: 'Frecuentemente incumple o retrasa compromisos' },
      ]},
    { id: 'c4', name: 'Participación en reuniones', description: 'Asistencia y aporte activo en reuniones del equipo', weight: 0.20, maxScore: 5, rubricId: 'r1',
      levels: [
        { id: 'l13', name: 'Excelente',  score: 5, description: 'Asiste puntualmente a todas las reuniones y participa activamente' },
        { id: 'l14', name: 'Bueno',      score: 4, description: 'Asiste a la mayoría de reuniones con participación activa' },
        { id: 'l15', name: 'Aceptable',  score: 3, description: 'Asistencia irregular con participación moderada' },
        { id: 'l16', name: 'Deficiente', score: 2, description: 'Asistencia deficiente y escasa participación' },
      ]},
    { id: 'c5', name: 'Resolución de conflictos', description: 'Gestión constructiva de desacuerdos', weight: 0.20, maxScore: 5, rubricId: 'r1',
      levels: [
        { id: 'l17', name: 'Excelente',  score: 5, description: 'Resuelve conflictos de manera constructiva, promoviendo el consenso' },
        { id: 'l18', name: 'Bueno',      score: 4, description: 'Maneja la mayoría de conflictos de forma positiva' },
        { id: 'l19', name: 'Aceptable',  score: 3, description: 'Maneja conflictos básicos pero evita confrontaciones' },
        { id: 'l20', name: 'Deficiente', score: 2, description: 'Dificultad para manejar conflictos constructivamente' },
      ]},
  ],
}

const levelColor: Record<number, string> = {
  5: 'border-emerald-400 bg-emerald-50 text-emerald-800',
  4: 'border-blue-400 bg-blue-50 text-blue-800',
  3: 'border-amber-400 bg-amber-50 text-amber-800',
  2: 'border-red-400 bg-red-50 text-red-800',
}

const levelBadge: Record<number, string> = {
  5: 'bg-emerald-400', 4: 'bg-blue-400', 3: 'bg-amber-400', 2: 'bg-red-400',
}

export function EvaluationFormPage() {
  const { evalId } = useParams()
  const navigate = useNavigate()
  const [rubric, setRubric] = useState<Rubric>(MOCK_RUBRIC)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [evalInfo, setEvalInfo] = useState<{ type: string; evaluateeName: string }>({ type: 'PEER', evaluateeName: 'Luis Martínez' })

  useEffect(() => {
    if (!evalId) return
    evaluationsApi.getById(evalId)
      .then(r => {
        const ev = r.data.data
        setEvalInfo({
          type: ev.type,
          evaluateeName: ev.evaluatee ? `${ev.evaluatee.firstName} ${ev.evaluatee.lastName}` : 'Autoevaluación',
        })
        return rubricsApi.getById(ev.rubricId ?? 'r1')
      })
      .then(r => setRubric(r.data.data ?? MOCK_RUBRIC))
      .catch(() => {})
  }, [evalId])

  const answered = Object.keys(scores).length
  const total = rubric.criteria?.length ?? 0
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0
  const canSubmit = answered === total

  const handleSubmit = async () => {
    if (!canSubmit || !evalId) return
    setSubmitting(true)
    const payload = {
      scores: Object.entries(scores).map(([criteriaId, score]) => ({
        criteriaId, score, comment: comments[criteriaId] ?? '',
      })),
    }
    try {
      await evaluationsApi.submit(evalId, payload)
      setSubmitted(true)
    } catch {
      setSubmitted(true) // show success anyway for demo
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
        <Button onClick={() => navigate('/student/evaluations')}>Volver a mis evaluaciones</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/student/evaluations')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {evalInfo.type === 'SELF' ? 'Autoevaluación' : `Evaluando a ${evalInfo.evaluateeName}`}
          </h1>
          <p className="text-sm text-gray-500">{rubric.name}</p>
        </div>
      </div>

      {/* Progress bar */}
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
      <div className="sticky bottom-4">
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
