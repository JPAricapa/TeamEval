/**
 * Rutas de gestión de usuarios
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { authenticate, adminOnly, teacherOrAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { sendMail, buildInvitationEmail } from '../utils/mailer';
import { UserRole } from '../constants/enums';

const router = Router();
router.use(authenticate);

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
            role: true, isActive: true, createdAt: true, institutionId: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      sendSuccess(res, users, 'Usuarios obtenidos', 200, {
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

// POST /users - Crear usuario e invitar por correo (admin)
// No requiere contraseña: el usuario la establece al aceptar la invitación.
router.post(
  '/',
  adminOnly,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('firstName').trim().notEmpty().withMessage('Nombre requerido'),
    body('lastName').trim().notEmpty().withMessage('Apellido requerido'),
    body('role').isIn(Object.values(UserRole)).withMessage('Rol inválido'),
    body('institutionId').optional().isUUID()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, firstName, lastName, role, institutionId } = req.body;

      // Verificar que el email no exista
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new AppError('El correo ya está registrado', 409);

      // Contraseña provisional aleatoria — el usuario NUNCA la verá
      const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

      // Crear usuario inactivo hasta que acepte la invitación
      const user = await prisma.user.create({
        data: {
          email, passwordHash: placeholderHash,
          firstName, lastName, role, institutionId,
          isActive: false   // se activa al aceptar la invitación
        },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isActive: true, createdAt: true
        }
      });

      // Generar token de invitación (válido 7 días)
      const plainToken = crypto.randomBytes(32).toString('hex');
      const tokenHash  = crypto.createHash('sha256').update(plainToken).digest('hex');
      const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.userInvitation.create({
        data: { userId: user.id, tokenHash, expiresAt }
      });

      // Enviar correo de invitación
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
      const inviteUrl   = `${frontendUrl}/accept-invitation?token=${plainToken}`;
      const adminName   = `${req.user!.firstName} ${req.user!.lastName}`;

      await sendMail({
        to: email,
        subject: `${adminName} te invitó a TeamEval — Activa tu cuenta`,
        html: buildInvitationEmail(inviteUrl, firstName, adminName, role)
      });

      sendCreated(res, user, `Invitación enviada a ${email}`);
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
        updateData.isActive = isActive;
      }

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: updateData,
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isActive: true, updatedAt: true
        }
      });

      sendSuccess(res, user, 'Usuario actualizado');
    } catch (error) { next(error); }
  }
);

export default router;
