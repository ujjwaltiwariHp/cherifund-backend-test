import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { campaignError } from "../../errors/campaign.js"
import { errorHandler } from "../../util/errorHandler.js"
import { pickLanguage } from "../../util/languageHelper.js"
import { logError } from "../../util/logHelper.js"

//! get all campaign
export const getAllCampaign = async (req, res, next) =>{
    const {page = 1 , limit = 10, search} = req.query
    const lang = req.lang
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        let whereCondition = {}

        if(search && search.trim !=="" && search != "All"){
            whereCondition = {
        OR: [
          { title: { path: ["en"], string_contains: search, mode: "insensitive" } },
          { keyPoints: { path: ["en"], array_contains: [search] } },
          { title: { path: ["hi"], string_contains: search, mode: "insensitive" } },
          { keyPoints: { path: ["hi"], array_contains: [search] } },
        ],
      };
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

            // Determine language based on match (Hindi vs English)
      const isHindiMatch =
        c.title?.hi?.includes(search) ||
        (Array.isArray(c.keyPoints?.hi) && c.keyPoints.hi.some((k) => k.includes(search)));

      let FinalLang = search ? (isHindiMatch ? "hi" : "en") : lang;

      if(search == "All"){
        FinalLang = lang
      }     

            const donationPercentage = c.goalAmount > 0 ? Math.ceil(Math.min((c.raisedAmount / c.goalAmount) * 100, 100)) : 0

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
            title : pickLanguage(campaign.title, lang),
            category : campaign.category ? pickLanguage(campaign.category.name, lang) : null,
            description : pickLanguage(campaign.description, lang),
            summary : pickLanguage(campaign.summary,lang),
            keyPoints : pickLanguage(campaign.keyPoints,lang),
            images : campaign.imageUrl.images.map(img => img.url),
            goalAmount : campaign.goalAmount,
            raisedAmount : campaign.raisedAmount,
            donationPercentage,
            location : pickLanguage(campaign.location, lang),
            status : campaign.status,
            createdAt : campaign.createdAt
        }

        res.status(httpStatus.OK).json(formatted)

    } catch (error) {
        logError("Error in get campaign by Id", error)
        next(error)
    }
}