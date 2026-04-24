import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, teacherOrAdmin, allRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendSuccess, sendCreated } from '../utils/response';
import { courseService } from '../services/course.service';

const router = Router();
router.use(authenticate);

router.get('/', allRoles,
  [query('periodId').optional().isUUID()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await courseService.listCourses(req.user!, req.query.periodId as string | undefined);
      sendSuccess(res, courses);
    } catch (error) { next(error); }
  }
);

router.get('/:id', [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const course = await courseService.getCourseById(req.params.id, req.user!);
      sendSuccess(res, course);
    } catch (error) { next(error); }
  }
);

router.post('/', teacherOrAdmin,
  [
    body('name').trim().notEmpty(),
    body('code').trim().notEmpty(),
    body('credits').optional().isInt({ min: 1 }),
    body('description').optional().trim()
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const course = await courseService.createCourse(req.user!, req.body);
      sendCreated(res, course, 'Curso creado exitosamente');
    } catch (error) { next(error); }
  }
);

router.patch('/:id', teacherOrAdmin,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const course = await courseService.updateCourse(req.params.id, req.user!, req.body);
      sendSuccess(res, course, 'Curso actualizado');
    } catch (error) { next(error); }
  }
);

router.delete('/:id', teacherOrAdmin,
  [param('id').isUUID()], validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await courseService.deleteCourse(req.params.id, req.user!);
      sendSuccess(res, null, 'Curso eliminado');
    } catch (error) { next(error); }
  }
);

router.post('/:id/rubrics', teacherOrAdmin,
  [param('id').isUUID(), body('rubricId').isUUID(), body('evaluationType').optional().isIn(['SELF', 'PEER', 'TEACHER'])],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rubricId, evaluationType } = req.body;
      const courseRubric = await courseService.assignRubric(req.params.id, req.user!, rubricId, evaluationType);
      sendCreated(res, courseRubric, 'Rúbrica asociada al curso');
    } catch (error) { next(error); }
  }
);

export default router;
