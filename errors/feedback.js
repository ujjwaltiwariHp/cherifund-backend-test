import { httpStatus } from "../config/httpStatus.js";

export const feedbackError = {
    Required_Fields : {
        message : "Missing required field",
        status : httpStatus.BAD_REQUEST
    },

    Invalid_Rating : {
        message : "Rating must be between (1-5) both includes",
        status : httpStatus.BAD_REQUEST
    },

    Not_Exists : {
        message : "Feedback not found",
        status : httpStatus.NOT_FOUND
    },

    Invalid_Approval_Status : {
        message : "Invalid approval status",
        status : httpStatus.BAD_REQUEST
    }
}