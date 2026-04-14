import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, Lock, BarChart3, Loader2, Clock, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { evaluationsApi } from '@/services/api'
import type { EvaluationProcess } from '@/types'

const MOCK: EvaluationProcess[] = [
  { id: 'p1', name: 'Evaluación Parcial 1 – Proyecto Integrador', description: 'Coevaluación y heteroevaluación del primer corte', status: 'ACTIVE', selfWeight: 0.2, peerWeight: 0.5, teacherWeight: 0.3, courseId: 'c1', rubricId: 'r1', createdAt: new Date().toISOString() },
  { id: 'p2', name: 'Evaluación Final – Trabajo en Equipo', description: 'Evaluación integral del desempeño en equipo', status: 'DRAFT', selfWeight: 0.2, peerWeight: 0.5, teacherWeight: 0.3, courseId: 'c1', rubricId: 'r1', createdAt: new Date().toISOString() },
  { id: 'p3', name: 'Evaluación Diagnóstica', description: '', status: 'CLOSED', selfWeight: 0.2, peerWeight: 0.5, teacherWeight: 0.3, courseId: 'c2', rubricId: 'r1', createdAt: new Date().toISOString() },
]

const STATUS = {
  DRAFT:    { label: 'Borrador',  variant: 'secondary' as const, pct: 0   },
  ACTIVE:   { label: 'Activo',    variant: 'success'   as const, pct: 65  },
  CLOSED:   { label: 'Cerrado',   variant: 'warning'   as const, pct: 100 },
  ARCHIVED: { label: 'Archivado', variant: 'info'       as const, pct: 100 },
}

export function EvaluationProcessesPage() {
  const navigate = useNavigate()
  const [processes, setProcesses] = useState<EvaluationProcess[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', selfWeight: 0.2, peerWeight: 0.5, teacherWeight: 0.3, courseId: 'c1', rubricId: 'r1' })
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)

  useEffect(() => {
    evaluationsApi.getProcesses()
      .then(r => setProcesses(r.data.data ?? []))
      .catch(() => setProcesses(MOCK))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    setSaving(true)
    try {
      const r = await evaluationsApi.createProcess(form)
      setProcesses(prev => [r.data.data, ...prev])
      setShowModal(false)
    } catch {
      setProcesses(prev => [{
        id: Date.now().toString(), ...form, status: 'DRAFT' as const, createdAt: new Date().toISOString()
      }, ...prev])
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  const handleActivate = async (id: string) => {
    setActivating(id)
    try {
      await evaluationsApi.activateProcess(id)
      setProcesses(prev => prev.map(p => p.id === id ? { ...p, status: 'ACTIVE' as const } : p))
    } catch {
      setProcesses(prev => prev.map(p => p.id === id ? { ...p, status: 'ACTIVE' as const } : p))
    } finally {
      setActivating(null)
    }
  }

  const handleClose = async (id: string) => {
    try {
      await evaluationsApi.closeProcess(id)
      setProcesses(prev => prev.map(p => p.id === id ? { ...p, status: 'CLOSED' as const } : p))
    } catch {
      setProcesses(prev => prev.map(p => p.id === id ? { ...p, status: 'CLOSED' as const } : p))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procesos de Evaluación</h1>
          <p className="text-gray-500 mt-1 text-sm">{processes.length} procesos configurados</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2"><Plus className="w-4 h-4" /> Nuevo Proceso</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {processes.map(proc => {
            const s = STATUS[proc.status]
            return (
              <Card key={proc.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm">{proc.name}</h3>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </div>
                      {proc.description && <p className="text-xs text-gray-500 mb-3">{proc.description}</p>}

                      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Autoevaluación: {Math.round(proc.selfWeight * 100)}%</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Coevaluación: {Math.round(proc.peerWeight * 100)}%</span>
                        <span>Docente: {Math.round(proc.teacherWeight * 100)}%</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Progress value={s.pct} className="flex-1 h-1.5" />
                        <span className="text-xs text-gray-400 flex-shrink-0">{s.pct}% completado</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/teacher/evaluations/${proc.id}`)}>
                        Ver detalle
                      </Button>
                      {proc.status === 'DRAFT' && (
                        <Button size="sm" className="gap-1" onClick={() => handleActivate(proc.id)} disabled={activating === proc.id}>
                          {activating === proc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          Activar
                        </Button>
                      )}
                      {proc.status === 'ACTIVE' && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => handleClose(proc.id)}>
                            <Lock className="w-3.5 h-3.5" /> Cerrar
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1 text-primary"
                            onClick={() => navigate(`/teacher/analytics/${proc.id}`)}>
                            <BarChart3 className="w-3.5 h-3.5" /> Analítica
                          </Button>
                        </>
                      )}
                      {proc.status === 'CLOSED' && (
                        <Button size="sm" className="gap-1" onClick={() => navigate(`/teacher/analytics/${proc.id}`)}>
                          <BarChart3 className="w-3.5 h-3.5" /> Ver analítica
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Nuevo Proceso de Evaluación</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre del proceso *</label>
                <input className="w-full h-10 rounded-lg border border-input px-3 text-sm" placeholder="Ej: Evaluación Parcial 1"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
                <textarea className="w-full rounded-lg border border-input px-3 py-2 text-sm resize-none" rows={2}
                  placeholder="Descripción opcional..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
              <Button className="flex-1" onClick={handleCreate} disabled={saving || Math.round((form.selfWeight + form.peerWeight + form.teacherWeight) * 100) !== 100}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear proceso'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
