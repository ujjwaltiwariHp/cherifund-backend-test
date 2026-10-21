import "dotenv/config"
import app from "./app.js";
import connectDB from "./database/db.js";
import { logInfo } from "./util/logHelper.js";

const port = process.env.PORT
connectDB()

const server = app.listen(port, ()=>{
    logInfo(`server is running on server ${port}`)
    if (process.send) {
        process.send("ready")
    }
})

process.on("SIGINT", () => {
    logInfo("SIGINT signal received: closing HTTP server")
    server.close(() => {
        logInfo("HTTP server closed")
        process.exit(0)
    })
})