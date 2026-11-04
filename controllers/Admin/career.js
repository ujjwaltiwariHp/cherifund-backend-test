import { httpStatus } from "../../config/httpStatus.js";
import { prisma } from "../../database/db.js";
import { careerError } from "../../errors/career.js";
import uploadToCloudinary, { deleteFromCloudinary } from "../../util/cloudinary.js";
import { errorHandler } from "../../util/errorHandler.js";
import { logError, logInfo } from "../../util/logHelper.js";
import { invalidateCachePrefix } from "../../util/cacheHelper.js";

/* =========================================================
   INTERNSHIP APPLICATIONS (ADMIN)
   ========================================================= */

/**
 * Get all internship applications with pagination, search, and filters
 */
export const getAllApplications = async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    search,
    domain,
    status,
    mode,
    dateFrom,
    dateTo,
  } = req.query;

  try {
    const pageNumber = Math.max(1, parseInt(page, 10));
    const limitNumber = Math.max(1, parseInt(limit, 10));
    const skip = (pageNumber - 1) * limitNumber;

    const where = {};

    if (domain && domain !== "all") {
      where.domain = domain;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (mode && mode !== "all") {
      where.mode = mode;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search && search.trim() !== "") {
      const term = search.trim();
      where.OR = [
        { fullName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
        { college: { contains: term, mode: "insensitive" } },
        { applicationNumber: { contains: term, mode: "insensitive" } },
      ];
    }

    const [total, applications, countsByStatus] = await Promise.all([
      prisma.internshipApplication.count({ where }),
      prisma.internshipApplication.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy: { createdAt: "desc" },
      }),
      prisma.internshipApplication.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);

    const statusCounts = {
      total: 0,
      PENDING: 0,
      REVIEWING: 0,
      SHORTLISTED: 0,
      INTERVIEWED: 0,
      SELECTED: 0,
      REJECTED: 0,
    };

    countsByStatus.forEach((item) => {
      if (statusCounts[item.status] !== undefined) {
        statusCounts[item.status] = item._count.status;
      }
      statusCounts.total += item._count.status;
    });

    return res.status(httpStatus.OK).json({
      success: true,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      counts: statusCounts,
      applications,
    });
  } catch (error) {
    logError("Error in getAllApplications", error);
    next(error);
  }
};

/**
 * Get single application by ID
 */
export const getApplicationById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const application = await prisma.internshipApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return next(errorHandler(careerError.Application_Not_Found));
    }

    // Auto mark viewed if unviewed
    if (!application.isViewed) {
      await prisma.internshipApplication.update({
        where: { id },
        data: { isViewed: true },
      });
      application.isViewed = true;
    }

    return res.status(httpStatus.OK).json({
      success: true,
      application,
    });
  } catch (error) {
    logError("Error in getApplicationById", error);
    next(error);
  }
};

/**
 * Update application status & remarks
 */
export const updateApplicationStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status, adminRemarks } = req.body;

  try {
    const existing = await prisma.internshipApplication.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(errorHandler(careerError.Application_Not_Found));
    }

    const updated = await prisma.internshipApplication.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(adminRemarks !== undefined && { adminRemarks }),
      },
    });

    logInfo(`[Career] Application ${existing.applicationNumber} status updated to ${status}`);

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Application status updated successfully",
      application: updated,
    });
  } catch (error) {
    logError("Error in updateApplicationStatus", error);
    next(error);
  }
};

/**
 * Delete application
 */
export const deleteApplication = async (req, res, next) => {
  const { id } = req.params;
  try {
    const existing = await prisma.internshipApplication.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(errorHandler(careerError.Application_Not_Found));
    }

    if (existing.resumePublicId) {
      await deleteFromCloudinary(existing.resumePublicId, null, "raw");
    }

    await prisma.internshipApplication.delete({
      where: { id },
    });

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Application deleted successfully",
    });
  } catch (error) {
    logError("Error in deleteApplication", error);
    next(error);
  }
};

/* =========================================================
   TRAINEE ALUMNI MANAGEMENT (ADMIN)
   ========================================================= */

/**
 * Helper to ensure localized JSON fields for Trainee
 */
const parseLocalizedField = (val) => {
  if (!val) return { en: "", hi: "" };
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return { en: val, hi: val };
  }
};

/**
 * Get all trainees for admin management
 */
export const getAllTrainees = async (req, res, next) => {
  try {
    const trainees = await prisma.traineeAlumni.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });

    return res.status(httpStatus.OK).json({
      success: true,
      trainees,
    });
  } catch (error) {
    logError("Error in getAllTrainees", error);
    next(error);
  }
};

/**
 * Add a new trainee alumni
 */
export const addTrainee = async (req, res, next) => {
  try {
    const {
      name,
      university,
      domain,
      batch,
      duration,
      testimonial,
      linkedinUrl,
      displayOrder = 0,
      isActive = true,
    } = req.body;

    if (!req.file) {
      return next(errorHandler(careerError.Trainee_Image_Required));
    }

    const nameObj = parseLocalizedField(name);
    if (!nameObj.en && !nameObj.hi) {
      return next(errorHandler(careerError.Trainee_Name_Required));
    }

    const universityObj = parseLocalizedField(university);
    if (!universityObj.en && !universityObj.hi) {
      return next(errorHandler(careerError.Trainee_University_Required));
    }

    const domainObj = parseLocalizedField(domain);
    if (!domainObj.en && !domainObj.hi) {
      return next(errorHandler(careerError.Trainee_Domain_Required));
    }

    const uploadRes = await uploadToCloudinary(req.file.path, "Trainees", next);
    const imageObj = {
      url: uploadRes?.secure_url || `/uploads/${req.file.filename}`,
      public_id: uploadRes?.public_id || null,
    };

    const trainee = await prisma.traineeAlumni.create({
      data: {
        name: nameObj,
        imageUrl: imageObj,
        university: universityObj,
        domain: domainObj,
        batch: batch || `Batch ${new Date().getFullYear()}`,
        duration: duration || "3 Months",
        testimonial: testimonial ? parseLocalizedField(testimonial) : null,
        linkedinUrl: linkedinUrl ? linkedinUrl.trim() : null,
        displayOrder: parseInt(displayOrder, 10) || 0,
        isActive: isActive === "true" || isActive === true,
      },
    });

    logInfo(`[Career] Added trainee alumni: ${nameObj.en || nameObj.hi}`);
    invalidateCachePrefix("home:overview");

    return res.status(httpStatus.CREATED).json({
      success: true,
      message: "Trainee added successfully",
      trainee,
    });
  } catch (error) {
    logError("Error in addTrainee", error);
    next(error);
  }
};

/**
 * Update an existing trainee alumni
 */
export const updateTrainee = async (req, res, next) => {
  const { id } = req.params;
  try {
    const existing = await prisma.traineeAlumni.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(errorHandler(careerError.Trainee_Not_Found));
    }

    const {
      name,
      university,
      domain,
      batch,
      duration,
      testimonial,
      linkedinUrl,
      displayOrder,
      isActive,
    } = req.body;

    let imageObj = existing.imageUrl;

    if (req.file) {
      if (existing.imageUrl?.public_id) {
        await deleteFromCloudinary(existing.imageUrl.public_id, null, "image");
      }
      const uploadRes = await uploadToCloudinary(req.file.path, "Trainees", next);
      imageObj = {
        url: uploadRes?.secure_url || `/uploads/${req.file.filename}`,
        public_id: uploadRes?.public_id || null,
      };
    }

    const updated = await prisma.traineeAlumni.update({
      where: { id },
      data: {
        ...(name && { name: parseLocalizedField(name) }),
        ...(university && { university: parseLocalizedField(university) }),
        ...(domain && { domain: parseLocalizedField(domain) }),
        ...(batch !== undefined && { batch }),
        ...(duration !== undefined && { duration }),
        ...(testimonial !== undefined && { testimonial: testimonial ? parseLocalizedField(testimonial) : null }),
        ...(linkedinUrl !== undefined && { linkedinUrl }),
        ...(displayOrder !== undefined && { displayOrder: parseInt(displayOrder, 10) || 0 }),
        ...(isActive !== undefined && { isActive: isActive === "true" || isActive === true }),
        imageUrl: imageObj,
      },
    });

    invalidateCachePrefix("home:overview");

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Trainee updated successfully",
      trainee: updated,
    });
  } catch (error) {
    logError("Error in updateTrainee", error);
    next(error);
  }
};

/**
 * Fast Toggle Trainee Active Status
 */
export const toggleTraineeStatus = async (req, res, next) => {
  const { id } = req.params;
  try {
    const existing = await prisma.traineeAlumni.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(errorHandler(careerError.Trainee_Not_Found));
    }

    const updated = await prisma.traineeAlumni.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    invalidateCachePrefix("home:overview");

    return res.status(httpStatus.OK).json({
      success: true,
      message: `Trainee is now ${updated.isActive ? "Active (Visible)" : "Inactive (Hidden)"}`,
      trainee: updated,
    });
  } catch (error) {
    logError("Error in toggleTraineeStatus", error);
    next(error);
  }
};

/**
 * Delete a trainee alumni
 */
export const deleteTrainee = async (req, res, next) => {
  const { id } = req.params;
  try {
    const existing = await prisma.traineeAlumni.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(errorHandler(careerError.Trainee_Not_Found));
    }

    if (existing.imageUrl?.public_id) {
      await deleteFromCloudinary(existing.imageUrl.public_id, null, "image");
    }

    await prisma.traineeAlumni.delete({
      where: { id },
    });

    invalidateCachePrefix("home:overview");

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Trainee deleted successfully",
    });
  } catch (error) {
    logError("Error in deleteTrainee", error);
    next(error);
  }
};
