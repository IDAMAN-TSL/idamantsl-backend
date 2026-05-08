import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { referensiTsl, users } from "../../db/schema";

interface AuthUser {
  id: number;
  role: "admin_pusat" | "bidang_wilayah" | "seksi_wilayah";
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

const VALID_JENIS = ["tumbuhan", "satwa_liar"];

const isNotOwner = (
  role: string | undefined,
  createdBy: number | null,
  userId: number | undefined
): boolean => {
  return role === "bidang_wilayah" && createdBy !== userId;
};

async function findReferensiById(id: number) {
  const result = await db
    .select()
    .from(referensiTsl)
    .where(eq(referensiTsl.id, id))
    .limit(1);
  return result[0] ?? null;
}

function buildReferensiFields(body: Request["body"]) {
  const {
    nomor,
    namaDaerah,
    jenis,
    kingdom,
    divisi,
    kelas,
    ordo,
    famili,
    genus,
    spesies,
    statusPerlindunganNasional,
    statusCites,
    statusIucn,
    catatanVerifikasi,
  } = body;

  return {
    nomor,
    namaDaerah,
    jenis,
    kingdom,
    divisi,
    kelas,
    ordo,
    famili,
    genus,
    spesies,
    statusPerlindunganNasional,
    statusCites,
    statusIucn,
    catatanVerifikasi,
  };
}

const SELECT_FIELDS = {
  id: referensiTsl.id,
  nomor: referensiTsl.nomor,
  namaDaerah: referensiTsl.namaDaerah,
  jenis: referensiTsl.jenis,
  kingdom: referensiTsl.kingdom,
  divisi: referensiTsl.divisi,
  kelas: referensiTsl.kelas,
  ordo: referensiTsl.ordo,
  famili: referensiTsl.famili,
  genus: referensiTsl.genus,
  spesies: referensiTsl.spesies,
  statusPerlindunganNasional: referensiTsl.statusPerlindunganNasional,
  statusCites: referensiTsl.statusCites,
  statusIucn: referensiTsl.statusIucn,
  statusVerifikasi: referensiTsl.statusVerifikasi,
  catatanVerifikasi: referensiTsl.catatanVerifikasi,
  // Diperlukan oleh frontend non-admin untuk mendeteksi jenis pengajuan
  // (Tambah / Perbarui / Hapus) tanpa akses ke /api/verifikasi/*
  pendingChanges: referensiTsl.pendingChanges,
  createdBy: referensiTsl.createdBy,
  namaInputor: users.nama,
  createdAt: referensiTsl.createdAt,
  updatedAt: referensiTsl.updatedAt,
};

export async function getAllReferensi(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { statusVerifikasi } = req.query;
    const validStatus = ["pending", "disetujui", "ditolak"];
    if (statusVerifikasi && !validStatus.includes(statusVerifikasi as string)) {
      res
        .status(400)
        .json({
          message:
            "statusVerifikasi tidak valid. Gunakan: pending, disetujui, atau ditolak",
        });
      return;
    }
    const query = db
      .select(SELECT_FIELDS)
      .from(referensiTsl)
      .leftJoin(users, eq(referensiTsl.createdBy, users.id));

    const result = statusVerifikasi
      ? await query
          .where(
            eq(
              referensiTsl.statusVerifikasi,
              statusVerifikasi as "pending" | "disetujui" | "ditolak",
            ),
          )
          .orderBy(referensiTsl.createdAt)
      : await query.orderBy(referensiTsl.createdAt);

    res.status(200).json({ data: result });
  } catch {
    res.status(500).json({ message: "Gagal mengambil data referensi TSL" });
  }
}

export async function getReferensiById(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID tidak valid" });
      return;
    }

    const result = await db
      .select(SELECT_FIELDS)
      .from(referensiTsl)
      .leftJoin(users, eq(referensiTsl.createdBy, users.id))
      .where(eq(referensiTsl.id, id))
      .limit(1);

    if (!result[0]) {
      res.status(404).json({ message: "Referensi TSL tidak ditemukan" });
      return;
    }

    res.status(200).json({ data: result[0] });
  } catch {
    res.status(500).json({ message: "Gagal mengambil data referensi TSL" });
  }
}

export async function createReferensi(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const user = req.user!;
    const fields = buildReferensiFields(req.body);

    if (!fields.namaDaerah || !fields.jenis) {
      res.status(400).json({ message: "namaDaerah dan jenis wajib diisi" });
      return;
    }

    if (fields.jenis && !VALID_JENIS.includes(fields.jenis)) {
      res.status(400).json({ message: "Jenis TSL tidak valid" });
      return;
    }

    const statusVerifikasi =
      user.role === "admin_pusat" ? "disetujui" : "pending";

    const [newData] = await db
      .insert(referensiTsl)
      .values({ ...fields, statusVerifikasi, createdBy: user.id })
      .returning();

    res
      .status(201)
      .json({ message: "Referensi TSL berhasil ditambahkan", data: newData });
  } catch {
    res.status(500).json({ message: "Gagal menambahkan referensi TSL" });
  }
}

export async function updateReferensi(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID tidak valid" });
      return;
    }

    const user = req.user!;
    const existing = await findReferensiById(id);

    if (!existing) {
      res.status(404).json({ message: "Referensi TSL tidak ditemukan" });
      return;
    }

    if (isNotOwner(user.role, existing.createdBy, user.id)) {
      res
        .status(403)
        .json({ message: "Tidak memiliki akses untuk mengubah data ini" });
      return;
    }

    if (user.role === "bidang_wilayah") {
      if (existing.statusVerifikasi === "pending") {
        res.status(403).json({
          message: "Data sedang menunggu persetujuan admin, tidak bisa diubah",
        });
        return;
      }
      if (existing.statusVerifikasi === "ditolak") {
        res.status(403).json({
          message: "Data ditolak oleh admin",
          catatanVerifikasi: existing.catatanVerifikasi,
        });
        return;
      }

      const fields = buildReferensiFields(req.body);
      if (fields.jenis && !VALID_JENIS.includes(fields.jenis)) {
        res.status(400).json({ message: "Jenis TSL tidak valid" });
        return;
      }

      const [updated] = await db
        .update(referensiTsl)
        .set({
          pendingChanges: fields,
          statusVerifikasi: "pending",
          createdBy: existing.createdBy ?? user.id,
          updatedAt: new Date(),
        })
        .where(eq(referensiTsl.id, id))
        .returning();

      res
        .status(200)
        .json({
          message: "Perubahan telah diajukan, menunggu persetujuan admin",
          data: updated,
        });
      return;
    }

    // admin_pusat → langsung update
    const fields = buildReferensiFields(req.body);

    if (fields.jenis && !VALID_JENIS.includes(fields.jenis)) {
      res.status(400).json({ message: "Jenis TSL tidak valid" });
      return;
    }

    const updateData: Partial<typeof referensiTsl.$inferInsert> = {};
    if (fields.nomor !== undefined) updateData.nomor = fields.nomor;
    if (fields.namaDaerah) updateData.namaDaerah = fields.namaDaerah;
    if (fields.jenis) updateData.jenis = fields.jenis;
    if (fields.kingdom !== undefined) updateData.kingdom = fields.kingdom;
    if (fields.divisi !== undefined) updateData.divisi = fields.divisi;
    if (fields.kelas !== undefined) updateData.kelas = fields.kelas;
    if (fields.ordo !== undefined) updateData.ordo = fields.ordo;
    if (fields.famili !== undefined) updateData.famili = fields.famili;
    if (fields.genus !== undefined) updateData.genus = fields.genus;
    if (fields.spesies !== undefined) updateData.spesies = fields.spesies;
    if (fields.statusPerlindunganNasional !== undefined)
      updateData.statusPerlindunganNasional = fields.statusPerlindunganNasional;
    if (fields.statusCites !== undefined)
      updateData.statusCites = fields.statusCites;
    if (fields.statusIucn !== undefined)
      updateData.statusIucn = fields.statusIucn;
    if (fields.catatanVerifikasi !== undefined)
      updateData.catatanVerifikasi = fields.catatanVerifikasi;

    const [updated] = await db
      .update(referensiTsl)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(referensiTsl.id, id))
      .returning();

    res
      .status(200)
      .json({ message: "Referensi TSL berhasil diperbarui", data: updated });
  } catch {
    res.status(500).json({ message: "Gagal memperbarui referensi TSL" });
  }
}

export async function deleteReferensi(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID tidak valid" });
      return;
    }

    const user = req.user!;
    const existing = await findReferensiById(id);

    if (!existing) {
      res.status(404).json({ message: "Referensi TSL tidak ditemukan" });
      return;
    }

    if (user.role === "bidang_wilayah") {
      if (existing.statusVerifikasi === "pending") {
        res
          .status(403)
          .json({
            message:
              "Data sedang menunggu persetujuan admin, tidak bisa dihapus",
          });
        return;
      }
      if (existing.statusVerifikasi === "ditolak") {
        res.status(403).json({
          message: "Data ditolak oleh admin",
          catatanVerifikasi: existing.catatanVerifikasi,
        });
        return;
      }

      await db
        .update(referensiTsl)
        .set({
          pendingChanges: { _action: "delete" },
          statusVerifikasi: "pending",
          createdBy: existing.createdBy ?? user.id,
          updatedAt: new Date(),
        })
        .where(eq(referensiTsl.id, id));

      res
        .status(200)
        .json({
          message:
            "Pengajuan penghapusan telah dikirim, menunggu persetujuan admin",
        });
      return;
    }

    await db.delete(referensiTsl).where(eq(referensiTsl.id, id));
    res.status(200).json({ message: "Referensi TSL berhasil dihapus" });
  } catch {
    res.status(500).json({ message: "Gagal menghapus referensi TSL" });
  }
}

