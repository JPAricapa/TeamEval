import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, FileText, FolderKanban, Loader2, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { coursesApi } from '@/services/api'

type CourseDetail = {
  id: string
  name: string
  code: string
  credits?: number
  description?: string
  isActive: boolean
  teacher?: { firstName: string; lastName: string; email: string }
  period?: { name: string; code: string }
  program?: { name: string }
  groups?: Array<{
    id: string
    name: string
    members?: Array<{ user?: { id: string; firstName: string; lastName: string } }>
    teams?: Array<{
      id: string
      name: string
      members?: Array<{ user?: { id: string; firstName: string; lastName: string } }>
    }>
  }>
  courseRubrics?: Array<{ rubric?: { id: string; name: string; version: number; isActive: boolean } }>
  evaluationProcesses?: Array<{ id: string; name: string; status: string }>
}

export function CourseDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!courseId) return
    coursesApi.getById(courseId)
      .then((r) => setCourse(r.data.data ?? null))
      .catch(() => setError('No se pudo cargar el detalle del curso.'))
      .finally(() => setLoading(false))
  }, [courseId])

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
          <div><p className="text-xs text-gray-500">Creditos</p><p className="text-xl font-bold text-gray-900">{course.credits ?? 0}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <Users className="w-9 h-9 rounded-xl bg-blue-100 p-2 text-blue-600" />
          <div><p className="text-xs text-gray-500">Grupos</p><p className="text-xl font-bold text-gray-900">{course.groups?.length ?? 0}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <FileText className="w-9 h-9 rounded-xl bg-emerald-100 p-2 text-emerald-600" />
          <div><p className="text-xs text-gray-500">Rubricas</p><p className="text-xl font-bold text-gray-900">{course.courseRubrics?.length ?? 0}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <FolderKanban className="w-9 h-9 rounded-xl bg-amber-100 p-2 text-amber-600" />
          <div><p className="text-xs text-gray-500">Procesos</p><p className="text-xl font-bold text-gray-900">{course.evaluationProcesses?.length ?? 0}</p></div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader><CardTitle>Informacion del curso</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-gray-400">Docente</p>
              <p className="font-medium text-gray-900">{course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : 'Sin asignar'}</p>
              {course.teacher?.email && <p className="text-gray-500">{course.teacher.email}</p>}
            </div>
            <div>
              <p className="text-gray-400">Programa</p>
              <p className="font-medium text-gray-900">{course.program?.name ?? 'No definido'}</p>
            </div>
            <div>
              <p className="text-gray-400">Periodo</p>
              <p className="font-medium text-gray-900">{course.period ? `${course.period.name} (${course.period.code})` : 'No definido'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Grupos y equipos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(course.groups ?? []).map((group) => (
              <div key={group.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{group.name}</p>
                    <p className="text-xs text-gray-500">
                      {group.members?.length ?? 0} integrantes · {group.teams?.length ?? 0} equipos
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(group.teams ?? []).map((team) => (
                    <div key={team.id} className="rounded-lg bg-gray-50 p-3">
                      <p className="text-sm font-semibold text-gray-900">{team.name}</p>
                      <div className="mt-2 space-y-1">
                        {(team.members ?? []).map((member) => (
                          <p key={member.user?.id} className="text-xs text-gray-600">
                            {member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Miembro sin datos'}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {(course.groups ?? []).length === 0 && (
              <p className="text-sm text-gray-500">Este curso todavia no tiene grupos creados.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Rubricas asociadas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(course.courseRubrics ?? []).map((item) => (
              <div key={item.rubric?.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{item.rubric?.name ?? 'Rubrica sin nombre'}</p>
                    <p className="text-xs text-gray-500">Version {item.rubric?.version ?? 1}</p>
                  </div>
                  <Badge variant={item.rubric?.isActive ? 'success' : 'secondary'}>
                    {item.rubric?.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </div>
            ))}
            {(course.courseRubrics ?? []).length === 0 && (
              <p className="text-sm text-gray-500">No hay rubricas vinculadas a este curso.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Procesos de evaluacion</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(course.evaluationProcesses ?? []).map((process) => (
              <button
                key={process.id}
                type="button"
                className="w-full rounded-xl border border-gray-100 p-4 text-left hover:border-primary/30 hover:bg-blue-50/20"
                onClick={() => navigate(`/teacher/evaluations/${process.id}`)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{process.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Estado actual del proceso</p>
                  </div>
                  <Badge variant={process.status === 'ACTIVE' ? 'success' : process.status === 'DRAFT' ? 'secondary' : 'warning'}>
                    {process.status}
                  </Badge>
                </div>
              </button>
            ))}
            {(course.evaluationProcesses ?? []).length === 0 && (
              <p className="text-sm text-gray-500">No hay procesos de evaluacion creados para este curso.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
