import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { campaignError } from "../../errors/campaign.js"
import { categoryError } from "../../errors/category.js"
import uploadToCloudinary, { deleteFromCloudinary } from "../../util/cloudinary.js"
import { errorHandler } from "../../util/errorHandler.js"
import { pickLanguage } from "../../util/languageHelper.js"
import { logError } from "../../util/logHelper.js"

//!add-campaign
export const addCampaign = async (req, res, next) =>{
    let {title, category, description, goalAmount, summary, keyPoints = [], location} = req.body
    try {
        title = typeof title === "string" ? JSON.parse(title) : title;
        description = typeof description === "string" ? JSON.parse(description) : description;
        summary = typeof summary === "string" ? JSON.parse(summary) : summary;
        category = typeof category === "string" ? JSON.parse(category) : category
        location = typeof location === "string" ? JSON.parse(location) : location

        const parsedKeyPoints = Array.isArray(keyPoints) ? keyPoints : keyPoints ?   JSON.parse(keyPoints) : []

        if(!title || !category || !description || !goalAmount || !summary || parsedKeyPoints.length == 0 || !location) 
            return next(errorHandler(campaignError.Fields_Required))

        if(req.files.length == 0)
            return next(errorHandler(campaignError.Image_Required))

        const existingCategory = await prisma.category.findFirst({
            where : {
                AND :[
                    {name : {path : ['en'], equals : category.en}},
                    {name : {path : ['hi'], equals : category.hi}}
                ]
            }
        })

        if(!existingCategory)
            return next(errorHandler(categoryError.Not_There))

        let images = [];
        if (req.files && req.files.length > 0) {
          for (const file of req.files) {
            const result = await uploadToCloudinary(file.path, "Campaigns", next);
            images.push({
                url : result.secure_url,
                public_id : result.public_id
            });
          }
        }

        const campaign = await prisma.campaigns.create({
            data : {
                title,
                categoryId : existingCategory.id,
                description,
                summary,
                keyPoints : parsedKeyPoints,
                imageUrl : {images},
                goalAmount : parseFloat(goalAmount),
                status : "Active",
                location
            },
            include : {
                category : true
            }
        })

        res.status(httpStatus.CREATED).json({
            msg : "Campaign created successfully",
            campaign
        })
    } catch (error) {
        logError("Error in add campaign", error)
        next(error)
    }
}

//! get All Campaigns
export const getAllCampaign = async (req, res, next) =>{
    const {page = 1 , limit = 10, title, category, status} = req.query
    const lang = req.lang
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        let whereCondition = {}

        if(status && status.trim !== ""){

            const searchLower = status.toLowerCase()
             let matchedStatus =  null;
                if (searchLower === "active") matchedStatus = "Active";
                else if (searchLower === "completed") matchedStatus = "Completed";
                else if (searchLower === "inactive") matchedStatus = "Inactive";

                if (matchedStatus) {
                whereCondition = { status: matchedStatus };
                }
        }
        else if(category && category.trim() != ""){
            const matchedCategory = await prisma.category.findFirst({
                where : {
                    OR : [
                        {name : {path : ['en'], string_contains : category, mode : "insensitive"}},
                        {name : {path : ['hi'], string_contains : category, mode : "insensitive"}}
                    ]
                }
            })
            if(matchedCategory){
                whereCondition = { categoryId : matchedCategory.id}
            }else {
                return res.status(httpStatus.OK).json({
                    total: 0,
                    page: pageNumber,
                    limit: limitNumber,
                    totalPages: 0,
                    campaigns: [],
                    });
            }
        }
        else if(title && title.trim() != ""){
            whereCondition = {
                OR : [
                    {title : {path : ['en'], string_contains : title, mode : "insensitive"}},
                    {title : {path : ['hi'], string_contains : title, mode : "insensitive"}}
                ]
            }
        }

        else {
            whereCondition = {}
        }

        //! get total count
        const totalCampaigns = await prisma.campaigns.count({where : whereCondition})

        //! get paginated campaigns
        const campaigns = await prisma.campaigns.findMany({
            where : whereCondition,
            skip,
            take : limitNumber,
            orderBy : {
                createdAt : "desc"
            },
            include : {
                category : true
            }
        })

        const formatted = campaigns.map(c => {
            const donationPercentage = c.goalAmount > 0 ? Math.ceil(Math.min((c.raisedAmount / c.goalAmount) * 100, 100)) : 0

            const isHindiMatch = c.title?.hi?.includes(title) || 
                            c.status?.hi?.includes(status) ||
                            c.category?.name?.hi?.includes(category)

                            const FinalLang = (status || title || category) ? (isHindiMatch ? "hi" : "en") : lang

            return {
                id : c.id,
                title : pickLanguage(c.title, FinalLang),
                category : c.category ? pickLanguage(c.category.name, FinalLang) : null,
                description : pickLanguage(c.description,FinalLang),
                images : c.imageUrl.images.map(img => img.url),
                goalAmount : c.goalAmount,
                raisedAmount : c.raisedAmount,
                donationPercentage,
                location : pickLanguage(c.location, FinalLang),
                status  : c.status,
                createdAt : c.createdAt
          }
        })
        res.status(httpStatus.OK).json({
            total : totalCampaigns,
            page : pageNumber,
            limit : limitNumber,
            totalPages : Math.ceil(totalCampaigns / limitNumber),
            campaigns : formatted
        })
    } catch (error) {
        logError("Error in get all campaign", error)
        next(error)
    }
}

//! get campaign by id
export const getCampaignById = async (req, res, next) =>{
    const {campaignId} = req.params
    const lang = req.lang
    try {
        if(!campaignId) 
            return next(errorHandler(campaignError.Campaign_Id_Required))

        const campaign = await prisma.campaigns.findUnique({
            where : {
                id : campaignId
            },
            include : {
                category : true
            }
        })

        if(!campaign)
            return next(errorHandler(campaignError.Campaign_Not_Exists))

        const donationPercentage = campaign.goalAmount > 0 ? Math.ceil(Math.min((campaign.raisedAmount / campaign.goalAmount) *100 , 100)) : 0

        const formatted = {
            id : campaign.id,
            title : campaign.title,
            category : campaign.category ? campaign.category.name : null,
            description : campaign.description,
            summary : campaign.summary,
            keyPoints : campaign.keyPoints,
            images : campaign.imageUrl.images.map(img => img.url),
            goalAmount : campaign.goalAmount,
            raisedAmount : campaign.raisedAmount,
            donationPercentage,
            location : campaign.location,
            status : campaign.status,
            createdAt : campaign.createdAt
        }

        res.status(httpStatus.OK).json(formatted)

    } catch (error) {
        logError("Error in get campaign by Id", error)
        next(error)
    }
} 

//! update campaign
export const updateCampaign = async (req, res, next) =>{
    const {campaignId} = req.params
    let {title, category, description, goalAmount, summary, keyPoints = [], location, status , existingImages = []} = req.body
    try {
        if(!campaignId)
            return next(errorHandler(campaignError.Campaign_Id_Required))

        const existingCampaign = await prisma.campaigns.findUnique({
            where : {
                id : campaignId
            },
            include : {
                category : true
            }
        })
        if(!existingCampaign)
            return next(errorHandler(campaignError.Campaign_Not_Exists))

        let imageObj = existingCampaign.imageUrl || {images : []}

        const keptImages = []
        const toDelete = []

        //! delete unwanted image from db
        for(const img of imageObj.images){
            if(existingImages.includes(img.url)){
                keptImages.push(img)
            }
        else {
            toDelete.push(img)
        }
    }

    //! delete unwanted image from cloudinaary
       for(const img of toDelete){
        await deleteFromCloudinary(img.public_id, next)
       }


        if (req.files && req.files.length > 0) {
          for (const file of req.files) {
            const result = await uploadToCloudinary(file.path, "Campaigns", next);
            keptImages.push({
                url : result.secure_url,
                public_id : result.public_id
            });
          }
        }

        imageObj = { images : keptImages}

        title = typeof title === "string" ? JSON.parse(title) : title;
        description = typeof description === "string" ? JSON.parse(description) : description;
        summary = typeof summary === "string" ? JSON.parse(summary) : summary;
        category = typeof category === "string" ? JSON.parse(category) : category
        location = typeof location === "string" ? JSON.parse(location) : location

        let parsedKeyPoints = Array.isArray(keyPoints)
          ? (keyPoints.length > 0 ? keyPoints : existingCampaign.keyPoints)
          : (keyPoints ? JSON.parse(keyPoints) || existingCampaign.keyPoints : existingCampaign.keyPoints);

        //! handle category update
        let categoryId = existingCampaign.categoryId
        if(category){
            const existingCategory = await prisma.category.findFirst({
                where : {
                    AND : [
                        {name : {path : ['en'], equals : category.en}},
                        {name : {path : ['hi'], equals : category.hi}}
                    ]
                }
            })
            if(!existingCategory)
                return next(errorHandler(categoryError.Not_There))

            categoryId = existingCategory.id
        }

        await prisma.campaigns.update({
            where : {
                id : campaignId
            },
            data : {
                title : title ?? existingCampaign.title,
                categoryId,
                description : description ?? existingCampaign.description,
                summary : summary ?? existingCampaign.summary,
                keyPoints : parsedKeyPoints,
                imageUrl :imageObj,
                goalAmount : goalAmount ? parseFloat(goalAmount) : existingCampaign.goalAmount,
                location : location ?? existingCampaign.location,
                status : status ?? existingCampaign.status
            }
        })

        res.status(httpStatus.OK).json({
            msg : "Campaign updated successfully"
        })


    } catch (error) {
        logError("Error in update campaign", error)        
        next(error)
    }
}

//! delete Campaign
export const deleteCampaign = async (req, res, next) =>{
    const {campaignId} = req.params
    try {
        if(!campaignId)
            return next(errorHandler(campaignError.Campaign_Id_Required))

        const existingCampaign = await prisma.campaigns.findUnique({
            where : {
                id : campaignId
            }
        })

        if(!existingCampaign)
            return next(errorHandler(campaignError.Campaign_Not_Exists))

        //!delete images from cloudinary
        const imageObj = existingCampaign.imageUrl || {images : []}
        if(imageObj.images && imageObj.images.length > 0){
            for (const img of imageObj.images){
                await deleteFromCloudinary(img.public_id, next)
            }
        }

        await prisma.campaigns.delete({
            where : {
                id : campaignId
            }
        })
        res.status(httpStatus.OK).json({
            msg : "Campaign deleted successfully"
        })
    } catch (error) {
        logError("Error in delete campaign", error)
        next(error)
    }
}
