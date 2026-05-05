import { Router } from "express";
import {
  approveData,
  tolakData,
  getDataPending,
  getVerifikasiLog,
} from "../controllers/verifikasi.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";

const router = Router();

// Semua endpoint verifikasi hanya untuk admin_pusat
router.use(authenticate, authorize("admin_pusat"));

router.get("/pending", getDataPending);       // Lihat semua data pending
router.get("/log", getVerifikasiLog);         // Riwayat verifikasi
router.post("/approve", approveData);         // Setujui data
router.post("/tolak", tolakData);             // Tolak data

export default router;