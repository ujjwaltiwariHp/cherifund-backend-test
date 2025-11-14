import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { feedbackError } from "../../errors/feedback.js"
import uploadToCloudinary from "../../util/cloudinary.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"

//! add feedback
export const addFeedback = async (req, res, next) =>{
    const {name, designation, feedback, rating} = req.body
    try {
        if(!name || !designation || !feedback || !rating)
            return next(errorHandler(feedbackError.Required_Fields))

        if(rating < 1 || rating > 5)
            return next(errorHandler(feedbackError.Invalid_Rating))

        const data = {
            name,
            designation,
            feedback,
            rating : parseInt(rating)
        }

        if(req.file){
            const result = await uploadToCloudinary(req.file.path, "Feedback", next)
            const imageObj = {
                url : result.secure_url,
                public_id : result.public_id
            }
            data.imageUrl = imageObj
        }

        await prisma.feedback.create({
           data : data
        })

        res.status(httpStatus.CREATED).json({
            msg : "Feedback added successfully"
        })
    } catch (error) {
        logError("Error in add feedback", error)
        next(error)
    }
}

//! get approved feedback
export const getFeedback = async (req, res, next) =>{
    const {page = 1, limit = 10} = req.query
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        const totalFeedback = await prisma.feedback.count({
            where : {
                status : "APPROVED"
            }
        })

        const feedback = await prisma.feedback.findMany({
            where : {
                status : "APPROVED"
            },
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
            limitNumber,
            totalPages : Math.ceil(totalFeedback / limitNumber),
            feedback : formatted
        })
    } catch (error) {
        logError("Error in get feedback for user", error)
        next(error)
    }
}