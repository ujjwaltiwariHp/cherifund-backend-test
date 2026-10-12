import { httpStatus } from "../config/httpStatus.js";

export const sponsorError = {
    Required_Fields: {
        message: "Missing required fields (name, category, shortDescription, description)",
        status: httpStatus.BAD_REQUEST
    },

    Image_Required: {
        message: "Logo image is required",
        status: httpStatus.BAD_REQUEST
    },

    Not_Exists: {
        message: "Sponsor not found",
        status: httpStatus.NOT_FOUND
    },

    Slug_Exists: {
        message: "A sponsor with this slug already exists",
        status: httpStatus.BAD_REQUEST
    }
};
