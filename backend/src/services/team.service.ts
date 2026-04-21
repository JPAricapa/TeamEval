import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

class TeamService {
  async listTeams(groupId?: string) {
    return prisma.team.findMany({
      where: { isActive: true, ...(groupId ? { groupId } : {}) },
      include: {
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
        },
        group: { select: { name: true, courseId: true } }
      }
    });
  }

  async getTeamById(id: string) {
    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: { include: { user: true } }, results: true }
    });
    if (!team) throw new AppError('Equipo no encontrado', 404);
    return team;
  }

  async createTeam(data: { groupId: string; name: string; description?: string }) {
    return prisma.team.create({ data });
  }

  async addMember(teamId: string, userId: string, role?: string) {
    return prisma.teamMember.create({ data: { teamId, userId, role } });
  }

  async removeMember(teamId: string, userId: string) {
    await prisma.teamMember.updateMany({ where: { teamId, userId }, data: { isActive: false } });
  }
}

export const teamService = new TeamService();
