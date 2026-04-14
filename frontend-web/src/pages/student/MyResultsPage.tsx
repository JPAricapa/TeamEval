import { useEffect, useState } from 'react'
import { TrendingUp, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'
import { consolidationApi } from '@/services/api'
import { getScoreColor, getScoreBg } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const MOCK_RESULT = {
  finalScore: 3.87,
  selfScore: 4.2,
  peerScore: 3.7,
  teacherScore: 3.8,
  overvaluationIndex: 0.14,
  isOutlier: false,
  criteriaResults: [
    { name: 'Comunicación', self: 4.0, peer: 3.6, teacher: 3.8, final: 3.72 },
    { name: 'Colaboración', self: 4.5, peer: 3.8, teacher: 4.0, final: 3.96 },
    { name: 'Cumplimiento', self: 4.2, peer: 3.7, teacher: 3.9, final: 3.82 },
    { name: 'Participación', self: 4.0, peer: 3.5, teacher: 3.7, final: 3.64 },
    { name: 'Resolución', self: 4.3, peer: 3.9, teacher: 3.8, final: 3.96 },
  ],
}

function ScorePill({ value, label }: { value: number; label: string }) {
  return (
    <div className={`rounded-xl border p-4 text-center ${getScoreBg(value)}`}>
      <p className={`text-3xl font-bold ${getScoreColor(value)}`}>{value.toFixed(2)}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

export function MyResultsPage() {
  const { user } = useAuthStore()
  const [result, setResult] = useState(MOCK_RESULT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    consolidationApi.getResults('p1')
      .then(r => {
        const myResult = r.data.data?.find((res: { studentId: string }) => res.studentId === user?.id)
        if (myResult) setResult(myResult)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>

  const ovIdx = result.overvaluationIndex
  const ovPct = Math.round(ovIdx * 100)
  const ovWarning = ovIdx > 0.3

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Resultados</h1>
        <p className="text-gray-500 mt-1 text-sm">Evaluación Parcial 1 – Proyecto Integrador</p>
      </div>

      {/* Final score hero */}
      <Card className={`border-2 ${getScoreBg(result.finalScore)}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Puntaje Final Consolidado</p>
              <div className="flex items-end gap-3">
                <span className={`text-6xl font-bold ${getScoreColor(result.finalScore)}`}>
                  {result.finalScore.toFixed(2)}
                </span>
                <span className="text-2xl text-gray-300 mb-2">/ 5.00</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {result.finalScore >= 4 ? (
                  <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Desempeño alto</Badge>
                ) : result.finalScore >= 3 ? (
                  <Badge variant="info">Desempeño aceptable</Badge>
                ) : (
                  <Badge variant="destructive">Necesita mejorar</Badge>
                )}
              </div>
            </div>
            <div className="w-24 h-24 rounded-full border-8 flex items-center justify-center"
              style={{ borderColor: result.finalScore >= 4 ? '#10b981' : result.finalScore >= 3 ? '#3b82f6' : '#f59e0b' }}>
              <span className={`text-xl font-bold ${getScoreColor(result.finalScore)}`}>
                {Math.round((result.finalScore / 5) * 100)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <ScorePill value={result.selfScore} label="Autoevaluación" />
        <ScorePill value={result.peerScore} label="Coevaluación" />
        <ScorePill value={result.teacherScore} label="Docente" />
      </div>

      {/* Overvaluation */}
      <Card className={ovWarning ? 'border-amber-200 bg-amber-50/30' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {ovWarning
              ? <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              : <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />}
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Índice de sobrevaloración: {ovPct > 0 ? '+' : ''}{ovPct}%
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {ovWarning
                  ? 'Tu autoevaluación es significativamente más alta que cómo te evaluaron tus compañeros.'
                  : 'Tu autoevaluación es consistente con la evaluación de tus compañeros. ¡Buen trabajo!'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Criteria comparison chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Comparativa por Criterio
          </CardTitle>
          <CardDescription>Tu puntaje vs. la evaluación de tus compañeros y docente</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={result.criteriaResults} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} tickCount={6} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [v.toFixed(2)]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="self"    name="Autoevaluación" fill="#9333ea" radius={[4,4,0,0]} />
              <Bar dataKey="peer"    name="Coevaluación"   fill="#1565C0" radius={[4,4,0,0]} />
              <Bar dataKey="teacher" name="Docente"        fill="#f59e0b" radius={[4,4,0,0]} />
              <Bar dataKey="final"   name="Final"          fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Criteria detail */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Criterio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.criteriaResults.map((c, i) => (
            <div key={c.name}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm font-medium text-gray-900">{c.name}</span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(c.final)}`}>{c.final.toFixed(2)}</span>
              </div>
              <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{ width: `${(c.final / 5) * 100}%`, backgroundColor: c.final >= 4 ? '#10b981' : c.final >= 3 ? '#3b82f6' : '#f59e0b' }} />
              </div>
              <div className="flex gap-4 mt-1 text-xs text-gray-400">
                <span>Auto: <strong className="text-gray-600">{c.self}</strong></span>
                <span>Pares: <strong className="text-gray-600">{c.peer}</strong></span>
                <span>Docente: <strong className="text-gray-600">{c.teacher}</strong></span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
