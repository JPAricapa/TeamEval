import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Users, Plus, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { coursesApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import type { Course } from '@/types'

const colors = ['from-blue-500 to-blue-600', 'from-purple-500 to-purple-600', 'from-emerald-500 to-emerald-600', 'from-amber-500 to-amber-600']

function getAutomaticPeriodLabel(date = new Date()) {
  const year = date.getFullYear()
  const semester = date.getMonth() <= 4 ? 1 : 2
  return `Semestre ${year}-${semester}`
}

export function CoursesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const automaticPeriodLabel = getAutomaticPeriodLabel()
  const [form, setForm] = useState({
    name: '',
    code: '',
    credits: 3,
    description: '',
  })

  useEffect(() => {
    coursesApi.getAll()
      .then((coursesRes) => {
        setCourses(coursesRes.data.data ?? [])
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(msg ?? 'No se pudieron cargar los cursos.')
      })
      .finally(() => setLoading(false))
  }, [])

  const openCreate = () => {
    setError('')
    setShowModal(true)
  }

  const handleCreate = async () => {
    if (!form.name || !form.code) {
      setError('Completa nombre y código del curso.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const response = await coursesApi.create({
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
        description: '',
      })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo crear el curso.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    setError('')
    try {
      await coursesApi.delete(confirmDelete.id)
      setCourses(prev => prev.filter(c => c.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo eliminar el curso.')
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Cursos</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {courses.length} cursos asignados · Programa fijo: Ingeniería Electrónica
          </p>
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
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {course.studentCount ?? 0} estudiantes
                </span>
                <span className="flex items-center gap-1">Docente: {user?.firstName ?? 'Asignado'}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>{course.credits} créditos</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-red-400 hover:text-red-600 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(course) }}
                    title="Eliminar curso"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => navigate(`/teacher/courses/${course.id}`)}
                  >
                    Abrir curso
                  </button>
                </div>
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

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">¿Eliminar este curso?</h2>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 mb-4">
              <p className="text-sm font-medium text-gray-900">{confirmDelete.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">Código: {confirmDelete.code}</p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mb-5 text-xs text-amber-800">
              Se eliminarán también todos los grupos, estudiantes matriculados y procesos de evaluación asociados a este curso.
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                onClick={handleDeleteConfirmed}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, eliminar curso'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-bold text-gray-900">Nuevo curso</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                El curso quedará asociado automáticamente a Ingeniería Electrónica y al {automaticPeriodLabel}.
              </div>
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
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Créditos</label>
                <input
                  type="number"
                  min={1}
                  className="h-10 w-full rounded-lg border border-input px-3 text-sm"
                  value={form.credits}
                  onChange={(e) => setForm((current) => ({ ...current, credits: Number(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Descripción</label>
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
