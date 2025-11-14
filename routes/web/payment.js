import express from "express"
import { createOrder, verifySignature } from "../../controllers/web/payment.js"

const router = express.Router()

router.post("/create-order", createOrder)
router.post("/verify-payment", verifySignature)

export default router