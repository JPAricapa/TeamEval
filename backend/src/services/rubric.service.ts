import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

type AuthUser = { id: string; institutionId?: string };

type CriteriaInput = {
  name: string;
  description?: string;
  weight: number;
  order?: number;
  performanceLevels: Array<{ name: string; description?: string; score: number; order?: number }>;
};

class RubricService {
  async listRubrics(userId: string) {
    return prisma.rubric.findMany({
      where: { isActive: true, OR: [{ creatorId: userId }, { isPublic: true }] },
      include: {
        creator: { select: { firstName: true, lastName: true } },
        criteria: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: { performanceLevels: { orderBy: { order: 'asc' } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getRubricById(id: string) {
    const rubric = await prisma.rubric.findUnique({
      where: { id },
      include: {
        creator: { select: { firstName: true, lastName: true } },
        criteria: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: { performanceLevels: { orderBy: { order: 'asc' } } }
        },
        versions: { select: { id: true, version: true, name: true, createdAt: true } }
      }
    });
    if (!rubric) throw new AppError('Rúbrica no encontrada', 404);
    return rubric;
  }

  async createRubric(user: AuthUser, data: {
    name: string; description?: string; isPublic?: boolean;
    institutionId?: string; criteria: CriteriaInput[];
  }) {
    return prisma.$transaction(async (tx) => {
      const newRubric = await tx.rubric.create({
        data: {
          name: data.name,
          description: data.description,
          isPublic: data.isPublic ?? false,
          creatorId: user.id,
          institutionId: data.institutionId ?? user.institutionId
        }
      });

      for (const criterion of data.criteria) {
        const newCriteria = await tx.rubricCriteria.create({
          data: {
            rubricId: newRubric.id, name: criterion.name,
            description: criterion.description, weight: criterion.weight,
            order: criterion.order ?? 0
          }
        });
        for (const level of criterion.performanceLevels) {
          await tx.performanceLevel.create({
            data: {
              criteriaId: newCriteria.id, name: level.name,
              description: level.description, score: level.score,
              order: level.order ?? 0
            }
          });
        }
      }

      return tx.rubric.findUnique({
        where: { id: newRubric.id },
        include: {
          criteria: {
            include: { performanceLevels: { orderBy: { order: 'asc' } } },
            orderBy: { order: 'asc' }
          }
        }
      });
    });
  }

  async updateRubricVersion(id: string, userId: string, data: { name?: string; description?: string }) {
    const original = await prisma.rubric.findUnique({ where: { id } });
    if (!original) throw new AppError('Rúbrica no encontrada', 404);
    if (original.creatorId !== userId) throw new AppError('Solo el creador puede modificar esta rúbrica', 403);

    await prisma.rubric.update({ where: { id }, data: { isActive: false } });

    return prisma.rubric.create({
      data: {
        name: data.name ?? original.name,
        description: data.description ?? original.description,
        isPublic: original.isPublic,
        creatorId: userId,
        institutionId: original.institutionId,
        parentId: original.parentId ?? original.id,
        version: original.version + 1
      }
    });
  }

  async patchRubric(id: string, data: Record<string, unknown>) {
    return prisma.rubric.update({ where: { id }, data });
  }

  async addCriteria(rubricId: string, data: { name: string; description?: string; weight: number; order?: number }) {
    return prisma.rubricCriteria.create({
      data: { rubricId, name: data.name, description: data.description, weight: data.weight, order: data.order ?? 0 }
    });
  }

  async addPerformanceLevel(criteriaId: string, data: { name: string; description?: string; score: number; order?: number }) {
    return prisma.performanceLevel.create({
      data: { criteriaId, name: data.name, description: data.description, score: data.score, order: data.order ?? 0 }
    });
  }

  async deleteRubric(id: string) {
    await prisma.rubric.update({ where: { id }, data: { isActive: false } });
  }
}

export const rubricService = new RubricService();
