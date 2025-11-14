import express from "express"
import {getAllBanner} from "../../controllers/web/banner.js"
import { language } from "../../middlewares/language.js"

const router = express.Router()

router.get("/getAllBanners",language, getAllBanner)

export default router