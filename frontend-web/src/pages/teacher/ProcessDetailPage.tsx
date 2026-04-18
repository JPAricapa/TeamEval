import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, CheckCircle2, Clock, BarChart3, Download, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { consolidationApi, exportApi } from '@/services/api'

function scoreColor(s: number) {
  if (s >= 4.5) return 'text-emerald-600 bg-emerald-50'
  if (s >= 3.5) return 'text-blue-600 bg-blue-50'
  if (s >= 2.5) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

export function ProcessDetailPage() {
  const { processId } = useParams()
  const navigate = useNavigate()
  const [results, setResults] = useState<Array<Record<string, unknown>>>([])
  const [consolidating, setConsolidating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!processId) return
    consolidationApi.getResults(processId)
      .then(r => setResults(r.data.data ?? []))
      .catch(() => setError('Todavia no hay resultados consolidados para este proceso.'))
      .finally(() => setLoading(false))
  }, [processId])

  const handleConsolidate = async () => {
    if (!processId) return
    setConsolidating(true)
    try {
      await consolidationApi.consolidate(processId)
      const r = await consolidationApi.getResults(processId)
      setResults(r.data.data ?? [])
      setError('')
    } catch {
      setError('No se pudo consolidar el proceso.')
    } finally {
      setConsolidating(false)
    }
  }

  const completedCount = results.filter(() => true).length
  const pct = Math.round((completedCount / (results.length || 1)) * 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/evaluations')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Detalle del Proceso</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Proceso ID: {processId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5 text-sm"
            onClick={() => window.open(exportApi.excel(processId!), '_blank')}>
            <Download className="w-4 h-4" /> Excel
          </Button>
          <Button variant="outline" className="gap-1.5 text-sm"
            onClick={() => window.open(exportApi.pdf(processId!), '_blank')}>
            <Download className="w-4 h-4" /> PDF
          </Button>
          <Button className="gap-1.5" onClick={handleConsolidate} disabled={consolidating}>
            {consolidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Consolidar
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => navigate(`/teacher/analytics/${processId}`)}>
            <BarChart3 className="w-4 h-4" /> Analítica
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* Progress summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="w-8 h-8 text-primary bg-primary/10 rounded-lg p-1.5" />
          <div><p className="text-xs text-gray-500">Estudiantes</p><p className="text-2xl font-bold">{results.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 bg-emerald-50 rounded-lg p-1.5" />
          <div><p className="text-xs text-gray-500">Completados</p><p className="text-2xl font-bold">{completedCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-500 bg-amber-50 rounded-lg p-1.5" />
          <div>
            <p className="text-xs text-gray-500">Progreso</p>
            <div className="flex items-center gap-2"><p className="text-2xl font-bold">{pct}%</p>
              <Progress value={pct} className="w-16 h-1.5" /></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Results table */}
      <Card>
        <CardHeader><CardTitle>Resultados Consolidados</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y border-gray-100">
                  <tr>
                    {['Estudiante', 'Equipo', 'Autoevaluación', 'Coevaluación', 'Docente', 'Final', 'Sobrevaloración', 'Estado'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {results.map((r) => (
                    <tr key={String(r.id)} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {String((r.student as { name?: string } | undefined)?.name ?? 'N').slice(0, 1)}
                          </div>
                          <span className="font-medium text-gray-900">{(r.student as { name?: string } | undefined)?.name ?? 'Sin nombre'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{(r.team as { name?: string } | undefined)?.name ?? 'Sin equipo'}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-lg ${scoreColor(Number(r.selfScore ?? 0))}`}>{Number(r.selfScore ?? 0).toFixed(2)}</span></td>
                      <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-lg ${scoreColor(Number(r.peerScore ?? 0))}`}>{Number(r.peerScore ?? 0).toFixed(2)}</span></td>
                      <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-lg ${scoreColor(Number(r.teacherScore ?? 0))}`}>{Number(r.teacherScore ?? 0).toFixed(2)}</span></td>
                      <td className="px-4 py-3"><span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${scoreColor(Number(r.finalScore ?? 0))}`}>{Number(r.finalScore ?? 0).toFixed(2)}</span></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${Number(r.overvaluationIndex ?? 0) > 0.3 ? 'text-red-500' : 'text-gray-400'}`}>
                          {Number(r.overvaluationIndex ?? 0) > 0 ? '+' : ''}{(Number(r.overvaluationIndex ?? 0) * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="success">Registrado</Badge>
                      </td>
                    </tr>
                  ))}
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                        Aun no hay resultados consolidados para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
