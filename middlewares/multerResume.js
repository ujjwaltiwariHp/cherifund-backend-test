import multer from "multer";
import path from "path";
import fs from "fs";

const resumeUploadPath = path.join(process.cwd(), "public", "uploads", "resumes");
if (!fs.existsSync(resumeUploadPath)) {
  fs.mkdirSync(resumeUploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, resumeUploadPath);
  },
  filename: (req, file, cb) => {
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
  },
});

const allowedMimes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const allowedExtensions = [".pdf", ".doc", ".docx"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, DOC, and DOCX files are allowed for resume."), false);
  }
};

const uploadResumeLocal = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter,
});

/**
 * Middleware wrapper for handling resume upload and errors cleanly
 */
export const multerResumeUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, function (err) {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Resume file size exceeds the 5MB limit. Please upload a smaller file.",
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "Resume upload failed.",
        });
      }
      next();
    });
  };
};

export default uploadResumeLocal;
