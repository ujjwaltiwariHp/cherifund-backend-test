import express from "express"
import cors from "cors"
import route from "./routes/index.js"
import cookieParser from "cookie-parser"
import {swaggerDocument, swaggerUi} from "./swagger/swagger.js"
import basicAuth from "express-basic-auth"
import { razorpayWebhook } from "./controllers/web/payment.js"

import compression from "compression"
import helmet from "helmet"
import { rateLimit } from "express-rate-limit"
import { invalidateCachePrefix } from "./util/cacheHelper.js"

const app = express()

//! Security headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false
}))

//! Gzip/Brotli response compression for high throughput
app.use(compression())

//! Global rate limiter (protects backend against DDOS / traffic floods)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes."
  }
})
app.use("/api/", globalLimiter)

//! Write operations rate limiter (prevents spam on forms, comments, feedback)
const writeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Limit each IP to 30 submissions per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Submission limit exceeded. Please wait a few minutes before submitting again."
  }
})
app.use("/api/V1/web/form", writeLimiter)
app.use("/api/V1/web/comment", writeLimiter)
app.use("/api/V1/web/feedback", writeLimiter)
app.use("/api/V1/web/payment/create-order", writeLimiter)

app.use(cors())
app.post("/api/V1/payment/razorpay-webhook", express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}), razorpayWebhook);
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

//! Auto-invalidate public home overview cache on successful Admin mutations
app.use("/api/V1/admin", (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateCachePrefix("home:overview:");
      }
    });
  }
  next();
});

app.use("/api/V1", route)

//! for errors
app.use((err, req, res, next)=>{
    const statusCode = err.statusCode || 500
    let message = err.message || "Internal Server Error"

    // Clean up ugly Prisma validation errors
    if (err.name && err.name.includes('Prisma')) {
        message = "A database error occurred while processing your request."
    }

    res.status(statusCode).json({
        success : false,
        message,
        statusCode
    })
})

export default app