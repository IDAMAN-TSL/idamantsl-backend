import { Router } from "express";
import {
    getAllPengedaranDn,
    getPengedaranDnById,
    createPengedaranDn,
    updatePengedaranDn,
    deletePengedaranDn,
    bulkDeletePengedaranDn,
} from "../controllers/pengedaran-dn.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { uploadPdf } from "../middlewares/upload.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getAllPengedaranDn);
router.get("/:id", getPengedaranDnById);

router.post("/", authorize("admin_pusat", "bidang_wilayah"), uploadPdf.single("fileSk"), createPengedaranDn);
router.put("/:id", authorize("admin_pusat", "bidang_wilayah"), uploadPdf.single("fileSk"), updatePengedaranDn);
router.delete("/bulk", authorize("admin_pusat", "bidang_wilayah"), bulkDeletePengedaranDn);
router.delete("/:id", authorize("admin_pusat", "bidang_wilayah"), deletePengedaranDn);

export default router;
