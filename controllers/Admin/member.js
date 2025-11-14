import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { memberError } from "../../errors/member.js"
import uploadToCloudinary, { deleteFromCloudinary } from "../../util/cloudinary.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"
import { pickLanguage } from "../../util/languageHelper.js"

//! add member
export const addMember = async (req, res, next) =>{
    let {name,  position, description, about, title, keyPoints = [], facebookUrl, instagramUrl, twitterUrl, linkedInUrl} = req.body
    try {
        name = typeof name === "string" ? JSON.parse(name) : name;
        position = typeof position === "string" ? JSON.parse(position) : position;
        description = typeof description === "string" ? JSON.parse(description) : description;
        about = about ? (typeof about === "string" ? JSON.parse(about) : about) : null;
        title = title ? (typeof title === "string" ? JSON.parse(title) : title) : null;

        const parsedKeyPoints = Array.isArray(keyPoints) ? keyPoints : keyPoints ? JSON.parse(keyPoints) : []
        if(!name || !position || !description || parsedKeyPoints.length == 0)
            return next(errorHandler(memberError.Required_Fields))

       if(!req.file)
        return next(errorHandler(memberError.Image_Required))

       const result = await uploadToCloudinary(req.file.path, "Members", next)

       const imageObj = {
        url : result.secure_url,
        public_id : result.public_id
       }

       const member = await prisma.member.create({
        data : {
            name,
            position,
            description,
            about,
            title,
            keyPoints : parsedKeyPoints,
            imageUrl : imageObj,
            facebookUrl,
            instagramUrl,
            twitterUrl,
            linkedInUrl,
        }
       })

       res.status(httpStatus.CREATED).json({
        msg : "Member added successfully",
        member
       })
    } catch (error) {
        logError("Error in add member", error)
        next(error)
    }
}

//! get all member
export const getAllMember = async (req, res, next) =>{
    const {page = 1 , limit = 10, name, position} = req.query
    const lang = req.lang
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        let whereCondition = {}


        if(name && name.trim() != ""){
            whereCondition = {
                OR : [
                    {name : {path : ['en'], string_contains : name, mode : "insensitive"}},
                    {name : {path : ['hi'], string_contains : name, mode : "insensitive"}}
                ]
            }
        }

        if(position && position.trim() != ""){
            whereCondition = {
                OR : [
                    {position : {path : ['en'], string_contains : position, mode : "insensitive"}},
                    {position : {path : ['hi'], string_contains : position, mode : "insensitive"}}
                ]
            }
        }

        //! get total members
        const totalMembers = await prisma.member.count({where : whereCondition})

        //! get paginated members
        const members = await prisma.member.findMany({
            where : whereCondition,
            skip,
            take : limitNumber,
            orderBy : {
                createdAt : "desc"
            }
        })

        const formatted = members.map(m =>{

            const isHindiMatch =
                m.name?.hi?.includes(name) ||
                m.position?.hi?.includes(position);

            const finalLang = (name || position) ? (isHindiMatch ? "hi" : "en") : lang;

            return {
            id : m.id,
            name :  pickLanguage(m.name, finalLang),
            image : m.imageUrl ? m.imageUrl.url : null,
            position : pickLanguage(m.position, finalLang),
            description : pickLanguage(m.description, finalLang),
            about : pickLanguage(m.about, finalLang),
            title : pickLanguage(m.title, finalLang),
            keyPoints : pickLanguage(m.keyPoints, finalLang),
            facebookUrl : m.facebookUrl,
            instagramUrl : m.instagramUrl,
            twitterUrl : m.twitterUrl,
            linkedInUrl : m.linkedInUrl
        }})

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
            name : existingMember.name,
            image : existingMember.imageUrl ? existingMember.imageUrl.url : null,
            position : existingMember.position,
            description :existingMember.description,
            about : existingMember.about,
            title : existingMember.title,
            keyPoints : existingMember.keyPoints,
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

//! update member
export const updateMember = async (req, res, next) =>{
    const {memberId} = req.params
    const {name,  position, description, about, title, keyPoints = [], facebookUrl, instagramUrl, twitterUrl, linkedInUrl} = req.body
    try {
        const existingMember = await prisma.member.findUnique({
            where : {
                id : memberId
            }
        })
        if(!existingMember)
            return next(errorHandler(memberError.Not_Exists))

        let imageObj = existingMember.imageUrl || null

        if(req.file){
            //! delete form cloudinary
            if(imageObj && imageObj.public_id){
                await deleteFromCloudinary(imageObj.public_id, next)
            }
            //! uplaod new image
            const result = await uploadToCloudinary(req.file.path, "Members", next)
            imageObj = {
                url : result.secure_url,
                public_id : result.public_id
            }
    }

        let parsedKeyPoints = Array.isArray(keyPoints)
          ? (keyPoints.length > 0 ? keyPoints : existingMember.keyPoints)
          : (keyPoints ? JSON.parse(keyPoints) || existingMember.keyPoints : existingMember.keyPoints)


          //! Parse JSON fields if sent as string (form-data case)
                const parseJsonField = (field, existing) => {
                if (!field) return existing;
                if (typeof field === "string") {
                    try {
                    return JSON.parse(field);
                    } catch {
                    return existing; 
                    }
                }
                return field;
                };

          await prisma.member.update({
            where : {
                id : memberId
            },
            data : {
                name : parseJsonField(name, existingMember.name),
                position : parseJsonField(position, existingMember.position),
                description : parseJsonField(description, existingMember.description),
                imageUrl : imageObj,
                about : parseJsonField(about, existingMember.about),
                title : parseJsonField(title, existingMember.title),
                keyPoints : parsedKeyPoints,
                facebookUrl : facebookUrl ?? existingMember.facebookUrl,
                instagramUrl : instagramUrl ?? existingMember.instagramUrl,
                twitterUrl : twitterUrl ?? existingMember.twitterUrl,
                linkedInUrl: linkedInUrl ?? existingMember.linkedInUrl
            }
          })

          res.status(httpStatus.OK).json({
            msg : "Member updated successfully"
          })    
 
    } catch (error) {
        logError("Error in update member", error)
        next(error)
    }
}

//! delete member
export const deleteMember = async (req, res, next) => {
    const {memberId} = req.params
    try {
        const existingMember = await prisma.member.findUnique({
            where : {
                id : memberId
            }
        })
        if(!existingMember)
            return next(errorHandler(memberError.Not_Exists))

        if(existingMember && existingMember.imageUrl.public_id){
            await deleteFromCloudinary(existingMember.imageUrl.public_id, next)
        }

        await prisma.member.delete({
            where : {
                id : memberId
            }
        })

        res.status(httpStatus.OK).json({
            msg : "Member deleted successfully"
        })

    } catch (error) {
        logError("Error in delete member", error)
        next(error)
    }
}