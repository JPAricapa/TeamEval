import { prisma } from '../utils/prisma';

interface GetLogsParams {
  page: number;
  limit: number;
  entity?: string;
  action?: string;
  userId?: string;
}

class AuditService {
  async getLogs({ page, limit, entity, action, userId }: GetLogsParams) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

export const auditService = new AuditService();
