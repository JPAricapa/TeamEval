import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../constants/enums';

type AuthUser = { id: string; role: UserRole; institutionId?: string };

class TeamService {
  private ensureCanAccessCourse(course: { teacherId: string; institutionId: string }, user: AuthUser) {
    if (user.role === UserRole.ADMIN) {
      if (user.institutionId && course.institutionId !== user.institutionId) {
        throw new AppError('Sin permisos para acceder a este curso', 403);
      }
      return;
    }
    if (user.role === UserRole.TEACHER && course.teacherId !== user.id) {
      throw new AppError('Sin permisos para acceder a este curso', 403);
    }
  }

  private async ensureCanAccessTeam(teamId: string, user: AuthUser) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { group: { include: { course: true } } }
    });
    if (!team) throw new AppError('Equipo no encontrado', 404);

    if (user.role === UserRole.STUDENT) {
      const membership = await prisma.teamMember.findFirst({
        where: { teamId, userId: user.id, isActive: true },
        select: { id: true }
      });
      if (!membership) throw new AppError('Sin permisos para acceder a este equipo', 403);
      return team;
    }

    this.ensureCanAccessCourse(team.group.course, user);
    return team;
  }

  async listTeams(user: AuthUser, groupId?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (groupId) {
      const group = await prisma.group.findUnique({ where: { id: groupId }, include: { course: true } });
      if (!group) throw new AppError('Grupo no encontrado', 404);
      this.ensureCanAccessCourse(group.course, user);
      where.groupId = groupId;
    } else if (user.role === UserRole.ADMIN && user.institutionId) {
      where.group = { course: { institutionId: user.institutionId } };
    } else if (user.role === UserRole.TEACHER) {
      where.group = { course: { teacherId: user.id } };
    } else {
      where.members = { some: { userId: user.id, isActive: true } };
    }

    return prisma.team.findMany({
      where,
      include: {
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
        },
        group: { select: { name: true, courseId: true } }
      }
    });
  }

  async getTeamById(id: string, user: AuthUser) {
    await this.ensureCanAccessTeam(id, user);

    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: { include: { user: true } }, results: true }
    });
    if (!team) throw new AppError('Equipo no encontrado', 404);
    return team;
  }

  async createTeam(user: AuthUser, data: { groupId: string; name: string; description?: string }) {
    const group = await prisma.group.findUnique({ where: { id: data.groupId }, include: { course: true } });
    if (!group) throw new AppError('Grupo no encontrado', 404);
    this.ensureCanAccessCourse(group.course, user);

    return prisma.team.create({ data });
  }

  async addMember(teamId: string, userId: string, user: AuthUser, role?: string) {
    const team = await this.ensureCanAccessTeam(teamId, user);

    const groupMember = await prisma.groupMember.findFirst({
      where: { groupId: team.groupId, userId, isActive: true },
      select: { id: true }
    });
    if (!groupMember) throw new AppError('El usuario debe pertenecer al grupo antes de agregarse al equipo', 400);

    return prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId, role, isActive: true },
      update: { role, isActive: true }
    });
  }

  async removeMember(teamId: string, userId: string, user: AuthUser) {
    await this.ensureCanAccessTeam(teamId, user);
    await prisma.teamMember.updateMany({ where: { teamId, userId }, data: { isActive: false } });
  }
}

export const teamService = new TeamService();
