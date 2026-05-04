import { Router } from "express";
import { getAllUsers, createUser, updateUser, deleteUser } from "../controllers/users.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// Kita tambahkan middleware authenticate agar hanya user login yang bisa akses
router.use(authenticate);

router.get("/", getAllUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
