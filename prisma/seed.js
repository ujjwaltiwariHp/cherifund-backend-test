import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { logError, logInfo } from "../util/logHelper.js"

const prisma = new PrismaClient()

const main = async () =>{
    const adminEmail = process.env.admin_email
    const adminPassword = process.env.admin_password

   const hashedPassword = await bcrypt.hash(adminPassword, 10)

   await prisma.user.upsert({
    where : {
        email : adminEmail
    },
    update : {},
    create : {
        email : adminEmail,
        password : hashedPassword,
        role : "ADMIN"
    }
   })

   logInfo("✅ Admin user seeded successfully") 
}

const runSeed = async () =>{
    try {
        await main()
    } catch (error) {
        logError("❌ Seeding failed", error)
        process.exit(1)
    }
    finally{
        await prisma.$disconnect()
    }
}

runSeed()