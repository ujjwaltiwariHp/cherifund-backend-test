import { httpStatus } from "../../config/httpStatus.js";
import { prisma } from "../../database/db.js";
import { careerError } from "../../errors/career.js";
import { createNotification } from "../../services/notificationService.js";
import { sendInternshipApplicationEmails } from "../../services/emailService.js";
import { broadcastRealtimeEvent } from "../../services/realtimeService.js";
import uploadToCloudinary from "../../util/cloudinary.js";
import { errorHandler } from "../../util/errorHandler.js";
import { logError, logInfo } from "../../util/logHelper.js";
import crypto from "crypto";
import path from "path";

const PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const STANDARD_DOMAINS = [
  "Health",
  "Women Empowerment",
  "Income Generation",
  "Education",
  "Communication",
  "Fund-raising",
  "Training and Capacity Building",
  "Information Management Systems",
  "Web Development & Technology",
  "Mobile Application Development",
  "UI/UX & Digital Design",
  "Digital Marketing & Social Media",
  "Content Writing & Documentation",
  "Social Work & Community Development",
  "Data Analytics & Research",
];

/**
 * Public: Submit Dual-Mode Internship Application (Student or Working Professional)
 */
export const applyForInternship = async (req, res, next) => {
  try {
    const {
      applicantType = "STUDENT",
      fullName,
      email,
      phone,
      whatsappNumber,
      gender,
      dob,
      stateOfOrigin,
      currentAddress,
      permanentAddress,
      city,
      state,
      pincode,
      highestQualification,
      college,
      course,
      specialization,
      branch,
      yearOfStudy,
      passingYear,
      areaOfInterest,
      specificSkills,
      languages,
      hasInternshipExp,
      internshipOrgName,
      internshipLocation,
      internshipDuration,
      internshipProjectNature,
      currentDesignation,
      currentOrganization,
      workExperienceYears,
      domain,
      domainReason,
      weeksAvailable,
      startMonthWeek,
      familiarWithComputer,
      whyJoin,
      duration,
      mode,
      scoreType,
      score,
      tenthPercentage,
      twelfthPercentage,
      currentCgpa,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
    } = req.body;

    // 1. Mandatory Field Validations
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      return next(errorHandler(careerError.Full_Name_Required));
    }

    const cleanEmail = email ? email.trim().toLowerCase() : "";
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return next(errorHandler(careerError.Invalid_Email));
    }

    const cleanPhone = phone ? phone.toString().trim().replace(/[^0-9]/g, "") : "";
    const normalizedPhone = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
    if (!PHONE_REGEX.test(normalizedPhone)) {
      return next(errorHandler(careerError.Invalid_Phone));
    }

    if (!domain || typeof domain !== "string" || domain.trim().length < 2) {
      return next(errorHandler(careerError.Domain_Required));
    }

    // Identify files from multer
    const resumeFile = req.files?.resume?.[0] || req.file;
    const photoFile = req.files?.photo?.[0];

    if (!resumeFile) {
      return next(errorHandler(careerError.Resume_Required));
    }

    // Parse languages
    let parsedLanguages = [];
    if (languages) {
      if (Array.isArray(languages)) {
        parsedLanguages = languages;
      } else if (typeof languages === "string") {
        try {
          parsedLanguages = JSON.parse(languages);
        } catch {
          parsedLanguages = languages.split(",").map((l) => l.trim()).filter(Boolean);
        }
      }
    }

    // Parse boolean flags
    const parsedHasInternshipExp =
      hasInternshipExp === true || hasInternshipExp === "true" || hasInternshipExp === "yes";
    const parsedFamiliarWithComputer =
      familiarWithComputer === undefined ||
      familiarWithComputer === true ||
      familiarWithComputer === "true" ||
      familiarWithComputer === "yes";

    // Parse numeric fields if present
    const parsedPassingYear = passingYear ? parseInt(passingYear, 10) : null;
    const cleanScoreType = scoreType ? scoreType.toUpperCase() : "PERCENTAGE";
    const parsedScore = score !== undefined && score !== "" && score !== null ? parseFloat(score) : null;
    const parsed10th = tenthPercentage !== undefined && tenthPercentage !== "" ? parseFloat(tenthPercentage) : null;
    const parsed12th = twelfthPercentage !== undefined && twelfthPercentage !== "" ? parseFloat(twelfthPercentage) : null;
    const parsedCgpa = currentCgpa !== undefined && currentCgpa !== "" ? parseFloat(currentCgpa) : null;

    if (parsedScore !== null) {
      if (isNaN(parsedScore) || parsedScore < 0) {
        return next(
          errorHandler({
            message: "Marks score must be a non-negative number",
            status: httpStatus.BAD_REQUEST,
          })
        );
      }
      if (cleanScoreType === "CGPA" && parsedScore > 10) {
        return next(
          errorHandler({
            message: "CGPA score cannot be greater than 10.0",
            status: httpStatus.BAD_REQUEST,
          })
        );
      }
      if (cleanScoreType === "PERCENTAGE" && parsedScore > 100) {
        return next(
          errorHandler({
            message: "Percentage score cannot exceed 100%",
            status: httpStatus.BAD_REQUEST,
          })
        );
      }
    }

    // 2. Upload Resume to Cloudinary
    let resumeUrl = "";
    let resumePublicId = null;
    try {
      const uploadRes = await uploadToCloudinary(resumeFile.path, "Resumes", null, {
        resource_type: "auto",
      });
      if (uploadRes && uploadRes.secure_url) {
        resumeUrl = uploadRes.secure_url;
        resumePublicId = uploadRes.public_id || null;
      } else {
        resumeUrl = `/uploads/career/${path.basename(resumeFile.path)}`;
      }
    } catch (uploadErr) {
      logError("Cloudinary resume upload failed, using local fallback:", uploadErr);
      resumeUrl = `/uploads/career/${path.basename(resumeFile.path)}`;
    }

    // 3. Upload Photo to Cloudinary (if provided)
    let photoUrl = null;
    let photoPublicId = null;
    if (photoFile) {
      try {
        const photoUploadRes = await uploadToCloudinary(photoFile.path, "Intern_Photos", null, {
          resource_type: "image",
          transformation: [
            { width: 600, height: 600, crop: "limit", quality: "auto:good", fetch_format: "auto" },
          ],
        });
        if (photoUploadRes && photoUploadRes.secure_url) {
          photoUrl = photoUploadRes.secure_url;
          photoPublicId = photoUploadRes.public_id || null;
        } else {
          photoUrl = `/uploads/career/${path.basename(photoFile.path)}`;
        }
      } catch (photoErr) {
        logError("Cloudinary photo upload failed, using local fallback:", photoErr);
        photoUrl = `/uploads/career/${path.basename(photoFile.path)}`;
      }
    }

    // 4. Generate unique application number (e.g. YUWA-INT-2026-F91A)
    const yearPrefix = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const applicationNumber = `YUWA-INT-${yearPrefix}-${randomHex}`;

    // 5. Save application to Database
    const resolvedApplicantType =
      applicantType === "WORKING_PROFESSIONAL" ? "WORKING_PROFESSIONAL" : "STUDENT";

    const resolvedCollege = college && college.trim().length > 0
      ? college.trim()
      : (currentOrganization && currentOrganization.trim().length > 0
          ? currentOrganization.trim()
          : "Not Specified");

    const resolvedCourse = course && course.trim().length > 0
      ? course.trim()
      : (highestQualification && highestQualification.trim().length > 0
          ? highestQualification.trim()
          : "Not Specified");

    const application = await prisma.internshipApplication.create({
      data: {
        applicationNumber,
        applicantType: resolvedApplicantType,
        fullName: fullName.trim(),
        email: cleanEmail,
        phone: normalizedPhone,
        whatsappNumber: whatsappNumber ? whatsappNumber.trim() : null,
        gender: gender ? gender.trim() : null,
        dob: dob ? dob.trim() : null,
        stateOfOrigin: stateOfOrigin ? stateOfOrigin.trim() : null,
        photoUrl,
        photoPublicId,
        currentAddress: currentAddress ? currentAddress.trim() : null,
        permanentAddress: permanentAddress
          ? permanentAddress.trim()
          : (currentAddress ? currentAddress.trim() : null),
        address: currentAddress
          ? currentAddress.trim()
          : (permanentAddress ? permanentAddress.trim() : null),
        city: city ? city.trim() : null,
        state: state ? state.trim() : (stateOfOrigin ? stateOfOrigin.trim() : null),
        pincode: pincode ? pincode.toString().trim() : null,
        highestQualification: highestQualification ? highestQualification.trim() : null,
        college: resolvedCollege,
        course: resolvedCourse,
        specialization: specialization ? specialization.trim() : (branch ? branch.trim() : null),
        branch: branch ? branch.trim() : (specialization ? specialization.trim() : null),
        yearOfStudy: yearOfStudy ? yearOfStudy.trim() : "Ongoing",
        passingYear: parsedPassingYear,
        scoreType: cleanScoreType,
        score: parsedScore,
        tenthPercentage: parsed10th,
        twelfthPercentage: parsed12th,
        currentCgpa: parsedCgpa || (cleanScoreType === "CGPA" ? parsedScore : null),
        areaOfInterest: areaOfInterest ? areaOfInterest.trim() : null,
        specificSkills: specificSkills ? specificSkills.trim() : null,
        languages: parsedLanguages,
        hasInternshipExp: parsedHasInternshipExp,
        internshipOrgName: internshipOrgName ? internshipOrgName.trim() : null,
        internshipLocation: internshipLocation ? internshipLocation.trim() : null,
        internshipDuration: internshipDuration ? internshipDuration.trim() : null,
        internshipProjectNature: internshipProjectNature ? internshipProjectNature.trim() : null,
        currentDesignation: currentDesignation ? currentDesignation.trim() : null,
        currentOrganization: currentOrganization ? currentOrganization.trim() : null,
        workExperienceYears: workExperienceYears ? workExperienceYears.trim() : null,
        domain: domain.trim(),
        domainReason: domainReason ? domainReason.trim() : null,
        weeksAvailable: weeksAvailable ? weeksAvailable.trim() : (duration ? duration.trim() : "8 Weeks"),
        startMonthWeek: startMonthWeek ? startMonthWeek.trim() : null,
        familiarWithComputer: parsedFamiliarWithComputer,
        whyJoin: whyJoin ? whyJoin.trim() : null,
        duration: duration ? duration.trim() : (weeksAvailable ? weeksAvailable.trim() : "3 Months"),
        mode: mode && ["REMOTE", "HYBRID", "ON_SITE"].includes(mode) ? mode : "HYBRID",
        resumeUrl,
        resumePublicId,
        resumeOriginalName: resumeFile.originalname,
        resumeMimeType: resumeFile.mimetype,
        resumeSize: resumeFile.size,
        linkedinUrl: linkedinUrl ? linkedinUrl.trim() : null,
        githubUrl: githubUrl ? githubUrl.trim() : null,
        portfolioUrl: portfolioUrl ? portfolioUrl.trim() : null,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
      },
    });

    logInfo(
      `[Career] New ${resolvedApplicantType} internship application: ${application.applicationNumber} by ${application.fullName}`
    );

    // 6. Broadcast Real-time In-App Notification and SSE event to Admins
    try {
      broadcastRealtimeEvent("career:application", {
        action: "create",
        application,
      });

      await createNotification({
        type: "internship_application",
        title: `New ${resolvedApplicantType === "WORKING_PROFESSIONAL" ? "Professional" : "Student"} Internship Application`,
        message: `${application.fullName} applied for ${application.domain} (${application.college || application.currentOrganization || "Yuwa India"})`,
        metadata: {
          applicationId: application.id,
          applicationNumber: application.applicationNumber,
          applicantType: application.applicantType,
          domain: application.domain,
          college: application.college,
          phone: application.phone,
          email: application.email,
          resumeUrl: application.resumeUrl,
          photoUrl: application.photoUrl,
        },
      });
    } catch (notifErr) {
      logError("Failed to dispatch in-app notification for internship application", notifErr);
    }

    // 7. Dispatch Confirmation and Admin Alert Emails
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
        applicantType: application.applicantType,
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
