import { httpStatus } from "../../config/httpStatus.js";
import { prisma } from "../../database/db.js";
import { sponsorError } from "../../errors/sponsor.js";
import { errorHandler } from "../../util/errorHandler.js";
import { logError } from "../../util/logHelper.js";
import { pickLanguage } from "../../util/languageHelper.js";

//! Get all public sponsors
export const getAllSponsors = async (req, res, next) => {
    const { page = 1, limit = 20, search } = req.query;
    const lang = req.lang || "en";
    try {
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        let whereCondition = {};

        if (search && search.trim() !== "") {
            const trimmed = search.trim();
            whereCondition = {
                OR: [
                    { name: { path: ["en"], string_contains: trimmed, mode: "insensitive" } },
                    { name: { path: ["hi"], string_contains: trimmed, mode: "insensitive" } },
                    { category: { path: ["en"], string_contains: trimmed, mode: "insensitive" } },
                    { category: { path: ["hi"], string_contains: trimmed, mode: "insensitive" } },
                    { location: { path: ["en"], string_contains: trimmed, mode: "insensitive" } },
                    { location: { path: ["hi"], string_contains: trimmed, mode: "insensitive" } }
                ]
            };
        }

        const totalSponsors = await prisma.sponsor.count({ where: whereCondition });

        const sponsors = await prisma.sponsor.findMany({
            where: whereCondition,
            skip,
            take: limitNumber,
            orderBy: {
                createdAt: "desc"
            }
        });

        const formatted = sponsors.map((s) => ({
            id: s.id,
            slug: s.slug,
            name: pickLanguage(s.name, lang) || s.name,
            category: pickLanguage(s.category, lang) || s.category,
            location: pickLanguage(s.location, lang) || s.location,
            shortDescription: pickLanguage(s.shortDescription, lang) || s.shortDescription,
            description: pickLanguage(s.description, lang) || s.description,
            website: s.website,
            logo: s.imageUrl ? s.imageUrl.url : null,
            image: s.imageUrl ? s.imageUrl.url : null,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt
        }));

        res.status(httpStatus.OK).json({
            success: true,
            total: totalSponsors,
            totalSponsors,
            page: pageNumber,
            currentPage: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(totalSponsors / limitNumber),
            sponsors: formatted
        });
    } catch (error) {
        logError("Error in web get all sponsors", error);
        next(error);
    }
};

//! Get public sponsor by slug
export const getSponsorBySlug = async (req, res, next) => {
    const { slug } = req.params;
    const lang = req.lang || "en";
    try {
        const sponsor = await prisma.sponsor.findFirst({
            where: {
                OR: [
                    { slug: slug },
                    { id: slug }
                ]
            }
        });

        if (!sponsor) {
            return next(errorHandler(sponsorError.Not_Exists));
        }

        const formatted = {
            id: sponsor.id,
            slug: sponsor.slug,
            name: pickLanguage(sponsor.name, lang) || sponsor.name,
            category: pickLanguage(sponsor.category, lang) || sponsor.category,
            location: pickLanguage(sponsor.location, lang) || sponsor.location,
            shortDescription: pickLanguage(sponsor.shortDescription, lang) || sponsor.shortDescription,
            description: pickLanguage(sponsor.description, lang) || sponsor.description,
            website: sponsor.website,
            logo: sponsor.imageUrl ? sponsor.imageUrl.url : null,
            image: sponsor.imageUrl ? sponsor.imageUrl.url : null,
            createdAt: sponsor.createdAt,
            updatedAt: sponsor.updatedAt
        };

        res.status(httpStatus.OK).json({
            success: true,
            sponsor: formatted,
            ...formatted
        });
    } catch (error) {
        logError("Error in web get sponsor by slug", error);
        next(error);
    }
};
