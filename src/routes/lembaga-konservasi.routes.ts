import { Router } from "express";
import {
    getAllLembagaKonservasi,
    getLembagaKonservasiById,
    createLembagaKonservasi,
    updateLembagaKonservasi,
    deleteLembagaKonservasi,
    bulkDeleteLembagaKonservasi,
} from "../controllers/lembaga-konservasi.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { uploadPdf } from "../middlewares/upload.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getAllLembagaKonservasi);
router.get("/:id", getLembagaKonservasiById);

router.post("/", authorize("admin_pusat", "bidang_wilayah"), uploadPdf.single("fileSk"), createLembagaKonservasi);
router.put("/:id", authorize("admin_pusat", "bidang_wilayah"), uploadPdf.single("fileSk"), updateLembagaKonservasi);
router.delete("/bulk", authorize("admin_pusat", "bidang_wilayah"), bulkDeleteLembagaKonservasi);
router.delete("/:id", authorize("admin_pusat", "bidang_wilayah"), deleteLembagaKonservasi);

export default router;
