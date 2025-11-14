import express from "express"
import { getAllCampaign, getCampaignById} from "../../controllers/web/campaign.js"
import { language } from "../../middlewares/language.js"

const router = express.Router()

router.get("/getAllCampaigns",language, getAllCampaign)
router.get("/getCampaignById/:campaignId", language, getCampaignById)

export default router