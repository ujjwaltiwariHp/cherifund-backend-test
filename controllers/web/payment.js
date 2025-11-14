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
                campaignId,
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
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers["x-razorpay-signature"];
        const body = JSON.stringify(req.body)

        //! verify webhook signature
        const expected = createHmac("sha256", secret)
                         .update(body, "utf-8")
                         .digest("hex")

        if(expected !== signature)
            return next(errorHandler(paymentError.Invalid_Signature))

        const event = req.body.event
        const payment = req.body.payload.payment.entity
        const campaignId = payment.notes.campaignId

        if (event == "payment.captured"){

            await prisma.$transaction(async(tx) => {
                await tx.donation.create({
                    data : {
                        razorpayId : payment.id,
                        amount : (payment.amount / 100).toFixed(2),
                        status : "paid",
                        campaignId
                    }
                })
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
            })
        }

        if(event == "payment.failed"){
            await prisma.donation.create({
                data : {
                    razorpayId : payment.id,
                    amount : payment.amount / 100,
                    status : "failed",
                    campaignId
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