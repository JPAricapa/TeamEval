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

const WITH_MEMBERSHIPS = {
  id: true, email: true, firstName: true, lastName: true, nationalId: true,
  role: true, isActive: true, createdAt: true, updatedAt: true, institutionId: true,
  studentGroups: {
    where: { isActive: true, group: { isActive: true } },
    take: 1,
    select: {
      group: {
        select: {
          id: true, name: true,
          course: { select: { id: true, name: true, code: true } }
        }
      }
    }
  },
  teamMemberships: {
    where: { isActive: true },
    take: 1,
    select: { team: { select: { id: true, name: true } } }
  }
} as const;

function flattenMemberships(user: {
  studentGroups: Array<{ group: { id: string; name: string; course: { id: string; name: string; code: string } | null } | null }>;
  teamMemberships: Array<{ team: { id: string; name: string } }>;
  [key: string]: unknown;
}) {
  const { studentGroups, teamMemberships, ...rest } = user;
  const group = studentGroups[0]?.group;
  return {
    ...rest,
    groupName: group?.name ?? null,
    courseName: group?.course?.name ?? null,
    courseCode: group?.course?.code ?? null,
    teamName: teamMemberships[0]?.team.name ?? null
  };
}

class UserService {
  async listUsers(params: { requester: AuthUser; page?: number; limit?: number; role?: UserRole; search?: string }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(params.requester.institutionId && { institutionId: params.requester.institutionId }),
      ...(params.requester.role === UserRole.TEACHER && {
        OR: [
          { id: params.requester.id },
          {
            studentGroups: {
              some: {
                isActive: true,
                group: { course: { teacherId: params.requester.id } }
              }
            }
          }
        ]
      }),
      ...(params.role && { role: params.role }),
      ...(params.search && {
        AND: [{
          OR: [
          { firstName: { contains: params.search, mode: 'insensitive' as const } },
          { lastName: { contains: params.search, mode: 'insensitive' as const } },
          { email: { contains: params.search, mode: 'insensitive' as const } }
          ]
        }]
      })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take: limit, select: WITH_MEMBERSHIPS, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where })
    ]);

    return { users: users.map(flattenMemberships), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, avatarUrl: true, createdAt: true,
        institution: { select: { id: true, name: true } }
      }
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    return user;
  }

  async getUserById(id: string, requester: AuthUser) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isActive: true, createdAt: true,
        institution: { select: { id: true, name: true } }
      }
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    if (requester.role === UserRole.ADMIN && requester.institutionId && user.institution?.id !== requester.institutionId) {
      throw new AppError('Sin permisos para ver este usuario', 403);
    }
    if (requester.role === UserRole.TEACHER && requester.id !== id) {
      const teachesUser = await prisma.groupMember.findFirst({
        where: {
          userId: id,
          isActive: true,
          group: { course: { teacherId: requester.id } }
        },
        select: { id: true }
      });
      if (!teachesUser) throw new AppError('Sin permisos para ver este usuario', 403);
    }
    return user;
  }

  async createUser(requester: AuthUser, data: {
    email: string; firstName: string; lastName: string; nationalId: string; role: UserRole;
  }) {
    if (!requester.institutionId) throw new AppError('No se pudo determinar la institución del administrador', 400);
    const email = normalizeEmail(data.email);

    const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (existing) throw new AppError('El correo ya está registrado', 409);

    const existingNationalId = await prisma.user.findUnique({ where: { nationalId: data.nationalId } });
    if (existingNationalId) throw new AppError('La cédula ya está registrada', 409);

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const created = await prisma.user.create({
      data: { ...data, email, passwordHash, institutionId: requester.institutionId, isActive: true },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true, institutionId: true }
    });
    audit({ userId: requester.id, action: 'USER_CREATED', entity: 'User', entityId: created.id, details: { email, role: data.role } });
    return { ...created, initialPassword: temporaryPassword };
  }

  async updateUser(id: string, requester: AuthUser, data: { firstName?: string; lastName?: string; email?: string; nationalId?: string; isActive?: boolean }) {
    const targetUser = await prisma.user.findUnique({ where: { id }, select: { role: true, institutionId: true } });
    if (!targetUser) throw new AppError('Usuario no encontrado', 404);

    if (requester.role !== UserRole.ADMIN && requester.id !== id) {
      throw new AppError('Sin permisos para editar este usuario', 403);
    }
    if (requester.role === UserRole.ADMIN && requester.institutionId && targetUser.institutionId !== requester.institutionId) {
      throw new AppError('Sin permisos para editar este usuario', 403);
    }

    const updateData: Record<string, unknown> = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email !== undefined && requester.role === UserRole.ADMIN) {
      const email = normalizeEmail(data.email);
      const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, NOT: { id } } });
      if (existing) throw new AppError('El correo ya está registrado por otro usuario', 409);
      updateData.email = email;
    }
    if (data.nationalId !== undefined && requester.role === UserRole.ADMIN) {
      const existing = await prisma.user.findFirst({ where: { nationalId: data.nationalId, NOT: { id } } });
      if (existing) throw new AppError('La cédula ya está registrada por otro usuario', 409);
      updateData.nationalId = data.nationalId;
    }
    if (data.isActive !== undefined && requester.role === UserRole.ADMIN) {
      if (targetUser.role === UserRole.ADMIN) throw new AppError('El docente principal no puede cambiar su estado', 400);
      updateData.isActive = data.isActive;
    }

    const user = await prisma.user.update({ where: { id }, data: updateData, select: WITH_MEMBERSHIPS });
    audit({ userId: requester.id, action: 'USER_UPDATED', entity: 'User', entityId: id, details: { fields: Object.keys(updateData) } });
    return flattenMemberships(user);
  }

  async deleteUser(id: string, requester: AuthUser) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, role: true, firstName: true, lastName: true, institutionId: true,
        teacherCourses: { select: { id: true }, take: 1 },
        rubrics: { select: { id: true }, take: 1 },
        evaluationsGiven: { select: { id: true }, take: 1 },
        evaluationsReceived: { select: { id: true }, take: 1 }
      }
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    if (requester.institutionId && user.institutionId !== requester.institutionId) {
      throw new AppError('Sin permisos para eliminar este usuario', 403);
    }
    if (user.role === UserRole.ADMIN) throw new AppError('No se puede eliminar un usuario administrador', 400);
    if (user.teacherCourses.length > 0) throw new AppError('No se puede eliminar un docente que tiene cursos asignados', 400);
    if (user.rubrics.length > 0) throw new AppError('No se puede eliminar un usuario que creó rúbricas', 400);
    if (user.evaluationsGiven.length > 0 || user.evaluationsReceived.length > 0) {
      throw new AppError('No se puede eliminar un estudiante con evaluaciones registradas', 400);
    }

    const consolidatedResultsCount = await prisma.consolidatedResult.count({ where: { studentId: id } });
    if (consolidatedResultsCount > 0) throw new AppError('No se puede eliminar un estudiante con resultados consolidados', 400);

    await prisma.$transaction([
      prisma.auditLog.updateMany({ where: { userId: id }, data: { userId: null } }),
      prisma.teamMember.deleteMany({ where: { userId: id } }),
      prisma.groupMember.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } })
    ]);

    audit({ userId: requester.id, action: 'USER_DELETED', entity: 'User', entityId: id, details: { name: `${user.firstName} ${user.lastName}`, role: user.role } });
    return `${user.firstName} ${user.lastName}`;
  }

  async bulkImportStudents(
    requester: AuthUser,
    courseId: string,
    rawGroupName: string,
    students: Array<{ firstName: string; lastName: string; email: string; nationalId: string }>
  ) {
    const groupName = normalizeGroupName(rawGroupName);

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError('Curso no encontrado', 404);
    if (requester.role === UserRole.TEACHER && course.teacherId !== requester.id) {
      throw new AppError('No eres el docente de este curso', 403);
    }

    let group = await prisma.group.findFirst({
      where: { courseId, name: { equals: groupName, mode: 'insensitive' } }
    });
    if (!group) {
      group = await prisma.group.create({ data: { courseId, name: groupName } });
    }

    const created: Array<{ email: string; initialPassword: string }> = [];
    const existing: Array<{ email: string }> = [];
    const errors: Array<{ row: number; email: string; reason: string }> = [];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const email = normalizeEmail(s.email);
      try {
        let user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

        if (!user) {
          const byNationalId = await prisma.user.findUnique({ where: { nationalId: s.nationalId } });
          if (byNationalId) {
            errors.push({ row: i + 1, email, reason: 'La cédula ya está registrada a otro correo' });
            continue;
          }
          const temporaryPassword = generateTemporaryPassword();
          const passwordHash = await bcrypt.hash(temporaryPassword, 12);
          user = await prisma.user.create({
            data: {
              email, nationalId: s.nationalId, passwordHash,
              firstName: s.firstName, lastName: s.lastName,
              role: UserRole.STUDENT, institutionId: course.institutionId, isActive: true
            }
          });
          created.push({ email, initialPassword: temporaryPassword });
        } else {
          if (user.role !== UserRole.STUDENT) {
            errors.push({ row: i + 1, email, reason: 'El correo ya pertenece a un usuario que no es estudiante' });
            continue;
          }
          if (user.institutionId && user.institutionId !== course.institutionId) {
            errors.push({ row: i + 1, email, reason: 'El estudiante pertenece a otra institución' });
            continue;
          }
          if (user.email !== email) {
            user = await prisma.user.update({ where: { id: user.id }, data: { email } });
          }
          existing.push({ email });
        }

        await prisma.groupMember.upsert({
          where: { groupId_userId: { groupId: group.id, userId: user.id } },
          update: { isActive: true },
          create: { groupId: group.id, userId: user.id }
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        errors.push({ row: i + 1, email, reason: message });
      }
    }

    audit({ userId: requester.id, action: 'BULK_IMPORT', entity: 'User', entityId: courseId, details: { group: group.name, total: students.length, created: created.length, errors: errors.length } });
    return {
      summary: { total: students.length, created: created.length, existing: existing.length, errors: errors.length },
      group: { id: group.id, name: group.name },
      details: { created, existing, errors }
    };
  }
}

export const userService = new UserService();
