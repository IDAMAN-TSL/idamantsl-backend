import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  verifikasiLog,
  referensiTsl,
  penangkaran,
  pengedaranDalamNegeri,
  pengedaranLuarNegeri,
  lembagaKonservasi,
  users,
} from "../../db/schema";
import { handleError } from "../helpers/controller.helpers";

interface AuthUser {
  id: number;
  role: "admin_pusat" | "bidang_wilayah" | "seksi_wilayah";
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

type TabelTarget =
  | "referensi_tsl"
  | "penangkaran"
  | "pengedaran_dalam_negeri"
  | "pengedaran_luar_negeri"
  | "lembaga_konservasi";

type JenisPengajuan = "tambah" | "perbarui" | "hapus";

type TableDef = {
  find: (id: number) => Promise<Record<string, unknown> | null>;
  update: (id: number, data: Record<string, unknown>) => Promise<void>;
  delete: (id: number) => Promise<void>;
};

const TABLE_REGISTRY: Partial<Record<TabelTarget, TableDef>> = {
  referensi_tsl: {
    find: async (id) =>
      (await db.select().from(referensiTsl).where(eq(referensiTsl.id, id)).limit(1))[0] ?? null,
    update: async (id, data) =>
      void (await db.update(referensiTsl).set(data).where(eq(referensiTsl.id, id))),
    delete: async (id) =>
      void (await db.delete(referensiTsl).where(eq(referensiTsl.id, id))),
  },
  penangkaran: {
    find: async (id) =>
      (await db.select().from(penangkaran).where(eq(penangkaran.id, id)).limit(1))[0] ?? null,
    update: async (id, data) =>
      void (await db.update(penangkaran).set(data).where(eq(penangkaran.id, id))),
    delete: async (id) =>
      void (await db.delete(penangkaran).where(eq(penangkaran.id, id))),
  },
  pengedaran_dalam_negeri: {
    find: async (id) =>
      (await db.select().from(pengedaranDalamNegeri).where(eq(pengedaranDalamNegeri.id, id)).limit(1))[0] ?? null,
    update: async (id, data) =>
      void (await db.update(pengedaranDalamNegeri).set(data).where(eq(pengedaranDalamNegeri.id, id))),
    delete: async (id) =>
      void (await db.delete(pengedaranDalamNegeri).where(eq(pengedaranDalamNegeri.id, id))),
  },
  pengedaran_luar_negeri: {
    find: async (id) =>
      (await db.select().from(pengedaranLuarNegeri).where(eq(pengedaranLuarNegeri.id, id)).limit(1))[0] ?? null,
    update: async (id, data) =>
      void (await db.update(pengedaranLuarNegeri).set(data).where(eq(pengedaranLuarNegeri.id, id))),
    delete: async (id) =>
      void (await db.delete(pengedaranLuarNegeri).where(eq(pengedaranLuarNegeri.id, id))),
  },
  lembaga_konservasi: {
    find: async (id) =>
      (await db.select().from(lembagaKonservasi).where(eq(lembagaKonservasi.id, id)).limit(1))[0] ?? null,
    update: async (id, data) =>
      void (await db.update(lembagaKonservasi).set(data).where(eq(lembagaKonservasi.id, id))),
    delete: async (id) =>
      void (await db.delete(lembagaKonservasi).where(eq(lembagaKonservasi.id, id))),
  },
};

const VALID_TABEL = Object.keys(TABLE_REGISTRY) as TabelTarget[];

function getTableDef(tabel: TabelTarget): TableDef {
  const def = TABLE_REGISTRY[tabel];
  if (!def) throw new Error(`Tabel "${tabel}" tidak terdaftar di registry`);
  return def;
}

function getJenisPengajuan(
  pendingChanges: Record<string, unknown> | null
): JenisPengajuan {
  if (pendingChanges?._action === "delete") return "hapus";
  if (pendingChanges && Object.keys(pendingChanges).length > 0) return "perbarui";
  return "tambah";
}

// Ambil ID user yang mengajukan perubahan.
// Prioritas: pendingChanges.diajukanOleh > record.createdBy
function getDiajukanOleh(
  pendingChanges: Record<string, unknown> | null,
  fallbackCreatedBy: number | null
): number | null {
  const diajukan = pendingChanges?.diajukanOleh;
  if (typeof diajukan === "number") return diajukan;
  return fallbackCreatedBy;
}

// Bersihkan pendingChanges dari metadata internal sebelum diaplikasikan
// ke tabel target. Tabel target tidak punya kolom `_action` / `diajukanOleh`.
function sanitizePendingChanges(
  pendingChanges: Record<string, unknown> | null
): Record<string, unknown> {
  if (!pendingChanges) return {};
  const { _action: _drop1, diajukanOleh: _drop2, ...clean } = pendingChanges;
  return clean;
}

async function insertVerifikasiLog(
  tabelTarget: TabelTarget,
  targetId: number,
  status: "disetujui" | "ditolak" | "pending",
  jenisPengajuan: JenisPengajuan,
  diajukanOleh: number | null,  // ← ID bidang_wilayah yang mengajukan
  verifikasiOleh: number,        // ← ID admin_pusat yang memverifikasi
  catatan?: string | null
) {
  await db.insert(verifikasiLog).values({
    tabelTarget,
    targetId,
    status,
    jenisPengajuan,
    createdBy: diajukanOleh,   // ← kolom di DB tetap createdBy, nilainya dari record.createdBy
    verifikasiOleh,
    catatan: catatan ?? null,
  });
}

// ─── Helper: Validasi field dasar ────────────────────────────────────────────

function validateBaseFields(
  tabelTarget: unknown,
  targetId: unknown
): string | null {
  if (!tabelTarget || !targetId) return "tabelTarget dan targetId wajib diisi";
  if (!VALID_TABEL.includes(tabelTarget as TabelTarget)) return "tabelTarget tidak valid";
  return null;
}

// ─── Helper: Cari record dengan status pending ────────────────────────────────

async function findPendingRecord(
  tabel: TabelTarget,
  targetId: number
): Promise<{ record: Record<string, unknown> } | { error: string; status: number }> {
  const record = await getTableDef(tabel).find(targetId);
  if (!record) return { error: "Data tidak ditemukan", status: 404 };
  if (record.statusVerifikasi !== "pending") {
    return {
      error: `Data tidak dalam status pending (status saat ini: ${record.statusVerifikasi})`,
      status: 400,
    };
  }
  return { record };
}

// ─── Helper: Ambil nama inputor dari users ────────────────────────────────────
// DEPRECATED: Tidak digunakan lagi, diganti dengan userMap di getDataPending

async function getNamaInputor(createdBy: number | null): Promise<string | null> {
  if (!createdBy) return null;
  const result = await db
    .select({ nama: users.nama })
    .from(users)
    .where(eq(users.id, createdBy))
    .limit(1);
  return result[0]?.nama ?? null;
}

// ─── GET /api/verifikasi/pending ──────────────────────────────────────────────

export async function getDataPending(_req: AuthRequest, res: Response) {
  try {
    const [
      referensiPending,
      penangkaranPending,
      pengedaranDnPending,
      pengedaranLnPending,
      lembagaPending,
    ] = await Promise.all([
      db.select({
        id: referensiTsl.id,
        namaDaerah: referensiTsl.namaDaerah,
        jenis: referensiTsl.jenis,
        statusVerifikasi: referensiTsl.statusVerifikasi,
        pendingChanges: referensiTsl.pendingChanges,
        createdBy: referensiTsl.createdBy,
        updatedAt: referensiTsl.updatedAt,
      }).from(referensiTsl).where(eq(referensiTsl.statusVerifikasi, "pending")),

      db.select({
        id: penangkaran.id,
        namaPenangkaran: penangkaran.namaPenangkaran,
        statusVerifikasi: penangkaran.statusVerifikasi,
        pendingChanges: penangkaran.pendingChanges,
        createdBy: penangkaran.createdBy,
        updatedAt: penangkaran.updatedAt,
      }).from(penangkaran).where(eq(penangkaran.statusVerifikasi, "pending")),

      db.select({
        id: pengedaranDalamNegeri.id,
        namaPengedaran: pengedaranDalamNegeri.namaPengedaran,
        statusVerifikasi: pengedaranDalamNegeri.statusVerifikasi,
        pendingChanges: pengedaranDalamNegeri.pendingChanges,
        createdBy: pengedaranDalamNegeri.createdBy,
        updatedAt: pengedaranDalamNegeri.updatedAt,
      }).from(pengedaranDalamNegeri).where(eq(pengedaranDalamNegeri.statusVerifikasi, "pending")),

      db.select({
        id: pengedaranLuarNegeri.id,
        namaPengedaran: pengedaranLuarNegeri.namaPengedaran,
        statusVerifikasi: pengedaranLuarNegeri.statusVerifikasi,
        pendingChanges: pengedaranLuarNegeri.pendingChanges,
        createdBy: pengedaranLuarNegeri.createdBy,
        updatedAt: pengedaranLuarNegeri.updatedAt,
      }).from(pengedaranLuarNegeri).where(eq(pengedaranLuarNegeri.statusVerifikasi, "pending")),

      db.select({
        id: lembagaKonservasi.id,
        namaLembaga: lembagaKonservasi.namaLembaga,
        statusVerifikasi: lembagaKonservasi.statusVerifikasi,
        pendingChanges: lembagaKonservasi.pendingChanges,
        createdBy: lembagaKonservasi.createdBy,
        updatedAt: lembagaKonservasi.updatedAt,
      }).from(lembagaKonservasi).where(eq(lembagaKonservasi.statusVerifikasi, "pending")),
    ]);

    // Ambil semua user sekaligus untuk mapping nama inputor
    const allUsers = await db.select({ id: users.id, nama: users.nama }).from(users);
    const userMap: Record<number, string> = {};
    allUsers.forEach(u => { userMap[u.id] = u.nama; });

    const mapItem = (
      item: Record<string, unknown>,
      tabelTarget: TabelTarget
    ) => {
      const pendingChanges = item.pendingChanges as Record<string, unknown> | null;
      const inputorId = getDiajukanOleh(pendingChanges, item.createdBy as number | null);
      return {
        ...item,
        tabelTarget,
        jenisPengajuan: getJenisPengajuan(pendingChanges),
        namaInputor: inputorId ? userMap[inputorId] ?? null : null,
      };
    };

    const referensiMapped = referensiPending.map(r => mapItem(r as Record<string, unknown>, "referensi_tsl"));
    const penangkaranMapped = penangkaranPending.map(p => mapItem(p as Record<string, unknown>, "penangkaran"));
    const dnMapped = pengedaranDnPending.map(p => mapItem(p as Record<string, unknown>, "pengedaran_dalam_negeri"));
    const lnMapped = pengedaranLnPending.map(p => mapItem(p as Record<string, unknown>, "pengedaran_luar_negeri"));
    const lembagaMapped = lembagaPending.map(p => mapItem(p as Record<string, unknown>, "lembaga_konservasi"));

    const total =
      referensiMapped.length +
      penangkaranMapped.length +
      dnMapped.length +
      lnMapped.length +
      lembagaMapped.length;

    res.status(200).json({
      data: {
        referensi_tsl: referensiMapped,
        penangkaran: penangkaranMapped,
        pengedaran_dalam_negeri: dnMapped,
        pengedaran_luar_negeri: lnMapped,
        lembaga_konservasi: lembagaMapped,
      },
      total,
    });
  } catch (error) {
    return handleError(res, error, "getDataPending", "Gagal mengambil data pending");
  }
}

// ─── GET /api/verifikasi/approved ─────────────────────────────────────────────

export async function getDataApproved(_req: AuthRequest, res: Response) {
  try {
    const [
      referensiApproved,
      penangkaranApproved,
      dnApproved,
      lnApproved,
      lembagaApproved,
    ] = await Promise.all([
      db.select({
        id: referensiTsl.id,
        namaDaerah: referensiTsl.namaDaerah,
        jenis: referensiTsl.jenis,
        statusVerifikasi: referensiTsl.statusVerifikasi,
        createdBy: referensiTsl.createdBy,
        updatedAt: referensiTsl.updatedAt,
      }).from(referensiTsl).where(eq(referensiTsl.statusVerifikasi, "disetujui")),

      db.select({
        id: penangkaran.id,
        namaPenangkaran: penangkaran.namaPenangkaran,
        statusVerifikasi: penangkaran.statusVerifikasi,
        createdBy: penangkaran.createdBy,
        updatedAt: penangkaran.updatedAt,
      }).from(penangkaran).where(eq(penangkaran.statusVerifikasi, "disetujui")),

      db.select({
        id: pengedaranDalamNegeri.id,
        namaPengedaran: pengedaranDalamNegeri.namaPengedaran,
        statusVerifikasi: pengedaranDalamNegeri.statusVerifikasi,
        createdBy: pengedaranDalamNegeri.createdBy,
        updatedAt: pengedaranDalamNegeri.updatedAt,
      }).from(pengedaranDalamNegeri).where(eq(pengedaranDalamNegeri.statusVerifikasi, "disetujui")),

      db.select({
        id: pengedaranLuarNegeri.id,
        namaPengedaran: pengedaranLuarNegeri.namaPengedaran,
        statusVerifikasi: pengedaranLuarNegeri.statusVerifikasi,
        createdBy: pengedaranLuarNegeri.createdBy,
        updatedAt: pengedaranLuarNegeri.updatedAt,
      }).from(pengedaranLuarNegeri).where(eq(pengedaranLuarNegeri.statusVerifikasi, "disetujui")),

      db.select({
        id: lembagaKonservasi.id,
        namaLembaga: lembagaKonservasi.namaLembaga,
        statusVerifikasi: lembagaKonservasi.statusVerifikasi,
        createdBy: lembagaKonservasi.createdBy,
        updatedAt: lembagaKonservasi.updatedAt,
      }).from(lembagaKonservasi).where(eq(lembagaKonservasi.statusVerifikasi, "disetujui")),
    ]);

    const total =
      referensiApproved.length +
      penangkaranApproved.length +
      dnApproved.length +
      lnApproved.length +
      lembagaApproved.length;

    res.status(200).json({
      data: {
        referensi_tsl: referensiApproved.map(r => ({ ...r, tabelTarget: "referensi_tsl" as const })),
        penangkaran: penangkaranApproved.map(p => ({ ...p, tabelTarget: "penangkaran" as const })),
        pengedaran_dalam_negeri: dnApproved.map(p => ({ ...p, tabelTarget: "pengedaran_dalam_negeri" as const })),
        pengedaran_luar_negeri: lnApproved.map(p => ({ ...p, tabelTarget: "pengedaran_luar_negeri" as const })),
        lembaga_konservasi: lembagaApproved.map(p => ({ ...p, tabelTarget: "lembaga_konservasi" as const })),
      },
      total,
    });
  } catch (error) {
    return handleError(res, error, "getDataApproved", "Gagal mengambil data approved");
  }
}

// ─── POST /api/verifikasi/approve ─────────────────────────────────────────────

export async function approveData(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { tabelTarget, targetId, catatan } = req.body;

    const validationError = validateBaseFields(tabelTarget, targetId);
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    const result = await findPendingRecord(tabelTarget, Number(targetId));
    if ("error" in result) {
      res.status(result.status).json({ message: result.error });
      return;
    }

    const { record } = result;
    const tableDef = getTableDef(tabelTarget);
    const pendingChanges = record.pendingChanges as Record<string, unknown> | null;
    const isDeleteRequest = pendingChanges?._action === "delete";
    const jenisPengajuan = getJenisPengajuan(pendingChanges);

    const diajukanOleh = getDiajukanOleh(pendingChanges, (record.createdBy as number | null) ?? null);

    if (isDeleteRequest) {
      await tableDef.delete(Number(targetId));
      await insertVerifikasiLog(
        tabelTarget,
        Number(targetId),
        "disetujui",
        jenisPengajuan,
        diajukanOleh,  // ← ID bidang_wilayah
        user.id,        // ← ID admin_pusat yang approve
        catatan ?? "Pengajuan penghapusan disetujui"
      );
      res.status(200).json({ message: "Pengajuan penghapusan disetujui, data telah dihapus" });
      return;
    }

    await tableDef.update(Number(targetId), {
      ...sanitizePendingChanges(pendingChanges),
      pendingChanges: null,
      statusVerifikasi: "disetujui",
      updatedAt: new Date(),
    });

    await insertVerifikasiLog(
      tabelTarget,
      Number(targetId),
      "disetujui",
      jenisPengajuan,
      diajukanOleh,  // ← ID bidang_wilayah
      user.id,        // ← ID admin_pusat yang approve
      catatan
    );

    res.status(200).json({ message: "Data berhasil disetujui" });
  } catch (error) {
    return handleError(res, error, "approveData", "Gagal menyetujui data");
  }
}

// ─── POST /api/verifikasi/tolak ───────────────────────────────────────────────

export async function tolakData(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { tabelTarget, targetId, catatan } = req.body;

    const validationError = validateBaseFields(tabelTarget, targetId);
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    if (!catatan?.trim()) {
      res.status(400).json({ message: "Catatan wajib diisi saat menolak data" });
      return;
    }

    const result = await findPendingRecord(tabelTarget, Number(targetId));
    if ("error" in result) {
      res.status(result.status).json({ message: result.error });
      return;
    }

    const { record } = result;
    const pendingChanges = record.pendingChanges as Record<string, unknown> | null;
    const jenisPengajuan = getJenisPengajuan(pendingChanges);

    // Prioritaskan diajukanOleh dari pendingChanges (bidang_wilayah yang ngedit
    // data milik admin_pusat). Fallback: createdBy.
    const diajukanOleh = getDiajukanOleh(pendingChanges, (record.createdBy as number | null) ?? null);

    await getTableDef(tabelTarget).update(Number(targetId), {
      statusVerifikasi: "ditolak",
      catatanVerifikasi: catatan,
      pendingChanges: null,
      updatedAt: new Date(),
    });

    await insertVerifikasiLog(
      tabelTarget,
      Number(targetId),
      "ditolak",
      jenisPengajuan,
      diajukanOleh,  // ← ID bidang_wilayah
      user.id,        // ← ID admin_pusat yang tolak
      catatan
    );

    res.status(200).json({ message: "Data berhasil ditolak", catatan });
  } catch (error) {
    return handleError(res, error, "tolakData", "Gagal menolak data");
  }
}

// ─── GET /api/verifikasi/log ──────────────────────────────────────────────────

export async function getVerifikasiLog(_req: AuthRequest, res: Response) {
  try {
    const result = await db
      .select()
      .from(verifikasiLog)
      .orderBy(verifikasiLog.createdAt);

    res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error, "getVerifikasiLog", "Gagal mengambil log verifikasi");
  }
}