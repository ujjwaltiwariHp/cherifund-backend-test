import express from "express"
import { becomeVolunteer, contactQuery, detailInformation, donationMessage} from "../../controllers/web/form.js"

const router = express.Router()

router.post("/contact-query", contactQuery)
router.post("/detail-information", detailInformation)
router.post("/donation-message", donationMessage)
router.post("/become-volunteer", becomeVolunteer)

export default router