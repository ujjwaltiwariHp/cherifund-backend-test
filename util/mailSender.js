import nodemailer from "nodemailer"
import { logError } from "./logHelper.js"

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
    auth : {
        user : process.env.mail_Address,
        pass : process.env.mail_Password
    }
})

const sendMail = async (recipients, subject, message) =>{
    const mailOptions = {
        from : process.env.mail_Address,
        to : Array.isArray(recipients) ? recipients.join(",") : recipients,
        subject,
        html : message
    }

    try {
       const info =  await transporter.sendMail(mailOptions)        
    } catch (error) {
        logError("Error in mail sender", error)        
        throw error
    }
}

export default sendMail