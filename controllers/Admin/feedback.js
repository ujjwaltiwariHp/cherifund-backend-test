import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { feedbackError } from "../../errors/feedback.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"

//! get all feedback for admin
export const getAllFeedback = async (req, res, next) =>{
    const {page = 1, limit = 10, status, name, designation, rating} = req.query
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        let whereCondition = {}

        if(status){
            whereCondition.status = status.toUpperCase()
        }
        if(whereCondition.status == "ALL"){
            whereCondition = {}
        }

        if(name && name.trim() != ""){
            whereCondition.name = {
               contains: name.trim(),
                mode : "insensitive"
            }
        }

        if(designation && designation.trim() != ""){
            whereCondition.designation = {
                contains: designation.trim(),
                mode : "insensitive"
            }
        }

        if(rating){
            whereCondition.rating = parseInt(rating)
        }

        const totalFeedback = await prisma.feedback.count({
            where : whereCondition
        })

        const feedback = await prisma.feedback.findMany({
            where : whereCondition,
            skip,
            take : limitNumber,
            orderBy : {
                createdAt : "desc"
            }
        })

        const formatted = feedback.map(f => ({
            id : f.id,
            name : f.name,
            designation : f.designation,
            image : f.imageUrl?.url || null,
            feedback : f.feedback,
            rating : f.rating,
            status : f.status
        }))
    

        res.status(httpStatus.OK).json({
            total : totalFeedback,
            page : pageNumber,
            limit : limitNumber,
            totalPages : Math.ceil(totalFeedback / limitNumber),
            feedback : formatted
        })

    } catch (error) {
        logError("Error iin get all feedback", error)
        next(error)
    }
}

//! get feedback by id
export const getFeedbackById = async (req, res, next) =>{
    const  {feedbackId} = req.params
    try {
        const feedback = await prisma.feedback.findUnique({
            where : {
                id : feedbackId
            }
        })
        if(!feedback)
            return next(errorHandler(feedbackError.Not_Exists))

        const formatted = {
            id : feedback.id,
            name : feedback.name,
            designation : feedback.designation,
            image : feedback.imageUrl?.url || null,
            feedback : feedback.feedback,
            rating : feedback.rating,
            status : feedback.status
        }

        res.status(httpStatus.OK).json(formatted)
    } catch (error) {
        logError("Error in get feedback by id", error)
        next(error)
    }
}

//! moderate feedback
export const moderateFeedback = async (req, res, next) =>{
    const {feedbackId} = req.params
    const {approved} = req.body
    try {
        if(typeof approved !== "boolean")
            return  next(errorHandler(feedbackError.Invalid_Approval_Status))

        const existingFeedback = await prisma.feedback.findUnique({
            where : {
                id : feedbackId
            }
        })
        if(!existingFeedback)
            return next(errorHandler(feedbackError.Not_Exists))

        const status = approved ? "APPROVED" : "REJECTED"

        await prisma.feedback.update({
            where : {
                id : feedbackId
            },
            data : {status}
        })

        res.status(httpStatus.OK).json({
            msg : approved ? "Feedback approved" : "Feedback rejected"
        })
    } catch (error) {
        logError("Error in moderate feedback", error)
        next(error)
    }
}

//! delete feedback
export const deleteFeedback = async (req, res, next) =>{
    const {feedbackId} = req.params
    try {
        const feedback = await prisma.feedback.findUnique({
            where : {
                id : feedbackId
            }
        })
        if(!feedback)
            return next(errorHandler(feedbackError.Not_Exists))

        await prisma.feedback.delete({
            where : {
                id : feedbackId
            }
        })

        res.status(httpStatus.OK).json({
            msg : "Feedback deleted successfully"
        })
    } catch (error) {
        logError("Error in delete feedback", error)
        next(error)
    }
}