import express from "express"
import { deleteForm, getAllForms, getFormById, moderateForm } from "../../controllers/Admin/form.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import { authentication } from "../../middlewares/auth.js"

const router = express.Router()

router.get("/getAllForms", authentication, isAdmin, getAllForms)
router.get("/getFormById/:formId", authentication, isAdmin, getFormById)
router.put("/moderate-form/:formId", authentication, isAdmin, moderateForm)
router.delete("/delete-form/:formId", authentication, isAdmin, deleteForm)

export default router