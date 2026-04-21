import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../constants/enums';
import { audit } from '../utils/audit';

type AuthUser = { id: string; role: UserRole; institutionId?: string };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeGroupName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

class GroupService {
  async listGroups(courseId?: string) {
    return prisma.group.findMany({
      where: { isActive: true, ...(courseId ? { courseId } : {}) },
      include: {
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
        },
        teams: {
          include: {
            members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }
          }
        }
      }
    });
  }

  async getGroupById(id: string) {
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: { include: { user: true } },
        teams: { include: { members: { include: { user: true } } } }
      }
    });
    if (!group) throw new AppError('Grupo no encontrado', 404);
    return group;
  }

  async createGroup(user: AuthUser, data: { courseId: string; name: string; description?: string }) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) throw new AppError('Curso no encontrado', 404);
    if (user.role === UserRole.TEACHER && course.teacherId !== user.id) {
      throw new AppError('No puedes crear grupos en un curso que no te pertenece', 403);
    }

    const normalizedName = normalizeGroupName(data.name);
    const existingGroup = await prisma.group.findFirst({
      where: { courseId: data.courseId, name: { equals: normalizedName, mode: 'insensitive' } }
    });
    if (existingGroup) throw new AppError('Ya existe un grupo con ese nombre en este curso', 409);

    const group = await prisma.group.create({ data: { ...data, name: normalizedName } });
    audit({ userId: user.id, action: 'GROUP_CREATED', entity: 'Group', entityId: group.id, details: { name: normalizedName, courseId: data.courseId } });
    return group;
  }

  async addMember(groupId: string, userId: string) {
    return prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId, isActive: true },
      update: { isActive: true },
    });
  }

  async addStudent(groupId: string, requester: AuthUser, studentData: {
    email: string; firstName: string; lastName: string; nationalId: string;
  }) {
    const group = await prisma.group.findUnique({ where: { id: groupId }, include: { course: true } });
    if (!group) throw new AppError('Grupo no encontrado', 404);
    if (requester.role === UserRole.TEACHER && group.course.teacherId !== requester.id) {
      throw new AppError('No puedes registrar estudiantes en un curso que no te pertenece', 403);
    }

    const { firstName, lastName, nationalId } = studentData;
    const email = normalizeEmail(studentData.email);

    let user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

    if (!user) {
      const byNationalId = await prisma.user.findUnique({ where: { nationalId } });
      if (byNationalId) throw new AppError('La cédula ya está registrada con otro correo', 409);

      const passwordHash = await bcrypt.hash(nationalId, 12);
      user = await prisma.user.create({
        data: {
          email, firstName, lastName, nationalId, passwordHash,
          role: UserRole.STUDENT, institutionId: group.course.institutionId, isActive: true
        }
      });
    } else if (user.role !== UserRole.STUDENT) {
      throw new AppError('El correo ya pertenece a un usuario que no es estudiante', 409);
    } else if (user.email !== email) {
      user = await prisma.user.update({ where: { id: user.id }, data: { email } });
    }

    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
      update: { isActive: true },
      create: { groupId: group.id, userId: user.id }
    });

    return {
      user: {
        id: user.id, email: user.email, firstName: user.firstName,
        lastName: user.lastName, role: user.role, isActive: user.isActive
      },
      initialPassword: nationalId
    };
  }

  async renameGroup(groupId: string, name: string, user: AuthUser) {
    const group = await prisma.group.findUnique({ where: { id: groupId }, include: { course: true } });
    if (!group) throw new AppError('Grupo no encontrado', 404);
    if (user.role === UserRole.TEACHER && group.course.teacherId !== user.id) {
      throw new AppError('No puedes editar grupos de un curso que no te pertenece', 403);
    }
    const updated = await prisma.group.update({ where: { id: groupId }, data: { name: name.trim() }, select: { id: true, name: true } });
    audit({ userId: user.id, action: 'GROUP_RENAMED', entity: 'Group', entityId: groupId, details: { newName: name.trim(), oldName: group.name } });
    return updated;
  }

  async removeMember(groupId: string, userId: string) {
    await prisma.groupMember.updateMany({ where: { groupId, userId }, data: { isActive: false } });
    audit({ userId: null, action: 'MEMBER_REMOVED', entity: 'GroupMember', entityId: groupId, details: { userId } });
  }

  async deleteGroup(groupId: string, user: AuthUser) {
    const group = await prisma.group.findUnique({ where: { id: groupId }, include: { course: true } });
    if (!group) throw new AppError('Grupo no encontrado', 404);
    if (user.role === UserRole.TEACHER && group.course.teacherId !== user.id) {
      throw new AppError('No puedes eliminar grupos de un curso que no te pertenece', 403);
    }

    await prisma.$transaction([
      prisma.groupMember.updateMany({ where: { groupId }, data: { isActive: false } }),
      prisma.group.update({ where: { id: groupId }, data: { isActive: false } })
    ]);
  }
}

export const groupService = new GroupService();
