import { httpStatus } from "../config/httpStatus.js";

export const commentError = {
    Invalid_Email : {
        message : "Invalid email address",
        status : httpStatus.BAD_REQUEST
    },

    Comment_Id_required : {
        message : "Comment Id is required",
        status : httpStatus.BAD_REQUEST
    },

    Comment_Not_Exists : {
        message : "Comment not found",
        status : httpStatus.NOT_FOUND
    },

    Not_Allowed_Reply : {
        message : "Not allow reply to a reply",
        status : httpStatus.BAD_REQUEST
    },

    Invalid_Change : {
        message : "Invalid change number",
        status : httpStatus.BAD_REQUEST
    },

    Not_Exists : {
        message : "No campaign, blog or event found",
        status : httpStatus.NOT_FOUND
    },

    Invalid_Approval_Status : {
        message : "Invalid approval status",
        status : httpStatus.BAD_REQUEST
    }
}