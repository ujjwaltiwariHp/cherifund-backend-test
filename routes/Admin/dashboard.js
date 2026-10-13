import express from "express"
import { authentication } from "../../middlewares/auth.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import { dashboard, campaignDistribution, monthlyFunds } from "../../controllers/Admin/dashboard.js"

const router = express.Router()

router.get("/get-data", authentication, isAdmin, dashboard)
router.get("/campaign-distribution", authentication, isAdmin, campaignDistribution)
router.get("/monthly-funds", authentication, isAdmin, monthlyFunds)

export default router