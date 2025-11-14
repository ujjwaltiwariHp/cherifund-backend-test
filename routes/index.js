import express from "express"
import admin from "./Admin/index.js"
import web from "./web/index.js"

const router = express.Router()

router.use("/admin", admin)
router.use("/web", web)


export default router