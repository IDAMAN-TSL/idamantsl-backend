import { Router } from "express";
import {
  login,
  logout,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", login);
router.post("/logout", authenticate, logout); 
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;