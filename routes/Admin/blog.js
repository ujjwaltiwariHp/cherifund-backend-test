import express from "express"
import { authentication } from "../../middlewares/auth.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import { createBlog, deleteBlog, getAllBlog, getBlogById, updateBlog } from "../../controllers/Admin/blog.js"
import uploadLocal, { multerUpload } from "../../middlewares/multer.js"
import { language } from "../../middlewares/language.js"

const router = express.Router()

router.post("/create-blog", authentication, isAdmin,multerUpload(uploadLocal.array("images")), createBlog)
router.get("/getAllBlogs", language, authentication, isAdmin, getAllBlog)
router.get("/getBlogById/:blogId", authentication, isAdmin, getBlogById)
router.put("/update-blog/:blogId", authentication, isAdmin, multerUpload(uploadLocal.array("images")), updateBlog)
router.delete("/delete-blog/:blogId", authentication, isAdmin, deleteBlog)

export default router