import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { commentError } from "../../errors/comment.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"

//! get comment by Id
export const getCommentById = async (req, res, next) =>{
    const {commentId} = req.params
    try {
        const comment = await prisma.comment.findUnique({
            where : {
                id : commentId
            }
        })

        if(!comment)
            return next(errorHandler(commentError.Comment_Not_Exists))

        res.status(httpStatus.OK).json(comment)
    } catch (error) {
        logError("Error in get comment by Id", error)
        next(error)
    }
}

//! get all comment for admin
export const getAllCommentForAdmin = async (req, res, next) =>{
    const {page = 1, limit = 10, status} = req.query
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

        const totalComments = await prisma.comment.count({
            where : whereCondition
        })

        const comments = await prisma.comment.findMany({
          where: whereCondition,
          skip,
          take: limitNumber,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            campaign: { select: { id: true, title: true } },
            blog: { select: { id: true, title: true } },
            event: { select: { id: true, title: true } }
          }
        });

        res.status(httpStatus.OK).json({
            total : totalComments,
            page : pageNumber,
            limit : limitNumber,
            totalPages : Math.ceil(totalComments / limitNumber),
            comments
        })

    } catch (error) {
        logError("Error in get all comment for admin", error)
        next(error)
    }
}

//! moderate comment
export const moderateComment = async (req, res, next) =>{
    const {commentId} = req.params
    const {approved} = req.body
    try {
        if(typeof approved !== "boolean")
            return next(errorHandler(commentError.Invalid_Approval_Status))

        const existingComment = await prisma.comment.findUnique({
            where : {
                id : commentId
            }
        })

        //!
        const status = approved ? "APPROVED" : "REJECTED"

        if(!existingComment)
            return next(errorHandler(commentError.Comment_Not_Exists))

        await prisma.comment.update({
            where : {
                id : commentId
            },
            data : {status}
        })

        res.status(httpStatus.OK).json({
            msg : approved ? "Message approved" : "Message rejected"
        })

    } catch (error) {
        logError("Error in moderate comment", error)
        next(error)
    }
}

//! delete comment
export const deleteComment = async (req, res, next) =>{
    const {commentId} = req.params
    try {
        const comment = await prisma.comment.findUnique({
            where : {
                id : commentId
            }
        })
        if(!comment)
            return next(errorHandler(commentError.Comment_Not_Exists))

        await prisma.comment.delete({
            where : {
                id : commentId
            }
        })

        res.status(httpStatus.OK).json({
            msg : "comment deleted successfully"
        })
    } catch (error) {
        logError("Error in delete comment")
        next(error)
    }
}