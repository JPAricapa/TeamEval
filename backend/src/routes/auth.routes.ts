/**
 * Rutas de Autenticación
 * POST /api/v1/auth/register
 * POST /api/v1/auth/login
 * POST /api/v1/auth/refresh
 * POST /api/v1/auth/logout
 * PUT  /api/v1/auth/change-password
 * POST /api/v1/auth/forgot-password
 * POST /api/v1/auth/reset-password
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authService } from '../services/auth.service';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated } from '../utils/response';
import { UserRole } from '../constants/enums';

const router = Router();

// Rate limit específico para autenticación
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 60 * 1000 : 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 10,
  message: { error: 'Demasiados intentos de autenticación. Espere 15 minutos.' }
});

// ============================================================
// POST /auth/register
// ============================================================
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Debe contener mayúscula, minúscula y número'),
    body('firstName').trim().notEmpty().withMessage('Nombre requerido'),
    body('lastName').trim().notEmpty().withMessage('Apellido requerido'),
    body('role')
      .isIn(Object.values(UserRole))
      .withMessage(`Rol inválido. Opciones: ${Object.values(UserRole).join(', ')}`)
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.register(req.body);
      sendCreated(res, tokens, 'Usuario registrado exitosamente');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /auth/login
// ============================================================
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida')
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.login(req.body);
      sendSuccess(res, tokens, 'Sesión iniciada exitosamente');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /auth/refresh
// ============================================================
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token requerido')],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshTokens(refreshToken);
      sendSuccess(res, tokens, 'Tokens renovados');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /auth/logout
// ============================================================
router.post(
  '/logout',
  [body('refreshToken').notEmpty().withMessage('Refresh token requerido')],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req.body.refreshToken);
      sendSuccess(res, null, 'Sesión cerrada exitosamente');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// PUT /auth/change-password
// ============================================================
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Debe contener mayúscula, minúscula y número')
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user!.id, currentPassword, newPassword);
      sendSuccess(res, null, 'Contraseña actualizada exitosamente');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /auth/forgot-password
// Solicitar enlace de restablecimiento de contraseña
// ============================================================
router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail().withMessage('Email inválido')],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.forgotPassword(req.body.email);
      // Siempre responder con éxito para no exponer si el email existe
      sendSuccess(
        res,
        null,
        'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'
      );
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /auth/reset-password
// Restablecer la contraseña con el token del correo
// ============================================================
router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Token requerido'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Debe contener mayúscula, minúscula y número')
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      sendSuccess(res, null, 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /auth/accept-invitation
// El usuario nuevo establece su contraseña y activa su cuenta
// ============================================================
router.post(
  '/accept-invitation',
  [
    body('token').notEmpty().withMessage('Token requerido'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Debe contener mayúscula, minúscula y número')
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;
      const tokens = await authService.acceptInvitation(token, password);
      sendSuccess(res, tokens, '¡Cuenta activada! Bienvenido a TeamEval.');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
