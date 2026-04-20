/**
 * Rutas de gestión de usuarios
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { authenticate, adminOnly, teacherOrAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../constants/enums';

const router = Router();
router.use(authenticate);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeGroupName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

// GET /users - Listar usuarios (admin)
router.get(
  '/',
  adminOnly,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('role').optional().isIn(Object.values(UserRole)),
    query('search').optional().isString()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const role = req.query.role as UserRole | undefined;
      const search = req.query.search as string | undefined;

      const where = {
        ...(role && { role }),
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } }
          ]
        })
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true, email: true, firstName: true, lastName: true,
            role: true, isActive: true, createdAt: true, institutionId: true,
            studentGroups: {
              where: {
                isActive: true,
                group: { isActive: true }
              },
              take: 1,
              select: {
                group: {
                  select: {
                    id: true,
                    name: true,
                    course: { select: { id: true, name: true, code: true } }
                  }
                }
              }
            },
            teamMemberships: {
              where: { isActive: true },
              take: 1,
              select: {
                team: {
                  select: { id: true, name: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      const normalizedUsers = users.map(({ studentGroups, teamMemberships, ...user }) => {
        const group = studentGroups[0]?.group;
        return {
          ...user,
          groupName: group?.name ?? null,
          courseName: group?.course?.name ?? null,
          courseCode: group?.course?.code ?? null,
          teamName: teamMemberships[0]?.team.name ?? null
        };
      });

      sendSuccess(res, normalizedUsers, 'Usuarios obtenidos', 200, {
        total, page, limit, totalPages: Math.ceil(total / limit)
      });
    } catch (error) { next(error); }
  }
);

// GET /users/me - Perfil del usuario autenticado
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, avatarUrl: true, createdAt: true,
        institution: { select: { id: true, name: true } }
      }
    });
    if (!user) return sendNotFound(res, 'Usuario no encontrado');
    sendSuccess(res, user, 'Perfil obtenido');
  } catch (error) { next(error); }
});

// GET /users/:id - Obtener usuario por ID
router.get(
  '/:id',
  teacherOrAdmin,
  [param('id').isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isActive: true, createdAt: true,
          institution: { select: { id: true, name: true } }
        }
      });
      if (!user) return sendNotFound(res);
      sendSuccess(res, user);
    } catch (error) { next(error); }
  }
);

// POST /users - Crear usuario (admin)
// La contraseña inicial es la cédula y el usuario queda activo.
router.post(
  '/',
  adminOnly,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('firstName').trim().notEmpty().withMessage('Nombre requerido'),
    body('lastName').trim().notEmpty().withMessage('Apellido requerido'),
    body('nationalId').trim().notEmpty().withMessage('Cédula requerida'),
    body('role').isIn(Object.values(UserRole)).withMessage('Rol inválido'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, nationalId, role } = req.body;
      const email = normalizeEmail(req.body.email);

      // Verificar que el email no exista
      const existing = await prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: 'insensitive'
          }
        }
      });
      if (existing) throw new AppError('El correo ya está registrado', 409);

      const existingNationalId = await prisma.user.findUnique({ where: { nationalId } });
      if (existingNationalId) throw new AppError('La cédula ya está registrada', 409);

      const institutionId = req.user?.institutionId;
      if (!institutionId) {
        throw new AppError('No se pudo determinar la institución del administrador', 400);
      }

      const passwordHash = await bcrypt.hash(nationalId, 12);

      const user = await prisma.user.create({
        data: {
          email,
          nationalId,
          passwordHash,
          firstName,
          lastName,
          role,
          institutionId,
          isActive: true
        },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isActive: true, createdAt: true, institutionId: true
        }
      });

      sendCreated(res, user, `Usuario creado exitosamente: ${email}`);
    } catch (error) { next(error); }
  }
);

// POST /users/bulk-import-students - Carga masiva de estudiantes a un curso
// El docente del curso (o admin) sube una lista. Cada estudiante nuevo se crea con
// passwordHash = hash(nationalId), queda activo y se agrega al grupo indicado.
router.post(
  '/bulk-import-students',
  teacherOrAdmin,
  [
    body('courseId').isUUID().withMessage('courseId inválido'),
    body('groupName').trim().notEmpty().withMessage('groupName requerido'),
    body('students').isArray({ min: 1 }).withMessage('Lista de estudiantes requerida'),
    body('students.*.firstName').trim().notEmpty(),
    body('students.*.lastName').trim().notEmpty(),
    body('students.*.email').isEmail().normalizeEmail(),
    body('students.*.nationalId').trim().notEmpty().withMessage('La cédula es requerida')
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, students } = req.body as {
        courseId: string;
        groupName: string;
        students: Array<{ firstName: string; lastName: string; email: string; nationalId: string }>;
      };
      const groupName = normalizeGroupName(req.body.groupName);

      // Verificar que el curso existe y que el docente es dueño (admin ignora).
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) throw new AppError('Curso no encontrado', 404);
      if (req.user!.role === UserRole.TEACHER && course.teacherId !== req.user!.id) {
        throw new AppError('No eres el docente de este curso', 403);
      }

      // Obtener o crear el grupo por (courseId, name)
      let group = await prisma.group.findFirst({
        where: {
          courseId,
          name: {
            equals: groupName,
            mode: 'insensitive'
          }
        }
      });
      if (!group) {
        group = await prisma.group.create({
          data: { courseId, name: groupName }
        });
      }

      const created: Array<{ email: string; nationalId: string }> = [];
      const existing: Array<{ email: string }> = [];
      const errors: Array<{ row: number; email: string; reason: string }> = [];

      for (let i = 0; i < students.length; i++) {
        const s = students[i];
        const normalizedEmail = normalizeEmail(s.email);
        try {
          // ¿Ya existe un usuario con ese email?
          let user = await prisma.user.findFirst({
            where: {
              email: {
                equals: normalizedEmail,
                mode: 'insensitive'
              }
            }
          });

          if (!user) {
            // Validar que la cédula no esté tomada por otro usuario
            const byNationalId = await prisma.user.findUnique({
              where: { nationalId: s.nationalId }
            });
            if (byNationalId) {
              errors.push({
                row: i + 1,
                email: normalizedEmail,
                reason: 'La cédula ya está registrada a otro correo'
              });
              continue;
            }

            const passwordHash = await bcrypt.hash(s.nationalId, 12);
            user = await prisma.user.create({
              data: {
                email: normalizedEmail,
                nationalId: s.nationalId,
                passwordHash,
                firstName: s.firstName,
                lastName: s.lastName,
                role: UserRole.STUDENT,
                institutionId: course.institutionId,
                isActive: true
              }
            });
            created.push({ email: normalizedEmail, nationalId: s.nationalId });
          } else {
            if (user.role !== UserRole.STUDENT) {
              errors.push({
                row: i + 1,
                email: normalizedEmail,
                reason: 'El correo ya pertenece a un usuario que no es estudiante'
              });
              continue;
            }

            if (user.email !== normalizedEmail) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { email: normalizedEmail }
              });
            }
            existing.push({ email: normalizedEmail });
          }

          // Asegurar membership en el grupo (upsert por la unique groupId_userId)
          await prisma.groupMember.upsert({
            where: { groupId_userId: { groupId: group.id, userId: user.id } },
            update: { isActive: true },
            create: { groupId: group.id, userId: user.id }
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error desconocido';
          errors.push({ row: i + 1, email: normalizedEmail, reason: message });
        }
      }

      sendSuccess(
        res,
        {
          summary: {
            total: students.length,
            created: created.length,
            existing: existing.length,
            errors: errors.length
          },
          group: { id: group.id, name: group.name },
          details: { created, existing, errors }
        },
        `Importación completada: ${created.length} creados, ${existing.length} ya existían, ${errors.length} errores`
      );
    } catch (error) { next(error); }
  }
);

// PATCH /users/:id - Actualizar usuario
router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('isActive').optional().isBoolean()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { role: true }
      });
      if (!targetUser) return sendNotFound(res, 'Usuario no encontrado');

      // Solo admin puede editar otros usuarios; usuarios pueden editarse a sí mismos
      if (req.user!.role !== UserRole.ADMIN && req.user!.id !== req.params.id) {
        throw new AppError('Sin permisos para editar este usuario', 403);
      }

      const { firstName, lastName, isActive } = req.body;
      const updateData: Record<string, unknown> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      // Solo admins pueden cambiar isActive
      if (isActive !== undefined && req.user!.role === UserRole.ADMIN) {
        if (targetUser.role === UserRole.ADMIN) {
          throw new AppError('El docente principal no puede cambiar su estado', 400);
        }
        updateData.isActive = isActive;
      }

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: updateData,
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isActive: true, updatedAt: true,
          studentGroups: {
            where: {
              isActive: true,
              group: { isActive: true }
            },
            take: 1,
            select: {
              group: {
                select: {
                  id: true,
                  name: true,
                  course: { select: { id: true, name: true, code: true } }
                }
              }
            }
          },
          teamMemberships: {
            where: { isActive: true },
            take: 1,
            select: {
              team: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });

      const { studentGroups, teamMemberships, ...normalizedUser } = user;
      const group = studentGroups[0]?.group;
      sendSuccess(res, {
        ...normalizedUser,
        groupName: group?.name ?? null,
        courseName: group?.course?.name ?? null,
        courseCode: group?.course?.code ?? null,
        teamName: teamMemberships[0]?.team.name ?? null
      }, 'Usuario actualizado');
    } catch (error) { next(error); }
  }
);

export default router;
