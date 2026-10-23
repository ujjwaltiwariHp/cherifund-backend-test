import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { emailError } from "../../errors/email.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"
import sendMail from "../../util/mailSender.js"
import { sendNewsletterWelcomeEmail } from "../../services/emailService.js"

//! add email
export const addEmail = async (req, res, next) =>{
    const {email} = req.body
    try {
        if(!email)
            return next(errorHandler(emailError.Email_Required))

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if(!emailRegex.test(email)) return next(errorHandler(emailError.Invalid_Email))

        const existingEmail = await prisma.emailSubscriber.findUnique({
            where : {email}
        })
        if(existingEmail)
            return next(errorHandler(emailError.Already_Exists))
        
        const newEmail = await prisma.emailSubscriber.create({
            data : {email}
        })            

        res.status(httpStatus.CREATED).json(newEmail)
      
        // Asynchronously dispatch welcome email
        sendNewsletterWelcomeEmail(email).catch(err => {
            logError("Error sending subscription confirmation mail", err)
        })
    } catch (error) {
        logError("Error in add email", error)
        next(error)
    }
}