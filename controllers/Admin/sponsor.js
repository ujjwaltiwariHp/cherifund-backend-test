import { httpStatus } from "../../config/httpStatus.js";
import { prisma } from "../../database/db.js";
import { sponsorError } from "../../errors/sponsor.js";
import uploadToCloudinary, { deleteFromCloudinary } from "../../util/cloudinary.js";
import { errorHandler } from "../../util/errorHandler.js";
import { logError } from "../../util/logHelper.js";
import { generateUniqueSponsorSlug } from "../../util/slugHelper.js";

const parseJsonField = (field, fallback = null) => {
    if (!field) return fallback;
    if (typeof field === "string") {
        try {
            return JSON.parse(field);
        } catch {
            return field;
        }
    }
    return field;
};

//! Add Sponsor
export const addSponsor = async (req, res, next) => {
    let { name, category, location, shortDescription, description, website } = req.body;
    try {
        const parsedName = parseJsonField(name);
        const parsedCategory = parseJsonField(category);
        const parsedLocation = parseJsonField(location, { en: "", hi: "" });
        const parsedShortDescription = parseJsonField(shortDescription);
        const parsedDescription = parseJsonField(description);

        if (!parsedName || !parsedCategory || !parsedShortDescription || !parsedDescription) {
            return next(errorHandler(sponsorError.Required_Fields));
        }

        const uploadedFile = req.file || (req.files && (req.files.logo?.[0] || req.files.image?.[0]));
        if (!uploadedFile) {
            return next(errorHandler(sponsorError.Image_Required));
        }

        const uploadResult = await uploadToCloudinary(uploadedFile.path, "Sponsors", next);
        const imageObj = {
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id
        };

        const englishName = typeof parsedName === "object" ? (parsedName.en || parsedName.hi) : parsedName;
        const slug = await generateUniqueSponsorSlug(englishName);

        const newSponsor = await prisma.sponsor.create({
            data: {
                slug,
                name: parsedName,
                category: parsedCategory,
                location: parsedLocation,
                shortDescription: parsedShortDescription,
                description: parsedDescription,
                website: website || null,
                imageUrl: imageObj
            }
        });

        res.status(httpStatus.CREATED).json({
            success: true,
            msg: "Sponsor created successfully",
            message: "Sponsor created successfully",
            sponsor: {
                ...newSponsor,
                logo: newSponsor.imageUrl?.url,
                image: newSponsor.imageUrl?.url
            }
        });
    } catch (error) {
        logError("Error in add sponsor", error);
        next(error);
    }
};

//! Get All Sponsors (Admin Table)
export const getAllSponsors = async (req, res, next) => {
    const { page = 1, limit = 10, search, name, category, location } = req.query;
    try {
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        let whereConditions = [];

        if (search && search.trim() !== "") {
            const trimmed = search.trim();
            whereConditions.push({
                OR: [
                    { name: { path: ["en"], string_contains: trimmed, mode: "insensitive" } },
                    { name: { path: ["hi"], string_contains: trimmed, mode: "insensitive" } },
                    { category: { path: ["en"], string_contains: trimmed, mode: "insensitive" } },
                    { category: { path: ["hi"], string_contains: trimmed, mode: "insensitive" } },
                    { location: { path: ["en"], string_contains: trimmed, mode: "insensitive" } },
                    { location: { path: ["hi"], string_contains: trimmed, mode: "insensitive" } }
                ]
            });
        }

        if (name && name.trim() !== "") {
            const trimmed = name.trim();
            whereConditions.push({
                OR: [
                    { name: { path: ["en"], string_contains: trimmed, mode: "insensitive" } },
                    { name: { path: ["hi"], string_contains: trimmed, mode: "insensitive" } }
                ]
            });
        }

        if (category && category.trim() !== "") {
            const trimmed = category.trim();
            whereConditions.push({
                OR: [
                    { category: { path: ["en"], string_contains: trimmed, mode: "insensitive" } },
                    { category: { path: ["hi"], string_contains: trimmed, mode: "insensitive" } }
                ]
            });
        }

        if (location && location.trim() !== "") {
            const trimmed = location.trim();
            whereConditions.push({
                OR: [
                    { location: { path: ["en"], string_contains: trimmed, mode: "insensitive" } },
                    { location: { path: ["hi"], string_contains: trimmed, mode: "insensitive" } }
                ]
            });
        }

        const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

        const totalSponsors = await prisma.sponsor.count({ where });

        const sponsors = await prisma.sponsor.findMany({
            where,
            skip,
            take: limitNumber,
            orderBy: {
                createdAt: "desc"
            }
        });

        const formatted = sponsors.map((s) => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            category: s.category,
            location: s.location,
            shortDescription: s.shortDescription,
            description: s.description,
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
        logError("Error in get all sponsors", error);
        next(error);
    }
};

//! Get Sponsor by ID
export const getSponsorById = async (req, res, next) => {
    const sponsorId = req.params.sponsorId || req.params.id;
    try {
        const existingSponsor = await prisma.sponsor.findUnique({
            where: { id: sponsorId }
        });

        if (!existingSponsor) {
            return next(errorHandler(sponsorError.Not_Exists));
        }

        const formatted = {
            id: existingSponsor.id,
            slug: existingSponsor.slug,
            name: existingSponsor.name,
            category: existingSponsor.category,
            location: existingSponsor.location,
            shortDescription: existingSponsor.shortDescription,
            description: existingSponsor.description,
            website: existingSponsor.website,
            logo: existingSponsor.imageUrl ? existingSponsor.imageUrl.url : null,
            image: existingSponsor.imageUrl ? existingSponsor.imageUrl.url : null,
            createdAt: existingSponsor.createdAt,
            updatedAt: existingSponsor.updatedAt
        };

        res.status(httpStatus.OK).json(formatted);
    } catch (error) {
        logError("Error in get sponsor by id", error);
        next(error);
    }
};

//! Update Sponsor
export const updateSponsor = async (req, res, next) => {
    const sponsorId = req.params.sponsorId || req.params.id;
    let { name, category, location, shortDescription, description, website } = req.body;
    try {
        const existingSponsor = await prisma.sponsor.findUnique({
            where: { id: sponsorId }
        });

        if (!existingSponsor) {
            return next(errorHandler(sponsorError.Not_Exists));
        }

        const parsedName = name ? parseJsonField(name) : existingSponsor.name;
        const parsedCategory = category ? parseJsonField(category) : existingSponsor.category;
        const parsedLocation = location ? parseJsonField(location) : existingSponsor.location;
        const parsedShortDescription = shortDescription ? parseJsonField(shortDescription) : existingSponsor.shortDescription;
        const parsedDescription = description ? parseJsonField(description) : existingSponsor.description;

        let imageObj = existingSponsor.imageUrl;
        const uploadedFile = req.file || (req.files && (req.files.logo?.[0] || req.files.image?.[0]));

        if (uploadedFile) {
            if (imageObj && imageObj.public_id) {
                await deleteFromCloudinary(imageObj.public_id, next);
            }
            const uploadResult = await uploadToCloudinary(uploadedFile.path, "Sponsors", next);
            imageObj = {
                url: uploadResult.secure_url,
                public_id: uploadResult.public_id
            };
        }

        // Regenerate slug if English name changed
        let slug = existingSponsor.slug;
        const oldEnglishName = typeof existingSponsor.name === "object" ? existingSponsor.name?.en : existingSponsor.name;
        const newEnglishName = typeof parsedName === "object" ? (parsedName?.en || parsedName?.hi) : parsedName;

        if (newEnglishName && newEnglishName !== oldEnglishName) {
            slug = await generateUniqueSponsorSlug(newEnglishName, existingSponsor.id);
        }

        const updatedSponsor = await prisma.sponsor.update({
            where: { id: sponsorId },
            data: {
                slug,
                name: parsedName,
                category: parsedCategory,
                location: parsedLocation,
                shortDescription: parsedShortDescription,
                description: parsedDescription,
                website: website !== undefined ? website : existingSponsor.website,
                imageUrl: imageObj
            }
        });

        res.status(httpStatus.OK).json({
            success: true,
            msg: "Sponsor updated successfully",
            message: "Sponsor updated successfully",
            sponsor: {
                ...updatedSponsor,
                logo: updatedSponsor.imageUrl?.url,
                image: updatedSponsor.imageUrl?.url
            }
        });
    } catch (error) {
        logError("Error in update sponsor", error);
        next(error);
    }
};

//! Delete Sponsor
export const deleteSponsor = async (req, res, next) => {
    const sponsorId = req.params.sponsorId || req.params.id;
    try {
        const existingSponsor = await prisma.sponsor.findUnique({
            where: { id: sponsorId }
        });

        if (!existingSponsor) {
            return next(errorHandler(sponsorError.Not_Exists));
        }

        if (existingSponsor.imageUrl && existingSponsor.imageUrl.public_id) {
            await deleteFromCloudinary(existingSponsor.imageUrl.public_id, next);
        }

        await prisma.sponsor.delete({
            where: { id: sponsorId }
        });

        res.status(httpStatus.OK).json({
            success: true,
            msg: "Sponsor deleted successfully",
            message: "Sponsor deleted successfully"
        });
    } catch (error) {
        logError("Error in delete sponsor", error);
        next(error);
    }
};
