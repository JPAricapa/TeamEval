/**
 * Middleware de validación con express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array().map((err) => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg
      }))
    });
    return;
  }

  next();
};
