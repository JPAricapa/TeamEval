import { useEffect, useState } from 'react'
import { Building2, Plus, MapPin, Loader2, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { institutionsApi } from '@/services/api'
import type { Institution } from '@/types'

const MOCK: Institution[] = [
  { id: '1', name: 'Institución Demo', code: 'DEMO', city: 'Demo City', country: 'Colombia', isActive: true },
]

export function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Institution | null>(null)
  const [form, setForm] = useState({ name: '', code: '', city: '', country: 'Colombia' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    institutionsApi.getAll()
      .then(r => setInstitutions(r.data.data ?? []))
      .catch(() => setInstitutions(MOCK))
      .finally(() => setLoading(false))
  }, [])

  const openCreate = () => { setEditing(null); setForm({ name: '', code: '', city: '', country: 'Colombia' }); setShowModal(true) }
  const openEdit = (inst: Institution) => { setEditing(inst); setForm({ name: inst.name, code: inst.code, city: inst.city, country: inst.country }); setShowModal(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        const r = await institutionsApi.update(editing.id, form)
        setInstitutions(prev => prev.map(i => i.id === editing.id ? r.data.data : i))
      } else {
        const r = await institutionsApi.create(form)
        setInstitutions(prev => [r.data.data, ...prev])
      }
      setShowModal(false)
    } catch {
      alert('Error al guardar. Verifique los datos.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instituciones</h1>
          <p className="text-gray-500 mt-1 text-sm">Universidades y centros educativos registrados</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Nueva Institución
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {institutions.map(inst => (
            <Card key={inst.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={inst.isActive ? 'success' : 'secondary'}>
                      {inst.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                    <button onClick={() => openEdit(inst)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm leading-snug">{inst.name}</h3>
                <p className="text-xs text-primary font-mono mt-1">{inst.code}</p>
                <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
                  <MapPin className="w-3.5 h-3.5" />
                  {inst.city}, {inst.country}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add new card */}
          <button onClick={openCreate}
            className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors min-h-[140px]">
            <Plus className="w-6 h-6" />
            <span className="text-sm font-medium">Agregar institución</span>
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editing ? 'Editar Institución' : 'Nueva Institución'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre completo</label>
                <Input placeholder="Institución Demo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Código / Sigla</label>
                <Input placeholder="DEMO" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Ciudad</label>
                  <Input placeholder="Demo City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">País</label>
                  <Input placeholder="Colombia" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Guardar cambios' : 'Crear')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
