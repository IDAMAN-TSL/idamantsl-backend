import { Router } from "express";
import {
  getNotifikasi,
  markAllNotifikasiRead,
  markNotifikasiRead,
  markNotifikasiUnread,
  toggleNotificationSettings
} from "../controllers/notifikasi.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getNotifikasi);
router.put("/settings", toggleNotificationSettings);
router.put("/read-all", markAllNotifikasiRead);
router.put("/:id/read", markNotifikasiRead);
router.put("/:id/unread", markNotifikasiUnread);

export default router;
