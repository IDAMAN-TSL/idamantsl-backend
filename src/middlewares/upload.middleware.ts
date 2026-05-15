import multer from "multer";

export const uploadPdf = multer({
  storage: multer.memoryStorage(), // simpan di memory dulu, lalu upload ke Azure
  limits: { fileSize: 2 * 1024 * 1024 }, // max 2MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Hanya file PDF yang diizinkan"));
    }
  },
});