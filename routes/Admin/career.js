import express from "express";
import { authentication } from "../../middlewares/auth.js";
import { isAdmin } from "../../middlewares/isAdmin.js";
import uploadLocal, { multerUpload } from "../../middlewares/multer.js";
import {
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication,
  getAllTrainees,
  addTrainee,
  updateTrainee,
  toggleTraineeStatus,
  deleteTrainee,
} from "../../controllers/Admin/career.js";

const router = express.Router();

/* =========================================================
   INTERNSHIP APPLICATIONS
   ========================================================= */
router.get("/applications", authentication, isAdmin, getAllApplications);
router.get("/applications/:id", authentication, isAdmin, getApplicationById);
router.patch("/applications/:id/status", authentication, isAdmin, updateApplicationStatus);
router.delete("/applications/:id", authentication, isAdmin, deleteApplication);

/* =========================================================
   TRAINEE ALUMNI
   ========================================================= */
router.get("/trainees", authentication, isAdmin, getAllTrainees);
router.post(
  "/trainees",
  authentication,
  isAdmin,
  multerUpload(uploadLocal.single("image")),
  addTrainee
);
router.put(
  "/trainees/:id",
  authentication,
  isAdmin,
  multerUpload(uploadLocal.single("image")),
  updateTrainee
);
router.patch("/trainees/:id/toggle-status", authentication, isAdmin, toggleTraineeStatus);
router.delete("/trainees/:id", authentication, isAdmin, deleteTrainee);

export default router;
