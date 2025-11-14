import { PrismaClient } from "@prisma/client";
import { logError, logInfo } from "../util/logHelper.js";

let prisma

const connectDB = async () =>{
    try {
        prisma = new PrismaClient({
            datasources:{
                db:{
                    url : process.env.DATABASE_URL
                }
            }
        })
        await prisma.$connect()
        logInfo("✅ PostgreSQL database connected with Prisma!")
    } catch (error) {
        logError("❌ Database connection failed:", error)
        process.exit(1); 
    }
}

export {prisma}
export default connectDB