import { prisma } from "../database/db.js";

/**
 * Converts a text string into a URL-friendly slug
 */
export const slugify = (text) => {
    if (!text) return "sponsor";
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, "-") // Replace spaces and non-word chars with hyphen
        .replace(/^-+|-+$/g, "");   // Remove leading/trailing hyphens
};

/**
 * Generates a unique slug for a sponsor, checking against existing database records.
 * If excludeId is provided (e.g. on update), collisions with the same sponsor are ignored.
 */
export const generateUniqueSponsorSlug = async (nameText, excludeId = null) => {
    let baseSlug = slugify(nameText) || "sponsor";
    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const existing = await prisma.sponsor.findUnique({
            where: { slug }
        });

        if (!existing || (excludeId && existing.id === excludeId)) {
            return slug;
        }

        slug = `${baseSlug}-${counter}`;
        counter++;
    }
};
