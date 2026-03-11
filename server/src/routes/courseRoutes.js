import express from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import {
  getCourses,
  getPublishedCourses,
  getCourse,
  saveCourseDraft,
  publishCourse,
  deleteCourse,
  discardDraft,
} from "../controllers/courseController.js";

const router = express.Router();

router.get("/published", requireAuth, getPublishedCourses);
router.get(
  "/",
  requireAuth,
  requireRole(["creator", "admin", "super_admin"]),
  getCourses,
);
router.get(
  "/:id",
  requireAuth,
  requireRole(["creator", "admin", "super_admin"]),
  getCourse,
);
router.post(
  "/draft",
  requireAuth,
  requireRole(["creator", "admin", "super_admin"]),
  saveCourseDraft,
);
router.put(
  "/:id/publish",
  requireAuth,
  requireRole(["creator", "admin", "super_admin"]),
  publishCourse,
);

// 🚀 NEW ROUTE
router.delete(
  "/:id/draft",
  requireAuth,
  requireRole(["creator", "admin", "super_admin"]),
  discardDraft,
);

router.delete(
  "/:id",
  requireAuth,
  requireRole(["admin", "super_admin"]),
  deleteCourse,
);

export default router;
