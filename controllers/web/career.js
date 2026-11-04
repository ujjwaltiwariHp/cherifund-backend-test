import { httpStatus } from "../../config/httpStatus.js";
import { prisma } from "../../database/db.js";
import { careerError } from "../../errors/career.js";
import { createNotification } from "../../services/notificationService.js";
import { sendInternshipApplicationEmails } from "../../services/emailService.js";
import uploadToCloudinary from "../../util/cloudinary.js";
import { errorHandler } from "../../util/errorHandler.js";
import { logError, logInfo } from "../../util/logHelper.js";
import crypto from "crypto";
import path from "path";

const PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const STANDARD_DOMAINS = [
  "Web Development (Frontend / Full Stack)",
  "Mobile Application Development",
  "UI/UX & Graphic Design",
  "Social Work & Community Development",
  "Digital Marketing & Social Media",
  "Content Writing & Documentation",
  "Fundraising & NGO Operations",
  "Data Analytics & Research",
];

/**
 * Public: Submit Student Internship Application
 */
export const applyForInternship = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      whatsappNumber,
      gender,
      college,
      course,
      branch,
      yearOfStudy,
      passingYear,
      tenthPercentage,
      twelfthPercentage,
      currentCgpa,
      domain,
      duration,
      mode,
      address,
      city,
      state,
      pincode,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      whyJoin,
    } = req.body;

    // 1. Mandatory field validations
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      return next(errorHandler(careerError.Full_Name_Required));
    }

    const cleanEmail = email ? email.trim().toLowerCase() : "";
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return next(errorHandler(careerError.Invalid_Email));
    }

    const cleanPhone = phone ? phone.toString().trim().replace(/[^0-9]/g, "") : "";
    // Allow with leading 0 or 91 if user pasted, but normalize to last 10 digits
    const normalizedPhone = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
    if (!PHONE_REGEX.test(normalizedPhone)) {
      return next(errorHandler(careerError.Invalid_Phone));
    }

    if (!college || typeof college !== "string" || college.trim().length < 2) {
      return next(errorHandler(careerError.College_Required));
    }

    if (!course || typeof course !== "string" || course.trim().length < 2) {
      return next(errorHandler(careerError.Course_Required));
    }

    if (!domain || typeof domain !== "string" || domain.trim().length < 2) {
      return next(errorHandler(careerError.Domain_Required));
    }

    if (!req.file) {
      return next(errorHandler(careerError.Resume_Required));
    }

    // 2. Numeric parsing & sanity validations
    const parsedPassingYear = passingYear ? parseInt(passingYear, 10) : new Date().getFullYear();
    const parsed10th = tenthPercentage !== undefined && tenthPercentage !== "" ? parseFloat(tenthPercentage) : null;
    const parsed12th = twelfthPercentage !== undefined && twelfthPercentage !== "" ? parseFloat(twelfthPercentage) : null;
    const parsedCgpa = currentCgpa !== undefined && currentCgpa !== "" ? parseFloat(currentCgpa) : null;

    if (parsed10th !== null && (isNaN(parsed10th) || parsed10th < 0 || parsed10th > 100)) {
      return next(errorHandler({ message: "10th percentage must be between 0 and 100", status: httpStatus.BAD_REQUEST }));
    }
    if (parsed12th !== null && (isNaN(parsed12th) || parsed12th < 0 || parsed12th > 100)) {
      return next(errorHandler({ message: "12th / Diploma percentage must be between 0 and 100", status: httpStatus.BAD_REQUEST }));
    }
    if (parsedCgpa !== null && (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 100)) {
      return next(errorHandler({ message: "CGPA / percentage must be a valid positive score", status: httpStatus.BAD_REQUEST }));
    }

    // 3. Resume Upload Handling (Cloudinary with local fallback)
    let resumeUrl = "";
    let resumePublicId = null;

    try {
      const uploadRes = await uploadToCloudinary(req.file.path, "Resumes", null, {
        resource_type: "auto",
      });

      if (uploadRes && uploadRes.secure_url) {
        resumeUrl = uploadRes.secure_url;
        resumePublicId = uploadRes.public_id || null;
      } else {
        // Fallback to local file URL
        resumeUrl = `/uploads/resumes/${path.basename(req.file.path)}`;
      }
    } catch (uploadErr) {
      logError("Cloudinary resume upload failed, using local fallback path:", uploadErr);
      resumeUrl = `/uploads/resumes/${path.basename(req.file.path)}`;
    }

    // 4. Generate unique application number (e.g. YUWA-INT-2026-F91A)
    const yearPrefix = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const applicationNumber = `YUWA-INT-${yearPrefix}-${randomHex}`;

    // 5. Save application to Database
    const application = await prisma.internshipApplication.create({
      data: {
        applicationNumber,
        fullName: fullName.trim(),
        email: cleanEmail,
        phone: normalizedPhone,
        whatsappNumber: whatsappNumber ? whatsappNumber.trim() : null,
        gender: gender ? gender.trim() : null,
        college: college.trim(),
        course: course.trim(),
        branch: branch ? branch.trim() : null,
        yearOfStudy: yearOfStudy ? yearOfStudy.trim() : "Ongoing",
        passingYear: parsedPassingYear,
        tenthPercentage: parsed10th,
        twelfthPercentage: parsed12th,
        currentCgpa: parsedCgpa,
        domain: domain.trim(),
        duration: duration ? duration.trim() : "3 Months",
        mode: mode && ["REMOTE", "HYBRID", "ON_SITE"].includes(mode) ? mode : "HYBRID",
        address: address ? address.trim() : null,
        city: city ? city.trim() : "Gorakhpur",
        state: state ? state.trim() : "Uttar Pradesh",
        pincode: pincode ? pincode.toString().trim() : "273001",
        resumeUrl,
        resumePublicId,
        resumeOriginalName: req.file.originalname,
        resumeMimeType: req.file.mimetype,
        resumeSize: req.file.size,
        linkedinUrl: linkedinUrl ? linkedinUrl.trim() : null,
        githubUrl: githubUrl ? githubUrl.trim() : null,
        portfolioUrl: portfolioUrl ? portfolioUrl.trim() : null,
        whyJoin: whyJoin ? whyJoin.trim() : null,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
      },
    });

    logInfo(`[Career] New internship application created: ${application.applicationNumber} by ${application.fullName}`);

    // 6. Broadcast Real-time In-App Notification to Admins
    try {
      await createNotification({
        type: "internship_application",
        title: "New Internship Application",
        message: `${application.fullName} applied for ${application.domain} (${application.college})`,
        metadata: {
          applicationId: application.id,
          applicationNumber: application.applicationNumber,
          domain: application.domain,
          college: application.college,
          phone: application.phone,
          email: application.email,
          resumeUrl: application.resumeUrl,
        },
      });
    } catch (notifErr) {
      logError("Failed to dispatch in-app notification for internship application", notifErr);
    }

    // 7. Dispatch Emails (Admin alert & Applicant acknowledgment)
    try {
      sendInternshipApplicationEmails(application).catch((emailErr) => {
        logError("Background email dispatch failed for internship application", emailErr);
      });
    } catch (err) {
      logError("Error initiating email dispatch", err);
    }

    return res.status(httpStatus.CREATED).json({
      success: true,
      message: "Internship application submitted successfully! Our team will contact you shortly.",
      application: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        fullName: application.fullName,
        domain: application.domain,
        createdAt: application.createdAt,
      },
    });
  } catch (error) {
    logError("Error submitting internship application", error);
    next(error);
  }
};

/**
 * Public: Fetch Active Trainee Alumni (for Homepage and Career page carousel)
 */
export const getPublicTrainees = async (req, res, next) => {
  try {
    const trainees = await prisma.traineeAlumni.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });

    return res.status(httpStatus.OK).json({
      success: true,
      trainees,
    });
  } catch (error) {
    logError("Error fetching public trainees", error);
    next(error);
  }
};

/**
 * Public: Get Standard Internship Domains
 */
export const getPublicDomains = async (req, res, next) => {
  try {
    return res.status(httpStatus.OK).json({
      success: true,
      domains: STANDARD_DOMAINS,
    });
  } catch (error) {
    next(error);
  }
};
