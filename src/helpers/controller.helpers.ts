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
  return role === "bidang_wilayah" && createdBy !== userId;
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

  // Cek ownership jika bidang_wilayah
  if (req.user?.role === "bidang_wilayah") {
    const dataList = await Promise.all(numericIds.map((id) => findById(id)));
    const notOwned = dataList.some((d) => !d || d.createdBy !== req.user?.id);

    if (notOwned) {
      return res.status(403).json({
        success: false,
        message: "Beberapa data tidak ditemukan atau bukan milik Anda",
      });
    }
  }

  await db.delete(table as never).where(inArray(table.id, numericIds));

  return res.status(200).json({
    success: true,
    message: `${numericIds.length} data ${entityName} berhasil dihapus`,
  });
}

// ─── handleError ──────────────────────────────────────────────────────────────

export const handleError = (
  res: Response,
  error: unknown,
  context: string,
  customMessage: string = "Terjadi kesalahan server"
) => {
  console.error(`[${context}]`, error);

  return res.status(500).json({
    success: false,
    message: customMessage,
  });
};