import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Users, CheckCircle2, BarChart3, Download, Loader2,
  Play, Lock, FolderKanban, ClipboardList
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { consolidationApi, evaluationsApi, exportApi } from '@/services/api'
import { toTitleCase } from '@/lib/utils'

type GroupMember = {
  user?: { id: string; firstName: string; lastName: string; email?: string }
}

type GroupSummary = {
  id: string
  name: string
  members?: GroupMember[]
}

type Evaluation = {
  id: string
  type: 'SELF' | 'PEER' | 'TEACHER'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  evaluator?: { id?: string; firstName: string; lastName: string }
  evaluated?: { id?: string; firstName: string; lastName: string }
}

type ProcessDetail = {
  id: string
  name: string
  description?: string
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED'
  selfWeight: number
  peerWeight: number
  teacherWeight: number
  includeSelf: boolean
  includePeer: boolean
  includeTeacher: boolean
  startDate?: string
  endDate?: string
  course?: {
    id: string
    name: string
    code: string
    groups?: GroupSummary[]
  }
  legacyRubric?: { name: string; version: number }
  selfRubric?: { name: string; version: number }
  peerRubric?: { name: string; version: number }
  teacherRubric?: { name: string; version: number }
  evaluations?: Evaluation[]
}

const statusLabel: Record<ProcessDetail['status'], { label: string; variant: 'secondary' | 'success' | 'warning' | 'info' }> = {
  DRAFT:    { label: 'Borrador',  variant: 'secondary' },
  ACTIVE:   { label: 'Activo',    variant: 'success'   },
  CLOSED:   { label: 'Cerrado',   variant: 'warning'   },
  ARCHIVED: { label: 'Archivado', variant: 'info'      },
}

const evalTypeLabel: Record<Evaluation['type'], string> = {
  SELF: 'Autoevaluación',
  PEER: 'Coevaluación',
  TEACHER: 'Docente',
}

const evalStatusBadge: Record<Evaluation['status'], 'secondary' | 'success' | 'warning'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'secondary',
  COMPLETED: 'success',
}

const evalStatusLabel: Record<Evaluation['status'], string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
}

function formatName(person?: { firstName: string; lastName: string }) {
  if (!person) return '—'
  return `${toTitleCase(person.firstName)} ${toTitleCase(person.lastName)}`
}

function scoreColor(s: number) {
  if (s >= 4.5) return 'text-emerald-600 bg-emerald-50'
  if (s >= 3.5) return 'text-blue-600 bg-blue-50'
  if (s >= 2.5) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

export function ProcessDetailPage() {
  const { processId } = useParams()
  const navigate = useNavigate()
  const [process, setProcess] = useState<ProcessDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [results, setResults] = useState<Array<Record<string, unknown>>>([])
  const [resultsLoading, setResultsLoading] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null)

  const loadProcess = () => {
    if (!processId) return
    setLoading(true)
    evaluationsApi.getProcessById(processId)
      .then(r => {
        setProcess(r.data.data as ProcessDetail)
        setError('')
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(msg ?? 'No se pudo cargar el proceso.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProcess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processId])

  useEffect(() => {
    if (!processId || !process) return
    if (process.status !== 'CLOSED') return
    setResultsLoading(true)
    consolidationApi.consolidate(processId)
      .catch(() => null)
      .then(() => consolidationApi.getResults(processId))
      .then(r => setResults(r.data.data ?? []))
      .catch(() => setResults([]))
      .finally(() => setResultsLoading(false))
  }, [processId, process])

  const handleActivate = async () => {
    if (!processId) return
    setActionBusy(true)
    setError('')
    try {
      await evaluationsApi.activateProcess(processId)
      loadProcess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo activar el proceso.')
    } finally {
      setActionBusy(false)
    }
  }

  const handleClose = async () => {
    if (!processId) return
    const confirmed = window.confirm('¿Cerrar este proceso? Una vez cerrado no se pueden enviar más evaluaciones.')
    if (!confirmed) return
    setActionBusy(true)
    setError('')
    try {
      await evaluationsApi.closeProcess(processId)
      loadProcess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo cerrar el proceso.')
    } finally {
      setActionBusy(false)
    }
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!processId) return
    setDownloading(format)
    setError('')

    try {
      await exportApi[format](processId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el archivo.')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }

  if (!process) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/teacher/evaluations')}>
          <ArrowLeft className="w-4 h-4" /> Volver a procesos
        </Button>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error || 'El proceso no existe o no está disponible.'}
        </div>
      </div>
    )
  }

  const groups = process.course?.groups ?? []
  const totalStudents = groups.reduce((sum, g) => sum + (g.members?.length ?? 0), 0)
  const evaluations = process.evaluations ?? []
  const completed = evaluations.filter(e => e.status === 'COMPLETED').length
  const total = evaluations.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const status = statusLabel[process.status]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/evaluations')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{process.name}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {process.course ? `${process.course.name} (${process.course.code})` : 'Sin curso'}
            {[process.legacyRubric?.name, process.selfRubric?.name, process.peerRubric?.name, process.teacherRubric?.name].filter(Boolean).length > 0
              ? ` · ${[process.legacyRubric?.name, process.selfRubric?.name, process.peerRubric?.name, process.teacherRubric?.name].filter(Boolean).join(' · ')}`
              : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {process.status === 'DRAFT' && (
            <Button className="gap-1.5" onClick={handleActivate} disabled={actionBusy}>
              {actionBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Activar proceso
            </Button>
          )}
          {process.status === 'ACTIVE' && (
            <Button variant="outline" className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
              onClick={handleClose} disabled={actionBusy}>
              {actionBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Cerrar proceso
            </Button>
          )}
          {(process.status === 'ACTIVE' || process.status === 'CLOSED') && (
            <Button variant="outline" className="gap-1.5" onClick={() => navigate(`/teacher/analytics/${process.id}`)}>
              <BarChart3 className="w-4 h-4" /> Analítica
            </Button>
          )}
          {process.status === 'CLOSED' && (
            <>
              <Button variant="outline" className="gap-1.5 text-sm"
                onClick={() => handleExport('excel')}
                disabled={downloading !== null}>
                {downloading === 'excel'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Download className="w-4 h-4" />}
                Excel
              </Button>
              <Button variant="outline" className="gap-1.5 text-sm"
                onClick={() => handleExport('pdf')}
                disabled={downloading !== null}>
                {downloading === 'pdf'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Download className="w-4 h-4" />}
                PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <FolderKanban className="w-8 h-8 text-primary bg-primary/10 rounded-lg p-1.5" />
          <div><p className="text-xs text-gray-500">Grupos</p><p className="text-2xl font-bold">{groups.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600 bg-blue-50 rounded-lg p-1.5" />
          <div><p className="text-xs text-gray-500">Estudiantes</p><p className="text-2xl font-bold">{totalStudents}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-amber-600 bg-amber-50 rounded-lg p-1.5" />
          <div><p className="text-xs text-gray-500">Evaluaciones</p><p className="text-2xl font-bold">{total}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 bg-emerald-50 rounded-lg p-1.5" />
          <div className="flex-1">
            <p className="text-xs text-gray-500">Progreso</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{pct}%</p>
              <Progress value={pct} className="flex-1 h-1.5" />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{completed}/{total} completadas</p>
          </div>
        </CardContent></Card>
      </div>

      {process.status === 'DRAFT' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">El proceso aún no está activo</p>
          <p>
            Al activarlo se generarán automáticamente las evaluaciones para los {totalStudents} estudiantes de
            los {groups.length} grupos del curso. Revisa los grupos abajo antes de activar.
          </p>
        </div>
      )}

      {/* Grupos y estudiantes */}
      <Card>
        <CardHeader><CardTitle>Grupos del curso</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {groups.length === 0 ? (
            <p className="text-sm text-gray-500">
              Este curso aún no tiene grupos. Vuelve al detalle del curso para crearlos antes de activar el proceso.
            </p>
          ) : groups.map(group => (
            <div key={group.id} className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="font-medium text-gray-900">{group.name}</p>
                <Badge variant="secondary">{group.members?.length ?? 0} integrantes</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(group.members ?? []).map(m => (
                  <div key={m.user?.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {m.user?.firstName ? toTitleCase(m.user.firstName)[0] : '?'}{m.user?.lastName ? toTitleCase(m.user.lastName)[0] : ''}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{formatName(m.user)}</p>
                      {m.user?.email && <p className="text-xs text-gray-500 truncate">{m.user.email}</p>}
                    </div>
                  </div>
                ))}
                {(group.members ?? []).length === 0 && (
                  <p className="text-sm text-gray-500 col-span-full">Aún no hay integrantes en este grupo.</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Evaluaciones */}
      {process.status !== 'DRAFT' && (() => {
        // Mapa userId → nombre de grupo
        const userGroupMap: Record<string, string> = {}
        for (const g of groups) {
          for (const m of g.members ?? []) {
            if (m.user?.id) userGroupMap[m.user.id] = g.name
          }
        }
        // Agrupar evaluaciones por grupo del evaluado
        const byGroup: Record<string, typeof evaluations> = {}
        for (const ev of evaluations) {
          const groupName = (ev.evaluated?.id ? userGroupMap[ev.evaluated.id] : undefined) ?? 'Sin grupo'
          if (!byGroup[groupName]) byGroup[groupName] = []
          byGroup[groupName].push(ev)
        }
        return (
          <Card>
            <CardHeader><CardTitle>Evaluaciones generadas</CardTitle></CardHeader>
            <CardContent className="p-0">
              {evaluations.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">No hay evaluaciones generadas para este proceso.</p>
              ) : (
                Object.entries(byGroup).map(([groupName, evs]) => (
                  <div key={groupName}>
                    <div className="px-4 py-2 bg-gray-50 border-y border-gray-100 flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-gray-700">{groupName}</span>
                      <span className="text-xs text-gray-400">({evs.length} evaluaciones)</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                          <tr>
                            {['Tipo', 'Evaluador', 'Evaluado', 'Estado'].map(h => (
                              <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-2 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {evs.map(ev => (
                            <tr key={ev.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3"><Badge variant="info">{evalTypeLabel[ev.type]}</Badge></td>
                              <td className="px-4 py-3 text-gray-700">{formatName(ev.evaluator)}</td>
                              <td className="px-4 py-3 text-gray-700">{formatName(ev.evaluated)}</td>
                              <td className="px-4 py-3"><Badge variant={evalStatusBadge[ev.status]}>{evalStatusLabel[ev.status]}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Resultados consolidados (solo si cerrado) */}
      {process.status === 'CLOSED' && (
        <Card>
          <CardHeader><CardTitle>Resultados Consolidados</CardTitle></CardHeader>
          <CardContent className="p-0">
            {resultsLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Consolidando resultados...
              </div>
            ) : results.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">
                Aún no hay resultados consolidados disponibles para este proceso.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-y border-gray-100">
                    <tr>
                      {['Estudiante', 'Equipo', 'Autoev.', 'Coev.', 'Docente', 'Final'].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {results.map((r) => (
                      <tr key={String(r.id)} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {toTitleCase((r.student as { name?: string } | undefined)?.name ?? 'Sin nombre')}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {(r.team as { name?: string } | undefined)?.name ?? 'Sin equipo'}
                        </td>
                        <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-lg ${scoreColor(Number(r.selfScore ?? 0))}`}>{Number(r.selfScore ?? 0).toFixed(2)}</span></td>
                        <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-lg ${scoreColor(Number(r.peerScore ?? 0))}`}>{Number(r.peerScore ?? 0).toFixed(2)}</span></td>
                        <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-lg ${scoreColor(Number(r.teacherScore ?? 0))}`}>{Number(r.teacherScore ?? 0).toFixed(2)}</span></td>
                        <td className="px-4 py-3"><span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${scoreColor(Number(r.finalScore ?? 0))}`}>{Number(r.finalScore ?? 0).toFixed(2)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuración */}
      <Card>
        <CardHeader><CardTitle>Configuración del proceso</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="text-center rounded-xl bg-purple-50 p-3">
            <p className="text-2xl font-bold text-purple-700">{Math.round(process.selfWeight * 100)}%</p>
            <p className="text-xs text-gray-600 mt-0.5">Autoevaluación</p>
          </div>
          <div className="text-center rounded-xl bg-blue-50 p-3">
            <p className="text-2xl font-bold text-blue-700">{Math.round(process.peerWeight * 100)}%</p>
            <p className="text-xs text-gray-600 mt-0.5">Coevaluación</p>
          </div>
          <div className="text-center rounded-xl bg-amber-50 p-3">
            <p className="text-2xl font-bold text-amber-700">{Math.round(process.teacherWeight * 100)}%</p>
            <p className="text-xs text-gray-600 mt-0.5">Docente</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
