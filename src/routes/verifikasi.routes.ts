import { Router } from "express";
import {
  approveData,
  tolakData,
  getDataPending,
  getVerifikasiLog,
  getDataApproved,
} from "../controllers/verifikasi.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";

const router = Router();
// Semua role yang sudah login bisa akses
router.get("/approved", authenticate, getDataApproved);

// Hanya admin_pusat
router.get("/pending", authenticate, authorize("admin_pusat"), getDataPending);
router.get("/log", authenticate, authorize("admin_pusat"), getVerifikasiLog);
router.post("/approve", authenticate, authorize("admin_pusat"), approveData);
router.post("/tolak", authenticate, authorize("admin_pusat"), tolakData);

export default router;