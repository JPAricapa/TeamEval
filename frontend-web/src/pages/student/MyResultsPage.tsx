import { useEffect, useState } from 'react'
import { BarChart3, BookOpen, Info, Loader2, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Resultados</h1>
        <p className="text-gray-500 mt-1 text-sm">Resultados consolidados de tus evaluaciones</p>
      </div>

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
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Aún no hay resultados disponibles
            </h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Cuando tu docente cierre el proceso de evaluación y consolide los resultados,
              podrás ver aquí tu puntaje final y el análisis por criterio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
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
                {/* Puntaje final destacado */}
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Puntaje final</p>
                  <p className={`text-4xl font-bold ${scoreColor(result.finalScore).split(' ')[0]}`}>
                    {result.finalScore.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">sobre 5.0</p>
                </div>


              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
