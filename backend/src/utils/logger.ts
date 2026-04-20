/**
 * Logger centralizado usando Winston
 * Niveles: error, warn, info, http, debug
 */

import winston from 'winston';
import { mkdirSync } from 'fs';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;
const logsDir = path.join('logs');

// Render y otros despliegues no incluyen directorios vacíos ignorados por git.
mkdirSync(logsDir, { recursive: true });

// Formato personalizado para logs
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Consola con colores en desarrollo
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      )
    }),
    // Archivo de logs (errores)
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Archivo de logs (todos)
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});
