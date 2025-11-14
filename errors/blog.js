import { httpStatus } from "../config/httpStatus.js";

export const blogError = {
    Required_Fields : {
        message : "Missing required fields",
        status : httpStatus.BAD_REQUEST
    },
    
    Blog_Not_Exists : {
        message : "Blog not found",
        status : httpStatus.NOT_FOUND
    }
}