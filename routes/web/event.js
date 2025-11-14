import express from "express"
import { getAllEvents, getEventById} from "../../controllers/web/event.js"
import { language } from "../../middlewares/language.js"

const router = express.Router()

router.get("/getAllEvents", language, getAllEvents)
router.get("/getEventById/:eventId", language, getEventById)

export default router