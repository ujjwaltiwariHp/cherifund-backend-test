import { httpStatus } from "../config/httpStatus.js"
import { prisma } from "../database/db.js"
import { userError } from "../errors/user.js"
import { errorHandler } from "../util/errorHandler.js"
import { logError } from "../util/logHelper.js"
import jwt from "jsonwebtoken"

export const authentication = async (req, res, next) =>{
    const token  = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(" ")[1])

    if(!token) return next(errorHandler({
        message : "Invalid request",
        status : httpStatus.UNAUTHORIZED
    }))

    const checkBlackList = await prisma.blacklisted.findUnique({
        where : {
            token
        }
    })

    if(checkBlackList) return next(errorHandler({
        message : "You are no longer login, please login again",
        status : httpStatus.UNAUTHORIZED
    }))

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET)
        
        const user = await prisma.user.findUnique({
            where : {email : verify.email}
        })

        if(!user)
            return next(errorHandler(userError.Not_Existing_User))

        req.user = user 
        next()
    } catch (error) {
        logError("Error in authentication", error)
        next(error)
    }
}