import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, FileText, FolderKanban, Loader2, Lock, Play, Plus, Search, Trash2, Users, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { coursesApi, evaluationsApi, groupsApi, usersApi } from '@/services/api'

type CourseDetail = {
  id: string
  name: string
  code: string
  credits?: number
  description?: string
  isActive: boolean
  teacher?: { firstName: string; lastName: string; email: string }
  program?: { name: string }
  period?: { name: string; code: string }
  groups?: Array<{
    id: string
    name: string
    members?: Array<{ user?: { id: string; firstName: string; lastName: string; email?: string } }>
    teams?: Array<{
      id: string
      name: string
      members?: Array<{ user?: { id: string; firstName: string; lastName: string } }>
    }>
  }>
  courseRubrics?: Array<{ evaluationType?: string | null; rubric?: { id: string; name: string; version: number; isActive: boolean } }>
  evaluationProcesses?: Array<{ id: string; name: string; status: string }>
}

type StudentOption = {
  id: string
  firstName: string
  lastName: string
  email: string
}

function getAutomaticPeriodLabel(date = new Date()) {
  const year = date.getFullYear()
  const semester = date.getMonth() <= 4 ? 1 : 2
  return `Semestre ${year}-${semester}`
}

function inferRubricType(name?: string) {
  const normalized = (name ?? '').toLowerCase()
  if (normalized.includes('auto')) return 'Autoevaluación'
  if (normalized.includes('peer') || normalized.includes('par') || normalized.includes('coevalu')) return 'Pares'
  if (normalized.includes('docente') || normalized.includes('teacher') || normalized.includes('hetero')) return 'Docente'
  return 'Sin tipo'
}

export function CourseDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal crear grupo
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupError, setGroupError] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Modal agregar integrante
  const [addingMemberGroupId, setAddingMemberGroupId] = useState<string | null>(null)
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [savingMember, setSavingMember] = useState(false)
  const [memberError, setMemberError] = useState('')

  // Otros
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)
  const [updatingProcessId, setUpdatingProcessId] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  const automaticPeriodLabel = getAutomaticPeriodLabel()

  const loadCourse = () => {
    if (!courseId) return
    setLoading(true)
    setError('')
    coursesApi.getById(courseId)
      .then((r) => setCourse(r.data.data ?? null))
      .catch(() => setError('No se pudo cargar el detalle del curso.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCourse() }, [courseId]) // eslint-disable-line react-hooks/exhaustive-deps

  const openAddMember = (groupId: string) => {
    setStudentSearch('')
    setMemberError('')
    setAddingMemberGroupId(groupId)
    usersApi.getAll({ limit: 100, role: 'STUDENT' })
      .then((r) => setAllStudents(r.data.data ?? []))
      .catch(() => setMemberError('No se pudo cargar la lista de estudiantes.'))
  }

  const closeAddMember = () => {
    setAddingMemberGroupId(null)
    setAllStudents([])
    setStudentSearch('')
    setMemberError('')
  }

  // Estudiantes ya en el grupo activo
  const currentGroupMembers = (() => {
    if (!addingMemberGroupId || !course) return new Set<string>()
    const group = course.groups?.find(g => g.id === addingMemberGroupId)
    return new Set((group?.members ?? []).map(m => m.user?.id).filter(Boolean) as string[])
  })()

  const filteredStudents = allStudents.filter((s) => {
    const inGroup = currentGroupMembers.has(s.id)
    const matchSearch = `${s.firstName} ${s.lastName} ${s.email}`
      .toLowerCase()
      .includes(studentSearch.toLowerCase())
    return !inGroup && matchSearch
  })

  const handleAddMember = async (student: StudentOption) => {
    if (!addingMemberGroupId) return
    setSavingMember(true)
    setMemberError('')
    try {
      await groupsApi.addMember(addingMemberGroupId, student.id)
      loadCourse()
      // Actualizar miembros localmente para que desaparezca del listado
      setCourse(prev => {
        if (!prev) return prev
        return {
          ...prev,
          groups: prev.groups?.map(g =>
            g.id !== addingMemberGroupId ? g : {
              ...g,
              members: [...(g.members ?? []), { user: student }]
            }
          )
        }
      })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMemberError(msg ?? 'No se pudo agregar el integrante.')
    } finally {
      setSavingMember(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!course?.id || !groupName.trim()) {
      setGroupError('Escribe el nombre del grupo.')
      return
    }
    setCreatingGroup(true)
    setGroupError('')
    try {
      await groupsApi.create({ courseId: course.id, name: groupName.trim() })
      setGroupName('')
      setShowGroupModal(false)
      loadCourse()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setGroupError(msg ?? 'No se pudo crear el grupo.')
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleRemoveMember = async (groupId: string, userId: string, name: string) => {
    if (!window.confirm(`¿Quitar a ${name} de este grupo?`)) return
    setRemovingMemberId(`${groupId}:${userId}`)
    try {
      await groupsApi.removeMember(groupId, userId)
      loadCourse()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo quitar el integrante.')
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handleDeleteGroup = async (groupId: string, name: string) => {
    if (!window.confirm(`¿Sí deseas borrar el grupo "${name}"?`)) return
    setDeletingGroupId(groupId)
    try {
      await groupsApi.delete(groupId)
      loadCourse()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo borrar el grupo.')
    } finally {
      setDeletingGroupId(null)
    }
  }

  const handleActivateProcess = async (processId: string) => {
    setUpdatingProcessId(processId)
    setError('')
    try {
      await evaluationsApi.activateProcess(processId)
      loadCourse()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo activar el proceso de evaluación.')
    } finally {
      setUpdatingProcessId(null)
    }
  }

  const handleDeactivateProcess = async (processId: string) => {
    if (!window.confirm('¿Cerrar este proceso? Una vez cerrado no se pueden enviar más evaluaciones.')) return
    setUpdatingProcessId(processId)
    setError('')
    try {
      await evaluationsApi.closeProcess(processId)
      loadCourse()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo cerrar el proceso de evaluación.')
    } finally {
      setUpdatingProcessId(null)
    }
  }

  const handleDeleteProcess = async (processId: string, name: string) => {
    if (!window.confirm(`¿Eliminar el proceso "${name}"? Esta acción no se puede deshacer.`)) return
    setUpdatingProcessId(processId)
    setError('')
    try {
      await evaluationsApi.deleteProcess(processId)
      loadCourse()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo eliminar el proceso.')
    } finally {
      setUpdatingProcessId(null)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/teacher/courses')}>
          <ArrowLeft className="w-4 h-4" /> Volver a cursos
        </Button>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error || 'El curso no existe o no está disponible.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/courses')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
            <Badge variant={course.isActive ? 'success' : 'secondary'}>
              {course.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">{course.code}{course.description ? ` · ${course.description}` : ''}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5 flex items-center gap-3">
          <BookOpen className="w-9 h-9 rounded-xl bg-primary/10 p-2 text-primary" />
          <div><p className="text-xs text-gray-500">Créditos</p><p className="text-xl font-bold text-gray-900">{course.credits ?? 0}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <Users className="w-9 h-9 rounded-xl bg-blue-100 p-2 text-blue-600" />
          <div><p className="text-xs text-gray-500">Grupos</p><p className="text-xl font-bold text-gray-900">{course.groups?.length ?? 0}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <FileText className="w-9 h-9 rounded-xl bg-emerald-100 p-2 text-emerald-600" />
          <div><p className="text-xs text-gray-500">Rúbricas</p><p className="text-xl font-bold text-gray-900">{course.courseRubrics?.length ?? 0}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <FolderKanban className="w-9 h-9 rounded-xl bg-amber-100 p-2 text-amber-600" />
          <div><p className="text-xs text-gray-500">Procesos</p><p className="text-xl font-bold text-gray-900">{course.evaluationProcesses?.length ?? 0}</p></div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader><CardTitle>Información del curso</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-gray-400">Docente</p>
              <p className="font-medium text-gray-900">{course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : 'Sin asignar'}</p>
              {course.teacher?.email && <p className="text-gray-500">{course.teacher.email}</p>}
            </div>
            <div>
              <p className="text-gray-400">Programa</p>
              <p className="font-medium text-gray-900">{course.program?.name ?? 'Ingeniería Electrónica'}</p>
            </div>
            <div>
              <p className="text-gray-400">Período</p>
              <p className="font-medium text-gray-900">{course.period?.name ?? automaticPeriodLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Grupos de trabajo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500">
              Crea los grupos del curso y luego asocia los estudiantes que ya estén registrados en el sistema.
              Para crear estudiantes nuevos, usa <strong>Gestión de Usuarios</strong>.
            </p>
            <Button className="gap-2" onClick={() => { setGroupError(''); setGroupName(''); setShowGroupModal(true) }}>
              <Plus className="w-4 h-4" /> Crear grupo
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Grupos e integrantes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(course.groups ?? []).map((group) => (
            <div key={group.id} className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{group.name}</p>
                  <p className="text-xs text-gray-500">{group.members?.length ?? 0} integrantes</p>
                </div>
                <Button
                  variant="outline"
                  className="gap-2 text-red-600 hover:text-red-700"
                  onClick={() => handleDeleteGroup(group.id, group.name)}
                  disabled={deletingGroupId === group.id}
                >
                  {deletingGroupId === group.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Borrar grupo
                </Button>
              </div>

              <div className="mt-4 rounded-xl bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-gray-900">Integrantes</p>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openAddMember(group.id)}>
                    <Plus className="w-3.5 h-3.5" /> Agregar estudiante
                  </Button>
                </div>
                <div className="space-y-2">
                  {(group.members ?? []).map((member) => {
                    const key = `${group.id}:${member.user?.id}`
                    const fullName = member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Integrante'
                    return (
                      <div key={member.user?.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{fullName}</p>
                          {member.user?.email && <p className="text-xs text-gray-500 truncate">{member.user.email}</p>}
                        </div>
                        {member.user?.id && (
                          <button
                            type="button"
                            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 flex-shrink-0"
                            onClick={() => handleRemoveMember(group.id, member.user!.id, fullName)}
                            disabled={removingMemberId === key}
                          >
                            {removingMemberId === key ? 'Quitando...' : 'Quitar'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {(group.members ?? []).length === 0 && (
                    <p className="text-sm text-gray-400">Sin integrantes. Usa el botón para agregar estudiantes existentes.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {(course.groups ?? []).length === 0 && (
            <p className="text-sm text-gray-500">Este curso todavía no tiene grupos creados.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Rúbricas asociadas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(course.courseRubrics ?? []).map((item) => (
              <div key={item.rubric?.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{item.rubric?.name ?? 'Rúbrica sin nombre'}</p>
                    <p className="text-xs text-gray-500">
                      {item.evaluationType === 'SELF' ? 'Autoevaluación'
                        : item.evaluationType === 'PEER' ? 'Pares'
                        : item.evaluationType === 'TEACHER' ? 'Docente'
                        : inferRubricType(item.rubric?.name)}
                      {' · '}Versión {item.rubric?.version ?? 1}
                    </p>
                  </div>
                  <Badge variant={item.rubric?.isActive ? 'success' : 'secondary'}>
                    {item.rubric?.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </div>
            ))}
            {(course.courseRubrics ?? []).length === 0 && (
              <p className="text-sm text-gray-500">No hay rúbricas vinculadas a este curso.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Procesos de evaluación</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(course.evaluationProcesses ?? []).map((process) => (
              <div key={process.id} className="rounded-xl border border-gray-100 p-4 hover:border-primary/30 hover:bg-blue-50/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{process.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Estado actual del proceso</p>
                  </div>
                  <Badge variant={process.status === 'ACTIVE' ? 'success' : process.status === 'DRAFT' ? 'secondary' : 'warning'}>
                    {process.status}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/teacher/evaluations/${process.id}`)}>
                    Ver detalle
                  </Button>
                  {process.status === 'DRAFT' && (
                    <Button size="sm" className="gap-1" onClick={() => handleActivateProcess(process.id)} disabled={updatingProcessId === process.id}>
                      {updatingProcessId === process.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      Activar proceso
                    </Button>
                  )}
                  {process.status === 'ACTIVE' && (
                    <Button size="sm" variant="outline" className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleDeactivateProcess(process.id)} disabled={updatingProcessId === process.id}>
                      {updatingProcessId === process.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                      Cerrar proceso
                    </Button>
                  )}
                  {(process.status === 'DRAFT' || process.status === 'ACTIVE') && (
                    <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeleteProcess(process.id, process.name)} disabled={updatingProcessId === process.id}>
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {(course.evaluationProcesses ?? []).length === 0 && (
              <p className="text-sm text-gray-500">No hay procesos de evaluación creados para este curso.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Modal: Crear grupo ── */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Crear grupo</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Luego podrás agregar estudiantes desde el listado del grupo.
                </p>
              </div>
              <button type="button" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" onClick={() => setShowGroupModal(false)} disabled={creatingGroup}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Nombre del grupo</label>
              <Input
                placeholder="Ejemplo: Grupo 1"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                autoFocus
              />
            </div>

            {groupError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {groupError}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowGroupModal(false)} disabled={creatingGroup}>
                Cancelar
              </Button>
              <Button className="flex-1 gap-2" onClick={handleCreateGroup} disabled={creatingGroup}>
                {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear grupo'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Agregar estudiante existente ── */}
      {addingMemberGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 p-5 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Agregar estudiante</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Busca y selecciona un estudiante ya registrado en el sistema.
                </p>
              </div>
              <button type="button" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" onClick={closeAddMember} disabled={savingMember}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o correo..."
                  className="pl-9"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {memberError && (
              <div className="mx-5 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {memberError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-1">
              {filteredStudents.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  {allStudents.length === 0
                    ? 'Cargando estudiantes...'
                    : studentSearch
                    ? 'No se encontraron estudiantes con ese criterio.'
                    : 'Todos los estudiantes ya están en este grupo.'}
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    disabled={savingMember}
                    onClick={() => handleAddMember(student)}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-left hover:border-primary/40 hover:bg-blue-50/30 transition-colors disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{student.email}</p>
                    </div>
                    <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-gray-100 p-5 pt-3">
              <Button variant="outline" className="w-full" onClick={closeAddMember} disabled={savingMember}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
