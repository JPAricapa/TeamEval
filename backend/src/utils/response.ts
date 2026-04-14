/**
 * Utilidades para respuestas HTTP estandarizadas
 */

import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Respuesta exitosa
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Operación exitosa',
  statusCode = 200,
  pagination?: PaginationMeta
): Response => {
  const response: ApiResponse<T> = { success: true, message, data };
  if (pagination) response.pagination = pagination;
  return res.status(statusCode).json(response);
};

/**
 * Respuesta de creación exitosa
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  message = 'Recurso creado exitosamente'
): Response => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Respuesta de error
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  error?: string
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    error
  });
};

/**
 * Respuesta no autorizado
 */
export const sendUnauthorized = (
  res: Response,
  message = 'No autorizado'
): Response => {
  return sendError(res, message, 401);
};

/**
 * Respuesta no encontrado
 */
export const sendNotFound = (
  res: Response,
  message = 'Recurso no encontrado'
): Response => {
  return sendError(res, message, 404);
};

/**
 * Respuesta prohibido
 */
export const sendForbidden = (
  res: Response,
  message = 'Acceso prohibido'
): Response => {
  return sendError(res, message, 403);
};
