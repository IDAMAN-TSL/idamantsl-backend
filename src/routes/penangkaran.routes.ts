import { Router } from "express";
import {
  getAllPenangkaran,
  getPenangkaranById,
  createPenangkaran,
  updatePenangkaran,
  deletePenangkaran,
  bulkDeletePenangkaran
} from "../controllers/penangkaran.controller";
import {
  authenticate,
  authorize,
} from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getAllPenangkaran);
router.get("/:id", getPenangkaranById);

router.post("/", authorize("admin_pusat", "bidang_wilayah"), createPenangkaran);
router.put("/:id", authorize("admin_pusat", "bidang_wilayah"), updatePenangkaran);
router.delete("/bulk", authorize("admin_pusat", "bidang_wilayah"), bulkDeletePenangkaran);
router.delete("/:id", authorize("admin_pusat", "bidang_wilayah"), deletePenangkaran);

export default router;