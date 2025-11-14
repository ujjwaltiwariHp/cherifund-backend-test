import express from "express"
import { login, logout } from "../../controllers/web/user.js"
import { authentication } from "../../middlewares/auth.js"

const router = express.Router()

router.post("/login", login)
router.post("/logout", authentication, logout)

export default router