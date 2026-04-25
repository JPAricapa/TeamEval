import { Badge } from '@/components/ui/badge'
import type { EvalProcessStatus, EvalStatus } from '@/types'

const processStatusConfig: Record<EvalProcessStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'secondary' }> = {
  DRAFT: { label: 'Borrador', variant: 'secondary' },
  ACTIVE: { label: 'Activo', variant: 'success' },
  CLOSED: { label: 'Cerrado', variant: 'warning' },
  ARCHIVED: { label: 'Archivado', variant: 'info' },
}

const evaluationStatusConfig: Record<EvalStatus, { label: string; variant: 'success' | 'warning' | 'info' }> = {
  PENDING: { label: 'Pendiente', variant: 'warning' },
  IN_PROGRESS: { label: 'En progreso', variant: 'info' },
  COMPLETED: { label: 'Completada', variant: 'success' },
}

interface StatusBadgeProps {
  status: EvalProcessStatus | EvalStatus
  type?: 'process' | 'evaluation'
  className?: string
}

export function StatusBadge({ status, type = 'process', className }: StatusBadgeProps) {
  const config = type === 'evaluation'
    ? evaluationStatusConfig[status as EvalStatus]
    : processStatusConfig[status as EvalProcessStatus]

  return (
    <Badge variant={config?.variant ?? 'secondary'} className={className}>
      {config?.label ?? status}
    </Badge>
  )
}
