import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { formError } from "../../errors/form.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"

//! contact query
export const contactQuery = async (req, res, next) =>{
    const {name, email, phone, message} = req.body
    try {
        if(!name || !email || !phone || !message)
            return next(errorHandler(formError.Required_Fields))

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if(!emailRegex.test(email)) return next(errorHandler(formError.Invalid_Email))

            if(phone.toString().length !== 10)
                return next(errorHandler(formError.Invalid_Phone))
        
        const submission = await prisma.form.create({
            data : {
                formType : "Contact",
                firstName : name,
                email,
                phone,
                message
            }
        })

        res.status(httpStatus.CREATED).json({
            msg : "Form submitted successfully",
            submission
        })
    } catch (error) {
        logError("Error in contact query", error)
        next(error)
    }
}

//! detail-information
export const detailInformation= async (req, res, next) =>{
    const {firstName, lastName, email, phone, address, message} = req.body
    try {
        if(!firstName || !lastName || !email || !address || !phone || !message)
            return next(errorHandler((formError.Required_Fields)))

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if(!emailRegex.test(email)) return next(errorHandler(formError.Invalid_Email))

            if(phone.toString().length !== 10)
                return next(errorHandler(formError.Invalid_Phone))

         const submission = await prisma.form.create({
            data : {
                formType : "Detail",
                firstName,
                lastName,
                email,
                phone,
                address,
                message
            }
         })   

         res.status(httpStatus.CREATED).json({
            msg : "Form submitted successfully",
            submission
         })
        
    } catch (error) {
        logError("Error in detail information", error)
        next(error)
    }
}

//! donation message
export const donationMessage = async (req, res, next) =>{
    const {email, phone, address, message} = req.body
    try {
        if(!email || !phone || !address || !message)
            return next(errorHandler(formError.Required_Fields))

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if(!emailRegex.test(email)) return next(errorHandler(formError.Invalid_Email))

            if(phone.toString().length !== 10)
                return next(errorHandler(formError.Invalid_Phone))

        const submission = await prisma.form.create({
            data : {
                formType : "Donation",
                email,
                phone,
                address,
                message
            }
        })    

        res.status(httpStatus.OK).json({
            msg : "Form submitted successfully",
            submission
        })
    } catch (error) {
        logError("Error in donation message", error)
        next(error)
    }
}

//! become volunteer
export const becomeVolunteer = async (req, res, next) =>{
    const {firstName, lastName, email, phone, occupation, message} = req.body
    try {
        if(!firstName || !lastName || !email ||!phone || !occupation || !message)
            return next(errorHandler(formError.Required_Fields))

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if(!emailRegex.test(email)) return next(errorHandler(formError.Invalid_Email))

            if(phone.toString().length !== 10)
                return next(errorHandler(formError.Invalid_Phone))

        const submission = await prisma.form.create({
            data : {
                formType : "Volunteer",
                firstName,
                lastName,
                email,
                phone,
                occupation,
                message
            }
        })    

        res.status(httpStatus.CREATED).json({
            msg : "Form submitted successfully",
            submission
        })

    } catch (error) {
        logError("Error in become volunteer", error)
        next(error)
    }
}