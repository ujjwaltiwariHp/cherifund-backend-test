import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import {errorHandler} from "./errorHandler.js"
import { httpStatus } from "../config/httpStatus.js"
import { logError } from "./logHelper.js"


cloudinary.config({
    cloud_name: process.env.cloudinary_cloud_name,
    api_key: process.env.cloudinary_api_key,
    api_secret: process.env.cloudinary_api_secret
})

const uploadToCloudinary = async (filePath, folder, next, extraOptions = {}) =>{
    if(!filePath) return next(errorHandler({
        message : "No file uploaded",
        status : httpStatus.BAD_REQUEST
    }))

    try {
        const uploadOptions = {
            folder,
            resource_type: extraOptions.resource_type || "auto",
            ...extraOptions
        }
        const result = await cloudinary.uploader.upload(filePath, uploadOptions)
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
        return result
    } catch (error) {
        logError("cloudinary controller error", error)
        next(error)
    }
}

//! for delete from cloudinary
export const deleteFromCloudinary = async (publicId, next, resourceType = "image") =>{
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
    } catch (error) {
        logError("Cloudinary delete error", error)
        if (typeof next === "function") next(error)
    }
}

export default uploadToCloudinary