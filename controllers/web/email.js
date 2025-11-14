import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { emailError } from "../../errors/email.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"
import sendMail from "../../util/mailSender.js"

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
      
        try {
            await sendMail(
        email, // single recipient
        "Subscription Confirmed ✅",
        `
        <div style="font-family: Arial, sans-serif; line-height:1.5; color:#333;">
          <h2 style="color:#4CAF50;">Thank you for subscribing!</h2>
          <p>Hello,</p>
          <p>Your email <strong>${email}</strong> has been successfully added to our subscriber list.</p>
          <p>You will now receive updates, news, and announcements directly to your inbox.</p>
          <hr style="border:none; border-top:1px solid #eee;" />
          <p style="font-size:12px; color:#888;">If you did not subscribe, please ignore this email.</p>
        </div>
        `
      );
        } catch (error) {
            logError("Error sending subscription confirmation mail", error)            
            next(error)
        }
    } catch (error) {
        logError("Error in add email", error)
        next(error)
    }
}