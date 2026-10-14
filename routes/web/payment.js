import express from "express"
import { createOrder, verifySignature, getReceiptDetails } from "../../controllers/web/payment.js"

const router = express.Router()

router.post("/create-order", createOrder)
router.post("/verify-payment", verifySignature)
router.get("/receipt/:identifier", getReceiptDetails)

export default router