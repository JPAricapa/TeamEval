import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, TrendingUp, Users, Activity, Target, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { analyticsApi, consolidationApi, exportApi } from '@/services/api'
import type { CourseAnalytics } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

const TABS = ['General', 'Criterios']

type BackendCourseAnalytics = {
  processId: string
  totalStudents?: number
  completionRate?: number
  mean?: number
  median?: number
  variance?: number
  standardDeviation?: number
  percentile25?: number
  percentile75?: number
  percentile90?: number
  scoreDistribution?: Record<string, number>
  criteriaAverages?: Record<string, { name?: string; average?: number; weight?: number }>
}

function isFrontendAnalytics(raw: BackendCourseAnalytics | CourseAnalytics): raw is CourseAnalytics {
  return 'stats' in raw
}

function normalizeAnalytics(raw: BackendCourseAnalytics | CourseAnalytics | null): CourseAnalytics | null {
  if (!raw) return null

  if (isFrontendAnalytics(raw) && raw.stats) {
    return {
      ...raw,
      histogram: raw.histogram ?? [],
      criteriaStats: raw.criteriaStats ?? [],
      teamCount: raw.teamCount ?? 0,
      studentCount: raw.studentCount ?? 0,
      completionRate: raw.completionRate ?? 0,
    }
  }

  const backendRaw: BackendCourseAnalytics = raw

  const histogram = Object.entries(backendRaw.scoreDistribution ?? {}).map(([range, count]) => ({
    range,
    count: Number(count ?? 0),
  }))

  const criteriaStats = Object.values(backendRaw.criteriaAverages ?? {}).map((criterion) => ({
    criteriaName: criterion.name ?? 'Sin criterio',
    mean: Number(criterion.average ?? 0),
    stdDev: 0,
  }))

  return {
    processId: backendRaw.processId,
    teamCount: 0,
    studentCount: backendRaw.totalStudents ?? 0,
    completionRate: backendRaw.completionRate ?? 0,
    histogram,
    criteriaStats,
    stats: {
      mean: backendRaw.mean ?? 0,
      median: backendRaw.median ?? 0,
      variance: backendRaw.variance ?? 0,
      stdDev: backendRaw.standardDeviation ?? 0,
      min: histogram.length > 0 ? 0 : 0,
      max: 5,
      p25: backendRaw.percentile25 ?? 0,
      p75: backendRaw.percentile75 ?? 0,
      p90: backendRaw.percentile90 ?? 0,
      count: backendRaw.totalStudents ?? 0,
    },
  }
}

export function AnalyticsPage() {
  const { processId } = useParams()
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [downloading, setDownloading] = useState<'excel' | 'csv' | 'pdf' | null>(null)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (!processId) return
    setLoading(true)
    setError('')
    setDownloadError('')
    Promise.resolve()
      .then(() => consolidationApi.consolidate(processId).catch(() => null))
      .then(() => analyticsApi.getCourse(processId))
      .then(r => setAnalytics(normalizeAnalytics(r.data.data ?? null)))
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(msg ?? 'No se pudo cargar la analítica.')
        setAnalytics(null)
      })
      .finally(() => setLoading(false))
  }, [processId])

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    if (!processId) return

    setDownloading(format)
    setDownloadError('')

    try {
      await exportApi[format](processId)
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : 'No se pudo descargar el archivo.')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Cargando analítica...
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/teacher/evaluations/${processId}`)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />Volver
        </Button>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'Aún no hay datos de analítica disponibles para este proceso.'}
        </div>
      </div>
    )
  }

  const { stats, criteriaStats, histogram } = analytics
  const radarData = criteriaStats.map(c => ({ subject: c.criteriaName.split(' ')[0], value: c.mean, fullMark: 5 }))

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/teacher/evaluations/${processId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="page-title">Analítica del Proceso</h1>
          <p className="page-subtitle">
            {analytics.studentCount} estudiantes
            {analytics.teamCount > 0 ? ` · ${analytics.teamCount} equipos` : ''}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => handleExport('excel')}
            disabled={downloading !== null}>
            {downloading === 'excel'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />}
            Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => handleExport('csv')}
            disabled={downloading !== null}>
            {downloading === 'csv'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />}
            CSV
          </Button>
          <Button size="sm" className="gap-1.5"
            onClick={() => handleExport('pdf')}
            disabled={downloading !== null}>
            {downloading === 'pdf'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />}
            PDF
          </Button>
        </div>
      </div>

      {downloadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {downloadError}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Promedio General" value={stats.mean.toFixed(2)} icon={TrendingUp} color="blue" subtitle={`Mediana: ${stats.median.toFixed(2)}`} />
        <StatCard title="Desv. Estándar" value={stats.stdDev.toFixed(2)} icon={Activity} color="purple" subtitle={`Varianza: ${stats.variance.toFixed(2)}`} />
        <StatCard title="Completitud" value={`${Math.round(analytics.completionRate * 100)}%`} icon={Target} color="green" subtitle={`${analytics.studentCount} estudiantes`} />
        <StatCard title="P25 / P75" value={`${stats.p25.toFixed(1)} / ${stats.p75.toFixed(1)}`} icon={Users} color="amber" subtitle={`Mín: ${stats.min} · Máx: ${stats.max}`} />
      </div>

      {/* Tabs */}
      <div className="flex w-full gap-1 rounded-lg bg-gray-100 p-1 sm:w-fit">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`flex-1 rounded-md px-5 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none ${tab === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" name="Estudiantes" fill="#0b65b9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {histogram.length === 0 && (
                <p className="text-sm text-gray-500 text-center mt-3">Aún no hay puntajes consolidados para graficar.</p>
              )}
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
                  <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
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
              <CardDescription>Puntaje promedio (escala 1-5)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} tickCount={6} />
                  <Radar name="Promedio" dataKey="value" stroke="#0b65b9" fill="#0b65b9" fillOpacity={0.22} strokeWidth={2} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [v.toFixed(2), 'Promedio']} />
                </RadarChart>
              </ResponsiveContainer>
              {radarData.length === 0 && (
                <p className="text-sm text-gray-500 text-center mt-3">No hay datos por criterio disponibles.</p>
              )}
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
                {criteriaStats.length === 0 && (
                  <p className="text-sm text-gray-500">No hay criterios consolidados todavía.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}
