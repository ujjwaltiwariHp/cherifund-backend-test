import express from "express"
import { addEvent, deleteEvent, getAllEvents, getEventById, updateEvent } from "../../controllers/Admin/event.js"
import uploadLocal, { multerUpload } from "../../middlewares/multer.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import { authentication } from "../../middlewares/auth.js"
import { language } from "../../middlewares/language.js"

const router = express.Router()

router.post("/add-event", authentication, isAdmin, multerUpload(uploadLocal.array("images")), addEvent)
router.get("/getAllEvents", authentication, isAdmin, language, getAllEvents)
router.get("/getEventById/:eventId", authentication, isAdmin, getEventById)
router.put("/update-event/:eventId", authentication, isAdmin, multerUpload(uploadLocal.array("images")), updateEvent)
router.delete("/delete-event/:eventId", authentication, isAdmin, deleteEvent)

export default router