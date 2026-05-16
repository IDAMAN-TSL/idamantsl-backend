import { Response } from "express";
import { inArray } from "drizzle-orm";
import { db } from "../../db";

// Gunakan AuthRequest dari middleware agar tipe user konsisten di seluruh app
import { AuthRequest } from "../middlewares/auth.middleware";

// ─── Tipe generik untuk table Drizzle ─────────────────────────────────────────

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

// ─── isNotOwner ───────────────────────────────────────────────────────────────
//
// Aturan baru:
// - admin_pusat       → boleh semua (return false)
// - bidang_wilayah    → boleh menginisiasi perubahan pada data MANAPUN
//                        (perubahan tetap masuk antrean approval), jadi pengecekan
//                        ownership dimatikan supaya tidak menghalangi UI/controller
//                        memproses request.
// - role lain         → diblokir kalau bukan pemilik (perilaku lama).

export const isNotOwner = (
  role: string | undefined,
  createdBy: number | null,
  userId: number | undefined
): boolean => {
  if (role === "admin_pusat") return false;
  if (role === "bidang_wilayah") return false;
  return createdBy !== userId;
};

// ─── bulkDeleteHandler ────────────────────────────────────────────────────────
// Digunakan oleh penangkaran dan referensi-tsl (dan tabel lain di masa depan)
//
// Aturan:
// - admin_pusat       → hard delete langsung.
// - bidang_wilayah    → soft delete: status diubah jadi "pending" dan
//                        pendingChanges diisi { _action: "delete", diajukanOleh }.
// - role lain         → ownership check seperti sebelumnya.

type FindByIdFn<T> = (id: number) => Promise<T | null | undefined>;

export async function bulkDeleteHandler<T extends { createdBy: number | null }>(
  req: AuthRequest,
  res: Response,
  table: TableWithPendingApproval,
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
      } as never)
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
