import { Response } from "express";
import { eq, desc, type InferInsertModel } from "drizzle-orm";
import { db } from "../../db/index";
import { penangkaran } from "../../db/schema";
import { AuthRequest } from "../middlewares/auth.middleware";
import { isNotOwner, bulkDeleteHandler } from "../helpers/controller.helpers";
import { deleteFile, uploadFile } from "../helpers/azure-storage";

type PenangkaranInsert = InferInsertModel<typeof penangkaran>;

const buildPenangkaranFields = (body: Record<string, unknown>) => ({
  ...("namaPenangkaran" in body && { namaPenangkaran: body.namaPenangkaran as string }),
  ...("nomorSk" in body && { nomorSk: (body.nomorSk as string) ?? null }),
  ...("tanggalSk" in body && { tanggalSk: body.tanggalSk ? new Date(body.tanggalSk as string) : null }),
  ...("fileSk" in body && { fileSk: (body.fileSk as string) ?? null }),
  ...("penerbit" in body && { penerbit: (body.penerbit as string) ?? null }),
  ...("akhirMasaBerlaku" in body && { akhirMasaBerlaku: body.akhirMasaBerlaku ? new Date(body.akhirMasaBerlaku as string) : null }),
  ...("namaDirektur" in body && { namaDirektur: (body.namaDirektur as string) ?? null }),
  ...("nomorTelepon" in body && { nomorTelepon: (body.nomorTelepon as string) ?? null }),
  ...("bidangWilayahId" in body && { bidangWilayahId: body.bidangWilayahId ? Number(body.bidangWilayahId) : null }),
  ...("seksiWilayahId" in body && { seksiWilayahId: body.seksiWilayahId ? Number(body.seksiWilayahId) : null }),
  ...("alamatKantor" in body && { alamatKantor: (body.alamatKantor as string) ?? null }),
  ...("alamatPenangkaran" in body && { alamatPenangkaran: (body.alamatPenangkaran as string) ?? null }),
  ...("koordinatLokasi" in body && { koordinatLokasi: (body.koordinatLokasi as string) ?? null }),
  ...("tslId" in body && { tslId: body.tslId ? Number(body.tslId) : null }),
  ...("statusPerlindunganNasional" in body && { statusPerlindunganNasional: (body.statusPerlindunganNasional as PenangkaranInsert["statusPerlindunganNasional"]) ?? null }),
  ...("statusCites" in body && { statusCites: (body.statusCites as PenangkaranInsert["statusCites"]) ?? null }),
  ...("statusIucn" in body && { statusIucn: (body.statusIucn as PenangkaranInsert["statusIucn"]) ?? null }),
  ...("jantan" in body && { jantan: body.jantan !== null ? Number(body.jantan) : null }),
  ...("betina" in body && { betina: body.betina !== null ? Number(body.betina) : null }),
});

const withRelations = {
  bidangWilayah: true,
  seksiWilayah: true,
  tsl: true,
  createdBy: {
    columns: { id: true, nama: true, role: true },
  },
} as const;

// ─── findPenangkaranById ──────────────────────────────────────────────────────

const findPenangkaranById = async (id: number) => {
  return await db.query.penangkaran.findFirst({
    where: eq(penangkaran.id, id),
  });
};

// ─── GET /api/penangkaran ─────────────────────────────────────────────────────

export const getAllPenangkaran = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const validStatus = ["pending", "disetujui", "ditolak"];

    if (status && !validStatus.includes(status as string)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid. Gunakan: pending, disetujui, atau ditolak",
      });
    }

    const data = await db.query.penangkaran.findMany({
      where: status
        ? eq(penangkaran.statusVerifikasi, status as "pending" | "disetujui" | "ditolak")
        : undefined,
      orderBy: desc(penangkaran.createdAt),
      with: withRelations,
    });

    return res.status(200).json({
      success: true,
      message: "Data penangkaran berhasil diambil",
      total: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// ─── GET /api/penangkaran/:id ─────────────────────────────────────────────────

export const getPenangkaranById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const data = await db.query.penangkaran.findFirst({
      where: eq(penangkaran.id, Number(id)),
      with: {
        ...withRelations,
        updatedBy: { columns: { id: true, nama: true, role: true } },
      },
    });

    if (!data) {
      return res.status(404).json({ success: false, message: "Data penangkaran tidak ditemukan" });
    }

    return res.status(200).json({
      success: true,
      message: "Data penangkaran berhasil diambil",
      data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// ─── POST /api/penangkaran ────────────────────────────────────────────────────

export const createPenangkaran = async (req: AuthRequest, res: Response) => {
  try {
    const { namaPenangkaran } = req.body;

    if (!namaPenangkaran) {
      return res.status(400).json({ success: false, message: "Nama penangkaran wajib diisi" });
    }
    let fileSk: string | null = null;
    if (req.file) {
      fileSk = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    }
    const statusVerifikasi = req.user?.role === "admin_pusat" ? "disetujui" : "pending";

    const [data] = await db
      .insert(penangkaran)
      .values({ ...buildPenangkaranFields(req.body), fileSk, statusVerifikasi, createdBy: req.user?.id })
      .returning();

    return res.status(201).json({
      success: true,
      message: statusVerifikasi === "pending"
        ? "Data penangkaran berhasil ditambahkan, menunggu verifikasi Admin Pusat"
        : "Data penangkaran berhasil ditambahkan",
      data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// ─── PUT /api/penangkaran/:id ─────────────────────────────────────────────────

export const updatePenangkaran = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await findPenangkaranById(Number(id));

    if (!existing) {
      return res.status(404).json({ success: false, message: "Data penangkaran tidak ditemukan" });
    }

    if (isNotOwner(req.user?.role, existing.createdBy, req.user?.id)) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki izin mengubah data ini" });
    }
    let fileSk = existing.fileSk;
    if (req.file) {
      // Hapus file lama di Azure jika ada
      if (existing.fileSk) {
        await deleteFile(existing.fileSk);
      }
      // Upload file baru
      fileSk = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    }
    const statusVerifikasi = req.user?.role === "admin_pusat" ? existing.statusVerifikasi : "pending";

    const [data] = await db
      .update(penangkaran)
      .set({
        ...buildPenangkaranFields(req.body),
        ...("fileSk" in req.body || req.file ? { fileSk } : {}),
        statusVerifikasi,
        updatedBy: req.user?.id,
        updatedAt: new Date(),
      })
      .where(eq(penangkaran.id, Number(id)))
      .returning();

    return res.status(200).json({
      success: true,
      message: statusVerifikasi === "pending"
        ? "Data penangkaran berhasil diubah, menunggu verifikasi Admin Pusat"
        : "Data penangkaran berhasil diubah",
      data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// ─── DELETE /api/penangkaran/:id ──────────────────────────────────────────────

export const deletePenangkaran = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await findPenangkaranById(Number(id));

    if (!existing) {
      return res.status(404).json({ success: false, message: "Data penangkaran tidak ditemukan" });
    }

    if (isNotOwner(req.user?.role, existing.createdBy, req.user?.id)) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki izin menghapus data ini" });
    }

    await db.delete(penangkaran).where(eq(penangkaran.id, Number(id)));

    return res.status(200).json({ success: true, message: "Data penangkaran berhasil dihapus" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// ─── DELETE /api/penangkaran/bulk ─────────────────────────────────────────────

export const bulkDeletePenangkaran = async (req: AuthRequest, res: Response) => {
  try {
    return await bulkDeleteHandler(req, res, penangkaran, findPenangkaranById, "penangkaran");
  } catch (error) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};