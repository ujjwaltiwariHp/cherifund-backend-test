import express from "express";
import uploadResumeLocal, { multerResumeUpload, careerApplicationUpload } from "../../middlewares/multerResume.js";
import {
  applyForInternship,
  getPublicTrainees,
  getPublicDomains,
} from "../../controllers/web/career.js";

const router = express.Router();

// Public: Apply for internship with resume + optional photo upload
router.post(
  "/apply",
  multerResumeUpload(careerApplicationUpload),
  applyForInternship
);

// Public: Fetch active trainee alumni for carousel
router.get("/trainees", getPublicTrainees);

// Public: Fetch list of domains
router.get("/domains", getPublicDomains);

export default router;
