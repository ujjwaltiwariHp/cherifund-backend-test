import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { emailError } from "../../errors/email.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"
import sendMail from "../../util/mailSender.js"

//! send email
export const sendEmail = async (req, res, next) =>{
    const {subject, message}  = req.body
    try {
        if(!subject || !message)
            return next(errorHandler(emailError.Required_Field))

        const emailSubscriber = await prisma.emailSubscriber.findMany({
            select : {
                email : true
            }
        })

        if(emailSubscriber.length == 0)
            return next(errorHandler(emailError.Email_Not_Exists))

        //! 3. Prepare styled HTML content
            const htmlContent = `
            <div style="font-family: Arial, sans-serif; line-height:1.5; color:#333;">
                <p>Hello Subscriber,</p>
                <p>${message}</p>
                <hr style="border:none; border-top:1px solid #eee;" />
                <p style="font-size:12px; color:#888;">You are receiving this email because you subscribed to our newsletter.</p>
            </div>
            `;

        //! convert into array
        const emailList = emailSubscriber.map(s => s.email)

        await sendMail(emailList, subject, htmlContent)

        res.status(httpStatus.OK).json({
            totalRecepients : emailList.length,
        })
    } catch (error) {
        logError("Error in send email", error)
        next(error)
    }
}