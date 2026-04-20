import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { evaluationsApi } from '@/services/api'

interface PendingEvaluation {
  id: string
  type: 'SELF' | 'PEER' | 'TEACHER'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  evaluated?: { firstName: string; lastName: string }
  process?: { name: string; endDate?: string }
}

export function TeacherPendingPage() {
  const navigate = useNavigate()
  const [evaluations, setEvaluations] = useState<PendingEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    evaluationsApi.getMyPending()
      .then(r => setEvaluations(r.data.data ?? []))
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(msg ?? 'No se pudieron cargar las evaluaciones pendientes.')
      })
      .finally(() => setLoading(false))
  }, [])

  const teacherEvals = evaluations.filter(e => e.type === 'TEACHER')
  const grouped = teacherEvals.reduce<Record<string, PendingEvaluation[]>>((acc, ev) => {
    const key = ev.process?.name ?? 'Sin proceso'
    if (!acc[key]) acc[key] = []
    acc[key].push(ev)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Evaluar Estudiantes</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Aquí aparecen las evaluaciones que debes hacer como docente en los procesos activos.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {teacherEvals.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Sin evaluaciones pendientes</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              No tienes evaluaciones docentes que realizar. Cuando actives un proceso que incluya
              evaluación docente, aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([processName, items]) => (
          <Card key={processName}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-gray-900">{processName}</h3>
                <Badge variant="info" className="ml-auto">{items.length} pendientes</Badge>
              </div>
              <div className="space-y-2">
                {items.map(ev => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {ev.evaluated ? `${ev.evaluated.firstName} ${ev.evaluated.lastName}` : 'Estudiante'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ev.status === 'IN_PROGRESS' ? 'En progreso' : 'Pendiente'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => navigate(`/teacher/evaluate/${ev.id}`)}
                    >
                      Evaluar <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
