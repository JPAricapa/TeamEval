import { useEffect, useState } from 'react'
import { Plus, FileText, ChevronDown, ChevronUp, Loader2, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { rubricsApi } from '@/services/api'
import type { Rubric } from '@/types'

const MOCK_RUBRICS: Rubric[] = [
  {
    id: 'r1', name: 'Rúbrica de Trabajo en Equipo – Coevaluación', description: 'Evaluación entre pares del desempeño en trabajo en equipo', version: 1, isActive: true, isTemplate: true, createdAt: new Date().toISOString(),
    criteria: [
      { id: 'c1', name: 'Comunicación efectiva', description: 'Capacidad de transmitir ideas con claridad', weight: 0.20, maxScore: 5, rubricId: 'r1', levels: [
        { id: 'l1', name: 'Excelente', score: 5, description: 'Comunica ideas de forma clara, precisa y oportuna en todo momento', color: '#4CAF50' },
        { id: 'l2', name: 'Bueno', score: 4, description: 'Comunica ideas claramente en la mayoría de situaciones', color: '#2196F3' },
        { id: 'l3', name: 'Aceptable', score: 3, description: 'Comunica ideas con claridad moderada, con algunas imprecisiones', color: '#FF9800' },
        { id: 'l4', name: 'Deficiente', score: 2, description: 'Tiene dificultades para comunicar ideas con claridad', color: '#F44336' },
      ]},
      { id: 'c2', name: 'Colaboración y trabajo cooperativo', description: 'Contribución activa al trabajo del equipo', weight: 0.20, maxScore: 5, rubricId: 'r1', levels: [
        { id: 'l5', name: 'Excelente', score: 5, description: 'Contribuye activamente al equipo, apoya a sus compañeros constantemente', color: '#4CAF50' },
        { id: 'l6', name: 'Bueno', score: 4, description: 'Generalmente contribuye al equipo y apoya a compañeros', color: '#2196F3' },
        { id: 'l7', name: 'Aceptable', score: 3, description: 'Contribución moderada, con apoyo limitado al equipo', color: '#FF9800' },
        { id: 'l8', name: 'Deficiente', score: 2, description: 'Contribución mínima al equipo', color: '#F44336' },
      ]},
      { id: 'c3', name: 'Cumplimiento de compromisos', description: 'Cumplimiento de tareas asignadas en tiempo y forma', weight: 0.20, maxScore: 5, rubricId: 'r1', levels: [
        { id: 'l9',  name: 'Excelente', score: 5, description: 'Cumple todos los compromisos dentro del plazo acordado', color: '#4CAF50' },
        { id: 'l10', name: 'Bueno',     score: 4, description: 'Cumple la mayoría de compromisos puntualmente', color: '#2196F3' },
        { id: 'l11', name: 'Aceptable', score: 3, description: 'Cumple compromisos con algunos retrasos', color: '#FF9800' },
        { id: 'l12', name: 'Deficiente',score: 2, description: 'Frecuentemente incumple o retrasa compromisos', color: '#F44336' },
      ]},
    ],
  },
  {
    id: 'r2', name: 'Rúbrica de Trabajo en Equipo – Heteroevaluación', description: 'Evaluación docente del desempeño individual en equipo', version: 1, isActive: true, isTemplate: true, createdAt: new Date().toISOString(),
    criteria: [
      { id: 'c4', name: 'Participación en reuniones', description: 'Asistencia y participación activa', weight: 0.25, maxScore: 5, rubricId: 'r2', levels: [
        { id: 'l13', name: 'Excelente', score: 5, description: 'Asiste puntualmente a todas las reuniones y participa activamente', color: '#4CAF50' },
        { id: 'l14', name: 'Bueno',     score: 4, description: 'Asiste a la mayoría de reuniones con participación activa', color: '#2196F3' },
        { id: 'l15', name: 'Aceptable', score: 3, description: 'Asistencia irregular con participación moderada', color: '#FF9800' },
        { id: 'l16', name: 'Deficiente',score: 2, description: 'Asistencia deficiente y escasa participación', color: '#F44336' },
      ]},
    ],
  },
]

const scoreColors: Record<number, string> = { 5: 'bg-emerald-100 text-emerald-700', 4: 'bg-blue-100 text-blue-700', 3: 'bg-amber-100 text-amber-700', 2: 'bg-red-100 text-red-700' }

export function RubricsPage() {
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set())

  useEffect(() => {
    rubricsApi.getAll()
      .then(r => setRubrics(r.data.data ?? []))
      .catch(() => setRubrics(MOCK_RUBRICS))
      .finally(() => setLoading(false))
  }, [])

  const toggleRubric = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleCriteria = (id: string) => setExpandedCriteria(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rúbricas de Evaluación</h1>
          <p className="text-gray-500 mt-1 text-sm">Instrumentos de evaluación de trabajo en equipo</p>
        </div>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Nueva Rúbrica</Button>
      </div>

      <div className="space-y-4">
        {rubrics.map(rubric => {
          const isOpen = expanded.has(rubric.id)
          const totalCriteria = rubric.criteria?.length ?? 0
          const maxScore = rubric.criteria?.[0]?.maxScore ?? 5

          return (
            <Card key={rubric.id} className="overflow-hidden">
              <button className="w-full text-left" onClick={() => toggleRubric(rubric.id)}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{rubric.name}</CardTitle>
                          <Badge variant="info" className="text-xs">v{rubric.version}</Badge>
                          {rubric.isTemplate && <Badge variant="secondary" className="text-xs">Plantilla</Badge>}
                          <Badge variant={rubric.isActive ? 'success' : 'secondary'} className="text-xs">
                            {rubric.isActive ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{rubric.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{totalCriteria} criterios</span>
                          <span>Puntaje máximo: {maxScore}</span>
                        </div>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />}
                  </div>
                </CardHeader>
              </button>

              {isOpen && (
                <CardContent className="pt-0 space-y-3">
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Criterios de evaluación</h4>
                    <div className="space-y-3">
                      {rubric.criteria?.map((criterion, idx) => {
                        const isCritOpen = expandedCriteria.has(criterion.id)
                        return (
                          <div key={criterion.id} className="border border-gray-100 rounded-xl overflow-hidden">
                            <button
                              className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                              onClick={() => toggleCriteria(criterion.id)}>
                              <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900">{criterion.name}</p>
                                  <span className="text-xs text-gray-400">Peso: {Math.round(criterion.weight * 100)}%</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{criterion.description}</p>
                              </div>
                              {isCritOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </button>

                            {isCritOpen && (
                              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                {criterion.levels?.map(level => (
                                  <div key={level.id} className={`rounded-lg p-3 text-xs border ${scoreColors[level.score] ?? 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="font-semibold">{level.name}</span>
                                      <span className="font-bold text-sm">{level.score}</span>
                                    </div>
                                    <p className="text-xs leading-relaxed opacity-80">{level.description}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
