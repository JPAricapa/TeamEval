import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Users, Calendar, Plus, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { coursesApi, periodsApi, programsApi, usersApi } from '@/services/api'
import type { AcademicPeriod, Course, Program, User } from '@/types'

const MOCK_COURSES: Course[] = [
  { id: 'c1', name: 'Proyecto Integrador de Ingeniería I', code: 'INS-401', credits: 4, semester: 8, teacherId: 't1', periodId: 'p1', programId: 'prg1', isActive: true },
  { id: 'c2', name: 'Gestión de Proyectos de Software', code: 'INS-450', credits: 3, semester: 9, teacherId: 't1', periodId: 'p1', programId: 'prg1', isActive: true },
]

const colors = ['from-blue-500 to-blue-600', 'from-purple-500 to-purple-600', 'from-emerald-500 to-emerald-600', 'from-amber-500 to-amber-600']

export function CoursesPage() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [me, setMe] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    code: '',
    credits: 3,
    periodId: '',
    programId: '',
    description: '',
  })

  useEffect(() => {
    Promise.all([coursesApi.getAll(), periodsApi.getAll(), programsApi.getAll(), usersApi.getMe()])
      .then(([coursesRes, periodsRes, programsRes, meRes]) => {
        const nextCourses = coursesRes.data.data ?? []
        const nextPeriods = periodsRes.data.data ?? []
        const nextPrograms = programsRes.data.data ?? []
        const nextMe = meRes.data.data ?? null
        setCourses(nextCourses)
        setPeriods(nextPeriods)
        setPrograms(nextPrograms)
        setMe(nextMe)
        setForm((current) => ({
          ...current,
          periodId: current.periodId || nextPeriods[0]?.id || '',
          programId: current.programId || nextPrograms[0]?.id || '',
        }))
      })
      .catch(() => {
        setCourses(MOCK_COURSES)
        setError('No se pudo cargar toda la configuracion necesaria para crear cursos.')
      })
      .finally(() => setLoading(false))
  }, [])

  const openCreate = () => {
    setError('')
    setShowModal(true)
  }

  const handleCreate = async () => {
    if (!me?.id || !me?.institution?.id) {
      setError('No se pudo identificar tu institucion para crear el curso.')
      return
    }
    if (!form.name || !form.code || !form.periodId) {
      setError('Completa nombre, codigo y periodo.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const response = await coursesApi.create({
        institutionId: me.institution.id,
        teacherId: me.id,
        periodId: form.periodId,
        programId: form.programId || undefined,
        name: form.name,
        code: form.code,
        credits: form.credits,
        description: form.description || undefined,
      })
      setCourses((prev) => [response.data.data, ...prev])
      setShowModal(false)
      setForm({
        name: '',
        code: '',
        credits: 3,
        periodId: periods[0]?.id || '',
        programId: programs[0]?.id || '',
        description: '',
      })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo crear el curso.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Cursos</h1>
          <p className="text-gray-500 mt-1 text-sm">{courses.length} cursos asignados en el período actual</p>
        </div>
        <Button className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> Nuevo Curso</Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((course, i) => (
          <Card
            key={course.id}
            className="overflow-hidden hover:shadow-md transition-shadow group"
          >
            <div className={`h-2 bg-gradient-to-r ${colors[i % colors.length]}`} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center bg-primary/10`}>
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <Badge variant={course.isActive ? 'success' : 'secondary'}>
                  {course.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-primary transition-colors">
                {course.name}
              </h3>
              <p className="text-xs font-mono text-primary mt-1">{course.code}</p>
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> 12 estudiantes</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Semestre {course.semester}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                <span>{course.credits} créditos</span>
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => navigate(`/teacher/courses/${course.id}`)}
                >
                  Abrir curso
                </button>
              </div>
            </CardContent>
          </Card>
        ))}

        <button
          type="button"
          onClick={openCreate}
          className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors min-h-[180px]"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">Agregar curso</span>
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-bold text-gray-900">Nuevo curso</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Nombre *</label>
                  <input
                    className="h-10 w-full rounded-lg border border-input px-3 text-sm"
                    value={form.name}
                    onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Codigo *</label>
                  <input
                    className="h-10 w-full rounded-lg border border-input px-3 text-sm"
                    value={form.code}
                    onChange={(e) => setForm((current) => ({ ...current, code: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Periodo *</label>
                  <select
                    className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                    value={form.periodId}
                    onChange={(e) => setForm((current) => ({ ...current, periodId: e.target.value }))}
                  >
                    <option value="">Selecciona un periodo</option>
                    {periods.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.name} {period.code ? `(${period.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Programa</label>
                  <select
                    className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                    value={form.programId}
                    onChange={(e) => setForm((current) => ({ ...current, programId: e.target.value }))}
                  >
                    <option value="">Sin programa</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name} ({program.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Creditos</label>
                <input
                  type="number"
                  min={1}
                  className="h-10 w-full rounded-lg border border-input px-3 text-sm"
                  value={form.credits}
                  onChange={(e) => setForm((current) => ({ ...current, credits: Number(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Descripcion</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                  value={form.description}
                  onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear curso'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
