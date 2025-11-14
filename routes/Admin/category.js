import express from "express"
import { authentication } from "../../middlewares/auth.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import { createCategory, deleteCategory, getCategories, getCategoryById, updateCategory } from "../../controllers/Admin/category.js"
import { language } from "../../middlewares/language.js"

const router = express.Router()

router.post("/create-category", authentication, isAdmin, createCategory)
router.put("/update-category/:categoryId", authentication, isAdmin, updateCategory)
router.get("/get-category", authentication, isAdmin, language, getCategories)
router.delete("/delete-category/:categoryId", authentication, isAdmin, deleteCategory)
router.get("/getCategoryById/:categoryId", authentication, isAdmin, getCategoryById)

export default router