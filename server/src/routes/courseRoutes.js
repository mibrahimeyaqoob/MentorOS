import express from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { getCourses, getPublishedCourses, getCourse, saveCourseDraft, publishCourse, deleteCourse } from '../controllers/courseController.js';

const router = express.Router();

// Public / Student Routes
router.get('/published', requireAuth, getPublishedCourses);

// Admin Routes
router.get('/', requireAuth, requireRole(['creator', 'admin', 'super_admin']), getCourses);
router.get('/:id', requireAuth, requireRole(['creator', 'admin', 'super_admin']), getCourse);

// The unified Auto-Save Draft route
router.post('/draft', requireAuth, requireRole(['creator', 'admin', 'super_admin']), saveCourseDraft);

// Publish a specific course
router.put('/:id/publish', requireAuth, requireRole(['creator', 'admin', 'super_admin']), publishCourse);

router.delete('/:id', requireAuth, requireRole(['admin', 'super_admin']), deleteCourse);

export default router;