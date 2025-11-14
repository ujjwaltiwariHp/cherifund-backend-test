import { Status } from "@prisma/client";
import { httpStatus } from "../config/httpStatus.js";

export const categoryError = {
    Name_Required : {
        message : "Name is required",
        status : httpStatus.BAD_REQUEST
    },

    Already_Exists : {
        message : "Category already exists, use different",
        status : httpStatus.BAD_REQUEST
    },

    Not_Exists : {
        message : "Category not found",
        status : httpStatus.NOT_FOUND
    },

    Not_There : {
        message : "Category not found (English or Hindi)",
        Status : httpStatus.NOT_FOUND
    },

    Delete_Not_Allowed : {
        message : "Some campaigns or blogs are linked with this category. Deletion not possible",
        status : httpStatus.BAD_REQUEST
    }
}