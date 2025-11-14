import { httpStatus } from "../config/httpStatus.js";

export const paymentError = {
    Amount_Required : {
        message : "Amount is required",
        status : httpStatus.BAD_REQUEST
    },

    Not_Exists : {
        message : "Campaign not exists",
        status : httpStatus.NOT_FOUND
    },

    Invalid_Signature : {
        message : "Invalid signature",
        status : httpStatus.BAD_REQUEST
    }
}