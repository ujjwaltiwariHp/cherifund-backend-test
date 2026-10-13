import { httpStatus } from "../config/httpStatus.js";

export const galleryError = {
    Image_Required: {
        message: "Image is required",
        status: httpStatus.BAD_REQUEST
    },

    Not_Exist: {
        message: "Gallery image not found",
        status: httpStatus.NOT_FOUND
    }
}
