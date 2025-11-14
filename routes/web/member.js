import express from "express"
import {  getAllMember, getMemberById } from "../../controllers/web/member.js"
import { language } from "../../middlewares/language.js"

const router = express.Router()

router.get("/getAllMembers",language, getAllMember)
router.get("/getMemberById/:memberId",language, getMemberById)

export default router