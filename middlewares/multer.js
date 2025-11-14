import multer from "multer";
import path from "path"
import fs from "fs"

const uploadPath = path.join(process.cwd(), "public", "uploads")
if(!fs.existsSync(uploadPath)){
    fs.mkdirSync(uploadPath, {recursive : true})
}

const storage = multer.diskStorage({
    destination : (req, file, cb) =>{
        cb(null, uploadPath)
    },

    filename : (req, file, cb) =>{
        const uniqueName = Date.now() + "-" + file.originalname
        cb(null, uniqueName)
    }
})

const uploadLocal = multer({
    storage,
    limits: {
    fileSize: 500 * 1024 // 500 KB
  }
})


// 🧩 Custom wrapper for handling errors
export const multerUpload = (uploadType) => {
  return (req, res, next) => {
    uploadType(req, res, function (err) {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
           res.status(400).json({
            success: false,
            message: "File size too large. Please upload a file smaller than 500KB.",
          });
          return
        }
         res.status(400).json({
          success: false,
          message: err.message || "File upload failed.",
        });
        return
      }
      next();
    });
  };
};

export default uploadLocal