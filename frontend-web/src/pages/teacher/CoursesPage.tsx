import { useEffect, useState } from 'react'
import { BookOpen, Users, Calendar, Plus, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { coursesApi } from '@/services/api'
import type { Course } from '@/types'

const MOCK_COURSES: Course[] = [
  { id: 'c1', name: 'Proyecto Integrador de Ingeniería I', code: 'INS-401', credits: 4, semester: 8, teacherId: 't1', periodId: 'p1', programId: 'prg1', isActive: true },
  { id: 'c2', name: 'Gestión de Proyectos de Software', code: 'INS-450', credits: 3, semester: 9, teacherId: 't1', periodId: 'p1', programId: 'prg1', isActive: true },
]

const colors = ['from-blue-500 to-blue-600', 'from-purple-500 to-purple-600', 'from-emerald-500 to-emerald-600', 'from-amber-500 to-amber-600']

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    coursesApi.getAll()
      .then(r => setCourses(r.data.data ?? []))
      .catch(() => setCourses(MOCK_COURSES))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Cursos</h1>
          <p className="text-gray-500 mt-1 text-sm">{courses.length} cursos asignados en el período actual</p>
        </div>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Nuevo Curso</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((course, i) => (
          <Card key={course.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
            <div className={`h-2 bg-gradient-to-r ${colors[i % colors.length]}`} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center bg-primary/10">
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
                <span>2 grupos · 2 equipos</span>
              </div>
            </CardContent>
          </Card>
        ))}

        <button className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors min-h-[180px]">
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">Agregar curso</span>
        </button>
      </div>
    </div>
  )
}
