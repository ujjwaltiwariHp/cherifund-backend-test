import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { logError } from "../../util/logHelper.js"

//! Get all gallery images (public — no auth)
export const getAllGalleryImages = async (req, res, next) => {
    const { page = 1, limit = 100 } = req.query
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
            altText: img.altText
        }))

        res.status(httpStatus.OK).json({
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
            images: formatted
        })
    } catch (error) {
        logError("Error in get all gallery images (web)", error)
        next(error)
    }
}
