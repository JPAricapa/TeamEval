import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../constants/enums';
import { audit } from '../utils/audit';

type AuthUser = { id: string; role: UserRole; institutionId?: string };

function getCurrentAcademicPeriod(date = new Date()) {
  const year = date.getFullYear();
  const semester = date.getMonth() <= 4 ? 1 : 2;
  return {
    code: `${year}-${semester}`,
    name: `Semestre ${year}-${semester}`,
    startDate: new Date(`${year}-${semester === 1 ? '01-01' : '06-01'}`),
    endDate: new Date(`${year}-${semester === 1 ? '05-31' : '12-31'}`)
  };
}

class CourseService {
  async listCourses(user: AuthUser, periodId?: string) {
    const where: Record<string, unknown> = { isActive: true };

    if (user.role === UserRole.TEACHER) {
      where.teacherId = user.id;
    }

    if (user.role === UserRole.STUDENT) {
      const studentGroups = await prisma.groupMember.findMany({
        where: { userId: user.id, isActive: true },
        select: { group: { select: { courseId: true } } }
      });
      where.id = { in: studentGroups.map(gm => gm.group.courseId) };
    }

    if (periodId) where.periodId = periodId;

    const courses = await prisma.course.findMany({
      where,
      include: {
        teacher: { select: { firstName: true, lastName: true, email: true } },
        period: { select: { name: true, code: true } },
        program: { select: { name: true } },
        _count: { select: { groups: { where: { isActive: true } } } },
        groups: {
          where: { isActive: true },
          select: { _count: { select: { members: { where: { isActive: true } } } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return courses.map(({ groups, ...course }) => ({
      ...course,
      studentCount: groups.reduce((sum, g) => sum + (g._count?.members ?? 0), 0)
    }));
  }

  async getCourseById(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        period: true,
        program: true,
        groups: {
          where: { isActive: true },
          include: {
            members: {
              where: { isActive: true },
              include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
            },
            teams: {
              where: { isActive: true },
              include: { members: { where: { isActive: true }, include: { user: true } } }
            }
          }
        },
        courseRubrics: { include: { rubric: true } },
        evaluationProcesses: true
      }
    });
    if (!course) throw new AppError('Curso no encontrado', 404);
    return course;
  }

  async createCourse(user: AuthUser, data: { name: string; code: string; credits?: number; description?: string }) {
    if (!user.institutionId) throw new AppError('No se pudo determinar la institución del usuario', 400);

    const currentPeriod = getCurrentAcademicPeriod();

    await prisma.academicPeriod.updateMany({
      where: { isActive: true, code: { not: currentPeriod.code } },
      data: { isActive: false }
    });

    const activePeriod = await prisma.academicPeriod.upsert({
      where: { code: currentPeriod.code },
      update: { name: currentPeriod.name, startDate: currentPeriod.startDate, endDate: currentPeriod.endDate, isActive: true },
      create: { ...currentPeriod, isActive: true }
    });

    const electronicsProgram = await prisma.program.findFirst({
      where: {
        institutionId: user.institutionId,
        isActive: true,
        OR: [{ code: 'IE' }, { name: 'Ingeniería Electrónica' }, { name: 'Ingenieria Electronica' }]
      },
      orderBy: { createdAt: 'asc' }
    });

    const course = await prisma.course.create({
      data: {
        institutionId: user.institutionId,
        teacherId: user.id,
        periodId: activePeriod.id,
        programId: electronicsProgram?.id,
        ...data
      },
      include: {
        teacher: { select: { firstName: true, lastName: true, email: true } },
        period: { select: { name: true, code: true } },
        program: { select: { name: true } },
        _count: { select: { groups: true } }
      }
    });
    audit({ userId: user.id, action: 'COURSE_CREATED', entity: 'Course', entityId: course.id, details: { name: data.name, code: data.code } });
    return course;
  }

  async updateCourse(id: string, data: Record<string, unknown>) {
    return prisma.course.update({ where: { id }, data });
  }

  async deleteCourse(courseId: string, user: AuthUser) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { evaluationProcesses: true }
    });
    if (!course) throw new AppError('Curso no encontrado', 404);

    if (user.role === UserRole.TEACHER && course.teacherId !== user.id) {
      throw new AppError('No puedes eliminar un curso que no te pertenece', 403);
    }

    const activeProcess = course.evaluationProcesses.find(p => p.status === 'ACTIVE');
    if (activeProcess) throw new AppError('El curso tiene un proceso de evaluación activo. Ciérralo antes de eliminar el curso.', 400);

    const processIds = course.evaluationProcesses.map(p => p.id);
    await prisma.$transaction([
      prisma.evaluationScore.deleteMany({ where: { evaluation: { processId: { in: processIds } } } }),
      prisma.evaluation.deleteMany({ where: { processId: { in: processIds } } }),
      prisma.courseAnalytics.deleteMany({ where: { processId: { in: processIds } } }),
      prisma.teamAnalytics.deleteMany({ where: { processId: { in: processIds } } }),
      prisma.consolidatedResult.deleteMany({ where: { processId: { in: processIds } } }),
      prisma.evaluationProcess.deleteMany({ where: { courseId } }),
      prisma.courseRubric.deleteMany({ where: { courseId } }),
      prisma.groupMember.deleteMany({ where: { group: { courseId } } }),
      prisma.teamMember.deleteMany({ where: { team: { group: { courseId } } } }),
      prisma.team.deleteMany({ where: { group: { courseId } } }),
      prisma.group.deleteMany({ where: { courseId } }),
      prisma.course.delete({ where: { id: courseId } })
    ]);
    audit({ userId: user.id, action: 'COURSE_DELETED', entity: 'Course', entityId: courseId, details: { name: course.name, code: course.code } });
  }

  async assignRubric(courseId: string, rubricId: string, evaluationType?: string) {
    return prisma.courseRubric.create({ data: { courseId, rubricId, evaluationType } });
  }
}

export const courseService = new CourseService();
