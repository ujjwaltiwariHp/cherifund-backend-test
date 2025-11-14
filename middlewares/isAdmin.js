import { httpStatus } from "../config/httpStatus.js"
import { errorHandler } from "../util/errorHandler.js"
import {logError} from "../util/logHelper.js"
export const isAdmin = (req, res, next) =>{
    try {
        if(!req.user || req.user.role !== "ADMIN") return next(errorHandler({
            message : "Admin access required",
            status : httpStatus.FORBIDDEN
        }))

        next()
    } catch (error) {
        logError("Error in isAdmin", error)
        next(error)
    }
}