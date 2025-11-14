import { httpStatus } from "../config/httpStatus.js";

export const memberError = {
    Required_Fields : {
        message : "Missing required fields",
        status : httpStatus.BAD_REQUEST
    },

    Image_Required : {
        message : "Image is required",
        status : httpStatus.BAD_REQUEST
    },

    Not_Exists : {
        message : "Member not found",
        status : httpStatus.NOT_FOUND
    }
}