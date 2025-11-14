import express from "express"
import { addComment, getComments, getReply, likeComment, replyComment } from "../../controllers/web/comment.js"

const router = express.Router()

router.post("/add-comment/:id", addComment)
router.post("/reply-comment/:commentId", replyComment)
router.post("/like-comment/:commentId", likeComment)
router.get("/get-comments/:id", getComments)
router.get("/get-replies/:commentId", getReply)

export default router