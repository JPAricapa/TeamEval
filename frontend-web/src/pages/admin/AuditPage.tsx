import { useEffect, useState } from 'react'
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { auditApi } from '@/services/api'
import { toTitleCase } from '@/lib/utils'

interface AuditLog {
  id: string
  action: string
  entity: string
  entityId?: string
  newValues?: string
  createdAt: string
  user?: { firstName: string; lastName: string; email: string; role: string } | null
}

const ACTION_LABELS: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'destructive' }> = {
  USER_CREATED:     { label: 'Usuario creado',      variant: 'success' },
  USER_UPDATED:     { label: 'Usuario editado',      variant: 'info' },
  USER_DELETED:     { label: 'Usuario eliminado',    variant: 'destructive' },
  BULK_IMPORT:      { label: 'Importación masiva',   variant: 'info' },
  COURSE_CREATED:   { label: 'Curso creado',         variant: 'success' },
  COURSE_DELETED:   { label: 'Curso eliminado',      variant: 'destructive' },
  GROUP_CREATED:    { label: 'Grupo creado',         variant: 'success' },
  GROUP_RENAMED:    { label: 'Grupo renombrado',     variant: 'info' },
  MEMBER_REMOVED:   { label: 'Miembro removido',     variant: 'warning' },
  PROCESS_CREATED:  { label: 'Proceso creado',       variant: 'success' },
  PROCESS_ACTIVATED:{ label: 'Proceso activado',     variant: 'success' },
  PROCESS_CLOSED:   { label: 'Proceso cerrado',      variant: 'warning' },
  PROCESS_DELETED:  { label: 'Proceso eliminado',    variant: 'destructive' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function parseDetails(raw?: string) {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 30

  useEffect(() => {
    setLoading(true)
    auditApi.getLogs({ page, limit: LIMIT })
      .then(r => {
        setLogs(r.data.data.logs ?? [])
        setTotalPages(r.data.data.totalPages ?? 1)
        setTotal(r.data.data.total ?? 0)
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(msg ?? 'No se pudo cargar el historial.')
      })
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Historial de Actividad
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Registro de acciones importantes realizadas en la plataforma. {total > 0 && `${total} registros en total.`}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center py-12 text-sm text-gray-400">Sin registros todavía.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map(log => {
                const action = ACTION_LABELS[log.action] ?? { label: log.action, variant: 'info' as const }
                const details = parseDetails(log.newValues)
                return (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={action.variant} className="text-xs">{action.label}</Badge>
                        <span className="text-xs text-gray-400">{log.entity}</span>
                        {details?.name && (
                          <span className="text-xs font-medium text-gray-700">— {details.name}</span>
                        )}
                        {details?.newName && (
                          <span className="text-xs text-gray-500">→ <span className="font-medium">{details.newName}</span></span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {log.user ? (
                          <span className="text-xs text-gray-500">
                            {toTitleCase(log.user.firstName)} {toTitleCase(log.user.lastName)}
                            <span className="text-gray-400 ml-1">({log.user.role})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Sistema</span>
                        )}
                        {details && Object.keys(details).filter(k => !['name', 'newName', 'oldName'].includes(k)).map(k => (
                          <span key={k} className="text-xs text-gray-400">· {k}: <span className="text-gray-600">{String(details[k])}</span></span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{formatDate(log.createdAt)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
