import express from "express"
import { addCampaign, deleteCampaign, getAllCampaign, getCampaignById, updateCampaign } from "../../controllers/Admin/campaign.js"
import { authentication } from "../../middlewares/auth.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import uploadLocal, { multerUpload } from "../../middlewares/multer.js"
import { language } from "../../middlewares/language.js"

const router = express.Router()

router.post("/add-campaign", authentication, isAdmin, multerUpload(uploadLocal.array("images")), addCampaign)
router.get("/getAllCampaigns",authentication, isAdmin, language, getAllCampaign)
router.get("/getCampaignById/:campaignId",authentication, isAdmin, getCampaignById)
router.put("/update-campaign/:campaignId", authentication, isAdmin, multerUpload(uploadLocal.array("images")), updateCampaign)
router.delete("/delete-campaign/:campaignId", authentication, isAdmin, deleteCampaign)

export default router