import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { logError } from "../../util/logHelper.js"

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

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
                where: { status: { in: ["paid", "offline"] } },
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma.donation.aggregate({
                where: { campaignId: null, status: { in: ["paid", "offline"] } },
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma.donation.aggregate({
                where: { campaignId: { not: null }, status: { in: ["paid", "offline"] } },
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma.donation.aggregate({
                where: { paymentMethod: "online", status: { in: ["paid", "offline"] } },
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma.donation.aggregate({
                where: { paymentMethod: "offline", status: { in: ["paid", "offline"] } },
                _sum: { amount: true },
                _count: { id: true }
            })
        ])

        //! pending request (comment - feedback)
        const pendingComment = await prisma.comment.count({
            where : { status : "PENDING" }
        })

        const pendingFeedback = await prisma.feedback.count({
            where : { status : "PENDING" }
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

/**
 * GET /admin/dashboard/campaign-distribution
 * Returns campaign-wise fund distribution for the pie chart.
 * Each entry has: campaignId, name (en title), value (total raised), donorCount
 * Includes a "General Donations" bucket for donations with no campaignId.
 */
export const campaignDistribution = async (req, res, next) => {
    try {
        const verifiedStatus = { in: ["paid", "offline"] }

        //! group donations by campaignId and sum amounts + count donors
        const grouped = await prisma.donation.groupBy({
            by: ["campaignId"],
            where: { status: verifiedStatus },
            _sum: { amount: true },
            _count: { id: true },
            orderBy: { _sum: { amount: "desc" } }
        })

        //! collect non-null campaignIds to fetch their titles
        const campaignIds = grouped
            .map(g => g.campaignId)
            .filter(id => id !== null)

        const campaigns = campaignIds.length > 0
            ? await prisma.campaigns.findMany({
                where: { id: { in: campaignIds } },
                select: { id: true, title: true }
              })
            : []

        //! build a quick lookup map
        const campaignMap = {}
        campaigns.forEach(c => {
            let name = "Untitled Campaign"
            if (c.title) {
                if (typeof c.title === "string") {
                    name = c.title
                } else {
                    name = c.title.en || c.title.hi || Object.values(c.title)[0] || name
                }
            }
            campaignMap[c.id] = name
        })

        //! shape the response
        const distribution = grouped.map(g => ({
            campaignId: g.campaignId,
            name: g.campaignId ? (campaignMap[g.campaignId] || "Unknown Campaign") : "General Donations",
            value: g._sum.amount || 0,
            donorCount: g._count.id || 0
        }))

        const total = distribution.reduce((sum, d) => sum + d.value, 0)

        res.status(httpStatus.OK).json({ distribution, total })
    } catch (error) {
        logError("Error in campaign distribution", error)
        next(error)
    }
}

/**
 * GET /admin/dashboard/monthly-funds?year=2026
 * Returns month-by-month fund totals for the bar chart.
 * Always returns all 12 months; months with no donations return 0.
 */
export const monthlyFunds = async (req, res, next) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear()

        const startDate = new Date(`${year}-01-01T00:00:00.000Z`)
        const endDate   = new Date(`${year + 1}-01-01T00:00:00.000Z`)

        //! fetch all verified donations for the year (only amount + createdAt needed)
        const donations = await prisma.donation.findMany({
            where: {
                status: { in: ["paid", "offline"] },
                createdAt: { gte: startDate, lt: endDate }
            },
            select: { amount: true, createdAt: true }
        })

        //! build a 12-slot array and bucket each donation by month
        const monthlyBuckets = Array.from({ length: 12 }, (_, i) => ({
            month: MONTH_NAMES[i],
            monthNumber: i + 1,
            funds: 0,
            count: 0
        }))

        donations.forEach(d => {
            const monthIndex = new Date(d.createdAt).getMonth() // 0-based
            monthlyBuckets[monthIndex].funds  += d.amount || 0
            monthlyBuckets[monthIndex].count  += 1
        })

        const totalYearFunds = monthlyBuckets.reduce((sum, m) => sum + m.funds, 0)

        res.status(httpStatus.OK).json({ year, monthly: monthlyBuckets, totalYearFunds })
    } catch (error) {
        logError("Error in monthly funds", error)
        next(error)
    }
}