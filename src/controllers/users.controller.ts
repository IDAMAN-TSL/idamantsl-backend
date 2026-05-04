import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { users } from "../../db/schema";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const allUsers = await db.query.users.findMany({
      with: { wilayah: true },
      columns: {
        password: false,
        resetToken: false,
        resetTokenExpiry: false,
      },
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });

    return res.status(200).json({
      success: true,
      data: allUsers,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { nama, email, password, nomorTelepon, role, wilayahId, isActive } = req.body;

    if (!nama || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Nama, email, password, dan role wajib diisi" });
    }

    const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email sudah terdaftar" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.insert(users).values({
      nama,
      email,
      password: hashedPassword,
      nomorTelepon: nomorTelepon || null,
      role,
      wilayahId: wilayahId || null,
      isActive: isActive !== undefined ? isActive : true,
    }).returning({
      id: users.id,
      nama: users.nama,
      email: users.email,
      role: users.role,
    });

    return res.status(201).json({
      success: true,
      message: "Pengguna berhasil ditambahkan",
      data: newUser[0],
    });
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { nama, email, password, nomorTelepon, role, wilayahId, isActive } = req.body;

    const existingUser = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan" });
    }

    const updateData: any = {
      nama,
      email,
      nomorTelepon: nomorTelepon || null,
      role,
      wilayahId: wilayahId || null,
      isActive,
      updatedAt: new Date(),
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await db.update(users).set(updateData).where(eq(users.id, id));

    return res.status(200).json({
      success: true,
      message: "Pengguna berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    const existingUser = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan" });
    }

    await db.delete(users).where(eq(users.id, id));

    return res.status(200).json({
      success: true,
      message: "Pengguna berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};
