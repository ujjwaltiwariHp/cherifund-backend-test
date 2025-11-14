import { httpStatus } from "../config/httpStatus.js";

export const campaignError = {
    Fields_Required : {
        message : "All fields are required",
        status : httpStatus.BAD_REQUEST
    },

    Image_Required : {
        message : "Image is required",
        status : httpStatus.BAD_REQUEST
    },

    Campaign_Id_Required : {
        message : "Campaign Id is required",
        status : httpStatus.BAD_REQUEST
    },

    Campaign_Not_Exists : {
        message : "Campaign not found",
        status : httpStatus.NOT_FOUND
    }
}