import express from "express"
import { deleteFeedback, getAllFeedback, getFeedbackById, moderateFeedback } from "../../controllers/Admin/feedback.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import { authentication } from "../../middlewares/auth.js"

const router = express.Router()

router.get("/getAllFeedback", authentication, isAdmin, getAllFeedback)
router.get("/getFeedbackById/:feedbackId", authentication, isAdmin, getFeedbackById)
router.put("/moderate-feedback/:feedbackId", authentication, isAdmin, moderateFeedback)
router.delete("/delete-feedback/:feedbackId", authentication, isAdmin, deleteFeedback)

export default router