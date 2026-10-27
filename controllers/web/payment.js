import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { paymentError } from "../../errors/payment.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"
import { razorpay } from "../../util/razorpay.js"
import { generateReceiptNumber, numberToWordsINR } from "../../util/receiptHelper.js"
import { getCache, setCache, invalidateCachePrefix } from "../../util/cacheHelper.js"
import {createHmac} from "node:crypto"
import {
    sendDonationReceiptEmail,
    sendAdminDonationAlert,
    sendOfflinePledgeConfirmationEmail,
    sendAdminPledgeAlert
} from "../../services/emailService.js"
import { broadcastRealtimeEvent } from "../../services/realtimeService.js"
import { createNotification } from "../../services/notificationService.js"

//! create order
export const createOrder = async (req, res, next) =>{
    const {amount, campaignId, campaignTitle, firstName, lastName, email, phone, address, message, paymentMethod, pan} = req.body
    const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey;
    try {
        if (idempotencyKey) {
            const cachedResponse = await getCache(`idempotency:${idempotencyKey}`);
            if (cachedResponse) {
                return res.status(httpStatus.OK).json(cachedResponse);
            }
        }

        if(!amount || Number(amount) <= 0)
            return next(errorHandler(paymentError.Amount_Required))

        const cleanPan = pan && typeof pan === "string" && pan.trim() !== ""
            ? pan.trim().toUpperCase()
            : null

        const validCampaignId = campaignId && typeof campaignId === "string" && campaignId.trim() !== ""
            ? campaignId.trim()
            : null

        if (validCampaignId) {
            const existingCampaign = await prisma.campaigns.findUnique({
                where : {
                    id : validCampaignId
                }
            })
            if(!existingCampaign)
                return next(errorHandler(paymentError.Not_Exists))
        }

        if (paymentMethod === "direct") {
            const receiptNumber = await generateReceiptNumber(prisma);
            const donation = await prisma.donation.create({
                data: {
                    amount: Number(amount),
                    status: "paid",
                    paymentMethod: "online",
                    receiptNumber,
                    campaignId: validCampaignId,
                    firstName,
                    lastName,
                    email,
                    phone,
                    address,
                    pan: cleanPan,
                    message
                }
            });

            if (validCampaignId) {
                await prisma.campaigns.update({
                    where: { id: validCampaignId },
                    data: { raisedAmount: { increment: Number(amount) } }
                });
            }

            const responseData = {
                msg: "Direct donation processed successfully",
                donationId: donation.id,
                receiptNumber,
                status: "paid",
                paymentMethod: "online",
                amount: donation.amount
            };

            if (idempotencyKey) {
                await setCache(`idempotency:${idempotencyKey}`, responseData, 600);
            }

            // Asynchronously dispatch donation receipt & admin alert for direct donations
            sendDonationReceiptEmail({
                donation,
                campaignTitle: campaignTitle || "General Welfare Fund",
                receiptNumber,
                isOfflineVerified: true
            }).catch(e => console.error("[Payment] Error sending direct donation receipt:", e));

            sendAdminDonationAlert({
                donation,
                campaignTitle: campaignTitle || "General Welfare Fund",
                receiptNumber
            }).catch(e => console.error("[Payment] Error sending direct donation admin alert:", e));

            // Real-time SSE alert to admin dashboard & donations table
            const directDonorName = [donation.firstName, donation.lastName].filter(Boolean).join(" ") || "Generous Donor";
            broadcastRealtimeEvent("donation:created", {
                type: "online",
                amount: donation.amount,
                receiptNumber,
                donorName: directDonorName,
                campaignTitle: campaignTitle || "General Welfare Fund",
                donationId: donation.id
            });

            createNotification({
                type: "donation",
                title: "New Online Donation",
                message: `₹${Number(donation.amount).toLocaleString("en-IN")} received from ${directDonorName}`,
                metadata: {
                    amount: donation.amount,
                    donorName: directDonorName,
                    receiptNumber,
                    donationId: donation.id,
                    campaignTitle: campaignTitle || "General Welfare Fund",
                    paymentMethod: "online"
                }
            }).catch(e => console.error("[Payment] Error saving notification:", e));

            return res.status(httpStatus.CREATED).json(responseData);
        }

        if (paymentMethod === "offline") {
            const donation = await prisma.donation.create({
                data: {
                    amount: Number(amount),
                    status: "pending",
                    paymentMethod: "offline",
                    receiptNumber: null,
                    campaignId: validCampaignId,
                    firstName,
                    lastName,
                    email,
                    phone,
                    address,
                    pan: cleanPan,
                    message
                }
            });

            const responseData = {
                msg: "Offline donation request submitted successfully",
                donationId: donation.id,
                status: donation.status,
                paymentMethod: donation.paymentMethod,
                amount: donation.amount
            };

            if (idempotencyKey) {
                await setCache(`idempotency:${idempotencyKey}`, responseData, 600);
            }

            // Asynchronously dispatch offline pledge acknowledgement & admin alert
            sendOfflinePledgeConfirmationEmail({
                donation,
                campaignTitle: campaignTitle || "General Welfare Fund"
            }).catch(e => console.error("[Payment] Error sending offline pledge confirmation:", e));

            sendAdminPledgeAlert({
                donation,
                campaignTitle: campaignTitle || "General Welfare Fund"
            }).catch(e => console.error("[Payment] Error sending offline pledge admin alert:", e));

            // Real-time SSE alert to admin dashboard & donations table
            const offlineDonorName = [donation.firstName, donation.lastName].filter(Boolean).join(" ") || "Generous Donor";
            broadcastRealtimeEvent("donation:created", {
                type: "offline",
                amount: donation.amount,
                donorName: offlineDonorName,
                campaignTitle: campaignTitle || "General Welfare Fund",
                donationId: donation.id
            });

            createNotification({
                type: "donation",
                title: "New Offline Pledge",
                message: `₹${Number(donation.amount).toLocaleString("en-IN")} pledged by ${offlineDonorName}`,
                metadata: {
                    amount: donation.amount,
                    donorName: offlineDonorName,
                    donationId: donation.id,
                    campaignTitle: campaignTitle || "General Welfare Fund",
                    paymentMethod: "offline"
                }
            }).catch(e => console.error("[Payment] Error saving notification:", e));

            return res.status(httpStatus.CREATED).json(responseData);
        }

        const options = {
            amount : Math.round(Number(amount) * 100),
            currency : "INR",
            receipt : `recept_${Date.now()}`,
            notes : {
                campaignId: validCampaignId || "",
                campaignTitle: campaignTitle || "General Donation",
                donationType: validCampaignId ? "campaign" : "general"
            }
        }

        const order = await razorpay.orders.create(options)
        
        await prisma.donation.create({
             data: {
                 orderId: order.id,
                 amount: Number(amount),
                 status: "created",
                 paymentMethod: "online",
                 campaignId: validCampaignId,
                 firstName, lastName, email, phone, address, pan: cleanPan, message
             }
        });

        const responseData = {
            orderId : order.id,
            key : process.env.RAZORPAY_KEY_ID,
            amount : order.amount,
            currency : order.currency
        };

        if (idempotencyKey) {
            await setCache(`idempotency:${idempotencyKey}`, responseData, 600);
        }

        res.status(httpStatus.CREATED).json(responseData);
    } catch (error) {
        logError("Error in create order (payment)", error )
        next(error)
    }
}

//! webhook
export const razorpayWebhook = async (req, res, next) =>{
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
        const signature = req.headers["x-razorpay-signature"]?.trim();
        // req.rawBody is captured by the verify function in app.js
        if (!req.rawBody) {
            console.error("Missing rawBody! express.json verify didn't fire.");
            return next(errorHandler(paymentError.Invalid_Signature));
        }
        
        const rawBody = req.rawBody.toString('utf-8');
        
        //! verify webhook signature
        const expected = createHmac("sha256", secret)
                         .update(rawBody, "utf-8")
                         .digest("hex")
        
        if(expected !== signature) {
            console.error("Signature Mismatch!");
            if (process.env.NODE_ENV === "production") {
                return next(errorHandler(paymentError.Invalid_Signature));
            } else {
                console.warn("Bypassing signature check for local testing environment...");
            }
        }

        // We can use req.body directly because express.json() already parsed it!
        const event = req.body.event;
        const payment = req.body.payload.payment.entity;
        const rawCampaignId = payment.notes?.campaignId;
        const campaignId = rawCampaignId && typeof rawCampaignId === "string" && rawCampaignId.trim() !== ""
            ? rawCampaignId.trim()
            : null;
        const orderId = payment.order_id;

        if (event == "payment.captured" || event == "payment.authorized"){
            const defaultReceiptNumber = await generateReceiptNumber(prisma);
            await prisma.$transaction(async(tx) => {
                const existingDonation = await tx.donation.findUnique({
                    where: { orderId: orderId }
                });

                const isAlreadyPaid = existingDonation && existingDonation.status === "paid";
                const receiptNumber = existingDonation?.receiptNumber || defaultReceiptNumber;

                if (existingDonation) {
                    await tx.donation.update({
                        where: { orderId: orderId },
                        data: {
                            razorpayId: payment.id,
                            status: "paid",
                            receiptNumber
                        }
                    });
                } else {
                    await tx.donation.create({
                        data : {
                            orderId: orderId,
                            razorpayId : payment.id,
                            amount : payment.amount / 100,
                            status : "paid",
                            receiptNumber,
                            campaignId: campaignId 
                        }
                    });
                }
                
                // Update campaign raisedAmount only if not already paid
                if (campaignId && !isAlreadyPaid) {
                    const updated = await tx.campaigns.update({
                        where : {
                            id : campaignId,
                        },
                        data : {
                            raisedAmount : {
                                increment : payment.amount / 100
                            }
                        }
                    })
                    //! if raised amount >= goal amount  - mark as completed
                    if(updated.raisedAmount >= updated.goalAmount) {
                        await tx.campaigns.update({
                            where : {
                                id : campaignId
                            },
                            data : {
                                status : "Completed"
                            }
                        })
                    }
                }
            })
            invalidateCachePrefix("home:overview:");
        }

        if(event == "payment.failed"){
            const existingDonation = await prisma.donation.findUnique({
                where: { orderId: orderId }
            });
            if (existingDonation) {
                await prisma.donation.update({
                    where: { orderId: orderId },
                    data: {
                        razorpayId: payment.id,
                        status: "failed"
                    }
                });
            } else {
                await prisma.donation.create({
                    data : {
                        orderId: orderId,
                        razorpayId : payment.id,
                        amount : payment.amount / 100,
                        status : "failed",
                        campaignId: campaignId
                    }
                });
            }
        }

        res.status(httpStatus.OK).json({
            msg : event == "payment.captured" ? "Payment succeeded" : "Payment failed"
        })
    } catch (error) {
        logError("Error in razorpay webhook", error)
        next(error)
    }
}

//! verify signature
export const verifySignature = async (req, res, next) =>{
    const {razorpay_order_id, razorpay_payment_id, razorpay_signature} = req.body
    try {
        const secret = process.env.RAZORPAY_KEY_SECRET
        const generated_signature =  createHmac("sha256", secret)
                                     .update(razorpay_order_id + "|" + razorpay_payment_id, "utf-8")
                                     .digest("hex")

        if(generated_signature == razorpay_signature){
            // Pre-generate receipt number using main pool before entering transaction
            const defaultReceiptNumber = await generateReceiptNumber(prisma);

            // Update donation status and assign receiptNumber if not already assigned
            const updatedDonation = await prisma.$transaction(async (tx) => {
                const existingDonation = await tx.donation.findUnique({
                    where: { orderId: razorpay_order_id },
                    include: {
                        campaign: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                });

                const receiptNumber = existingDonation?.receiptNumber || defaultReceiptNumber;

                if (existingDonation) {
                    const updated = await tx.donation.update({
                        where: { orderId: razorpay_order_id },
                        data: {
                            razorpayId: razorpay_payment_id,
                            status: "paid",
                            receiptNumber
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

                    // Update campaign raisedAmount if not already incremented
                    if (existingDonation.status !== "paid" && existingDonation.campaignId) {
                        const updatedCamp = await tx.campaigns.update({
                            where: { id: existingDonation.campaignId },
                            data: {
                                raisedAmount: {
                                    increment: existingDonation.amount
                                }
                            }
                        });
                        if (updatedCamp.raisedAmount >= updatedCamp.goalAmount) {
                            await tx.campaigns.update({
                                where: { id: existingDonation.campaignId },
                                data: { status: "Completed" }
                            });
                        }
                    }
                    return updated;
                } else {
                    return await tx.donation.create({
                        data: {
                            orderId: razorpay_order_id,
                            razorpayId: razorpay_payment_id,
                            amount: 0,
                            status: "paid",
                            receiptNumber
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
                }
            });

            invalidateCachePrefix("home:overview:");

            // Extract campaign title in English or Hindi
            let campaignTitle = "General Donation";
            if (updatedDonation.campaign?.title) {
                if (typeof updatedDonation.campaign.title === "object") {
                    campaignTitle = updatedDonation.campaign.title.en || updatedDonation.campaign.title.hi || JSON.stringify(updatedDonation.campaign.title);
                } else {
                    campaignTitle = String(updatedDonation.campaign.title);
                }
            }

            const donorName = [updatedDonation.firstName, updatedDonation.lastName].filter(Boolean).join(" ") || "Generous Donor";
            const amountInWords = numberToWordsINR(updatedDonation.amount);

            // Asynchronously dispatch 80G donation receipt email to donor and alert to admin
            sendDonationReceiptEmail({
                donation: updatedDonation,
                campaignTitle,
                receiptNumber: updatedDonation.receiptNumber
            }).catch(e => console.error("[Payment] Error sending verified donation receipt email:", e));

            sendAdminDonationAlert({
                donation: updatedDonation,
                campaignTitle,
                receiptNumber: updatedDonation.receiptNumber
            }).catch(e => console.error("[Payment] Error sending admin donation alert:", e));

            // Real-time SSE alert to admin dashboard & donations table
            broadcastRealtimeEvent("donation:created", {
                type: "online",
                amount: updatedDonation.amount,
                receiptNumber: updatedDonation.receiptNumber,
                donorName,
                campaignTitle,
                donationId: updatedDonation.id
            });

            createNotification({
                type: "donation",
                title: "New Online Donation",
                message: `₹${Number(updatedDonation.amount).toLocaleString("en-IN")} received from ${donorName}`,
                metadata: {
                    amount: updatedDonation.amount,
                    donorName,
                    receiptNumber: updatedDonation.receiptNumber,
                    donationId: updatedDonation.id,
                    campaignTitle,
                    paymentMethod: "online"
                }
            }).catch(e => console.error("[Payment] Error saving notification:", e));

            res.status(httpStatus.OK).json({
                msg: "Payment verified",
                receipt: {
                    donationId: updatedDonation.id,
                    receiptNumber: updatedDonation.receiptNumber,
                    orderId: updatedDonation.orderId,
                    paymentId: updatedDonation.razorpayId,
                    amount: updatedDonation.amount,
                    amountInWords,
                    donorName,
                    donorEmail: updatedDonation.email || "",
                    donorPhone: updatedDonation.phone || "",
                    donorAddress: updatedDonation.address || "",
                    donorPan: updatedDonation.pan || "",
                    donor: {
                        name: donorName,
                        email: updatedDonation.email || "",
                        phone: updatedDonation.phone || "",
                        address: updatedDonation.address || "",
                        pan: updatedDonation.pan || null
                    },
                    paymentMethod: updatedDonation.paymentMethod,
                    campaignTitle,
                    status: updatedDonation.status,
                    date: updatedDonation.createdAt,
                    organization: {
                        name: "YOUTH UTIL WELFARE ASSOCIATION",
                        registeredUnder: "Registered Under 12AA/80G",
                        registrationNo: "SOCIETY/WEST/ 2016/8902080",
                        phones: ["9450886855", "7394886855"],
                        website: "yuwaindia.org",
                        email: "yuwaindia@gmail.com",
                        headOffice: "H.No. RZC-13, KH. No. 72/23, 78/3, Nihal Vihar, Nangloi, New Delhi-110041",
                        branchOffice: "393i, Rajiv Nagar, West Basharatpur, Gorakhpur (U.P.)-273001",
                        taxExemptNote: "Donations are eligible for tax exemption under Section 80G of the Income Tax Act."
                    }
                }
            });
        }
        else {
            res.status(httpStatus.BAD_REQUEST).json({
                msg : "Payment Verification failed"
            })
        }
    } catch (error) {
        logError("Error in verify signature", error)
        next(error)
    }
}

//! get receipt details
export const getReceiptDetails = async (req, res, next) => {
    const { identifier } = req.params;
    try {
        if (!identifier || identifier.trim() === "") {
            return next(errorHandler({ status: httpStatus.BAD_REQUEST, message: "Receipt identifier is required" }));
        }

        const trimmed = identifier.trim();
        const donation = await prisma.donation.findFirst({
            where: {
                OR: [
                    { id: trimmed },
                    { orderId: trimmed },
                    { razorpayId: trimmed },
                    { receiptNumber: trimmed }
                ]
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

        if (!donation) {
            return next(errorHandler({ status: httpStatus.NOT_FOUND, message: "Donation receipt not found" }));
        }

        if (donation.status === "pending" || !donation.receiptNumber) {
            return next(errorHandler({ status: httpStatus.BAD_REQUEST, message: "Donation is still pending verification. Official receipt is not generated yet." }));
        }

        let campaignTitle = "General Donation";
        if (donation.campaign?.title) {
            if (typeof donation.campaign.title === "object") {
                campaignTitle = donation.campaign.title.en || donation.campaign.title.hi || JSON.stringify(donation.campaign.title);
            } else {
                campaignTitle = String(donation.campaign.title);
            }
        }

        const donorName = [donation.firstName, donation.lastName].filter(Boolean).join(" ") || "Generous Donor";
        const amountInWords = numberToWordsINR(donation.amount);

        res.status(httpStatus.OK).json({
            receipt: {
                donationId: donation.id,
                receiptNumber: donation.receiptNumber,
                orderId: donation.orderId,
                paymentId: donation.razorpayId,
                amount: donation.amount,
                amountInWords,
                donorName,
                donorEmail: donation.email || "",
                donorPhone: donation.phone || "",
                donorAddress: donation.address || "",
                donorPan: donation.pan || "",
                donor: {
                    name: donorName,
                    email: donation.email || "",
                    phone: donation.phone || "",
                    address: donation.address || "",
                    pan: donation.pan || null
                },
                paymentMethod: donation.paymentMethod,
                campaignTitle,
                status: donation.status,
                date: donation.createdAt,
                organization: {
                    name: "YOUTH UTIL WELFARE ASSOCIATION",
                    registeredUnder: "Registered Under 12AA/80G",
                    registrationNo: "SOCIETY/WEST/ 2016/8902080",
                    phones: ["9450886855", "7394886855"],
                    website: "yuwaindia.org",
                    email: "yuwaindia@gmail.com",
                    headOffice: "H.No. RZC-13, KH. No. 72/23, 78/3, Nihal Vihar, Nangloi, New Delhi-110041",
                    branchOffice: "393i, Rajiv Nagar, West Basharatpur, Gorakhpur (U.P.)-273001",
                    taxExemptNote: "Donations are eligible for tax exemption under Section 80G of the Income Tax Act."
                }
            }
        });
    } catch (error) {
        logError("Error in getReceiptDetails", error);
        next(error);
    }
};