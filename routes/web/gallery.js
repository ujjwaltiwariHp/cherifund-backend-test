import express from "express"
import { getAllGalleryImages } from "../../controllers/web/gallery.js"

const router = express.Router()

router.get("/getAllImages", getAllGalleryImages)

export default router
