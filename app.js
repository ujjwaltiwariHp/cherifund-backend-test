import express from "express"
import cors from "cors"
import route from "./routes/index.js"
import cookieParser from "cookie-parser"
import {swaggerDocument, swaggerUi} from "./swagger/swagger.js"
import basicAuth from "express-basic-auth"
import { razorpayWebhook } from "./controllers/web/payment.js"

const app = express()

app.use(cors())
app.post("/api/V1/payment/razorpay-webhook", express.raw({ type: "application/json" }), razorpayWebhook);
app.use(express.json())
app.use(cookieParser())

//! disable caching for swagger so auth is always required
const noCache = (req, res, next) =>{
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  res.setHeader("Pragma", "no-cache")
  res.setHeader("Expires", "0")
  res.setHeader("Surrogate-Control", "no-store")
  next()
}

//! swagger basic auth 
const swaggerAuth = basicAuth({
  users : {[process.env.swagger_user] : process.env.swagger_password},
  challenge : true,
  realm : "Swagger Docs"
})

app.use("/api-docs", noCache, swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.get("/swagger.json", noCache, swaggerAuth, (req, res) =>{
    res.setHeader("content-type", "application/json")
    res.send(swaggerDocument)
})

app.use("/api/V1", route)

//! for errors
app.use((err, req, res, next)=>{
    const statusCode = err.statusCode || 500
    const message = err.message || "Internal Server Error"
    res.status(statusCode).json({
        success : false,
        message,
        statusCode
    })
})

export default app