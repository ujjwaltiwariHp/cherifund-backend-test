import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { paymentError } from "../../errors/payment.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"
import { razorpay } from "../../util/razorpay.js"
import { generateReceiptNumber, numberToWordsINR } from "../../util/receiptHelper.js"
import {createHmac} from "node:crypto"

//! create order
export const createOrder = async (req, res, next) =>{
    const {amount, campaignId, campaignTitle, firstName, lastName, email, phone, address, message, paymentMethod} = req.body
    try {
        if(!amount || Number(amount) <= 0)
            return next(errorHandler(paymentError.Amount_Required))

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
            
        if (paymentMethod === "offline") {
             const receiptNumber = await generateReceiptNumber(prisma);
             const donation = await prisma.donation.create({
                 data: {
                     amount: Number(amount),
                     status: "offline",
                     paymentMethod: "offline",
                     receiptNumber,
                     campaignId: validCampaignId,
                     firstName, lastName, email, phone, address, message
                 }
             });
             return res.status(httpStatus.CREATED).json({
                 msg: "Offline donation logged successfully",
                 donationId: donation.id,
                 receiptNumber: donation.receiptNumber
             });
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
                 firstName, lastName, email, phone, address, message
             }
        });

        res.status(httpStatus.CREATED).json({
            orderId : order.id,
            key : process.env.RAZORPAY_KEY_ID,
            amount : order.amount,
            currency : order.currency
        })
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

            await prisma.$transaction(async(tx) => {
                const existingDonation = await tx.donation.findUnique({
                    where: { orderId: orderId }
                });

                if (existingDonation) {
                    const receiptNumber = existingDonation.receiptNumber || (await generateReceiptNumber(tx));
                    await tx.donation.update({
                        where: { orderId: orderId },
                        data: {
                            razorpayId: payment.id,
                            status: "paid",
                            receiptNumber
                        }
                    });
                } else {
                    const receiptNumber = await generateReceiptNumber(tx);
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
                
                // Update campaign raisedAmount
                if (campaignId) {
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

                let receiptNumber = existingDonation?.receiptNumber;
                if (!receiptNumber) {
                    receiptNumber = await generateReceiptNumber(tx);
                }

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