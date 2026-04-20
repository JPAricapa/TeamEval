/**
 * Servicio de Autenticación
 * Maneja login, registro, refresh tokens, logout y recuperación de contraseña
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { JwtPayload } from '../middleware/auth.middleware';
import { sendMail, buildPasswordResetEmail } from '../utils/mailer';
import { UserRole } from '../constants/enums';

const SALT_ROUNDS = 12;

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  institutionId?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}

export class AuthService {
  /**
   * Registrar nuevo usuario
   */
  async register(dto: RegisterDto): Promise<AuthTokens> {
    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: dto.email }
    });

    if (existingUser) {
      throw new AppError('El email ya está registrado', 409);
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        institutionId: dto.institutionId
      }
    });

    // Generar tokens
    return this.generateTokens({ ...user, role: user.role as UserRole });
  }

  /**
   * Iniciar sesión
   */
  async login(dto: LoginDto): Promise<AuthTokens> {
    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: dto.email }
    });

    if (!user || !user.isActive) {
      throw new AppError('Credenciales inválidas', 401);
    }

    // Verificar contraseña
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new AppError('Credenciales inválidas', 401);
    }

    return this.generateTokens({ ...user, role: user.role as UserRole });
  }

  /**
   * Refrescar tokens
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Verificar refresh token en BD
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!storedToken || storedToken.isRevoked) {
      throw new AppError('Refresh token inválido', 401);
    }

    if (new Date() > storedToken.expiresAt) {
      // Revocar token expirado
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true }
      });
      throw new AppError('Refresh token expirado', 401);
    }

    // Verificar firma JWT
    try {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
    } catch {
      throw new AppError('Refresh token inválido', 401);
    }

    // Revocar token antiguo
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true }
    });

    // Generar nuevos tokens
    return this.generateTokens({ ...storedToken.user, role: storedToken.user.role as UserRole });
  }

  /**
   * Cerrar sesión (revocar refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true }
    });
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new AppError('Usuario no encontrado', 404);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Contraseña actual incorrecta', 401);

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    // Revocar todos los refresh tokens del usuario
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true }
    });
  }

  /**
   * Solicitar restablecimiento de contraseña
   * Genera un token seguro, lo guarda hasheado en BD y envía email.
   * Siempre responde con éxito para no revelar si el email existe.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });

    // Responder igual aunque el usuario no exista (seguridad)
    if (!user || !user.isActive) return;

    // Invalidar tokens previos del mismo usuario
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Generar token aleatorio seguro (32 bytes → 64 hex chars)
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    // Expira en 1 hora
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt }
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${plainToken}`;

    await sendMail({
      to: user.email,
      subject: 'Restablece tu contraseña — TeamEval',
      html: buildPasswordResetEmail(resetUrl, user.firstName)
    });
  }

  /**
   * Restablecer contraseña usando el token del email
   */
  async resetPassword(plainToken: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!record) {
      throw new AppError('Token inválido o expirado', 400);
    }

    if (record.usedAt) {
      throw new AppError('Este enlace ya fue utilizado', 400);
    }

    if (new Date() > record.expiresAt) {
      throw new AppError('El enlace ha expirado. Solicita uno nuevo.', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.$transaction([
      // Actualizar contraseña
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash }
      }),
      // Marcar token como usado
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() }
      }),
      // Revocar todas las sesiones activas
      prisma.refreshToken.updateMany({
        where: { userId: record.userId },
        data: { isRevoked: true }
      })
    ]);
  }

  /**
   * Aceptar invitación: el usuario establece su contraseña por primera vez
   * y su cuenta queda activa.
   */
  async acceptInvitation(plainToken: string, newPassword: string): Promise<AuthTokens> {
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    const record = await prisma.userInvitation.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!record) {
      throw new AppError('Enlace de invitación inválido o ya utilizado', 400);
    }

    if (record.acceptedAt) {
      throw new AppError('Esta invitación ya fue aceptada. Inicia sesión normalmente.', 400);
    }

    if (new Date() > record.expiresAt) {
      throw new AppError('La invitación ha expirado. Solicita al administrador que te envíe una nueva.', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Activar usuario y establecer contraseña en una transacción
    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash, isActive: true }
      });
      await tx.userInvitation.update({
        where: { id: record.id },
        data: { acceptedAt: new Date() }
      });
      return u;
    });

    // Generar sesión automáticamente al activar la cuenta
    return this.generateTokens({ ...updatedUser, role: updatedUser.role as UserRole });
  }

  /**
   * Generar par de tokens JWT
   */
  private async generateTokens(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    institutionId?: string | null;
  }): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId
    };

    // Access token (corta duración)
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } as jwt.SignOptions
    );

    // Refresh token (larga duración)
    const refreshTokenValue = jwt.sign(
      { sub: user.id, jti: uuidv4() },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    // Calcular expiración del refresh token
    const decoded = jwt.decode(refreshTokenValue) as JwtPayload;
    const expiresAt = new Date(decoded.exp * 1000);

    // Guardar refresh token en BD
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt
      }
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    };
  }
}

export const authService = new AuthService();
