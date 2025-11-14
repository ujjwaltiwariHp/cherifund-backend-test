import express from "express"
import { addMember, deleteMember, getAllMember, getMemberById, updateMember } from "../../controllers/Admin/member.js"
import uploadLocal, { multerUpload } from "../../middlewares/multer.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import { authentication } from "../../middlewares/auth.js"
import { language } from "../../middlewares/language.js"

const router = express.Router()

router.post("/add-member", authentication, isAdmin, multerUpload(uploadLocal.single("image")), addMember)
router.get("/getAllMembers",authentication, isAdmin, language, getAllMember)
router.get("/getMemberById/:memberId", authentication, isAdmin, getMemberById)
router.put("/update-member/:memberId", authentication, isAdmin, multerUpload(uploadLocal.single("image")), updateMember)
router.delete("/delete-member/:memberId", authentication, isAdmin, deleteMember)

export default router