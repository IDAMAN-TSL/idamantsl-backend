import { Router } from "express";
import {
  getAllWilayah,
  getWilayahBidang,
  getWilayahSeksi,
} from "../controllers/wilayah.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getAllWilayah);
router.get("/bidang", getWilayahBidang);
router.get("/seksi", getWilayahSeksi);

export default router;