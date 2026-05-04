import { Router } from "express";
import {
  getAllReferensi,
  getReferensiById,
  createReferensi,
  updateReferensi,
  deleteReferensi,
} from "../controllers/referensi-tsl.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";

const router = Router();

// Semua route wajib login
router.use(authenticate);

// READ → semua role boleh
router.get("/", getAllReferensi);
router.get("/:id", getReferensiById);

// WRITE → hanya admin_pusat & bidang_wilayah
router.post("/", authorize("admin_pusat", "bidang_wilayah"), createReferensi);
router.put("/:id", authorize("admin_pusat", "bidang_wilayah"), updateReferensi);
router.delete("/:id", authorize("admin_pusat", "bidang_wilayah"), deleteReferensi);

export default router;