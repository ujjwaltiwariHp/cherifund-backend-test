import express from "express"
import userRoute from "./user.js"
import campaignRoute from "./campaign.js"
import commentRoute from "./comment.js"
import blogRoute from "./blog.js"
import memberRoute from "./member.js"
import bannerRoute from "./banner.js"
import formRoute from "./form.js"
import feedbackRoute from "./feedback.js"
import emailRoute from "./email.js"
import eventRoute from "./event.js"
import paymentRoute from "./payment.js"
import sponsorRoute from "./sponsor.js"
import galleryRoute from "./gallery.js"


import { getHomeOverview } from "../../controllers/web/homeOverview.js"

const router = express.Router()

router.get("/home-overview", getHomeOverview)

router.use("/user", userRoute)
router.use("/campaign", campaignRoute)
router.use("/comment", commentRoute)
router.use("/blog", blogRoute)
router.use("/member", memberRoute)
router.use("/banner", bannerRoute)
router.use("/form", formRoute)
router.use("/feedback", feedbackRoute)
router.use("/email", emailRoute)
router.use("/event", eventRoute)
router.use("/payment", paymentRoute)
router.use("/sponsor", sponsorRoute)
router.use("/gallery", galleryRoute)

export default router