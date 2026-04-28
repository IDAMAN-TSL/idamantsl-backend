import { Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index";
import { penangkaran } from "../../db/schema";
import { AuthRequest } from "../middlewares/auth.middleware";

export const getAllPenangkaran = async (req: AuthRequest, res: Response) => {
  try {
    const data = await db.query.penangkaran.findMany({
      orderBy: desc(penangkaran.createdAt),
      with: {
        bidangWilayah: true,
        seksiWilayah: true,
        tsl: true,
        createdBy: {
          columns: { id: true, nama: true, role: true },
        },
      },
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
        bidangWilayah: true,
        seksiWilayah: true,
        tsl: true,
        createdBy: {
          columns: { id: true, nama: true, role: true },
        },
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
    const {
      nomor,
      namaPenangkaran,
      nomorSk,
      tanggalSk,
      penerbit,
      akhirMasaBerlaku,
      namaDirektur,
      nomorTelepon,
      bidangWilayahId,
      seksiWilayahId,
      alamatKantor,
      alamatPenangkaran,
      koordinatLokasi,
      tslId,
    } = req.body;

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
        nomor,
        namaPenangkaran,
        nomorSk,
        tanggalSk: tanggalSk ? new Date(tanggalSk) : null,
        penerbit,
        akhirMasaBerlaku: akhirMasaBerlaku ? new Date(akhirMasaBerlaku) : null,
        namaDirektur,
        nomorTelepon,
        bidangWilayahId: bidangWilayahId ? Number(bidangWilayahId) : null,
        seksiWilayahId: seksiWilayahId ? Number(seksiWilayahId) : null,
        alamatKantor,
        alamatPenangkaran,
        koordinatLokasi,
        tslId: tslId ? Number(tslId) : null,
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

    const existing = await db.query.penangkaran.findFirst({
      where: eq(penangkaran.id, Number(id)),
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Data penangkaran tidak ditemukan",
      });
    }
    if (
      req.user?.role === "bidang_wilayah" &&
      existing.createdBy !== req.user?.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki izin mengubah data ini",
      });
    }

    const {
      nomor,
      namaPenangkaran,
      nomorSk,
      tanggalSk,
      penerbit,
      akhirMasaBerlaku,
      namaDirektur,
      nomorTelepon,
      bidangWilayahId,
      seksiWilayahId,
      alamatKantor,
      alamatPenangkaran,
      koordinatLokasi,
      tslId,
    } = req.body;
    const statusVerifikasi =
      req.user?.role === "admin_pusat" ? existing.statusVerifikasi : "pending";

    const [data] = await db
      .update(penangkaran)
      .set({
        nomor,
        namaPenangkaran,
        nomorSk,
        tanggalSk: tanggalSk ? new Date(tanggalSk) : null,
        penerbit,
        akhirMasaBerlaku: akhirMasaBerlaku ? new Date(akhirMasaBerlaku) : null,
        namaDirektur,
        nomorTelepon,
        bidangWilayahId: bidangWilayahId ? Number(bidangWilayahId) : null,
        seksiWilayahId: seksiWilayahId ? Number(seksiWilayahId) : null,
        alamatKantor,
        alamatPenangkaran,
        koordinatLokasi,
        tslId: tslId ? Number(tslId) : null,
        statusVerifikasi,
        updatedBy: req.user?.id,
        updatedAt: new Date(),
      })
      .where(eq(penangkaran.id, Number(id)))
      .returning();

    return res.status(200).json({
      success: true,
      message:
        statusVerifikasi === "pending"
          ? "Data penangkaran berhasil diubah, menunggu verifikasi Admin Pusat"
          : "Data penangkaran berhasil diubah",
      data,
    });
  } catch (error) {
    console.error("Update penangkaran error:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};

export const deletePenangkaran = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await db.query.penangkaran.findFirst({
      where: eq(penangkaran.id, Number(id)),
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Data penangkaran tidak ditemukan",
      });
    }

    if (
      req.user?.role === "bidang_wilayah" &&
      existing.createdBy !== req.user?.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki izin menghapus data ini",
      });
    }

    await db
      .delete(penangkaran)
      .where(eq(penangkaran.id, Number(id)));

    return res.status(200).json({
      success: true,
      message: "Data penangkaran berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete penangkaran error:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};