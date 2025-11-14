import express from "express"
import { sendEmail } from "../../controllers/Admin/email.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import { authentication } from "../../middlewares/auth.js"

const router = express.Router()

router.post("/send-email", authentication, isAdmin, sendEmail)

export default router