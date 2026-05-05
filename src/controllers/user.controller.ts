import { Request, Response } from "express";
import { eq, and, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../../db";
import { users, wilayah, referensiTsl, penangkaran, verifikasiLog } from "../../db/schema";

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

// ─── GET /api/users ───────────────────────────────────────────────────────────

export async function getAllUsers(req: Request, res: Response): Promise<void> {
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
  } catch {
    res.status(500).json({ message: "Gagal mengambil data users" });
  }
}

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

export async function getUserById(req: Request, res: Response): Promise<void> {
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
  } catch {
    res.status(500).json({ message: "Gagal mengambil data user" });
  }
}

// ─── POST /api/users ──────────────────────────────────────────────────────────

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { nama, email, role, wilayahId, password, nomorTelepon, alamatKantor } = buildUserFields(req.body);

    if (!nama || !email || !role || !password) {
      res.status(400).json({ message: "Nama, email, role, dan password wajib diisi" });
      return;
    }

    const validRoles = ["admin_pusat", "bidang_wilayah", "seksi_wilayah"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ message: "Role tidak valid" });
      return;
    }

    if (role !== "admin_pusat" && !wilayahId) {
      res.status(400).json({ message: "wilayahId wajib diisi untuk role ini" });
      return;
    }

    if (wilayahId) {
      const parsedWilayahId = Number(wilayahId);
      if (isNaN(parsedWilayahId)) {
        res.status(400).json({ message: "wilayahId harus berupa angka" });
        return;
      }

      const wilayahData = await db
        .select()
        .from(wilayah)
        .where(eq(wilayah.id, parsedWilayahId))
        .limit(1);

      if (!wilayahData[0]) {
        res.status(400).json({ message: "wilayahId tidak ditemukan" });
        return;
      }

      if (role === "bidang_wilayah" && wilayahData[0].tipeWilayah !== "bidang") {
        res.status(400).json({ message: "bidang_wilayah hanya boleh memilih wilayah bertipe bidang (ID 1-3)" });
        return;
      }
      if (role === "seksi_wilayah" && wilayahData[0].tipeWilayah !== "seksi") {
        res.status(400).json({ message: "seksi_wilayah hanya boleh memilih wilayah bertipe seksi (ID 4-9)" });
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
  } catch {
    res.status(500).json({ message: "Gagal membuat user" });
  }
}

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────

export async function updateUser(req: Request, res: Response): Promise<void> {
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

    const { nama, email, role, wilayahId, nomorTelepon, alamatKantor } = buildUserFields(req.body);

    if (role) {
      const validRoles = ["admin_pusat", "bidang_wilayah", "seksi_wilayah"];
      if (!validRoles.includes(role)) {
        res.status(400).json({ message: "Role tidak valid" });
        return;
      }
    }

    if (wilayahId) {
      const parsedWilayahId = Number(wilayahId);
      if (isNaN(parsedWilayahId)) {
        res.status(400).json({ message: "wilayahId harus berupa angka" });
        return;
      }

      const wilayahData = await db
        .select()
        .from(wilayah)
        .where(eq(wilayah.id, parsedWilayahId))
        .limit(1);

      if (!wilayahData[0]) {
        res.status(400).json({ message: "wilayahId tidak ditemukan" });
        return;
      }

      const targetRole = role ?? existing.role;
      if (targetRole === "bidang_wilayah" && wilayahData[0].tipeWilayah !== "bidang") {
        res.status(400).json({ message: "bidang_wilayah hanya boleh memilih wilayah bertipe bidang (ID 1-3)" });
        return;
      }
      if (targetRole === "seksi_wilayah" && wilayahData[0].tipeWilayah !== "seksi") {
        res.status(400).json({ message: "seksi_wilayah hanya boleh memilih wilayah bertipe seksi (ID 4-9)" });
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
  } catch {
    res.status(500).json({ message: "Gagal memperbarui user" });
  }
}

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────

export async function deleteUser(req: Request, res: Response): Promise<void> {
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
      .set({ verifikasiOleh: null })
      .where(eq(verifikasiLog.verifikasiOleh, id));

    await db.delete(users).where(eq(users.id, id));
    res.status(200).json({ message: "User berhasil dihapus" });
  } catch (error) {
    console.error("[ERROR] deleteUser:", error);
    res.status(500).json({ message: "Gagal menghapus user" });
  }
}

// ─── PUT /api/users/:id/reset-password ───────────────────────────────────────

export async function adminResetPassword(req: Request, res: Response): Promise<void> {
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
  } catch {
    res.status(500).json({ message: "Gagal mereset password" });
  }
}