import express from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { getCourses, getPublishedCourses, getCourse, createCourse, updateCourse, deleteCourse } from '../controllers/courseController.js';

const router = express.Router();

// Public / Student Routes
router.get('/published', requireAuth, getPublishedCourses);

// Admin Routes
router.get('/', requireAuth, requireRole(['creator', 'admin', 'super_admin']), getCourses);
router.get('/:id', requireAuth, requireRole(['creator', 'admin', 'super_admin']), getCourse);
router.post('/', requireAuth, requireRole(['creator', 'admin', 'super_admin']), createCourse);
router.put('/:id', requireAuth, requireRole(['creator', 'admin', 'super_admin']), updateCourse);
router.delete('/:id', requireAuth, requireRole(['admin', 'super_admin']), deleteCourse);

export default router;