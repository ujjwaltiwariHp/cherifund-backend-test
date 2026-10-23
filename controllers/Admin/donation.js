import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { logError } from "../../util/logHelper.js"
import { errorHandler } from "../../util/errorHandler.js"
import { generateReceiptNumber } from "../../util/receiptHelper.js"
import { sendDonationReceiptEmail } from "../../services/emailService.js"

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

export const buildDonationWhereClause = (query = {}) => {
    const { search, type = "all", campaignId, paymentMethod = "all", status, startDate, endDate } = query;
    let whereCondition = {};

    // Status filter:
    if (status && status !== "all") {
        if (status === "paid") {
            whereCondition.status = { in: ["paid", "offline", "completed"] };
        } else {
            whereCondition.status = status;
        }
    } else if (status === "all") {
        // Explicitly include all active donations (paid, offline, pending, completed)
        whereCondition.status = { in: ["paid", "offline", "pending", "completed"] };
    } else if (paymentMethod === "offline") {
        // When viewing offline tab without explicit status, show all offline donations (pending and verified)
        whereCondition.status = { in: ["paid", "offline", "pending"] };
    } else {
        // Default view: include confirmed donations and new offline pledges so new requests show at the top row
        whereCondition.status = { in: ["paid", "offline", "pending", "completed"] };
    }

    // Type filter: general vs campaign
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

    // Payment method filter: online vs offline
    if (paymentMethod && paymentMethod !== "all") {
        whereCondition.paymentMethod = paymentMethod.toLowerCase();
    }

    // Date range filter
    if (startDate || endDate) {
        whereCondition.createdAt = {};
        if (startDate) {
            whereCondition.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            if (endDate.length <= 10) {
                end.setHours(23, 59, 59, 999);
            }
            whereCondition.createdAt.lte = end;
        }
    }

    // Search filter across donor fields
    if (search && search.trim() !== "") {
        const s = search.trim();
        whereCondition.OR = [
            { firstName: { contains: s, mode: "insensitive" } },
            { lastName: { contains: s, mode: "insensitive" } },
            { email: { contains: s, mode: "insensitive" } },
            { phone: { contains: s, mode: "insensitive" } },
            { address: { contains: s, mode: "insensitive" } }
        ];
    }

    return whereCondition;
};

export const getAllDonations = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;

    try {
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        const whereCondition = buildDonationWhereClause(req.query);

        // Summary metrics strictly calculate verified/settled funds (excluding unverified pending pledges)
        const verifiedStatus = { in: ["paid", "offline", "completed"] };
        const scopeCondition = req.query.campaignId
            ? { campaignId: req.query.campaignId, status: verifiedStatus }
            : { status: verifiedStatus };

        const [
            totalFilteredDonations,
            donations,
            filteredSum,
            totalSum,
            onlineSum,
            offlineSum,
            generalSum,
            campaignSum
        ] = await Promise.all([
            prisma.donation.count({ where: whereCondition }),
            prisma.donation.findMany({
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
            }),
            prisma.donation.aggregate({
                where: whereCondition,
                _sum: { amount: true }
            }),
            prisma.donation.aggregate({
                where: scopeCondition,
                _count: { id: true },
                _sum: { amount: true }
            }),
            prisma.donation.aggregate({
                where: { ...scopeCondition, paymentMethod: "online" },
                _count: { id: true },
                _sum: { amount: true }
            }),
            prisma.donation.aggregate({
                where: { ...scopeCondition, paymentMethod: "offline" },
                _count: { id: true },
                _sum: { amount: true }
            }),
            prisma.donation.aggregate({
                where: { ...scopeCondition, campaignId: null },
                _count: { id: true },
                _sum: { amount: true }
            }),
            prisma.donation.aggregate({
                where: { ...scopeCondition, campaignId: { not: null } },
                _count: { id: true },
                _sum: { amount: true }
            })
        ]);

        const summary = {
            totalAmount: totalSum._sum?.amount || 0,
            totalCount: totalSum._count?.id || 0,
            onlineAmount: onlineSum._sum?.amount || 0,
            onlineCount: onlineSum._count?.id || 0,
            offlineAmount: offlineSum._sum?.amount || 0,
            offlineCount: offlineSum._count?.id || 0,
            generalAmount: generalSum._sum?.amount || 0,
            generalCount: generalSum._count?.id || 0,
            campaignAmount: campaignSum._sum?.amount || 0,
            campaignCount: campaignSum._count?.id || 0,
        };

        const filteredSummary = {
            totalAmount: filteredSum._sum?.amount || 0,
            totalCount: totalFilteredDonations,
        };

        res.status(httpStatus.OK).json({
            total: totalFilteredDonations,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(totalFilteredDonations / limitNumber),
            summary,
            filteredSummary,
            donations
        });

    } catch (error) {
        logError("Error in get all donations", error);
        next(error);
    }
};

export const exportAllDonationsCSV = async (req, res, next) => {
    try {
        const whereCondition = buildDonationWhereClause(req.query);

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

        let csv = "Receipt Number,Donation ID,Type,Campaign ID,Campaign Title,First Name,Last Name,Email,Phone,Address,Amount,Method,Status,Date\n";

        donations.forEach(donation => {
            const receiptNo = donation.receiptNumber ? `"${donation.receiptNumber}"` : '""';
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
            const status = donation.status || "paid";
            const date = donation.createdAt ? donation.createdAt.toISOString().split('T')[0] : "";

            csv += `${receiptNo},${donation.id},${donationType},${campId},${campTitle},${firstName},${lastName},${email},${phone},${address},${amount},${method},${status},${date}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="donations_export_${Date.now()}.csv"`);
        res.status(httpStatus.OK).send(csv);

    } catch (error) {
        logError("Error exporting all donations csv", error);
        next(error);
    }
};

export const verifyOfflineDonation = async (req, res, next) => {
    const { donationId } = req.params;
    const { amount, message } = req.body;

    try {
        if (!donationId) {
            return next(errorHandler({ status: httpStatus.BAD_REQUEST, message: "Donation ID is required" }));
        }

        const existingDonation = await prisma.donation.findUnique({
            where: { id: donationId },
            include: { campaign: true }
        });

        if (!existingDonation) {
            return next(errorHandler({ status: httpStatus.NOT_FOUND, message: "Donation not found" }));
        }

        if (existingDonation.paymentMethod !== "offline") {
            return next(errorHandler({ status: httpStatus.BAD_REQUEST, message: "Only offline donations can be verified here" }));
        }

        if (existingDonation.status === "paid" || (existingDonation.status === "offline" && existingDonation.receiptNumber)) {
            return next(errorHandler({ status: httpStatus.BAD_REQUEST, message: "Donation is already verified and confirmed" }));
        }

        const confirmedAmount = amount !== undefined && amount !== null && amount !== ""
            ? parseFloat(amount)
            : existingDonation.amount;

        if (isNaN(confirmedAmount) || confirmedAmount <= 0) {
            return next(errorHandler({ status: httpStatus.BAD_REQUEST, message: "Invalid donation amount" }));
        }

        const verificationNotes = req.body.notes !== undefined ? req.body.notes : req.body.message;
        const updatedPan = req.body.pan !== undefined
            ? (req.body.pan && typeof req.body.pan === "string" && req.body.pan.trim() ? req.body.pan.trim().toUpperCase() : null)
            : existingDonation.pan;

        const verifiedResult = await prisma.$transaction(async (tx) => {
            const receiptNumber = existingDonation.receiptNumber || (await generateReceiptNumber(tx));

            const updatedDonation = await tx.donation.update({
                where: { id: donationId },
                data: {
                    status: "paid",
                    amount: confirmedAmount,
                    receiptNumber,
                    pan: updatedPan,
                    message: verificationNotes !== undefined ? verificationNotes : existingDonation.message
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

            if (existingDonation.campaignId) {
                try {
                    const updatedCampaign = await tx.campaigns.update({
                        where: { id: existingDonation.campaignId },
                        data: {
                            raisedAmount: {
                                increment: confirmedAmount
                            }
                        }
                    });

                    if (updatedCampaign.raisedAmount >= updatedCampaign.goalAmount) {
                        await tx.campaigns.update({
                            where: { id: existingDonation.campaignId },
                            data: { status: "Completed" }
                        });
                    }
                } catch (campErr) {
                    console.warn(`Could not update campaign ${existingDonation.campaignId}:`, campErr.message);
                }
            }

            return updatedDonation;
        });

        // Asynchronously dispatch official 80G receipt email to donor upon verification
        let verifiedCampaignTitle = "General Welfare Fund";
        if (verifiedResult.campaign?.title) {
            verifiedCampaignTitle = typeof verifiedResult.campaign.title === "object"
                ? verifiedResult.campaign.title.en || verifiedResult.campaign.title.hi || JSON.stringify(verifiedResult.campaign.title)
                : String(verifiedResult.campaign.title);
        }

        sendDonationReceiptEmail({
            donation: verifiedResult,
            campaignTitle: verifiedCampaignTitle,
            receiptNumber: verifiedResult.receiptNumber,
            isOfflineVerified: true
        }).catch(e => console.error("[AdminDonation] Error sending verified offline donation receipt:", e));

        res.status(httpStatus.OK).json({
            msg: "Offline donation verified successfully",
            donation: verifiedResult,
            receiptNumber: verifiedResult.receiptNumber
        });

    } catch (error) {
        logError("Error in verifyOfflineDonation", error);
        next(error);
    }
};

export const createDirectOfflineDonation = async (req, res, next) => {
    const { amount, firstName, lastName, email, phone, address, pan, message, campaignId } = req.body;

    try {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return next(errorHandler({ status: httpStatus.BAD_REQUEST, message: "Valid donation amount is required" }));
        }

        const cleanPan = pan && typeof pan === "string" && pan.trim() !== ""
            ? pan.trim().toUpperCase()
            : null;

        let validCampaignId = null;
        if (campaignId && String(campaignId).trim() !== "") {
            const campaign = await prisma.campaigns.findUnique({
                where: { id: String(campaignId).trim() }
            });
            if (!campaign) {
                return next(errorHandler({ status: httpStatus.NOT_FOUND, message: "Campaign not found" }));
            }
            validCampaignId = campaign.id;
        }

        const donation = await prisma.$transaction(async (tx) => {
            const receiptNumber = await generateReceiptNumber(tx);
            const newDonation = await tx.donation.create({
                data: {
                    amount: parsedAmount,
                    status: "paid",
                    paymentMethod: "offline",
                    receiptNumber,
                    campaignId: validCampaignId,
                    firstName,
                    lastName,
                    email,
                    phone,
                    address,
                    pan: cleanPan,
                    message
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

            if (validCampaignId) {
                const updatedCampaign = await tx.campaigns.update({
                    where: { id: validCampaignId },
                    data: {
                        raisedAmount: {
                            increment: parsedAmount
                        }
                    }
                });

                if (updatedCampaign.raisedAmount >= updatedCampaign.goalAmount) {
                    await tx.campaigns.update({
                        where: { id: validCampaignId },
                        data: { status: "Completed" }
                    });
                }
            }

            return newDonation;
        });

        // Asynchronously dispatch official 80G receipt email to donor for direct offline entry
        let directCampaignTitle = "General Welfare Fund";
        if (donation.campaign?.title) {
            directCampaignTitle = typeof donation.campaign.title === "object"
                ? donation.campaign.title.en || donation.campaign.title.hi || JSON.stringify(donation.campaign.title)
                : String(donation.campaign.title);
        }

        sendDonationReceiptEmail({
            donation,
            campaignTitle: directCampaignTitle,
            receiptNumber: donation.receiptNumber,
            isOfflineVerified: true
        }).catch(e => console.error("[AdminDonation] Error sending direct offline donation receipt:", e));

        res.status(httpStatus.CREATED).json({
            msg: "Offline donation recorded successfully",
            donation,
            receiptNumber: donation.receiptNumber
        });

    } catch (error) {
        logError("Error in createDirectOfflineDonation", error);
        next(error);
    }
};

/**
 * POST /admin/donation/:donationId/send-receipt-email
 * Re-sends the official 80G receipt email to the donor
 */
export const resendReceiptEmail = async (req, res, next) => {
    const { donationId } = req.params;
    try {
        if (!donationId) {
            return next(errorHandler({ status: httpStatus.BAD_REQUEST, message: "Donation ID is required" }));
        }

        const donation = await prisma.donation.findUnique({
            where: { id: donationId },
            include: { campaign: true }
        });

        if (!donation) {
            return next(errorHandler({ status: httpStatus.NOT_FOUND, message: "Donation not found" }));
        }

        const statusLower = (donation.status || "").toLowerCase();
        const isOffline = (donation.paymentMethod || "").toLowerCase() === "offline";
        const isVerified = statusLower === "paid" || statusLower === "verified" || statusLower === "completed" || statusLower === "success";

        if (isOffline && !isVerified) {
            return next(errorHandler({ status: httpStatus.BAD_REQUEST, message: "This offline donation is pending verification. Please verify it before sending an official receipt." }));
        }

        if (!isVerified) {
            return next(errorHandler({ status: httpStatus.BAD_REQUEST, message: "Official receipts can only be sent for confirmed or verified donations." }));
        }

        const cleanEmail = donation.email ? donation.email.trim() : "";
        if (!cleanEmail || cleanEmail === "-" || !cleanEmail.includes("@")) {
            return next(errorHandler({ status: httpStatus.BAD_REQUEST, message: "This donation does not have a valid donor email address on record." }));
        }

        // Auto-generate receipt number if missing from older record
        let receiptNumber = donation.receiptNumber;
        if (!receiptNumber) {
            receiptNumber = await generateReceiptNumber(prisma);
            await prisma.donation.update({
                where: { id: donation.id },
                data: { receiptNumber }
            });
            donation.receiptNumber = receiptNumber;
        }

        let campaignTitle = "General Welfare Fund";
        if (donation.campaign?.title) {
            campaignTitle = typeof donation.campaign.title === "object"
                ? donation.campaign.title.en || donation.campaign.title.hi || JSON.stringify(donation.campaign.title)
                : String(donation.campaign.title);
        }

        await sendDonationReceiptEmail({
            donation,
            campaignTitle,
            receiptNumber: donation.receiptNumber,
            isOfflineVerified: isOffline
        });

        res.status(httpStatus.OK).json({
            success: true,
            msg: `Official 80G receipt and PDF certificate sent successfully to ${cleanEmail}`,
            receiptNumber: donation.receiptNumber
        });
    } catch (error) {
        logError("Error in resendReceiptEmail", error);
        next(error);
    }
};
