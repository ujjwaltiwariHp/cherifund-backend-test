import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "public", "uploads", "career");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
  },
});

const allowedResumeMimes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const allowedResumeExts = [".pdf", ".doc", ".docx"];

const allowedPhotoMimes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
const allowedPhotoExts = [".jpg", ".jpeg", ".png", ".webp"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (file.fieldname === "photo") {
    if (allowedPhotoMimes.includes(file.mimetype) || allowedPhotoExts.includes(ext)) {
      return cb(null, true);
    }
    return cb(new Error("Invalid photo format. Only JPG, PNG, and WEBP images are allowed for photo upload."), false);
  }

  // Default / resume field
  if (allowedResumeMimes.includes(file.mimetype) || allowedResumeExts.includes(ext)) {
    return cb(null, true);
  }
  return cb(new Error("Invalid file type. Only PDF, DOC, and DOCX files are allowed for resume."), false);
};

const uploadCareerFiles = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
  },
  fileFilter,
});

/**
 * Middleware wrapper for handling application files (resume + optional photo)
 */
export const multerResumeUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, function (err) {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File size exceeds the 5MB limit. Please upload a smaller file.",
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed.",
        });
      }
      next();
    });
  };
};

export const careerApplicationUpload = uploadCareerFiles.fields([
  { name: "resume", maxCount: 1 },
  { name: "photo", maxCount: 1 },
]);

export default uploadCareerFiles;
