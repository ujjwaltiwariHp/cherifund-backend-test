import express from "express"
import { getDonorsForCampaign, exportDonorsCSV } from "../../controllers/Admin/donation.js"
import { authentication } from "../../middlewares/auth.js"
import { isAdmin } from "../../middlewares/isAdmin.js"

const router = express.Router()

router.get("/campaign/:campaignId", authentication, isAdmin, getDonorsForCampaign)
router.get("/campaign/:campaignId/export", authentication, isAdmin, exportDonorsCSV)

export default router
