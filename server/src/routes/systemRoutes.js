import express from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { getKeys, addKey, deleteKey, getRouting, updateRouting, getAnalytics, getAuditLogs } from '../controllers/systemController.js';

const router = express.Router();

// Only Admins can touch these
router.use(requireAuth);
router.use(requireRole(['admin', 'super_admin']));

// Keys
router.get('/keys', getKeys);
router.post('/keys', addKey);
router.delete('/keys/:id', deleteKey);

// Routing
router.get('/routing', getRouting);
router.put('/routing', updateRouting);

// Analytics
router.get('/analytics', getAnalytics);
router.get('/logs', getAuditLogs);

export default router;