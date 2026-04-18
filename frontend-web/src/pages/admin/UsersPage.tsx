import { useEffect, useState } from 'react'
import { Search, Plus, UserCheck, UserX, Loader2, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usersApi } from '@/services/api'
import type { User } from '@/types'
import { getRoleColor, getRoleName } from '@/lib/utils'

const MOCK_USERS: User[] = [
  { id: '1', email: 'admin@teameval.edu.co', firstName: 'Administrador', lastName: 'Sistema', role: 'ADMIN', isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: '2', email: 'docente@teameval.edu.co', firstName: 'Jorge', lastName: 'Aldana', role: 'TEACHER', isActive: true, createdAt: '2024-01-20T00:00:00Z' },
  { id: '3', email: 'est1@teameval.edu.co', firstName: 'Ana', lastName: 'García', role: 'STUDENT', isActive: true, createdAt: '2024-02-01T00:00:00Z' },
  { id: '4', email: 'est2@teameval.edu.co', firstName: 'Luis', lastName: 'Martínez', role: 'STUDENT', isActive: true, createdAt: '2024-02-01T00:00:00Z' },
  { id: '5', email: 'est3@teameval.edu.co', firstName: 'María', lastName: 'López', role: 'STUDENT', isActive: true, createdAt: '2024-02-01T00:00:00Z' },
  { id: '6', email: 'est4@teameval.edu.co', firstName: 'Carlos', lastName: 'Pérez', role: 'STUDENT', isActive: false, createdAt: '2024-02-01T00:00:00Z' },
  { id: '7', email: 'est5@teameval.edu.co', firstName: 'Sofía', lastName: 'Ruiz', role: 'STUDENT', isActive: true, createdAt: '2024-02-01T00:00:00Z' },
  { id: '8', email: 'est6@teameval.edu.co', firstName: 'Andrés', lastName: 'Torres', role: 'STUDENT', isActive: true, createdAt: '2024-02-01T00:00:00Z' },
]

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'STUDENT' })
  const [saving, setSaving] = useState(false)
  const [invited, setInvited] = useState<string | null>(null)   // email recién invitado
  const [filterRole, setFilterRole] = useState<string>('ALL')

  useEffect(() => {
    usersApi.getAll({ limit: 100 })
      .then(r => setUsers(r.data.data ?? []))
      .catch(() => setUsers(MOCK_USERS))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u => {
    const matchSearch = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'ALL' || u.role === filterRole
    return matchSearch && matchRole
  })

  const handleCreate = async () => {
    setSaving(true)
    try {
      const r = await usersApi.create(form)
      setUsers(prev => [r.data.data, ...prev])
      setShowModal(false)
      setInvited(form.email)
      setForm({ firstName: '', lastName: '', email: '', role: 'STUDENT' })
    } catch {
      alert('Error al crear usuario. Verifica que el correo no esté ya registrado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1 text-sm">{users.length} usuarios registrados en la plataforma</p>
        </div>
        <Button onClick={() => { setInvited(null); setShowModal(true) }} className="gap-2">
          <Plus className="w-4 h-4" /> Invitar Usuario
        </Button>
      </div>

      {/* Notificación de invitación enviada */}
      {invited && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <Mail className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
          <div>
            <p className="font-medium">Invitación enviada a <span className="font-semibold">{invited}</span></p>
            <p className="text-green-700 text-xs mt-0.5">El usuario recibirá un correo para activar su cuenta y crear su contraseña. El enlace expira en 7 días.</p>
          </div>
          <button onClick={() => setInvited(null)} className="ml-auto text-green-500 hover:text-green-700 text-lg leading-none">×</button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Buscar por nombre o correo..." className="pl-9"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              {['ALL', 'ADMIN', 'TEACHER', 'STUDENT'].map(role => (
                <button key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterRole === role ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {role === 'ALL' ? 'Todos' : getRoleName(role)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y border-gray-100">
                  <tr>
                    {['Usuario', 'Correo electrónico', 'Rol', 'Estado', 'Registro'].map(h => (
                      <th key={h} className="text-left font-medium text-gray-500 px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {user.firstName[0]}{user.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${getRoleColor(user.role)}`}>
                          {getRoleName(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {user.isActive
                            ? <><UserCheck className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600 text-xs font-medium">Activo</span></>
                            : <><UserX className="w-3.5 h-3.5 text-red-400" /><span className="text-red-500 text-xs font-medium">Inactivo</span></>
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        {new Date(user.createdAt).toLocaleDateString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>No se encontraron usuarios</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Invitar Nuevo Usuario</h2>
            <p className="text-sm text-gray-500 mb-5">
              El usuario recibirá un correo para activar su cuenta y crear su propia contraseña.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre</label>
                  <Input placeholder="Nombre" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Apellido</label>
                  <Input placeholder="Apellido" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Correo electrónico</label>
                <Input type="email" placeholder="correo@universidad.edu.co" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Rol</label>
                <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="STUDENT">Estudiante</option>
                  <option value="TEACHER">Docente</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Se enviará un correo de activación a esta dirección. El enlace expira en <strong>7 días</strong>.</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
              <Button className="flex-1 gap-2" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4" /> Enviar invitación</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
