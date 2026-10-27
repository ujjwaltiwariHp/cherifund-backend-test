import express from "express"
import { authentication } from "../../middlewares/auth.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import { handleSseConnection } from "../../services/realtimeService.js"

const router = express.Router()

/**
 * @openapi
 * /api/V1/admin/realtime:
 *   get:
 *     summary: Connect to admin Server-Sent Events (SSE) stream for real-time live updates
 *     tags:
 *       - Admin Realtime
 *     responses:
 *       200:
 *         description: Real-time event stream established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get("/", authentication, isAdmin, handleSseConnection)

export default router
