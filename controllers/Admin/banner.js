import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { bannerError } from "../../errors/banner.js"
import uploadToCloudinary, { deleteFromCloudinary } from "../../util/cloudinary.js"
import { errorHandler } from "../../util/errorHandler.js"
import { pickLanguage } from "../../util/languageHelper.js"
import { logError } from "../../util/logHelper.js"

const ALLOWED_PAGES = [
    "Home", "About Us", "Campaign", "Donate Us", 
    "Become Volunteer", "Events", "Team", "Sponsors", 
    "Blog", "Contact Us"
];

//! add banner
export const addBanner = async (req, res, next) =>{
   const {title, subtitle, priority, pageName, description} = req.body
    try {
        if(!pageName || !ALLOWED_PAGES.includes(pageName)) {
            return next(errorHandler(bannerError.PageName_Invalid))
        }

       const parsedTitle = typeof title === "string" ? JSON.parse(title) : title;
       const parsedSubtitle = typeof subtitle === "string" ? JSON.parse(subtitle) : subtitle;
       const parsedDescription = description ? (typeof description === "string" ? JSON.parse(description) : description) : null;

        if(!title || !subtitle || !priority)
            return next(errorHandler(bannerError.Fields_Required))

        const countWords = (text) => text ? text.trim().split(/\s+/).length : 0;

        if(countWords(parsedTitle.en) > 60 || countWords(parsedTitle.hi) > 60)
            return next(errorHandler(bannerError.Title_Length))

        if(countWords(parsedSubtitle.en) > 60 || countWords(parsedSubtitle.hi) > 60)
            return next(errorHandler(bannerError.Subtitle_Length))

        if(parsedDescription) {
            if(countWords(parsedDescription.en) > 60 || countWords(parsedDescription.hi) > 60)
                return next(errorHandler(bannerError.Description_Length))
        }
        
        const parsedPriority = parseInt(priority)

        if(!req.file)
            return next(errorHandler(bannerError.Image_Required))

        if(parsedPriority < 1 || parsedPriority > 10)
            return next(errorHandler(bannerError.Priority_Number))

        const totalBanners = await prisma.banner.count({ where: { pageName } })

        if(totalBanners >= 10)
            return next(errorHandler(bannerError.Limit_Exceed))

        //! get all banner priority for this page
        const allBanners = await prisma.banner.findMany({
            where: { pageName },
            select : {id : true, priority : true},
            orderBy : {priority : "asc"}
        })

        const usedPriority = allBanners.map(b => b.priority)
        const availablePriority = Array.from({length : 10}, (_, i) => i + 1).filter(num => !usedPriority.includes(num))

        //!check if requested priority already taken
        const existingPriority = allBanners.find( b => b.priority === parsedPriority)

        if(existingPriority){            
            //! find the nearest available priority
            const nearestEmpty = availablePriority.reduce((prev, curr) =>{
                return Math.abs(curr - parsedPriority) < Math.abs(prev - parsedPriority) ? curr : prev
            })

            //! shift the existing banner to nearest empty slot
            await prisma.banner.update({
                where : {id : existingPriority.id},
                data : {priority :  nearestEmpty}
            })
        }
        const result = await uploadToCloudinary(req.file.path, "Banner", next)

        const imageObj = {
            url : result.secure_url,
            public_id : result.public_id
        }

        const banner = await prisma.banner.create({
            data : {
                pageName,
                title : parsedTitle,
                subtitle : parsedSubtitle,
                description: parsedDescription,
                priority : parsedPriority,
                imageUrl : imageObj
            }
        })

        res.status(httpStatus.CREATED).json({
            msg : "Banner created successfully",
            banner
        })
    } catch (error) {
        logError("Error in add banner", error)
        next(error)
    }
}

//! get all banner
export const getAllBanner = async (req, res, next) =>{
    const {page = 1, limit = 10, title, subtitle, priority, pageName} = req.query
    const lang = req.lang
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        

        let whereCondition = {}

        if(pageName){
            whereCondition.pageName = pageName;
        }

        if(priority && !isNaN(priority)){
            whereCondition.priority = parseInt(priority);
        }
        if(title && title.trim() != ""){
            whereCondition.OR = [
                ...(whereCondition.OR || []),
                { title: { path: ["en"], string_contains: title, mode: "insensitive" } },
                { title: { path: ["hi"], string_contains: title, mode: "insensitive" } }
            ]
        }
        if(subtitle && subtitle.trim() != ""){
            whereCondition.OR = [
                ...(whereCondition.OR || []),
                { subtitle: { path: ["en"], string_contains: subtitle, mode: "insensitive" } },
                { subtitle: { path: ["hi"], string_contains: subtitle, mode: "insensitive" } },
            ];
        }

        const totalBanners = await prisma.banner.count({where : whereCondition})

        const banners = await prisma.banner.findMany({
            where : whereCondition,
            skip,
            take : limitNumber,
            orderBy : {
                priority : "asc"
            }
        })

        const formatted = banners.map(banner =>{

            const isHindiMatch = banner.title?.hi?.includes(title) || 
                            banner.subtitle?.hi?.includes(subtitle)
        const FinalLang =(title || subtitle) ?  isHindiMatch ? "hi" : "en" : lang;
        return {

            id : banner.id,
            pageName: banner.pageName,
            title :pickLanguage(banner.title, FinalLang),
            subtitle :pickLanguage(banner.subtitle, FinalLang),
            description: pickLanguage(banner.description, FinalLang),
            priority : banner.priority,
            image : banner.imageUrl ? banner.imageUrl.url : null
        }
        })

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

//! get banner by Id
export const getBannerById = async (req, res, next) =>{
    const {bannerId} = req.params
    const lang = req.lang
    try {
        const existingBanner = await prisma.banner.findUnique({
            where : {
                id : bannerId
            }
        })

        if(!existingBanner)
            return next(errorHandler(bannerError.Not_Exist))

        const formatted = {
            id : existingBanner.id,
            pageName: existingBanner.pageName,
            title : existingBanner.title,
            subtitle : existingBanner.subtitle,
            description: existingBanner.description,
            priority : existingBanner.priority,            
            image : existingBanner.imageUrl ? existingBanner.imageUrl.url : null
        }

        res.status(httpStatus.OK).json(formatted)
    } catch (error) {
        logError("Error in get banner by Id", error)
        next(error)
    }
}

//! update banner
export const updateBanner = async (req, res, next)  =>{
    const {bannerId} = req.params
    const {title, subtitle, priority, pageName, description} = req.body
    try {
        const existingBanner = await prisma.banner.findUnique({
            where : {
                id : bannerId
            }
        })
        if(!existingBanner)
            return next(errorHandler(bannerError.Not_Exist))

        const targetPageName = pageName || existingBanner.pageName;
        if(pageName && !ALLOWED_PAGES.includes(pageName)) {
            return next(errorHandler(bannerError.PageName_Invalid))
        }

       const parsedTitle = title ? (typeof title === "string" ? JSON.parse(title) : title) : existingBanner.title
       const parsedSubtitle = subtitle ? (typeof subtitle === "string" ? JSON.parse(subtitle) : subtitle) : existingBanner.subtitle 
       const parsedDescription = description ? (typeof description === "string" ? JSON.parse(description) : description) : existingBanner.description

        const countWords = (text) => text ? text.trim().split(/\s+/).length : 0;

        if(countWords(parsedTitle.en) > 60 || countWords(parsedTitle.hi) > 60)
            return next(errorHandler(bannerError.Title_Length))

        if(countWords(parsedSubtitle.en) > 60 || countWords(parsedSubtitle.hi) > 60)
            return next(errorHandler(bannerError.Subtitle_Length))

        if(parsedDescription) {
            if(countWords(parsedDescription.en) > 60 || countWords(parsedDescription.hi) > 60)
                return next(errorHandler(bannerError.Description_Length))
        }

        const parsedPriority = priority !== undefined ? parseInt(priority) : existingBanner.priority


        if(parsedPriority < 1 || parsedPriority > 10)
            return next(errorHandler(bannerError.Priority_Number))

        if(parsedPriority !== existingBanner.priority || targetPageName !== existingBanner.pageName){
            const targetBanner = await prisma.banner.findUnique({
                where : {
                    pageName_priority: {
                        pageName: targetPageName,
                        priority: parsedPriority
                    }
                }
            })
            if(targetBanner && targetBanner.id !== existingBanner.id){
                await prisma.banner.update({
                    where : {id : targetBanner.id},
                    data : {priority : 0}
                })

             await prisma.banner.update({
                where : {id : existingBanner.id},
                data : {priority : parsedPriority, pageName: targetPageName}
             })   

             await prisma.banner.update({
                where : {id : targetBanner.id},
                data : {priority : existingBanner.priority}
             })
            }
            else{
                await prisma.banner.update({
                    where : {id : existingBanner.id},
                    data : {priority : parsedPriority, pageName: targetPageName}
                })
            }
        }

        let imageObj = existingBanner.imageUrl || null

        if(req.file){
            //! delete from cloudinary
            if(imageObj && imageObj.public_id){
                await deleteFromCloudinary(imageObj.public_id, next)
            }
            //! upload new image
            const result = await uploadToCloudinary(req.file.path, "Banner", next)
            imageObj = {
                url : result.secure_url,
                public_id : result.public_id
            }
        }

        await prisma.banner.update({
            where : {
                id : bannerId
            },
            data : {
                title : parsedTitle,
                subtitle : parsedSubtitle,
                description : parsedDescription,
                pageName: targetPageName,
                imageUrl : imageObj
            }
        })

        res.status(httpStatus.OK).json({
            msg : "Banner updated successfully"
        })
    } catch (error) {
        logError("Error in update banner", error)
        next(error)
    }
}

//! delete banner
export const deleteBanner = async (req, res, next) =>{
    const {bannerId} = req.params
    try {
        const existingBanner = await prisma.banner.findUnique({
            where : {
                id : bannerId
            }
        })
        if(!existingBanner)
            return next(errorHandler(bannerError.Not_Exist))

        if(existingBanner && existingBanner.imageUrl.public_id){
            await deleteFromCloudinary(existingBanner.imageUrl.public_id, next)
        }

        await prisma.banner.delete({
            where : {
                id : bannerId
            }
        })

        //! Check if any banners have priority greater than the deleted one
        const bannerToShiftFirst = await prisma.banner.findFirst({
            where : {
                pageName: existingBanner.pageName,
                priority : {
                    gt : existingBanner.priority
                }
            }
        })
        if(bannerToShiftFirst) {
            const bannerToShift = await prisma.banner.findMany({
                where : {
                    pageName: existingBanner.pageName,
                    priority : {
                        gt : existingBanner.priority
                    }
                },
                orderBy : { priority : 'asc'}
            })

            for(const banner of bannerToShift) {
                await prisma.banner.update({
                    where : {id : banner.id},
                    data : {priority : banner.priority - 1}
                })
            }
        }

        res.status(httpStatus.OK).json({
            msg : "Banner deleted successfully.."
        })
    } catch (error) {
        logError("Error in delete banner", error)
        next(error)
    }
}
