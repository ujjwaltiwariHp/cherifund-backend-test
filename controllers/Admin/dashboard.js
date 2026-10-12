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

        //! total funds and breakdown from verified donations (paid online + offline)
        const [
            totalDonations,
            generalDonations,
            campaignDonations,
            onlineDonations,
            offlineDonations
        ] = await Promise.all([
            prisma.donation.aggregate({
                where: {
                    status: { in: ["paid", "offline"] }
                },
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma.donation.aggregate({
                where: {
                    campaignId: null,
                    status: { in: ["paid", "offline"] }
                },
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma.donation.aggregate({
                where: {
                    campaignId: { not: null },
                    status: { in: ["paid", "offline"] }
                },
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma.donation.aggregate({
                where: {
                    paymentMethod: "online",
                    status: { in: ["paid", "offline"] }
                },
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma.donation.aggregate({
                where: {
                    paymentMethod: "offline",
                    status: { in: ["paid", "offline"] }
                },
                _sum: { amount: true },
                _count: { id: true }
            })
        ]);

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
            totalFunds: totalDonations._sum?.amount || 0,
            generalFunds: generalDonations._sum?.amount || 0,
            campaignFunds: campaignDonations._sum?.amount || 0,
            onlineFunds: onlineDonations._sum?.amount || 0,
            offlineFunds: offlineDonations._sum?.amount || 0,
            totalDonationsCount: totalDonations._count?.id || 0,
            generalDonationsCount: generalDonations._count?.id || 0,
            campaignDonationsCount: campaignDonations._count?.id || 0,
            pendingRequest
        })
    } catch (error) {
        logError("Error in dashboard", error)
        next(error)
    }
}