import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { commentError } from "../../errors/comment.js"
import { userError } from "../../errors/user.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"

//! add comment
export const addComment = async (req, res, next) =>{
    const {id} = req.params
    const {name, email, comment} = req.body
    try {
        
        if(!name || !email || !comment)
            return next(errorHandler(userError.Fields_Required))

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if(!emailRegex.test(email)) return next(errorHandler(commentError.Invalid_Email))

        const campaign = await prisma.campaigns.findUnique({
            where :{ id }
        })

        let blog = null
        let event = null

        if(!campaign){
            blog = await prisma.blog.findUnique({
                where : {id}
            })
        }

        if(!blog && !campaign){
            event = await prisma.event.findUnique({
                where : {id}
            })
        }

        if(!blog && !campaign && !event)
            return next(errorHandler(commentError.Not_Exists))


        const newComment = await prisma.comment.create({
            data : {
                name,
                email,
                comment,
                campaignId : campaign ? id : null, 
                blogId : blog ? id : null,
                eventId : event ? id : null
            }
        })

        res.status(httpStatus.CREATED).json({
            msg : "Comment added successfully",
            comment : newComment,
            type : campaign ? "Campaign" : blog ? "Blog" : "event"
        })

    } catch (error) {
        logError("Error in add campaign", error)
        next(error)
    }
}

//! reply to a comment
export const replyComment = async (req, res, next) =>{
    const {commentId} = req.params
    const {name, email, comment} = req.body
    try {
        if(!commentId) 
            return next(errorHandler(commentError.Comment_Id_required))

        if(!name || !email || !comment)
            return next(errorHandler(userError.Fields_Required))

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if(!emailRegex.test(email)) return next(errorHandler(commentError.Invalid_Email))        

        const existingComment = await prisma.comment.findUnique({
            where : {
                id : commentId
            }
        })
        if(!existingComment)
            return next(errorHandler(commentError.Comment_Not_Exists))

        if(existingComment.parentCommentId)
            return next(errorHandler(commentError.Not_Allowed_Reply))

        const {campaignId, blogId} = existingComment

        const reply = await prisma.comment.create({
            data : {
                name,
                email,
                comment,
                campaignId : campaignId || null,
                blogId : blogId || null,
                parentCommentId : commentId
            }
        })

        res.status(httpStatus.CREATED).json({
            msg : "Reply added successfully",
            reply,
            type : campaignId ? "Campaign" : "Blog"
        })
    } catch (error) {
        logError("Error in reply comment", error)
        next(error)
    }
}

//! get comment
export const getComments = async (req, res, next) =>{
    const {id} = req.params
    const {page = 1 , limit = 10} = req.query
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        let campaign = await prisma.campaigns.findUnique({
            where : {id}
        })

        let blog = null
        let event = null
        
        if(!campaign){
            blog = await prisma.blog.findUnique({
                where : {id}
            })
        }

        if(!campaign && !blog){
            // return next(errorHandler(commentError.Not_Exists))
            event = await prisma.event.findUnique({
                where : {id}
            })
        }

       if(!blog && !campaign && !event)
        return next(errorHandler(commentError.Not_Exists))

        //! fetch comment where condotion
        const whereCondition = {
            parentCommentId : null,
            campaignId : campaign ? id : null,
            blogId : blog ? id : null,
            eventId : event ? id : null,
            status : "APPROVED"
        }

        const totalComments = await prisma.comment.count({
            where :  whereCondition
        })

        const comments = await prisma.comment.findMany({
            where : whereCondition,
            skip,
            take : limitNumber,
            orderBy : {
                createdAt : "desc"
            },
            include : {
                _count: {
                    select: {
                        replies: {
                            where: { status: "APPROVED" }
                        }
                    }
                }
            }
        })

        //! to include total replies
        const formatted = comments.map(comment => {
            const {_count, ...rest} = comment
            return {
                ...rest,
                totalReplies : comment._count.replies
            }
        })

        res.status(httpStatus.OK).json({
            total : totalComments,
            page : pageNumber,
            limit : limitNumber,
            totalPages : Math.ceil(totalComments / limitNumber),
            comments : formatted,
            type : campaign ? "Campaign" :blog ?  "Blog" : "event"
        })

    } catch (error) {
        logError("Error in get Comment", error)
        next(error)
    }
}

//! like comment
export const likeComment = async (req, res, next) =>{
    const {commentId} = req.params
    const {change} = req.body
    try {
        if(!commentId)
            return next(errorHandler(commentError.Comment_Id_required))

        if(![1,-1].includes(change))
            return next(errorHandler(commentError.Invalid_Change))
        
        const comment = await prisma.comment.findUnique({
            where : {
                id : commentId
            }
        })
        if(!comment)
            return next(errorHandler(commentError.Comment_Not_Exists))

        const updatedComment = await prisma.comment.update({
            where : {
                id : commentId
            },
            data :{
                likeCount : {
                    increment : change
                }
            }
        })

        res.status(httpStatus.OK).json({
            likeCount : updatedComment.likeCount
        })
    } catch (error) {
        logError("Error in like comment", error)
        next(error)
    }
}

//! get reply
export const getReply = async (req, res, next) =>{
    const {commentId} = req.params
    const {page = 1, limit = 10} = req.query
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        const comment = await prisma.comment.findUnique({
            where : {
                id : commentId
            }
        })
        if(!comment)
            return next(errorHandler(commentError.Comment_Not_Exists))

        const totalReplies = await prisma.comment.count({
            where : {
                parentCommentId : commentId,
                status : "APPROVED"
            }
        })

        const replies = await prisma.comment.findMany({
            where : {
                parentCommentId : commentId,
                status : "APPROVED"
            },
            skip,
            take : limitNumber,
            orderBy : {
                createdAt : "asc"
            }
        })

        res.status(httpStatus.OK).json({
            total : totalReplies,
            page : pageNumber,
            limit : limitNumber,
            totalPages : Math.ceil( totalReplies / limitNumber),
            replies
        })
    } catch (error) {
        logError("Error in get reply", error)
        next(error)
    }
}