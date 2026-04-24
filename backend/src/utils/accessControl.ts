import { prisma } from './prisma';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../constants/enums';

export type AuthUser = { id: string; role: UserRole; institutionId?: string };

export async function assertCourseAccess(courseId: string, user: AuthUser) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError('Curso no encontrado', 404);

  if (user.role === UserRole.ADMIN) {
    if (user.institutionId && course.institutionId !== user.institutionId) {
      throw new AppError('Sin permisos para acceder a este curso', 403);
    }
    return course;
  }

  if (user.role === UserRole.TEACHER) {
    if (course.teacherId !== user.id) throw new AppError('Sin permisos para acceder a este curso', 403);
    return course;
  }

  const membership = await prisma.groupMember.findFirst({
    where: { userId: user.id, isActive: true, group: { courseId, isActive: true } },
    select: { id: true }
  });
  if (!membership) throw new AppError('Sin permisos para acceder a este curso', 403);
  return course;
}

export async function assertProcessAccess(processId: string, user: AuthUser) {
  const process = await prisma.evaluationProcess.findUnique({ where: { id: processId } });
  if (!process) throw new AppError('Proceso no encontrado', 404);
  await assertCourseAccess(process.courseId, user);
  return process;
}

export async function assertTeamBelongsToProcess(teamId: string, processId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { group: { select: { courseId: true } } }
  });
  if (!team) throw new AppError('Equipo no encontrado', 404);

  const process = await prisma.evaluationProcess.findUnique({
    where: { id: processId },
    select: { courseId: true }
  });
  if (!process) throw new AppError('Proceso no encontrado', 404);
  if (team.group.courseId !== process.courseId) {
    throw new AppError('El equipo no pertenece al proceso indicado', 400);
  }
  return team;
}

export async function assertStudentBelongsToProcess(studentId: string, processId: string) {
  const process = await prisma.evaluationProcess.findUnique({
    where: { id: processId },
    select: { courseId: true }
  });
  if (!process) throw new AppError('Proceso no encontrado', 404);

  const membership = await prisma.groupMember.findFirst({
    where: { userId: studentId, isActive: true, group: { courseId: process.courseId, isActive: true } },
    select: { id: true }
  });
  if (!membership) throw new AppError('El estudiante no pertenece al proceso indicado', 400);
}

export function assertInstitutionAccess(institutionId: string, user: AuthUser) {
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.TEACHER) {
    throw new AppError('Sin permisos para acceder a esta institución', 403);
  }
  if (user.institutionId && user.institutionId !== institutionId) {
    throw new AppError('Sin permisos para acceder a esta institución', 403);
  }
}
