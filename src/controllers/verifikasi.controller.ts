import { Request, Response } from "express";
import { eq, or } from "drizzle-orm";
import { db } from "../../db";
import { verifikasiLog, referensiTsl, penangkaran } from "../../db/schema";

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
  findAll: () => Promise<Record<string, unknown>[]>;
};

// =============================================
// TABLE REGISTRY
// =============================================

const TABLE_REGISTRY: Partial<Record<TabelTarget, TableDef>> = {
  referensi_tsl: {
    find: async (id) =>
      (
        await db
          .select()
          .from(referensiTsl)
          .where(eq(referensiTsl.id, id))
          .limit(1)
      )[0] ?? null,
    update: async (id, data) =>
      void (await db
        .update(referensiTsl)
        .set(data)
        .where(eq(referensiTsl.id, id))),
    delete: async (id) =>
      void (await db.delete(referensiTsl).where(eq(referensiTsl.id, id))),
    findAll: async () =>
      await db
        .select()
        .from(referensiTsl)
        .where(eq(referensiTsl.statusVerifikasi, "disetujui")),
  },
  penangkaran: {
    find: async (id) =>
      (
        await db
          .select()
          .from(penangkaran)
          .where(eq(penangkaran.id, id))
          .limit(1)
      )[0] ?? null,
    update: async (id, data) =>
      void (await db
        .update(penangkaran)
        .set(data)
        .where(eq(penangkaran.id, id))),
    delete: async (id) =>
      void (await db.delete(penangkaran).where(eq(penangkaran.id, id))),
    findAll: async () =>
      await db
        .select()
        .from(penangkaran)
        .where(eq(penangkaran.statusVerifikasi, "disetujui")),
  },
};

const VALID_TABEL = Object.keys(TABLE_REGISTRY) as TabelTarget[];

function getTableDef(tabel: TabelTarget): TableDef {
  const def = TABLE_REGISTRY[tabel];
  if (!def) throw new Error(`Tabel "${tabel}" tidak terdaftar di registry`);
  return def;
}

// =============================================
// HELPER: Tentukan jenis pengajuan
// =============================================

function getJenisPengajuan(
  pendingChanges: Record<string, unknown> | null,
  isNewRecord: boolean,
): JenisPengajuan {
  if (pendingChanges?._action === "delete") return "hapus";
  if (isNewRecord) return "tambah";
  return "perbarui";
}

// =============================================
// HELPER: Insert log verifikasi
// =============================================

async function insertVerifikasiLog(
  tabelTarget: TabelTarget,
  targetId: number,
  status: "disetujui" | "ditolak" | "pending",
  jenisPengajuan: JenisPengajuan,
  diajukanOleh: number,
  verifikasiOleh: number,
  catatan?: string | null,
) {
  await db.insert(verifikasiLog).values({
    tabelTarget,
    targetId,
    status,
    jenisPengajuan,
    diajukanOleh,
    verifikasiOleh,
    catatan: catatan ?? null,
  });
}

// =============================================
// HELPER: Validasi field dasar
// =============================================

function validateBaseFields(
  tabelTarget: unknown,
  targetId: unknown,
): string | null {
  if (!tabelTarget || !targetId) return "tabelTarget dan targetId wajib diisi";
  if (!VALID_TABEL.includes(tabelTarget as TabelTarget))
    return "tabelTarget tidak valid";
  return null;
}

// =============================================
// HELPER: Cari record dengan status pending
// =============================================

async function findPendingRecord(
  tabel: TabelTarget,
  targetId: number,
): Promise<
  { record: Record<string, unknown> } | { error: string; status: number }
> {
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

// =============================================
// GET /api/verifikasi/pending
// Semua data pending dari semua tabel
// =============================================

export async function getDataPending(
  _req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const [referensiPending, penangkaranPending] = await Promise.all([
      db
        .select({
          id: referensiTsl.id,
          namaDaerah: referensiTsl.namaDaerah,
          jenis: referensiTsl.jenis,
          statusVerifikasi: referensiTsl.statusVerifikasi,
          pendingChanges: referensiTsl.pendingChanges,
          createdBy: referensiTsl.createdBy,
          updatedAt: referensiTsl.updatedAt,
        })
        .from(referensiTsl)
        .where(eq(referensiTsl.statusVerifikasi, "pending")),

      db
        .select({
          id: penangkaran.id,
          namaPenangkaran: penangkaran.namaPenangkaran,
          statusVerifikasi: penangkaran.statusVerifikasi,
          createdBy: penangkaran.createdBy,
          updatedAt: penangkaran.updatedAt,
        })
        .from(penangkaran)
        .where(eq(penangkaran.statusVerifikasi, "pending")),
    ]);

    // Tentukan jenis pengajuan untuk setiap record
    const referensiMapped = referensiPending.map((r) => ({
      ...r,
      tabelTarget: "referensi_tsl",
      jenisPengajuan: getJenisPengajuan(
        r.pendingChanges as Record<string, unknown> | null,
        false,
      ),
    }));

    const penangkaranMapped = penangkaranPending.map((p) => ({
      ...p,
      tabelTarget: "penangkaran",
      jenisPengajuan: getJenisPengajuan(null, false),
    }));

    res.status(200).json({
      data: {
        referensi_tsl: referensiMapped,
        penangkaran: penangkaranMapped,
      },
      total: referensiMapped.length + penangkaranMapped.length,
    });
  } catch (error) {
    console.error("[ERROR] getDataPending:", error);
    res.status(500).json({ message: "Gagal mengambil data pending" });
  }
}

// =============================================
// GET /api/verifikasi/approved
// Semua data yang sudah disetujui dari semua tabel
// =============================================

export async function getDataApproved(
  _req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const [referensiApproved, penangkaranApproved] = await Promise.all([
      db
        .select({
          id: referensiTsl.id,
          namaDaerah: referensiTsl.namaDaerah,
          jenis: referensiTsl.jenis,
          statusVerifikasi: referensiTsl.statusVerifikasi,
          createdBy: referensiTsl.createdBy,
          updatedAt: referensiTsl.updatedAt,
        })
        .from(referensiTsl)
        .where(eq(referensiTsl.statusVerifikasi, "disetujui")),

      db
        .select({
          id: penangkaran.id,
          namaPenangkaran: penangkaran.namaPenangkaran,
          statusVerifikasi: penangkaran.statusVerifikasi,
          createdBy: penangkaran.createdBy,
          updatedAt: penangkaran.updatedAt,
        })
        .from(penangkaran)
        .where(eq(penangkaran.statusVerifikasi, "disetujui")),
    ]);

    res.status(200).json({
      data: {
        referensi_tsl: referensiApproved.map((r) => ({
          ...r,
          tabelTarget: "referensi_tsl",
        })),
        penangkaran: penangkaranApproved.map((p) => ({
          ...p,
          tabelTarget: "penangkaran",
        })),
      },
      total: referensiApproved.length + penangkaranApproved.length,
    });
  } catch (error) {
    console.error("[ERROR] getDataApproved:", error);
    res.status(500).json({ message: "Gagal mengambil data approved" });
  }
}

// =============================================
// POST /api/verifikasi/approve
// Setujui data pending
// =============================================

export async function approveData(
  req: AuthRequest,
  res: Response,
): Promise<void> {
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
    const pendingChanges = record.pendingChanges as Record<
      string,
      unknown
    > | null;
    const isDeleteRequest = pendingChanges?._action === "delete";
    const jenisPengajuan = getJenisPengajuan(pendingChanges, false);
    const diajukanOleh = record.createdBy as number;

    if (isDeleteRequest) {
      await tableDef.delete(Number(targetId));
      await insertVerifikasiLog(
        tabelTarget,
        Number(targetId),
        "disetujui",
        jenisPengajuan,
        diajukanOleh,
        user.id,
        catatan ?? "Pengajuan penghapusan disetujui",
      );
      res
        .status(200)
        .json({
          message: "Pengajuan penghapusan disetujui, data telah dihapus",
        });
      return;
    }

    await tableDef.update(Number(targetId), {
      ...(pendingChanges ?? {}),
      pendingChanges: null,
      statusVerifikasi: "disetujui",
      updatedAt: new Date(),
    });

    await insertVerifikasiLog(
      tabelTarget,
      Number(targetId),
      "disetujui",
      jenisPengajuan,
      diajukanOleh,
      user.id,
      catatan,
    );

    res.status(200).json({ message: "Data berhasil disetujui" });
  } catch (error) {
    console.error("[ERROR] approveData:", error);
    res.status(500).json({ message: "Gagal menyetujui data" });
  }
}

// =============================================
// POST /api/verifikasi/tolak
// Tolak data pending
// =============================================

export async function tolakData(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const user = req.user!;
    const { tabelTarget, targetId, catatan } = req.body;

    const validationError = validateBaseFields(tabelTarget, targetId);
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    if (!catatan?.trim()) {
      res
        .status(400)
        .json({ message: "Catatan wajib diisi saat menolak data" });
      return;
    }

    const result = await findPendingRecord(tabelTarget, Number(targetId));
    if ("error" in result) {
      res.status(result.status).json({ message: result.error });
      return;
    }

    const { record } = result;
    const pendingChanges = record.pendingChanges as Record<
      string,
      unknown
    > | null;
    const jenisPengajuan = getJenisPengajuan(pendingChanges, false);
    const diajukanOleh = record.createdBy as number;

    // Catatan: pendingChanges SENGAJA tidak di-null-kan saat penolakan.
    // Hal ini memungkinkan frontend non-admin membaca jenis pengajuan
    // (Perbarui / Hapus) dari record yang ditolak tanpa akses ke verifikasiLog.
    // Untuk penangkaran (yang tidak memiliki kolom pendingChanges),
    // Drizzle akan mengabaikan field ini secara otomatis.
    await getTableDef(tabelTarget).update(Number(targetId), {
      statusVerifikasi: "ditolak",
      catatanVerifikasi: catatan,
      updatedAt: new Date(),
    });

    await insertVerifikasiLog(
      tabelTarget,
      Number(targetId),
      "ditolak",
      jenisPengajuan,
      diajukanOleh,
      user.id,
      catatan,
    );

    res.status(200).json({ message: "Data berhasil ditolak", catatan });
  } catch (error) {
    console.error("[ERROR] tolakData:", error);
    res.status(500).json({ message: "Gagal menolak data" });
  }
}

// =============================================
// GET /api/verifikasi/log
// Riwayat semua verifikasi
// =============================================

export async function getVerifikasiLog(
  _req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const result = await db
      .select()
      .from(verifikasiLog)
      .orderBy(verifikasiLog.createdAt);

    res.status(200).json({ data: result });
  } catch (error) {
    console.error("[ERROR] getVerifikasiLog:", error);
    res.status(500).json({ message: "Gagal mengambil log verifikasi" });
  }
}
