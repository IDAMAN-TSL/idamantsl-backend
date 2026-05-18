import { Router } from "express";
import {
    getAllPengedaranLn,
    getPengedaranLnById,
    createPengedaranLn,
    updatePengedaranLn,
    deletePengedaranLn,
    bulkDeletePengedaranLn,
} from "../controllers/pengedaran-ln.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { uploadPdf } from "../middlewares/upload.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getAllPengedaranLn);
router.get("/:id", getPengedaranLnById);

router.post("/", authorize("admin_pusat", "bidang_wilayah"), uploadPdf.single("fileSk"), createPengedaranLn);
router.put("/:id", authorize("admin_pusat", "bidang_wilayah"), uploadPdf.single("fileSk"), updatePengedaranLn);
router.delete("/bulk", authorize("admin_pusat", "bidang_wilayah"), bulkDeletePengedaranLn);
router.delete("/:id", authorize("admin_pusat", "bidang_wilayah"), deletePengedaranLn);

export default router;
