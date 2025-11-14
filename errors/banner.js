import { httpStatus } from "../config/httpStatus.js";

export const bannerError = {
    Fields_Required : {
        message : "All fields are required",
        status : httpStatus.BAD_REQUEST
    },

    Image_Required : {
        message : "Image is required",
        status : httpStatus.BAD_REQUEST
    },

    Priority_Exists : {
        message : "Priority already exists",
        status : httpStatus.BAD_REQUEST
    },

    Not_Exist : {
        message : "Banner not found",
        status : httpStatus.NOT_FOUND
    },

    Limit_Exceed : {
        message : "Only 10 banners are allowed",
        status : httpStatus.BAD_REQUEST
    },

    Priority_Number : {
        message : "Priority Number must be between 1-10 (includes both)",
        status : httpStatus.BAD_REQUEST
    },

    Title_Length : {
        message : "Title length must be less than 40",
        status : httpStatus.BAD_REQUEST
    },

    Subtitle_Length : {
        message : "Subtitle length must be less than 35",
        status : httpStatus.BAD_REQUEST
    }
}