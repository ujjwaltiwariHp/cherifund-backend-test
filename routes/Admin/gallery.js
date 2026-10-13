import express from "express"
import { authentication } from "../../middlewares/auth.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import uploadLocal, { multerUpload } from "../../middlewares/multer.js"
import { addGalleryImage, getAllGalleryImages, deleteGalleryImage } from "../../controllers/Admin/gallery.js"

const router = express.Router()

router.post("/add-image", authentication, isAdmin, multerUpload(uploadLocal.single("image")), addGalleryImage)
router.get("/getAllImages", authentication, isAdmin, getAllGalleryImages)
router.delete("/delete/:id", authentication, isAdmin, deleteGalleryImage)

export default router
