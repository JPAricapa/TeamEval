import { prisma } from './prisma';

interface AuditParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}

export function audit(params: AuditParams): void {
  prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      newValues: params.details ? JSON.stringify(params.details) : null
    }
  }).catch((e) => { console.error('[audit] failed to write log:', e); });
}
