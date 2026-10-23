import nodemailer from "nodemailer"
import { logError } from "./logHelper.js"

const getTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.mail_Address,
            pass: process.env.mail_Password
        }
    })
}

const sendMail = async (recipients, subject, message, attachments = [], options = {}) => {
    if (!recipients || (Array.isArray(recipients) && recipients.length === 0)) {
        return { success: false, message: "No recipients provided" }
    }

    const fromName = options.fromName || process.env.MAIL_FROM_NAME || "YUWA India"
    const fromAddress = options.fromAddress || process.env.mail_Address || "ujjwaltiwari.hp@gmail.com"
    const transporter = getTransporter()

    const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to: Array.isArray(recipients) ? recipients.join(",") : recipients,
        subject,
        html: message,
        attachments: Array.isArray(attachments) ? attachments : []
    }

    try {
        const info = await transporter.sendMail(mailOptions)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        logError("Error in mail sender", error)
        throw error
    }
}

export default sendMail