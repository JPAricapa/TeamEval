import { useEffect, useState } from 'react'
import { BarChart3, BookOpen, Info, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { PageHeader } from '@/components/ui/page-header'
import { consolidationApi } from '@/services/api'

type ProcessInfo = {
  id: string
  name: string
  status: string
  selfWeight: number
  peerWeight: number
  teacherWeight: number
  course?: { name: string; code: string }
}

type StudentResult = {
  id: string
  selfScore: number | null
  peerScore: number | null
  teacherScore: number | null
  finalScore: number
  calculatedAt: string
  process: ProcessInfo
  team?: { name: string } | null
}

function scoreColor(s: number | null) {
  if (s === null) return 'text-gray-400 bg-gray-100'
  if (s >= 4.5) return 'text-emerald-700 bg-emerald-50'
  if (s >= 3.5) return 'text-blue-700 bg-blue-50'
  if (s >= 2.5) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

function scorePercent(s: number | null) {
  if (s === null) return 0
  return Math.min(100, Math.max(0, (s / 5) * 100))
}

export function MyResultsPage() {
  const [results, setResults] = useState<StudentResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    consolidationApi.getMyResults()
      .then(r => setResults(r.data.data ?? []))
      .catch(() => setError('No se pudieron cargar tus resultados.'))
      .finally(() => setLoading(false))
  }, [])
  const averageScore = results.length > 0
    ? results.reduce((sum, result) => sum + result.finalScore, 0) / results.length
    : null

  return (
    <div className="page-shell mx-auto max-w-4xl">
      <PageHeader
        title="Mis Resultados"
        description={averageScore
          ? `Promedio consolidado: ${averageScore.toFixed(2)} sobre 5.0 en ${results.length} proceso${results.length > 1 ? 's' : ''}.`
          : 'Resultados consolidados de tus evaluaciones.'}
      />

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          Las evaluaciones de tus compañeros son completamente anónimas.
          Solo ves tu puntaje consolidado, nunca quién te evaluó.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState label="Cargando resultados..." className="min-h-64" />
      ) : results.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Aún no hay resultados disponibles"
          description="Cuando tu docente cierre el proceso de evaluación y consolide los resultados, podrás ver aquí tu puntaje final y el análisis por criterio."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {results.map(result => (
            <Card key={result.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base">{result.process.name}</CardTitle>
                    {result.process.course && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {result.process.course.name} ({result.process.course.code})
                      </p>
                    )}
                    {result.team && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Equipo: {result.team.name}
                      </p>
                    )}
                  </div>
                  <Badge variant="warning">Cerrado</Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-5">
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Puntaje final</p>
                  <p className={`text-4xl font-bold ${scoreColor(result.finalScore).split(' ')[0]}`}>
                    {result.finalScore.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">sobre 5.0</p>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Autoevaluación', value: result.selfScore },
                    { label: 'Coevaluación', value: result.peerScore },
                    { label: 'Docente', value: result.teacherScore },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-600">{item.label}</span>
                        <span className={item.value === null ? 'text-gray-400' : 'font-semibold text-gray-900'}>
                          {item.value === null ? 'Sin registro' : item.value.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${scorePercent(item.value)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
