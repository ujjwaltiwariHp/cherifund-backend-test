import express from "express"
import { authentication } from "../../middlewares/auth.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import { dashboard } from "../../controllers/Admin/dashboard.js"

const router = express.Router()

router.get("/get-data", authentication, isAdmin, dashboard)

export default router