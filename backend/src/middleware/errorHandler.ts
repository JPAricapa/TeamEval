/**
 * Middleware global de manejo de errores
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Error de nuestra aplicación
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
    return;
  }

  // Errores de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Violación de unicidad
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'Ya existe un registro con esos datos únicos.',
        field: (err.meta?.target as string[])?.join(', ')
      });
      return;
    }
    // Registro no encontrado
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Registro no encontrado.'
      });
      return;
    }
    // Restricción de clave foránea
    if (err.code === 'P2003') {
      res.status(400).json({
        success: false,
        message: 'Referencia inválida: el recurso relacionado no existe.'
      });
      return;
    }
  }

  // Error genérico del servidor
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
};
