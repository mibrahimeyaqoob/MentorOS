import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { generateBlueprint, extractSteps, getYoutubeMeta, ingestKnowledge } from '../controllers/aiController.js';

const router = express.Router();

router.use(requireAuth);

router.post('/generate-blueprint', generateBlueprint);
router.post('/extract-steps', extractSteps);
router.post('/youtube-meta', getYoutubeMeta);
router.post('/ingest', ingestKnowledge);

export default router;