import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, TrendingUp, Users, Activity, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { analyticsApi, exportApi } from '@/services/api'
import type { CourseAnalytics } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend
} from 'recharts'

const MOCK_ANALYTICS: CourseAnalytics = {
  processId: 'p1',
  stats: { mean: 3.87, median: 3.9, variance: 0.42, stdDev: 0.65, min: 2.9, max: 4.8, p25: 3.5, p75: 4.3, p90: 4.6, count: 12 },
  teamCount: 2,
  studentCount: 12,
  completionRate: 0.92,
  histogram: [
    { range: '1.0-2.0', count: 0 }, { range: '2.0-3.0', count: 1 },
    { range: '3.0-3.5', count: 3 }, { range: '3.5-4.0', count: 4 },
    { range: '4.0-4.5', count: 3 }, { range: '4.5-5.0', count: 1 },
  ],
  criteriaStats: [
    { criteriaName: 'Comunicación', mean: 3.8, stdDev: 0.6 },
    { criteriaName: 'Colaboración', mean: 4.1, stdDev: 0.5 },
    { criteriaName: 'Cumplimiento', mean: 3.9, stdDev: 0.7 },
    { criteriaName: 'Participación', mean: 3.7, stdDev: 0.8 },
    { criteriaName: 'Liderazgo', mean: 3.5, stdDev: 0.9 },
    { criteriaName: 'Planificación', mean: 4.0, stdDev: 0.55 },
  ],
}

const TEAM_DATA = [
  { equipo: 'Alpha', promedio: 4.0, min: 3.6, max: 4.3, cohesion: 0.87 },
  { equipo: 'Beta',  promedio: 3.7, min: 2.9, max: 4.5, cohesion: 0.78 },
]

const TABS = ['General', 'Criterios', 'Equipos']

export function AnalyticsPage() {
  const { processId } = useParams()
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState<CourseAnalytics>(MOCK_ANALYTICS)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (!processId) return
    analyticsApi.getCourse(processId)
      .then(r => setAnalytics(r.data.data ?? MOCK_ANALYTICS))
      .catch(() => setAnalytics(MOCK_ANALYTICS))
  }, [processId])

  const { stats, criteriaStats, histogram } = analytics
  const radarData = criteriaStats.map(c => ({ subject: c.criteriaName.split(' ')[0], value: c.mean, fullMark: 5 }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/teacher/evaluations/${processId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Analítica del Proceso</h1>
          <p className="text-sm text-gray-500 mt-0.5">Evaluación Parcial 1 – Proyecto Integrador</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => window.open(exportApi.excel(processId!), '_blank')}>
            <Download className="w-3.5 h-3.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => window.open(exportApi.csv(processId!), '_blank')}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button size="sm" className="gap-1.5"
            onClick={() => window.open(exportApi.pdf(processId!), '_blank')}>
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Promedio General" value={stats.mean.toFixed(2)} icon={TrendingUp} color="blue" subtitle={`Mediana: ${stats.median.toFixed(2)}`} />
        <StatCard title="Desv. Estándar" value={stats.stdDev.toFixed(2)} icon={Activity} color="purple" subtitle={`Varianza: ${stats.variance.toFixed(2)}`} />
        <StatCard title="Completitud" value={`${Math.round(analytics.completionRate * 100)}%`} icon={Target} color="green" subtitle={`${analytics.studentCount} estudiantes`} />
        <StatCard title="P25 / P75" value={`${stats.p25.toFixed(1)} / ${stats.p75.toFixed(1)}`} icon={Users} color="amber" subtitle={`Mín: ${stats.min} · Máx: ${stats.max}`} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab: General */}
      {tab === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Puntajes</CardTitle>
              <CardDescription>Histograma de frecuencias por rango</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={histogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" name="Estudiantes" fill="#1565C0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estadísticas Descriptivas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Media',       value: stats.mean.toFixed(3) },
                  { label: 'Mediana',     value: stats.median.toFixed(3) },
                  { label: 'Varianza',    value: stats.variance.toFixed(3) },
                  { label: 'Desv. Est.',  value: stats.stdDev.toFixed(3) },
                  { label: 'Mínimo',      value: stats.min.toFixed(2) },
                  { label: 'Máximo',      value: stats.max.toFixed(2) },
                  { label: 'Percentil 25', value: stats.p25.toFixed(2) },
                  { label: 'Percentil 75', value: stats.p75.toFixed(2) },
                  { label: 'Percentil 90', value: stats.p90.toFixed(2) },
                  { label: 'N',            value: stats.count },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Criterios */}
      {tab === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Radar por Criterio</CardTitle>
              <CardDescription>Puntaje promedio (escala 1–5)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} tickCount={6} />
                  <Radar name="Promedio" dataKey="value" stroke="#1565C0" fill="#1565C0" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [v.toFixed(2), 'Promedio']} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ranking de Criterios</CardTitle>
              <CardDescription>Media ± desviación estándar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...criteriaStats].sort((a, b) => b.mean - a.mean).map((c, i) => (
                  <div key={c.criteriaName}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="text-sm text-gray-700">{c.criteriaName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900">{c.mean.toFixed(2)}</span>
                        <span className="text-xs text-gray-400 ml-1">± {c.stdDev.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all" style={{ width: `${(c.mean / 5) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Equipos */}
      {tab === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparativa por Equipos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={TEAM_DATA} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="equipo" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} tickCount={6} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="promedio" name="Promedio" fill="#1565C0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="min" name="Mínimo" fill="#90CAF9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="max" name="Máximo" fill="#42A5F5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEAM_DATA.map(team => (
              <Card key={team.equipo}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Equipo {team.equipo}</h3>
                    <span className={`text-lg font-bold ${team.cohesion >= 0.85 ? 'text-emerald-600' : team.cohesion >= 0.70 ? 'text-amber-600' : 'text-red-500'}`}>
                      {team.promedio.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Índice de cohesión</span><span className="font-medium">{(team.cohesion * 100).toFixed(0)}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Rango</span><span className="font-medium">{team.min.toFixed(1)} – {team.max.toFixed(1)}</span></div>
                  </div>
                  <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${team.cohesion * 100}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Cohesión del equipo</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
