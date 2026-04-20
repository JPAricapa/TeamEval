/**
 * Middleware de autenticación y autorización JWT
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { sendUnauthorized, sendForbidden } from '../utils/response';
import { UserRole } from '../constants/enums';

// Extender Request de Express para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        institutionId?: string;
      };
    }
  }
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  institutionId?: string;
  iat: number;
  exp: number;
}

/**
 * Verifica el token JWT y adjunta el usuario al request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendUnauthorized(res, 'Token de acceso requerido');
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET!;

    const payload = jwt.verify(token, secret) as JwtPayload;

    // Verificar que el usuario existe y está activo
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, isActive: true },
      select: { id: true, email: true, role: true, institutionId: true }
    });

    if (!user) {
      sendUnauthorized(res, 'Usuario no encontrado o inactivo');
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      institutionId: user.institutionId ?? undefined
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendUnauthorized(res, 'Token expirado');
    } else if (error instanceof jwt.JsonWebTokenError) {
      sendUnauthorized(res, 'Token inválido');
    } else {
      next(error);
    }
  }
};

/**
 * Autorización por roles
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendForbidden(res, `Acceso restringido. Roles permitidos: ${roles.join(', ')}`);
      return;
    }

    next();
  };
};

/**
 * Solo administradores
 */
export const adminOnly = authorize(UserRole.ADMIN);

/**
 * Administradores y docentes
 */
export const teacherOrAdmin = authorize(UserRole.ADMIN, UserRole.TEACHER);

/**
 * Todos los roles autenticados
 */
export const allRoles = authorize(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT);
