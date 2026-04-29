import { Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index";
import { penangkaran } from "../../db/schema";
import { AuthRequest } from "../middlewares/auth.middleware";

const buildPenangkaranFields = (body: Record<string, unknown>) => ({
  nomor: body.nomor as string,
  namaPenangkaran: body.namaPenangkaran as string,
  nomorSk: body.nomorSk as string,
  tanggalSk: body.tanggalSk ? new Date(body.tanggalSk as string) : null,
  penerbit: body.penerbit as string,
  akhirMasaBerlaku: body.akhirMasaBerlaku
    ? new Date(body.akhirMasaBerlaku as string)
    : null,
  namaDirektur: body.namaDirektur as string,
  nomorTelepon: body.nomorTelepon as string,
  bidangWilayahId: body.bidangWilayahId ? Number(body.bidangWilayahId) : null,
  seksiWilayahId: body.seksiWilayahId ? Number(body.seksiWilayahId) : null,
  alamatKantor: body.alamatKantor as string,
  alamatPenangkaran: body.alamatPenangkaran as string,
  koordinatLokasi: body.koordinatLokasi as string,
  tslId: body.tslId ? Number(body.tslId) : null,
});

const withRelations = {
  bidangWilayah: true,
  seksiWilayah: true,
  tsl: true,
  createdBy: {
    columns: { id: true, nama: true, role: true },
  },
} as const;
const findPenangkaranById = async (id: number) => {
  return await db.query.penangkaran.findFirst({
    where: eq(penangkaran.id, id),
  });
};

const isNotOwner = (
  role: string | undefined,
  createdBy: number | null,
  userId: number | undefined
): boolean => {
  return role === "bidang_wilayah" && createdBy !== userId;
};
export const getAllPenangkaran = async (req: AuthRequest, res: Response) => {
  try {
    const data = await db.query.penangkaran.findMany({
      orderBy: desc(penangkaran.createdAt),
      with: withRelations,
    });

    return res.status(200).json({
      success: true,
      message: "Data penangkaran berhasil diambil",
      data,
    });
  } catch (error) {
    console.error("Get all penangkaran error:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};

export const getPenangkaranById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const data = await db.query.penangkaran.findFirst({
      where: eq(penangkaran.id, Number(id)),
      with: {
        ...withRelations,
        updatedBy: {
          columns: { id: true, nama: true, role: true },
        },
      },
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Data penangkaran tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data penangkaran berhasil diambil",
      data,
    });
  } catch (error) {
    console.error("Get penangkaran by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};

export const createPenangkaran = async (req: AuthRequest, res: Response) => {
  try {
    const { namaPenangkaran } = req.body;

    if (!namaPenangkaran) {
      return res.status(400).json({
        success: false,
        message: "Nama penangkaran wajib diisi",
      });
    }

    const statusVerifikasi =
      req.user?.role === "admin_pusat" ? "disetujui" : "pending";

    const [data] = await db
      .insert(penangkaran)
      .values({
        ...buildPenangkaranFields(req.body),
        statusVerifikasi,
        createdBy: req.user?.id,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message:
        statusVerifikasi === "pending"
          ? "Data penangkaran berhasil ditambahkan, menunggu verifikasi Admin Pusat"
          : "Data penangkaran berhasil ditambahkan",
      data,
    });
  } catch (error) {
    console.error("Create penangkaran error:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};
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

    const statusVerifikasi =
      req.user?.role === "admin_pusat" ? existing.statusVerifikasi : "pending";

    const [data] = await db
      .update(penangkaran)
      .set({
        ...buildPenangkaranFields(req.body),
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
    console.error("Update penangkaran error:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

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

    return res.status(200).json({
      success: true,
      message: "Data penangkaran berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete penangkaran error:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};
