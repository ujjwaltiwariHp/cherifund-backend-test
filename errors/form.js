import { httpStatus } from "../config/httpStatus.js";

export const formError = {
    Required_Fields : {
        message : "All fields are required",
        status : httpStatus.BAD_REQUEST
    },

    Invalid_Email : {
        message : "Invalid email address",
        status : httpStatus.BAD_REQUEST
    },

    Invalid_Phone : {
        message : "Phone now must be of 10 digit",
        status : httpStatus.BAD_REQUEST
    },

    Not_Exists : {
        message : "Query not found",
        status : httpStatus.NOT_FOUND
    },

    Invalid_IsViewed_type : {
        message : "Invalid isViewed type",
        status : httpStatus.BAD_REQUEST
    },

    Updation_Not_Allowed : {
        message : "Not allowed to make isViewed as false",
        status : httpStatus.BAD_REQUEST
    }
}