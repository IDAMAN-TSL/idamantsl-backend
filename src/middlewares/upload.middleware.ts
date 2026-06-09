import multer from "multer";

export const uploadPdf = multer({
  storage: multer.memoryStorage(), 
  limits: { fileSize: 2 * 1024 * 1024 }, 
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Hanya file PDF yang diizinkan"));
    }
  },
});