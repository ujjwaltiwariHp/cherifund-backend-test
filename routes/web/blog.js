import express from "express"
import {getAllBlog, getBlogById} from "../../controllers/web/blog.js"
import { language } from "../../middlewares/language.js"

const router = express.Router()

router.get("/getAllBlogs",language, getAllBlog)
router.get("/getBlogById/:blogId",language, getBlogById)

export default router