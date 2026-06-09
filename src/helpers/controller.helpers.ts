import { Response } from "express";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "../../db";

// Gunakan AuthRequest dari middleware agar tipe user konsisten di seluruh app
import { AuthRequest } from "../middlewares/auth.middleware";

type TableWithIdAndCreatedBy = {
  id: import("drizzle-orm/pg-core").PgColumn;
  createdBy: import("drizzle-orm/pg-core").PgColumn;
};

// Tabel yang mendukung soft-delete via pendingChanges (referensiTsl, penangkaran, dll.)
type TableWithPendingApproval = TableWithIdAndCreatedBy & {
  statusVerifikasi: import("drizzle-orm/pg-core").PgColumn;
  pendingChanges: import("drizzle-orm/pg-core").PgColumn;
  updatedAt: import("drizzle-orm/pg-core").PgColumn;
};

export const isNotOwner = (role, createdBy, userId) => {
  if (role === "admin_pusat") return false;
  if (role === "bidang_wilayah") return false;
  return createdBy !== userId;
};

export async function validateUniqueNomorSk(
  table: { id: any; nomorSk: any },
  nomorSk: unknown,
  excludeId?: number
) {
  if (nomorSk === undefined || nomorSk === null || nomorSk === "") return null;

  const whereClause = excludeId
    ? and(eq(table.nomorSk, nomorSk as string), ne(table.id, excludeId))
    : eq(table.nomorSk, nomorSk as string);

  const existing = await db
    .select({ id: table.id })
    .from(table as never)
    .where(whereClause)
    .limit(1);

  return existing.length > 0
    ? "Nomor SK sudah terdaftar. Masukkan beberapa referensi TSL dalam satu data SK, bukan membuat nomor SK berulang."
    : null;
}
type FindByIdFn<T> = (id: number) => Promise<T | null | undefined>;

export async function bulkDeleteHandler<T extends { createdBy: number | null }>(
  req: AuthRequest,
  res: Response,
  table: TableWithPendingApproval,
  findById: FindByIdFn<T>,
  entityName: string
): Promise<Response> {
  const { ids } = req.body;

  // Validasi ids
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: "ids wajib diisi dan harus berupa array",
    });
  }

  const numericIds = ids.map(Number).filter((id) => !Number.isNaN(id));
  if (numericIds.length !== ids.length) {
    return res.status(400).json({
      success: false,
      message: "Semua id harus berupa angka",
    });
  }

  // Pastikan semua data ada (cek keberadaan untuk memberi pesan yang tepat)
  const dataList = await Promise.all(numericIds.map((id) => findById(id)));
  const missing = dataList.some((d) => !d);
  if (missing) {
    return res.status(404).json({
      success: false,
      message: `Beberapa data ${entityName} tidak ditemukan`,
    });
  }

  // bidang_wilayah: ajukan penghapusan, tidak hard delete
  if (req.user?.role === "bidang_wilayah") {
    await db
      .update(table as never)
      .set({
        statusVerifikasi: "pending",
        pendingChanges: { _action: "delete", diajukanOleh: req.user.id } as never,
        updatedAt: new Date(),
      })
      .where(inArray(table.id, numericIds));

    return res.status(200).json({
      success: true,
      message: `${numericIds.length} pengajuan penghapusan ${entityName} dikirim, menunggu persetujuan Admin Pusat`,
    });
  }

  // Role selain admin/bidang: pertahankan ownership check lama
  if (req.user?.role !== "admin_pusat") {
    const notOwned = dataList.some((d) => !d || d.createdBy !== req.user?.id);
    if (notOwned) {
      return res.status(403).json({
        success: false,
        message: "Beberapa data bukan milik Anda",
      });
    }
  }

  // admin_pusat (atau pemilik valid) → hard delete
  await db.delete(table as never).where(inArray(table.id, numericIds));


  return res.status(200).json({
    success: true,
    message: `${numericIds.length} data ${entityName} berhasil dihapus`,
  });
}

export function validateWilayahMapping(bidangId: number | null | undefined, seksiId: number | null | undefined): string | null {
  if (!bidangId || !seksiId) return null;
  const mapping: Record<number, number[]> = {
    1: [4, 5], // Bogor: Serang, Bogor
    2: [6, 7], // Soreang: Soreang, Purwakarta
    3: [8, 9], // Ciamis: Garut, Tasikmalaya
  };
  if (!mapping[bidangId]?.includes(seksiId)) {
    return "Seksi wilayah yang dipilih tidak sesuai dengan bidang wilayah";
  }
  return null;
}

// ─── handleError ──────────────────────────────────────────────────────────────

export const handleError = (
  res: Response,
  error: unknown,
  context: string,
  customMessage: string = "Terjadi kesalahan server"
) => {
  const actualError = (error as any)?.cause || error;
  const dbError = actualError as { code?: string; constraint?: string; detail?: string };

  if (dbError.code === "23505") {
    let constraintMessage = "Data duplikat tidak diperbolehkan";
    
    if (dbError.constraint?.includes("nama_daerah") || dbError.detail?.includes("nama_daerah")) {
      constraintMessage = "Nama daerah sudah terdaftar";
    } else if (dbError.constraint?.includes("nomor_sk") || dbError.detail?.includes("nomor_sk")) {
      constraintMessage = "Nomor SK sudah terdaftar. Masukkan beberapa referensi TSL dalam satu data SK, bukan membuat nomor SK berulang.";
    }

    return res.status(409).json({
      success: false,
      message: constraintMessage,
    });
  }

  console.error(`[${context}] Server Error:`, error);
  return res.status(500).json({
    success: false,
    message: customMessage,
  });
};
