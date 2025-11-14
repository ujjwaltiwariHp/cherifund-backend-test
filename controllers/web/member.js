import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { memberError } from "../../errors/member.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"
import { pickLanguage } from "../../util/languageHelper.js"

//! get all member
export const getAllMember = async (req, res, next) =>{
    const {page = 1 , limit = 10} = req.query
    const lang = req.lang
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        //! get total members
        const totalMembers = await prisma.member.count()

        //! get paginated members
        const members = await prisma.member.findMany({
            skip,
            take : limitNumber,
            orderBy : {
                createdAt : "desc"
            }
        })

        const formatted = members.map(m =>({
            id : m.id,
            name :  pickLanguage(m.name, lang),
            image : m.imageUrl ? m.imageUrl.url : null,
            position : pickLanguage(m.position, lang),
            description : pickLanguage(m.description, lang),
            about : pickLanguage(m.about, lang),
            title : pickLanguage(m.title, lang),
            keyPoints : pickLanguage(m.keyPoints, lang),
            facebookUrl : m.facebookUrl,
            instagramUrl : m.instagramUrl,
            twitterUrl : m.twitterUrl,
            linkedInUrl : m.linkedInUrl
        }))

        res.status(httpStatus.OK).json({
            total : totalMembers,
            page : pageNumber,
            limit : limitNumber,
            totalPages : Math.ceil(totalMembers / limitNumber),
            members : formatted
        })

    } catch (error) {
        logError("Error in get all member", error)
        next(error)
    }
}

//! get member by Id
export const getMemberById = async (req, res, next) =>{
    const {memberId} = req.params
    const lang = req.lang
    try {
        const existingMember = await prisma.member.findUnique({
            where : {
                id : memberId
            }
        })

        if(!existingMember)
            return next(errorHandler(memberError.Not_Exists))

        const formatted = {
            id : existingMember.id,
            name : pickLanguage(existingMember.name, lang),
            image : existingMember.imageUrl ? existingMember.imageUrl.url : null,
            position : pickLanguage(existingMember.position, lang),
            description :pickLanguage(existingMember.description,lang),
            about : pickLanguage(existingMember.about,lang),
            title : pickLanguage(existingMember.title, lang),
            keyPoints : pickLanguage(existingMember.keyPoints, lang),
            facebookUrl : existingMember.facebookUrl,
            instagramUrl : existingMember.instagramUrl,
            twitterUrl : existingMember.twitterUrl,
            linkedInUrl : existingMember.linkedInUrl
        }

        res.status(httpStatus.OK).json(formatted)
    } catch (error) {
        logError("Error in get member by Id", error)
        next(error)
    }
}