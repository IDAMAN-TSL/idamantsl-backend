import { Request, Response } from "express";
import { eq, and, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../../db";
import { users, wilayah, referensiTsl, penangkaran, lembagaKonservasi, pengedaranDalamNegeri, pengedaranLuarNegeri, verifikasiLog } from "../../db/schema";

// ─── Helper Functions ────────────────────────────────────────────────────────

async function findUserById(id: number) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] ?? null;
}

function buildUserFields(body: Request["body"]) {
  const { nama, email, role, wilayahId, password, nomorTelepon, alamatKantor } = body;
  return { nama, email, role, wilayahId, password, nomorTelepon, alamatKantor };
}

const VALID_ROLES = ["admin_pusat", "bidang_wilayah", "seksi_wilayah"] as const;
type UserRole = typeof VALID_ROLES[number];

// ─── Validasi wilayahId untuk role tertentu ──────────────────────────────────
// Dipakai di createUser & updateUser. Mengembalikan { error, status } kalau
// invalid, atau null kalau OK.

async function validateWilayahForRole(
  wilayahId: unknown,
  role: string
): Promise<{ error: string; status: number } | null> {
  const parsedWilayahId = Number(wilayahId);
  if (isNaN(parsedWilayahId)) {
    return { error: "wilayahId harus berupa angka", status: 400 };
  }

  const wilayahData = await db
    .select()
    .from(wilayah)
    .where(eq(wilayah.id, parsedWilayahId))
    .limit(1);

  if (!wilayahData[0]) {
    return { error: "wilayahId tidak ditemukan", status: 400 };
  }

  if (role === "bidang_wilayah" && wilayahData[0].tipeWilayah !== "bidang") {
    return {
      error: "bidang_wilayah hanya boleh memilih wilayah bertipe bidang (ID 1-3)",
      status: 400,
    };
  }
  if (role === "seksi_wilayah" && wilayahData[0].tipeWilayah !== "seksi") {
    return {
      error: "seksi_wilayah hanya boleh memilih wilayah bertipe seksi (ID 4-9)",
      status: 400,
    };
  }

  return null;
}

// ─── Validasi password baru (untuk update; opsional) ─────────────────────────

function validateOptionalPassword(
  password: unknown
): { error: string; status: number } | null {
  if (password === undefined || password === null || password === "") return null;
  if (typeof password !== "string" || password.length < 8) {
    return { error: "Password minimal 8 karakter", status: 400 };
  }
  return null;
}

// ─── GET /api/users ───────────────────────────────────────────────────────────

export async function getAllUsers(req: Request, res: Response) {
  try {
    const result = await db
      .select({
        id: users.id,
        nama: users.nama,
        email: users.email,
        role: users.role,
        nomorTelepon: users.nomorTelepon,
        alamatKantor: users.alamatKantor,
        wilayahId: users.wilayahId,
        namaWilayah: wilayah.namaWilayah,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(wilayah, eq(users.wilayahId, wilayah.id))
      .orderBy(users.createdAt);

    res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error, "getAllUsers", "Gagal mengambil data users");
  }
}

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

export async function getUserById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID tidak valid" });
      return;
    }

    const result = await db
      .select({
        id: users.id,
        nama: users.nama,
        email: users.email,
        role: users.role,
        nomorTelepon: users.nomorTelepon,
        alamatKantor: users.alamatKantor,
        wilayahId: users.wilayahId,
        namaWilayah: wilayah.namaWilayah,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(wilayah, eq(users.wilayahId, wilayah.id))
      .where(eq(users.id, id))
      .limit(1);

    if (!result[0]) {
      res.status(404).json({ message: "User tidak ditemukan" });
      return;
    }

    res.status(200).json({ data: result[0] });
  } catch (error) {
    return handleError(res, error, "getUserById", "Gagal mengambil data user");
  }
}

// ─── POST /api/users ──────────────────────────────────────────────────────────

export async function createUser(req: Request, res: Response) {
  try {
    const { nama, email, role, wilayahId, password, nomorTelepon, alamatKantor } = buildUserFields(req.body);

    if (!nama || !email || !role || !password) {
      res.status(400).json({ message: "Nama, email, role, dan password wajib diisi" });
      return;
    }

    if (!VALID_ROLES.includes(role as UserRole)) {
      res.status(400).json({ message: "Role tidak valid" });
      return;
    }

    if (role !== "admin_pusat" && !wilayahId) {
      res.status(400).json({ message: "wilayahId wajib diisi untuk role ini" });
      return;
    }

    if (wilayahId) {
      const wilayahError = await validateWilayahForRole(wilayahId, role);
      if (wilayahError) {
        res.status(wilayahError.status).json({ message: wilayahError.error });
        return;
      }
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing[0]) {
      res.status(409).json({ message: "Email sudah terdaftar" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        nama,
        email,
        role,
        wilayahId: wilayahId ?? null,
        password: hashedPassword,
        nomorTelepon: nomorTelepon ?? null,
        alamatKantor: alamatKantor ?? null,
      })
      .returning({
        id: users.id,
        nama: users.nama,
        email: users.email,
        role: users.role,
        nomorTelepon: users.nomorTelepon,
        alamatKantor: users.alamatKantor,
        wilayahId: users.wilayahId,
        createdAt: users.createdAt,
      });

    res.status(201).json({ message: "User berhasil dibuat", data: newUser });
  } catch (error) {
    return handleError(res, error, "createUser", "Gagal membuat user");
  }
}

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────

export async function updateUser(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID tidak valid" });
      return;
    }

    const existing = await findUserById(id);
    if (!existing) {
      res.status(404).json({ message: "User tidak ditemukan" });
      return;
    }

    const { nama, email, role, wilayahId, password, nomorTelepon, alamatKantor } = buildUserFields(req.body);

    if (role && !VALID_ROLES.includes(role as UserRole)) {
      res.status(400).json({ message: "Role tidak valid" });
      return;
    }

    const passwordError = validateOptionalPassword(password);
    if (passwordError) {
      res.status(passwordError.status).json({ message: passwordError.error });
      return;
    }

    if (wilayahId) {
      const targetRole = role ?? existing.role;
      const wilayahError = await validateWilayahForRole(wilayahId, targetRole);
      if (wilayahError) {
        res.status(wilayahError.status).json({ message: wilayahError.error });
        return;
      }
    }

    if (email) {
      const duplicate = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, id)))
        .limit(1);

      if (duplicate[0]) {
        res.status(409).json({ message: "Email sudah digunakan user lain" });
        return;
      }
    }

    const updateData: Partial<typeof users.$inferInsert> = {};
    if (nama) updateData.nama = nama;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (wilayahId !== undefined) updateData.wilayahId = wilayahId;
    if (nomorTelepon !== undefined) updateData.nomorTelepon = nomorTelepon;
    if (alamatKantor !== undefined) updateData.alamatKantor = alamatKantor;

    // Password optional saat update. Hanya di-hash dan di-set kalau diisi.
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const [updated] = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        nama: users.nama,
        email: users.email,
        role: users.role,
        nomorTelepon: users.nomorTelepon,
        alamatKantor: users.alamatKantor,
        wilayahId: users.wilayahId,
        updatedAt: users.updatedAt,
      });

    res.status(200).json({ message: "User berhasil diperbarui", data: updated });
  } catch (error) {
    return handleError(res, error, "updateUser", "Gagal memperbarui user");
  }
}

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────

export async function deleteUser(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID tidak valid" });
      return;
    }

    const requesterId = (req as Request & { user?: { id: number } }).user?.id;
    if (requesterId === id) {
      res.status(400).json({ message: "Tidak bisa menghapus akun sendiri" });
      return;
    }

    const existing = await findUserById(id);
    if (!existing) {
      res.status(404).json({ message: "User tidak ditemukan" });
      return;
    }

    // Null-kan semua FK yang merujuk ke user ini sebelum hapus
    await db.update(referensiTsl)
      .set({ createdBy: null })
      .where(eq(referensiTsl.createdBy, id));

    await db.update(penangkaran)
      .set({ createdBy: null })
      .where(eq(penangkaran.createdBy, id));

    await db.update(penangkaran)
      .set({ updatedBy: null })
      .where(eq(penangkaran.updatedBy, id));

    await db.update(verifikasiLog)
      .set({ createdBy: null })
      .where(eq(verifikasiLog.createdBy, id));

    await db.update(verifikasiLog)
      .set({ verifikasiOleh: null })
      .where(eq(verifikasiLog.verifikasiOleh, id));

    await db.delete(users).where(eq(users.id, id));
    res.status(200).json({ message: "User berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting user:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Gagal menghapus user: ${detail}` });
  }
}

// ─── PUT /api/users/:id/reset-password ───────────────────────────────────────

export async function adminResetPassword(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID tidak valid" });
      return;
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ message: "Password baru minimal 8 karakter" });
      return;
    }

    const existing = await findUserById(id);
    if (!existing) {
      res.status(404).json({ message: "User tidak ditemukan" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id));

    res.status(200).json({ message: "Password berhasil direset oleh admin" });
  } catch (error) {
    return handleError(res, error, "adminResetPassword", "Gagal mereset password");
  }
}