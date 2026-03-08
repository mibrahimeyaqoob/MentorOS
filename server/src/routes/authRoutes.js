import express from 'express';
import { signup, login, recoverPassword, updateProfile, getUsers, updateUserRoles } from '../controllers/authController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Public Routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/recover', recoverPassword);

// Protected Profile Route (Any logged in user)
router.put('/profile', requireAuth, updateProfile);

// Admin / Root Level Routes (Super Admin Only)
router.get('/users', requireAuth, requireRole(['super_admin']), getUsers);
router.put('/users/:id/roles', requireAuth, requireRole(['super_admin']), updateUserRoles);

export default router;