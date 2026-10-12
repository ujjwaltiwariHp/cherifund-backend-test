import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { logError } from "../../util/logHelper.js"
import { errorHandler } from "../../util/errorHandler.js"

export const getDonorsForCampaign = async (req, res, next) => {
    const { campaignId } = req.params;
    const { page = 1, limit = 10, search } = req.query;

    try {
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        let whereCondition = {
            campaignId: campaignId,
            status: { in: ["paid", "offline"] } 
        };

        if (search && search.trim() !== "") {
            whereCondition = {
                ...whereCondition,
                OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search, mode: "insensitive" } }
                ]
            };
        }

        const totalDonors = await prisma.donation.count({ where: whereCondition });

        const donors = await prisma.donation.findMany({
            where: whereCondition,
            skip,
            take: limitNumber,
            orderBy: {
                createdAt: "desc"
            }
        });

        res.status(httpStatus.OK).json({
            total: totalDonors,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(totalDonors / limitNumber),
            donors
        });

    } catch (error) {
        logError("Error in get donors for campaign", error);
        next(error);
    }
};

export const exportDonorsCSV = async (req, res, next) => {
    const { campaignId } = req.params;

    try {
        const donors = await prisma.donation.findMany({
            where: {
                campaignId: campaignId,
                status: { in: ["paid", "offline"] }
            },
            orderBy: {
                createdAt: "desc"
            },
            include: {
                campaign: true
            }
        });

        if (!donors || donors.length === 0) {
             return next(errorHandler({status: httpStatus.NOT_FOUND, message: "No donors found for this campaign"}));
        }

        let csv = "Donation ID,First Name,Last Name,Email,Phone,Address,Amount,Method,Date\n";
        
        donors.forEach(donor => {
            const firstName = donor.firstName ? `"${donor.firstName.replace(/"/g, '""')}"` : "";
            const lastName = donor.lastName ? `"${donor.lastName.replace(/"/g, '""')}"` : "";
            const email = donor.email ? `"${donor.email.replace(/"/g, '""')}"` : "";
            const phone = donor.phone ? `"${donor.phone.replace(/"/g, '""')}"` : "";
            const address = donor.address ? `"${donor.address.replace(/"/g, '""')}"` : "";
            const amount = donor.amount || 0;
            const method = donor.paymentMethod || "online";
            const date = donor.createdAt ? donor.createdAt.toISOString().split('T')[0] : "";

            csv += `${donor.id},${firstName},${lastName},${email},${phone},${address},${amount},${method},${date}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="campaign_${campaignId}_donors.csv"`);
        res.status(httpStatus.OK).send(csv);

    } catch (error) {
        logError("Error exporting donors csv", error);
        next(error);
    }
};

export const getAllDonations = async (req, res, next) => {
    const { page = 1, limit = 10, search, type = "all", campaignId } = req.query;

    try {
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        let whereCondition = {
            status: { in: ["paid", "offline"] }
        };

        if (type === "general") {
            whereCondition.campaignId = null;
        } else if (type === "campaign") {
            if (campaignId) {
                whereCondition.campaignId = campaignId;
            } else {
                whereCondition.campaignId = { not: null };
            }
        } else if (campaignId) {
            whereCondition.campaignId = campaignId;
        }

        if (search && search.trim() !== "") {
            whereCondition = {
                ...whereCondition,
                OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search, mode: "insensitive" } }
                ]
            };
        }

        const totalDonations = await prisma.donation.count({ where: whereCondition });

        const donations = await prisma.donation.findMany({
            where: whereCondition,
            skip,
            take: limitNumber,
            orderBy: {
                createdAt: "desc"
            },
            include: {
                campaign: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        });

        res.status(httpStatus.OK).json({
            total: totalDonations,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(totalDonations / limitNumber),
            donations
        });

    } catch (error) {
        logError("Error in get all donations", error);
        next(error);
    }
};

export const exportAllDonationsCSV = async (req, res, next) => {
    const { search, type = "all", campaignId } = req.query;

    try {
        let whereCondition = {
            status: { in: ["paid", "offline"] }
        };

        if (type === "general") {
            whereCondition.campaignId = null;
        } else if (type === "campaign") {
            if (campaignId) {
                whereCondition.campaignId = campaignId;
            } else {
                whereCondition.campaignId = { not: null };
            }
        } else if (campaignId) {
            whereCondition.campaignId = campaignId;
        }

        if (search && search.trim() !== "") {
            whereCondition = {
                ...whereCondition,
                OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search, mode: "insensitive" } }
                ]
            };
        }

        const donations = await prisma.donation.findMany({
            where: whereCondition,
            orderBy: {
                createdAt: "desc"
            },
            include: {
                campaign: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        });

        if (!donations || donations.length === 0) {
            return next(errorHandler({ status: httpStatus.NOT_FOUND, message: "No donations found to export" }));
        }

        let csv = "Donation ID,Type,Campaign ID,Campaign Title,First Name,Last Name,Email,Phone,Address,Amount,Method,Date\n";

        donations.forEach(donation => {
            const donationType = donation.campaignId ? "Campaign" : "General";
            const campId = donation.campaignId ? `"${donation.campaignId}"` : '""';
            let campTitle = "General Donation";
            if (donation.campaign?.title) {
                if (typeof donation.campaign.title === "object") {
                    campTitle = donation.campaign.title.en || donation.campaign.title.hi || JSON.stringify(donation.campaign.title);
                } else {
                    campTitle = String(donation.campaign.title);
                }
            }
            campTitle = `"${campTitle.replace(/"/g, '""')}"`;

            const firstName = donation.firstName ? `"${donation.firstName.replace(/"/g, '""')}"` : '""';
            const lastName = donation.lastName ? `"${donation.lastName.replace(/"/g, '""')}"` : '""';
            const email = donation.email ? `"${donation.email.replace(/"/g, '""')}"` : '""';
            const phone = donation.phone ? `"${donation.phone.replace(/"/g, '""')}"` : '""';
            const address = donation.address ? `"${donation.address.replace(/"/g, '""')}"` : '""';
            const amount = donation.amount || 0;
            const method = donation.paymentMethod || "online";
            const date = donation.createdAt ? donation.createdAt.toISOString().split('T')[0] : "";

            csv += `${donation.id},${donationType},${campId},${campTitle},${firstName},${lastName},${email},${phone},${address},${amount},${method},${date}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="donations_export_${Date.now()}.csv"`);
        res.status(httpStatus.OK).send(csv);

    } catch (error) {
        logError("Error exporting all donations csv", error);
        next(error);
    }
};
