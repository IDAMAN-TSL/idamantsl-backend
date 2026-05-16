import { Response } from "express";
import { inArray } from "drizzle-orm";
import { db } from "../../db";

// Gunakan AuthRequest dari middleware agar tipe user konsisten di seluruh app
import { AuthRequest } from "../middlewares/auth.middleware";

// ─── Tipe generik untuk table Drizzle yang punya id & createdBy ───────────────

type TableWithIdAndCreatedBy = {
  id: import("drizzle-orm/pg-core").PgColumn;
  createdBy: import("drizzle-orm/pg-core").PgColumn;
};

// ─── isNotOwner ───────────────────────────────────────────────────────────────

export const isNotOwner = (
  role: string | undefined,
  createdBy: number | null,
  userId: number | undefined
): boolean => {
  // Semua role bidang_wilayah diizinkan mengubah/menghapus, namun akan masuk status pending
  return false;
};

// ─── bulkDeleteHandler ────────────────────────────────────────────────────────
// Digunakan oleh penangkaran dan referensi-tsl (dan tabel lain di masa depan)

type FindByIdFn<T> = (id: number) => Promise<T | null | undefined>;

export async function bulkDeleteHandler<T extends { createdBy: number | null }>(
  req: AuthRequest,
  res: Response,
  table: TableWithIdAndCreatedBy,
  findById: FindByIdFn<T>,
  entityName: string // e.g. "penangkaran" | "referensi TSL"
): Promise<Response> {
  const { ids } = req.body;

  // Validasi ids
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: "ids wajib diisi dan harus berupa array",
    });
  }

  const numericIds = ids.map(Number).filter((id) => !isNaN(id));
  if (numericIds.length !== ids.length) {
    return res.status(400).json({
      success: false,
      message: "Semua id harus berupa angka",
    });
  }

  // Cek ownership jika bidang_wilayah (Dihapus: bidang_wilayah kini bisa hapus dengan status pending)
  if (req.user?.role === "bidang_wilayah") {
    // Validasi apakah ada data yang sedang pending
    const dataList = await Promise.all(numericIds.map((id) => findById(id)));
    const hasPending = dataList.some((d: any) => d && d.statusVerifikasi === "pending");
    
    if (hasPending) {
      return res.status(403).json({
        success: false,
        message: "Beberapa data sedang menunggu persetujuan admin, tidak bisa dihapus",
      });
    }

    await db.update(table as any).set({
      pendingChanges: { _action: "delete", diajukanOleh: req.user.id },
      statusVerifikasi: "pending",
      updatedAt: new Date(),
    }).where(inArray(table.id, numericIds));

    return res.status(200).json({
      success: true,
      message: `Pengajuan penghapusan ${numericIds.length} data ${entityName} telah dikirim, menunggu persetujuan admin`,
    });
  }

  await db.delete(table as any).where(inArray(table.id, numericIds));

  return res.status(200).json({
    success: true,
    message: `${numericIds.length} data ${entityName} berhasil dihapus`,
  });
}