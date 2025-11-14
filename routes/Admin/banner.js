import express from "express"
import { authentication } from "../../middlewares/auth.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import uploadLocal, { multerUpload } from "../../middlewares/multer.js"
import { addBanner, deleteBanner, getAllBanner, getBannerById, updateBanner } from "../../controllers/Admin/banner.js"
import { language } from "../../middlewares/language.js"

const router = express.Router()

router.post("/add-banner", authentication, isAdmin, multerUpload(uploadLocal.single("image")), addBanner)
router.get("/getAllBanners", authentication, isAdmin, language, getAllBanner)
router.get("/getBannerById/:bannerId", authentication, isAdmin, language, getBannerById)
router.put("/update-banner/:bannerId", authentication, isAdmin, multerUpload(uploadLocal.single("image")), updateBanner)
router.delete("/delete-banner/:bannerId", authentication, isAdmin, deleteBanner)

export default router