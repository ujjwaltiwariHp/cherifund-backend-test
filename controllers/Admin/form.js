import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { formError } from "../../errors/form.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"

//! get all forms
export const getAllForms = async (req, res, next) =>{
    const {page = 1, limit = 10, formType, isViewed} = req.query
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        const filters = {}
        if(formType) {
            filters.formType = {
                equals : formType,
                mode : "insensitive"
            }
        }
        if(isViewed == "true"){
            filters.isViewed = true
        }
        else if(isViewed == "false"){
            filters.isViewed = false
        }

        const totalForm = await prisma.form.count({
            where : filters
        })

        const forms = await prisma.form.findMany({
            where : filters,
            skip,
            take : limitNumber,
            orderBy : {
                createdAt : "desc"
            }
        })

        res.status(httpStatus.OK).json({
            total : totalForm,
            page : pageNumber,
            limit : limitNumber,
            totalPages : Math.ceil(totalForm / limitNumber),
            forms
        })

    } catch (error) {
        logError("Error in get all form", error)
        next(error)
    }
}

//! get form by Id
export const getFormById = async (req, res, next) =>{
    const {formId} = req.params
    try {
        const existingForm = await prisma.form.findUnique({
            where : {
                id : formId
            }
        })
        if(!existingForm)
            return next(errorHandler(formError.Not_Exists))

        res.status(httpStatus.OK).json(existingForm)
    } catch (error) {
        logError("Error in get form by id", error)
        next(error)
    }
}

//! moderate form
export const moderateForm = async (req, res, next) =>{
    const {formId} = req.params
    const {isViewed} = req.body
    try {
        if(typeof isViewed !== "boolean")
            return next(errorHandler(formError.Invalid_IsViewed_type))

        if(!isViewed)
            return  next(errorHandler(formError.Updation_Not_Allowed))

        const existingForm = await prisma.form.findUnique({
            where : {
                id : formId
            }
        })
        if(!existingForm)
            return next(errorHandler(formError.Not_Exists))

        await prisma.form.update({
            where : {
                id : formId
            },
            data : {
                isViewed : true
            }
        })

        res.status(httpStatus.OK).json({
            msg : "Successfully marked as viewed"
        })
        
    } catch (error) {
        logError("Error in moderate form", error)        
        next(error)
    }
}

//! delete form
export const deleteForm = async (req, res, next) =>{
    const {formId} = req.params
    try {
        const existingForm = await prisma.form.findUnique({
            where : {
                id : formId
            }
        })

        if(!existingForm)
            return next(errorHandler(formError.Not_Exists))

        await prisma.form.delete({
            where : {
                id : formId
            }
        })

        res.status(httpStatus.OK).json({
            msg : "Query deleted successfully"
        })
    } catch (error) {
        logError("Error in delete form", error)
        next(error)
    }
}
