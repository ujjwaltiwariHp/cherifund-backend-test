import express from "express"
import { getDonorsForCampaign, exportDonorsCSV, getAllDonations, exportAllDonationsCSV } from "../../controllers/Admin/donation.js"
import { authentication } from "../../middlewares/auth.js"
import { isAdmin } from "../../middlewares/isAdmin.js"

const router = express.Router()

router.get("/", authentication, isAdmin, getAllDonations)
router.get("/export", authentication, isAdmin, exportAllDonationsCSV)
router.get("/campaign/:campaignId", authentication, isAdmin, getDonorsForCampaign)
router.get("/campaign/:campaignId/export", authentication, isAdmin, exportDonorsCSV)

export default router
