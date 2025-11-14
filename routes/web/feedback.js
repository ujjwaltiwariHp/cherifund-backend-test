import express from "express"
import { addFeedback, getFeedback} from "../../controllers/web/feedback.js"
import uploadLocal, { multerUpload } from "../../middlewares/multer.js"

const router = express.Router()

router.post("/add-feedback",multerUpload(uploadLocal.single("image")), addFeedback)
router.get("/get-feedback", getFeedback)

export default router