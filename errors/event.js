import { httpStatus } from "../config/httpStatus.js";

export const eventError = {
    Required_Fields : {
        message : "Missing required field",
        status : httpStatus.BAD_REQUEST
    },

    Image_Required : {
        message : "Image is required",
        status : httpStatus.BAD_REQUEST
    },

    Event_Not_Exists :  {
        message : "Event not found",
        status : httpStatus.NOT_FOUND
    }
}