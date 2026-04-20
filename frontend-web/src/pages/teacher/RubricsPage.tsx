import { useEffect, useState } from 'react'
import { Plus, FileText, ChevronDown, ChevronUp, Loader2, Star, UserCheck, Users, GraduationCap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { rubricsApi } from '@/services/api'
import type { Rubric } from '@/types'

const MOCK_RUBRICS: Rubric[] = [
  {
    id: 'r-peer', name: 'Evaluación de Trabajo en Equipo - Por Pares', description: 'Esta rúbrica evalúa las habilidades de trabajo en equipo a partir del desempeño de un integrante según la perspectiva de sus compañeros.', version: 1, isActive: true, isTemplate: true, createdAt: new Date().toISOString(),
    criteria: [
      { id: 'c1', name: 'Contribución', description: 'Evalúa el aporte activo del integrante al logro de los objetivos del equipo.', weight: 1.0, maxScore: 4, rubricId: 'r-peer', levels: [
        { id: 'l1', name: 'Proficiente', score: 4, description: 'Aporta al logro de los objetivos, sugiere soluciones y participa activamente en su desarrollo.' },
        { id: 'l2', name: 'Aceptable', score: 3, description: 'Aporta al logro de los objetivos y sugiere soluciones, pero participa muy poco en su desarrollo.' },
        { id: 'l3', name: 'Principiante', score: 2, description: 'Pocas veces aporta al logro de los objetivos del equipo.' },
        { id: 'l4', name: 'Necesita mejorar', score: 1, description: 'Nunca realizó aportes al logro de los objetivos del equipo.' },
      ]},
      { id: 'c2', name: 'Roles', description: 'Evalúa la responsabilidad con el rol asignado y la colaboración con el equipo.', weight: 1.0, maxScore: 4, rubricId: 'r-peer', levels: [
        { id: 'l5', name: 'Proficiente', score: 4, description: 'Pone sus habilidades al servicio del equipo, es responsable con su rol y colabora con los demás cuando tienen dificultades.' },
        { id: 'l6', name: 'Aceptable', score: 3, description: 'Es responsable con su rol y respeta los roles de los demás, pero no se integra en un trabajo colaborativo.' },
        { id: 'l7', name: 'Principiante', score: 2, description: 'Asume un rol específico, pero no respeta las responsabilidades de los demás, entorpeciendo su trabajo.' },
        { id: 'l8', name: 'Necesita mejorar', score: 1, description: 'No asume responsablemente el rol asignado y entorpece el trabajo de los demás.' },
      ]},
      { id: 'c3', name: 'Comunicación Interna', description: 'Evalúa la capacidad de comunicación constructiva y receptividad dentro del equipo.', weight: 1.0, maxScore: 4, rubricId: 'r-peer', levels: [
        { id: 'l9',  name: 'Proficiente', score: 4, description: 'Es receptivo a las sugerencias del equipo y realiza observaciones constructivas a los demás integrantes.' },
        { id: 'l10', name: 'Aceptable',   score: 3, description: 'Es receptivo a las sugerencias del equipo, pero no opina constructivamente sobre los demás integrantes.' },
        { id: 'l11', name: 'Principiante',score: 2, description: 'Hace observaciones a los demás, pero no es receptivo a las sugerencias que le hacen.' },
        { id: 'l12', name: 'Necesita mejorar', score: 1, description: 'No acepta sugerencias del equipo ni realiza observaciones constructivas.' },
      ]},
    ],
  },
  {
    id: 'r-teacher', name: 'Evaluación de Trabajo en Equipo - Heteroevaluación Docente', description: 'Rúbrica que usa el docente para evaluar el trabajo en equipo a partir de los instrumentos de seguimiento.', version: 1, isActive: true, isTemplate: true, createdAt: new Date().toISOString(),
    criteria: [
      { id: 'c4', name: 'Metas del Equipo', description: 'Evalúa el establecimiento y claridad de las metas del equipo.', weight: 1.0, maxScore: 4, rubricId: 'r-teacher', levels: [
        { id: 'l13', name: 'Proficiente', score: 4, description: 'El equipo establece metas realizables, claras, priorizadas, justificadas y acordadas por todos los integrantes.' },
        { id: 'l14', name: 'Aceptable',   score: 3, description: 'El equipo establece metas realizables. Las metas no están priorizadas, pero son justificadas y acordadas por todos.' },
        { id: 'l15', name: 'Principiante',score: 2, description: 'El equipo establece metas difíciles de realizar. Hay algunos acuerdos parciales entre los integrantes.' },
        { id: 'l16', name: 'Necesita mejorar', score: 1, description: 'El equipo propone ideas para las metas, pero sin una estructura o acuerdo claro.' },
      ]},
      { id: 'c5', name: 'Decisiones del Equipo', description: 'Evalúa el proceso de toma de decisiones del equipo.', weight: 1.0, maxScore: 4, rubricId: 'r-teacher', levels: [
        { id: 'l17', name: 'Proficiente', score: 4, description: 'El equipo muestra un procedimiento formal y consistente para tomar decisiones, avalado por todos los integrantes.' },
        { id: 'l18', name: 'Aceptable',   score: 3, description: 'El equipo toma decisiones consistentes, pero sin un procedimiento ordenado o avalado por todos.' },
        { id: 'l19', name: 'Principiante',score: 2, description: 'El equipo toma decisiones sin dimensionar la pertinencia o trascendencia de estas.' },
        { id: 'l20', name: 'Necesita mejorar', score: 1, description: 'Las decisiones recaen en esfuerzos individuales y no reflejan un consenso del equipo.' },
      ]},
      { id: 'c6', name: 'Registros de Control', description: 'Evalúa la existencia y uso de registros del trabajo en equipo.', weight: 1.0, maxScore: 4, rubricId: 'r-teacher', levels: [
        { id: 'l21', name: 'Proficiente', score: 4, description: 'El equipo tiene evidencias reales de las metas y registros completos del trabajo, usados para supervisión y control.' },
        { id: 'l22', name: 'Aceptable',   score: 3, description: 'Hay evidencias y registros del trabajo, pero incompletos o poco utilizados para el seguimiento.' },
        { id: 'l23', name: 'Principiante',score: 2, description: 'Hay evidencias y registros del trabajo, pero no corresponden a la realidad.' },
        { id: 'l24', name: 'Necesita mejorar', score: 1, description: 'El equipo no cuenta con evidencias de metas ni mecanismos de supervisión del trabajo.' },
      ]},
    ],
  },
  {
    id: 'r-self', name: 'Evaluación de Trabajo en Equipo - Autoevaluación', description: 'Rúbrica para que cada integrante evalúe su propio desempeño en el equipo, combinando criterios de contribución individual y comunicación.', version: 1, isActive: true, isTemplate: true, createdAt: new Date().toISOString(),
    criteria: [
      { id: 'c7', name: 'Mi Contribución', description: 'Evalúo mi propio aporte al logro de los objetivos del equipo.', weight: 1.0, maxScore: 4, rubricId: 'r-self', levels: [
        { id: 'l25', name: 'Proficiente', score: 4, description: 'Aporté activamente al logro de los objetivos, sugerí soluciones y participé activamente en su desarrollo.' },
        { id: 'l26', name: 'Aceptable',   score: 3, description: 'Aporté al logro de los objetivos y sugerí soluciones, pero participé poco en su desarrollo.' },
        { id: 'l27', name: 'Principiante',score: 2, description: 'Pocas veces aporté significativamente al logro de los objetivos del equipo.' },
        { id: 'l28', name: 'Necesita mejorar', score: 1, description: 'No realicé aportes significativos al logro de los objetivos del equipo.' },
      ]},
      { id: 'c8', name: 'Mi Rol en el Equipo', description: 'Evalúo mi responsabilidad con el rol asignado y mi colaboración con los compañeros.', weight: 1.0, maxScore: 4, rubricId: 'r-self', levels: [
        { id: 'l29', name: 'Proficiente', score: 4, description: 'Puse mis habilidades al servicio del equipo, fui responsable con mi rol y colaboré cuando mis compañeros tuvieron dificultades.' },
        { id: 'l30', name: 'Aceptable',   score: 3, description: 'Fui responsable con mi rol y respeté los roles de los demás, pero no me integré completamente en el trabajo colaborativo.' },
        { id: 'l31', name: 'Principiante',score: 2, description: 'Asumí mi rol, pero en ocasiones entorpecí el trabajo de mis compañeros.' },
        { id: 'l32', name: 'Necesita mejorar', score: 1, description: 'No asumí responsablemente mi rol y entorpecí el trabajo del equipo.' },
      ]},
      { id: 'c9', name: 'Mi Comunicación', description: 'Evalúo mi comunicación constructiva dentro del equipo.', weight: 1.0, maxScore: 4, rubricId: 'r-self', levels: [
        { id: 'l33', name: 'Proficiente', score: 4, description: 'Fui receptivo a las sugerencias de mis compañeros y realicé observaciones constructivas.' },
        { id: 'l34', name: 'Aceptable',   score: 3, description: 'Fui receptivo a las sugerencias de mis compañeros, pero no aportaba constructivamente mis propias opiniones.' },
        { id: 'l35', name: 'Principiante',score: 2, description: 'Hacía observaciones a mis compañeros, pero no era receptivo a las sugerencias que me hacían.' },
        { id: 'l36', name: 'Necesita mejorar', score: 1, description: 'No acepté las sugerencias de mis compañeros ni realicé observaciones constructivas.' },
      ]},
    ],
  },
]

const scoreColors: Record<number, string> = {
  4: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  3: 'bg-blue-100 text-blue-800 border-blue-200',
  2: 'bg-amber-100 text-amber-800 border-amber-200',
  1: 'bg-red-100 text-red-800 border-red-200',
}

type RubricType = 'SELF' | 'PEER' | 'TEACHER' | null

function inferType(name: string): RubricType {
  const n = name.toLowerCase()
  if (n.includes('auto')) return 'SELF'
  if (n.includes('par') || n.includes('peer') || n.includes('coevalu')) return 'PEER'
  if (n.includes('docente') || n.includes('teacher') || n.includes('hetero')) return 'TEACHER'
  return null
}

const typeConfig: Record<NonNullable<RubricType>, { label: string; icon: React.ElementType; color: string }> = {
  SELF:    { label: 'Autoevaluación',       icon: UserCheck,    color: 'text-purple-700 bg-purple-50 border-purple-200' },
  PEER:    { label: 'Evaluación de pares',  icon: Users,        color: 'text-blue-700 bg-blue-50 border-blue-200' },
  TEACHER: { label: 'Evaluación docente',   icon: GraduationCap, color: 'text-amber-700 bg-amber-50 border-amber-200' },
}

export function RubricsPage() {
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set())

  useEffect(() => {
    rubricsApi.getAll()
      .then(r => {
        const raw = r.data.data ?? []
        // La API devuelve performanceLevels; el tipo frontend espera levels
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalized = raw.map((rubric: any) => ({
          ...rubric,
          criteria: (rubric.criteria ?? []).map((c: any) => ({
            ...c,
            levels: (c.levels?.length ? c.levels : (c.performanceLevels ?? [])),
          })),
        })) as Rubric[]
        setRubrics(normalized.length ? normalized : MOCK_RUBRICS)
      })
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
          <p className="text-gray-500 mt-1 text-sm">Instrumentos para evaluar el trabajo en equipo</p>
        </div>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Nueva Rúbrica</Button>
      </div>

      {/* Leyenda de tipos */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(typeConfig).map(([type, cfg]) => {
          const Icon = cfg.icon
          return (
            <div key={type} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${cfg.color}`}>
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
            </div>
          )
        })}
      </div>

      <div className="space-y-4">
        {rubrics.map(rubric => {
          const isOpen = expanded.has(rubric.id)
          const totalCriteria = rubric.criteria?.length ?? 0
          const type = inferType(rubric.name)
          const typeCfg = type ? typeConfig[type] : null
          const TypeIcon = typeCfg?.icon ?? FileText

          return (
            <Card key={rubric.id} className="overflow-hidden">
              <button className="w-full text-left" onClick={() => toggleRubric(rubric.id)}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${typeCfg ? typeCfg.color.split(' ').filter(c => c.startsWith('bg-')).join(' ') : 'bg-primary/10'}`}>
                        <TypeIcon className={`w-5 h-5 ${typeCfg ? typeCfg.color.split(' ').filter(c => c.startsWith('text-')).join(' ') : 'text-primary'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{rubric.name}</CardTitle>
                          <Badge variant="info" className="text-xs">v{rubric.version}</Badge>
                          {typeCfg && (
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${typeCfg.color}`}>
                              <TypeIcon className="w-3 h-3" /> {typeCfg.label}
                            </span>
                          )}
                          {rubric.isTemplate && <Badge variant="secondary" className="text-xs">Plantilla</Badge>}
                          <Badge variant={rubric.isActive ? 'success' : 'secondary'} className="text-xs">
                            {rubric.isActive ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{rubric.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{totalCriteria} criterios</span>
                          <span>Escala: 1 – 4 puntos</span>
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
                                <p className="text-xs text-gray-500 mt-0.5">{criterion.description}</p>
                              </div>
                              {isCritOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </button>

                            {isCritOpen && (
                              <div className="px-4 pb-4">
                                <p className="text-xs text-gray-500 mb-3">
                                  Selecciona el nivel que mejor describe el desempeño en este criterio:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                  {criterion.levels
                                    ?.slice()
                                    .sort((a, b) => b.score - a.score)
                                    .map(level => (
                                      <div key={level.id} className={`rounded-lg p-3 text-xs border ${scoreColors[level.score] ?? 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                          <span className="font-semibold">{level.name}</span>
                                          <span className="font-bold text-sm">{level.score} pts</span>
                                        </div>
                                        <p className="text-xs leading-relaxed">{level.description}</p>
                                      </div>
                                    ))}
                                </div>
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

        {rubrics.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-gray-500">
              No hay rúbricas disponibles.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
