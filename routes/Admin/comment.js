import express from "express"
import { authentication } from "../../middlewares/auth.js"
import { isAdmin } from "../../middlewares/isAdmin.js"
import { deleteComment, getAllCommentForAdmin, getCommentById, moderateComment } from "../../controllers/Admin/comment.js"

const router = express.Router()

router.get("/getCommentById/:commentId", authentication, isAdmin, getCommentById)
router.get("/getAllComments", authentication, isAdmin, getAllCommentForAdmin)
router.put("/moderate-comment/:commentId", authentication, isAdmin, moderateComment)
router.delete("/delete-comment/:commentId", authentication, isAdmin, deleteComment)

export default router