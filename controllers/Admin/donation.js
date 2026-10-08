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
