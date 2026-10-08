import express from "express"
import adminBlog from "./blog.js"
import adminBanner from "./banner.js"
import adminCampaign from "./campaign.js"
import adminCategory from "./category.js"
import adminComment from "./comment.js"
import adminEmail from "./email.js"
import adminEvent from "./event.js"
import adminFeedback from "./feedback.js"
import adminForm from "./form.js"
import adminMember from "./member.js"
import adminDashboard from "./dashboard.js"
import adminDonation from "./donation.js"

const router = express.Router()

router.use("/blog", adminBlog)
router.use("/banner", adminBanner)
router.use("/campaign", adminCampaign)
router.use("/category", adminCategory)
router.use("/comment", adminComment)
router.use("/email", adminEmail)
router.use("/event", adminEvent)
router.use("/feedback", adminFeedback)
router.use("/form", adminForm)
router.use("/member", adminMember)
router.use("/dashboard", adminDashboard)
router.use("/donation", adminDonation)

export default router