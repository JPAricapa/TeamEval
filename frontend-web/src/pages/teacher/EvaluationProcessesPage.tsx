import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, Lock, BarChart3, Loader2, Clock, Users, Trash2, BookOpen, FolderKanban, AlertTriangle, Link2, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { coursesApi, evaluationsApi, rubricsApi, exportApi } from '@/services/api'
import type { Course, EvaluationProcess, Rubric } from '@/types'

type CourseWithRubrics = Course & {
  courseRubrics?: Array<{ evaluationType?: string | null; rubric?: Rubric }>
}

type RubricAssignments = {
  selfRubric: Rubric | null
  peerRubric: Rubric | null
  teacherRubric: Rubric | null
}

const STATUS = {
  DRAFT:    { label: 'Borrador',  variant: 'secondary' as const },
  ACTIVE:   { label: 'Activo',    variant: 'success'   as const },
  CLOSED:   { label: 'Cerrado',   variant: 'warning'   as const },
  ARCHIVED: { label: 'Archivado', variant: 'info'      as const },
}

function computeProgress(proc: EvaluationProcess) {
  const total = proc.totalCount ?? 0
  const completed = proc.completedCount ?? 0
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

function inferRubricType(rubric?: Rubric | null) {
  const normalized = (rubric?.name ?? '').toLowerCase()
  if (normalized.includes('auto')) return 'SELF'
  if (normalized.includes('peer') || normalized.includes('par') || normalized.includes('coevalu')) return 'PEER'
  if (normalized.includes('docente') || normalized.includes('teacher') || normalized.includes('hetero')) return 'TEACHER'
  return null
}

function mapCourseRubrics(course: CourseWithRubrics | null): RubricAssignments {
  const assignments: RubricAssignments = {
    selfRubric: null,
    peerRubric: null,
    teacherRubric: null,
  }

  for (const item of course?.courseRubrics ?? []) {
    const rubric = item.rubric
    if (!rubric) continue
    const type = item.evaluationType ?? inferRubricType(rubric)
    if (type === 'SELF' && !assignments.selfRubric) assignments.selfRubric = rubric
    if (type === 'PEER' && !assignments.peerRubric) assignments.peerRubric = rubric
    if (type === 'TEACHER' && !assignments.teacherRubric) assignments.teacherRubric = rubric
  }

  return assignments
}

function inferRubricTypeFromName(name: string): 'SELF' | 'PEER' | 'TEACHER' | null {
  const n = name.toLowerCase()
  if (n.includes('auto')) return 'SELF'
  if (n.includes('par') || n.includes('peer') || n.includes('coevalu')) return 'PEER'
  if (n.includes('docente') || n.includes('teacher') || n.includes('hetero')) return 'TEACHER'
  return null
}

export function EvaluationProcessesPage() {
  const navigate = useNavigate()
  const [processes, setProcesses] = useState<EvaluationProcess[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [allRubrics, setAllRubrics] = useState<Rubric[]>([])
  const [rubricAssignments, setRubricAssignments] = useState<RubricAssignments>({
    selfRubric: null,
    peerRubric: null,
    teacherRubric: null,
  })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    selfWeight: 0.2,
    peerWeight: 0.5,
    teacherWeight: 0.3,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    courseId: '',
  })
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [confirmDeleteProcess, setConfirmDeleteProcess] = useState<EvaluationProcess | null>(null)

  // Selección manual de rúbricas cuando el curso no las tiene asociadas
  const [rubricSelections, setRubricSelections] = useState<{
    selfRubricId: string
    peerRubricId: string
    teacherRubricId: string
  }>({ selfRubricId: '', peerRubricId: '', teacherRubricId: '' })
  const [associating, setAssociating] = useState(false)
  const [associateError, setAssociateError] = useState('')

  useEffect(() => {
    Promise.all([evaluationsApi.getProcesses(), coursesApi.getAll(), rubricsApi.getAll()])
      .then(([processRes, courseRes, rubricRes]) => {
        const nextProcesses = processRes.data.data ?? []
        const nextCourses = courseRes.data.data ?? []
        const nextRubrics = rubricRes.data.data ?? []
        setProcesses(nextProcesses)
        setCourses(nextCourses)
        setAllRubrics(nextRubrics)
        setForm((current) => ({
          ...current,
          courseId: current.courseId || nextCourses[0]?.id || '',
        }))
      })
      .catch(() => setError('No se pudo cargar la configuración del módulo.'))
      .finally(() => setLoading(false))
  }, [])

  const refreshCourseRubrics = (courseId: string) => {
    if (!courseId) {
      setRubricAssignments({ selfRubric: null, peerRubric: null, teacherRubric: null })
      return
    }
    coursesApi.getById(courseId)
      .then((response) => {
        const course = (response.data.data ?? null) as CourseWithRubrics | null
        setRubricAssignments(mapCourseRubrics(course))
      })
      .catch(() => {
        setRubricAssignments({ selfRubric: null, peerRubric: null, teacherRubric: null })
      })
  }

  useEffect(() => {
    refreshCourseRubrics(form.courseId)
    setRubricSelections({ selfRubricId: '', peerRubricId: '', teacherRubricId: '' })
    setAssociateError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.courseId])

  // Pre-sugerir rúbricas según su nombre cuando cambian las disponibles o el curso
  useEffect(() => {
    if (allRubrics.length === 0) return
    setRubricSelections(prev => ({
      selfRubricId: prev.selfRubricId || allRubrics.find(r => inferRubricTypeFromName(r.name) === 'SELF')?.id || '',
      peerRubricId: prev.peerRubricId || allRubrics.find(r => inferRubricTypeFromName(r.name) === 'PEER')?.id || '',
      teacherRubricId: prev.teacherRubricId || allRubrics.find(r => inferRubricTypeFromName(r.name) === 'TEACHER')?.id || '',
    }))
  }, [allRubrics, form.courseId])

  const handleAssociateRubrics = async () => {
    if (!form.courseId) return
    setAssociating(true)
    setAssociateError('')
    try {
      const tasks: Promise<unknown>[] = []
      if (!rubricAssignments.selfRubric && rubricSelections.selfRubricId)
        tasks.push(coursesApi.assignRubric(form.courseId, rubricSelections.selfRubricId, 'SELF'))
      if (!rubricAssignments.peerRubric && rubricSelections.peerRubricId)
        tasks.push(coursesApi.assignRubric(form.courseId, rubricSelections.peerRubricId, 'PEER'))
      if (!rubricAssignments.teacherRubric && rubricSelections.teacherRubricId)
        tasks.push(coursesApi.assignRubric(form.courseId, rubricSelections.teacherRubricId, 'TEACHER'))
      await Promise.all(tasks)
      refreshCourseRubrics(form.courseId)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setAssociateError(msg ?? 'No se pudieron asociar las rúbricas.')
    } finally {
      setAssociating(false)
    }
  }

  const handleCreate = async () => {
    if (!form.courseId || !rubricAssignments.selfRubric || !rubricAssignments.peerRubric || !rubricAssignments.teacherRubric) {
      setError('El curso debe tener asociadas las rúbricas de autoevaluación, pares y docente.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const r = await evaluationsApi.createProcess(form)
      setProcesses(prev => [r.data.data, ...prev])
      setShowModal(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo crear el proceso.')
    } finally {
      setSaving(false)
    }
  }

  const handleActivate = async (id: string) => {
    setActivating(id)
    setError('')
    try {
      await evaluationsApi.activateProcess(id)
      setProcesses(prev => prev.map(p => p.id === id ? { ...p, status: 'ACTIVE' as const } : p))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo activar el proceso.')
    } finally {
      setActivating(null)
    }
  }

  const handleClose = async (id: string) => {
    const confirmed = window.confirm('¿Cerrar este proceso? Una vez cerrado no se pueden enviar más evaluaciones.')
    if (!confirmed) return
    try {
      await evaluationsApi.closeProcess(id)
      setProcesses(prev => prev.map(p => p.id === id ? { ...p, status: 'CLOSED' as const } : p))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo cerrar el proceso.')
    }
  }

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteProcess) return
    const id = confirmDeleteProcess.id
    setDeleting(id)
    setError('')
    setConfirmDeleteProcess(null)
    try {
      await evaluationsApi.deleteProcess(id)
      setProcesses(prev => prev.filter(p => p.id !== id))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo eliminar el proceso.')
    } finally {
      setDeleting(null)
    }
  }

  const handleExport = async (processId: string, format: 'excel' | 'pdf') => {
    const downloadKey = `${processId}:${format}`
    setDownloading(downloadKey)
    setError('')

    try {
      await exportApi[format](processId)
    } catch (err: unknown) {
      const fallback = format === 'excel'
        ? 'No se pudo descargar el archivo Excel.'
        : 'No se pudo descargar el archivo PDF.'
      setError(err instanceof Error ? err.message : fallback)
    } finally {
      setDownloading(null)
    }
  }

  const missingRubrics =
    !rubricAssignments.selfRubric || !rubricAssignments.peerRubric || !rubricAssignments.teacherRubric

  const canAssociate =
    (!rubricAssignments.selfRubric && rubricSelections.selfRubricId) ||
    (!rubricAssignments.peerRubric && rubricSelections.peerRubricId) ||
    (!rubricAssignments.teacherRubric && rubricSelections.teacherRubricId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procesos de Evaluación</h1>
          <p className="text-gray-500 mt-1 text-sm">{processes.length} procesos configurados</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2"><Plus className="w-4 h-4" /> Nuevo Proceso</Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {processes.map(proc => {
            const s = STATUS[proc.status]
            const pct = computeProgress(proc)
            const completed = proc.completedCount ?? 0
            const total = proc.totalCount ?? 0
            return (
              <Card key={proc.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm">{proc.name}</h3>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </div>
                      {proc.description && <p className="text-xs text-gray-500 mb-2">{proc.description}</p>}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                        {proc.course && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" /> {proc.course.name} ({proc.course.code})
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FolderKanban className="w-3.5 h-3.5" /> {proc.groupCount ?? 0} grupos
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {proc.studentCount ?? 0} estudiantes
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Autoev: {Math.round(proc.selfWeight * 100)}%</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Coev: {Math.round(proc.peerWeight * 100)}%</span>
                        <span>Docente: {Math.round(proc.teacherWeight * 100)}%</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="flex-1 h-1.5" />
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {completed}/{total} · {pct}% completado
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/teacher/evaluations/${proc.id}`)}>
                        Ver detalle
                      </Button>
                      {proc.status === 'DRAFT' && (
                        <Button size="sm" className="gap-1" onClick={() => handleActivate(proc.id)} disabled={activating === proc.id}>
                          {activating === proc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          Activar proceso
                        </Button>
                      )}
                      {proc.status === 'ACTIVE' && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => handleClose(proc.id)}>
                            <Lock className="w-3.5 h-3.5" /> Desactivar proceso
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1 text-primary"
                            onClick={() => navigate(`/teacher/analytics/${proc.id}`)}>
                            <BarChart3 className="w-3.5 h-3.5" /> Analítica
                          </Button>
                        </>
                      )}
                      {proc.status === 'CLOSED' && (
                        <>
                          <Button size="sm" className="gap-1" onClick={() => navigate(`/teacher/analytics/${proc.id}`)}>
                            <BarChart3 className="w-3.5 h-3.5" /> Ver analítica
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => handleExport(proc.id, 'excel')}
                            disabled={downloading !== null}>
                            {downloading === `${proc.id}:excel`
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Download className="w-3.5 h-3.5" />}
                            Excel
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-rose-700 border-rose-200 hover:bg-rose-50"
                            onClick={() => handleExport(proc.id, 'pdf')}
                            disabled={downloading !== null}>
                            {downloading === `${proc.id}:pdf`
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Download className="w-3.5 h-3.5" />}
                            PDF
                          </Button>
                        </>
                      )}
                      {proc.status !== 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setConfirmDeleteProcess(proc)}
                          disabled={deleting === proc.id}
                        >
                          {deleting === proc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {processes.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-sm text-gray-500">
                No hay procesos creados todavía.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {confirmDeleteProcess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">¿Eliminar este proceso?</h2>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 mb-4">
              <p className="text-sm font-medium text-gray-900">{confirmDeleteProcess.name}</p>
              {confirmDeleteProcess.course && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Curso: {confirmDeleteProcess.course.name} ({confirmDeleteProcess.course.code})
                </p>
              )}
              <div className="mt-1.5">
                <Badge variant={STATUS[confirmDeleteProcess.status].variant} className="text-xs">
                  {STATUS[confirmDeleteProcess.status].label}
                </Badge>
              </div>
            </div>

            {confirmDeleteProcess.status === 'CLOSED' && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mb-4 text-xs text-amber-800">
                <p className="font-semibold mb-1">Atención: este proceso ya fue cerrado</p>
                <p>Se eliminarán permanentemente todas las evaluaciones enviadas, puntajes y resultados consolidados asociados a este proceso.</p>
              </div>
            )}
            {confirmDeleteProcess.status === 'ARCHIVED' && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mb-4 text-xs text-amber-800">
                <p className="font-semibold mb-1">Atención: este proceso está archivado</p>
                <p>Se eliminarán permanentemente todos los datos históricos asociados a este proceso.</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteProcess(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                onClick={handleDeleteConfirmed}
              >
                Sí, eliminar proceso
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de creación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Nuevo Proceso de Evaluación</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre del proceso *</label>
                <input className="w-full h-10 rounded-lg border border-input px-3 text-sm" placeholder="Ej: Evaluación Parcial 1"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Curso *</label>
                <select
                  className="w-full h-10 rounded-lg border border-input px-3 text-sm bg-white"
                  value={form.courseId}
                  onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
                >
                  <option value="">Selecciona un curso</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rúbricas asociadas */}
              {form.courseId && (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Rúbricas de evaluación *</label>
                  <div className="rounded-lg border border-input bg-gray-50 p-3 space-y-2 text-sm">
                    {(
                      [
                        ['selfRubric', 'Autoevaluación', 'SELF', rubricSelections.selfRubricId, 'selfRubricId'],
                        ['peerRubric', 'Evaluación de pares', 'PEER', rubricSelections.peerRubricId, 'peerRubricId'],
                        ['teacherRubric', 'Evaluación docente', 'TEACHER', rubricSelections.teacherRubricId, 'teacherRubricId'],
                      ] as const
                    ).map(([key, label, _type, selId, selKey]) => {
                      const assigned = rubricAssignments[key]
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-700">{label}:</span>
                            {assigned ? (
                              <span className="text-gray-900 text-xs">{assigned.name}</span>
                            ) : (
                              <span className="text-amber-600 text-xs">Sin asignar</span>
                            )}
                          </div>
                          {!assigned && (
                            <select
                              className="mt-1.5 w-full h-8 rounded-md border border-amber-200 bg-white px-2 text-xs"
                              value={selId}
                              onChange={e => setRubricSelections(s => ({ ...s, [selKey]: e.target.value }))}
                            >
                              <option value="">— Seleccionar rúbrica —</option>
                              {allRubrics.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {missingRubrics && (
                    <div className="mt-2 space-y-2">
                      {associateError && (
                        <p className="text-xs text-red-600">{associateError}</p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={handleAssociateRubrics}
                        disabled={associating || !canAssociate}
                      >
                        {associating
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Link2 className="w-3.5 h-3.5" />
                        }
                        Asociar rúbricas seleccionadas al curso
                      </Button>
                      <p className="text-xs text-amber-600">
                        Selecciona una rúbrica para cada tipo faltante y haz clic en "Asociar" para vincularlas al curso.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
                <textarea className="w-full rounded-lg border border-input px-3 py-2 text-sm resize-none" rows={2}
                  placeholder="Descripción opcional..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha de inicio *</label>
                  <input
                    type="date"
                    className="w-full h-10 rounded-lg border border-input px-3 text-sm"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha de cierre *</label>
                  <input
                    type="date"
                    className="w-full h-10 rounded-lg border border-input px-3 text-sm"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Ponderación de evaluaciones</label>
                <div className="grid grid-cols-3 gap-3">
                  {([['selfWeight', 'Autoevaluación'], ['peerWeight', 'Coevaluación'], ['teacherWeight', 'Docente']] as const).map(([key, label]) => (
                    <div key={key} className="text-center">
                      <div className="text-lg font-bold text-primary">{Math.round(form[key] * 100)}%</div>
                      <div className="text-xs text-gray-500">{label}</div>
                      <input type="range" min={0} max={100} step={5}
                        value={Math.round(form[key] * 100)}
                        onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) / 100 }))}
                        className="w-full mt-1 accent-primary" />
                    </div>
                  ))}
                </div>
                {Math.round((form.selfWeight + form.peerWeight + form.teacherWeight) * 100) !== 100 && (
                  <p className="text-xs text-red-500 mt-2">⚠ La suma debe ser 100% (actual: {Math.round((form.selfWeight + form.peerWeight + form.teacherWeight) * 100)}%)</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={saving || missingRubrics || Math.round((form.selfWeight + form.peerWeight + form.teacherWeight) * 100) !== 100}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear proceso'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
