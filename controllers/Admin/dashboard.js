import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { logError } from "../../util/logHelper.js"

export const dashboard = async (req, res, next) => {
    try {
        //! active campaigns
        const activeCampaign = await prisma.campaigns.count({
            where : {
                status : "Active"
            }
        })

        //! total members
        const totalMembers = await prisma.member.count()

        //! total funds
        const totalFunds = await prisma.campaigns.aggregate({
            _sum : {
                raisedAmount : true
            }
        })

        //! pending request (comment - feedback)
        const pendingComment = await prisma.comment.count({
            where : {
                status : "PENDING"
            }
        })

        const pendingFeedback = await prisma.feedback.count({
            where : {
                status : "PENDING"
            }
        })

        const pendingRequest = pendingComment + pendingFeedback
        
        res.status(httpStatus.OK).json({
            activeCampaign,
            totalMembers,
            totalFunds : totalFunds._sum.raisedAmount,
            pendingRequest
        })
    } catch (error) {
        logError("Error in dashboard", error)
        next(error)
    }
}