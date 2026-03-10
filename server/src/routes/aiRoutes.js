import express from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.js";
import {
  generateBlueprint,
  extractSteps,
  getYoutubeMeta,
  ingestKnowledge,
  refineBlueprint,
  refineSteps,
} from "../controllers/aiController.js";

const router = express.Router();
// Set up multer to store files in memory (so we can pass them straight to Gemini)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
}); // 30MB limit

router.use(requireAuth);

// Notice we added 'upload.array("files")' to handle multiple document uploads
router.post("/generate-blueprint", upload.array("files"), generateBlueprint);
router.post("/refine-blueprint", refineBlueprint);

router.post("/extract-steps", extractSteps);
router.post("/refine-steps", refineSteps);

router.post("/youtube-meta", getYoutubeMeta);
router.post("/ingest", ingestKnowledge);

export default router;
