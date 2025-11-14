import "dotenv/config"
import app from "./app.js";
import connectDB from "./database/db.js";
import { logInfo } from "./util/logHelper.js";

const port = process.env.PORT
connectDB()

app.listen(port, ()=>{
    logInfo(`server is running on server ${port}`)
})