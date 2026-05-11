import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { users } from "../../db/schema";
import { randomInt } from "node:crypto";
import { handleError } from "../helpers/controller.helpers";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi",
      });
    }
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: { wilayah: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Akun tidak aktif, hubungi Admin Pusat",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        wilayahId: user.wilayahId,
      },
      process.env.JWT_SECRET ?? "",
      { expiresIn: "7d" }
    );
    return res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        token,
        user: {
          id: user.id,
          nama: user.nama,
          email: user.email,
          role: user.role,
          wilayah: user.wilayah,
        },
      },
    });
  } catch (error) {
    return handleError(res, error, "login");
  }
};

export const logout = async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "Logout berhasil",
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email wajib diisi",
      });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "Jika email terdaftar, link reset password akan dikirim",
      });
    }

    const resetToken = randomInt(100000, 999999).toString();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); 

    await db
      .update(users)
      .set({
        resetToken,
        resetTokenExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return res.status(200).json({
      success: true,
      message: "Jika email terdaftar, link reset password akan dikirim",
      // Hapus baris ini di production:
      devToken: resetToken,
    });
  } catch (error) {
    return handleError(res, error, "forgotPassword");
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword, confirmPassword } = req.body;

    if (!email || !token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Semua field wajib diisi",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password baru dan konfirmasi password tidak sama",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 8 karakter",
      });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user?.resetToken || !user.resetTokenExpiry) {
      return res.status(400).json({
        success: false,
        message: "Token tidak valid",
      });
    }

    if (user.resetToken !== token) {
      return res.status(400).json({
        success: false,
        message: "Token tidak valid",
      });
    }

    if (new Date() > user.resetTokenExpiry) {
      return res.status(400).json({
        success: false,
        message: "Token sudah kadaluarsa, silakan request ulang",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return res.status(200).json({
      success: true,
      message: "Password berhasil diubah, silakan login kembali",
    });
  } catch (error) {
    return handleError(res, error, "resetPassword");
  }
};