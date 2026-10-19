import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { pickLanguage } from "../../util/languageHelper.js"
import { logError } from "../../util/logHelper.js"

//! get all banner
export const getAllBanner = async (req, res, next) =>{
    const {page = 1, limit = 10, pageName} = req.query
    const lang = req.lang
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        let whereCondition = {}
        if(pageName) {
            whereCondition.pageName = pageName;
        }

        const totalBanners = await prisma.banner.count({where: whereCondition})

        const banners = await prisma.banner.findMany({
            where: whereCondition,
            skip,
            take : limitNumber,
            orderBy : {
                priority : "asc"
            }
        })

        const formatted = banners.map(banner =>({
            id : banner.id,
            pageName: banner.pageName,
            title :pickLanguage(banner.title, lang),
            subtitle :pickLanguage(banner.subtitle, lang),
            description :pickLanguage(banner.description, lang),
            priority : banner.priority,
            image : banner.imageUrl ? banner.imageUrl.url : null
        }))

        res.status(httpStatus.OK).json({
            total : totalBanners,
            page : pageNumber,
            limit : limitNumber,
            totalPages : Math.ceil(totalBanners / limitNumber),
            banners : formatted
        })
    } catch (error) {
        logError("Error in get all banner", error)
        next(error)
    }
}