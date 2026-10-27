import express from "express"
import { authentication } from "../../middlewares/auth.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications
} from "../../controllers/Admin/notification.js"

const router = express.Router()

router.use(authentication)
router.use(isAdmin)

router.get("/", getNotifications)
router.patch("/mark-all-read", markAllNotificationsRead)
router.patch("/:id/read", markNotificationRead)
router.delete("/clear-all", clearAllNotifications)
router.delete("/:id", deleteNotification)

export default router
