import { httpStatus } from "../config/httpStatus.js";

export const emailError = {
    Email_Required : {
        message : "Email is required",
        status : httpStatus.BAD_REQUEST
    },

    Invalid_Email : {
        message : "Invalid email address",
        status : httpStatus.BAD_REQUEST
    },

    Already_Exists : {
        message : "Email already exists",
        status : httpStatus.BAD_REQUEST
    },

    Required_Field : {
        message : "Required fields are missing",
        status : httpStatus.BAD_REQUEST
    },

    Email_Not_Exists : {
        message : "Email not found",
        status : httpStatus.NOT_FOUND
    }
}