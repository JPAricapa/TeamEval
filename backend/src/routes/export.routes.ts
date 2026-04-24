/**
 * Rutas de Exportación
 * Excel, CSV, PDF y Dataset para investigación
 */

import { Router, Request, Response, NextFunction } from 'express';
import { param } from 'express-validator';
import { authenticate, teacherOrAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { exportService } from '../services/export.service';
import { assertProcessAccess } from '../utils/accessControl';

const router = Router();
router.use(authenticate, teacherOrAdmin);

// GET /export/excel/:processId
router.get('/excel/:processId', [param('processId').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertProcessAccess(req.params.processId, req.user!);
      const buffer = await exportService.exportToExcel(req.params.processId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="resultados_${req.params.processId}.xlsx"`);
      res.send(buffer);
    } catch (error) { next(error); }
  }
);

// GET /export/csv/:processId
router.get('/csv/:processId', [param('processId').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertProcessAccess(req.params.processId, req.user!);
      const csv = await exportService.exportToCSV(req.params.processId);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="resultados_${req.params.processId}.csv"`);
      res.send('\ufeff' + csv); // BOM para UTF-8
    } catch (error) { next(error); }
  }
);

// GET /export/pdf/:processId
router.get('/pdf/:processId', [param('processId').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertProcessAccess(req.params.processId, req.user!);
      const pdf = await exportService.exportToPDF(req.params.processId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="reporte_${req.params.processId}.pdf"`);
      res.send(pdf);
    } catch (error) { next(error); }
  }
);

export default router;
