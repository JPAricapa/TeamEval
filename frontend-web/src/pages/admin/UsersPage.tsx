import { useEffect, useState } from 'react'
import { Search, Plus, UserCheck, UserX, Loader2, BadgePlus, IdCard, MoreHorizontal, Trash2, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { PageHeader } from '@/components/ui/page-header'
import { usersApi } from '@/services/api'
import type { Role, User } from '@/types'
import { getRoleColor, getRoleName } from '@/lib/utils'

type CreateUserForm = {
  fullName: string
  email: string
  nationalId: string
  role: Role
}

const EMPTY_FORM: CreateUserForm = {
  fullName: '',
  email: '',
  nationalId: '',
  role: 'STUDENT',
}

function toTitleCase(str: string) {
  return str.toLowerCase().split(' ').map((w) => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean).map(toTitleCase)
  if (parts.length < 2) return null

  if (parts.length === 2) {
    return {
      firstName: parts[0],
      lastName: parts[1],
    }
  }

  if (parts.length === 3) {
    return {
      firstName: parts.slice(0, 2).join(' '),
      lastName: parts[2],
    }
  }

  const middle = Math.floor(parts.length / 2)
  return {
    firstName: parts.slice(0, middle).join(' '),
    lastName: parts.slice(middle).join(' '),
  }
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<CreateUserForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [createdUser, setCreatedUser] = useState<{ email: string; initialPassword?: string } | null>(null)
  const [filterRole, setFilterRole] = useState<string>('ALL')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ fullName: '', email: '', nationalId: '' })
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    usersApi.getAll({ limit: 100 })
      .then((r) => setUsers(r.data.data ?? []))
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(msg ?? 'No se pudo cargar la lista de usuarios.')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter((u) => {
    const matchSearch = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'ALL' || u.role === filterRole
    return matchSearch && matchRole
  })

  const handleCreate = async () => {
    const parsedName = splitFullName(form.fullName)
    if (!parsedName) {
      setFormError('Escribe nombre y apellido en el campo de nombre completo.')
      return
    }
    if (!form.email.trim() || !form.nationalId.trim()) {
      setFormError('Completa correo, nombre completo y cédula.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const r = await usersApi.create({
        email: form.email.trim(),
        nationalId: form.nationalId.trim(),
        role: 'STUDENT',
        ...parsedName,
      })
      setUsers((prev) => [r.data.data, ...prev])
      setCreatedUser({ email: form.email.trim(), initialPassword: r.data.data?.initialPassword })
      setShowModal(false)
      setForm(EMPTY_FORM)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'No se pudo crear el usuario.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    setUpdatingUserId(userId)
    setError('')
    setOpenStatusMenuId(null)
    try {
      const response = await usersApi.update(userId, { isActive })
      setUsers((prev) => prev.map((user) => (
        user.id === userId ? { ...user, ...response.data.data } : user
      )))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo actualizar el estado del usuario.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const openEdit = (user: User) => {
    setEditForm({
      fullName: `${toTitleCase(user.firstName)} ${toTitleCase(user.lastName)}`,
      email: user.email,
      nationalId: user.nationalId ?? '',
    })
    setEditError('')
    setEditingUser(user)
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    const parsedName = splitFullName(editForm.fullName)
    if (!parsedName) { setEditError('Escribe nombre y apellido.'); return }
    if (!editForm.email.trim()) { setEditError('El correo es requerido.'); return }

    setSavingEdit(true)
    setEditError('')
    try {
      const r = await usersApi.update(editingUser.id, {
        ...parsedName,
        email: editForm.email.trim(),
        nationalId: editForm.nationalId.trim() || undefined,
      })
      setUsers((prev) => prev.map((u) => u.id === editingUser.id ? { ...u, ...r.data.data } : u))
      setEditingUser(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setEditError(msg ?? 'No se pudo guardar los cambios.')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteUser = async (user: User) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar a ${user.firstName} ${user.lastName}? Esta acción no se puede deshacer.`
    )

    if (!confirmed) return

    setDeletingUserId(user.id)
    setError('')
    setOpenStatusMenuId(null)

    try {
      await usersApi.delete(user.id)
      setUsers((prev) => prev.filter((item) => item.id !== user.id))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo eliminar el usuario.')
    } finally {
      setDeletingUserId(null)
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Gestión de Usuarios"
        description={`Universidad del Quindío · ${users.length} usuarios registrados`}
        actions={
          <Button onClick={() => { setCreatedUser(null); setFormError(''); setShowModal(true) }} className="w-full gap-2 sm:w-auto">
            <Plus className="w-4 h-4" /> Añadir usuario
          </Button>
        }
      />

      {createdUser && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <BadgePlus className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
          <div>
            <p className="font-medium">
              Usuario creado: <span className="font-semibold">{createdUser.email}</span>
            </p>
            <p className="text-green-700 text-xs mt-0.5">
              La contraseña inicial quedó asignada a la cédula{createdUser.initialPassword ? <>: <strong>{createdUser.initialPassword}</strong></> : ''}.
            </p>
          </div>
          <button
            onClick={() => setCreatedUser(null)}
            className="ml-auto rounded-md px-2 text-lg leading-none text-green-500 hover:bg-green-100 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
            aria-label="Cerrar mensaje"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o correo..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['ALL', 'ADMIN', 'STUDENT'].map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${filterRole === role ? 'bg-primary text-white shadow-sm shadow-primary/15' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {role === 'ALL' ? 'Todos' : getRoleName(role)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState label="Cargando usuarios..." className="min-h-48" />
          ) : filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Search}
                title="Sin resultados"
                description="Ajusta la búsqueda o el filtro de rol para encontrar usuarios."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {['Usuario', 'Cédula', 'Correo electrónico', 'Rol', 'Estado', 'Curso / Grupo', 'Acciones'].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {toTitleCase(user.firstName)[0]}{toTitleCase(user.lastName)[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{toTitleCase(user.firstName)} {toTitleCase(user.lastName)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs font-mono text-gray-500">{user.nationalId ?? '—'}</td>
                      <td className="text-gray-500">{user.email}</td>
                      <td>
                        <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${getRoleColor(user.role)}`}>
                          {getRoleName(user.role)}
                        </span>
                      </td>
                      <td>
                        <div className="relative flex items-center gap-2">
                          {user.isActive
                            ? <><UserCheck className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600 text-xs font-medium">Activo</span></>
                            : <><UserX className="w-3.5 h-3.5 text-red-400" /><span className="text-red-500 text-xs font-medium">Inactivo</span></>
                          }
                          <button
                            type="button"
                            className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => setOpenStatusMenuId((current) => current === user.id ? null : user.id)}
                            disabled={updatingUserId === user.id || user.role === 'ADMIN'}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                          {updatingUserId === user.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                          {openStatusMenuId === user.id && (
                            <div className="absolute left-20 top-7 z-10 min-w-24 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                              <button
                                type="button"
                                className="block w-full rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                                onClick={() => handleStatusChange(user.id, true)}
                              >
                                Activo
                              </button>
                              <button
                                type="button"
                                className="block w-full rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                                onClick={() => handleStatusChange(user.id, false)}
                              >
                                Inactivo
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="text-xs text-gray-500">
                        {user.role === 'STUDENT' ? (
                          user.groupName ? (
                            <div className="space-y-0.5">
                              {user.courseName && (
                                <p className="text-gray-900 font-medium">{user.courseName}</p>
                              )}
                              <p className="text-gray-500">Grupo: {user.groupName}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin grupo</span>
                          )
                        ) : (
                          <span className="text-gray-400">No aplica</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => openEdit(user)}
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </Button>
                          {user.role === 'STUDENT' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteUser(user)}
                              disabled={deletingUserId === user.id}
                            >
                              {deletingUserId === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              Eliminar
                            </Button>
                          )}
                        </div>
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

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="modal-panel max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Editar usuario</h2>
            <p className="text-sm text-gray-500 mb-5">{toTitleCase(editingUser.firstName)} {toTitleCase(editingUser.lastName)}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre completo</label>
                <Input
                  placeholder="Nombre y apellido"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Correo electrónico</label>
                <Input
                  type="email"
                  placeholder="correo@uqvirtual.edu.co"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cédula</label>
                <Input
                  placeholder="Número de cédula"
                  value={editForm.nationalId}
                  onChange={(e) => setEditForm((f) => ({ ...f, nationalId: e.target.value }))}
                />
              </div>
              {editError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{editError}</div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setEditingUser(null)} disabled={savingEdit}>Cancelar</Button>
              <Button className="flex-1 gap-2" onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="modal-panel max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Añadir usuario</h2>
            <p className="text-sm text-gray-500 mb-5">
              Los usuarios creados desde aquí serán estudiantes y su contraseña inicial será la cédula.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Correo electrónico</label>
                <Input
                  type="email"
                  placeholder="correo@uqvirtual.edu.co"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre completo</label>
                <Input
                  placeholder="Nombre y apellido"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cédula</label>
                <Input
                  placeholder="Número de cédula"
                  value={form.nationalId}
                  onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Rol</label>
                <Input value="Estudiante" disabled />
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                <IdCard className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  La cédula se guardará y también será la contraseña inicial del usuario.
                </span>
              </div>
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {formError}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
              <Button className="flex-1 gap-2" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Crear usuario</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
