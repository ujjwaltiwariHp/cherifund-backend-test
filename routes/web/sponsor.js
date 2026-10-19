import express from "express";
import { getAllSponsors, getSponsorBySlug } from "../../controllers/web/sponsor.js";
import { language } from "../../middlewares/language.js";

const router = express.Router();

router.get("/getAllSponsors", language, getAllSponsors);
router.get("/getSponsorBySlug/:slug", language, getSponsorBySlug);

export default router;
