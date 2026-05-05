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

// Semua endpoint verifikasi hanya untuk admin_pusat
router.use(authenticate, authorize("admin_pusat"));

// Semua route verifikasi hanya untuk admin_pusat
router.get("/pending", authorize("admin_pusat"), getDataPending);
router.get("/approved", authorize("admin_pusat"), getDataApproved);
router.get("/log", authorize("admin_pusat"), getVerifikasiLog);
router.post("/approve", authorize("admin_pusat"), approveData);
router.post("/tolak", authorize("admin_pusat"), tolakData);

export default router;