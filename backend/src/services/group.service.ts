import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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

function generateTemporaryPassword() {
  return crypto.randomBytes(12).toString('base64url');
}

class GroupService {
  private ensureCanAccessCourse(course: { id: string; teacherId: string; institutionId: string }, user: AuthUser) {
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

  private async ensureCanAccessGroup(groupId: string, user: AuthUser) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { course: true }
    });
    if (!group) throw new AppError('Grupo no encontrado', 404);

    if (user.role === UserRole.STUDENT) {
      const membership = await prisma.groupMember.findFirst({
        where: { groupId, userId: user.id, isActive: true },
        select: { id: true }
      });
      if (!membership) throw new AppError('Sin permisos para acceder a este grupo', 403);
      return group;
    }

    this.ensureCanAccessCourse(group.course, user);
    return group;
  }

  async listGroups(user: AuthUser, courseId?: string) {
    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) throw new AppError('Curso no encontrado', 404);
      this.ensureCanAccessCourse(course, user);
    }

    const where: Record<string, unknown> = { isActive: true };
    if (courseId) {
      where.courseId = courseId;
    } else if (user.role === UserRole.ADMIN && user.institutionId) {
      where.course = { institutionId: user.institutionId };
    } else if (user.role === UserRole.TEACHER) {
      where.course = { teacherId: user.id };
    } else {
      where.members = { some: { userId: user.id, isActive: true } };
    }

    return prisma.group.findMany({
      where,
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

  async getGroupById(id: string, user: AuthUser) {
    await this.ensureCanAccessGroup(id, user);

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
    this.ensureCanAccessCourse(course, user);

    const normalizedName = normalizeGroupName(data.name);
    const existingGroup = await prisma.group.findFirst({
      where: { courseId: data.courseId, name: { equals: normalizedName, mode: 'insensitive' } }
    });
    if (existingGroup) throw new AppError('Ya existe un grupo con ese nombre en este curso', 409);

    const group = await prisma.group.create({ data: { ...data, name: normalizedName } });
    audit({ userId: user.id, action: 'GROUP_CREATED', entity: 'Group', entityId: group.id, details: { name: normalizedName, courseId: data.courseId } });
    return group;
  }

  async addMember(groupId: string, userId: string, actor: AuthUser) {
    const group = await this.ensureCanAccessGroup(groupId, actor);

    const student = await prisma.user.findFirst({
      where: { id: userId, role: UserRole.STUDENT, isActive: true }
    });
    if (!student) throw new AppError('Estudiante no encontrado o inactivo', 404);
    if (student.institutionId && student.institutionId !== group.course.institutionId) {
      throw new AppError('El estudiante pertenece a otra institución', 400);
    }

    return prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId, isActive: true },
      update: { isActive: true },
    });
  }

  async addStudent(groupId: string, requester: AuthUser, studentData: {
    email: string; firstName: string; lastName: string; nationalId: string;
  }) {
    const group = await this.ensureCanAccessGroup(groupId, requester);

    const { firstName, lastName, nationalId } = studentData;
    const email = normalizeEmail(studentData.email);

    let user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    let initialPassword: string | null = null;

    if (!user) {
      const byNationalId = await prisma.user.findUnique({ where: { nationalId } });
      if (byNationalId) throw new AppError('La cédula ya está registrada con otro correo', 409);

      const temporaryPassword = generateTemporaryPassword();
      initialPassword = temporaryPassword;
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      user = await prisma.user.create({
        data: {
          email, firstName, lastName, nationalId, passwordHash,
          role: UserRole.STUDENT, institutionId: group.course.institutionId, isActive: true
        }
      });
    } else if (user.role !== UserRole.STUDENT) {
      throw new AppError('El correo ya pertenece a un usuario que no es estudiante', 409);
    } else if (user.institutionId && user.institutionId !== group.course.institutionId) {
      throw new AppError('El estudiante pertenece a otra institución', 400);
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
      initialPassword
    };
  }

  async renameGroup(groupId: string, name: string, user: AuthUser) {
    const group = await this.ensureCanAccessGroup(groupId, user);
    const updated = await prisma.group.update({ where: { id: groupId }, data: { name: name.trim() }, select: { id: true, name: true } });
    audit({ userId: user.id, action: 'GROUP_RENAMED', entity: 'Group', entityId: groupId, details: { newName: name.trim(), oldName: group.name } });
    return updated;
  }

  async removeMember(groupId: string, memberId: string, actor?: AuthUser) {
    if (actor) await this.ensureCanAccessGroup(groupId, actor);
    await prisma.groupMember.updateMany({ where: { groupId, userId: memberId }, data: { isActive: false } });
    audit({ userId: actor?.id ?? null, action: 'MEMBER_REMOVED', entity: 'GroupMember', entityId: groupId, details: { memberId } });
  }

  async deleteGroup(groupId: string, user: AuthUser) {
    await this.ensureCanAccessGroup(groupId, user);

    await prisma.$transaction([
      prisma.groupMember.updateMany({ where: { groupId }, data: { isActive: false } }),
      prisma.group.update({ where: { id: groupId }, data: { isActive: false } })
    ]);
  }
}

export const groupService = new GroupService();
