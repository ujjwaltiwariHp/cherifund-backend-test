import { httpStatus } from "../../config/httpStatus.js";
import { prisma } from "../../database/db.js";
import { pickLanguage } from "../../util/languageHelper.js";
import { logError } from "../../util/logHelper.js";
import { getOrSetCache } from "../../util/cacheHelper.js";

/**
 * GET /api/V1/web/home-overview
 * Unified aggregation endpoint that bundles all homepage data in 1 request.
 * Fully cached with a 5-minute TTL to eliminate database load during high traffic surges.
 */
export const getHomeOverview = async (req, res, next) => {
  const lang = req.lang || "en";
  const cacheKey = `home:overview:${lang}`;

  try {
    const overviewData = await getOrSetCache(cacheKey, 300, async () => {
      // Execute read queries concurrently using connection pool
      const [banners, campaigns, sponsors, feedbacks, blogs] = await Promise.all([
        // 1. Banners
        prisma.banner.findMany({
          where: { pageName: "Home" },
          orderBy: { priority: "asc" }
        }),

        // 2. Featured Active Campaigns (limit 8)
        prisma.campaigns.findMany({
          where: { status: "Active" },
          take: 8,
          orderBy: { createdAt: "desc" },
          include: { category: true }
        }),

        // 3. Sponsors / Partners
        prisma.sponsor.findMany({
          orderBy: { createdAt: "desc" }
        }),

        // 4. Approved Feedbacks / Testimonials
        prisma.feedback.findMany({
          where: { status: "APPROVED" },
          take: 10,
          orderBy: { createdAt: "desc" }
        }),

        // 5. Recent Blogs (limit 3)
        prisma.blog.findMany({
          take: 3,
          orderBy: { createdAt: "desc" },
          include: { category: true }
        })
      ]);

      const formattedBanners = banners.map((b) => ({
        id: b.id,
        pageName: b.pageName,
        title: pickLanguage(b.title, lang),
        subtitle: pickLanguage(b.subtitle, lang),
        description: pickLanguage(b.description, lang),
        priority: b.priority,
        image: b.imageUrl ? b.imageUrl.url : null
      }));

      const formattedCampaigns = campaigns.map((c) => {
        const donationPercentage =
          c.goalAmount > 0
            ? Math.ceil(Math.min((c.raisedAmount / c.goalAmount) * 100, 100))
            : 0;
        return {
          id: c.id,
          title: pickLanguage(c.title, lang),
          category: c.category ? pickLanguage(c.category.name, lang) : null,
          description: pickLanguage(c.description, lang),
          images: c.imageUrl?.images?.map((img) => img.url) || [],
          goalAmount: c.goalAmount,
          raisedAmount: c.raisedAmount,
          donationPercentage,
          location: pickLanguage(c.location, lang),
          status: c.status,
          createdAt: c.createdAt
        };
      });

      const formattedSponsors = sponsors.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: pickLanguage(s.name, lang),
        category: pickLanguage(s.category, lang),
        website: s.website,
        image: s.imageUrl?.url || null
      }));

      const formattedFeedbacks = feedbacks.map((f) => ({
        id: f.id,
        name: f.name,
        designation: f.designation,
        feedback: f.feedback,
        rating: f.rating,
        image: f.imageUrl?.url || null
      }));

      const formattedBlogs = blogs.map((b) => ({
        id: b.id,
        title: pickLanguage(b.title, lang),
        category: b.category ? pickLanguage(b.category.name, lang) : null,
        description: pickLanguage(b.description, lang),
        creator: pickLanguage(b.creator, lang),
        images: b.imageUrl?.images?.map((img) => img.url) || [],
        createdAt: b.createdAt
      }));

      return {
        banners: formattedBanners,
        campaigns: formattedCampaigns,
        sponsors: formattedSponsors,
        feedbacks: formattedFeedbacks,
        blogs: formattedBlogs
      };
    });

    // Send with HTTP Cache-Control header for Edge / CDN / Browser caching
    res.setHeader("Cache-Control", "public, max-age=180, s-maxage=300, stale-while-revalidate=60");
    return res.status(httpStatus.OK).json({
      success: true,
      data: overviewData
    });
  } catch (error) {
    logError("Error in getHomeOverview", error);
    next(error);
  }
};
