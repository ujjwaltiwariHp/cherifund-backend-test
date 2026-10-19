import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { galleryError } from "../../errors/gallery.js"
import uploadToCloudinary, { deleteFromCloudinary } from "../../util/cloudinary.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"

//! Add gallery image
export const addGalleryImage = async (req, res, next) => {
    const { altText } = req.body
    try {
        if (!req.file)
            return next(errorHandler(galleryError.Image_Required))

        const result = await uploadToCloudinary(req.file.path, "Gallery", next)

        const imageObj = {
            url: result.secure_url,
            public_id: result.public_id
        }

        const galleryImage = await prisma.galleryImage.create({
            data: {
                imageUrl: imageObj,
                altText: altText || null
            }
        })

        res.status(httpStatus.CREATED).json({
            msg: "Gallery image added successfully",
            galleryImage
        })
    } catch (error) {
        logError("Error in add gallery image", error)
        next(error)
    }
}

//! Get all gallery images (admin)
export const getAllGalleryImages = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        const total = await prisma.galleryImage.count()

        const images = await prisma.galleryImage.findMany({
            skip,
            take: limitNumber,
            orderBy: { createdAt: "desc" }
        })

        const formatted = images.map(img => ({
            id: img.id,
            imageUrl: img.imageUrl?.url || null,
            public_id: img.imageUrl?.public_id || null,
            altText: img.altText,
            createdAt: img.createdAt
        }))

        res.status(httpStatus.OK).json({
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
            images: formatted
        })
    } catch (error) {
        logError("Error in get all gallery images (admin)", error)
        next(error)
    }
}

//! Delete gallery image
export const deleteGalleryImage = async (req, res, next) => {
    const { id } = req.params
    try {
        const existing = await prisma.galleryImage.findUnique({
            where: { id }
        })

        if (!existing)
            return next(errorHandler(galleryError.Not_Exist))

        if (existing.imageUrl?.public_id) {
            await deleteFromCloudinary(existing.imageUrl.public_id, next)
        }

        await prisma.galleryImage.delete({ where: { id } })

        res.status(httpStatus.OK).json({
            msg: "Gallery image deleted successfully"
        })
    } catch (error) {
        logError("Error in delete gallery image", error)
        next(error)
    }
}
