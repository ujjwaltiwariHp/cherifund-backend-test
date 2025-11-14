import { httpStatus } from "../config/httpStatus.js";

export const userError = {
    Fields_Required : {
        message : "All fields are required",
        status : httpStatus.BAD_REQUEST
    },

    Not_Existing_User : {
        message : "Invalid credentials",
        status : httpStatus.BAD_REQUEST
    }
}