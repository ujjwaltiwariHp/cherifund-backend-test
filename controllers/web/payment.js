import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { paymentError } from "../../errors/payment.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"
import { razorpay } from "../../util/razorpay.js"
import {createHmac} from "node:crypto"

//! create order
export const createOrder = async (req, res, next) =>{
    const {amount, campaignId, campaignTitle} = req.body
    try {
        if(!amount)
            return next(errorHandler(paymentError.Amount_Required))

        const existingCampaign = await prisma.campaigns.findUnique({
            where : {
                id : campaignId
            }
        })
        if(!existingCampaign)
            return next(errorHandler(paymentError.Not_Exists))

        const options = {
            amount : amount * 100,
            currency : "INR",
            receipt : `recept_${Date.now()}`,
            notes : {
                campaignId: campaignId,
                campaignTitle,
            }
        }

        const order = await razorpay.orders.create(options)

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
        const campaignId = payment.notes.campaignId;

        if (event == "payment.captured" || event == "payment.authorized"){

            await prisma.$transaction(async(tx) => {
                await tx.donation.create({
                    data : {
                        razorpayId : payment.id,
                        amount : payment.amount / 100, // Fixed: float instead of string
                        status : "paid",
                        campaignId: campaignId 
                    }
                })
                
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
            await prisma.donation.create({
                data : {
                    razorpayId : payment.id,
                    amount : payment.amount / 100,
                    status : "failed",
                    campaignId: campaignId
                }
            })
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
            res.status(httpStatus.OK).json({
                msg : "Payment verified"
            })
        }
        else {
            res.status(httpStatus.OK).json({
                msg : "Payment Verification failed"
            })
        }
    } catch (error) {
        logError("Error iin verify signature", error)
        next(error)
    }
}