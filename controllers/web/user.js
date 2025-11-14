import { userError } from "../../errors/user.js"
import { errorHandler } from "../../util/errorHandler.js"
import { prisma } from "../../database/db.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { httpStatus } from "../../config/httpStatus.js"
import { logError } from "../../util/logHelper.js"

//! login
export const login = async (req, res, next) =>{
    const {email, password} = req.body
    try {
        if(!email || !password) 
            return next(errorHandler(userError.Fields_Required))

        const existingUser = await prisma.user.findFirst({
            where : {email}
        })
        if(!existingUser)
            return next(errorHandler(userError.Not_Existing_User))

        const checkPassword = await bcrypt.compare(password, existingUser.password)

        if(!checkPassword)
            return next(errorHandler(userError.Not_Existing_User))

        //! token generation
        const token = jwt.sign(
            { id : existingUser.id, role : existingUser.role, email : existingUser.email },
              process.env.JWT_SECRET,
            { expiresIn : process.env.JWT_EXPIRY }
        )

        res.cookie("token", token,{
            httpOnly : true,
            secure : process.env.NODE_ENV == "production",
            sameSite : "strict"
        })

        res.status(httpStatus.OK).json({
            message : "Login successfully",
            token
        })

    } catch (error) {
        logError("Error in login", error)
        next(error)
    }
}

//! logout
export const logout = async (req, res, next) =>{
    try {
        const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);

        //! delete all expires token from db
        await prisma.blacklisted.deleteMany({
            where : {
                expiresAt : {
                    lt : new Date()
                }
            }
        })

        //! Decode JWT to get expiry (without verifying)
        const decode = jwt.decode(token)

        const expiresAt = decode?.exp ? new Date(decode.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000)

        await prisma.blacklisted.create({
            data : {
                token,
                expiresAt
            }
        })

        res.clearCookie("token")

        res.status(httpStatus.OK).json({
            msg : "Logout successfully"
        })
    } catch (error) {
        logError("Error in logout", error)
        next(error)
    }
}